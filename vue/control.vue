<template>
    <div>
    <h3>Basic device status and debug channel values display</h3>
    <p>Here you can operate on raw channel values. You can also set RAW pwm values, without LED driver. PLEASE REMEMBER that this page is not a correct LED RGB/CW controller. Please use main WWW page for that.</p>
        <div>
          <!--<span v-for="item in channels" v-bind:key="item">{{item}}:{{channels[item]}} </span>-->
          <div v-for="(item, key) in channels" v-bind:key="item">
            <div >
              <button 
                v-if="(outputchannelrolenames[+key] === 'Rel') || (outputchannelrolenames[+key] === 'Rel_n') || (outputchannelrolenames[+key] === 'PWM') || (outputchannelrolenames[+key] === 'PWM_n')"
                v-bind:key="'button'+item" 
                :class="item?'set':'unset'" 
                @click="channelclick(key)"
              >{{channels[key]?'On':'Off'}}</button>
              <span v-bind:key="'span'+item">{{key}}:{{item}} role {{outputchannelrolenames[+key]}}{{channeltag[+key]}}</span>
              <input 
                v-if="(outputchannelrolenames[+key] === 'PWM') || (outputchannelrolenames[+key] === 'PWM_n')" 
                v-bind:key="'input'+item" 
                type="range" 
                min="0" 
                max="100" 
                v-model="channels[key]" 
                @input="channelchange(key)">
            </div>
          </div>
        </div>


        <div v-if="show_cw">
          <span class="label">CW:</span>
          <div class="radiused cw">
            <input type="range" min="0" max="100" v-model="cw" @input="change()">
          </div>
        </div>
        <div v-if="show_ww">
          <span class="label">WW:</span>
          <div class="radiused ww">
            <input type="range" min="0" max="100" v-model="ww" @input="change()">
          </div>
        </div>
        <div v-if="show_rgb">
          <span class="label">Hue:</span>
          <div class="radiused hue">
              <input type="range" min="1" max="359" v-model="hue" @input="change()">
          </div>
        </div>
        <div v-if="show_rgb">
          <span class="label">Sat:</span>
          <div class="radiused" v-bind:style="backgroundstyle">
              <input type="range" min="0" max="100" v-model="saturation" @input="change()">
          </div>
        </div>
        <div v-if="show_rgb">
          <span class="label">Int:</span>
          <div class="radiused lightness">
              <input type="range" min="0" max="100" v-model="lightness" @input="change()">
          </div>
        </div>
    </div>
</template>

