<template>
  <div class="container">
    <div class="item">
      <h4>Command status</h4>
      <p>Here you can check the last command send to OBK device by our Web App frontent for Tools. </p>
      <h5>Last command: {{command_text}}</h5>
      <h5>Last status: {{command_status}}</h5>

      <h4>Generic Tools</h4>
      <p>Those are all wrappers for console commands, but they are more friendly for beginners. Please read console <a href="https://github.com/openshwprojects/OpenBK7231T_App/blob/main/docs/commands.md">commands docs</a> if you want to know more. </p>
      
       <button @click="stopDrivers($event)">Stop all drivers</button><br>
       <button @click="factorySettings($event)">Return device to factory settings (this will erase everything, even your Wifi config)</button>
       <button @click="backToOpenAccessPoint($event)">Clear WiFi config and return to AP, but keep settings</button>
       <button @click="temporaryAPMode($event)">Temporarily convert to AP mode (will go AP now, but back to client with reboot)</button>
       <button @click="forceSafeMode($event)">Force reboot into safe mode</button>
       <p>Driver testing shortcuts, please REMEMBER, they will not run after reboot, if you want driver to run after reboot, use a startup command/autoexec.bat</p>
       <button @click="startDriver('SSDP')">Start SSDP</button>
       <button @click="startDriver('DDP')">Start DDP</button>
       <button @click="startDriver('DGR')">Start DGR</button>

      <h4>Test/Play Tools</h4>
      <p>Some things to play around/to learn events</p>
       <button @click="addRepeatingEvent(7298,'POWER TOGGLE', 2)">Start toggling power every 2 seconds</button><br>
       <button @click="cancelRepeatingEvent(7298)">Stop toggling power</button><br>
       <button @click="addRepeatingEvent(9531,'add_dimmer 1 2', 0.01)">Start Dimmer ping-pong animation for LED</button><br>
       <button @click="cancelRepeatingEvent(9531)">Stop Dimmer ping-pong animation for LED</button><br>
       <button @click="addRepeatingEvent(8412,'add_temperature 1 2', 0.01)">Start Temperature ping-pong animation for LED</button><br>
       <button @click="cancelRepeatingEvent(8412)">Stop Temperature ping-pong animation for LED</button><br>

       
    </div>
    <div class="item">
      <h4>LED tools</h4> 
      <p>Here are some misc buttons for testing LEDs. </p>
       <button @click="justSetRed($event)">100% Red</button>
       <button @click="justSetGreen($event)">100% Green</button>
       <button @click="justSetBlue($event)">100% Blue</button><br>
       <button @click="justSetWarm($event)">100% Warm</button>
       <button @click="justSetCool($event)">100% Cool</button>
       <button @click="toggleLED($event)">Toggle LED</button><br>

      <h4>LED driver tools</h4>      
      <p>Those will show up when you enable a 'I2C' LED driver and set correct pin. You also might need to reboot. </p>
      <p>Here you can easily change the order of LED colours. The order of colours in SM2135/etc drivers is not standarized, so if you have wrong colours, for example, cool warm is swapped with red, you might need to reorder them here. Enter numbers 0, 1, 2, 3 and 4, each one only once. </p>
      <label for="R" style="width:75px; display: inline-block;">Red:</label>&nbsp;<input id="R" v-model="R" placeholder="R"/>
      <label for="G" style="width:75px; display: inline-block;">Green:</label>&nbsp;<input id="G" v-model="G" placeholder="G"/>
      <label for="B" style="width:75px; display: inline-block;">Blue:</label>&nbsp;<input id="B" v-model="B" placeholder="B"/>
      <label for="C" style="width:75px; display: inline-block;">Cool:</label>&nbsp;<input id="C" v-model="C" placeholder="C"/>
      <label for="W" style="width:75px; display: inline-block;">Warm:</label>&nbsp;<input id="W" v-model="W" placeholder="W"/>
       <button @click="applyMapAndSetRed($event)">Apply and turn light to Red</button><br>
       <button @click="applyMapAndSetGreen($event)">Apply and turn light to Green</button><br>
       <button @click="applyMapAndSetBlue($event)">Apply and turn light to Blue</button><br>
       <button @click="applyMapAndSetWarm($event)">Apply and turn light to Warm</button><br>
       <button @click="applyMapAndSetCool($event)">Apply and turn light to Cool</button><br><br>
      <p>LED remap will be automatically saved in flash.</p>
    </div>
    <div class="item">
      <h4>Power Metering</h4>
      <p>Those are useful if you have a device running BL0937, BL0942, CSE or a similiar driver. </p>
      <h5>Calibration utility</h5>
      <p>Here you can calibrate your device. It's the same as using 'VoltageSet', etc commands, just with GUI. </p>
      <p>Please connect 60W bulb (or another resistive load with power factor equal to 1), measure the real voltage with multimeter, enter in field and save: </p>
      <label for="Voltage" style="width:75px; display: inline-block;">Voltage:</label>&nbsp;<input id="Voltage" v-model="Voltage" placeholder="Startup command"/>
      <button @click="applyVoltage($event)">Apply!</button>
      <p>Now do the same for current, enter measured current in A:</p>
      <label for="Current" style="width:75px; display: inline-block;">Current:</label>&nbsp;<input id="Current" v-model="Current" placeholder="Startup command"/>
      <button @click="applyCurrent($event)">Apply!</button>
      <p>Now do the same for power, enter measured power in W:</p>
      <label for="Power" style="width:75px; display: inline-block;">Power:</label>&nbsp;<input id="Power" v-model="Power" placeholder="Startup command"/>
      <button @click="applyPower($event)">Apply!</button>
      <p>Calibration will be automatically saved in flash.</p>
      
      <h5>Extra utilities for power metering.</h5>
      <p>BL0937/42/ETC devices can measure current, power and voltage. They can also count and save energy consumption, but it requires a little setup. Don't forget to enable NTP in short startup command/autoexec! </p>
      <button @click="resetEnergyCounters($event)">Reset the 'total' energy counter</button><br>
      <button @click="setupEnergyCounters($event)">Enable and setup some basic energy counting</button><br>
      <button @click="stopEnergyCounters($event)">Disable basic energy counting</button><br>

    </div>
    <div class="item">
      <h4>Tasmota Device Groups</h4> 
      <p>Here you can play around Tasmota Device Groups, test sending of packets, etc. </p>
      <h5>External DGR control</h5>
      <p>Here you can control any outside Tasmota DGR group, even if your device is not in DGR. Of course, DGR driver must be run first.</p>
      <label for="ExternalGroupName" style="width:75px; display: inline-block;">Target:</label>&nbsp;<input id="ExternalGroupName" v-model="ExternalGroupName" placeholder="ExternalGroupName"/>
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
              let rep = prompt("Are you sure? This will ERASE ALL YOUR SETTINGS. Enter yes.", "no");
			  if (rep != null) {
                if(rep == "yes")
                {
                    this.runCommand("ClearConfig");
                }
			  }
        },
        backToOpenAccessPoint(ev){			
              let rep = prompt("Are you sure? This will return device to AP, andd everyone will be able to connect to it. Enter yes.", "no");
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
