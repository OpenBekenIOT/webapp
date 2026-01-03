<template>
    <div>
        <div>
            <p>Chipset: {{chipset}}</p>
            <p>Build: {{build}}</p>
        </div>
        <div>
            <span v-if="supportsLittleFS">
                <button :disabled="!otadata" @click="sequence(null, $event)">Start safe OTA (keep LittleFS data)</button>
                <br/>
                <button :disabled="!otadata" @click="startota(null, $event)">Start quick OTA (delete all LittleFS data)</button>
                <br/>
                <br/>
                <button @click="backup(null, $event)">Read fsblock</button>
                <button @click="reboot(null, $event)">Reboot</button>
                <button @click="restore(null, $event)">Restore fsblock</button>
                <select v-model="defaultaction">
                    <option value=''>Do nothing</option>
                    <option value='ota'>OTA Only</option>
                    <option value='sequence'>Backup/OTA/Restore</option>
                </select>
                <span>Selected: {{ defaultaction }}</span>
            </span>
            <span v-else>
                <button :disabled="!otadata" @click="startota(null, $event)">Start OTA</button>
                <button @click="reboot(null, $event)">Reboot</button>
            </span>
            <br/>
            <br/>
            <span>Select remote OTA file to download to PC:</span>
            <select v-model="selectedfile" @change="remoteotafilechange()">
                <option v-for="opt in options" v-bind:key="opt.url" v-bind:value="opt.url">{{ opt.name }}</option>
            </select>
            <span>Download: </span><a v-bind:href="selectedfile">{{selectedfile}}</a>
        </div>
        <br/>
        <div>
            <label for="otaFilePicker">Select OTA file from disk:</label><input id="otaFilePicker" type="file" @change="fileSelected($event)" :accept="otaFileExtension">
            <br/>
            <p>Or drop it here:</p>
            <br/>
            <div class="drop" @drop="dropHandler($event)" @dragover="dragOverHandler($event)">
                <div class="otatext center" v-html="otatext"></div>
            </div>
            <div v-html="status" :class="{invalid: invalidOTASelected}"></div>
            <div v-if="variantMismatchSelected" class="invalid">
                Note: {{ variantMismatchMessage }}
            </div>
        </div>
    </div>
</template>

