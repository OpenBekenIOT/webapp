<template>
  <div class="container">
    <div class="item" style="max-width: 300px;">
      <h4>GPIO Doctor</h4>
      <p>Here you can quickly detect GPIO roles of an unknown device. Remember to try checking <a href="https://www.youtube.com/watch?v=VDbaLR_0YWs"> our Templates</a> first, maybe there is already template for your device.</p>

      <h4>Usage warning</h4>
      <p>This tool will override your current GPIO settings. Use with caution. Backup your current template if needed.</p>

      <h4>How to use - finding outputs</h4>
      <p>To find relays, LEDs or PWMs, just use 'Set Output High'/Set Output Low' button on each pin and see if relay/LED/Light changes. This works also for PWMs, because 'Relay' role can control PWM, it just toggles it between 100% and 0% duty.</p>
 
      <h4>How to use - finding inputs</h4>
      <p>To find inputs, including buttons, first click 'Setup input with pull up', which is a most common option, and then press a button for a second and check if state High/Low changes. If it changes, then you've found your button. In some rare cases, you also might want to try no pullup resistor mode (maybe for door sensors, etc?)</p>
 
      <h4>How to use - final steps</h4>
      <p>You can easily change pin roles here and they will be saved. Remember to clear up unused Relay/dInput/roles etc manually and keep only the roles you are going to use</p>
 
    </div>
    <div class="item" style="max-width: 550px;">
    
      <h4>GPIO Doctor Pins</h4> 
      <div v-for="(role, index) in pins.roles" :key="index">
        <span class="pin-index">P{{index}} ({{getPinAlias(index)}})</span>
        <select v-model="pins.roles[index]"  @change="onPinChange(index)">
          <option v-for="(name, index2) in pins.rolenames" :value="index2" :key="index2" :selected="(role == index2)">{{name}}</option>
        </select>
       Ch: <input type="number" min="0" max="64" step="1" v-model="pins.channels[index]" @change="onChannelChange(index)">
       Val:
        <span class="pin-value" :style="{ fontWeight: pins.states[index] ? 'bold' : 'bold', color: pins.states[index] ? 'green' : 'red' }">{{pins.states[index] ? 'High' : 'Low'}}</span>
        <br>
        Tools: <button @click="toggle(index)" :class="pins.states[index] ? 'button-green' : 'button-red'">
         {{ pins.states[index] ? 'Set Output Low' : 'Set Output High' }}
         </button>
        <button @click="setInput(index,'dInput')">Set Input P-up</button>
        <button @click="setInput(index,'dInput_NoPullUp')">Set Input (no p-up)</button>
        <button @click="clearPin(index)">Clear)</button>
        <hr>
      </div>


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
        pins:{ rolenames:[], roles:[], channels:[], states:[] },
      }
    },
    methods:{
        begin() {

        },
       getPinAlias(index) {
        // some of pins have special roles
        if (index == 23)
          return "ADC3";
        if (index == 26)
          return "PWM5";
        if (index == 24)
          return "PWM4";
        if (index == 6)
          return "PWM0";
        if (index == 7)
          return "PWM1";
        if (index == 0)
          return "TXD2";
        if (index == 1)
          return "RXD2";
        if (index == 9)
          return "PWM3";
        if (index == 8)
          return "PWM2";
        if (index == 10)
          return "RXD1";
        if (index == 11)
          return "TXD1";
        return "N/A";
      },
        onPinChange(index) {
          // Do something with the selected value, using the index to identify the pin
           console.log(`Pin ${index} selected value: ${this.pins.roles[index]}`);
           let newRoleIndex = this.pins.roles[index];
           let roleNameStr = this.pins.rolenames[newRoleIndex];
           console.log("Will send new role " + roleNameStr);
           this.sendLine("backlog setPinRole " + index + " " + roleNameStr +"");
        },
        onChannelChange(index) {
          // Do something with the selected value, using the index to identify the pin
           console.log(`Pin ${index} selected value: ${this.pins.channels[index]}`);
           let newChannel = this.pins.channels[index];
           console.log("Will send new channel " + newChannel);
           this.sendLine("backlog setPinChannel " + index + " " + newChannel +"");
        },
        toggle(idx){
          console.log("entering toggle " +idx);
          let ns = this.pins.states[idx];
          if(ns){
            ns = 0;
          } else {
            ns = 1;
          }
            //alert(idx);
           //this.$set(this.pins.states, idx, ns);
           // alert("Toggled " +this.pins.states[idx]);
          console.log("Toggled " +this.pins.states[idx]);
          let type = "Rel";
          let ch = this.chooseChannel(idx);
           this.sendLine("backlog setPinRole " + idx + " " + type+"; setPinChannel "+idx+" "+ch+"; setChannel " + ch + " " + ns+"",this.getPins);
        },
        chooseChannel(idx) {
          return 63-idx;
        },
        setInput(idx, type){
          console.log("entering setInput " +idx + " with "+type);
          let ch = this.chooseChannel(idx);
           this.sendLine("backlog setPinRole " + idx + " " + type+"; setPinChannel "+idx+" "+ch+"",this.getPins);
        },
        clearPin(idx){
          console.log("entering clearPin " +idx + "!");
          let ch = 0;
          let type = "None";
           this.sendLine("backlog setPinRole " + idx + " " + type+"; setPinChannel "+idx+" "+ch+"",this.getPins);
        },
        sendLine(cmnd, callback) {
          console.log("sending cmnd: " + cmnd);
          let url = window.device+'/cm?cmnd='+cmnd;
            fetch(url)
                .then(response => response.json())
                .then(res => {
                  if(callback!=undefined) {
                    callback();
                  }
                })
                .catch(err => {
                    this.error = err.toString();
                    console.error(err)
                }); // Never forget the final catch!
        },
        getPins(){
          console.log("Manual requesting pins...");
          let url = window.device+'/api/pins';
          fetch(url)
              .then(response => response.json())
              .then(res => {
                this.setPinsData(res,false);
              })
              .catch(err => {
                this.error = err.toString();
                console.error(err)
              }); // Never forget the final catch!

      },
      setPinsData(res, bOnlyStates){
        if(bOnlyStates == false) {
                this.pins = res;
        }
        if(this.pins.states != undefined) {
          for(let i = 0; i < res.roles.length; i++)
          {
            this.$set(this.pins.states, i,  res.states[i]);
          }
        } else {
          console.log("There are no pins.states, you must have older OBK?");
          if(this.pins.states == undefined) {
            this.pins.states = new Array(res.roles.length).fill(0);
          }
        }
      },
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
        onTimerRefresh() {
          console.log("Auto requesting pins...");
          let url = window.device+'/api/pins';
          fetch(url)
              .then(response => response.json())
              .then(res => {
                // only set states
                this.setPinsData(res,true);
              })
              .catch(err => {
                this.error = err.toString();
                console.error(err)
              }); // Never forget the final catch!
        }
    },
    mounted (){
        this.msg = 'fred';


        console.log('mounted tools');
        this.getinfo();
        this.getPins();
        this.timer = setInterval(() => {
          this.onTimerRefresh();
        }, 250);
    },
    beforeDestroy() {
      clearInterval(this.timer);
    }
  }
//@ sourceURL=/vue/gpioDoctor.vue
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
  }
  .button-green {
  background-color: green;
  color: white;
}

.button-red {
  background-color: red;
  color: white;
}
</style>
