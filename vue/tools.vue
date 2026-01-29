<template>
  <div class="container">
    <div class="item">
      <h4>Command Status</h4>
      <p>Last command shows the most recent command triggered from this page. Last status shows whether the request is still sending, completed successfully (OK 200), or failed (error response).</p>
      <h5>Last command: {{command_text}}</h5>
      <h5>Last status: {{command_status}}</h5>

      <h4>Generic Tools</h4>
      <p>These are wrappers around console commands, presented in a more beginner-friendly way. See the console <a href="https://github.com/openshwprojects/OpenBK7231T_App/blob/main/docs/commands.md">command documentation</a> for details.</p>
      
       <button @click="stopDrivers($event)">Stop all drivers</button><br>
       <button @click="factorySettings($event)">Return device to factory settings (this will erase everything, including your WiFi configuration)</button>
       <button @click="backToOpenAccessPoint($event)">Clear WiFi configuration and switch to AP mode (keep settings)</button>
       <button @click="temporaryAPMode($event)">Temporarily switch to AP mode (switches now; returns to client mode after reboot)</button>
       <button @click="forceSafeMode($event)">Force reboot into safe mode</button>
       <p>Driver testing shortcuts. Note: these do not persist across reboots. To start a driver on boot, use a startup command or autoexec.bat.</p>
       <button @click="startDriver('SSDP')">Start SSDP</button>
       <button @click="startDriver('DDP')">Start DDP</button>
       <button @click="startDriver('DGR')">Start DGR</button>

      <h4>Test/Play Tools</h4>
      <p>Utilities for testing and learning event behavior.</p>
       <button @click="addRepeatingEvent(7298,'POWER TOGGLE', 2)">Start toggling power every 2 seconds</button><br>
       <button @click="cancelRepeatingEvent(7298)">Stop toggling power</button><br>
       <button @click="addRepeatingEvent(9531,'add_dimmer 1 2', 0.01)">Start dimmer ping-pong animation for LED</button><br>
       <button @click="cancelRepeatingEvent(9531)">Stop dimmer ping-pong animation for LED</button><br>
       <button @click="addRepeatingEvent(8412,'add_temperature 1 2', 0.01)">Start temperature ping-pong animation for LED</button><br>
       <button @click="cancelRepeatingEvent(8412)">Stop temperature ping-pong animation for LED</button><br>

       
    </div>
    <div class="item">
      <h4>LED Tools</h4>
      <p>Miscellaneous buttons for testing LEDs.</p>
       <button @click="justSetRed($event)">100% Red</button>
       <button @click="justSetGreen($event)">100% Green</button>
       <button @click="justSetBlue($event)">100% Blue</button><br>
       <button @click="justSetWarm($event)">100% Warm</button>
       <button @click="justSetCool($event)">100% Cool</button>
       <button @click="toggleLED($event)">Toggle LED</button><br>

      <h4>LED Driver Tools</h4>
      <p>These options appear when you enable an I2C LED driver and configure the correct pins. You may also need to reboot.</p>
      <p>Use this to change the channel order for LED drivers (for example, SM2135). Some drivers are not standardized, so colors may be mapped incorrectly (for example, warm/cool swapped with red). Enter the channel indices 0-4, using each value once.</p>
      <label for="R" style="width:75px; display: inline-block;">Red:</label>&nbsp;<input id="R" v-model="R" placeholder="R"/>
      <label for="G" style="width:75px; display: inline-block;">Green:</label>&nbsp;<input id="G" v-model="G" placeholder="G"/>
      <label for="B" style="width:75px; display: inline-block;">Blue:</label>&nbsp;<input id="B" v-model="B" placeholder="B"/>
      <label for="C" style="width:75px; display: inline-block;">Cool:</label>&nbsp;<input id="C" v-model="C" placeholder="C"/>
      <label for="W" style="width:75px; display: inline-block;">Warm:</label>&nbsp;<input id="W" v-model="W" placeholder="W"/>
       <button @click="applyMapAndSetRed($event)">Apply mapping and set light to Red</button><br>
       <button @click="applyMapAndSetGreen($event)">Apply mapping and set light to Green</button><br>
       <button @click="applyMapAndSetBlue($event)">Apply mapping and set light to Blue</button><br>
       <button @click="applyMapAndSetWarm($event)">Apply mapping and set light to Warm</button><br>
       <button @click="applyMapAndSetCool($event)">Apply mapping and set light to Cool</button><br><br>
      <p>The LED remap is saved to flash automatically.</p>
    </div>
    <div class="item">
      <h4>Power Metering</h4>
      <p>These are useful if your device uses BL0937, BL0942, CSE, or a similar driver.</p>
      <h5>Calibration Utility</h5>
      <p>Here you can calibrate your device. It is equivalent to using the VoltageSet/CurrentSet/PowerSet commands, but with a GUI.</p>
      <p>Connect a 60W bulb (or another resistive load with a power factor of 1), measure the mains voltage with a multimeter, enter it in the field below, and save:</p>
      <label for="Voltage" style="width:75px; display: inline-block;">Voltage:</label>&nbsp;<input id="Voltage" v-model="Voltage" placeholder="Measured voltage (V)"/>
      <button @click="applyVoltage($event)">Apply</button>
      <p>Repeat for current: enter the measured current (A):</p>
      <label for="Current" style="width:75px; display: inline-block;">Current:</label>&nbsp;<input id="Current" v-model="Current" placeholder="Measured current (A)"/>
      <button @click="applyCurrent($event)">Apply</button>
      <p>Repeat for power: enter the measured power (W):</p>
      <label for="Power" style="width:75px; display: inline-block;">Power:</label>&nbsp;<input id="Power" v-model="Power" placeholder="Measured power (W)"/>
      <button @click="applyPower($event)">Apply</button>
      <p>Calibration is saved to flash automatically.</p>
      
      <h5>Extra Utilities for Power Metering</h5>
      <p>BL0937/BL0942/etc. devices can measure current, power, and voltage. They can also track and persist energy consumption, but this requires some setup. Do not forget to enable NTP in the short startup command or autoexec.bat.</p>
      <button @click="resetEnergyCounters($event)">Reset the 'total' energy counter</button><br>
      <button @click="setupEnergyCounters($event)">Enable and setup some basic energy counting</button><br>
      <button @click="stopEnergyCounters($event)">Disable basic energy counting</button><br>

    </div>
    <div class="item">
      <h4>Tasmota Device Groups</h4>
      <p>Here you can experiment with Tasmota Device Groups (DGR) and test packet sending.</p>
      <h5>External DGR Control</h5>
      <p>Here you can control any external Tasmota DGR group, even if your device is not part of a DGR. The DGR driver must be running first.</p>
      <label for="ExternalGroupName" style="width:75px; display: inline-block;">Target:</label>&nbsp;<input id="ExternalGroupName" v-model="ExternalGroupName" placeholder="Group name"/>
      <br><button @click="sendDGRPower(1,1)">Send power ON</button>
      <button @click="sendDGRPower(0,1)">Send power OFF</button>
      <button @click="sendDGRBrightness(25)">Send brightness 10%</button>
      <button @click="sendDGRBrightness(127)">Send brightness 50%</button>
      <button @click="sendDGRBrightness(255)">Send brightness 100%</button>
      <button @click="sendDGRColor('FF00000000')">Send color RED</button>
      <button @click="sendDGRColor('00FF000000')">Send color GREEN</button>
      <button @click="sendDGRColor('0000FF0000')">Send color BLUE</button>
      <button @click="sendDGRColor('000000FF00')">Send color WARM</button>
      <button @click="sendDGRColor('00000000FF')">Send color COOL</button>
       

    </div>
   </div>
