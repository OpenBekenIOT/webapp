
function findUserParamKey(js)
{
    if(js.user_param_key != undefined)
        return js.user_param_key;
    if(js.device_configuration != undefined)
        return js.device_configuration;
        
    return js;
}
function processJSON_UserParamKeyStyle(js,user_param_key) {
    console.log("Entering processJSON_UserParamKeyStyle");
    let tmpl = {
        vendor: "Tuya",
        bDetailed: "0",
        name: "TODO",
        model: "TODO",
        chip: "BK7231T",
        board: "TODO",
        keywords: [],
        pins:{},
        command: "",
        image: "https://obrazki.elektroda.pl/YOUR_IMAGE.jpg",
        wiki: "https://www.elektroda.com/rtvforum/topic_YOUR_TOPIC.html"
      };
      
      let desc = "";
      let scr = "";
      if(js.name!=undefined){
        tmpl.name = js.name;
        desc += "Device name seems to be " + js.name +"\n";
      }
      if(js.manufacturer!=undefined){
        tmpl.vendor = js.manufacturer;
        desc += "Device manufacturer seems to be " + js.manufacturer +"\n";
      }
    if(js.module != undefined)
    {
        tmpl.board = js.module;
        if(tmpl.board[0] == 'C') {
            tmpl.chip = "BK7231N";
        }
        if(tmpl.board[0] == 'T') {
			// T34
            tmpl.chip = "BK7231N";
        }
        if(tmpl.board[0] == 'W') {
            tmpl.chip = "BK7231T";
        }
        desc += "Device seems to be using " + tmpl.board + " module, which is " + tmpl.chip + " chip."+"\n";
    }
    
    let value;
    for(let i = 0; i < 10; i++) {
        let name = "rl"+i+"_pin";
        value = user_param_key[name];
        if(value != undefined) {
            desc += "- Relay (channel " +i + ") on P"+value+"\n";
            scr += "backlog setPinRole "+value+" Rel"+"; ";
            scr += "setPinChannel "+value+" "+i+"\n";
            tmpl.pins[""+value] = "Rel;"+i+"";
        }
    }
    for(let i = -1; i < 10; i++) {
        let name;
        name = "netled";
        if(i != -1) {
            name += i;
        } 
        name += "_pin";
        value = user_param_key[name];
        if(value != undefined) {
            desc += "- WiFi LED on P"+value+"\n";
            scr += "setPinRole "+value+" WifiLED_n"+"\n";
            tmpl.pins[""+value] = "WifiLED_n;0";
        }
    }
    for(let i = 0; i < 10; i++) {
        let name = "door"+i+"_magt_pin";
        value = user_param_key[name];
        if(value != undefined) {
            desc += "- Door Sensor (channel " +i + ") on P"+value+"\n";
            scr += "backlog setPinRole "+value+" dInput"+"; ";
            scr += "setPinChannel "+value+" "+i+"\n";
            tmpl.pins[""+value] = "dInput;"+i+"";
        }
    }
    for(let i = 0; i < 10; i++) {
        let name = "led"+i+"_pin";
        value = user_param_key[name];
        if(value != undefined) {
            desc += "- LED (channel " +i + ") on P"+value+"\n";
            scr += "backlog setPinRole "+value+" LED"+"; ";
            scr += "setPinChannel "+value+" "+i+"\n";
            tmpl.pins[""+value] = "LED;"+i+"";
        }
    }
    for(let i = 0; i < 10; i++) {
        let name = "bt"+i+"_pin";
        value = user_param_key[name];
        if(value != undefined) {
            desc += "- Button (channel " +i + ") on P"+value+"\n";
            scr += "backlog setPinRole "+value+" Btn"+"; ";
            scr += "setPinChannel "+value+" "+i+"\n";
            tmpl.pins[""+value] = "Btn;"+i+"";
        }
    }
    for(let i = 0; i < 10; i++) {
        let name = "onoff"+i+"";
        value = user_param_key[name];
        if(value != undefined) {
            desc += "- TglChannelToggle (channel " +i + ") on P"+value+"\n";
            scr += "backlog setPinRole "+value+" TglChanOnTgl"+"; ";
            scr += "setPinChannel "+value+" "+i+"\n";
            tmpl.pins[""+value] = "TglChanOnTgl;"+i+"";
        }
    }
    value = user_param_key.gate_sensor_pin_pin;
    if(value != undefined) {
        desc += "- Door/Gate Sensor on P"+value+"\n";
        scr += "setPinRole "+value+" dInput"+"\n";
        tmpl.pins[""+value] = "dInput;0";
    }
    value = user_param_key.ele_pin;
    if(value != undefined) {
        desc += "- BL0937 ELE on P"+value+"\n";
        scr += "setPinRole "+value+" BL0937CF"+"\n";
        tmpl.pins[""+value] = "BL0937CF;0";
    }
    value = user_param_key.vi_pin;
    if(value != undefined) {
        desc += "- BL0937 VI on P"+value+"\n";
        scr += "setPinRole "+value+" BL0937CF1"+"\n";
        tmpl.pins[""+value] = "BL0937CF1;0";
    }
    value = user_param_key.sel_pin_pin;
    if(value != undefined) {
        desc += "- BL0937 SEL on P"+value+"\n";
        scr += "setPinRole "+value+" BL0937SEL"+"\n";
        tmpl.pins[""+value] = "BL0937SEL;0";
    }
    value = user_param_key.wfst_pin;
    if(value != undefined) {
        desc += "- WiFi LED on P"+value+"\n";
        scr += "backlog setPinRole "+value+" WifiLED_n"+"; ";
        tmpl.pins[""+value] = "WifiLED_n;0";
    }
    value = user_param_key.infrr;
    if(value != undefined) {
        desc += "- IR Receiver on P"+value+"\n";
        scr += "backlog setPinRole "+value+" IRRecv"+"; ";
        tmpl.pins[""+value] = "IRRecv;0";
    }
    value = user_param_key.infre;
    if(value != undefined) {
        desc += "- IR Sender on P"+value+"\n";
        scr += "backlog setPinRole "+value+" IRSend"+"; ";
        tmpl.pins[""+value] = "IRSend;0";
    }
    value = user_param_key.remote_io;
    if(value != undefined) {
        desc += "- RF Pin on P"+value+"\n";
        scr += "backlog setPinRole "+value+" RCRecv"+"; ";
        tmpl.pins[""+value] = "RCRecv;0";
    }
    value = user_param_key.r_pin;
    if(value != undefined) {
        let ch = 1;
        desc += "- LED Red (Channel 1) on P"+value+"\n";
        scr += "backlog setPinRole "+value+" PWM"+"; ";
        scr += "setPinChannel "+value+" "+ch+"\n";
        tmpl.pins[""+value] = "PWM;"+ch;
    }
    value = user_param_key.g_pin;
    if(value != undefined) {
        let ch = 2;
        desc += "- LED Green (Channel 2) on P"+value+"\n";
        scr += "backlog setPinRole "+value+" PWM"+"; ";
        scr += "setPinChannel "+value+" "+ch+"\n";
        tmpl.pins[""+value] = "PWM;"+ch;
    }
    value = user_param_key.b_pin;
    if(value != undefined) {
        let ch = 3;
        desc += "- LED Blue (Channel 3) on P"+value+"\n";
        scr += "backlog setPinRole "+value+" PWM"+"; ";
        scr += "setPinChannel "+value+" "+ch+"\n";
        tmpl.pins[""+value] = "PWM;"+ch;
    }
    value = user_param_key.c_pin;
    if(value != undefined) {
        let ch = 4;
        desc += "- LED Cool (Channel 4) on P"+value+"\n";
        scr += "backlog setPinRole "+value+" PWM"+"; ";
        scr += "setPinChannel "+value+" "+ch+"\n";
        tmpl.pins[""+value] = "PWM;"+ch;
    }
    value = user_param_key.w_pin;
    if(value != undefined) {
        let ch = 5;
        desc += "- LED Warm (Channel 5) on P"+value+"\n";
        scr += "backlog setPinRole "+value+" PWM"+"; ";
        scr += "setPinChannel "+value+" "+ch+"\n";
        tmpl.pins[""+value] = "PWM;"+ch;
    }
    value = user_param_key.ctrl_pin;
    if(value != undefined) {
        desc += "- Control Pin (TODO) on P"+value+"\n";
        scr += "// TODO: ctrl on "+value+""+"\n";
    }
    value = user_param_key.total_bt_pin;
    if(value != undefined) {
        desc += "- Pair/Toggle All Pin on P"+value+"\n";
        scr += "setPinRole "+value+" Btn_Tgl_All"+"\n";
        tmpl.pins[""+value] = "Btn_Tgl_All;0";
    }
    value = user_param_key.reset_pin;
    if(value != undefined) {
        desc += "- Pair/Reset All Pin on P"+value+"\n";
        scr += "setPinRole "+value+" Btn"+"\n";
        tmpl.pins[""+value] = "Btn;0";
    }
    value = user_param_key.key_pin;
    if(value != undefined) {
        desc += "- Pair/Toggle All Pin on P"+value+"\n";
        scr += "setPinRole "+value+" Btn_Tgl_All"+"\n";
        tmpl.pins[""+value] = "Btn_Tgl_All;0";
    }
    value = user_param_key.mic;
    if(value != undefined) {
        desc += "- Microphone (ADC?) Pin on P"+value+"\n";
        scr += "setPinRole "+value+" ADC"+"\n";
        tmpl.pins[""+value] = "ADC;0";
    }
    value = user_param_key.firstpin_pin;
    if(value != undefined) {
		let ch = 1;
        desc += "- PWM (?) on P"+value+"\n";
        scr += "backlog setPinRole "+value+" PWM"+"; ";
        scr += "setPinChannel "+value+" "+ch+"\n";
        tmpl.pins[""+value] = "PWM;"+ch;
    }
    value = user_param_key.secpin_pin;
    if(value != undefined) {
		let ch = 2;
        desc += "- PWM (?) on P"+value+"\n";
        scr += "backlog setPinRole "+value+" PWM"+"; ";
        scr += "setPinChannel "+value+" "+ch+"\n";
        tmpl.pins[""+value] = "PWM;"+ch;
    }
    value = user_param_key.rl_on1_pin;
    if(value != undefined) {
		let ch = 1;
        desc += "- Bridge Relay On on P"+value+"\n";
        scr += "backlog setPinRole "+value+" BridgeFWD"+"; ";
        scr += "setPinChannel "+value+" "+ch+"\n";
        tmpl.pins[""+value] = "BridgeFWD;"+ch;
    }
    value = user_param_key.rl_off1_pin;
    if(value != undefined) {
		let ch = 1;
        desc += "- Bridge Relay Off on P"+value+"\n";
        scr += "backlog setPinRole "+value+" BridgeREV"+"; ";
        scr += "setPinChannel "+value+" "+ch+"\n";
        tmpl.pins[""+value] = "BridgeREV;"+ch;
    }
    // LED
    if(user_param_key.iicscl != undefined)
    {
        let map = ""+user_param_key.iicr + " "+user_param_key.iicg + " "+user_param_key.iicb + " "+user_param_key.iicc + " "+user_param_key.iicw;
        
        let iicscl = user_param_key.iicscl;
        let iicsda = user_param_key.iicsda;
        let ledType = "Unknown";
        // use current (color/cw) setting
        if(user_param_key.ehccur != undefined || user_param_key.wampere != undefined || user_param_key.iicccur != undefined) {
            ledType = "SM2135";
        } else if(user_param_key.dccur != undefined) {
            ledType = "BP5758D_";
        } else if(user_param_key.cjwcur != undefined) {
            ledType = "BP1658CJ_";
        } else if(user_param_key["2235ccur"] != undefined) {
            ledType = "SM2235";
        } else if(user_param_key["2335ccur"] != undefined) {
            // fallback
            ledType = "SM2235";
        } else {
        
        }
        scr += "startDriver "+ledType.replace("_","")+" // so we have led_map available\n";
        let dat_name = ledType+"DAT";
        let clk_name = ledType+"CLK";
        desc += "- "+dat_name+" on P"+iicsda+"\n";
        desc += "- "+clk_name+" on P"+iicscl+"\n";
        desc += "- LED remap is " + map + "\n";
        scr += "setPinRole "+iicsda+" "+dat_name+"\n";
        scr += "setPinRole "+iicscl+" "+clk_name+"\n";
        scr += "LED_Map "+map+" \n";
        tmpl.pins[""+iicsda] = ""+dat_name+";0";
        tmpl.pins[""+iicscl] = ""+clk_name+";0";
        
        
    }
    if(user_param_key["baud"] != undefined) {
        let baud = user_param_key["baud"];
        desc += "This device seems to be using UART at "+baud+", maybe it's TuyaMCU or BL0942?\n";
    }
    if(user_param_key["buzzer_io"] != undefined) {
        let buzzer_pin = user_param_key["buzzer_io"];
        desc += "There is a buzzer on P"+buzzer_pin+"\n";
    }
    if(user_param_key["buzzer_pwm"] != undefined) {
        let buzzer_f = user_param_key["buzzer_pwm"];
        desc += "Buzzer frequency is "+buzzer_f+"Hz\n";
    }
    let ele_rx = user_param_key.ele_rx;
    let ele_tx = user_param_key.ele_tx;
    if(user_param_key.ele_rx != undefined) {
        desc += "- BL0942 (?) RX on P"+ele_rx+"\n";
        desc += "- BL0942 (?) TX on P"+ele_tx+"\n";
        scr += "StartupCommand \"startDriver BL0942\""+"\n";
    }
  const res = {
    desc: desc,
    scr: scr,
    tmpl: tmpl
  };
  return res;
}
function processJSON_OpenBekenTemplateStyle(tmpl) {
    let pins = tmpl.pins;
    
    let desc = "";
    let scr = "";
    for (const pin in pins) {
        pinDesc = pins[pin];
        console.log(`Pin ${pin} is connected to ${pinDesc}.`);
        [roleName, channel, channel2] = pinDesc.split(';');
        // remap some old convention
        if(roleName == "Button") {roleName = "Btn"; }
        if(roleName == "Button_n") {roleName = "Btn_n"; }
        if(roleName == "Relay") {roleName = "Rel"; }
        if(roleName == "Relay_n") {roleName = "Rel_n"; }
        desc += "- P"+pin+" is " + roleName + " on channel " + channel +"\n";
        scr += "backlog setPinRole "+pin+" "+roleName+"; setPinChannel " + pin + " " +channel;
        // setPinChannel command can take now third argument, which is optional
        if(channel2 != undefined && channel2 != 0)
        {
            scr += " " +channel2+"";
        }
        scr += "\n";
      }
      if(tmpl.flags != undefined) {
        scr += "Flags "+tmpl.flags+"\n";
        desc += "- Flags are set to " + tmpl.flags +"\n";
      }
      if(tmpl.command != undefined) {
        if(tmpl.command.length > 0) {
            scr += "StartupCommand \""+tmpl.command+"\"\n";
            desc += "- StartupCommand is set to " + tmpl.command +"\n";
        }
      }
    const res = {
      desc: desc,
      scr: scr,
      tmpl: tmpl
    };
    return res;
}
function fetchJSONSync(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false); // false parameter makes the request synchronous
    xhr.send();
  
    if (xhr.status === 200) {
      return xhr.responseText;
    } else {
      throw new Error('Failed to fetch JSON: ' + xhr.status);
    }
  }
