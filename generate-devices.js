const fs = require("fs");
const path = require("path");

const outDir = path.join(__dirname, "gh-pages");

if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true });
}
fs.mkdirSync(outDir, { recursive: true });

function copyRecursive(src, dest) {
    if (!fs.existsSync(src)) return;
    const stats = fs.statSync(src);
    if (stats.isDirectory()) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest);
        fs.readdirSync(src).forEach(child => {
            if (child === "gh-pages") return; // skip gh-pages folder
            copyRecursive(path.join(src, child), path.join(dest, child));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}
copyRecursive(__dirname, outDir);

const devicesFile = path.join(__dirname, "devices.json");
if (!fs.existsSync(devicesFile)) {
    console.log("No devices.json found, skipping device pages");
    process.exit(0);
}
const data = JSON.parse(fs.readFileSync(devicesFile, "utf8"));


const devicesDir = path.join(outDir, "devices");
fs.mkdirSync(devicesDir, { recursive: true });

const { processJSON_OpenBekenTemplateStyle, pageNameForDevice, sanitizeFilename } = require(path.join(__dirname, "templateParser.js"));

function createDeviceHTML(device, safeName) {
    const detailed = !!device.bDetailed;
    const englishLink = device.wiki || "#";
    const polishLink = englishLink !== "#" ? englishLink.replace(".com", ".pl") : "https://www.elektroda.pl/rtvforum/";

    const parsed = processJSON_OpenBekenTemplateStyle(device);
    const pinsDesc = parsed.desc.replace(/\n/g, "<br>");
    const rawTemplate = JSON.stringify(device, null, 2);
	const showTuyaWarning = (device.keywords || []).some(k => /tuyamcu/i.test(k));
	const showAddressableLED = (device.keywords || []).some(k => /ws2812|sm16703/i.test(k));



    return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${device.name || safeName}</title>
<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css"><!-- Google -->
 <meta name="google-site-verification" content="7TndFADSStO2WmhEx0TgZ_o__nVvRwyk8IQeWlbK-4g" />
<style>
body { max-width: 1000px; margin: 2rem auto; }
img { max-width: 100%; border-radius: 8px; }
textarea { width: 100%; height: 250px; font-family: monospace; }
.copy-btn { margin-top: 0.5rem; }
</style>
</head>
<body>
<div class="container">
<h5>Firmware change information, guide, template, tutorial and help for...</h5>
<h1 class="my-3">${device.name || safeName} (${device.model || ""})</h1>

<div class="row">
  ${device.image ? `
  <div class="col-md-6 mb-3">
    <div class="card">
      <img class="card-img-top" src="${device.image}" alt="${device.name || safeName}">
    </div>
  </div>` : ""}

  <div class="col-md-6 mb-3">
    <div class="card">
      <div class="card-header">Information</div>
      <div class="card-body">
        <p><strong>Vendor:</strong> ${device.vendor || "N/A"}</p>
        <p><strong>Chip:</strong> ${device.chip || "N/A"}</p>
        <p><strong>Board:</strong> ${device.board || "N/A"}</p>
        <p><strong>Detailed:</strong> ${device.bDetailed || "N/A"}</p>
        <p><strong>Keywords:</strong> ${(device.keywords || []).join(", ")}</p>
      </div>
    </div>
  </div>

  <div class="col-md-6 mb-3">
    <div class="card">
      <div class="card-header">Device Template</div>
      <div class="card-body">
        <textarea readonly id="deviceTemplate">${rawTemplate}</textarea>
        <button class="btn btn-primary copy-btn" onclick="copyTemplate()">Copy Template</button>
        <button class="btn btn-primary copy-btn" onclick="showTemplateTutorial()">View Templates Tutorial</button>
      </div>
    </div>
  </div>

  <div class="col-md-6 mb-3">
    <div class="card">
      <div class="card-header">Pins</div>
      <div class="card-body">${pinsDesc || "No pin description available."}</div>
    </div>
  </div>

	${showTuyaWarning ? `
	<div class="col-12 mb-3">
	  <div class="card">
		<div class="card-body">
		  <p class="font-weight-bold" style="font-size: 1.5rem;">
			Warning! This device is using TuyaMCU. Please consult generic TuyaMCU guide: 
			<a href="https://www.elektroda.com/rtvforum/topic4038151.html" target="_blank">
			  TuyaMCU flashing, setup and configuration guide - configure dpIDs for Home Assistant
			</a>
		  </p>
		</div>
	  </div>
	</div>
	` : ""}


	${showAddressableLED ? `
	<div class="col-12 mb-3">
	  <div class="card">
		<div class="card-body">
		  <p class="font-weight-bold" style="font-size: 1.5rem;">
			Warning! This device is using per-pixel addressable LEDs. Please consult generic PixelAnim guide: 
			<a href="https://www.elektroda.com/rtvforum/topic4057187.html" target="_blank">
			  OpenBeken WS2812B animations - new HTTP panel integration, PixelAnim driver
			</a>
		  </p>
		</div>
	  </div>
	</div>
	` : ""}

  
  
  
  <div class="col-12 mb-3">
    <div class="card">
      <div class="card-body">
	  <p class="font-weight-bold" style="font-size: 1.5rem;">
          ${detailed 
            ? `Read detailed flashing guide and get help in device topic: <a href="${englishLink}" target="_blank">English guide</a>, <a href="${polishLink}" target="_blank">Polish guide</a>`
            : `Read more information and get help on forum: <a href="${englishLink}" target="_blank">English thread</a>, <a href="${polishLink}" target="_blank">Polish thread</a>`
          }
        </p>
        ${device.product ? `<p>You can also visit <a href="${device.product}" target="_blank">shop site</a>.</p>` : ""}
        <p>Return to <a href="../devicesList.html">devices list</a>.</p>
      </div>
    </div>
  </div>
  
</div>
</div>

<script>
function copyTemplate() {
    const txt = document.getElementById("deviceTemplate");
    txt.select();
    document.execCommand("copy");
    alert("Device template copied!");
}
function showTemplateTutorial() {
    window.open("https://www.youtube.com/watch?v=VDbaLR_0YWs","_blank");
}
</script>
</body>
</html>
`;
}




function processDevice(device, devicesDir) {
    const baseName = pageNameForDevice(device);
    const safeName = sanitizeFilename(baseName);
    const filePath = path.join(devicesDir, safeName + ".html");
    const html = createDeviceHTML(device, safeName);
    fs.writeFileSync(filePath, html, "utf8");
    return "devices/" + safeName + ".html";
}

const urls = [];
data.devices.forEach(device => urls.push(processDevice(device, devicesDir)));

urls.push("devicesList.html"); // add main devices list page

// Generate sitemap.xml
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>https://openbekeniot.github.io/webapp/${u}</loc></url>`).join("\n")}
</urlset>`;

fs.writeFileSync(path.join(outDir, "sitemap.xml"), sitemap, "utf8");

console.log("All device pages generated and sitemap.xml created in 'gh-pages/'");


