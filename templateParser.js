

const GLOBAL = (typeof globalThis !== 'undefined') ? globalThis
  : (typeof window !== 'undefined') ? window
  : (typeof global !== 'undefined') ? global : this;

if (!GLOBAL.TUYA_SPEC) {
  // Fail loudly — no fallback behavior
  console.error('templateParser: window.TUYA_SPEC not found. Make sure the async bootstrap preloaded spec/tuya-spec.json and injected templateParser.js.');
  throw new Error('templateParser: TUYA_SPEC not found. See console for details.');
}

// PUll runtime arrays from the spec
const PROCESSING_TABLE_RAW = GLOBAL.TUYA_SPEC.mappings || [];
const VALUE_MAPS = GLOBAL.TUYA_SPEC.valueMaps || {};



  // ---------------------------
  // Normalize table entries for runtime
  // ---------------------------
  function normalizeSearch(spec) {
    if (spec._searchType) return spec;
    if (spec.search instanceof RegExp) {
      spec._searchType = 'regex';
      spec._regex = spec.search;
      return spec;
    }
    if (typeof spec.search === 'string') {
      const s = spec.search;
      if (s.length >= 2 && s[0] === '/' && s[s.length - 1] === '/') {
        const body = s.slice(1, -1);
        spec._searchType = 'regex';
        spec._regex = new RegExp(body);
        return spec;
      }
      spec._searchType = 'key';
      spec._key = spec.search;
      return spec;
    }
    throw new Error('spec.search must be RegExp or string');
  }

