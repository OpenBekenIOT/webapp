/*
  Tuya Config Exporter / Extractor
  Refactored from templateImporter.html
*/

(function (global) {

    // Constants
    var SECTOR_SIZE = 4096;
    var PAGE_SIZE = 128;
    var MAGIC_PROTECTED = 0x13579753;
    var MAGIC_KEY = 0x13579753;
    var MAGIC_DATA_1 = 0x98761234;
    var MAGIC_DATA_2 = 0x135726AB;

    // Keys
    var KEY_MASTER = "qwertyuiopasdfgh";
    var KEY_PART_1 = "8710_2M";
    var KEY_PART_2 = "HHRRQbyemofrtytf";
    var MAGIC_CONFIG_START = [0x46, 0xDC, 0xED, 0x0E, 0x67, 0x2F, 0x3B, 0x70, 0xAE, 0x12, 0x76, 0xA3, 0xF8, 0x71, 0x2E, 0x03];

    // Utils
    function readUInt32LE(buffer, offset) {
        return (buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16) | (buffer[offset + 3] << 24)) >>> 0;
    }
    function readUInt16LE(buffer, offset) {
        return (buffer[offset] | (buffer[offset + 1] << 8));
    }
    function readUInt8(buffer, offset) {
        return buffer[offset];
    }

    // Crypto
    function makeSecondaryKey(innerKey) {
        var keyPart1Bytes = new TextEncoder().encode(KEY_PART_1);
        var keyPart2Bytes = new TextEncoder().encode(KEY_PART_2);
        var key = new Uint8Array(16);
        for (var i = 0; i < 16; i++) {
            key[i] = (keyPart1Bytes[i & 3] + keyPart2Bytes[i]) & 0xFF;
        }
        for (var i = 0; i < 16; i++) {
            key[i] = (key[i] + innerKey[i]) % 256;
        }
        return key;
    }

    function decryptBlock(data, baseOffset, blockIndex, keyBytes) {
        var readOfs = baseOffset + SECTOR_SIZE * blockIndex;
        if (readOfs + SECTOR_SIZE > data.length) return null;

        var blockData = data.slice(readOfs, readOfs + SECTOR_SIZE);
        var keyWordArr = CryptoJS.lib.WordArray.create(keyBytes);
        var dataWordArr = CryptoJS.lib.WordArray.create(blockData);

        var decryptedWords = CryptoJS.AES.decrypt(
            { ciphertext: dataWordArr },
            keyWordArr,
            { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.ZeroPadding }
        );

        var sigBytes = decryptedWords.sigBytes;
        var words = decryptedWords.words;
        var result = new Uint8Array(sigBytes);
        // WordArray to Uint8Array loop
        for (var i = 0; i < sigBytes; i++) {
            result[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
        }
        if (result.length < SECTOR_SIZE) {
            var padded = new Uint8Array(SECTOR_SIZE);
            padded.set(result);
            return padded;
        }
        return result;
    }

    function findMagic(data) {
        for (var i = 0; i < data.length - MAGIC_CONFIG_START.length; i++) {
            var found = true;
            for (var j = 0; j < MAGIC_CONFIG_START.length; j++) {
                if (data[i + j] !== MAGIC_CONFIG_START[j]) { found = false; break; }
            }
            if (found) return i;
        }
        return -1;
    }

    // --- Parser Classes ---

    class DataBlock {
        constructor(id, data, mapData) {
            this.id = id;
            this.data = data; // Full 4096 bytes
            this.mapData = mapData; // Bitmap for page types
            this.pages = {}; // cache
        }

        isIndexPage(pageIndex) {
            // pageIndex 1..31 (0 is header)
            // Bitmap logic: map_data[i // 8] & (1 << i % 8)
            var byteIdx = Math.floor(pageIndex / 8);
            var bitIdx = pageIndex % 8;
            if (byteIdx >= this.mapData.length) return false;
            return (this.mapData[byteIdx] & (1 << bitIdx)) !== 0;
        }

        getPage(pageIndex) {
            var start = pageIndex * PAGE_SIZE;
            return this.data.slice(start, start + PAGE_SIZE);
        }
    }

    function parseJSONContent(jsonStr, logCallback) {
        var log = logCallback || console.log;

        // 1. Initial cleanup: remove nulls
        var clean = jsonStr.replace(/\0/g, '');

        // 2. Trim to outer braces
        var firstBrace = clean.indexOf('{');
        var lastBrace = clean.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            clean = clean.substring(firstBrace, lastBrace + 1);
        }

        // 3. Attempt parse loop
        try {
            var parsed = JSON.parse(clean);
            log('Successfully parsed standard JSON', 'success');
            return parsed;
        } catch (e) {
            log('Standard parse failed: ' + e.message, 'warning');
        }

        // 4. Heuristic Repairs
        log("Attempting heuristic repair...", 'info');

        var repaired = clean;

        // Remove non-printable but keep newlines/tabs
        repaired = repaired.replace(/[^\x20-\x7E\n\r\t]/g, '');

        // Fix trailing commas: ,} -> } and ,] -> ]
        repaired = repaired.replace(/,\s*}/g, '}');
        repaired = repaired.replace(/,\s*]/g, ']');

        // Quote unquoted keys:  {key:  or ,key:
        repaired = repaired.replace(/([\{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');

        // Quote unquoted values (alphanumeric/dot/underscore)
        repaired = repaired.replace(/:\s*([a-zA-Z0-9_\.]+)\s*([,}])/g, ':"$1"$2');

        // Attempt parse again
        try {
            var parsed = JSON.parse(repaired);
            log('Successfully parsed repaired JSON', 'success');
            return parsed;
        } catch (e) {
            log('Repair parse failed: ' + e.message, 'warning');
        }

        // 5. Fallback: formatted raw dump
        // Return string if JSON parse fails completely
        log("Dumping raw repaired content.", 'warning');

        var formatted = repaired;
        if (formatted.length > 0 && !formatted.includes('\n')) {
            formatted = formatted.replace(/,/g, ',\n');
            formatted = formatted.replace(/{/g, '{\n');
            formatted = formatted.replace(/}/g, '\n}');
        }

        return formatted;
    }

    function extractConfig(data, logCallback) {
        var log = logCallback || console.log; // Expects (msg, type) signature

        log("Starting Tuya Config Decryption (KV Storage Mode)...", 'info');

        var needle = findMagic(data);
        if (needle < 0) {
            log("Magic header not found!", 'error');
            return null;
        }

        var realStart = needle - 32;
        log("Magic found at " + needle + ". Config starts at " + realStart + ".", 'success');

        if (realStart < 0) { log("Invalid start position.", 'error'); return null; }

        // 1. Decrypt Block 0 (Key Block)
        var masterKeyBytes = new TextEncoder().encode(KEY_MASTER);
        var block0 = decryptBlock(data, realStart, 0, masterKeyBytes);

        if (!block0) { log("Failed to decrypt Block 0.", 'error'); return null; }

        // Verify Block 0
        var mag = readUInt32LE(block0, 0);
        if (mag !== MAGIC_KEY) {
            log("Block 0 Magic mismatch: 0x" + mag.toString(16) + " (Expected 0x" + MAGIC_KEY.toString(16) + ")", 'error');
            return null;
        }

        var innerKey = block0.slice(8, 24);
        var secondaryKey = makeSecondaryKey(innerKey);
        log("Secondary key derived.", 'success');

        // 2. Decrypt and Parse All Blocks
        var blocks = new Map(); // Id -> DataBlock

        for (var i = 1; i < 500; i++) {
            var decrypted = decryptBlock(data, realStart, i, secondaryKey);
            if (!decrypted) break;

            // Parse Header (Page 0)
            var blkMag = readUInt32LE(decrypted, 0);

            if (blkMag !== MAGIC_DATA_1 && blkMag !== MAGIC_DATA_2) {
                continue;
            }

            var blkId = readUInt16LE(decrypted, 8); // Offset 8
            var mapSize = readUInt8(decrypted, 14); // Offset 14
            var mapData = decrypted.slice(15, 15 + mapSize);

            var blockObj = new DataBlock(blkId, decrypted, mapData);
            blocks.set(blkId, blockObj);
        }

        log("Decrypted and parsed " + blocks.size + " data blocks.", 'success');

        // 3. Scan for Index Pages and Reassemble Files
        var files = new Map(); // Filename -> Uint8Array content

        blocks.forEach((blk, blkId) => {
            for (var p = 1; p < 32; p++) {
                if (blk.isIndexPage(p)) {
                    // Parse Index Page
                    var pageData = blk.getPage(p);

                    var itemLen = readUInt32LE(pageData, 4);
                    var nameLen = readUInt8(pageData, 17);

                    if (nameLen === 0 || nameLen > 100) continue; // Sanity check

                    var nameBytes = pageData.slice(18, 18 + nameLen - 1);
                    var name = new TextDecoder().decode(nameBytes).replace(/\0/g, '');

                    // Parse Parts
                    var partsOffset = 18 + nameLen;
                    var partsSize = readUInt16LE(pageData, 11);

                    var fileData = new Uint8Array(itemLen);
                    var written = 0;

                    for (var k = 0; k < partsSize; k++) {
                        if (partsOffset + 4 > PAGE_SIZE) break;

                        var pBlockId = readUInt16LE(pageData, partsOffset);
                        var pStart = readUInt8(pageData, partsOffset + 2);
                        var pEnd = readUInt8(pageData, partsOffset + 3);
                        partsOffset += 4;

                        var partBlock = blocks.get(pBlockId);
                        if (!partBlock) {
                            log("Missing block " + pBlockId + " for file " + name, 'warning');
                            continue;
                        }

                        for (var pg = pStart; pg <= pEnd; pg++) {
                            // Data Page
                            var chunk = partBlock.getPage(pg);
                            var toWrite = Math.min(PAGE_SIZE, itemLen - written);
                            fileData.set(chunk.slice(0, toWrite), written);
                            written += toWrite;
                            if (written >= itemLen) break;
                        }
                    }

                    files.set(name, fileData);
                }
            }
        });

        // 4. Extract content
        var fileNames = Array.from(files.keys());
        log("Recovered " + files.size + " files: " + fileNames.join(', '), 'success');

        if (files.has("user_param_key")) {
            var upk = new TextDecoder().decode(files.get("user_param_key"));
            return parseJSONContent(upk, log);
        } else {
            log("user_param_key not found in KV storage.", 'warning');
            // Dump all files?
            if (files.size > 0) {
                log("Available files:", 'info');
                files.forEach((v, k) => log("File: " + k + " (" + v.length + " bytes)", 'info'));
            }
            return null;
        }
    }

    // Expose to global
    global.TuyaExporter = {
        extractConfig: extractConfig
    };

})(this);
