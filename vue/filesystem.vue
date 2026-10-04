<template>
    <div class="fill">
        <p>"List Filesystem" will display all files on LittleFS. 
        After listing the files, you can click on file name to begin editing text.
        "Create File" allows you to create a new file on Device (like autoexec.bat).
        You can also add files by drag &amp; dropping it.
        "Reset scripts" will stop all script threads running (if you have started any) without stopping the device.
        When editing a file, use "Save, Reset (...), and run" file to test new scripts, it will restart scripting every time with a clear state.
        </p>
		<p>You can access LittleFS HTML files by the following url: DEVICE_IP/api/lfs/FILENAME, for example: http://192.168.0.213/api/lfs/cfg.html . See <a href="https://www.elektroda.com/rtvforum/topic3971355.html">OBK/TASMOTA rest tutorial</a> for details</p>
        <div class="top">
            <button @click="backup(null, $event)">Read fsblock</button>
            <button @click="restore(null, $event)">Restore fsblock</button>
            <button @click="read(null, $event)">List Filesystem</button>
            <button @click="create(null, $event)">Create File</button>
            <button @click="upload(null, $event, false)">Upload file</button>
            <button @click="upload(null, $event, true)">Upload as gzip</button>
            <button @click="showUrlModal = true">Fetch from URLs</button>
            <button @click="resetSVM(null, $event)">Reset scripts</button>
            <br/>
            <button @click="getTar(null, $event)">Download FS Backup in Tar Archive</button>

        </div>
        <div class="bottom">
<div v-if="showUrlModal" style="position:fixed; top:20%; left:30%; width:40%; background:white; border:1px solid black; padding:1em; z-index:1000;">
  <h3>Enter URLs (one per line)</h3>
  This will download files from given URLs and save them to LFS.
  <br>
  <textarea v-model="urlInput" rows="10" style="width:100%"></textarea>
  <br>
  <label><input type="checkbox" v-model="urlGzip"> Compress with GZIP</label>
  <br><br>
  <button @click="fetchFromUrls">OK</button>
  <button @click="showUrlModal = false">Cancel</button>
