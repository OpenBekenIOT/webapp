var g_selectedPin;
const pins = [];
var ctx, canvas, image;
let boards = [];

 boards = [
    {
        name: "WemosD1-CB3S",
		chip: "BK7231N",
        image: "https://i.imgur.com/SCdHefw.png",
        leftPins: ["P23", "GND", "VUSB", "P20", "P21", "P22",
		"", "P23", "P22", "P23", "GND", "3.3V", "EN", "CEN", "GND", "Vin"],
        rightPins: ["P14", "P7", "P8", "P1", "P0", "3.3V", "GND", "P26",
		"", "P24", "P6", "P9", "P10", "P11", "GND", "3.3V"],
        leftStartX: 384,
        rightStartX: 150,
        leftStartY: 59,
        leftStepY: 20,
        rightStartY: 67,
        rightStepY: 20
    },
	{
        name: "CBU",
		chip: "BK7231N",
        image: "https://i.imgur.com/UpzQer7.png",
        leftPins: ["P14", "P16", "P20", "P22", "P23", "RX2", "TX2"],
        rightPins: ["P15", "P17", "P9", "CEN", "P28", "RX1", "TX1"],
        botPins: ["P8", "P7", "P6", "P26", "P24", "GND", "3.3V"],
        botStartX: 160,
        botStartY: 476,
        botStepX: 39,
        leftStartX: 30,
        leftStartY: 176,
        leftStepY: 25.5,
        rightStartX: 510,
        rightStartY: 180,
        rightStepY: 25.4
    },
    {
        name: "NodeMCU-CB3S",
		chip: "BK7231N",
        image: "https://i.imgur.com/l3osEzH.png",
        leftPins: ["P23", "GND", "VUSB", "P20", "P21", "P22", "P23", "P22", "P23", "GND", "3.3V", "EN", "CEN", "GND", "Vin"],
        rightPins: ["P14", "P7", "P8", "P1", "P0", "3.3V", "GND", "P26", "P24", "P6", "P9", "P10", "P11", "GND", "3.3V"],
        leftStartX: 50,
        rightStartX: 474,
        leftStartY: 122,
        leftStepY: 25.5,
        rightStartY: 107,
        rightStepY: 25.4
    },
    {
        name: "NodeMCU-WB3S",
		chip: "BK7231T",
        image: "https://i.imgur.com/l3osEzH.png",
        leftPins: ["P23", "GND", "VUSB", "P20", "P21", "P22", "P23", "P22", "P23", "GND", "3.3V", "EN", "CEN", "GND", "Vin"],
        rightPins: ["P14", "P8", "P9", "P1", "P0", "3.3V", "GND", "P26", "P24", "P6", "P7", "P10", "P11", "GND", "3.3V"],
        leftStartX: 50,
        rightStartX: 474,
        leftStartY: 122,
        leftStepY: 25.5,
        rightStartY: 107,
        rightStepY: 25.4
    }
];




let currentBoard;

function selectPinByName(name) {
    g_selectedPin = pins.find(pin => pin.name === name) || null;
}

function handleMouseEnter(event) {
    const firstToken = event.target.textContent.trim().split(' ')[0];
    selectPinByName(firstToken);
    drawPins();
}

function onBoardChange(event) {
    const boardName = event.target.value;
    var b = boards.find(board => board.name === boardName);
	setBoard(b);
}
function setBoard(board) {
	currentBoard = board;
    if (currentBoard) {
        pins.length = 0; // Clear existing pins
		createPins(currentBoard);
		image = new Image();
		image.src = currentBoard.image;

		image.onload = () => {
			if (boards.length > 0) {
				drawPins();
			}
		};
    }
}

function createDropdownInElement(id) {
    const dropdown = document.createElement("select");
    dropdown.id = "boardDropdown";
    dropdown.style.marginBottom = "10px";

    const label = document.createElement("label");
    label.htmlFor = "boardDropdown";
    label.textContent = "Select board: ";
    label.style.display = "block";
    label.style.marginBottom = "5px";

    boards.forEach(board => {
        const option = document.createElement("option");
        option.value = board.name;
        option.textContent = board.name;
        dropdown.appendChild(option);
    });

    dropdown.addEventListener("change", onBoardChange);

    const container = document.getElementById(id);
    container.insertBefore(label, container.firstChild);
    container.insertBefore(dropdown, label.nextSibling);
}

