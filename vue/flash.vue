<template>
    <div>
        <div>
            Here you can read device flash directly. RF config is Beken internal configuration memory and OBK Config is our configuration structure.<br>
            Here you can also recover your device from "MAC ends with 00 00 00 and is unable to change" bug. Button 'Restore RF config' will restore RF partition for T and N and set a random MAC address, but this also requires rebooting device later.<br>
            

            <table class="my-table">
            <tr>
                <th>Read</th>
                <th>Download</th>
                <th>Write</th>
                <th>Extra</th>
            </tr>
            <tr>
                <td> <button @click="rf(null, $event)">Read RF Config</button></td>
                <td><a :href="rfurl" download="rfdata">Download RF</a></td>
                <td>
                </td>
                <td><button @click="restore_rf(null, $event)">Restore (Recreate) RF Config (N & T)</button></td>
            </tr>
            <tr>
                <td>  <button @click="config(null, $event)">Read OBK Config</button></td>
                <td> <a :href="configurl" download="configdata">Download OBK Config</a></td>
                <td>
                <div>
                    <label for="cfgFilePicker">Select file with binary CFG header:</label><input id="cfgFilePicker"
                    type="file" @change="cfgFileSelected($event)">
                    <div v-html="cfgStatus" :class="{invalid: invalidCFGSelected}"></div>
                    <button @click="writeCFG(null, $event)">Start CFG write</button>
                </div>
                </td>
                <td></td>
            </tr>
            <tr>
                <td> <button @click="flashvars(null, $event)">Read Beken FlashVars (unused?)</button></td>
                <td><a :href="flashvarsurl" download="flashvarsdata">Download Flash Vars</a></td>
                <td></td>
                <td></td>
            </tr>
            <tr>
                <td></td>
                <td> <button @click="downloadFullDump(null, $event)">Download full 2MB dump</button></td>
                <td></td>
                <td></td>
            </tr>
            <tr>
                <td>  <button @click="readTuyaConfig(null, $event)">Read Tuya GPIO Config</button></td>
                <td> <button @click="downloadTuyaConfig(null, $event)">Download Tuya GPIO Config</button></td>
                <td></td>
                <td></td>
            </tr>
            <tr>
                <td>  <button @click="readCustom(null, $event)">Read Custom (prompts for ofs/len)</button></td>
                <td> <button @click="downloadCustom(null, $event)">Download Custom (prompts for ofs/len)</button></td>
                <td></td>
                <td></td>
            </tr>
            </table>
                <div>
                    <h4> Current job status</h4>
                    <div v-html="status" :class=""></div>
                </div>



           
          
           
            <br/>
            
            <br/>
            
            <br/>
           
            <br/>
            
        </div>
        <div v-html="display" class="display"></div>
    </div>
</template>

