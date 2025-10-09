<template>
  <div class="container">
    <div class="item">
      <h4 v-if="peers.length">SSDP Devices:</h4>
      <p v-for="peer in peers" v-bind:key="peer.url"><a target="_blank" v-bind:href="peer.url">{{peer.name}}</a></p>
    </div>
    <div class="item">
      <h4>Current Device:</h4>
      <p>UpTime: {{uptime_s}}s</p>
      <p>Build: {{build}}</p>
      <p>IP Address: {{ip}}</p>
      <p>MAC Address: {{mac}}</p>
      <p>MQTT Server: {{mqtthost}}</p>
      <p>MQTT Topic: {{mqtttopic}}</p>
      <p>Device Short Name: {{shortName}}</p>
      <p>WEBAPP Url root: {{webapp}}</p>
      <p>Chipset: {{chipset}}</p>
      <p>Flags: {{flags}}</p>
      <p>Version: {{currentversion}} <span v-html="lateststr"></span></p>
      <p v-if="error">Error: {{error}}</p>
      <h4>Export Current Template</h4>
      <p>Please fill all fields before submitting.</p>
	  <textarea id="deviceTemplate"  placeholder="qqq" style="vertical-align: top; width: 300px; height:500px"></textarea>
    <br>
          <button @click="getTemplateAsFile">Download template as file</button>
          <button @click="getTemplateAsClipboard">Copy To Clipboard</button>

    </div>

    <div class="item" v-if="supportsClientDeviceDB" style="width: 300px;">
      <h4>Devices:</h4>
	  <p>Here you can apply an existing template (configuration) to your device. The following Templates List is loaded from <a href="https://openbekeniot.github.io/webapp/devicesList.html">here</a>. </p>
	  <p>If you have any questions, ask on our forum <a href="https://www.elektroda.com/">here</a>. </p>
      Chipset:
      <select v-model="selectedChipset">
        <option v-for="chip in chipsets" :value="chip" :key="chip">{{chip}}</option>
      </select>
      {{ (filteredDevices || []).length - 1 }} devices
      <br/><br/>

      <select v-model="selectedDevice" style="width: 250px;">
        <option v-for="dev in filteredDevices" :value="dev" :key="dev">{{ getDeviceDisplayName(dev) }}</option>
      </select>

      <div>
        <device :selected-device="selectedDevice" style="margin: 10px 0"></device>
        <div v-if="selectedDevice">
          <button @click="useDevice">Copy Device Settings</button>
        </div>
        <div v-else>Pick a device from the dropdown.</div>
      </div>
    </div>

    <div class="item" style="width: 300px;">
      <h4>Pin Settings:</h4>
	  <p>Here you can configure your device. Remember that some pin roles require second channel field, which is only available on native interface right now. Also remember that the expected channel order for LEDs is R G B C W (first channel is Red, second Green, etc...)</p>
      <div v-for="(role, index) in pins.roles" :key="index">
        <span class="pin-index">{{index}}</span>
        <select v-model="pins.roles[index]">
          <option v-for="(name, index2) in pins.rolenames" :value="index2" :key="index2" :selected="(role == index2)">{{name}}</option>
        </select>
        <input type="number" min="0" max="32" step="1" v-model="pins.channels[index]">
      </div>

      <br/>
      <label for="deviceFlag" style="width:75px; display: inline-block;">Flag:</label>&nbsp;<input id="deviceFlag" v-model="deviceFlag" /><br/>
      <label for="deviceCommand" style="width:75px; display: inline-block;">Command:</label>&nbsp;<input id="deviceCommand" v-model="deviceCommand" placeholder="Startup command"/><br/>

      <button @click="savePins">Save Pins</button>
      <br/>
	  NOTE: You might need to reboot your device in order to apply all changes.
    </div>
    <div class="item" style="width: 300px;">
      <h4>Channel Types:</h4>
	  <p>Channel types/roles are used mostly with TuyaMCU devices. They are for more advanced users. Channel types/roles can be also used while making advanced scriptable devices and for testing.</p>
	  <p>Setting a type for given channel may cause a special control to appear on main native WWW page. For example, a slider for dimmer channel or a radio selection box for a fan speed channel.</p>
	  <p>Do not edit unless you know what you're doing.</p>
      <div v-for="(role, index) in channelTypes.types" :key="index">
        <span class="channel-index">{{index}}</span>
        <select v-model="channelTypes.types[index]">
          <option v-for="(name, index2) in channelTypes.typenames" :value="index2" :key="index2" :selected="(role == index2)">{{name}}</option>
        </select>
      </div>

      <br/>
      <button @click="saveChannelTypes">Save Types</button>
      <br/>
    </div>
  </div>
</template>