</template>

<script>
  module.exports = {

    data: ()=>{
      return {
        msg: 'world!',
        rfdata: null,
        display: '',
        configdata: null,
        build:'unknown',
        chipset:'unknown',
        status:'nothing going on',
        rfurl: '',
        configurl: '',
        command_text: 'none',
        command_status:'none',
        Voltage: "230",
        Current: "0.26",
        Power: "60",
        flashvarsurl: '',
        R:'0',
        G:'0',
        B:'0',
        C:'0',
        W:'0',
        ExternalGroupName:'SomeRandomGroup',
      }
    },
    methods:{
        getinfo(){
            let url = window.device+'/api/info';
            fetch(url)
                .then(response => response.json())
                .then(res => {

                })
                .catch(err => {
                    this.error = err.toString();
                    console.error(err)
                }); // Never forget the final catch!
        },
        sendDGRPower(bitFlag, numRelays){
              this.runCommand("DGR_SendPower " + ExternalGroupName.value +" "+bitFlag + " " + numRelays + " ");
        },
        sendDGRColor(val){
              this.runCommand("DGR_SendRGBCW " + ExternalGroupName.value +" " +val + " ");
        },
        sendDGRBrightness(val){
              this.runCommand("DGR_SendBrightness " + ExternalGroupName.value +" " +val + " ");
        },
        addRepeatingEvent(id, command, interval){
              this.runCommand("backlog cancelRepeatingEvent " + id+"; addRepeatingEventID "+interval + " -1 " + id + " " +command);
        },
        cancelRepeatingEvent(id){
              this.runCommand("cancelRepeatingEvent "+ id + " " );
        },
        applyMapAndSetRed(ev){
              this.runLEDMapping("led_basecolor_rgb FF0000")
        },
        applyMapAndSetGreen(ev){
              this.runLEDMapping("led_basecolor_rgb 00FF00")
        },
        applyMapAndSetBlue(ev){
              this.runLEDMapping("led_basecolor_rgb 0000FF")
        },
        applyMapAndSetCool(ev){
              this.runLEDMapping("led_temperature 154")
        },
        applyMapAndSetWarm(ev){
              this.runLEDMapping("led_temperature 500")
        },
        justSetRed(ev){
              this.runLED("led_basecolor_rgb FF0000")
        },
        toggleLED(ev){
              this.runCommand("POWER TOGGLE");
        },
        justSetGreen(ev){
              this.runLED("led_basecolor_rgb 00FF00")
        },
        justSetBlue(ev){
              this.runLED("led_basecolor_rgb 0000FF")
        },
        justSetCool(ev){
              this.runLED("led_temperature 154")
        },
        justSetWarm(ev){
              this.runLED("led_temperature 500")
        },
        runLEDMapping(cmd){
              let full = "backlog LED_Map "+R.value + " " + G.value + " " + B.value + " " + C.value + " " + W.value + ";"+cmd+"; Dimmer 100; led_enableAll 1"
              this.runCommand(full);
        },
        runLED(cmd){
              let full = "backlog "+cmd+"; Dimmer 100; led_enableAll 1"
              this.runCommand(full);
        },
        applyVoltage(ev){
              this.runCommand("VoltageSet "+Voltage.value);
        },
        applyCurrent(ev){
              this.runCommand("CurrentSet "+Current.value);
        },
        applyPower(ev){
              this.runCommand("PowerSet "+Power.value);
        },
        startDriver(qq){
              this.runCommand("startDriver "+qq);
        },
        stopDrivers(ev){
              this.runCommand("stopDriver *");
        },
        factorySettings(ev){			
              let rep = prompt("Are you sure? This will erase all settings. Type yes to confirm.", "no");
			  if (rep != null) {
                if(rep == "yes")
                {
                    this.runCommand("ClearConfig");
                }
			  }
        },
        backToOpenAccessPoint(ev){			
              let rep = prompt("Are you sure? This will clear the WiFi credentials and restart the device in AP mode. Anyone nearby will be able to connect. Type yes to confirm.", "no");
			  if (rep != null) {
                if(rep == "yes")
                {
                    this.runCommand("backlog SSID1 \"\"; Password1 \"\"; restart");
                }
			  }
        },
        
        temporaryAPMode(ev){
              this.runCommand("OpenAP");
        },
        forceSafeMode(ev){
              this.runCommand("SafeMode");
        },
        resetEnergyCounters(ev){
              this.runCommand("EnergyCntReset");
        },
        setupEnergyCounters(ev){
            // SetupEnergyStats [Enable1or0][SampleTime][SampleCount]
              this.runCommand("SetupEnergyStats 1 60 60");
        },
        stopEnergyCounters(ev){
              this.runCommand("SetupEnergyStats 0 60 60");
        },
        getMap() {
            this.runCommand("LED_Map",false);
        },
        processCommandReply(obj) {
            console.log(obj);
            if(obj == undefined)
                return;
            if(obj.res != undefined)
            {
            console.log("res exi");
                if(obj.res.Map != undefined){
            console.log("map exi");
                    R.value = obj.res.Map[0];
                    G.value = obj.res.Map[1];
                    B.value = obj.res.Map[2];
                    C.value = obj.res.Map[3];
                    W.value = obj.res.Map[4];
                }
            }
        },
        runCommand(command, trackStatus=true){
            let that = this;
            console.log("Will send " + command);
            if(trackStatus)
            {
                this.command_status = "Sending...";
                this.command_text = command;
            }
            let url = window.device+'/api/cmnd';
            fetch(url, {
                method: "POST",
                body: command 
            })
                .then(response => response.json())
                .then(res => {
                    console.log("Command "+command+" reply: " +JSON.stringify(res))
                    that.processCommandReply(res);
                    if(trackStatus)
                    {
                        if(res.success==200) {
                            this.command_status = "OK (200)!";
                        } else {
                            this.command_status = "ERROR: "+res.msg +" ("+res.success+")";
                        }
                    }
                })
                .catch(err => {
                    this.error = err.toString();
                    console.error("Command caught error: " +err)
                    if(trackStatus)
                    {
                        this.command_status = "GENERIC ERROR: "+err;
                    }
                }); // Never forget the final catch!
        },

    },
    mounted (){
        this.msg = 'fred';


        console.log('mounted tools');
        this.getinfo();
        this.getMap();
    }
  }
//@ sourceURL=/vue/tools.vue
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
    max-width: 300px;
  }
  .pin-index {
    display: inline-block;
    width: 20px;
  }
</style>
