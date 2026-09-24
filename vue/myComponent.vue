<template>
    <div class="fullscreen">
    <!-- Tab links -->
    <div class="tab">
      <button :class="'tablinks '+Logsclass" @click="open($event, 'Logs')">Logs</button>
      <button :class="'tablinks '+Configclass" @click="open($event, 'Config')">Config</button>
      <button :class="'tablinks '+Statusclass" @click="open($event, 'Status')">Status</button>
      <button :class="'tablinks '+OTAclass" @click="open($event, 'OTA')">OTA</button>
      <button :class="'tablinks '+Flashclass" @click="open($event, 'Flash')">Flash</button>
      <button :class="'tablinks '+Toolsclass" @click="open($event, 'Tools')">Tools</button>
      <button :class="'tablinks '+Importclass" @click="open($event, 'Import')">Import</button>
      <button :class="'tablinks '+Filesystemclass" @click="open($event, 'Filesystem')">Filesystem</button>
      <button :class="'tablinks '+GPIODoctorclass" @click="open($event, 'GPIODoctor')">GPIO Finder</button> 
      <button :class="'tablinks '+Aboutclass" @click="open($event, 'About')">About</button>
    </div>
    
    <!-- Tab content -->
    <div class="tabcontent" :style="(tab === 'Logs')?null:'display:none;'">
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
      <p><a v-bind:href="nativeurl" target="_blank">Open the native device UI ({{nativeurl}})</a></p>
      <p>A simple companion web app for OpenBekenIOT-equipped devices by <a href="https://github.com/btsimonh">btsimonh</a>.</p>
      <p>This is a lightweight JavaScript web app built with Vue.js as a single-file component (.vue) and loaded directly from the device. The intent is to provide a richer UI while keeping the device UI simple and small.</p>
    </div>

    <div class="tabcontent" v-if="tab === 'OTA'">
      <h3>OTA</h3>
      <ota-controller></ota-controller>
    </div>
    <div class="tabcontent" v-if="tab === 'Tools'">
      <h3>Tools</h3>
      <tools-controller></tools-controller>
    </div>
    <div class="tabcontent" v-if="tab === 'Flash'">
      <h3>Flash</h3>
      <flash-controller></flash-controller>
    </div>
    <div class="tabcontent" v-if="tab === 'Import'">
      <h3>Import</h3>
      <import-controller></import-controller>
    </div>
    <div class="tabcontent" v-if="tab === 'Filesystem'">
      <h3>Filesystem</h3>
      <filesystem-controller></filesystem-controller>
    </div>

    <div class="tabcontent" v-if="tab === 'GPIODoctor'">
      <h3>GPIO Doctor - easily find GPIO roles for your relays, PWMs, and buttons</h3>
      <p class="helperNote">For best results, update OpenBeken to the latest version. Otherwise, some values may not display correctly.</p>
      <gpio-controller></gpio-controller>
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
    'tools-controller': window.getComponent('tools'),
    'import-controller': window.getComponent('import'),
    'gpio-controller': window.getComponent('gpioDoctor'),
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
        Toolsclass: '',
        Importclass: '',
        GPIODoctorclass: '',

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
            this.Toolsclass = '';
            this.Filesystemclass = '';
            this.Flashclass = '';
            this.Importclass = '';
            this.GPIODoctorclass = '';

            this[name+'class'] = 'active';

           // console.log("GPIO controller is " + window.getComponent('gpioDoctor'));
        },       
        
    },
    mounted (){
        this.nativeurl = window.device+'/';
        this.msg = 'fred';
        console.log('mounted myComponent');
    }
  }
//@ sourceURL=/vue/myComponent.vue
</script>

<style scoped>
    .fullscreen{
        height:100%;
    }

    .example {
        color: v-bind('color');
    }

    .helperNote {
      margin: 6px 0 18px 0;
      font-size: 0.8em;
      color: #444;
    }

    /* Style the tab */
    .tab {
      overflow: hidden;
      border: 1px solid #ccc;
      background-color: #f1f1f1;
      height: 40px;
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
      padding: 0px 12px;
      border: 1px solid #ccc;
      border-top: none;
      overflow: auto;
      position: absolute;
      top: 40px;
      right: 0;
      bottom: 0;
      left: 0;
      box-sizing: border-box;
    }
    input[type=range] {
        width:99%;
    }

    .tabcontent h3{
      height: 25px;
    }
   .tabcontent .container{
      position:absolute;
      top: 65px;
      right: 0;
      bottom: 0;
      left: 0;
    }
</style>