<script>
  module.exports = {
    data: ()=>{
      return {
        pins:{ rolenames:[], roles:[], channels:[], channels2:[] },
        channels:{},
        outputchannelroles:[],
        outputchannelrolenames:[],
        inputchannelroles:[],
        inputchannelrolenames:[],
        channeltag:[],

        error:'',
        interval: null,


        backgroundstyle:{
          backgroundImage:"linear-gradient(to right,#eff,#f81)"
        },

        pwmChannels:0,
        show_rgb:false,
        show_cw:false,
        show_ww:false,
        channelMap:{
          r:0, g:0, b:0, cw:0, ww:0
        },


        cw:0,
        ww:0,

        hue:1,
        saturation:0,
        lightness:0,

        setinprogress: false,
        setrequired:false,
      }
    },
    methods:{
      getPins(cb){
        let url = window.device+'/api/pins';
        fetch(url)
            .then(response => response.json())
            .then(res => {
              this.pins = res;
              if (cb) cb();
            })
            .catch(err => {
              this.error = err.toString();
              console.error(err)
            }); // Never forget the final catch!
      },

      getChannels(){
        let url = window.device+'/api/channels';
        fetch(url)
            .then(response => response.json())
            .then(res => {
              this.channels = res;
              this.setHSL();

              console.log(this.channels);
            })
            .catch(err => {
              this.error = err.toString();
              console.error(err)
            }); // Never forget the final catch!
      },

      setHSL(){
        let hsl = [];
        switch(this.pwmChannels.length){
          case 1:
            this.cw = this.channels[this.pwmChannels[0]]; 
            break;
          case 2:
            this.cw = this.channels[this.pwmChannels[0]]; 
            this.ww = this.channels[this.pwmChannels[1]]; 
            break;
          case 3:
            hsl = rgbToHsl(
              this.channels[this.pwmChannels[0]]/100*255, 
              this.channels[this.pwmChannels[1]]/100*255, 
              this.channels[this.pwmChannels[2]]/100*255);

            this.hue = hsl[0] * 360;
            this.saturation = hsl[1]*100; 
            this.lightness = hsl[2]*100; 
            break;
          case 4:
            hsl = this.rgbToHsl(
              this.channels[this.pwmChannels[0]], 
              this.channels[this.pwmChannels[1]], 
              this.channels[this.pwmChannels[2]]);

            this.hue = hsl[0] * 360;
            this.saturation = hsl[1]*100; 
            this.lightness = hsl[2]*100; 
            this.cw = this.channels[this.pwmChannels[3]]; 
            break;
          case 5:
            hsl = this.rgbToHsl(
              this.channels[this.pwmChannels[0]], 
              this.channels[this.pwmChannels[1]], 
              this.channels[this.pwmChannels[2]]);

            this.hue = hsl[0] * 360;
            this.saturation = hsl[1]*100; 
            this.lightness = hsl[2]*100; 
            this.cw = this.channels[this.pwmChannels[3]]; 
            this.ww = this.channels[this.pwmChannels[4]]; 
            break;
        }
        this.backgroundstyle.backgroundImage= 
          'linear-gradient(to right,rgb('+this.lightness+'%,'+this.lightness+'%,'+this.lightness+'%),hsl('+this.hue+',100%,50%))'
      },

      setchannelsdeferred(){
        if (this.setrequired){
          return;
        }
        this.setrequired = true;
        if (!this.setinprogress){
          this.setChannels();
        }
      },

      setChannels(){
        this.setrequired = false;
        let url = window.device+'/api/channels';
        let data = [];

        let chanmax = 0;
        for (let i = 0; i < 32; i++){
          if (undefined !== this.channels[i]){
            if (chanmax < i+1){
              chanmax = i+1;
            }
          }
        }


        for (let i = 0; i < chanmax; i++){
          if (undefined !== this.channels[i]){
            data.push(+this.channels[i]);
          } else {
            data.push(0);
          }
        }

        this.setinprogress = true;
        fetch(url, { 
                      method: 'POST',
                      body: JSON.stringify(data),
            })
            .then(response => response.json())
            .then(res => {
              this.setinprogress = false;
              if (this.setrequired){
                setTimeout(()=>{
                  this.setChannels();
                }, 100);
              }
              //this.getChannels();
            })
            .catch(err => {
              this.setinprogress = false;
              if (this.setrequired){
                setTimeout(()=>{
                  this.setChannels();
                }, 100);
              }
              this.error = err.toString();
              console.error(err)
            }); // Never forget the final catch!

      },

      channelchange(channel){
        console.log(this.channels);
        console.log('change chan '+JSON.stringify(channel)+' to '+this.channels[channel]);
        this.setchannelsdeferred();
        this.setHSL();
      },

      channelclick(channel){
        if (this.channels[channel]) {
          this.channels[channel] = 0;
        } else {
          if (this.outputchannelrolenames[channel] === 'Rel' || this.outputchannelrolenames[channel] === 'Rel_n'){
          this.channels[channel] = 1;
                  } else {
          this.channels[channel] = 100;
                  }
        }
        this.channelchange(channel);
      },
      
      setupView(){
        this.getPins(()=>{
          this.getRolesForChannels();
          this.getChannels();
        })
      },
      
      getRolesForChannels(){
        let role = 0;
        this.pwmChannels = [];
        console.log('pins:', this.pins);
        if (this.pins.roles){
          for (let i = 0; i < this.pins.roles.length; i++){
            if (this.pins.roles[i]){
              let ch = this.pins.channels[i];
              let role = this.pins.roles[i];
              let rolename = this.pins.rolenames[role];
              switch(rolename){
                case 	"Rel":
                case 	"Rel_n":
                case 	"LED":
                case 	"LED_n":
                case 	"PWM":
                case 	"PWM_n":
                case 	"Wifi LED":
                case 	"Wifi LED_n":
                  this.outputchannelroles[ch] = role;
                  this.outputchannelrolenames[ch] = rolename;
                  if (this.outputchannelrolenames[ch] === 'PWM' || (this.outputchannelrolenames[ch] === 'PWM_n')){
                    this.pwmChannels.push(ch);
                  }
                  break;

                case 	"Btn_Tgl_All":
                case 	"Btn_Tgl_All_n":
                case 	"Btn":
                case 	"Btn_n":
                  this.inputchannelroles[ch] = role;
                  this.inputchannelrolenames[ch] = rolename;
                  break;
              }
            } 
          }
        }

if(false)
{       this.pwmChannels.sort();
        switch(this.pwmChannels.length){
          case 1:
            this.show_cw = true;
            this.channelMap.cw = this.pwmChannels[0];
            this.channeltag[this.pwmChannels[0]] = '-CW';
            break;
          case 2:
            this.show_cw = true;
            this.show_ww = true;
            this.channelMap.cw = this.pwmChannels[0];
            this.channeltag[this.pwmChannels[0]] = '-Cool White';
            this.channelMap.ww = this.pwmChannels[1];
            this.channeltag[this.pwmChannels[1]] = '-Warm White';
            break;
          case 3:
            this.show_rgb = true;
            this.channelMap.r = this.pwmChannels[0];
            this.channeltag[this.pwmChannels[0]] = '-Red';
            this.channelMap.g = this.pwmChannels[1];
            this.channeltag[this.pwmChannels[1]] = '-Green';
            this.channelMap.b = this.pwmChannels[2];
            this.channeltag[this.pwmChannels[2]] = '-Blue';
            break;
          case 4:
            this.show_rgb = true;
            this.show_cw = true;
            this.channelMap.r = this.pwmChannels[0];
            this.channeltag[this.pwmChannels[0]] = '-Red';
            this.channelMap.g = this.pwmChannels[1];
            this.channeltag[this.pwmChannels[1]] = '-Green';
            this.channelMap.b = this.pwmChannels[2];
            this.channeltag[this.pwmChannels[2]] = '-Blue';
            this.channelMap.cw = this.pwmChannels[3];
            this.channeltag[this.pwmChannels[0]] = '-Cool White';
            break;
          case 5:
            this.show_rgb = true;
            this.show_cw = true;
            this.show_ww = true;
            this.channelMap.r = this.pwmChannels[0];
            this.channeltag[this.pwmChannels[0]] = '-Red';
            this.channelMap.g = this.pwmChannels[1];
            this.channeltag[this.pwmChannels[1]] = '-Green';
            this.channelMap.b = this.pwmChannels[2];
            this.channeltag[this.pwmChannels[2]] = '-Blue';
            this.channelMap.cw = this.pwmChannels[3];
            this.channeltag[this.pwmChannels[3]] = '-Cool White';
            this.channelMap.ww = this.pwmChannels[4];
            this.channeltag[this.pwmChannels[4]] = '-Warm White';
            break;
        }

}
 
      },

      change(v,i,p){
        let rgb = this.hslToRgb(+this.hue/360, +this.saturation/100, +this.lightness/100);

        this.channels[this.channelMap.r] = ((rgb[0]/255)*100)>>0;
        this.channels[this.channelMap.g] = ((rgb[1]/255)*100)>>0;
        this.channels[this.channelMap.b] = ((rgb[2]/255)*100)>>0;
        this.channels[this.channelMap.ww] = this.ww;
        this.channels[this.channelMap.cw] = this.cw;
        this.setchannelsdeferred();

        this.backgroundstyle.backgroundImage= 
          'linear-gradient(to right,rgb('+this.lightness+'%,'+this.lightness+'%,'+this.lightness+'%),hsl('+this.hue+',100%,50%))'

/*
        if(document.getElementById('s')){
          if(v=='h'||v=='d'){
            var sl=document.getElementById('sl4').value;
            this.backgroundstyle.backgroundImage= 
              'linear-gradient(to right,rgb('+this.lightness+'%,'+this.lightness+'%,'+this.lightness+'%),hsl('+this.hue+',100%,50%))'
          }
        }
        console.log(v+i+'='+p);
        */
        //la('&'+v+i+'='+p);
      },

      hslToRgb(h, s, l){
        var r, g, b;

        if(s == 0){
            r = g = b = l; // achromatic
        }else{
          var hue2rgb = function hue2rgb(p, q, t){
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
          }

          var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
          var p = 2 * l - q;
          r = hue2rgb(p, q, h + 1/3);
          g = hue2rgb(p, q, h);
          b = hue2rgb(p, q, h - 1/3);
        }

        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
      },

      rgbToHsl(r, g, b){
        r /= 255, g /= 255, b /= 255;
        var max = Math.max(r, g, b), min = Math.min(r, g, b);
        var h, s, l = (max + min) / 2;

        if(max == min){
          h = s = 0; // achromatic
        }else{
          var d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch(max){
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
          }
          h /= 6;
        }

        return [h, s, l];
      }
    },
    mounted (){
        this.msg = 'fred';
        console.log('mounted controller');
        this.setupView();
    },
    destroyed(){
      clearInterval(this.interval);
    }

  }
//@ sourceURL=/vue/control.vue
</script>

<style scoped>
  .label {
    display:inline-block;
    width:9%;
  }
  .radiused {
    display:inline-block;
    border-radius:0.3em;
    padding:2px;
    margin:6px 2px;
    width:90%;
  }

  .set {
    background-color: green;
  }  
  .unset {
    background-color: white;
  }  

  .cw {
    background-image:linear-gradient(to right,#000,#fff);
  }
  .ww {
    background-image:linear-gradient(to right,#000,#ff7);
  }
  .hue {
    background-image:linear-gradient(to right,#800,#f00 5%,#ff0 20%,#0f0 35%,#0ff 50%,#00f 65%,#f0f 80%,#f00 95%,#800);
  }
  .lightness {
    background-image:linear-gradient(to right,#000,#fff);
  }
</style>