<script>
  module.exports = {
    components: {
      'device': window.getComponent('device')
    },
    data: ()=>{
      return {
        uptime_s: 0,
        build:'unknown',
        sys:'unknown',
        ip:'unknown',
        mac:'unknown',
        mqtthost:'unknown',
        mqtttopic:'unknown',
        shortName:'unknown',
        webapp:'unknown',
        chipset:'unknown',
        shortStartupCommand:'',
        flags:0,
        supportsClientDeviceDB: false,

        pins:{ rolenames:[], roles:[], channels:[] },
        channelTypes:{ typenames:[], types:[] },
        deviceFlag:"",
        deviceCommand: "",
        deviceTemplate: "",

        error:'',
        interval: null,

        devices: null,
        selectedDevice: null,
        chipsets:[
          "All","BK7231N","BK7231S","BK7231T","BL602", "XR809", "W800", "W600"
        ],
        selectedChipset: "All",
        pinRoleNames_Old: [
          " ",
          "Relay",
          "Relay_n",
          "Button",
          "Button_n",
          "LED",
          "LED_n",
          "PWM",
          "WifiLED",
          "WifiLED_n",
          "Btn_Tgl_All",
          "Btn_Tgl_All_n",
          "dInput",
          "dInput_n",
          "TglChanOnTgl",
          "dInput_NoPullUp",
          "dInput_NoPullUp_n",
          "BL0937SEL",
          "BL0937CF",
          "BL0937CF1",
          "ADC",
          "SM2135DAT",
          "SM2135CLK",
          "BP5758D_DAT",
	        "BP5758D_CLK",
          "BP1658CJ_DAT",
	        "BP1658CJ_CLK",
        	"PWM_n",
          "IRRecv",
          "IRSend",
          "Btn_NextColor",
          "Btn_NextColor_n",
          "Btn_NextDimmer",
          "Btn_NextDimmer_n",
          "AlwaysHigh",
          "AlwaysLow",
          "UCS1912_DIN",
          "SM16703P_DIN",
          "Btn_NextTemperature",
          "Btn_NextTemperature_n",
          "Btn_ScriptOnly",
          "Btn_ScriptOnly_n",
          "DHT11",
          "DHT12",
          "DHT21",
          "DHT22",
          "CHT8305_SDA",
          "CHT8305_SCK",
          "SHT3X_SDA",
          "SHT3X_SCK",
          "SoftSDA",
          "SoftSCL",
          "SM2235DAT",
          "SM2235CLK",
          "BridgeFWD",
          "BridgeREV",
          "Btn_SmartLED",
          "Btn_SmartLED_n",
          "DoorSnsrWSleep",
          "DoorSnsrWSleep_nPup",
          "BAT_ADC",
          "BAT_Relay",
          "TM1637_DIO",
          "TM1637_CLK",
          "error",
          "error",
          "error",
          "error",
          "error"
        ],
        pinRoleNames: [
            " ",
            "Rel",
            "Rel_n",
            "Btn",
            "Btn_n",
            "LED",
            "LED_n",
            "PWM",
            "WifiLED",
            "WifiLED_n",
            "Btn_Tgl_All",
            "Btn_Tgl_All_n",
            "dInput",
            "dInput_n",
            "TglChanOnTgl",
            "dInput_NoPullUp",
            "dInput_NoPullUp_n",
            "BL0937SEL",
            "BL0937CF",
            "BL0937CF1",
            "ADC",
            "SM2135DAT",
            "SM2135CLK",
            "BP5758D_DAT",
            "BP5758D_CLK",
            "BP1658CJ_DAT",
            "BP1658CJ_CLK",
            "PWM_n",
            "IRRecv",
            "IRSend",
            "Btn_NextColor",
            "Btn_NextColor_n",
            "Btn_NextDimmer",
            "Btn_NextDimmer_n",
            "AlwaysHigh",
            "AlwaysLow",
            "UCS1912_DIN",
            "SM16703P_DIN",
            "Btn_NextTemperature",
            "Btn_NextTemperature_n",
            "Btn_ScriptOnly",
            "Btn_ScriptOnly_n",
            "DHT11",
            "DHT12",
            "DHT21",
            "DHT22",
            "CHT8305_SDA",
            "CHT8305_SCK",
            "SHT3X_SDA",
            "SHT3X_SCK",
            "SoftSDA",
            "SoftSCL",
            "SM2235DAT",
            "SM2235CLK",
            "BridgeFWD",
            "BridgeREV",
            "Btn_SmartLED",
            "Btn_SmartLED_n",
            "DoorSnsrWSleep",
            "DoorSnsrWSleep_nPup",
            "BAT_ADC",
            "BAT_Relay",
            "TM1637_DIO",
            "TM1637_CLK",
            "BL0937SEL_n",
            "DoorSnsrWSleep_pd",
            "error",
            "error",
            "error",
            "error",
        ],
        releases: [],
        latest: "", // read from github
        currentversion: "", // extracted from build
        lateststr: "",

        peers:[],
      }
    },
    computed:{
      /* Returns devices filtered by chipset */
      filteredDevices(){
        if (this.selectedChipset === "All") { return this.devices; }

        //The first value is empty value
        var list = this.devices.filter(item => item === null || item.chip === this.selectedChipset);
        return list;
      }
    },
    methods:{
      getinfo(){
        let url = window.device+'/api/info';
        fetch(url)
            .then(response => response.json())
            .then(res => {
                this.uptime_s   = res.uptime_s;
                this.build      = res.build;
                this.sys        = res.sys;
                this.ip         = res.ip;
                this.mac        = res.mac;
                this.mqtthost   = res.mqtthost;
                this.mqtttopic  = res.mqtttopic;
                this.shortName  = res.shortName;
                this.webapp     = res.webapp;
                this.chipset    = res.chipset;
                this.flags      = res.flags;
                this.shortStartupCommand = res.startcmd;
                this.supportsClientDeviceDB = res.supportsClientDeviceDB;

                this.currentversion = this.build.split(' ').pop();
                // only get releases the first time.
                if (!this.releases.length){
                  this.getReleases();
                }
                //Only if chip supplied supportsSSDP=true or did not supply it at all (backward compatibility)
                if (res.supportsSSDP === undefined || res.supportsSSDP === 1){
                  this.getPeers();
                }
				this.refreshTemplate();
            })
            .catch(err => {
              this.error = err.toString();
              console.error(err)
            }); // Never forget the final catch!

      },

      getPeers(){
        let url = window.device+'/obkdevicelist';
        fetch(url)
          .then(response => response.json())
          .then(res => {
            this.peers = [];
            for (let i = 0; i < res.length; i++){
              let peer = { url:'http://'+res[i].ip, name:res[i].ip };
              this.peers.push(peer);
            }
          });
      },
	  refreshTemplate() {
		const device = {
		  vendor: 'Tuya',
		  bDetailed: '0',
		  name: 'Full Device Name Here',
		  model: 'enter short model name here',
		  chip: 'BK7231T',
		  board: 'TODO',
      flags: 0,
		  keywords : [
				"TODO",
				"TODO",
				"TODO"
			  ],
		  pins : {
			  },
      command: "",
		  image: 'https://obrazki.elektroda.pl/YOUR_IMAGE.jpg',
		  wiki: 'https://www.elektroda.com/rtvforum/topic_YOUR_TOPIC.html',
		};
    device.command = this.shortStartupCommand;
    device.flags = this.flags;
		device.chip = this.chipset;
		//device.pins = 
    for (let i = 0; i < this.pins.roles.length; i++){
			if(this.pins.roles[i] == 0)
			{
				continue;
			}
			if(this.pins.roles[i] == undefined)
			{
				continue;
			}
			let rName = this.pins.rolenames[this.pins.roles[i]];
			let ch1 = 0;
      if(this.pins.channels && i < this.pins.channels.length)
      {
          ch1 = this.pins.channels[i];
      }
			//let obj = { "5", "Relay;1" };
			device.pins[i] = rName+";"+ch1;
      if(this.pins.channels2 && i < this.pins.channels2.length)
      {
			  let ch2 = this.pins.channels2[i];
        device.pins[i] += ";"+ch2;
      }
    }
		deviceTemplate = JSON.stringify(device, null, 2);
		// fix for not working textArea for me?
		this.deviceTemplateElement.value = deviceTemplate;
	  },
      getPins(){
        let url = window.device+'/api/pins';
        fetch(url)
            .then(response => response.json())
            .then(res => {
              this.pins = res;
			  this.refreshTemplate();
            })
            .catch(err => {
              this.error = err.toString();
              console.error(err)
            }); // Never forget the final catch!

      },
      getChannelTypes(){
        let url = window.device+'/api/channelTypes';
        fetch(url)
            .then(response => response.json())
            .then(res => {
              this.channelTypes = res;
			  this.refreshTemplate();
            })
            .catch(err => {
              this.error = err.toString();
              console.error(err)
            }); // Never forget the final catch!

      },
      savePins() {
        let tosave = {};

        //Send more data pieces conditionally to prevent errors
        if (this.supportsClientDeviceDB) {
          //Valid deviceFlag is >=0 and <=10 (see new_pins.h)
          if (this.deviceFlag){ //Check flag value if populated
            var deviceFlagParsed = parseInt(this.deviceFlag, 10);
            if (!isFinite(deviceFlagParsed) || isNaN(deviceFlagParsed) || (deviceFlagParsed < 0) || (deviceFlagParsed > 10)){
              alert("Invalid flag value. Valid values are integers >= 0 and <= 10");
              return;
            }
          }

          tosave.deviceFlag = deviceFlagParsed;

          //Only send non-empty string value
          var deviceCommandParsed = (this.deviceCommand || "").trim();
          if (deviceCommandParsed){
            tosave.deviceCommand = deviceCommandParsed;
          }
        }

        for (let i = 0; i < this.pins.channels.length; i++){
          this.pins.channels[i] = +this.pins.channels[i];
        }
        for (let i = 0; i < this.pins.roles.length; i++){
          this.pins.roles[i] = +this.pins.roles[i];
        }
        tosave.channels = this.pins.channels;
        tosave.roles = this.pins.roles;

        let url = window.device+'/api/pins';
        fetch(url, {
                method: 'POST',
                body: JSON.stringify(tosave),
            })
            .then(response => response.json())
            .then(res => {
              this.error = JSON.stringify(res);
            })
            .catch(err => {
              this.error = err.toString();
              console.error(err)
            }); // Never forget the final catch!

        console.log('would save',this.pins);
      },
      saveChannelTypes() {
        let tosave = {};

        for (let i = 0; i < this.channelTypes.types.length; i++){
          this.channelTypes.types[i] = +this.channelTypes.types[i];
        }
        tosave.types = this.channelTypes.types;

        let url = window.device+'/api/channelTypes';
        fetch(url, {
                method: 'POST',
                body: JSON.stringify(tosave),
            })
            .then(response => response.json())
            .then(res => {
              this.error = JSON.stringify(res);
            })
            .catch(err => {
              this.error = err.toString();
              console.error(err)
            }); // Never forget the final catch!

        console.log('would save',this.channelTypes);
      },
      getRoleIndex(role){
        let res = this.pinRoleNames.indexOf(role);
        if(res == -1){
           res = this.pinRoleNames_Old.indexOf(role);
        }
        if(res == -1){
          console.console.warn("WARNING: pin role " + role + " not found on tables!");
        }
        return res;
      },
      getTemplateAsFile() {  
        let baseName = "Unnamed";
        if(this.shortName != undefined && this.shortName.length > 0) {
          baseName = this.shortName;
        } else {
          baseName = this.mqtttopic;
        }
        let text = this.deviceTemplateElement.value;
        let timestamp = new Date().toLocaleString().replace(/[:/]/g, '-');
        timestamp = timestamp.replace(", ","_");
        const filename = `${baseName}_${timestamp}.json`;
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('download', filename);
        a.setAttribute('href', url);
        a.click();
        URL.revokeObjectURL(url);
      },
      getTemplateAsClipboard() {
        this.deviceTemplateElement.select();
        document.execCommand('copy');
        this.deviceTemplateElement.blur();
      },
      useDevice(){
        if (this.selectedDevice === null){ //No device was selected, keep current pin values
          return;
        }

        var newPinsRoles = [];
        var newPinsChannels = [];
        for (let i = 0; i < this.pins.roles.length; i++){
          newPinsRoles.push(0);
          newPinsChannels.push(0);
        }

        var devicePins = this.selectedDevice.pins;
        for(let pin in devicePins){
          let roleChannel = devicePins[pin].split(";");

          newPinsRoles[pin]=this.getRoleIndex(roleChannel[0].trim());
          newPinsChannels[pin] = roleChannel[1].trim();
        }

        this.pins.roles = newPinsRoles;
        this.pins.channels = newPinsChannels;
        this.deviceFlag = this.selectedDevice.flag || "";
        this.deviceCommand = this.selectedDevice.command || "";
      },
      getDevices(){
        fetch(window.root + "devices.json")
          .then(response => response.json())
          .then(data => {
            this.devices = data.devices.sort((a,b) => {
              const nameA = this.getDeviceDisplayName(a).toLowerCase();
              const nameB = this.getDeviceDisplayName(b).toLowerCase();
              return nameA < nameB ? -1 : (nameA > nameB ? 1: 0);
            });

            this.devices.unshift(null); //Empty placeholder
          })
          .catch(err => {
              this.error = err.toString();
              console.error(err)
            });
      },
      getReleases(){
        let base = "https://api.github.com/repos/openshwprojects/OpenBK7231T_App/releases";
        fetch(base)
          .then(response => response.json())
          .then(data => {
            this.releases = data;
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
      getDeviceDisplayName(dev){
        //The first option is a placeholder with null value
        return dev ? dev.vendor + " " + dev.name : "";
      }
    },
    mounted (){
        this.msg = 'fred';
        console.log('mounted controller');
		    this.deviceTemplateElement = document.getElementById("deviceTemplate");
        this.getPins();
        this.getChannelTypes();
        this.getinfo();
        this.getDevices();
        this.interval = setInterval(()=>{
          this.getinfo();
        }, 10000);
    },
    destroyed(){
      clearInterval(this.interval);
    }

  }
//@ sourceURL=/vue/info.vue
</script>

<style scoped>
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
</style>