<script>
  module.exports = {

    data: ()=>{
      return {
        msg: 'world!',
        backupdata: null,
        otadata:null,
        otatext:'Drop OTA file here',
        status:'Nothing going on',
        defaultaction: '',
        build:'unknown',
        chipset:'unknown',
        invalidOTASelected: false,
        variantMismatchSelected: false,
        variantMismatchMessage: '',
        otaFileExtension:".rbl,.img",
        bOTAstarted: false,

        currentversion: '',
        releases: [],
        options: [],
        selectedfile: '',
        supportsLittleFS: false,
      }
    },
    methods:{
        getinfo(){
            let url = window.device+'/api/info';
            console.log('getinfo from ota');
            fetch(url)
                .then(response => response.json())
                .then(res => {
                    this.build = res.build;
                    this.chipset = res.chipset;     //Set chipset to fixed value for testing

                    this.currentversion = this.build.split(' ').pop();
                    // only get releases the first time.
                    if (!this.releases.length){
                        this.getReleases();
                    }

                    if (this.chipset){
                        if(this.chipset=="BL602") {
                             this.otaFileExtension = ".bin.xz.ota";
                        } else if(this.chipset=="LN882H") {
                             this.otaFileExtension = ".bin";
                        } else if(this.chipSetUsesRBL()) {
                             this.otaFileExtension = ".rbl";
                        } else {
                             this.otaFileExtension = ".img";
                        }
                        
                        //These chips don't support litte FS
                        if (",W600,W800,XR809,BL602".indexOf(`,${this.chipset},`) !== -1)
                        {
                            this.supportsLittleFS = false;
                        }
                    }
                })
                .catch(err => {
                    this.error = err.toString();
                    console.error(err)
                }); // Never forget the final catch!
        },

        /* Check if the ArrayBuffer represents RBL file */
        isRBL(arrayBuffer){
            let view = new DataView(arrayBuffer);
            if (view.byteLength < 30)return false;
            console.log(view);
            return view.getUint8(0) === 82 && view.getUint8(1) === 66 && view.getUint8(2) === 76
               ;
        },

        /* Check if the ArrayBuffer contains magic number 0xa0ffff9f (tls_fwup_img_header_check) */
        isWinnerMicroImage(arrayBuffer){
            let view = new DataView(arrayBuffer);
            if (view.byteLength < 4) return false;
            console.log(view);
            return view.getUint8(0) === 0x9f && view.getUint8(1) === 0xff && view.getUint8(2) === 0xff && view.getUint8(3) === 0xa0;
        },

        isBL602Image(arrayBuffer){
            let view = new DataView(arrayBuffer);
            if (view.byteLength < 8) return false;
            console.log(view);
            return view.getUint8(0) === 0x42 && view.getUint8(1) === 0x4C && view.getUint8(2) === 0x36 && view.getUint8(3) === 0x30 && view.getUint8(4) === 0x58 && view.getUint8(5) === 0x5F && view.getUint8(6) === 0x4F;
        },
        remoteotafilechange(){

        },

        /* Check if the chipset uses RBL files */
        chipSetUsesRBL(){
            return this.chipset === "BK7231T" || this.chipset === "BK7231N" || this.chipset === "BK7231U" || this.chipset === "BK7238" || this.chipset === "BK7252" || this.chipset === "BK7252N";
        },
        /* Extract OTA variant from currentversion, e.g. 1.18.233_hlw8112 -> hlw8112 */
        getOtaVariantFromCurrentVersion(){
            if (!this.currentversion) return '';
            const parts = this.currentversion.split('_');
            if (parts.length < 2) return '';
            return parts.slice(1).join('_');
        },

        /*
         * If a device is running a variant build (e.g. *_hlw8112, *_berry, *_tuyaMCU),
         * warn when selecting a generic/different-variant to prevent accidental feature loss.
         */
        getVariantMismatchMessage(fileName){
            if (!this.chipset) return '';

            const deviceVariant = this.getOtaVariantFromCurrentVersion();
            const lowerName = (fileName || '').toLowerCase();
            const chipLower = this.chipset.toLowerCase();

            // Only enforce when the selected file is for this chipset (wrong chipset handled elsewhere)
            const expectedPrefix = 'open' + chipLower + '_';
            if (!lowerName.startsWith(expectedPrefix)) return '';

            // Determine selected variant based on known OTA naming patterns
            let selectedVariant = '';

            // 1) RBL: Open<chip>_<ver>.rbl  or  Open<chip>_<ver>_<variant>.rbl
            if (lowerName.endsWith('.rbl')){
                const m = lowerName.match(new RegExp('^open' + chipLower + '_\\d+\\.\\d+\\.\\d+(?:_([^\\.]+))?\\.rbl$'));
                if (m && m[1]) selectedVariant = m[1];
            }
            // 2) IMG: Open<chip>_<ver>.img  or  Open<chip>_<ver>_<variant>.img
            else if (lowerName.endsWith('.img')){
                const m = lowerName.match(new RegExp('^open' + chipLower + '_\\d+\\.\\d+\\.\\d+(?:_([^\\.]+))?\\.img$'));
                if (m && m[1]) selectedVariant = m[1];
            }
            // 3) BL602-style OTA: Open<chip>_<ver>_OTA.bin.xz.ota  or  Open<chip>_<ver>_<variant>_OTA.bin.xz.ota
            else if (lowerName.endsWith('_ota.bin.xz.ota')){
                const m = lowerName.match(new RegExp('^open' + chipLower + '_\\d+\\.\\d+\\.\\d+(?:_([^_\\.]+))?_ota\\.bin\\.xz\\.ota$'));
                if (m && m[1]) selectedVariant = m[1];
            }
            else{
                // Unknown naming: do not enforce variant rules (avoid false positives)
                return '';
            }

            const dv = (deviceVariant || '').toLowerCase();
            const sv = (selectedVariant || '').toLowerCase();

            // No variant on either side -> OK
            if (!dv && !sv) return '';

            // Same variant -> OK
            if (dv && sv && dv === sv) return '';

            // Any other transition throws a warning:
            // - variant -> generic
            // - generic -> variant
            // - variant A -> variant B
            if (!dv && sv){
                return 'Selected OTA file variant "' + selectedVariant + '" does not match the current generic build.';
            }
            if (dv && !sv){
                return 'Selected OTA file is a generic build but this device variant is "' + deviceVariant + '".';
            }
            return 'Selected OTA file variant "' + selectedVariant + '" does not match this device variant "' + deviceVariant + '".';
        },
        /* Check if the ota fileName matches the chipset */
        fileNameMatchesChipset(fileName) {
            if (!this.chipset) {     //Accept any file if chipset missing (older firmware)
                return true;
            }

            //e.g. OpenW800_1.12.40_ota.img, OpenBK7231N_1.12.40.rbl, OpenW800_1.12.40_ota.img
            var lowerName = fileName.toLowerCase();
            var chipLower = this.chipset.toLowerCase();
            if (!lowerName.startsWith("open" + chipLower + "_")) return false;

            // LN882H: OpenLN882H_<ver>_OTA.bin
            if (chipLower === "ln882h") {
                return lowerName.endsWith("_ota.bin");
            }

            var ext = this.chipSetUsesRBL() ? ".rbl" : ".img";
            return lowerName.endsWith(ext);
        },

        /* Check ota data from file selection/drop */
        checkOTAData(event, file, operation){
            this.otadata = null;    //Reset otadata
            this.variantMismatchSelected = false;
            this.variantMismatchMessage = '';
            
            var result = event.target.result;   //ArrayBuffer
            console.log('chipset=' + this.chipset);
            console.log("Checking ota data");
            console.log(result);
            console.log('otadata len:' + result.byteLength);
            this.otatext = file.name + ' len:' + result.byteLength;

            if (this.chipSetUsesRBL()){
                if (!this.isRBL(result)){   //if the file is not RBl then it is right away invalid
                    this.invalidOTASelected = true;
                }
                else{
                    //Prevent BK7231N from being used in BK7231T
                    this.invalidOTASelected = !this.fileNameMatchesChipset(file.name);
                }
            }
            else if (this.chipset === "W600" || this.chipset === "W800"){
                this.invalidOTASelected = !this.isWinnerMicroImage(result);
            } else if (this.chipset === "BL602"){
                this.invalidOTASelected = !this.isBL602Image(result);
            } else if (this.chipset === "LN882H"){
                this.invalidOTASelected = !this.fileNameMatchesChipset(file.name);
            }
            else{
                //At this point W800 is the only other chipset with has OTA images e.g. OpenW800_1.12.40_ota.img
                //img file doesn't seem to have any marker bytes so we will just check the file name
                this.invalidOTASelected = !this.fileNameMatchesChipset(file.name);
            }

            // Warn for generic/different-variant OTA selection on a variant device
            if (!this.invalidOTASelected){
                const mismatch = this.getVariantMismatchMessage(file.name);
                if (mismatch){
                    this.variantMismatchSelected = true;
                    this.variantMismatchMessage = mismatch;
                }
            }

            if (this.invalidOTASelected){
                if (!this.variantMismatchSelected){
                    this.status = 'Invalid OTA file was ' + operation;
                }
            }
            else{
                this.status = 'OTA file '+ operation;
                this.otadata = result;
            }
        },
        fileSelected(ev){
            console.log("File selected");
            this.invalidOTASelected = false; //Reset status style
            this.variantMismatchSelected = false;
            this.variantMismatchMessage = '';

            var file = ev.target.files[0];  //There should be only one file
            if (file){
                console.log('... fileName = ' + file.name);
                var reader = new FileReader();
                reader.onload = (event) => this.checkOTAData(event, file, "selected");
                reader.readAsArrayBuffer(file);
            }
        },
        dropHandler(ev){
            ev.preventDefault();
            if (ev.dataTransfer.items) {
                console.log('Dropped ' + ev.dataTransfer.items.length + ' items');

                // Use DataTransferItemList interface to access the file(s)
                for (var i = 0; i < ev.dataTransfer.items.length; i++) {
                    // If dropped items aren't files, reject them
                    if (ev.dataTransfer.items[i].kind === 'file') {
                        var file = ev.dataTransfer.items[i].getAsFile();
                        console.log('... file[' + i + '].name = ' + file.name);
                        var reader = new FileReader();
                        reader.onload = (event) => this.checkOTAData(event, file, "dropped");
                        
                        console.log(file);
                        reader.readAsArrayBuffer(file);
                    }
                }
            }
        },

        dragOverHandler(ev){
            //console.log('File(s) in drop zone');
            // Prevent default behavior (Prevent file from being opened)
            ev.preventDefault();
        },

        sequence(){
            if (this.otadata){
                this.backup(()=>{
                    this.startota(()=>{
                        this.status += '<br/>waiting for reboot...';
                        let count = 40;
                        let checkrestore = ()=>{
                            count--;
                            if (!count){
                                this.restore(()=>{
                                    this.status += '<br/>Sequence complete';
                                });
                            } else {
                                this.status += '.'+count;
                                setTimeout(checkrestore, 1000);
                            }
                        };
                        checkrestore();
                    })
                })
            } else {
                this.status = 'Drop an OTA file first...';
            }
        },

        reboot(cb){
            let url = window.device+'/api/reboot';
            fetch(url, {
                method: 'POST',
                body: ''
            })
                .then(response => response.text())
                .then(text => {
                    if(cb) cb();
                });
        },

        backup(cb){
            this.status += '<br/>starting backup...';
            let url = window.device+'/api/fsblock';
            fetch(url)
                .then(response => response.arrayBuffer())
                .then(buffer => {
                    this.backupdata = buffer; 
                    console.log('received '+buffer.byteLength);
                    this.status += '..backup done...';
                    if(cb) cb();
                })
                .catch(err => console.error(err)); // Never forget the final catch!
        },

        startota(cb){
            if(this.bOTAstarted) {
                alert("It seems that OTA is already started");
                return;
            }
            this.bOTAstarted = true;
            this.status += '<br/>starting OTA...';
            console.log('start ota ');
            let url = window.device+'/api/ota';
            if (this.otadata){
                fetch(url, { 
                        method: 'POST',
                        body: this.otadata
                    })
                    .then(response => response.text())
                    .then(text => {
                        console.log('received '+text);
                        this.otatext += ' finished:'+text;
                        this.status += '<br/>rebooting...';
                        this.bOTAstarted = false;
                        this.reboot(cb);
                    })
                    .catch(err => console.error(err)); // Never forget the final catch!
            } else {
                this.bOTAstarted = false;
            }
        },
        restore(cb){
            this.status += '<br/>starting restore...';
            let url = window.device+'/api/fsblock';
            if (this.backupdata){
                fetch(url, { 
                        method: 'POST',
                        body: this.backupdata
                    })
                    .then(response => response.text())
                    .then(text => {
                        console.log('received '+text);
                        this.status += 'Restore complete...';
                        if(cb) cb();
                    })
                    .catch(err => console.error(err)); // Never forget the final catch!
            }
        },

        getReleases(){
            let base = "https://api.github.com/repos/openshwprojects/OpenBK7231T_App/releases";
            fetch(base)
            .then(response => response.json())
            .then(data => {
                this.releases = data;

                let prefix;
                let ext;
                // you can use it for testing
				//this.chipset = "BL602";
                switch(this.chipset){
                    case 'BK7231T':
                        prefix = 'OpenBK7231T_';
                        postfix = '.rbl';
                        break;
                    case 'BK7231N':
                        prefix = 'OpenBK7231N_';
                        postfix = '.rbl';
                        break;
                    case 'BK7231U':
                        prefix = 'OpenBK7231U_';
                        postfix = '.rbl';
                        break;
                    case 'BK7238':
                        prefix = 'OpenBK7238_';
                        postfix = '.rbl';
                        break;
                    case 'BK7252':
                        prefix = 'OpenBK7252_';
                        postfix = '.rbl';
                        break;
                    case 'BK7252N':
                        prefix = 'OpenBK7252N_';
                        postfix = '.rbl';
                        break;
                    case 'XR809':
                        prefix = 'OpenXR809_';
                        postfix = '.img';
                        break;
                    case 'XR872':
                        prefix = 'OpenXR872_';
                        postfix = '_ota.img';
                        break;
                    case 'XR806':
                        prefix = 'OpenXR806_';
                        postfix = '_ota.img';
                        break;                        
                    case 'ECR6600':
                        prefix = 'OpenECR6600_';
                        postfix = '_ota.img';                        
                        break;                        
                    case 'BL602':
                        prefix = 'OpenBL602_';
                        postfix = '_OTA.bin.xz.ota';
                        break;
                    case 'W800': //OpenW800_1.14.116_ota.img
                        prefix = 'OpenW800_';
                        postfix = '_ota.img';
                        break; 
                    case 'W600': //OpenW600_1.14.116_gz.img
                        prefix = 'OpenW600_';
                        postfix = '_gz.img';
                        break;
                    case 'LN882H': //OpenLN882H_1.17.546_OTA.bin
                        prefix = 'OpenLN882H_';
                        postfix = '_OTA.bin';
                        break;      
                    case 'RTL87X0C': 
                        prefix = 'OpenRTL87X0C_';
                        postfix = '_ota.img';
                        break;
                    case 'RTL8710B': 
                        prefix = 'OpenRTL8710B_';
                        postfix = '_ota.img';
                        break;
                    case 'RTL8710A': 
                        prefix = 'OpenRTL8710A_';
                        postfix = '_ota.img';
                        break;
                    case 'RTL8720D': 
                        prefix = 'OpenRTL8720D_';
                        postfix = '_ota.img';
                        break;
                    case 'RTL8720E': 
                        prefix = 'OpenRTL8720E_';
                        postfix = '_ota.img';
                        break;
                    case 'RTL8721DA': 
                        prefix = 'OpenRTL8721DA_';
                        postfix = '_ota.img';
                        break; 
                    case 'ESP32': 
                        prefix = 'OpenESP32_';
                        postfix = '.img';
                        break;
                    case 'ESP32C2': 
                        prefix = 'OpenESP32C2_';
                        postfix = '.img';
                        break;
                    case 'ESP32C3': 
                        prefix = 'OpenESP32C3_';
                        postfix = '.img';
                        break;
                    case 'ESP32C5': 
                        prefix = 'OpenESP32C5_';
                        postfix = '.img';
                        break;
                    case 'ESP32C6': 
                        prefix = 'OpenESP32C6_';
                        postfix = '.img';
                        break;
                    case 'ESP32C61': 
                        prefix = 'OpenESP32C61_';
                        postfix = '.img';
                        break;
                    case 'ESP32S2': 
                        prefix = 'OpenESP32S2_';
                        postfix = '.img';
                        break;
                    case 'ESP32S3': 
                        prefix = 'OpenESP32S3_';
                        postfix = '.img';
                        break;
                    case 'ESP8266': 
                        prefix = 'OpenESP8266_';
                        postfix = '.img';
                        break;
                    case 'RDA5981': 
                        prefix = 'OpenRDA5981_';
                        postfix = '_ota.img';
                        break;
		    default:
			prefix = 'Open' + this.chipset + '_';
                        postfix = '.img';
			break;
                }

           	 console.log('OTA prefix=' + prefix);
           	 console.log('OTA postfix=' + postfix);
                let options = [];
                const otaVariant = this.getOtaVariantFromCurrentVersion();
                const allowVariant = (
                    otaVariant &&
                    (
                        (this.chipSetUsesRBL() && postfix === '.rbl') ||
                        ((this.chipset || '').startsWith('ESP') && postfix === '.img') ||
                        (this.chipset === 'BL602' && postfix === '_OTA.bin.xz.ota')
                    )
                );
                if (prefix){
                    for (let i = 0; i < data.length; i++){
                        const rel = data[i];

                        // Prefer variant-specific assets first (e.g. OpenBK7231N_1.18.233_hlw8112.rbl), then fall back to generic.
                        const candidates = [];
                        if (allowVariant){
                            candidates.push(prefix + rel.name + '_' + otaVariant + postfix);
                        }
                        candidates.push(prefix + rel.name + postfix);

                        let fname = null;
                        let downloadurl = null;

                        for (const cand of candidates){
                            for (let j = 0; j < rel.assets.length; j++){
                                if (rel.assets[j].name === cand){
                                    fname = cand;
                                    downloadurl = rel.assets[j].browser_download_url;
                                    break;
                                }
                            }
                            if (downloadurl) break;
                        }
                        // https://github.com/openshwprojects/OpenBK7231T_App/releases/download/1.14.116/OpenBK7231T_1.14.116.rbl
                        if (downloadurl){
                            options.push({ name: fname, url:downloadurl });
                        }
                    }
                }
                this.options = options;

                // find latest release
                this.latest = data[0].name;
                if (this.latest !== this.currentversion){
                this.lateststr = `(<a href="${data[0].html_url}" target="_blank">${this.latest}</a> available)`;
                }
            })
            .catch(err => {
                this.error = err.toString();
                console.error(err)
                });
        },

    },
    mounted (){
        this.msg = 'fred';
        this.getinfo();
        console.log('mounted ota!');
    }
  }
//@ sourceURL=/vue/controller.vue
</script>

<style scoped>
    .drop {
        border: 5px solid blue;
        width:  200px;
        height: 100px;
        text-align: center;
        position: relative;
        vertical-align: center;
    }

    .otatext {
    }
    .invalid{
        font-weight: bold;
        color: red;
    }
    .center {
        margin: 0;
        position: absolute;
        top: 50%;
        left: 50%;
        -ms-transform: translate(-50%, -50%);
        transform: translate(-50%, -50%);
    }
</style>
