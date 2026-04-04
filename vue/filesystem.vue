<template>
    <div class="fill">
        <div class="helpBox">
            <div class="helpIntro">This tab lets you browse and manage files stored on LittleFS:</div>
            <ul class="helpList">
                <li><strong>List filesystem</strong> shows all files and folders on the device.</li>
                <li>Click a filename to open it in the editor.</li>
                <li><strong>Create file</strong> creates a new file on the device (for example, <code>autoexec.bat</code>).</li>
                <li>You can also upload files by dragging and dropping them onto the drop area.</li>
                <li><strong>Reset scripts</strong> stops all running script threads without rebooting the device.</li>
                <li>Use <strong>Save, reset SVM, and run</strong> to test changes with a clean scripting state.</li>
            </ul>
            <div class="helpFooter">
                LittleFS files can also be accessed via <code>{{ deviceBase }}/api/lfs/&lt;filename&gt;</code>.
                For details, see the <a href="https://www.elektroda.com/rtvforum/topic3971355.html">OpenBeken/Tasmota REST tutorial</a>.
            </div>
        </div>

<div class="top toolbar">
            <div class="toolbarRow">
                <button @click="read(null, $event)">List filesystem</button>
                <button @click="create(null, $event)">Create file</button>
                <button @click="upload(null, $event, false)">Upload file(s)</button>
                <button @click="upload(null, $event, true)">Upload as gzip (.gz)</button>
                <button @click="showUrlModal = true">Fetch from URLs</button>
                <button @click="getTar(null, $event)">Download filesystem backup (.tar)</button>
            </div>
            <div class="toolbarRow toolbarRowAdvanced">
                <button @click="backup(null, $event)">Read FS block</button>
                <button @click="restore(null, $event)">Restore FS block</button>
                <button @click="resetSVM(null, $event)">Reset scripts</button>
                <button class="danger" @click="formatLittleFS(null, $event)">Format LittleFS</button>
                <button class="danger" @click="resizeLittleFS(null, $event)">Resize LittleFS</button>
            </div>
        </div>
        <div class="bottom">
<div v-if="showUrlModal" class="modalOverlay" @click.self="showUrlModal = false">
    <div class="modal">
        <h3>Fetch from URLs</h3>
        <p class="modalHelp">The web app will download each URL and save the file to LittleFS.</p>
        <textarea v-model="urlInput" rows="10"></textarea>
        <label class="modalOption"><input type="checkbox" v-model="urlGzip"> Compress using gzip (.gz)</label>
        <div class="modalActions">
            <button @click="fetchFromUrls">Fetch</button>
            <button @click="showUrlModal = false">Cancel</button>
        </div>
    </div>