function createPins(board) {
    function createPin(name, x, y, width, height, angle) {
        const { name: pinName, backgroundColor, fontColor } = parsePinName(name);
        pins.push({
            name: pinName,
            x,
            y,
            width,
            height,
            backgroundColor,
            fontColor,
            angle
        });
    }

    function parsePinName(pinName) {
        const parts = pinName.split('#');
        const name = parts[0];
        const backgroundColor = parts[1] ? '#' + parts[1] : 'gray';
        const fontColor = parts[2] ? '#' + parts[2] : 'black';
        return { name, backgroundColor, fontColor };
    }

    for (let i = 0; i < board.leftPins.length; i++) {
        const x = board.leftStartX;
        const y = board.leftStartY + i * board.leftStepY;
        createPin(board.leftPins[i], x, y, 70, 20, 0);
    }

    for (let i = 0; i < board.rightPins.length; i++) {
        const x = board.rightStartX;
        const y = board.rightStartY + i * board.rightStepY;
        createPin(board.rightPins[i], x, y, 70, 20, 180);
    }
	if(board.botPins) { 
		for (let i = 0; i < board.botPins.length; i++) {
			const x = board.botStartX + i * board.botStepX;
			const y = board.botStartY;
			createPin(board.botPins[i], x, y, 70, 20, 270);
		}
	}
}

function drawPins(mouseX = null, mouseY = null) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
	if(image!=null){
		ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
	}

    pins.forEach(pin => {
		if(pin.name == "")
		{
			return;
		}
						let degrees = pin.angle;
				
    ctx.save(); 
	if(degrees == 270) 
	{
    const centerX = pin.x + pin.width / 2;
    const centerY = pin.y + pin.height / 2;

    ctx.translate(centerX, centerY);
    ctx.rotate((degrees * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);
	
		
	}
	
	
            if(pin.name == "GND") {
                pin.fontColor = "#FFFFFF";
                pin.backgroundColor = "#000000";
            } else if(pin.name == "3.3V") {
                pin.backgroundColor = "#FF0000";
                pin.fontColor = "#000000";
            }
			
        const isMouseOver = mouseX !== null &&
            mouseX >= pin.x - 5 &&
            mouseX <= pin.x - 5 + pin.width &&
            mouseY >= pin.y - 15 &&
            mouseY <= pin.y - 15 + pin.height;

        if (isMouseOver) selectPinByName(pin.name);

        if (g_selectedPin && g_selectedPin.name === pin.name) {
            ctx.strokeStyle = "red";
            ctx.lineWidth = 3;
            ctx.strokeRect(pin.x - 8, pin.y - 18, pin.width + 6, pin.height + 6);
        }

        var handleX;
		if(pin.angle == 0) {
			handleX = pin.x + pin.width;
		} else if(pin.angle == 270){
			handleX = pin.x + 22;
		} else {
			handleX = pin.x - 8;
		}
        ctx.fillStyle = pin.backgroundColor;
        ctx.fillRect(pin.x - 5, pin.y - 15, pin.width, pin.height);

        ctx.font = "16px Arial";
        ctx.fillStyle = pin.fontColor;
        ctx.fillText(pin.name, pin.x, pin.y);
				
    ctx.restore();
        drawHandle(handleX, pin.y - 7, pin.angle);
    });
}

function drawHandle(x, y, angle) {
    const len = 50;
    const tgX = x + len * Math.cos(angle * Math.PI / 180);
    const tgY = y + len * Math.sin(angle * Math.PI / 180);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(tgX, tgY);
    ctx.strokeStyle = "gray";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.closePath();

    ctx.beginPath();
    ctx.arc(tgX, tgY, 10, 0, 2 * Math.PI);
    ctx.fillStyle = "blue";
    ctx.fill();
    ctx.closePath();
}

function createCanvasInElement(id) {
    canvas = document.createElement("canvas");
    canvas.id = "pinCanvas";
    canvas.width = 600;
    canvas.height = 600;
    document.getElementById(id).appendChild(canvas);

    ctx = canvas.getContext("2d");


    canvas.addEventListener("mousemove", (event) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        drawPins(mouseX, mouseY);
    });

    createDropdownInElement(id);
	setBoard(boards[0]);
}

async function createBeforeMainInternal() {
    const newDiv = document.createElement("div");
    newDiv.style.float = "left";
    newDiv.style.position = "sticky";
    newDiv.style.top = "0";
    newDiv.id = "pinsDiv";

    const mainDiv = document.getElementById("main");
    if (mainDiv) mainDiv.parentNode.insertBefore(newDiv, mainDiv);

	document.querySelectorAll('.hdiv .disp-inline').forEach(span => {
	  span.addEventListener('mouseenter', handleMouseEnter);
	});
    createCanvasInElement("pinsDiv");
}

function createBeforeMain() {
    window.addEventListener('load', createBeforeMainInternal);
}

//createBeforeMain();