function processJSONInternal(txt) {
    let js = JSON.parse(txt);
    if(js.pins != undefined && js.chip != undefined && js.board != undefined) {
        return processJSON_OpenBekenTemplateStyle(js);
    }
    console.log(js);
    let user_param_key = findUserParamKey(js);
    console.log(user_param_key);
    return processJSON_UserParamKeyStyle(js,user_param_key);
}
function processJSON(txt) {
    if (txt.startsWith("http")) {
       txt = fetchJSONSync(txt);
    }
    return processJSONInternal(txt);
}
// Helper to make safe filenames
function sanitizeFilename(name) {
    if (!name) name = "unknown";
    name = name.replace(/[<>:"/\\|?* .,&#+-]/g, "_");
    name = name.replace(/_+/g, "_");
    name = name.replace(/^_+|_+$/g, "");
    return name || "unknown";
}




function pageNameForDevice(device) {
	let start = (device.vendor || "Unknown");
	let sub = (device.model || device.name || "NA");
    let baseName;
	if(sub.startsWith(start)) {
		baseName = sub;
	} else {
		baseName = start + "_" + sub;
	}
    return sanitizeFilename(baseName);
}


(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory(); // Node.js
    } else {
        root.MyModule = factory(); // Browser
    }
}(typeof self !== 'undefined' ? self : this, function () {

    return {
        processJSON_OpenBekenTemplateStyle,
        pageNameForDevice,
        sanitizeFilename
    };
}));
