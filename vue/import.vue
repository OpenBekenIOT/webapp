<template>
  <div class="importPage">
    <p class="importIntro">
      You can import configuration from an OpenBeken template or a Cloudcutter profile. Applying the import overwrites your current
      pin/channel assignments and startup command, and it clears LittleFS (including <code>autoexec.bat</code>).
    </p>

    <div class="importLayout">
      <div class="importTopGrid">
        <!-- 1. INPUT -->
        <section class="importCard importCard--top" aria-labelledby="importStep1Title">
          <div class="importCardHeader">
            <div class="importStepBadge" aria-hidden="true">1</div>
            <h3 id="importStep1Title" class="importCardTitle">Input</h3>
          </div>

          <div class="importCardBody importCardBody--top">
            <div class="importTopText">
              <p class="importBodyText">
                Paste an <a href="https://openbekeniot.github.io/webapp/devicesList.html">OpenBeken template</a> or Cloudcutter JSON.
                Cloudcutter device profiles are <a href="https://github.com/tuya-cloudcutter/tuya-cloudcutter.github.io/tree/master/devices">here</a>. Drag &amp; drop also works.
              </p>
            </div>

            <div class="importMainPane">
              <textarea
                id="importTemplate"
                class="importTextarea importTextarea--mono"
                placeholder="Paste an OpenBeken template or Cloudcutter JSON here, a Tuya config partition, or drop a 2MB .bin firmware dump onto this box."
                @input="handleImportTemplateChange"
                v-model="importTemplateText"
              ></textarea>
            </div>

            <div class="importBottomPane">
              <div class="importNote">
                <b>New:</b> You can also drop a 2MB full device dump or Tuya config partition file to extract keys and JSON configuration automatically.
              </div>

              <details class="importExamplesBox">
                <summary>Examples</summary>
                <div class="importExamples">
                  <button class="importChip" type="button" @click="loadDemo('https://raw.githubusercontent.com/tuya-cloudcutter/tuya-cloudcutter.github.io/a8a6539aad21a03d5db41e4d27e9d5516c62fe23/devices/lenovo-se-242dc-rgbct-bulb-v1.2.21.json')">RGBCW LED</button>
                  <button class="importChip" type="button" @click="loadDemo('https://raw.githubusercontent.com/tuya-cloudcutter/tuya-cloudcutter.github.io/a8a6539aad21a03d5db41e4d27e9d5516c62fe23/devices/nous-p4-e14-rgbct-bulb.json')">BP5758 LED</button>
                  <button class="importChip" type="button" @click="loadDemo('https://raw.githubusercontent.com/tuya-cloudcutter/tuya-cloudcutter.github.io/b04e860fe0bb1c8bed417ab36c57e6759ec08510/devices/spectrum-woj14415-rgbct-gu10-bulb.json')">SM2135 LED</button>
                  <button class="importChip" type="button" @click="loadDemo('https://raw.githubusercontent.com/tuya-cloudcutter/tuya-cloudcutter.github.io/a8a6539aad21a03d5db41e4d27e9d5516c62fe23/devices/pegant-pg3451-3-outlet-power-strip.json')">Triple socket + USB</button>
                  <button class="importChip" type="button" @click="loadDemo('https://raw.githubusercontent.com/tuya-cloudcutter/tuya-cloudcutter.github.io/b04e860fe0bb1c8bed417ab36c57e6759ec08510/devices/tuya-generic-rr620w-jl-smart-switch.json')">BL0942 plug</button>
                  <button class="importChip" type="button" @click="loadDemo('https://raw.githubusercontent.com/tuya-cloudcutter/tuya-cloudcutter.github.io/43a341ef1dd8eec8514e1d435563bd9008ff2835/devices/hombli-hbss-0209-smart-socket-b2030248-energy-plug.json')">BL0937 plug</button>
                  <button class="importChip" type="button" @click="loadDemo('https://raw.githubusercontent.com/tuya-cloudcutter/tuya-cloudcutter.github.io/a8a6539aad21a03d5db41e4d27e9d5516c62fe23/devices/athom-garage-door-opener.json')">Garage switch</button>
                  <button class="importChip" type="button" @click="loadDemo('https://raw.githubusercontent.com/tuya-cloudcutter/tuya-cloudcutter.github.io/a8a6539aad21a03d5db41e4d27e9d5516c62fe23/devices/aldi-casalux-wifi-led-rgb-light-strip.json')">RGB LED</button>
                </div>
              </details>
            </div>
          </div>
        </section>

        <!-- 2. REVIEW -->
        <section class="importCard importCard--top" aria-labelledby="importStep2Title">
          <div class="importCardHeader">
            <div class="importStepBadge" aria-hidden="true">2</div>
            <h3 id="importStep2Title" class="importCardTitle">Review</h3>
          </div>

          <div class="importCardBody importCardBody--top">
            <div class="importTopText">
              <p id="generateTextID" class="importBodyText">OpenBeken configuration script:</p>
              <p id="generateStatusID" class="importStatusLine"></p>
            </div>

            <div class="importMainPane">
              <textarea
                id="generatedScriptField"
                class="importTextarea importTextarea--mono"
                placeholder="OpenBeken configuration script will appear here"
                v-model="generatedScriptText"
              ></textarea>
            </div>

            <div class="importBottomPane">
              <div class="importHint">Tip: you can edit the generated script before applying it.</div>
            </div>
          </div>
        </section>

        <!-- 3. APPLY -->
        <section class="importCard importCard--top" aria-labelledby="importStep3Title">
          <div class="importCardHeader">
            <div class="importStepBadge" aria-hidden="true">3</div>
            <h3 id="importStep3Title" class="importCardTitle">Apply</h3>
          </div>

          <div class="importCardBody importCardBody--top">
            <div class="importTopText importTopText--apply">
              <p class="importBodyText">When you are satisfied with the script, click Apply to update the device.</p>

              <div class="importApplyActionRow">
                <button class="importBtn importBtn--primary importBtn--slim" type="button" @click="applyScript()">
                  Apply script (clears current configuration)
                </button>
              </div>
            </div>

            <div class="importMainPane importMainPane--apply">
              <div class="importStatusBlock">
                <div class="importPlaceholderLabel">Apply status</div>
                <p id="progressTextID" class="importStatusLine importStatusLine--mono"></p>
              </div>
            </div>

            <div class="importBottomPane"></div>
          </div>
        </section>
      </div>

      <!-- PROCESSING LOG (FULL WIDTH) -->
      <section class="importCard importCard--log" aria-labelledby="importLogTitle">
        <div class="importCardHeader importCardHeader--log">
          <h3 id="importLogTitle" class="importCardTitle">Processing log</h3>
          <button class="importBtn importBtn--secondary importBtn--compact" type="button" @click="clearLog()">Clear log</button>
        </div>

        <div class="importCardBody importCardBody--log">
          <p class="importBodyText importLogHelp">
            Shows progress, successes, and errors while processing dropped files and extracting Tuya configuration data.
          </p>

          <div id="debugLog" class="importLogBox" v-html="logHtml"></div>
        </div>
      </section>
    </div>
  </div>
