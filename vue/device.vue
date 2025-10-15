<template>
  <div v-if="selectedDevice" style="width:300px;">
    <div>
      Chipset: {{ selectedDevice.chip}} {{ selectedDevice.board }}<br/>
      Model: {{ selectedDevice.model || "Unknown"}}<br/>
      <img v-if="selectedDevice.image" v-bind:src="selectedDevice.image" width="250" v-bind:alt="getDeviceDisplayName(selectedDevice)"/>
    </div>

    <ul>
      <li v-for="(pin,key) in selectedDevice.pins" :key="key">
        <span v-if="pin.split(';').length === 2">
          Pin {{key}}: {{ pin.split(';')[0] }} on channel {{ pin.split(';')[1] }} {{ pin.split(';')[2] }}
        </span>
        <span v-else>
          Pin {{key}}: {{ pin.split(';')[0] }} on channels {{ pin.split(';')[1] }}, {{ pin.split(';')[2] }}
        </span>
      </li>
    </ul>
    
    <div v-if="selectedDevice.flag !== undefined">
      Flag:&nbsp;<span>{{selectedDevice.flag}}
    </div>
    <div v-if="selectedDevice.command">
      Command:&nbsp;<span>{{selectedDevice.command}}
    </div>
    
    <span v-if="selectedDevice.wiki">
      <a v-bind:href="selectedDevice.wiki" target="_blank">Forum</a>&nbsp;
    </span>
    <span v-if="selectedDevice.product">
      <a v-bind:href="selectedDevice.product" target="_blank">Product</a>&nbsp;
    </span>

    <div v-if="selectedDevice.urls">
      Links: 
      <span v-for="(url,index) in selectedDevice.urls" :key="url">
        <span v-if="index > 0">, </span><a v-bind:href="url" target="_blank">{{index+1}}</a>
      </span>
      <br/>
    </div>
  </div>
</template>

<script>
  module.exports = {
    props: {
      selectedDevice: Object
    },
    methods:{
      getDeviceDisplayName(dev){
        //The first option is a placeholder with null value
        return dev ? dev.vendor + " " + dev.name : "";
      }
    }
}
//@ sourceURL=/vue/device.vue
</script>