//  const PROCESSING_TABLE = GENERATED_PROCESSING_TABLE_RAW.map(normalizeSearch);
  const PROCESSING_TABLE = PROCESSING_TABLE_RAW.map(normalizeSearch);

  // ---------------------------
  // Parser core 
  // ---------------------------
  function extractNumberFromMatch(match, spec) {
    if (!match) return null;
    if (spec && spec.groupName && match.groups && match.groups[spec.groupName] !== undefined) {
      const val = match.groups[spec.groupName];
      return val === '' ? null : Number(val);
    }
    const idx = (spec && typeof spec.group === 'number') ? spec.group : 1;
    const raw = match[idx];
    return (raw === '' || raw === undefined) ? null : Number(raw);
  }

  function makeSetPinLines(pinId, role, channel, nochan) {
    if (role === "VALUEONLY") return [];
    if (nochan) return [`setPinRole ${pinId} ${role}`];
    return [`backlog setPinRole ${pinId} ${role}; setPinChannel ${pinId} ${channel}`];
  }

  function handleI2cBlock(user_param_key, pinEntries, description, script, tmpl) {
    const iicscl = user_param_key.iicscl ?? user_param_key["iicscl"];
    const iicsda = user_param_key.iicsda ?? user_param_key["iicsda"];
    if (iicscl === undefined || iicsda === undefined) return;

    const iicr = user_param_key.iicr ?? user_param_key["iicr"] ?? "-1";
    const iicg = user_param_key.iicg ?? user_param_key["iicg"] ?? "-1";
    const iicb = user_param_key.iicb ?? user_param_key["iicb"] ?? "-1";
    const iicc = user_param_key.iicc ?? user_param_key["iicc"] ?? "-1";
    const iicw = user_param_key.iicw ?? user_param_key["iicw"] ?? "-1";

    let ledType = "Unknown";
    const iicccur = user_param_key.iicccur ?? "";
    const iicwcur = user_param_key.iicwcur ?? "";
    const campere = user_param_key.campere ?? "";
    const wampere = user_param_key.wampere ?? "";
    const ehccur = user_param_key.ehccur ?? "";
    const ehwcur = user_param_key.ehwcur ?? "";
    const drgbcur = user_param_key.drgbcur ?? "";
    const dwcur = user_param_key.dwcur ?? "";
    const dccur = user_param_key.dccur ?? "";
    const cjwcur = user_param_key.cjwcur ?? "";
    const cjccur = user_param_key.cjccur ?? "";
    const _2235ccur = user_param_key["2235ccur"] ?? "";
    const _2235wcur = user_param_key["2235wcur"] ?? "";
    const _2335ccur = user_param_key["2335ccur"] ?? "";
    const kp58wcur = user_param_key["kp58wcur"] ?? "";
    const kp58ccur = user_param_key["kp58ccur"] ?? "";

    if (ehccur.length > 0 || wampere.length > 0 || iicccur.length > 0) {
      ledType = "SM2135";
      let rgbcurrent = 1, cwcurrent = 1;
      try {
        rgbcurrent = ehccur.length > 0 ? Number(ehccur) : (iicccur.length > 0 ? Number(iicccur) : (campere.length > 0 ? Number(campere) : 1));
        cwcurrent = ehwcur.length > 0 ? Number(ehwcur) : (iicwcur.length > 0 ? Number(iicwcur) : (wampere.length > 0 ? Number(wampere) : 1));
        script.push(`SM2135_Current ${rgbcurrent} ${cwcurrent}`);
      } catch (ex) { /* ignore */ }
    } else if (dccur.length > 0) {
      ledType = "BP5758D_";
      try {
        const rgbcurrent = drgbcur.length > 0 ? Number(drgbcur) : 1;
        const wcurrent = dwcur.length > 0 ? Number(dwcur) : 1;
        const ccurrent = dccur.length > 0 ? Number(dccur) : 1;
        script.push(`BP5758D_Current ${rgbcurrent} ${Math.max(wcurrent, ccurrent)}`);
      } catch { }
    } else if (cjwcur.length > 0) {
      ledType = "BP1658CJ_";
      try {
        const rgbcurrent = cjccur.length > 0 ? Number(cjccur) : 1;
        const cwcurrent = cjwcur.length > 0 ? Number(cjwcur) : 1;
        script.push(`BP1658CJ_Current ${rgbcurrent} ${cwcurrent}`);
      } catch { }
    } else if (_2235ccur.length > 0) {
      ledType = "SM2235";
      try {
        const rgbcurrent = Number(_2235ccur || "1");
        const cwcurrent = Number(_2235wcur || "1");
        script.push(`SM2235_Current ${rgbcurrent} ${cwcurrent}`);
      } catch { }
    } else if (kp58wcur.length > 0) {
      ledType = "KP18058_";
      try {
        const rgbcurrent = Number(kp58wcur || "1");
        const cwcurrent = Number(kp58ccur || "1");
        script.push(`KP18058_Current ${rgbcurrent} ${cwcurrent}`);
      } catch { }
    }

    const dat_name = `${ledType}DAT`;
    const clk_name = `${ledType}CLK`;

    description.push(`- ${dat_name} on P${iicsda}`);
    description.push(`- ${clk_name} on P${iicscl}`);

    let map = `${iicr} ${iicg} ${iicb} ${iicc} ${iicw}`;
    try {
      map = `${Number(iicr)} ${Number(iicg)} ${Number(iicb)} ${Number(iicc)} ${Number(iicw)}`;
      script.push(`LED_Map ${map}`);
    } catch {
      script.push(`LED_Map ${map}`);
    }

    script.unshift(`startDriver ${ledType.replace("_", "")} // so we have led_map available`);
    script.push(`setPinRole ${iicsda} ${dat_name}`);
    script.push(`setPinRole ${iicscl} ${clk_name}`);

    pinEntries.push({
      key: "iicsda",
      value: iicsda,
      role: dat_name,
      number: 0,
      nochan: true,
      desc: `- ${dat_name} on P${iicsda}`,
      scriptLines: [`setPinRole ${iicsda} ${dat_name}`],
      pinId: String(iicsda)
    });
    pinEntries.push({
      key: "iicscl",
      value: iicscl,
      role: clk_name,
      number: 0,
      nochan: true,
      desc: `- ${clk_name} on P${iicscl}`,
      scriptLines: [`setPinRole ${iicscl} ${clk_name}`],
      pinId: String(iicscl)
    });

    tmpl.pins[String(iicsda)] = `${dat_name};0`;
    tmpl.pins[String(iicscl)] = `${clk_name};0`;
  }

  function processTableEntries(user_param_key, tmpl) {
    const pinEntries = [];
    const description = [];
    const script = [];
    const selLvIsZero = (user_param_key.sel_pin_lv !== undefined && Number(user_param_key.sel_pin_lv) === 0);

    for (const spec of PROCESSING_TABLE) {
      if (spec._searchType === 'key') {
        const k = spec._key;
        const val = user_param_key[k];
        if (val === undefined) continue;

        if (spec.special === "i2c") {
          description.push((spec.desc || "").replace("{value}", val));
          pinEntries.push({ key: k, value: val, role: spec.role, number: null, nochan: true, desc: (spec.desc || "").replace("{value}", val), scriptLines: [], pinId: String(val) });
          continue;
        }

        let effectiveRole = spec.role;
        let effectiveDescTemplate = spec.desc;

        if (spec.role === "BL0937SEL" && selLvIsZero) {
          effectiveRole = "BL0937SEL_n";
          if (effectiveDescTemplate) effectiveDescTemplate = effectiveDescTemplate.replace("SEL", "SEL_n");
        }

        const channel = (typeof spec.channel === 'number') ? spec.channel : (spec.nochan ? null : 0);
        const nochan = !!spec.nochan;
        const descLine = (effectiveDescTemplate || "").replace("{value}", val).replace("{number}", channel === null ? "" : String(channel));
        const scriptLines = (effectiveRole && effectiveRole != "VALUEONLY") ? makeSetPinLines(val, effectiveRole, channel || 0, nochan) : (k === "ctrl_pin" ? [`// TODO: ctrl on ${val}`] : []);
        const entry = { key: k, value: val, role: effectiveRole, number: channel, nochan, desc: descLine, scriptLines, pinId: (spec.role === "VALUEONLY" ? null : String(val)) };
        if (spec.role != "VALUEONLY") pinEntries.push(entry);
        description.push(descLine);
        script.push("// "+ descLine);
        scriptLines.forEach(l => script.push(l));
      } else if (spec._searchType === 'regex') {
        for (const k in user_param_key) {
          const m = k.match(spec._regex);
          if (!m) continue;
          const val = user_param_key[k];
          if (val === undefined) continue;
          const number = extractNumberFromMatch(m, spec);
          const nochan = !!spec.nochan || number === null;
          const descLine = (spec.desc || "").replace("{value}", val).replace("{number}", number === null ? "" : String(number));
          const channelForScript = number === null ? 0 : number;
          const scriptLines = (spec.role && spec.role != "VALUEONLY") ? makeSetPinLines(val, spec.role, channelForScript, nochan) : [];
          const pinEntry = { key: k, value: val, role: spec.role, number, nochan, desc: descLine, scriptLines, pinId: (spec.role === "VALUEONLY" ? "VALUEONLY" : String(val)) };
          if (spec.role != "VALUEONLY") pinEntries.push(pinEntry);
          description.push(descLine);
          script.push("// "+ descLine);
          scriptLines.forEach(l => script.push(l));
        }
      }
    }

    if ((user_param_key.iicscl !== undefined || user_param_key.iicsda !== undefined)) {
      handleI2cBlock(user_param_key, pinEntries, description, script, tmpl);
    } else if (user_param_key.i2c_scl_pin !== undefined || user_param_key.i2c_sda_pin !== undefined) {
      if (user_param_key.i2c_scl_pin !== undefined) user_param_key.iicscl = user_param_key.i2c_scl_pin;
      if (user_param_key.i2c_sda_pin !== undefined) user_param_key.iicsda = user_param_key.i2c_sda_pin;
      handleI2cBlock(user_param_key, pinEntries, description, script, tmpl);
    }

    // Append human-readable value mappings (VALUE_MAPS)
    for (const mapKey in VALUE_MAPS) {
      if (!Object.prototype.hasOwnProperty.call(user_param_key, mapKey)) continue;
      const raw = user_param_key[mapKey];
      const map = VALUE_MAPS[mapKey];
      const rawStr = String(raw);
      let human = map[rawStr];
      if (human === undefined) {
        const possible = Object.keys(map).map(v => `${v}=${map[v]}`).join(", ");
        human = `Unknown (${rawStr}). Known: ${possible}`;
      }
      description.push(`- ${mapKey} = ${rawStr} (${human})`);
    }

    return { pinEntries, description, script };
  }

  // OpenBeken compatibility handler
  function processJSON_OpenBekenTemplateStyle(tmpl) {
    const pinEntries = [];
    const description = [];
    const script = [];

    for (const pin in tmpl.pins) {
      const pinDesc = tmpl.pins[pin];
      const [roleNameRaw, channelRaw, channel2Raw] = pinDesc.split(';');
      let roleName = roleNameRaw;
      const channel = channelRaw !== undefined ? Number(channelRaw) : 0;
      const channel2 = channel2Raw !== undefined ? Number(channel2Raw) : 0;

      if (roleName === "Button") roleName = "Btn";
      if (roleName === "Button_n") roleName = "Btn_n";
      if (roleName === "Relay") roleName = "Rel";
      if (roleName === "Relay_n") roleName = "Rel_n";

      const descLine = `- P${pin} is ${roleName} on channel ${channel}`;
      description.push(descLine);

      let scriptLine = `backlog setPinRole ${pin} ${roleName}; setPinChannel ${pin} ${channel}`;
      if (channel2 !== 0 && !Number.isNaN(channel2)) scriptLine += ` ${channel2}`;
      script.push(scriptLine);

      pinEntries.push({
        key: `P${pin}`,
        value: pin,
        role: roleName,
        number: channel,
        extra: channel2,
        nochan: false,
        desc: descLine,
        scriptLines: [scriptLine],
        pinId: String(pin)
      });
    }

    if (tmpl.flags !== undefined) {
      script.push(`Flags ${tmpl.flags}`);
      description.push(`- Flags are set to ${tmpl.flags}`);
    }
    if (tmpl.command !== undefined && tmpl.command.length > 0) {
      script.push(`StartupCommand "${tmpl.command}"`);
      description.push(`- StartupCommand is set to ${tmpl.command}`);
    }

    return {
      tmpl,
      pins: pinEntries,
      description,
      script,
      desc: description.join("\n"),
      scr: script.join("\n")
    };
  }

  function findUserParamKey(js) {
    if (js.user_param_key !== undefined) return js.user_param_key;
    if (js.device_configuration !== undefined) return js.device_configuration;
    return js;
  }

  function processJSON_UserParamKeyStyle(js, user_param_key) {
    const tmpl = {
      vendor: "Tuya",
      bDetailed: "0",
      name: "TODO",
      model: "TODO",
      chip: "BK7231T",
      board: "TODO",
      keywords: [],
      pins: {},
      command: "",
      image: "https://obrazki.elektroda.pl/YOUR_IMAGE.jpg",
      wiki: "https://www.elektroda.com/rtvforum/topic_YOUR_TOPIC.html",
      flags: js.flags
    };

    const description = [];
    const script = [];

    if (js.name !== undefined) {
      tmpl.name = js.name;
      description.push("Device name seems to be " + js.name);
    }
    if (js.manufacturer !== undefined) {
      tmpl.vendor = js.manufacturer;
      description.push("Device manufacturer seems to be " + js.manufacturer);
    }
    if (js.module !== undefined) {
      tmpl.board = js.module;
      if (tmpl.board[0] === 'C' || tmpl.board[0] === 'T') tmpl.chip = "BK7231N";
      if (tmpl.board[0] === 'W') tmpl.chip = "BK7231T";
      description.push("Device seems to be using " + tmpl.board + " module, which is " + tmpl.chip + " chip.");
    }

    const { pinEntries, description: descFromTable, script: scriptFromTable } = processTableEntries(user_param_key, tmpl);

    descFromTable.forEach(d => description.push(d));
    scriptFromTable.forEach(s => script.push(s));

    if (user_param_key["baud"] !== undefined) {
      description.push(`This device seems to be using UART at ${user_param_key["baud"]}, maybe it's TuyaMCU or BL0942?`);
    }
    if (user_param_key["buzzer_io"] !== undefined) {
      description.push(`There is a buzzer on P${user_param_key["buzzer_io"]}`);
    }
    if (user_param_key["buzzer_pwm"] !== undefined) {
      description.push(`Buzzer frequency is ${user_param_key["buzzer_pwm"]}Hz`);
    }
    if (user_param_key.ele_rx !== undefined) {
      description.push(`- BL0942 (?) RX on P${user_param_key.ele_rx}`);
      description.push(`- BL0942 (?) TX on P${user_param_key.ele_tx}`);
      script.push(`StartupCommand "startDriver BL0942"`);
    }

    pinEntries.forEach(e => {
      tmpl.pins[e.pinId] = `${e.role || "Unknown"};${e.number === null ? 0 : e.number}`;
      console.log( `e=${e} -  e.pinId=${e.pinId} e.role=${e.role || "Unknown"}; e.number=${e.number === null ? 0 : e.number}`);
    });

    return {
      tmpl,
      pins: pinEntries,
      description,
      script,
      desc: description.join("\n"),
      scr: script.join("\n")
    };
  }

  function processJSONInternal(txtOrObj) {
    let js;
    if (typeof txtOrObj === 'string') js = JSON.parse(txtOrObj);
    else js = txtOrObj;

    if (js && js.pins !== undefined && js.chip !== undefined && js.board !== undefined) {
      return processJSON_OpenBekenTemplateStyle(js);
    }

    const user_param_key = findUserParamKey(js);
    return processJSON_UserParamKeyStyle(js, user_param_key);
  }

  function processJSON(txt) {
    if (typeof txt === "string" && txt.startsWith("http")) {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', txt, false);
      xhr.send();
      if (xhr.status === 200) txt = xhr.responseText;
      else throw new Error('Failed to fetch JSON: ' + xhr.status);
    }
    return processJSONInternal(txt);
  }

  function sanitizeFilename(name) {
    if (!name) name = "unknown";
    name = name.replace(/[<>:"/\\|?*\s.,&#+-]/g, "_");
    name = name.replace(/_+/g, "_");
    name = name.replace(/^_+|_+$/g, "");
    return name || "unknown";
  }

  function pageNameForDevice(device) {
    const start = (device.vendor || "Unknown");
    const sub = (device.model || device.name || "NA");
    const baseName = (sub.startsWith(start) ? sub : `${start}_${sub}`);
    return sanitizeFilename(baseName);
  }