</template>

<script>
  module.exports = {
    components: {
      'import': window.getComponent('import')
    },
    data: ()=> {
      return {
        generateText: "",
        importTemplateText: "",
        generatedScriptText: "",
        progressText: "",
        generateTextElem: undefined,
        generateStatusElem: undefined,
        progressTextElem: undefined,
        logHtml: "",
      }
    },
    methods: {
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
      clearLog() {
        this.logHtml = "";
      },
      getinfo() {

      },
      onSendFailed(response, line) {
        if(response.status == 501 || response.status == 400) {
           this.progressTextElem.innerHTML += "<span style='color:red;'>Failed: invalid command \"" + line + "\".</span>";
        } else {
           this.progressTextElem.innerHTML += "<span style='color:red;'>Failed. Check your network connection and try again.</span>";
        }
      },
      async sendLines(lines) {
        this.progressTextElem.innerHTML = "Sending...";
        let idx = 0;
        for (let line of lines) {
          line = line.trim();
          if(line.length < 1) { idx++; continue; }
          if(line.length >= 2 && line[0] == '/' && line[1] == '/') { idx++; continue; }

          let dbg = "";
          if(false){
            dbg = " (" + line + ")";
          }
          this.progressTextElem.innerHTML += " Sending " + idx + " of " + lines.length + dbg + "...";
          await this.sendLine(line, this.onSendFailed);
          idx++;
        }
        this.progressTextElem.innerHTML += "<span style='color:green;'> Completed.</span>";
        this.progressTextElem.innerHTML += "<span style='color:green;'> Restart the device if required.</span>";
      },
      async sendLine(line, errorHandler) {
        line = line.trim();
        if(line.length < 1) return;

        console.log("sending line: " + line);
        let url = window.device + '/api/cmnd';
        return new Promise((resolve, reject) => {
          fetch(url, {
            method: "POST",
            body: line
          })
          .then(response => {
            if (!response.ok) {
              errorHandler(response, line);
              throw new Error("Failed to send line " + line + " with error " + response.status);
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
        this.sendLines(lines);
      },
      setImportSrc(txt) {
        this.importTemplateText = txt;
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
          });
      },
      handleImportTemplateChange(event) {
        console.log("Import template changed!");
        this.clearLog();
        this.refreshTemplateImport();
      },
      refreshTemplateImport() {
        let res;
        if(processJSON == undefined){
          if(this.generateStatusElem) this.generateStatusElem.innerHTML = "<span style='color:red;'>Template parser is not loaded yet.</span>";
          return;
        }
        let jsonText = (this.importTemplateText || "").trim();
        if(jsonText.length < 1) {
          if(this.generateStatusElem) this.generateStatusElem.innerHTML = "<span style='color:orange;'>No input provided.</span>";
          return;
        }
        try {
          res = processJSON(jsonText);
        } catch (error) {
          if(this.generateStatusElem) this.generateStatusElem.innerHTML = "<span style='color:red;'>Failed: " + error + ".</span>";
          return;
        }
        this.generatedScriptText  = "";
        this.generatedScriptText += "ClearIO // clear old GPIO/channels\n";
        this.generatedScriptText += "lfs_format // clear LittleFS\n";
        this.generatedScriptText += "StartupCommand \"\"  // clear STARTUP\n";
        this.generatedScriptText += "stopDriver *  // stop drivers\n";
        this.generatedScriptText += res.scr;

        if(this.generateStatusElem) this.generateStatusElem.innerHTML = "<span style='color:green;'>OK. Script generated.</span>";
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
                const result = window.TuyaExporter.extractConfig(uint8Array, this.log);
                if (result) {
                  if (typeof result === 'object') {
                    this.importTemplateText = JSON.stringify(result, null, 2);
                    this.refreshTemplateImport();
                    this.log('Config extracted and loaded successfully.', 'success');
                  } else {
                    this.importTemplateText = result;
                    this.refreshTemplateImport();
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
    mounted () {
        this.progressTextElem = document.getElementById("progressTextID");
        this.generateTextElem = document.getElementById("generateTextID");
        this.generateStatusElem = document.getElementById("generateStatusID");

        if(this.generateTextElem) {
          this.generateTextElem.innerHTML = "OpenBeken configuration script:";
        }
        if(this.generateStatusElem) {
          this.generateStatusElem.innerHTML = "<span style='color:#111;'>Waiting for input...</span>";
        }
        if(this.progressTextElem) {
          this.progressTextElem.innerHTML = "";
        }

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
        if(importTemplateTextarea){
          importTemplateTextarea.addEventListener('dragover', this.handleDragOver);
          importTemplateTextarea.addEventListener('drop', this.handleDrop);
        }
    },
    destroyed() {
      clearInterval(this.interval);
    }
  }
//@ sourceURL=/vue/import.vue
</script>

<style scoped>
  /* Ensure padding/borders never cause right-edge clipping */
  .importPage, .importPage * {
    box-sizing: border-box;
  }

  .importPage {
    width: 100%;
  }

  .importIntro {
    max-width: 1100px;
    margin: 0 auto 18px auto;
    padding: 0 15px;
    text-align: left;
    line-height: 1.35em;
  }

  .importLayout {
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    text-align: left;
    line-height: 1.45em;
  }

  .importTopGrid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 16px;
    align-items: stretch;
  }

  .importCard {
    border: 1px solid rgba(17, 24, 39, 0.10);
    border-radius: 14px;
    background: #ffffff;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 2px 10px rgba(0,0,0,0.04);
  }

  .importCard--top {
    height: 720px;
  }

  .importCard--log {
    min-height: 220px;
  }

  .importCardHeader {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 14px 10px 14px;
    background: transparent;
  }

  .importCardHeader--log {
    padding-bottom: 8px;
    justify-content: space-between;
  }

  .importStepBadge {
    width: 28px;
    height: 28px;
    border-radius: 999px;
    border: 1px solid rgba(17, 24, 39, 0.14);
    display: grid;
    place-items: center;
    font-weight: 700;
    font-size: 0.95em;
    background: #ffffff;
    flex: 0 0 auto;
  }

  .importCardTitle {
    margin: 0;
    font-size: 1.05em;
    line-height: 1.2;
  }

  .importCardBody {
    padding: 12px 14px 14px 14px;
    flex: 1;
    min-height: 0;
  }

  .importCardBody--top {
    /* Make the main panes run edge-to-edge inside the outer card.
       Top/bottom copy gets its own padding so we don't create nested "cards". */
    padding: 0;
    display: grid;
    grid-template-rows: 118px 1fr auto;
    gap: 10px;
    min-height: 0;
  }

  .importCardBody--log {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .importTopText {
    min-height: 118px;
    padding: 12px 14px 0 14px;
  }

  .importTopText--apply {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .importApplyActionRow {
    display: flex;
    align-items: center;
  }

  .importMainPane,
  .importBottomPane {
    min-height: 0;
  }

  /* Main content area inside each step card.
     We keep a single "surface" per column (no nested bordered cards). */
  .importMainPane {
    /* This is the single main "surface" per column.
       It should touch the outer card edges (no inset card look). */
    background: #f9fafb;
    border-radius: 0;
    padding: 0;
    overflow: hidden;
    border-top: 1px solid rgba(17, 24, 39, 0.10);
    border-bottom: 1px solid rgba(17, 24, 39, 0.10);
  }

  .importMainPane:focus-within {
    box-shadow: inset 0 0 0 3px rgba(99, 102, 241, 0.12);
  }

  /* Apply status should remain a plain white box (no grey pane behind it). */
  .importMainPane--apply {
    background: transparent;
    padding: 0;
    border-radius: 0;
    box-shadow: none;
    border-top: 1px solid rgba(17, 24, 39, 0.10);
    border-bottom: 1px solid rgba(17, 24, 39, 0.10);
  }

  .importBodyText {
    margin: 0;
    line-height: 1.45em;
  }

  .importNote {
    font-weight: 600;
    color: #1e40af;
    background: #eff6ff;
    border-radius: 12px;
    padding: 8px 10px;
    margin-bottom: 10px;
  }

  .importTextarea {
    width: 100%;
    height: 100%;
    min-height: 0;
    resize: none;
    /* Provide breathing room now that the pane is edge-to-edge */
    padding: 12px 14px;
    border: none;
    border-radius: 0;
    background: transparent;
    outline: none;
    line-height: 1.35em;
    box-shadow: none;
  }

  .importTextarea:focus {
    outline: none;
  }

  .importTextarea::placeholder {
    color: #6b7280;
  }

  .importTextarea--mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    font-size: 12.5px;
  }

  .importExamplesBox {
    border: none;
    padding: 0;
    background: transparent;
  }

  .importExamplesBox summary {
    cursor: pointer;
    font-weight: 700;
    margin: 0;
    list-style: none;
  }

  .importExamplesBox summary::-webkit-details-marker {
    display: none;
  }

  .importExamplesBox summary::before {
    content: "▶";
    display: inline-block;
    margin-right: 8px;
    transform-origin: center;
    font-size: 0.9em;
  }

  details[open].importExamplesBox summary::before {
    content: "▼";
  }

  .importExamples {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 10px;
  }

  .importChip {
    border: 1px solid rgba(17, 24, 39, 0.12);
    background: rgba(249, 250, 251, 0.9);
    border-radius: 999px;
    padding: 6px 10px;
    cursor: pointer;
    font-size: 0.95em;
  }

  .importChip:hover {
    background: rgba(243, 244, 246, 0.95);
  }

  .importBtn {
    border: 1px solid #111827;
    background: #111827;
    color: #ffffff;
    border-radius: 12px;
    padding: 10px 12px;
    cursor: pointer;
    font-weight: 650;
    line-height: 1.15em;
  }

  .importBtn:hover {
    filter: brightness(1.05);
  }

  .importBtn--primary {
    width: 100%;
  }

  .importBtn--slim {
    padding: 7px 10px;
    border-radius: 10px;
    font-weight: 650;
    font-size: 0.98em;
  }

  .importBtn--secondary {
    border-color: #d1d5db;
    background: #ffffff;
    color: #111827;
    font-weight: 600;
  }

  .importBtn--secondary:hover {
    background: #f9fafb;
  }

  .importBtn--compact {
    padding: 7px 10px;
    border-radius: 10px;
    font-weight: 600;
  }

  .importPlaceholderLabel {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    font-size: 12.5px;
    color: #6b7280;
    font-weight: 400;
  }

  .importStatusBlock {
    height: 100%;
    min-height: 0;
    /* Keep it as a lined-off area without creating another nested card */
    border: none;
    border-radius: 0;
    padding: 12px 14px;
    background: transparent;
    overflow: auto;
  }

  .importBottomPane {
    padding: 10px 14px 14px 14px;
  }

  .importStatusLine {
    margin: 4px 0 0 0;
    line-height: 1.35em;
    min-height: 1.35em;
    word-break: break-word;
  }

  .importTopText .importStatusLine {
    margin-top: 4px;
  }

  .importStatusLine--mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    font-size: 12.5px;
    color: #111827;
  }

  .importHint {
    font-size: 0.95em;
    color: #4b5563;
  }

  .importLogHelp {
    margin: 0;
  }

  .importLogBox {
    width: 100%;
    height: 160px;
    border: 1px solid rgba(17, 24, 39, 0.12);
    border-radius: 12px;
    overflow-y: auto;
    padding: 10px;
    background: #ffffff;
    white-space: pre-wrap;
  }

  @media (max-width: 640px) {
    .importIntro {
      margin-bottom: 12px;
    }
    .importCard--top {
      height: auto;
    }
    .importLogBox {
      height: 220px;
    }
  }
</style>