<script>
  module.exports = {

    data: ()=>{
      return {
        msg: 'world!',
        rfdata: null,
        fullDumpData: null,
        fullDumpCurAt: 0,
        fullDumpFlashStart: 0,
        fullDumpFlashSize: 0,
        fullDumpErrors: 0,
        fullDumpRunning:0,
        fullDumpChunkSize: 0,
        display: '',
        configdata: null,
        build:'unknown',
        chipset:'unknown',
        status:'',
        shortName:'',
        rfurl: '',
        configurl: '',
        flashvarsurl: '',
        otatext:'Drop OTA file here',
        invalidOTASelected: false,
        cfgtext:'Drop CFG file here',
        invalidCFGSelected: true,
        cfgStatus: 'no file selected',
      }
    },
    methods:{
        getinfo(){
            let url = window.device+'/api/info';
            fetch(url)
                .then(response => response.json())
                .then(res => {
                    this.build = res.build;
                    this.shortName = res.shortName;
                    this.chipset = res.chipset;     //Set chipset to fixed value for testing
                    this.rfurl = window.device+'/api/flash/'+this.getRFAddress();
                    this.configurl = window.device+'/api/flash/'+this.getConfigAddress();
                    this.flashvarsurl = window.device+'/api/flash/'+this.getFlashVarsAddress();
                })
                .catch(err => {
                    this.error = err.toString();
                    console.error(err)
                }); // Never forget the final catch!
        },
        writeCFG(cb){
            if(this.invalidCFGSelected )
            {
                alert("Sorry, invalid CFG file selected");
                return;
            }
            let confirmationForUser = prompt("Are you sure? This will overwrite your OBK config (pins, channels, flags, WiFi data, IP, MQTT, short startup command) Y/N", "N");
            if(confirmationForUser == null)
            {
            }
            else if(confirmationForUser.length < 1)
            {
            }
            else
            {
                if(confirmationForUser[0] == 'Y') {
                    this.status += '<br/>starting CFG write...';
                    this.writeCFG_Internal(cb);
                }
            }
        },   
         writeCFG_Internal(cb){
            if(this.invalidCFGSelected )
            {
                alert("Sorry, invalid CFG file selected");
                return;
            }
            this.cfgStatus += 'Writing OBK config...';
            let url = window.device+'/api/flash/'+this.getConfigAddress();
            console.log('Will use URL '+url);
                fetch(url, { 
                        method: 'POST',
                        body: this.cfgdata
                    })
                    .then(response => response.text())
                    .then(text => {
                        console.log('received '+text);
                        this.cfgStatus = 'Write OBK cfg complete! Now you should reboot...';
                        if(cb) cb();
                    })
                    .catch(err => console.error(err)); // Never forget the final catch!
        },
        cfgFileSelected(ev){
            console.log("CFG File selected");
            this.invalidCFGSelected = false; //Reset status style

            var file = ev.target.files[0];  //There should be only one file
            if (file){
                console.log('... CFG fileName = ' + file.name);
                var reader = new FileReader();
                reader.onload = (event) => this.checkCFGData(event, file, "selected");
                reader.readAsArrayBuffer(file);
            }
        },
        isCFGImage(arrayBuffer){
            let view = new DataView(arrayBuffer);
            if (view.byteLength < 3) return false;
            console.log("isCFGImage sees " +view);
            // CFG
            return view.getUint8(0) === 0x43 && view.getUint8(1) === 0x46 && view.getUint8(2) === 0x47;
        },
        checkCFGData(event, file, operation){
            this.cfgdata = null;    //Reset otadata
            
            var result = event.target.result;   //ArrayBuffer
            console.log('chipset=' + this.chipset);
            console.log("Checking CFG data");
            console.log(result);
            console.log('cfgdata len:' + result.byteLength);
            this.cfgtext = file.name + ' len:' + result.byteLength;

            this.invalidCFGSelected = !this.isCFGImage(result);

            if (this.invalidCFGSelected){
                console.log("this cfg is incorrect");
                this.cfgStatus = 'Invalid CFG file was ' + operation;
            }
            else{
                console.log("this cfg is OK");
                this.cfgStatus = 'Correct CFG file selected';
                this.cfgdata = result;
            }
        },
        getRFAddress(){
            if(this.chipset === "BK7231T") {
				return '1e0000-1000';
			}
            if(this.chipset === "BK7231N") {
				return '1d0000-1000';
			}
            console.log('getRFAddress is not implemented for '+this.chipset);
			return '1e0000-1000';
        },
        getConfigAddress(){
            if(this.chipset === "BK7231T") {
				return '1e1000-1000';
			}
            if(this.chipset === "BK7231N") {
				return '1d1000-1000';
			}
            console.log('getConfigAddress is not implemented for '+this.chipset);
			return '1e1000-1000';
        },
        appendArrayBuffers(buffer1, buffer2) {
            const combinedLength = buffer1.byteLength + buffer2.byteLength;
            const combinedBuffer = new ArrayBuffer(combinedLength);
            const combinedView = new Uint8Array(combinedBuffer);

            const buffer1View = new Uint8Array(buffer1);
            const buffer2View = new Uint8Array(buffer2);

            combinedView.set(buffer1View, 0);
            combinedView.set(buffer2View, buffer1.byteLength);

            return combinedBuffer;
        },
        downloadArrayBuffer(arrayBuffer, filename) {
            const blob = new Blob([arrayBuffer]);
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = filename;

            // Programmatically click the link to start the download
            link.click();

            // Clean up resources
            window.URL.revokeObjectURL(link.href);
        },
        generateFullDumpDownloadForBrowser() {
            let fileName = this.chipset + "_"+this.fullDumpStyle+"_";
            if(this.shortName!=undefined && this.shortName.length>0){
                fileName += this.shortName;
            }
            else{
                fileName += "Unnamed";
            }
            this.downloadArrayBuffer(this.fullDumpData, fileName+".bin");
        },
        onFullDumpReadyForDownload(){
            this.fullDumpRunning = 0;
            this.status += '<br>Full dump ready!</br>';
            this.generateFullDumpDownloadForBrowser();
        },
        downloadFullDumpFragment(){
            // set address and size to string like "1e3000-2000"
            let fullAdr = this.fullDumpCurAt.toString(16) + "-"+ this.fullDumpChunkSize.toString(16);
            this.status += ''+this.fullDumpCurAt.toString(16)+"...";
            console.log("downloadFullDumpFragment is requesting " + fullAdr + "!");
            let url = window.device+'/api/flash/'+fullAdr;
            
            const retryWithDelay = () => {
                setTimeout(() => {
                this.downloadFullDumpFragment();
                }, 1000);
            };
            const nextWithDelay = () => {
                setTimeout(() => {
                this.downloadFullDumpFragment();
                }, 250);
            };

            fetch(url)
                .then(response => response.arrayBuffer())
                .then(buffer => {
                    if(buffer.byteLength != this.fullDumpChunkSize) {
                        this.status += "bad len " + buffer.byteLength + ", retrying...";
                        retryWithDelay();
                        return;
                    }
                    this.fullDumpErrors = 0;
                    this.fullDumpData = this.appendArrayBuffers(this.fullDumpData, buffer);
                    this.fullDumpCurAt += this.fullDumpChunkSize;
                    if(this.fullDumpCurAt >= (this.fullDumpFlashStart+this.fullDumpFlashSize)){
                        this.onFullDumpReadyForDownload();
                        return;
                    }
                    nextWithDelay();
                })
                .catch(err => {
                        this.fullDumpErrors ++;
                        if(this.fullDumpErrors > 100) {
                            console.error("Fragment error, too many failed attempts, stopping!");
                            console.error(err);
                            this.status += "error! Too many failed attempts.<br>";
                            this.fullDumpRunning = 0;
                        } else {
                            console.warn("Fragment error, will retry!");
                            console.warn(err);
                            this.status += "error, retrying...";
                            retryWithDelay();
                        }
                    }); // Never forget the final catch!
        },
	 readCustom(cb) {
	    let offset = prompt("Enter the offset (in hex):", "0x0");
	    let length = prompt("Enter the length (in bytes):", "256");
	    offset = parseInt(offset, 16);
	    length = parseInt(length);
	
	    if (isNaN(offset) || isNaN(length)) {
	        this.status += '<br/>Invalid offset or length entered.';
	        return;
	    }
	
	    this.status += `<br/>reading custom data from offset ${offset.toString(16)} with length ${length}...`;
	    let url = window.device + `/api/flash/${offset.toString(16)}-${length.toString(16)}`;
	    console.log('Will use URL ' + url);
	
	    fetch(url)
	        .then(response => response.arrayBuffer())
	        .then(buffer => {
	            this.configdata = buffer;
	            console.log('received ' + buffer.byteLength);
	            this.status += '..got custom data...';
	            this.dump(buffer);
	            if (cb) cb();
	        })
	        .catch(err => console.error(err)); // Never forget the final catch!
	},
	
	downloadCustom(cb) {
	    let offset = prompt("Enter the offset (in hex):", "0x0");
	    let length = prompt("Enter the length (in bytes):", "256");
	    offset = parseInt(offset, 16);
	    length = parseInt(length);
	
	    if (isNaN(offset) || isNaN(length)) {
	        this.status += '<br/>Invalid offset or length entered.';
	        return;
	    }
	
	    this.status += `<br/>downloading custom data from offset ${offset.toString(16)} with length ${length}...`;
	    let url = window.device + `/api/flash/${offset.toString(16)}-${length.toString(16)}`;
	    console.log('Will use URL ' + url);
	
	    fetch(url)
	        .then(response => response.arrayBuffer())
	        .then(buffer => {
	            this.downloadArrayBuffer(buffer, `custom_${offset.toString(16)}-${length}.bin`);
	            if (cb) cb();
	        })
	        .catch(err => console.error(err)); 
	},  
        downloadFullDump() {
            if(0){
                alert("Not functional yet");
                return;
            }
			let rep = prompt("Are you certain? This option is currently slow, may crash OBK on older version so you have to repower it manually, and also may still restart OBK several times on newer builds. It is better to just download only config partition and LittleFS TAR. Futhermore, flashing full 2MB of one device to another device is BAD idea. WiFi calibration is per device! Enter yes.", "no");
			if (rep != null) {
				  if(rep[0] == "y") {
				  } else {
                    return;
                  }
			} else {
                return;
            }
            this.fullDumpStyle = "QIO";
            this.fullDumpFlashStart = 0;
            this.fullDumpFlashSize = 2097152;
            this.doFlashDumpInternal();
        },
        doFlashDumpInternal() {
            if(this.fullDumpRunning!=0){
                alert("Flash dump is already requested, wait for processing first.");
                return;
            }
            // start with empty data
            this.fullDumpRunning = 1;
            console.log("doFlashDumpInternal started!");
            this.status += '<br/>reading full dump...';
            this.fullDumpData = new ArrayBuffer();
            this.fullDumpCurAt = this.fullDumpFlashStart;
            this.fullDumpChunkSize = 4096;
            this.fullDumpErrors = 0;
            this.downloadFullDumpFragment();
        },
        getFlashVarsAddress(){
            // "NET info" + len(0x1000) + 0x1000
            if(this.chipset === "BK7231T") {
				return '1e3000-2000';
			}
            if(this.chipset === "BK7231N") {
				return '0x1D3000-2000';
			}
            console.log('getConfigAddress is not implemented for '+this.chipset);
			return '1e1000-1000';
        },
        rf(cb){
            this.status += '<br/>reading rf config...';
            let url = window.device+'/api/flash/'+this.getRFAddress();
            console.log('Will use URL '+url);
            fetch(url)
                .then(response => response.arrayBuffer())
                .then(buffer => {
                    this.rfdata = buffer; 
                    console.log('received '+buffer.byteLength);
                    this.status += '..got rf config...';
                    this.dump(buffer);
                    if(cb) cb();
                })
                .catch(err => console.error(err)); // Never forget the final catch!
        },
        getTuyaConfigAddress(){
            if(this.chipset === "BK7231T") {
				return 0x1EE000;
		}
            if(this.chipset === "BK7231N") {
				return 0x1EE000;
		}
		return 0x1D8000;
        },
        readTuyaConfig(cb){
            this.status += '<br/>reading tuya config...';
            let url = window.device+'/api/flash/1EE000-1000';
            console.log('Will use URL '+url);
            fetch(url)
                .then(response => response.arrayBuffer())
                .then(buffer => {
                    this.configdata = buffer; 
                    console.log('received '+buffer.byteLength);
                    this.status += '..got tuya config...';
                    this.dump(buffer);
                    if(cb) cb();
                })
                .catch(err => console.error(err)); // Never forget the final catch!
        },
        downloadTuyaConfig() {
            this.fullDumpFlashStart = 0x1EE000;
            this.fullDumpFlashSize = 73728;
            this.fullDumpStyle = "TuyaConfig";
            // it ends at 2097152 - at 2MB
            this.doFlashDumpInternal();
        },
        config(cb){
            this.status += '<br/>reading config...';
            let url = window.device+'/api/flash/'+this.getConfigAddress();
            console.log('Will use URL '+url);
            fetch(url)
                .then(response => response.arrayBuffer())
                .then(buffer => {
                    this.configdata = buffer; 
                    console.log('received '+buffer.byteLength);
                    this.status += '..got  config...';
                    this.dump(buffer);
                    if(cb) cb();
                })
                .catch(err => console.error(err)); // Never forget the final catch!
        },
        flashvars(cb){
            this.status += '<br/>reading flashvars...';
            let url = window.device+'/api/flash/'+this.getFlashVarsAddress();
            console.log('Will use URL '+url);
            fetch(url)
                .then(response => response.arrayBuffer())
                .then(buffer => {
                    this.configdata = buffer; 
                    console.log('received '+buffer.byteLength);
                    this.status += '..got rf config...';
                    this.dump(buffer);
                    if(cb) cb();
                })
                .catch(err => console.error(err)); // Never forget the final catch!
        },
        restore_rf(cb){
			  let rep = prompt("Are you certain? Use this option only if you already broke your RF partition and your MAC ends with 00 00. Otherwise new RF partition might have worse calibration data so WiFi quality will decrease. Enter yes.", "no");
			  if (rep != null) {
				  if(rep == "yes") {
					this.restore_rf_internal(cb);
				  }
			  }
			
		},
		/**
		 * Returns a random integer between min (inclusive) and max (inclusive).
		 * The value is no lower than min (or the next integer greater than min
		 * if min isn't an integer) and no greater than max (or the next integer
		 * lower than max if max isn't an integer).
		 * Using Math.round() will give you a non-uniform distribution!
		 */
		getRandomInt(min, max) {
			min = Math.ceil(min);
			max = Math.floor(max);
			return Math.floor(Math.random() * (max - min + 1)) + min;
		},
        restore_rf_internal(cb){
            this.status += '<br/>Restoring RF config...';
            console.log('restore rf ');
            let url = window.device+'/api/flash/'+this.getRFAddress();
            console.log('Will use URL '+url);
			let correct_rf_config;

// At this moment, I am not sure if we can use single format for T and N
// Those are RF configs copied from my devices
            if(this.chipset === "BK7231T") {
				correct_rf_config = [0x54,0x4c,0x56,0x00,0xe0,0x01,0x00,0x00,0x00,0x11,0x11,0x11,0x5a,0x00,0x00,0x00,0x01,0x11,0x11,0x11,0x04,0x00,0x00,0x00,0x4e,0x61,0xbc,0x00,0x02,0x11,0x11,0x11,
0x06,0x00,0x00,0x00,0x84,0xe3,0x42,0xb2,0x61,0xbf,0x03,0x11,0x11,0x11,0x04,0x00,0x00,0x00,0x1d,0x01,0x00,0x00,0x04,0x11,0x11,0x11,0x04,0x00,0x00,0x00,0x8e,0x15,
0x53,0x01,0x05,0x11,0x11,0x11,0x04,0x00,0x00,0x00,0x1b,0x00,0x00,0x00,0x06,0x11,0x11,0x11,0x04,0x00,0x00,0x00,0x55,0x00,0x54,0x03,0x07,0x11,0x11,0x11,0x08,0x00,
0x00,0x00,0x10,0x00,0x00,0x00,0x10,0x00,0x00,0x00,0x00,0x22,0x22,0x22,0xa2,0x00,0x00,0x00,0x01,0x22,0x22,0x22,0x04,0x00,0x00,0x00,0x0f,0x00,0x00,0x00,0x02,0x22,
0x22,0x22,0x0e,0x00,0x00,0x00,0x0f,0x8f,0x8f,0x8e,0x8e,0x8e,0x8d,0x8d,0x8d,0x8c,0x8b,0x8b,0x0a,0x8a,0x03,0x22,0x22,0x22,0x0e,0x00,0x00,0x00,0x11,0x91,0x91,0x90,
0x8f,0x8f,0x8e,0x8d,0x8d,0x8c,0x8b,0x8a,0x09,0x89,0x04,0x22,0x22,0x22,0x0e,0x00,0x00,0x00,0x0e,0x8e,0x8e,0x8d,0x8c,0x8c,0x8b,0x8a,0x8a,0x89,0x88,0x87,0x06,0x86,
0x05,0x22,0x22,0x22,0x04,0x00,0x00,0x00,0x02,0x00,0x00,0x00,0x06,0x22,0x22,0x22,0x04,0x00,0x00,0x00,0x03,0x00,0x00,0x00,0x07,0x22,0x22,0x22,0x28,0x00,0x00,0x00,
0x90,0x90,0x90,0x90,0x90,0x8f,0x8f,0x8f,0x8f,0x8f,0x8e,0x8e,0x8e,0x8e,0x8e,0x8d,0x8d,0x8d,0x8d,0x0c,0x8c,0x8c,0x8c,0x8c,0x8c,0x8c,0x8c,0x8c,0x8c,0x8c,0x8c,0x8c,
0x8c,0x8c,0x8c,0x8c,0x8c,0x8c,0x8c,0x8c,0x08,0x22,0x22,0x22,0x04,0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x00,0x33,0x33,0x33,0x84,0x00,0x00,0x00,0x01,0x33,0x33,0x33,
0x04,0x00,0x00,0x00,0x08,0x00,0x00,0x00,0x02,0x33,0x33,0x33,0x04,0x00,0x00,0x00,0x0a,0x00,0x00,0x00,0x03,0x33,0x33,0x33,0x04,0x00,0x00,0x00,0x09,0x00,0x00,0x00,
0x04,0x33,0x33,0x33,0x04,0x00,0x00,0x00,0x03,0x02,0x00,0x00,0x05,0x33,0x33,0x33,0x04,0x00,0x00,0x00,0xf8,0x01,0x00,0x00,0x06,0x33,0x33,0x33,0x04,0x00,0x00,0x00,
0xe8,0x03,0x00,0x00,0x07,0x33,0x33,0x33,0x04,0x00,0x00,0x00,0xff,0x03,0x00,0x00,0x08,0x33,0x33,0x33,0x04,0x00,0x00,0x00,0x10,0x00,0x00,0x00,0x09,0x33,0x33,0x33,
0x04,0x00,0x00,0x00,0x10,0x00,0x00,0x00,0x0a,0x33,0x33,0x33,0x04,0x00,0x00,0x00,0x00,0x02,0x00,0x00,0x0b,0x33,0x33,0x33,0x04,0x00,0x00,0x00,0x00,0x02,0x00,0x00,
0x00,0x44,0x44,0x44,0x40,0x00,0x00,0x00,0x01,0x44,0x44,0x44,0x20,0x00,0x00,0x00,0x80,0x80,0x80,0x80,0x78,0x80,0x78,0x80,0x70,0x84,0x70,0x84,0x60,0x8c,0x58,0x94,
0x56,0x94,0x56,0x94,0x54,0x94,0x54,0x94,0x55,0x95,0x54,0x95,0x55,0x95,0x54,0x95,0x02,0x44,0x44,0x44,0x04,0x00,0x00,0x00,0xee,0x01,0x00,0x00,0x03,0x44,0x44,0x44,
0x04,0x00,0x00,0x00,0x07,0x00,0x00,0x00];
// NOTE: MAC 84:e3:42:b2:61:bf
				correct_rf_config[39] = this.getRandomInt(0,255);// replace 0xb2
				correct_rf_config[40] = this.getRandomInt(0,255);// replace 0x61
				correct_rf_config[41] = this.getRandomInt(0,255);// replace 0xbf
			}
            else if(this.chipset === "BK7231N") {
				correct_rf_config = [0x54,0x4c,0x56,0x00,0x62,0x00,0x00,0x00,0x00,0x11,0x11,0x11,0x5a,0x00,0x00,0x00,0x01,0x11,0x11,0x11,0x04,0x00,0x00,0x00,0x4e,0x61,0xbc,0x00,0x02,0x11,0x11,0x11
,0x06,0x00,0x00,0x00,0x38,0x1f,0x8d,0x38,0x57,0x0e,0x03,0x11,0x11,0x11,0x04,0x00,0x00,0x00,0x5e,0x01,0x00,0x00,0x04,0x11,0x11,0x11,0x04,0x00,0x00,0x00,0x8e,0x15
,0x53,0x01,0x05,0x11,0x11,0x11,0x04,0x00,0x00,0x00,0x0c,0x00,0x00,0x00,0x06,0x11,0x11,0x11,0x04,0x00,0x00,0x00,0x55,0x00,0x54,0x03,0x07,0x11,0x11,0x11,0x08,0x00
,0x00,0x00,0x80,0x00,0x00,0x00,0x80,0x00,0x00,0x00,0xff,0xff,0xff,0xff,0xff,0xff,0xff];
// NOTE: MAC 38:1f:8d:38:57:0e
				correct_rf_config[39] = this.getRandomInt(0,255);// replace 0x38
				correct_rf_config[40] = this.getRandomInt(0,255);// replace 0x57
				correct_rf_config[41] = this.getRandomInt(0,255);// replace 0x0e
			} else {
				correct_rf_config = [];
			}
			
			let streamData = new Uint8Array(correct_rf_config);
            if (streamData){
                fetch(url, { 
                        method: 'POST',
                        body: streamData
                    })
                    .then(response => response.text())
                    .then(text => {
                        console.log('received '+text);
                        this.status += '<br/>RF restored!';
                    })
                    .catch(err => console.error(err)); // Never forget the final catch!
            }
        },
        dump(buffer){
            this.display = '<pre>';
            const view = new Uint8Array(buffer);

            let linestart = '0000: ';
            let lineend = '';

            for (let i = 0; i < buffer.byteLength; i++){
                if (i && !(i % 32)){
                    this.display += (linestart + ' : '+lineend + '\n');
                    linestart = ('000'+i.toString(16)).slice(-4) +': ';
                    lineend = '';
                    this.display += '\n';
                }
                linestart += ('0'+view[i].toString(16)).slice(-2) + ' ';
                lineend += (view[i] < 0x20)? '.':String.fromCharCode(view[i]);
            }
            this.display += linestart + ' : '+lineend + '\n';
            this.display += '</pre>';
        }

    },
    mounted (){
        this.msg = 'fred';

        this.rfurl = window.device+'/api/flash/'+this.getRFAddress();
        this.configurl = window.device+'/api/flash/'+this.getConfigAddress();
        this.flashvarsurl = window.device+'/api/flash/'+this.getFlashVarsAddress();

        console.log('mounted ota');
        this.getinfo();
    }
  }
//@ sourceURL=/vue/flash.vue
</script>

<style scoped>
.display pre{
    font-family: 'Courier New', Courier, monospace;
    font-size: 14px;
}
  .container {
    display: flex;
    justify-content: center;
  }

  .item {
    padding: 0 15px;
  }
  .pin-index {
    display: inline-block;
    width: 20px;
  }
  
            .my-table, 
            .my-table th,
            .my-table td {
                border: 1px solid black;
                border-collapse: collapse;
            }
</style>
