
<template>
  <div class="importPage">
        <p class="importIntro">You can import configuration from an OpenBeken template or a Cloudcutter profile. Applying the import overwrites your current pin/channel assignments and startup command, and it clears LittleFS (including <code>autoexec.bat</code>).</p>
    <div class="importContainer">
      <div class="importItem"  style="width: 300px;">
        <h3>1. Input</h3>
        <p>Paste an <a href="https://openbekeniot.github.io/webapp/devicesList.html">OpenBeken template</a> or Cloudcutter JSON. Cloudcutter device profiles are available <a href="https://github.com/tuya-cloudcutter/tuya-cloudcutter.github.io/tree/master/devices">here</a>. Drag and drop files onto the input box below.</p>
        <div class="importNote"><b>New:</b> You can also drag and drop a 2MB full device dump or Tuya config partition file to extract keys and JSON configuration automatically.</div>
        <textarea id="importTemplate" 
        placeholder="Paste an OpenBeken template or Cloudcutter JSON here, a Tuya config partition, or drop a 2MB .bin firmware dump onto this box." style="vertical-align: top; width: 280px; height:500px" @input="handleImportTemplateChange" v-model="importTemplateText"></textarea>
       <br/>
               <br>
       <details class="importExamplesBox">

         <summary>Examples</summary>

         <div class="importExamples">
<button @click="loadDemo('https://raw.githubusercontent.com/tuya-cloudcutter/tuya-cloudcutter.github.io/a8a6539aad21a03d5db41e4d27e9d5516c62fe23/devices/lenovo-se-242dc-rgbct-bulb-v1.2.21.json')">RGBCW LED</button>
         <button @click="loadDemo('https://raw.githubusercontent.com/tuya-cloudcutter/tuya-cloudcutter.github.io/a8a6539aad21a03d5db41e4d27e9d5516c62fe23/devices/nous-p4-e14-rgbct-bulb.json')">BP5758 LED</button>
         <button @click="loadDemo('https://raw.githubusercontent.com/tuya-cloudcutter/tuya-cloudcutter.github.io/b04e860fe0bb1c8bed417ab36c57e6759ec08510/devices/spectrum-woj14415-rgbct-gu10-bulb.json')">SM2135 LED</button>
          <button @click="loadDemo('https://raw.githubusercontent.com/tuya-cloudcutter/tuya-cloudcutter.github.io/a8a6539aad21a03d5db41e4d27e9d5516c62fe23/devices/pegant-pg3451-3-outlet-power-strip.json')">Triple socket + USB</button>
          <button @click="loadDemo('https://raw.githubusercontent.com/tuya-cloudcutter/tuya-cloudcutter.github.io/b04e860fe0bb1c8bed417ab36c57e6759ec08510/devices/tuya-generic-rr620w-jl-smart-switch.json')">BL0942 plug</button>
          <button @click="loadDemo('https://raw.githubusercontent.com/tuya-cloudcutter/tuya-cloudcutter.github.io/43a341ef1dd8eec8514e1d435563bd9008ff2835/devices/hombli-hbss-0209-smart-socket-b2030248-energy-plug.json')">BL0937 plug</button>
          <button @click="loadDemo('https://raw.githubusercontent.com/tuya-cloudcutter/tuya-cloudcutter.github.io/a8a6539aad21a03d5db41e4d27e9d5516c62fe23/devices/athom-garage-door-opener.json')">Garage switch</button>
          <button @click="loadDemo('https://raw.githubusercontent.com/tuya-cloudcutter/tuya-cloudcutter.github.io/a8a6539aad21a03d5db41e4d27e9d5516c62fe23/devices/aldi-casalux-wifi-led-rgb-light-strip.json')">RGB LED</button>

         </div>

       </details>
      </div>

      <div class="importItem" style="width: 300px;">
        <h3>2. Review the Generated Script</h3>
               <br>
        <p id ="generateTextID" v-text="generateText"></p>
        <textarea id="generatedScriptField" placeholder="OpenBeken configuration script will appear here" style="vertical-align: top; width: 280px; height:500px"  v-model="generatedScriptText"></textarea>
       <br>
      </div>

      <div class="importItem" style="width: 300px;">
      <h3>3. Apply the Script to the Device</h3>
      <p>Once you are satisfied with the script, click Apply to update the device.</p>
               <br>
       <button @click="applyScript()">Apply script (clears current configuration)</button>
       <br>
       <br>
       <div class="importExecTitle">Apply Status:</div>
        <p id ="progressTextID" v-text="progressText"> </p>
      </div>
      
      <div class="importItem" style="width: 300px;">
        <h3>4. Processing Log</h3>
         <p class="importLogHelp">Shows progress, successes, and errors while processing dropped files and extracting Tuya configuration data.</p>
         <br>
         <div id="debugLog" style="width: 280px; height: 500px; border: 1px solid #999; overflow-y: scroll; padding: 5px; background: white; white-space: pre-wrap;" v-html="logHtml"></div>
         <button @click="clearLog()">Clear Log</button>
       </div>
    </div>
  </div>
