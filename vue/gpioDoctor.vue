<template>
  <div class="container">
    <div class="item infoPanel">
      <p>Use this tool to identify GPIO roles on an unknown device. Before you start, check <a href="https://www.youtube.com/watch?v=VDbaLR_0YWs">Templates</a> first; there may already be a template for your device.</p>

      <h4>Warning</h4>
      <p>This tool overrides your current GPIO configuration. Use with caution. Back up your current template first, if needed.</p>

      <h4>How to use: finding outputs</h4>
      <p>To find relays, LEDs, or PWM outputs, use the “Set Output High” / “Set Output Low” button for each pin and observe what changes. This can also help with PWM outputs, because the “Relay” role can drive a PWM channel by toggling it between 100% and 0% duty cycle.</p>

      <h4>How to use: finding inputs</h4>
      <p>To find inputs (including buttons), first click “Set Input (pull-up)”, which is the most common option. Then press and hold the button briefly and check whether the state changes (High/Low). If it does, you have likely found your button. In rarer cases, you may also want to try “Set Input (no pull-up)” (for example, some door sensors).</p>

      <h4>How to use: final steps</h4>
      <p>Changes you make here are saved automatically. Once you have identified the required pins, clear any unused roles and keep only the roles you intend to use.</p>
    </div>

    <div class="item pinsPanel" :style="pinsCssVars">

      <div class="pinHeader">
        <div>Pin</div>
        <div>Role</div>
        <div class="rightHeader">
          <div>Ch</div>
        </div>
      </div>

      <div v-for="(role, index) in pins.roles" :key="index" class="pinRow">
        <div class="cellPin">
          <span class="pin-index">P{{index}}</span>
          <span class="pin-alias">({{getPinAlias(index)}})</span>
        </div>

        <div class="cellRole">
          <select class="roleSelect" v-model="pins.roles[index]" @change="onPinChange(index)">
            <option v-for="(name, index2) in pins.rolenames" :value="index2" :key="index2">{{name}}</option>
          </select>
        </div>

        <div class="cellRight rightGroup">
          <input class="chInput" type="number" min="0" max="64" step="1" v-model="pins.channels[index]" @change="onChannelChange(index)">
          <span class="valBadge" :data-state="pins.states[index] ? 'high' : 'low'">{{pins.states[index] ? 'High' : 'Low'}}</span>
        </div>

        <div class="cellToolsLeft">
          <button @click="toggle(index)" :class="pins.states[index] ? 'button-green' : 'button-red'">
            {{ pins.states[index] ? 'Set Output Low' : 'Set Output High' }}
          </button>
          <button @click="setInput(index,'dInput')">Set Input P-up</button>
        </div>

        <div class="cellToolsRight">
          <button @click="setInput(index,'dInput_NoPullUp')">Set Input (no P-up)</button>
          <button @click="clearPin(index)">Clear</button>
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
        rfdata: null,
        display: '',
        pins:{ rolenames:[], roles:[], channels:[], states:[] },
      }
    },
    methods:{
        begin() {

        },
       getPinAlias(index) {
        // Some pins have special roles
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
    computed:{
      roleMaxCh(){
        const names = (this.pins && this.pins.rolenames) ? this.pins.rolenames : [];
        let maxLen = 0;
        for(let i = 0; i < names.length; i++){
          const s = names[i];
          if(s && s.length > maxLen) maxLen = s.length;
        }
        // Extra space for dropdown chrome and padding
        let ch = maxLen + 6;
        if(ch < 18) ch = 18;
        if(ch > 48) ch = 48;
        return ch;
      },
      pinsCssVars(){
        return { '--roleW': this.roleMaxCh + 'ch' };
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
  align-items: flex-start;
  gap: 28px;
  flex-wrap: wrap;
  margin-top: 18px;
}

.item {
  padding: 0 15px;
}

/* Left info panel */
.infoPanel {
  flex: 0 0 300px;
  max-width: 360px;
}

/* Right pins panel */
.pinsPanel {
  flex: 1 1 720px;
  max-width: 920px;
  min-width: 520px;
  /* Role column target width (computed via pinsCssVars) */
  --roleW: 28ch;
}

.pinHeader{
  display: grid;
  grid-template-columns: 150px minmax(18ch, var(--roleW)) 1fr;
  column-gap: 12px;
  padding: 6px 10px;
  font-weight: 600;
  opacity: 0.85;
  border-bottom: 1px solid rgba(0,0,0,0.12);
  margin-bottom: 6px;
  align-items: end;
}

.rightHeader{
  display: grid;
  grid-template-columns: 5ch max-content;
  column-gap: 12px;
  justify-content: start;
}

.pinRow{
  display: grid;
  grid-template-columns: 150px minmax(18ch, var(--roleW)) 1fr;
  grid-template-areas:
    "pin role right"
    ".  toolsL toolsR";
  column-gap: 12px;
  row-gap: 6px;
  padding: 8px 10px;
  border-bottom: 1px solid rgba(0,0,0,0.08);
  align-items: center;
}

.cellPin{ grid-area: pin; white-space: nowrap; }
.cellRole{ grid-area: role; min-width: 0; }
.cellRight{ grid-area: right; }
.cellToolsLeft{ grid-area: toolsL; }
.cellToolsRight{ grid-area: toolsR; }

.pin-index{ font-weight: 600; }
.pin-alias{ opacity: 0.7; margin-left: 6px; }

.roleSelect{
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.rightGroup{
  display: grid;
  grid-template-columns: 5ch max-content;
  column-gap: 12px;
  align-items: center;
  justify-content: start;
}

.chInput{
  width: 100%;
  box-sizing: border-box;
  text-align: center;
}

/* Hide number spinners to avoid cramped/clipped look at small widths */
.chInput::-webkit-outer-spin-button,
.chInput::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.chInput[type=number] {
  -moz-appearance: textfield;
}

/* Keep classic/simple control feel but with consistent sizing */
select, input, button{
  font-size: 13px;
}

select, input{
  padding: 4px 6px;
}

button{
  padding: 3px 10px;
}

/* Tool button rows */
.cellToolsLeft,
.cellToolsRight{
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.valBadge{
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-weight: 600;
  border: 1px solid rgba(0,0,0,0.15);
}

.valBadge[data-state="high"]{ background: rgba(46,125,50,0.12); color: #1b5e20; }
.valBadge[data-state="low"] { background: rgba(229,57,53,0.12); color: #b71c1c; }

.button-green {
  background-color: green;
  color: white;
}

.button-red {
  background-color: red;
  color: white;
}

@media (max-width: 900px){
  .pinsPanel{
    min-width: 0;
    max-width: 100%;
  }
  .pinHeader{
    display: none;
  }
  .pinRow{
    grid-template-columns: 1fr;
    grid-template-areas:
      "pin"
      "role"
      "right"
      "toolsL"
      "toolsR";
  }
  .cellPin{ margin-bottom: 2px; }
}
</style>

