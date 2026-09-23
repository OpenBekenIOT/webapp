<template>
    <div class="container">
        <textarea readonly ref="logs" style="overflow:scroll;" id="logs" class="logs">{{logs}}</textarea>

        <table class="logging-settings">
            <tr>
                <td style="width: 80px">
                    Logging:
                </td>
                <td>
                    <button class="logging" :class="{paused:paused}"  @click="paused = !paused">{{paused?"Resume":"Pause"}}</button>
                    <button class="feature" style="width: 100px" @click="clear">Clear History</button>
                    <button class="feature" style="width: 125px" @click="selectAllFeatures">Select All Features</button>
                    <button class="feature" style="width: 125px" @click="clearAllFeatures">Clear All Features</button>
                </td>
            </tr>
            <tr>
                <td style="width: 80px">
                    <label>Log Features:</label>
                </td>
                <td id="logFeaturesParent">
                    <div class="feature" v-for="(item) in sortedLogFeatureNames" :key="item">
                        <input class="checkbox" type="checkbox" :id="item.title" :name="item.title" v-model="logfeatures[item.index]" @click="setfeature(item.index, $event)">
                        <label :for="item.title">{{item.title}}</label>
                    </div>
                </td>
            </tr>
            <tr>
                <td style="width: 80px">
                    <label>Log Level:</label>
                </td>
                <td>
                    <select v-model="loglevel">
                        <option v-for="(item,index) of loglevelnames" :value="index" :key="index">{{item}}</option>
                    </select>
                     NOTE: If you are getting 'command unknown', remember that some commands are only added when a driver is started, and some drivers requires device reboot to start.
                </td>
            </tr>
            <tr>
                <td>
                    <label>Command:</label>
                </td>
                <td>
                    <form @submit="send($event)">
                        <input v-model="cmd" id="obkcommand" type="text" autocomplete="on" style="width:60%;">
                        <input type="submit">
                    </form>
                </td>
            </tr>
        </table>
    </div>
</template>

<script>
  module.exports = {
    data: ()=>{
      return {
        logs: '',
        cmd: '',
        paused:false,
        sortedLogFeatureNames:[],
            // "HTTP",//            = 0,
            // "MQTT",//            = 1,
            // "CFG",//             = 2,
            // "HTTP_CLIENT",//     = 3,
            // "OTA",//             = 4,
            // "PINS",//            = 5,
            // "MAIN",//            = 6,
            // "GEN", //              = 7
            // "API", // = 8
            // "LFS", // = 9
            // "CMD", // = 10
        
        logfeatures:[],
        loglevel:6,
        loglevelnames:[],
        initialised: false
      }
    },
    watch:{
        loglevel() {
            if (this.initialised) this.setlevel(this.loglevel);
        },
    },
    methods:{
        readlogconfig(){
            let url = window.device+'/api/logconfig';
            fetch(url)
            .then(response => response.json())
            .then(data => {
                console.log('logconfig',data);

                this.sortedLogFeatureNames = data.featurenames.map(function(x, index){
                    var title = x;
                    if (title.endsWith(":")){
                        title = title.substr(0, title.length-1);
                    }
                    return {title: title, index: index};
                }).sort((a,b) => a.title.localeCompare(b.title));

                this.loglevelnames = data.levelnames;
                for (let i = 0; i < 31; i++){
                    if ((data.features >> i) & 1){
                        this.logfeatures[i] = 1;
                    } else {
                        this.logfeatures[i] = 0;
                    }
                }
                this.loglevel = data.level;
                this.initialised = true;

            })
            .catch((e)=>{
                console.error(e);
            })
        },

        setlevel(n){
            let url = window.device+'/api/cmnd';
            let cmnd = 'loglevel '+n;
            fetch(url, {body:cmnd, method:'POST'})
            .then(response => response.text())
            .then(data => {
                console.log(data);
            })
            .catch((e)=>{
                console.error(e);
            })
        },

        setfeature(index, ev){
            let enable = ev.currentTarget.checked;
            let url = window.device+'/api/cmnd';
            let cmnd = 'logfeature '+index+' '+(enable?'1':'0');
            fetch(url, {body:cmnd, method:'POST'})
            .then(response => response.text())
            .then(data => {
                console.log(data);
            })
            .catch((e)=>{
                console.error(e);
            })
        },

        send(ev){
            ev.preventDefault();
            let url = window.device+'/api/cmnd';
            fetch(url, {body:this.cmd, method:'POST'})
            .then(response => response.text())
            .then(data => {
                this.cmd = '';
                console.log(data);
            })
            .catch((e)=>{
                this.cmd = '';
                console.error(e);
            })
        },

        clear(){
            this.logs = '';
        },
		toggleSet(elm, checked) {
		  if (checked != elm.checked) {
			elm.click();
		  }
		},
        setAllFeatures(state){
            console.log("Will set all feature checkboxes to " +state);
			let par = document.getElementById("logFeaturesParent");
			for(let child=par.firstChild; child!==null; child=child.nextSibling) {
				let cb = child.firstChild;
				this.toggleSet(cb,state);
			}
        },
        clearAllFeatures(){
            console.log("clearAllFeatures");
            this.setAllFeatures(false);
        },
        selectAllFeatures(){
            console.log("selectAllFeatures");
            this.setAllFeatures(true);
        },
        showlogs(){
            let url = window.device+'/lograw';
            if (!this.paused){
                fetch(url)
                .then(response => response.text())
                .then(data => {
                    data.replace(/\r/g, '');
                    this.logs += data;
                    let splt = this.logs.split('\n');
                    // remove empty
                    for (let i = splt.length-2; i >= 0; i--) {
                        if (!splt[i]){
                            splt.splice(i, 1);
                        }
                    }

                    while (splt.length > 400){
                        splt.shift();
                    }

                    if (this.$refs['logs']){
                        let scrollTop = this.$refs['logs'].scrollTop;
                        let scrollHeight = this.$refs['logs'].scrollHeight;
                        let clientHeight = this.$refs['logs'].clientHeight;
                        if (scrollTop + clientHeight >= scrollHeight - 10){
                            setTimeout(()=>{this.$refs['logs'].scrollTop = scrollHeight + 1000});
                        }
                    }
                    this.logs = splt.join('\n');
                    this.logtimer = setTimeout(()=>{this.showlogs();}, 500);
                }).catch(()=>{
                    this.logtimer = setTimeout(()=>{this.showlogs();}, 500);
                });
            } else {
                this.logtimer = setTimeout(()=>{this.showlogs();}, 500);
            }
        },
    },
    mounted (){
        console.log('mounted');
        this.readlogconfig();
        this.showlogs();
    },

    destroyed (){
        if (this.logtimer){
            clearTimeout(this.logtimer);
            this.logtimer = null;
        }
    }


  }
//@ sourceURL=/vue/logs.vue
</script>

<style scoped>
.container .logs{
    position: absolute;
    top: 0;
    right: 0;
    bottom: 150px;
    left: 0;
    margin: 0 10px;
    font-family: 'Courier New', Courier, monospace;
    resize: none;
	width: calc(100% - 20px);
	height: calc(100% - 160px);
}
.container .logging-settings{
    height: 150px;
    overflow: auto;
    position: absolute;
    bottom: 0;
}
.feature {
    margin-right:2em;
    display: inline-block;
}

.checkbox {
    vertical-align: bottom;
}

button.logging.paused{
   background-color: #c0c0c0;
}

button.feature, button.logging{
    width: 75px;
}
</style>