</template>



<script>
  module.exports = {
    components: {
      'import': window.getComponent('import')
    },
    data: ()=>{
      return {
        generateText:"",
        importTemplateText: "",
        generatedScriptText: "",
        progressText: "",
        generateTextElem:undefined,
        progressTextElem:undefined,
        logHtml: "",
      }
    },
    methods:{
      log(msg, type = 'info') {
          let color = 'black';
          if(type === 'error') color = 'red';
          if(type === 'warning') color = 'orange';
          if(type === 'success') color = 'green';
          if(type === 'info') color = 'blue';
          
          const time = new Date().toLocaleTimeString();
          const html = `<div style="color:${color}">[${time}] ${msg}</div>`;
          this.logHtml += html;
          
          this.$nextTick(() => {
             const elem = document.getElementById('debugLog');
             if(elem) elem.scrollTop = elem.scrollHeight;
          });
          console.log(`[${type}] ${msg}`);
      },
      clearLog(){
        this.logHtml = "";
      },
      getinfo(){
       

      },
      onSendFailed(response,line) {
        //alert('Send failed!');
        if(response.status == 501 || response.status == 400) {
           this.progressTextElem.innerHTML += "<span style='color:red;'>Failed: invalid command \""+line+"\".</span>";
        } else {
           this.progressTextElem.innerHTML += "<span style='color:red;'>Failed. Check your network connection and try again.</span>";
        }
      },
      async sendLines(lines) {
        this.progressTextElem.innerHTML = "Sending...";
        let idx = 0;
      for (let line of lines) {
        let dbg = "";
        if(false){
          dbg = " ("+line+")";
        }
        this.progressTextElem.innerHTML += " Sending "+idx+" of "+lines.length+dbg+"...";
        await this.sendLine(line,this.onSendFailed);
        idx++;
      }
        this.progressTextElem.innerHTML += "<span style='color:green;'> Completed.</span>";
        this.progressTextElem.innerHTML += "<span style='color:green;'> Restart the device if required.</span>";
    },
    async sendLine(line, errorHandler) {
      line = line.trim();
        if(line.length < 2)
          return;
        if(line[0]=='/' && line[1] == '/')
            return;
      console.log("sending line: " + line);
      let url = window.device+'/api/cmnd';
      return new Promise((resolve, reject) => {
        // Replace the URL and request options with your own
        fetch(url, {
          method: "POST",
          body: line 
        })
        .then(response => {
          if (!response.ok) {
           errorHandler(response,line);
            throw new Error("Failed to send line "+line + " with error " + response.status);
          }
          resolve();
        })
        .catch(error => {
          reject(error);
        });
      });
    },
      applyScript() {

        const lines = this.generatedScriptText.split("\n");

       // lines.unshift("ClearIO");
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
         // alert("line " +line);
        }
        this.sendLines(lines);
      },
      setImportSrc(txt){
        //alert(txt);
        this.importTemplateText  = txt;
       this.refreshTemplateImport();
      },
      loadDemo(url) {
            fetch(url)
                .then(response => response.text())
                .then(res => {
                  this.setImportSrc(res);
                })
                .catch(err => {
                    this.error = err.toString();
                    console.error(err)
                }); // Never forget the final catch!
      },
    handleImportTemplateChange(event) {
      console.log("Import template changed!");
       this.clearLog();
       this.refreshTemplateImport();
    },
    refreshTemplateImport() {
       let res;
       if(processJSON==undefined){
           this.generateTextElem.innerHTML = "<span style='color:red;'>Template parser is not loaded yet.</span>";
          return;
       }
       let jsonText = this.importTemplateText;
       jsonText = jsonText.trim();
       if(jsonText.length < 1) {
           this.generateTextElem.innerHTML = "<span style='color:yellow;'>No input provided.</span>";
          return;
       }
       try {
           res = processJSON(jsonText);
       } catch (error) {
           this.generateTextElem.innerHTML = "<span style='color:red;'>Failed: "+error+".</span>";
           return;
       }
        this.generatedScriptText  = "";
         this.generatedScriptText  +=  "ClearIO // clear old GPIO/channels"+"\n";
         this.generatedScriptText  +=  "lfs_format // clear LittleFS"+"\n";
         this.generatedScriptText  +=  "StartupCommand \"\"  // clear STARTUP"+"\n";
         this.generatedScriptText  +=  "stopDriver *  // stop drivers"+"\n";
         this.generatedScriptText  += res.scr;
           this.generateTextElem.innerHTML = "<span style='color:green;'>OK. Script generated.</span>";
        
    },
      
      handleDragOver(event) {
        event.preventDefault();
      },
      handleDrop(event) {
        event.preventDefault();

        this.clearLog();
        this.importTemplateText = ""; // Clear old content immediately
        const files = event.dataTransfer.files;

        if (files.length > 0) {
          const file = files[0];
          
          if (file.name.toLowerCase().endsWith('.bin')) {
            this.log(`Processing dropped file: ${file.name}`, 'info');
            const reader = new FileReader();
            reader.onload = (evt) => {
              const arrayBuffer = evt.target.result;
              const uint8Array = new Uint8Array(arrayBuffer);
              try {
                if (typeof window.TuyaExporter === 'undefined' || !window.TuyaExporter.extractConfig) {
                   this.log('TuyaExporter library not loaded correctly.', 'error');
                   return;
                }
                // Pass log callback logic
                const result = window.TuyaExporter.extractConfig(uint8Array, this.log);
                if (result) {
                  if (typeof result === 'object') {
                    this.importTemplateText = JSON.stringify(result, null, 2);
                    this.refreshTemplateImport(); // trigger generation
                    this.log('Config extracted and loaded successfully.', 'success');
                  } else {
                    this.importTemplateText = result;
                    this.refreshTemplateImport(); // trigger generation
                    this.log('Config extracted but parsing had issues. Raw/Repaired text loaded.', 'warning');
                  }
                } else {
                  this.log('Failed to extract config from binary.', 'error');
                }
              } catch (err) {
                this.log(`Decryption crash: ${err.message}`, 'error');
                console.error(err);
              }
            };
            reader.readAsArrayBuffer(file);
          } else {
             // Text/JSON file
            this.log(`Dropped file is not .bin, trying text read for ${file.name}`, 'info');
            const reader = new FileReader();

            reader.onload = (e) => {
              this.importTemplateText = e.target.result;
              this.refreshTemplateImport();
              this.log("Loaded text file content.", 'success');
            };

            reader.readAsText(file); 
          }
        }
      },

    },
    mounted (){
        this.msg = 'fred';
        this.progressTextElem = document.getElementById("progressTextID");
        this.generateTextElem = document.getElementById("generateTextID");
        this.generateTextElem.innerHTML = "Configuration script can be edited manually if needed.";

        const cryptoScript = document.createElement("script");
        cryptoScript.setAttribute(
          "src",
          "https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js"
        );
        cryptoScript.async = true;
        document.head.appendChild(cryptoScript);

        const plugin = document.createElement("script");
        plugin.setAttribute(
          "src",
          "https://openbekeniot.github.io/webapp/templateParser.js"
         //"../templateParser.js"
        );
        plugin.async = true;
        document.head.appendChild(plugin);
        
        const plugin2 = document.createElement("script");
        plugin2.setAttribute(
          "src",
            "https://openbekeniot.github.io/webapp/tuyaExporter.js"
        );
        plugin2.async = true;
        document.head.appendChild(plugin2);
        
      let importTemplateTextarea = document.getElementById("importTemplate");
      importTemplateTextarea.addEventListener('dragover', this.handleDragOver);
      importTemplateTextarea.addEventListener('drop', this.handleDrop);
    },
    destroyed(){
      clearInterval(this.interval);
    }

  }
//@ sourceURL=/vue/import.vue
</script>

<style scoped>
  .importPage {
    width: 100%;
  }

  .importIntro {
    max-width: 940px;
    margin: 0 auto 36px auto;
    padding: 0 15px;
    text-align: left;
    line-height: 1.35em;
  }

  .importNote {
    font-weight: normal;
    color: #1e40af;
    background: #eff6ff;
    border-left: 4px solid #3b82f6;
    padding: 6px 10px;
    margin-top: 10px;
  }

  .importLogHelp {
    margin: 0 0 6px 0;
  }

  .importExamplesBox {
    margin-top: 12px;
  }

  .importExamplesBox summary {
    cursor: pointer;
    font-weight: bold;
    margin-bottom: 6px;
  }

  .importContainer {
    display: flex;
    justify-content: center;
    align-items: flex-start;
    flex-wrap: wrap;
    padding-top: 6px;
  }

  .importItem {
    padding: 0 15px;
  }

  .importExamplesTitle {
    margin: 0 0 6px 0;
  }

  .importExamples {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .importExecTitle {
    margin-bottom: 6px;
  }

  .pin-index {
    display: inline-block;
    width: 20px;
  }
</style>
