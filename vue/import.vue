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
                @dragover.prevent
                @drop="handleDrop"
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
              <p class="importBodyText">OpenBeken configuration script:</p>
              <p class="importStatusLine" :class="'importStatusLine--' + generationState" aria-live="polite">{{ generationMessage }}</p>
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
                <button class="importBtn importBtn--primary importBtn--slim" type="button" :disabled="!canApply" @click="applyScript()">
                  {{ isApplying ? 'Applying script...' : 'Apply script (clears current configuration)' }}
                </button>
              </div>
            </div>

            <div class="importMainPane importMainPane--apply">
              <div class="importStatusBlock">
                <div class="importPlaceholderLabel">Apply status</div>
                <p class="importStatusLine importStatusLine--mono" :class="'importStatusLine--' + applyState" aria-live="polite">{{ applyMessage }}</p>
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

          <div ref="debugLog" class="importLogBox">
            <div v-for="entry in logEntries" :key="entry.id" class="importLogEntry" :class="'importLogEntry--' + entry.type">
              [{{ entry.time }}] {{ entry.message }}
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script>
  const IMPORT_DEPENDENCIES_PROMISE = 'OpenBekenWebAppImportDependenciesPromise';
  const CRYPTO_JS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js';
  const PUBLIC_WEBAPP_ROOT = 'https://openbekeniot.github.io/webapp/';

  function joinImportAssetUrl(root, filename) {
    const base = (root || '').toString().replace(/\/+$/, '');
    const path = filename.replace(/^\/+/, '');
    return base ? base + '/' + path : path;
  }

  function absoluteScriptUrl(url) {
    try {
      return new URL(url, document.baseURI).href;
    } catch (error) {
      return url;
    }
  }

  function loadImportScript(url, isReady, label) {
    if (isReady()) return Promise.resolve();

    const absoluteUrl = absoluteScriptUrl(url);
    const scripts = Array.prototype.slice.call(document.querySelectorAll('script[src]'));
    let script = scripts.find(item => item.src === absoluteUrl);

    return new Promise((resolve, reject) => {
      const onLoad = () => {
        script.setAttribute('data-openbeken-import-state', 'loaded');
        if (isReady()) resolve();
        else reject(new Error(label + ' loaded but did not expose the expected API.'));
      };
      const onError = () => {
        script.setAttribute('data-openbeken-import-state', 'error');
        reject(new Error('Failed to load ' + label + ' from ' + url + '.'));
      };

      if (script) {
        const state = script.getAttribute('data-openbeken-import-state');
        if (state === 'loaded') {
          onLoad();
          return;
        }
        if (state === 'error') {
          onError();
          return;
        }
        // Only wait on scripts created by this loader and explicitly marked
        // as still loading. An unrelated/pre-existing script may already have
        // fired its load event, in which case waiting here would hang forever.
        if (state !== 'loading') {
          script = null;
        }
      }

      if (!script) {
        script = document.createElement('script');
        script.src = url;
        script.async = false;
        script.setAttribute('data-openbeken-import-dependency', label);
        script.setAttribute('data-openbeken-import-state', 'loading');
      }

      script.addEventListener('load', onLoad, { once: true });
      script.addEventListener('error', onError, { once: true });
      if (!script.parentNode) document.head.appendChild(script);
    });
  }

  function loadImportScriptWithFallback(urls, isReady, label) {
    const uniqueUrls = [];
    const seen = {};
    urls.forEach(url => {
      const key = absoluteScriptUrl(url);
      if (!seen[key]) {
        seen[key] = true;
        uniqueUrls.push(url);
      }
    });

    let next = Promise.reject(new Error('No URL available for ' + label + '.'));
    uniqueUrls.forEach(url => {
      next = next.catch(() => loadImportScript(url, isReady, label));
    });
    return next;
  }

  function getImportDependencies() {
    const dependenciesReady = () => (
      typeof window.CryptoJS !== 'undefined' &&
      typeof window.processJSON === 'function' &&
      typeof window.TuyaExporter !== 'undefined' &&
      typeof window.TuyaExporter.extractConfig === 'function'
    );

    if (dependenciesReady()) return Promise.resolve();
    if (window[IMPORT_DEPENDENCIES_PROMISE]) return window[IMPORT_DEPENDENCIES_PROMISE];

    const parserUrls = [
      joinImportAssetUrl(window.root, 'templateParser.js'),
      joinImportAssetUrl(PUBLIC_WEBAPP_ROOT, 'templateParser.js')
    ];
    const exporterUrls = [
      joinImportAssetUrl(window.root, 'tuyaExporter.js'),
      joinImportAssetUrl(PUBLIC_WEBAPP_ROOT, 'tuyaExporter.js')
    ];

    const dependencyPromise = loadImportScript(
      CRYPTO_JS_URL,
      () => typeof window.CryptoJS !== 'undefined',
      'CryptoJS'
    )
      .then(() => loadImportScriptWithFallback(
        parserUrls,
        () => typeof window.processJSON === 'function',
        'templateParser.js'
      ))
      .then(() => loadImportScriptWithFallback(
        exporterUrls,
        () => typeof window.TuyaExporter !== 'undefined' && typeof window.TuyaExporter.extractConfig === 'function',
        'tuyaExporter.js'
      ));

    // Do not permanently cache a rejected Promise. A transient network/CDN
    // failure should be recoverable by reopening the Import tab and retrying.
    window[IMPORT_DEPENDENCIES_PROMISE] = dependencyPromise.catch(error => {
      delete window[IMPORT_DEPENDENCIES_PROMISE];
      throw error;
    });

    return window[IMPORT_DEPENDENCIES_PROMISE];
  }

  module.exports = {
    components: {
      'import': window.getComponent('import')
    },
    data: ()=> {
      return {
        importTemplateText: "",
        generatedScriptText: "",
        generatedScriptValid: false,
        sourceRevision: 0,
        dependencyState: "loading",
        dependencyMessage: "Loading import dependencies...",
        generationState: "loading",
        generationMessage: "Waiting for import dependencies...",
        isApplying: false,
        applyState: "idle",
        applyMessage: "No script is ready to apply.",
        logEntries: [],
        nextLogId: 1,
      }
    },
    computed: {
      canApply() {
        return this.generatedScriptValid && this.generatedScriptText.trim().length > 0 && !this.isApplying;
      }
    },
    methods: {
      log(msg, type = 'info') {
        const allowedTypes = ['error', 'warning', 'success', 'info'];
        const safeType = allowedTypes.indexOf(type) >= 0 ? type : 'info';
        const message = String(msg);
        this.logEntries.push({
          id: this.nextLogId++,
          time: new Date().toLocaleTimeString(),
          message: message,
          type: safeType
        });

        this.$nextTick(() => {
          const elem = this.$refs && this.$refs.debugLog;
          if(elem) elem.scrollTop = elem.scrollHeight;
        });
        console.log(`[${safeType}] ${message}`);
      },
      clearLog() {
        this.logEntries = [];
      },
      invalidateGeneratedScript(message, state = 'idle') {
        this.generatedScriptText = "";
        this.generatedScriptValid = false;
        this.generationState = state;
        this.generationMessage = message;
        if (!this.isApplying) {
          this.applyState = 'idle';
          this.applyMessage = 'No script is ready to apply.';
        }
      },
      sourceInputChanged() {
        this.sourceRevision++;
        this.invalidateGeneratedScript('Validating current input...', 'loading');
        this.refreshTemplateImport(this.sourceRevision);
      },
      async loadDependencies() {
        this.dependencyState = 'loading';
        this.dependencyMessage = 'Loading import dependencies...';
        if (!this.importTemplateText.trim()) {
          this.generationState = 'loading';
          this.generationMessage = 'Waiting for import dependencies...';
        }

        try {
          await getImportDependencies();
          this.dependencyState = 'ready';
          this.dependencyMessage = 'Import dependencies are ready.';
          if (this.importTemplateText.trim()) {
            this.refreshTemplateImport(this.sourceRevision);
          } else {
            this.invalidateGeneratedScript('No input provided.', 'idle');
          }
        } catch (error) {
          const message = error && error.message ? error.message : String(error);
          this.dependencyState = 'error';
          this.dependencyMessage = 'Import dependencies failed to load: ' + message;
          this.invalidateGeneratedScript(this.dependencyMessage, 'error');
          this.log(this.dependencyMessage, 'error');
        }
      },
      executableLines(lines) {
        return lines
          .map((line, index) => ({ command: line.trim(), lineNumber: index + 1 }))
          .filter(item => item.command.length > 0 && !item.command.startsWith('//'));
      },
      async sendLines(lines) {
        const commands = this.executableLines(lines);
        if (commands.length === 0) {
          const emptyError = new Error('The generated script contains no executable commands.');
          emptyError.lineNumber = 0;
          emptyError.command = '';
          emptyError.completedCount = 0;
          throw emptyError;
        }

        let completedCount = 0;
        for (const item of commands) {
          this.applyMessage = `Sending command ${completedCount + 1} of ${commands.length} (line ${item.lineNumber}): ${item.command}`;
          try {
            await this.sendLine(item.command);
            completedCount++;
          } catch (error) {
            error.lineNumber = item.lineNumber;
            error.command = item.command;
            error.completedCount = completedCount;
            error.totalCount = commands.length;
            throw error;
          }
        }
        return { completedCount: completedCount, totalCount: commands.length };
      },
      async sendLine(line) {
        console.log('sending line: ' + line);
        const url = window.device + '/api/cmnd';
        let response;
        try {
          response = await fetch(url, { method: 'POST', body: line });
        } catch (error) {
          throw new Error('Network error: ' + (error && error.message ? error.message : String(error)));
        }

        const responseText = await response.text();
        if (!response.ok) {
          let detail = responseText;
          try {
            const parsed = JSON.parse(responseText);
            detail = parsed.msg || responseText;
          } catch (error) {
            // Keep the plain response text when the body is not JSON.
          }
          throw new Error('Device rejected the command (HTTP ' + response.status + ')' + (detail ? ': ' + detail : '.'));
        }
      },
      async applyScript() {
        if (!this.canApply) return;

        const confirmed = window.confirm(
          'Apply this generated script?\n\n' +
          'This can clear the current GPIO/channel configuration, format and clear LittleFS, clear the startup command, stop drivers, and then apply the replacement configuration.\n\n' +
          'This operation is not atomic. If a command fails part-way through, the device may be left only partially reconfigured.'
        );
        if (!confirmed) {
          this.applyState = 'idle';
          this.applyMessage = 'Apply canceled.';
          return;
        }

        this.isApplying = true;
        this.applyState = 'running';
        this.applyMessage = 'Starting script application...';

        try {
          const result = await this.sendLines(this.generatedScriptText.split('\n'));
          this.applyState = 'success';
          this.applyMessage = `Completed successfully. ${result.completedCount} commands were applied. Restart the device if required.`;
          this.log(this.applyMessage, 'success');
        } catch (error) {
          const commandDescription = error.command ? `line ${error.lineNumber} (${error.command})` : 'the script';
          if (error.completedCount > 0) {
            this.applyState = 'partial';
            this.applyMessage = `Stopped at ${commandDescription}: ${error.message} ${error.completedCount} earlier command(s) succeeded, so the device may now be partially reconfigured.`;
          } else {
            this.applyState = 'failure';
            this.applyMessage = `Failed at ${commandDescription}: ${error.message} No commands were successfully applied.`;
          }
          this.log(this.applyMessage, 'error');
        } finally {
          this.isApplying = false;
        }
      },
      setImportSrc(txt) {
        this.importTemplateText = txt;
        this.sourceInputChanged();
      },
      async loadDemo(url) {
        this.clearLog();
        this.sourceRevision++;
        const revision = this.sourceRevision;
        this.invalidateGeneratedScript('Loading example...', 'loading');

        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error('HTTP ' + response.status);
          const text = await response.text();
          if (revision !== this.sourceRevision) return;
          this.setImportSrc(text);
        } catch (error) {
          if (revision !== this.sourceRevision) return;
          const message = 'Failed to load example: ' + (error && error.message ? error.message : String(error));
          this.invalidateGeneratedScript(message, 'error');
          this.log(message, 'error');
        }
      },
      handleImportTemplateChange() {
        this.clearLog();
        this.sourceInputChanged();
      },
      refreshTemplateImport(revision = this.sourceRevision) {
        this.invalidateGeneratedScript('Validating current input...', 'loading');

        const jsonText = (this.importTemplateText || '').trim();
        if (jsonText.length < 1) {
          this.invalidateGeneratedScript('No input provided.', 'idle');
          return;
        }
        if (this.dependencyState === 'error') {
          this.invalidateGeneratedScript(this.dependencyMessage, 'error');
          return;
        }
        if (this.dependencyState !== 'ready' || typeof window.processJSON !== 'function') {
          this.invalidateGeneratedScript('Waiting for import dependencies...', 'loading');
          return;
        }

        let result;
        try {
          result = window.processJSON(jsonText);
          if (!result || typeof result.scr !== 'string') {
            throw new Error('The template parser did not return a configuration script.');
          }
        } catch (error) {
          if (revision !== this.sourceRevision) return;
          this.invalidateGeneratedScript('Failed to parse current input: ' + (error && error.message ? error.message : String(error)), 'error');
          return;
        }

        if (revision !== this.sourceRevision) return;
        this.generatedScriptText = [
          '// Clear current GPIO and channel configuration',
          'ClearIO',
          '// Clear LittleFS',
          'lfs_format',
          '// Clear the startup command',
          'StartupCommand ""',
          '// Stop active drivers',
          'stopDriver *',
          '// Apply replacement configuration',
          result.scr
        ].join('\n');
        this.generatedScriptValid = true;
        this.generationState = 'ready';
        this.generationMessage = 'Script generated from the current input. Review and edit it before applying.';
        this.applyState = 'idle';
        this.applyMessage = 'Script is ready to apply.';
      },
      handleDrop(event) {
        event.preventDefault();

        this.clearLog();
        this.importTemplateText = '';
        this.sourceInputChanged();
        const revision = this.sourceRevision;
        const files = event.dataTransfer.files;

        if (files.length < 1) return;
        const file = files[0];

        if (file.name.toLowerCase().endsWith('.bin')) {
          this.log(`Processing dropped file: ${file.name}`, 'info');
          const reader = new FileReader();
          reader.onload = async(evt) => {
            try {
              if (revision !== this.sourceRevision) return;
              await getImportDependencies();
              if (revision !== this.sourceRevision) return;
              if (typeof window.TuyaExporter === 'undefined' || typeof window.TuyaExporter.extractConfig !== 'function') {
                throw new Error('TuyaExporter library is not available.');
              }

              const result = window.TuyaExporter.extractConfig(new Uint8Array(evt.target.result), this.log);
              if (!result) {
                this.invalidateGeneratedScript('Failed to extract configuration from binary.', 'error');
                this.log('Failed to extract config from binary.', 'error');
                return;
              }

              if (typeof result === 'object') {
                this.setImportSrc(JSON.stringify(result, null, 2));
                this.log('Config extracted and loaded successfully.', 'success');
              } else {
                this.setImportSrc(result);
                this.log('Config extracted but parsing had issues. Raw/Repaired text loaded.', 'warning');
              }
            } catch (error) {
              if (revision !== this.sourceRevision) return;
              const message = error && error.message ? error.message : String(error);
              this.invalidateGeneratedScript('Binary extraction failed: ' + message, 'error');
              this.log('Binary extraction failed: ' + message, 'error');
              console.error(error);
            }
          };
          reader.onerror = () => {
            if (revision !== this.sourceRevision) return;
            this.invalidateGeneratedScript('Failed to read the dropped binary file.', 'error');
            this.log('Failed to read dropped binary file: ' + file.name, 'error');
          };
          reader.readAsArrayBuffer(file);
        } else {
          this.log(`Dropped file is not .bin, trying text read for ${file.name}`, 'info');
          const reader = new FileReader();
          reader.onload = (event) => {
            if (revision !== this.sourceRevision) return;
            this.setImportSrc(event.target.result);
            this.log('Loaded text file content.', 'success');
          };
          reader.onerror = () => {
            if (revision !== this.sourceRevision) return;
            this.invalidateGeneratedScript('Failed to read the dropped text file.', 'error');
            this.log('Failed to read dropped text file: ' + file.name, 'error');
          };
          reader.readAsText(file);
        }
      },
    },
    mounted () {
      this.loadDependencies();
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

  .importBtn:disabled {
    cursor: not-allowed;
    opacity: 0.55;
    filter: none;
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

  .importStatusLine--ready,
  .importStatusLine--success {
    color: #1b5e20;
  }

  .importStatusLine--error,
  .importStatusLine--failure,
  .importStatusLine--partial {
    color: #b71c1c;
  }

  .importStatusLine--loading,
  .importStatusLine--running {
    color: #1e40af;
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

  .importLogEntry--info { color: #1e40af; }
  .importLogEntry--success { color: #1b5e20; }
  .importLogEntry--warning { color: #9a6700; }
  .importLogEntry--error { color: #b71c1c; }

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