</div>
            <div class="left">
                <div class="folderBox">
                    <label for="folderInput"><strong>Target Folder (Optional)</strong></label><br/>
                    <input id="folderInput" class="folderInput" type="text" v-model="folder" placeholder="e.g., www">
                    <div class="folderHelp">
                        Used for uploads and newly created files. Leave blank to save to the LittleFS root.
                    </div>
                </div>
                <div class="drop" @drop="dropHandler($event)" @dragover="dragOverHandler($event)">
                    <div class="otatext center" v-html="otatext"></div>
                </div>
                <div class="logText" v-html="status"></div>
                <div class="logText" v-html="output"></div>
            </div>
            <div class="middle">
                <div>
                    <div v-for="file in files" v-bind:key="file.name" v-if="file.type === 1" class="fileRow">
                        <button class="fileBtn" @click="editfile(file.name)">{{file.name}}</button>
                        <span class="fileSize">- {{file.size}}</span>
                    </div>
                    <div v-if="files.length > 0">
                        <strong>Total Size: {{ totalBytes }} bytes</strong>
                    </div>
                </div>
            </div>
            <div class="right">
                <h2 id="fileEditorLabel">File editor: select or create a file to begin.</h2>
                <div id="fileEditorBody" class="editorBody" style="display:none">
                    <div class="editorActions">
                        <button @click="save(null, $event)">Save</button>
                        <button @click="save(startScript_simple)">Save and run as script thread</button>
                        <button @click="save(startScript_firstReset)">Save, reset SVM, and run as script thread</button>
                        <button @click="deleteFile(null, $event)">Delete</button>
                        <button @click="openInBrowser(null, $event)">Open in browser</button>
                    </div>
                    <textarea v-model="edittext" rows="40" cols="100"></textarea>
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
        status:'Ready.',
        folder:'',
        otatext:'Drop file(s) or a .tar archive here',
        shortName:'',
        mqtttopic:'',
        deviceBase: '',
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
                    this.status += `<br/>Error fetching ${url}: ${e}`;
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
                            this.status += '<br/>Uploading tar archive: '+files[0].filepath;
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
                        this.status += '<br/>Saving '+files[filecount].filepath;
                        this.savefile(files[filecount].filepath, event.target.result, ()=>{
                            filecount++;
                            this.status += ' done.';
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
            this.status += '<br/>Saving file...';
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
                    this.status += ' done.';
                    if(cb) cb();
                })
                .catch(err => console.error(err)); // Never forget the final catch!
        },

        backup(cb){
            this.status += '<br/>Starting backup...';
            let url = window.device+'/api/fsblock';
            fetch(url)
                .then(response => response.arrayBuffer())
                .then(buffer => {
                    this.backupdata = buffer; 
                    console.log('received '+buffer.byteLength);
                    this.status += ' backup complete.';
                    if(cb) cb();
                })
                .catch(err => console.error(err)); // Never forget the final catch!
        },

        restore(cb){
            this.status += '<br/>Starting restore...';
            let url = window.device+'/api/fsblock';
            if (this.backupdata){
                fetch(url, { 
                        method: 'POST',
                        body: this.backupdata
                    })
                    .then(response => response.text())
                    .then(text => {
                        console.log('received '+text);
                        this.status += ' restore complete.';
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
                    this.status += '<br/>Reading '+url;
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
            this.readFolder('/', cb);
        },


        create(cb) {
            let fname = prompt("Enter a new filename:", "autoexec.bat");
            if(fname == null)
            {
                 alert("Canceled.");
            }
            else if(fname.length < 1)
            {
                 alert("Filename cannot be empty.");
            }
            else
            {
                 //alert("TODO "+fname);
                 alert("Creating " + fname + "...");
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
                    document.getElementById("fileEditorLabel").innerHTML = "Editing: "+name;
                    document.getElementById("fileEditorBody").style.display = "flex";
                });
        },



        deleteFile(cb) {   
            let readCallback = this.read;
            if (this.editname) {
                let r = confirm("Do you want to delete the file " + this.editname + "?");
                if (r == false) {
                    alert("Delete canceled.");
                    return;
                }
                let url = window.device + '/api/del' + this.editname;
                alert("Deleting file...");
                fetch(url)
                    .then(response => response.arrayBuffer())
                    .then(buffer => {
                        this.status += '<br/>Delete complete.';
                        if (cb) cb();
                        readCallback();
                    })
                    .catch(error => {
                        this.status += `<br/>Delete failed: ${error}`;
                        readCallback();
                        alert("Error deleting file: " + error);
                    });
            } else {
                alert("Select a file from the list to edit first.");
            }
        },

        openInBrowser(cb) {   
            if (this.editname) {
                let url = window.device+'/api/lfs'+this.editname;
              //  alert("Will try to open - url is "+url);
                // open URL in new window
                window.open(url, '_blank');
            } else {
                alert("Select a file from the list to edit first.");
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
                alert("Select a file from the list to edit first.");
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
        formatLittleFS(cb, event) {
            const r = confirm("Format LittleFS? This will permanently delete all files on the device.");
            if (r === false) {
                this.status += '<br/>LittleFS format canceled.';
                return;
            }

            // Close the editor (the file may no longer exist after formatting)
            this.edittext = '';
            this.editname = '';
            const lbl = document.getElementById('fileEditorLabel');
            const body = document.getElementById('fileEditorBody');
            if (lbl) lbl.innerHTML = 'File editor: select a file to begin.';
            if (body) body.style.display = 'none';

            this.status += '<br/>Formatting LittleFS...';
            const url = window.device + '/api/cmnd';
            const cmd = 'lfs_format';

            fetch(url, {
                body: cmd,
                method: 'POST',
            })
                .then(response => response.text())
                .then(text => {
                    console.log('lfs_format response:', text);
                    this.status += ' done.';
                    if (cb) cb();

                    // The format can take a moment; refresh the listing shortly afterwards.
                    setTimeout(() => {
                        this.read();
                    }, 1500);
                })
                .catch(err => {
                    console.error(err);
                    this.status += '<br/>LittleFS format failed: ' + err;
                });
        },
        resizeLittleFS(cb, event) {
            const input = prompt(
                "Enter new LittleFS size in bytes (hex like 0x10000 or decimal like 65536):",
                "0x10000"
            );

            if (input === null) {
                this.status += '<br/>LittleFS resize canceled.';
                return;
            }

            const raw = input.trim();
            if (!raw) {
                alert("Size cannot be empty.");
                return;
            }

            // Accept hex (0x...) or decimal
            let sizeVal = null;
            if (/^0x[0-9a-fA-F]+$/.test(raw)) {
                sizeVal = parseInt(raw, 16);
            } else if (/^[0-9]+$/.test(raw)) {
                sizeVal = parseInt(raw, 10);
            } else {
                alert("Invalid size. Use hex like 0x10000 or decimal like 65536.");
                return;
            }

            if (!Number.isFinite(sizeVal) || sizeVal <= 0) {
                alert("Size must be a positive number.");
                return;
            }

            // Normalise to hex for the command (matches your example)
            const sizeHex = '0x' + sizeVal.toString(16);

            const ok = confirm(
                `Resize LittleFS to ${sizeHex} (${sizeVal} bytes)?\n\nThis will erase existing files. Reboot to apply.`
            );
            if (!ok) {
                this.status += '<br/>LittleFS resize canceled.';
                return;
            }

            // Safer UX: close editor (resizing can invalidate files)
            this.edittext = '';
            this.editname = '';
            const lbl = document.getElementById('fileEditorLabel');
            const body = document.getElementById('fileEditorBody');
            if (lbl) lbl.innerHTML = 'File editor: select a file to begin.';
            if (body) body.style.display = 'none';

            this.status += `<br/>Resizing LittleFS to ${sizeHex}...`;
            const url = window.device + '/api/cmnd';
            const cmd = `lfs_size ${sizeHex}`;

            fetch(url, { body: cmd, method: 'POST' })
                .then(r => r.text())
                .then(text => {
                    console.log('lfs_size response:', text);
                    this.status += ' done.';
                    if (cb) cb();

                    // Give the device a moment, then refresh file list
                    setTimeout(() => this.read(), 1500);
                })
                .catch(err => {
                    console.error(err);
                    this.status += '<br/>LittleFS resize failed: ' + err;
                });
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
                alert("Select a file from the list to edit first.");
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

        this.deviceBase = (window.device || '').toString().replace(/\/+$/, '');
        if (!this.deviceBase) this.deviceBase = 'http://<device-ip>';

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
    .fill {
        display: flex;
        flex-direction: column;
        gap: 12px;
        height: 100%;
        min-height: 0;
    }

        /* Help text: always visible, but compact so actions stay near the top. */
    .helpBox {
        font-size: 0.85em;
        line-height: 1.25em;
        padding: 8px 10px;
        border: 1px solid rgba(0, 0, 0, 0.12);
        border-radius: 6px;
        background: rgba(0, 0, 0, 0.02);
    }
    .helpIntro {
        margin: 0 0 6px 0;
        font-weight: 600;
    }
    .helpList {
        margin: 0 0 6px 18px;
        padding: 0;
        columns: 2;
        column-gap: 26px;
    }
    .helpList li {
        break-inside: avoid;
        margin: 0 0 2px 0;
    }
    .helpFooter {
        margin: 0;
    }


    /* Action toolbar */
    .top.toolbar {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    .toolbarRow {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        align-items: center;
    }
    .toolbarRowAdvanced {
        padding-top: 0;
        border-top: none;
    }
    button.danger {
        border-width: 2px;
    }

    /* Main 3-column layout */
    .bottom {
        flex: 1 1 auto;
        min-height: 0;
        display: grid;
        grid-template-columns: 300px 280px 1fr;
        gap: 12px;
        position: relative;
        padding-top: 10px;
        border-top: 1px solid rgba(0, 0, 0, 0.12);
    }

    .left,
    .middle,
    .right {
        position: static;
        width: auto;
        height: auto;
        min-height: 0;
        overflow: auto;
        box-sizing: border-box;
    }

    .left {
        padding: 4px 8px 4px 0;
    }
    .middle {
        padding: 4px 8px 4px 12px;
        border-left: none;
    }
    .right {
        padding: 4px 0 4px 12px;
        border-left: none;
    }


    /* Middle panel: file list spacing */
    .fileRow {
        display: flex;
        align-items: center;
        gap: 6px;
        margin: 0 0 6px 0;
        flex-wrap: wrap;
    }
    .fileBtn {
        padding: 2px 6px;
    }
    .fileSize {
        white-space: nowrap;
    }


    /* Left panel */
    .folderBox {
        margin: 0 0 10px 0;
        width: 100%;
    }
    .folderInput {
        width: 100%;
        box-sizing: border-box;
        padding: 4px 6px;
    }
    .folderHelp {
        margin-top: 4px;
        font-size: 0.9em;
        line-height: 1.2em;
        word-break: break-word;
    }

    .logText {
        font-size: 0.88em;
        line-height: 1.25em;
        word-break: break-word;
    }


    .drop {
        border: 4px solid #3b82f6;
        background: #ffffff;
        color: #000000;
        margin: 10px 0 10px 2px;
        width: 240px;
        max-width: 100%;
        height: 120px;
        text-align: center;
        position: relative;
        vertical-align: center;
        box-sizing: border-box;
    }
    .center {
        margin: 0;
        position: absolute;
        top: 50%;
        left: 50%;
        -ms-transform: translate(-50%, -50%);
        transform: translate(-50%, -50%);
    }

    /* Right panel: editor */
    #fileEditorLabel {
        margin: 0 0 8px 0;
        font-size: 1.05em;
        line-height: 1.25em;
    }
    .editorBody {
        gap: 8px;
        flex-direction: column;
        min-height: 0;
    }
    .editorActions {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        align-items: center;
    }
    .editorBody textarea {
        width: 100%;
        box-sizing: border-box;
        flex: 1 1 auto;
        min-height: 340px;
        height: 100%;
    }

    /* Modal */
    .modalOverlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.35);
        z-index: 1000;
        display: flex;
        justify-content: center;
        align-items: flex-start;
        padding: 10vh 12px 12px 12px;
        box-sizing: border-box;
    }
    .modal {
        background: #ffffff;
        border: 1px solid rgba(0, 0, 0, 0.35);
        padding: 12px;
        width: min(720px, 92vw);
        box-sizing: border-box;
        border-radius: 6px;
    }
    .modal h3 {
        margin: 0 0 8px 0;
        font-size: 1.05em;
    }
    .modalHelp {
        margin: 0 0 8px 0;
    }
    .modal textarea {
        width: 100%;
        box-sizing: border-box;
    }
    .modalOption {
        display: inline-flex;
        gap: 6px;
        align-items: center;
        margin-top: 8px;
    }
    .modalActions {
        display: flex;
        justify-content: flex-end;
        gap: 6px;
        margin-top: 10px;
    }

    /* Responsive: stack columns on narrower screens */
    @media (max-width: 1000px) {
        .bottom {
            grid-template-columns: 1fr;
        }
        .helpList {
            columns: 1;
        }
        .left,
        .middle,
        .right {
            overflow: visible;
        }
        .editorBody textarea {
            min-height: 260px;
        }
    }
</style>