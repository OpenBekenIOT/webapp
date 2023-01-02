<template>
    <div class="fullscreen">
    <!-- Tab links -->
    <div class="tab">
      <button :class="'tablinks '+Logsclass" @click="open($event, 'Logs')">Logs</button>
      <button :class="'tablinks '+Configclass" @click="open($event, 'Config')">Config</button>
      <button :class="'tablinks '+Statusclass" @click="open($event, 'Status')">Status</button>
      <button :class="'tablinks '+OTAclass" @click="open($event, 'OTA')">OTA</button>
      <button :class="'tablinks '+Flashclass" @click="open($event, 'Flash')">Flash</button>
      <button :class="'tablinks '+Filesystemclass" @click="open($event, 'Filesystem')">Filesystem</button>
      <button :class="'tablinks '+Aboutclass" @click="open($event, 'About')">About</button>
    </div>
    
    <!-- Tab content -->
    <div class="tabcontent" v-if="(tab === 'Logs')">
      <h3>Logs</h3>
      <logs-controller></logs-controller>
    </div>
    
    <div class="tabcontent" v-if="tab === 'Config'">
      <h3>Config</h3>
      <info-controller></info-controller>
    </div>
    
    <div class="tabcontent" v-if="tab === 'Status'">
      <h3>Status</h3>
      <control-controller></control-controller>
    </div>

    <div class="tabcontent" v-if="tab === 'About'">
      <h3>About</h3>
      <p><a v-bind:href="nativeurl" target="_blank">Native UI on this device {{nativeurl}}</a></p>
      <p>A simple web app to go with OpenBekenIOT equipped devices by <a href="https://github.com/btsimonh">btsimonh</a></p>
      <p>This app is a pure javascript application written in VueJS as an SFC .vue component, and dynamically loaded from the device via a simple webpage.  The intent here is to be able to provide a rich UI and allow the device UI to remain simple (and small).</p>
      <p>Currently, it supports displaying logging from the device</p>
    </div>

    <div class="tabcontent" v-if="tab === 'OTA'">
      <h3>OTA</h3>
      <ota-controller></ota-controller>
    </div>
    <div class="tabcontent" v-if="tab === 'Flash'">
      <h3>Flash</h3>
      <flash-controller></flash-controller>
    </div>
    <div class="tabcontent" v-if="tab === 'Filesystem'">
      <h3>Filesystem</h3>
      <filesystem-controller></filesystem-controller>
    </div>

    </div>
</template>

<script>
  module.exports = {
  components: {
    'ota-controller': window.getComponent('ota'),
    'filesystem-controller': window.getComponent('filesystem'),
    'info-controller': window.getComponent('info'),
    'flash-controller': window.getComponent('flash'),
    'control-controller': window.getComponent('control'),
    'logs-controller': window.getComponent('logs'),
  },
      
    data: ()=>{
      return {
        msg: 'world!',
        color: 'blue',
        logs: '',
        tab: 'Config',
        Logsclass:'',
        Aboutclass:'',
        Configclass:'active',
        Statusclass:'',
        OTAclass: '',
        Filesystemclass: '',
        Flashclass: '',

      }
    },
    methods:{
        open(evt, name) {
            console.log('select tab '+name);
            this.tab = name;
            this.Logsclass = '';
            this.Aboutclass = '';
            this.Configclass = '';
            this.Statusclass = '';
            this.OTAclass = '';
            this.Filesystemclass = '';
            this.Flashclass = '';

            this[name+'class'] = 'active';
        },       
        
    },
    mounted (){
        this.nativeurl = window.device+'/';
        this.msg = 'fred';
        console.log('mounted');
    }
  }
//@ sourceURL=/vue/myComponent.vue
</script>

<style scoped>
    .fullscreen{
        height:100vh;
    }

    .example {
        color: v-bind('color');
    }

    /* Style the tab */
    .tab {
      overflow: hidden;
      border: 2px solid #ccc;
      background-color: #f1f1f1;
      height: 50px;
      box-sizing: border-box;
    }
    
    /* Style the buttons that are used to open the tab content */
    .tab button {
      background-color: inherit;
      float: left;
      border: none;
      outline: none;
      cursor: pointer;
      padding: 14px 16px;
      transition: 0.3s;
      height: 100%;
      font-size: 1rem;
      border: 0;
    }
    
    /* Change background color of buttons on hover */
    .tab button:hover {
      background-color: #ddd;
    }
    
    /* Create an active/current tablink class */
    .tab button.active {
      background-color: #ccc;
    }
    
    /* Style the tab content */
    .tabcontent {
      padding: 12px;
      border-top: none;
      height: calc(100vh - 50px);
      box-sizing: border-box;
      background-color: #21333e;
      overflow: scroll;
    }
    input[type=range] {
        width:99%;
    }

    .tabcontent h3{
      height: 25px;
    }
   .tabcontent .container{
      height: calc(100% - 62px);
      width: 100%;
    }
</style>