</div>
            <div class="left">
                <input type="text" v-model="folder">
                <div class="drop" @drop="dropHandler($event)" @dragover="dragOverHandler($event)">
                    <div class="otatext center" v-html="otatext"></div>
                </div>
                <div v-html="status"></div>
                <div v-html="output"></div>
            </div>
            <div class="middle">
                <div>
                    <div v-for="file in files" v-bind:key="file.name">
                        <span v-if="file.type === 1"><button @click="editfile(file.name)">{{file.name}}</button> - {{file.size}}</span>
                        <br v-if="file.type === 1"/>
                    </div>
                    <div v-if="files.length > 0">
                    <strong>Total Size: {{ totalBytes }} bytes</strong>
                    </div>
                </div>
            </div>
            <div class="right">
                <h2 id="fileEditorLabel">File editor. Select file to begin.</h2>
                <div id="fileEditorBody" style="display:none">
                    <button @click="save(null, $event)">Save</button>
                    <button @click="save(startScript_simple)">Save, Run file as script thread</button>
                    <button @click="save(startScript_firstReset)">Save, Reset SVM and run file as script thread</button>         
                    <button @click="deleteFile(null, $event)">Delete</button>
                    <button @click="openInBrowser(null, $event)">Open in Browser</button>
                    <textarea v-model="edittext" rows="40" cols="100" style="height:90%"></textarea>
                </div>
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
        status:'nothing going on',
        folder:'',
        otatext:'drop file(s) or .tar here',
        shortName:'',
        mqtttopic:'',
        output: '',
        showUrlModal: false,
        urlInput: '',
        urlGzip: false,


        edittext:'',
        editname:'',

        stack:[],
        files:[],
      }
    },
  computed: {
    totalBytes() {
      return this.files
        .filter(file => file.type === 1) // Only include files, not directories
        .reduce((total, file) => total + file.size, 0);
    },
  },
    methods:{
        getinfo(){
            let url = window.device+'/api/info';
            fetch(url)
                .then(response => response.json())
                .then(res => {
                    this.shortName = res.shortName;
                    this.mqtttopic = res.mqtttopic;
                })
                .catch(err => {
                    this.error = err.toString();
                    console.error(err)
                }); // Never forget the final catch!
        },
        async fetchFromUrls() {
            this.showUrlModal = false;
            const urls = this.urlInput.split('\n').map(s => s.trim()).filter(s => s.length > 0);

            for (const url of urls) {
                try {
                    const response = await fetch(url);
                    if (!response.ok) {
                        this.status += `<br/>Failed to fetch: ${url}`;
                        continue;
                    }

                    const blob = await response.blob();
                    const parts = url.split('/');
                    let filename = parts[parts.length - 1];
                    if (!filename || filename.includes('?')) filename = 'file_' + Date.now();

                    let buffer = await blob.arrayBuffer();

                    if (this.urlGzip) {
                        const inputStream = new Blob([buffer]).stream();
                        const compressedStream = inputStream.pipeThrough(new CompressionStream('gzip'));
                        buffer = await new Response(compressedStream).arrayBuffer();
                        filename += '.gz';
                    }

                    this.status += `<br/>Saving ${filename}...`;

                    await new Promise(resolve => {
                        this.savefile(filename, buffer, resolve);
                    });
                } catch (e) {
                    this.status += `<br/>Error with ${url}: ${e}`;
                }
            }
            this.read();
        },
        dropHandler(ev){
            ev.preventDefault();
            console.log('drop');
            if (ev.dataTransfer.items) {
                this.getFilesDataTransferItems(ev.dataTransfer.items)
                .then(files => {
                    console.log(files);
                    if (files.length === 1 && files[0].filepath.endsWith('.tar')){
                        let reader = new FileReader();
                        reader.onload = (event) => {
                            console.log(event);
                            console.log('file len:'+event.target.result.byteLength);
                            this.status += '<br/>tar upload '+files[0].filepath;
                            this.putTar(event.target.result);
                        };
                        reader.readAsArrayBuffer(files[0]);
                        return;
                    }

                    let allfiles = [];
                    let addfolder = (f)=>{
                        for (let i = 0; i < f.length; i++){
                            if (f[i].subfolder){
                                addfolder(f[i].subfolder);
                            } else {
                                allfiles.push(f[i]);
                            }
                        }
                    };

                    addfolder(files);

                    console.log(allfiles);

                    this.uploadfiles(allfiles);

                });
                return;
            }
        },

      upload(event, ineve, gzip) {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.multiple = true; 
        fileInput.onchange = async() =>  {
            const files = Array.from(fileInput.files);
            console.log(files);
            if (files.length > 0) {
                let allFiles = [];
                for (let file of files) {
                    let outFile = file;

                    if (gzip) {
                        const inputStream = new Blob([file]).stream();
                        const compressedStream = inputStream.pipeThrough(new CompressionStream('gzip'));
                        const compressedBuffer = await new Response(compressedStream).arrayBuffer();
                        outFile = new File(
                            [compressedBuffer],
                            file.name + '.gz',
                            { type: 'application/gzip' }
                        );
                    }

                    outFile.filepath = outFile.name;
                    allFiles.push(outFile);
                }
                this.uploadfiles(allFiles, this.read);
            }
        };
        fileInput.click();
    },


        uploadfiles(files, cb) {
            let filecount = 0;

            let saveone = ()=>{
                if (filecount < files.length){
                    let reader = new FileReader();
                    reader.onload = (event) => {
                        console.log(event);
                        console.log('file len:'+event.target.result.byteLength);
                        this.status += '<br/>save '+files[filecount].filepath;
                        this.savefile(files[filecount].filepath, event.target.result, ()=>{
                            filecount++;
                            this.status += '.. done';
                            saveone();
                        });
                        //holder.style.background = 'url(' + event.target.result + ') no-repeat center';
                    };
                    reader.readAsArrayBuffer(files[filecount]);
                } else {
                    if (cb) cb();
                }
            }

            saveone();
        },

        getFilesDataTransferItems(dataTransferItems) {
            function traverseFileTreePromise(item, path = "", folder) {
                return new Promise(resolve => {
                    if (item.isFile) {
                        item.file(file => {
                            file.filepath = (path || "") + file.name; //save full path
                            folder.push(file);
                            resolve(file);
                        });
                    } else if (item.isDirectory) {
                        let dirReader = item.createReader();
                        dirReader.readEntries(entries => {
                        let entriesPromises = [];
                        subfolder = [];
                        folder.push({ name: item.name, subfolder: subfolder });
                        for (let entr of entries)
                            entriesPromises.push(
                            traverseFileTreePromise(entr, (path || "")  + item.name + "/", subfolder)
                            );
                        resolve(Promise.all(entriesPromises));
                        });
                    }
                });
            }

            let files = [];
            return new Promise((resolve, reject) => {
                let entriesPromises = [];
                for (let it of dataTransferItems)
                entriesPromises.push(
                    traverseFileTreePromise(it.webkitGetAsEntry(), null, files)
                );
                Promise.all(entriesPromises).then(entries => {
                resolve(files);
                });
            });
        },



        dragOverHandler(ev){
            //console.log('File(s) in drop zone');
            // Prevent default behavior (Prevent file from being opened)
            ev.preventDefault();
        },

        savefile(name, data, cb){
            this.status += '<br/>saving file...';
            let url = window.device+'/api/lfs/';
            if (this.folder){
                url += this.folder;
                url += '/'
            }
            url += name;
            fetch(url, { 
                    method: 'POST',
                    body: data
                })
                .then(response => response.text())
                .then(text => {
                    console.log('received '+text);
                    this.status += 'save complete...';
                    if(cb) cb();
                })
                .catch(err => console.error(err)); // Never forget the final catch!
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

        readFolder(fpath, cb){
            let url = window.device+'/api/lfs'+fpath;
            fetch(url)
                .then(response => response.json())
                .then(folder => {
                    console.log('folder '+url,folder);
                    this.status += 'Read '+url;
                    if (!folder.content) return;
                    for (let i = 0;i < folder.content.length; i++){
                        if (folder.content[i].name.startsWith('.')){
                        } else {
                            let root = fpath;
                            if (fpath === '/'){
                                fpath = '';
                            }
                            this.files.push({ name:fpath + '/' + folder.content[i].name, 
                                size:folder.content[i].size,
                                type:folder.content[i].type});
                        }
                    }

                    let i = 0;
                    for (i = 0;i < this.files.length; i++){
                        if (this.files[i].type === 2 && !this.files[i].requested) {
                            this.readFolder(this.files[i].name, cb);
                            this.files[i].requested = true;
                            break;
                        }
                    }
                    if (i === this.files.length){
                        if (cb) cb();
                    }
                })
                .catch(err => console.error(err)); // Never forget the final catch!
        },
        read(cb) {
            this.files = [];
            this.readFolder('/');
        },


        create(cb) {
            let fname = prompt("Please enter new file name:", "autoexec.bat");
            if(fname == null)
            {
                 alert("Canceled.");
            }
            else if(fname.length < 1)
            {
                 alert("Empty name.");
            }
            else
            {
                 //alert("TODO "+fname);
                 alert("Will try to create " +fname);
                 this.savefile(fname,"", ()=>{
                     this.read();
                 });
            }
        },
        
        editfile(name){
            let url = window.device+'/api/lfs'+name;
            fetch(url)
                .then(response => response.text())
                .then(text => {
                    this.edittext = text;
                    this.editname = name;
                    document.getElementById("fileEditorLabel").innerHTML = "Editing "+name;
                    document.getElementById("fileEditorBody").style.display = "block";
                });
        },



        deleteFile(cb) {   
            let readCallback = this.read;
            if (this.editname) {
                let r = confirm("Do you really want to remove the file " + this.editname + "?");
                if (r == false) {
                    alert("Ok, then not.");
                    return;
                }
                let url = window.device + '/api/del' + this.editname;
                alert("Will try to remove - url is " + url);
                fetch(url)
                    .then(response => response.arrayBuffer())
                    .then(buffer => {
                        this.status += '..delete done...';
                        if (cb) cb();
                        readCallback();
                    })
                    .catch(error => {
                        this.status += `..delete failed: ${error}`;
                        readCallback();
                        alert("Error deleting file: " + error);
                    });
            } else {
                alert("Please begin editing some file first. Just click the name on list to edit.");
            }
        },

        openInBrowser(cb) {   
            if (this.editname) {
                let url = window.device+'/api/lfs'+this.editname;
              //  alert("Will try to open - url is "+url);
                // open URL in new window
                window.open(url, '_blank');
            } else {
                alert("Please begin editing some file first. Just click the name on list to edit.");
            }
        },
        save(cb) {
            let readCallback = this.read;
            if (this.editname) {
                let url = window.device+'/api/lfs'+this.editname;
                fetch(url, { 
                        body: this.edittext,
                        method: 'POST',
                    })
                    .then(()=>{
                         if (cb) cb();
                         readCallback();
                    });
            } else {
                alert("Please begin editing some file first. Just click the name on list to edit.");
            }
        },
        resetSVM() {
            if (this.editname) {
                let url = window.device+'/api/cmnd';
                let cmd = "";
                
                cmd = "backlog resetSVM; clearAllHandlers; ";
                    
                fetch(url, { 
                        body: cmd,
                        method: 'POST',
                    })
                    .then(()=>{
                         
                    });
            }
        },
        startScript_simple() {
            this.startScript(null,null,0);
        },
        startScript_firstReset() {
            this.startScript(null,null,1);
        },
        startScript(cb, event, bResetAll) {
            if (this.editname) {
                let url = window.device+'/api/cmnd';
                let cmd = "";
                if(bResetAll == 1)
                {
                    cmd = "backlog resetSVM; ";
                }
                cmd += "startScript " + this.editname;
                fetch(url, { 
                        body: cmd,
                        method: 'POST',
                    })
                    .then(()=>{
                         
                    });
            } else {
                alert("Please begin editing some file first. Just click the name on list to edit.");
            }
        },

        tarball(){
            let tarball = {};
            tarball.TarReader = class {
                constructor() {
                    this.fileInfo = [];
                }

                readFile(file) {
                    return new Promise((resolve, reject) => {
                        let reader = new FileReader();
                        reader.onload = (event) => {
                            this.buffer = event.target.result;
                            this.fileInfo = [];
                            this._readFileInfo();
                            resolve(this.fileInfo);
                        };
                        reader.readAsArrayBuffer(file);
                    });
                }

                readArrayBuffer(arrayBuffer) {
                    this.buffer = arrayBuffer;
                    this.fileInfo = [];
                    this._readFileInfo();
                    return this.fileInfo;
                }

                _readFileInfo() {
                    this.fileInfo = [];
                    let offset = 0;
                    let file_size = 0;       
                    let file_name = "";
                    let file_type = null;
                    while(offset < this.buffer.byteLength - 512) {
                        file_name = this._readFileName(offset); // file name
                        if(file_name.length == 0) {
                            break;
                        }
                        file_type = this._readFileType(offset);
                        file_size = this._readFileSize(offset);

                        this.fileInfo.push({
                            "name": file_name,
                            "type": file_type,
                            "size": file_size,
                            "header_offset": offset
                        });

                        offset += (512 + 512*Math.trunc(file_size/512));
                        if(file_size % 512) {
                            offset += 512;
                        }
                    }
                }

                getFileInfo() {
                    return this.fileInfo;
                }

                _readString(str_offset, size) {
                    let strView = new Uint8Array(this.buffer, str_offset, size);
                    let i = strView.indexOf(0);
                    let td = new TextDecoder();
                    return td.decode(strView.slice(0, i));
                }

                _readFileName(header_offset) {
                    let name = this._readString(header_offset, 100);
                    return name;
                }

                _readFileType(header_offset) {
                    // offset: 156
                    let typeView = new Uint8Array(this.buffer, header_offset+156, 1);
                    let typeStr = String.fromCharCode(typeView[0]);
                    if(typeStr == "0") {
                        return "file";
                    } else if(typeStr == "5") {
                        return "directory";
                    } else {
                        return typeStr;
                    }
                }

                _readFileSize(header_offset) {
                    // offset: 124
                    let szView = new Uint8Array(this.buffer, header_offset+124, 12);
                    let szStr = "";
                    for(let i = 0; i < 11; i++) {
                        szStr += String.fromCharCode(szView[i]);
                    }
                    return parseInt(szStr,8);
                }

                _readFileBlob(file_offset, size, mimetype) {
                    let view = new Uint8Array(this.buffer, file_offset, size);
                    let blob = new Blob([view], {"type": mimetype});
                    return blob;
                }

                _readFileBinary(file_offset, size) {
                    let view = new Uint8Array(this.buffer, file_offset, size);
                    return view;
                }

                _readTextFile(file_offset, size) {
                    let view = new Uint8Array(this.buffer, file_offset, size);
                    let td = new TextDecoder();
                    return td.decode(view);
                }

                getTextFile(file_name) {
                    let info = this.fileInfo.find(info => info.name == file_name);
                    if (info) {
                        return this._readTextFile(info.header_offset+512, info.size); 
                    }
                }

                getFileBlob(file_name, mimetype) {
                    let info = this.fileInfo.find(info => info.name == file_name);
                    if (info) {
                        return this._readFileBlob(info.header_offset+512, info.size, mimetype); 
                    }
                }

                getFileBinary(file_name) {
                    let info = this.fileInfo.find(info => info.name == file_name);
                    if (info) {
                        return this._readFileBinary(info.header_offset+512, info.size); 
                    }
                }
            };

            tarball.TarWriter = class {
                constructor() {
                    this.fileData = [];
                }

                addTextFile(name, text, opts) {
                    let te = new TextEncoder();
                    let arr = te.encode(text);
                    this.fileData.push({
                        name: name,
                        array: arr,
                        type: "file",
                        size: arr.length,
                        dataType: "array",
                        opts: opts
                    });
                }

                addFileArrayBuffer(name, arrayBuffer, opts) {
                    let arr = new Uint8Array(arrayBuffer);
                    this.fileData.push({
                        name: name,
                        array: arr,
                        type: "file",
                        size: arr.length,
                        dataType: "array",
                        opts: opts
                    });
                }

                addFile(name, file, opts) {
                    this.fileData.push({
                        name: name,
                        file: file,
                        size: file.size,
                        type: "file",
                        dataType: "file",
                        opts: opts
                    });
                }

                addFolder(name, opts) {
                    this.fileData.push({
                        name: name,
                        type: "directory",
                        size: 0,
                        dataType: "none",
                        opts: opts
                    });
                }

                _createBuffer() {
                    let tarDataSize = 0;
                    for(let i = 0; i < this.fileData.length; i++) {                        
                        let size = this.fileData[i].size;
                        tarDataSize += 512 + 512*Math.trunc(size/512);
                        if(size % 512) {
                            tarDataSize += 512;
                        }
                    }
                    let bufSize = 10240*Math.trunc(tarDataSize/10240);
                    if(tarDataSize % 10240) {
                        bufSize += 10240;
                    }
                    this.buffer = new ArrayBuffer(bufSize); 
                }

                async download(filename) {
                    let blob = await this.writeBlob();
                    let $downloadElem = document.createElement('a');
                    $downloadElem.href = URL.createObjectURL(blob);
                    $downloadElem.download = filename;
                    $downloadElem.style.display = "none";
                    document.body.appendChild($downloadElem);
                    $downloadElem.click();
                    document.body.removeChild($downloadElem);
                }

                async writeBlob(onUpdate) {
                    return new Blob([await this.write(onUpdate)], {"type":"application/x-tar"});
                }

                write(onUpdate) {
                    return new Promise((resolve,reject) => {
                        this._createBuffer();
                        let offset = 0;
                        let filesAdded = 0;
                        let onFileDataAdded = () => {
                            filesAdded++;
                            if (onUpdate) {
                                onUpdate(filesAdded / this.fileData.length * 100);
                            }
                            if(filesAdded === this.fileData.length) {
                                let arr = new Uint8Array(this.buffer);
                                resolve(arr);
                            }
                        };
                        for(let fileIdx = 0; fileIdx < this.fileData.length; fileIdx++) {
                            let fdata = this.fileData[fileIdx];
                            // write header
                            this._writeFileName(fdata.name, offset);
                            this._writeFileType(fdata.type, offset);
                            this._writeFileSize(fdata.size, offset);
                            this._fillHeader(offset, fdata.opts, fdata.type);
                            this._writeChecksum(offset);

                            // write file data
                            let destArray = new Uint8Array(this.buffer, offset+512, fdata.size);
                            if(fdata.dataType === "array") {
                                for(let byteIdx = 0; byteIdx < fdata.size; byteIdx++) {
                                    destArray[byteIdx] = fdata.array[byteIdx];
                                }
                                onFileDataAdded();
                            } else if(fdata.dataType === "file") {
                                let reader = new FileReader();
                                
                                reader.onload = (function(outArray) {
                                    let dArray = outArray;
                                    return function(event) {
                                        let sbuf = event.target.result;
                                        let sarr = new Uint8Array(sbuf);
                                        for(let bIdx = 0; bIdx < sarr.length; bIdx++) {
                                            dArray[bIdx] = sarr[bIdx];
                                        }
                                        onFileDataAdded();
                                    };
                                })(destArray);
                                reader.readAsArrayBuffer(fdata.file);
                            } else if(fdata.type === "directory") {
                                onFileDataAdded();
                            }

                            offset += (512 + 512*Math.trunc(fdata.size/512));
                            if(fdata.size % 512) {
                                offset += 512;
                            }
                        }
                    });
                }

                _writeString(str, offset, size) {
                    let strView = new Uint8Array(this.buffer, offset, size);
                    let te = new TextEncoder();
                    if (te.encodeInto) {
                        // let the browser write directly into the buffer
                        let written = te.encodeInto(str, strView).written;
                        for (let i = written; i < size; i++) {
                            strView[i] = 0;
                        }
                    } else {
                        // browser can't write directly into the buffer, do it manually
                        let arr = te.encode(str);
                        for (let i = 0; i < size; i++) {
                            strView[i] = i < arr.length ? arr[i] : 0;
                        }
                    }
                }

                _writeFileName(name, header_offset) {
                    // offset: 0
                    this._writeString(name, header_offset, 100);
                }

                _writeFileType(typeStr, header_offset) {
                    // offset: 156
                    let typeChar = "0";
                    if(typeStr === "file") {
                        typeChar = "0";
                    } else if(typeStr === "directory") {
                        typeChar = "5";
                    }
                    let typeView = new Uint8Array(this.buffer, header_offset + 156, 1);
                    typeView[0] = typeChar.charCodeAt(0); 
                }

                _writeFileSize(size, header_offset) {
                    // offset: 124
                    let sz = size.toString(8);
                    sz = this._leftPad(sz, 11);
                    this._writeString(sz, header_offset+124, 12);
                }

                _leftPad(number, targetLength) {
                    let output = number + '';
                    while (output.length < targetLength) {
                        output = '0' + output;
                    }
                    return output;
                }

                _writeFileMode(mode, header_offset) {
                    // offset: 100
                    this._writeString(this._leftPad(mode,7), header_offset+100, 8);         
                }

                _writeFileUid(uid, header_offset) {
                    // offset: 108
                    this._writeString(this._leftPad(uid,7), header_offset+108, 8);
                }
                
                _writeFileGid(gid, header_offset) {
                    // offset: 116
                    this._writeString(this._leftPad(gid,7), header_offset+116, 8);
                }

                _writeFileMtime(mtime, header_offset) {
                    // offset: 136
                    this._writeString(this._leftPad(mtime,11), header_offset+136, 12);
                }

                _writeFileUser(user, header_offset) {
                    // offset: 265
                    this._writeString(user, header_offset+265, 32);
                }
                
                _writeFileGroup(group, header_offset) {
                    // offset: 297
                    this._writeString(group, header_offset+297, 32);
                }

                _writeChecksum(header_offset) {
                    // offset: 148
                    this._writeString("        ", header_offset+148, 8); // first fill with spaces

                    // add up header bytes
                    let header = new Uint8Array(this.buffer, header_offset, 512);
                    let chksum = 0;
                    for(let i = 0; i < 512; i++) {
                        chksum += header[i];
                    }
                    this._writeString(chksum.toString(8), header_offset+148, 8);
                }

                _getOpt(opts, opname, defaultVal) {
                    if(opts != null) {
                        if(opts[opname] != null) {
                            return opts[opname];
                        }
                    }
                    return defaultVal;
                }
                
                _fillHeader(header_offset, opts, fileType) {
                    let uid = this._getOpt(opts, "uid", 1000);
                    let gid = this._getOpt(opts, "gid", 1000);
                    let mode = this._getOpt(opts, "mode", fileType === "file" ? "664" : "775");
                    let mtime = this._getOpt(opts, "mtime", Date.now());
                    let user = this._getOpt(opts, "user", "tarballjs");
                    let group = this._getOpt(opts, "group", "tarballjs");

                    this._writeFileMode(mode, header_offset);
                    this._writeFileUid(uid.toString(8), header_offset);
                    this._writeFileGid(gid.toString(8), header_offset);
                    this._writeFileMtime(Math.trunc(mtime/1000).toString(8), header_offset);

                    this._writeString("ustar", header_offset+257,6); // magic string
                    this._writeString("00", header_offset+263,2); // magic version

                    this._writeFileUser(user, header_offset);
                    this._writeFileGroup(group, header_offset);
                }
            };

            return tarball;
        },

        // get a tarball of the files on the device
        getTar(cb){
            
            let baseName = "Unnamed";
            if(this.shortName != undefined && this.shortName.length > 0) {
            baseName = this.shortName;
            } else {
            baseName = this.mqtttopic;
            }
            let timestamp = new Date().toLocaleString().replace(/[:/]/g, '-');
            timestamp = timestamp.replace(", ","_");
            const filename = `LittleFS_${baseName}_${timestamp}.tar`;

            // read all file names....
            this.files = [];
            // calback gets called when no more folders to be read.
            this.readFolder('/', ()=>{
                let tarball = this.tarball();
                let tar = new tarball.TarWriter();

                let nextfile = ()=>{
                    for (i = 0;i < this.files.length; i++){
                        if (this.files[i].type === 1 && !this.files[i].added) {
                            this.files[i].added = 1;
                            let url = window.device+'/api/lfs'+this.files[i].name;
                            fetch(url)
                                .then(response => response.arrayBuffer())
                                .then(buff => {
                                    tar.addFileArrayBuffer(this.files[i].name.slice(1), buff);
                                    setTimeout(nextfile, 0);
                                });
                            return;
                        }
                    }
                    // no files left to do...
                    tar.download(filename);
                    if (cb)cb();
                };
                setTimeout(nextfile, 0);
            });

        },

        putTar(buff, cb){
            let tarball = this.tarball();
            let tar = new tarball.TarReader();

            let fileInfo = tar.readArrayBuffer(buff);

            let nextfile = ()=>{
                let i;
                for(i = 0; i < fileInfo.length; i++) {
                    let file_name = fileInfo[i].name;
                    console.log("file name: ", file_name);
                    console.log("file size: ", fileInfo[i].size);
                    console.log("file type: ", fileInfo[i].type);
                    if(fileInfo[i].type == "file" && !fileInfo[i].saved) {
                        fileInfo[i].saved = true;
                        let buff = tar.getFileBinary(file_name);
                        this.savefile(file_name, buff, ()=>{
                            console.log("saved file name: ", file_name);
                            setTimeout(nextfile, 0);
                        });
                        return;
                    }                        
                }
                if (i === fileInfo.length){
                    console.log('all files saved');
                    this.read();
                    if (cb)cb();
                }
            };

            nextfile();
        },

    },
    mounted (){
        this.msg = 'fred';

        // construct tarball class
        this.tar = this.tarball();

        console.log('mounted filesystem');
        this.getinfo();
        setTimeout(() => {
           this.read();
         }, 250); // 250 ms
    }
  }
//@ sourceURL=/vue/filesystem.vue
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
    .center {
        margin: 0;
        position: absolute;
        top: 50%;
        left: 50%;
        -ms-transform: translate(-50%, -50%);
        transform: translate(-50%, -50%);
    }

    .left {
        position: absolute;
        left:0;
        width:30%;
        height:100%;
    }
    .middle {
        position: absolute;
        left:30%;
        width:20%;
        height:100%;
    }
    .right {
        position: absolute;
        left:50%;
        width:50%;
        height:100%;
    }
    .fill {
        height:90%;
    }
    .top {
        height:10%;
    }
    .bottom {
        height:90%;
        position: relative;
    }
</style>
