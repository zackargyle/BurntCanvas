define([], function() {
	var base_url = 'https://zackargyle.firebaseIO.com/Graffiti/';
	var uniqueID = 'xxZxAxCxKxx'.replace(/[x]/g, function(c) {
	    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
	    return v.toString(16);
	});
	var localId = 0;

	// Local Variables
	var TYPES = {PENCIL: 0, SPRAY: 1, TEXT: 2};
	var prevX, currX, prevY, currY;
	var paintColor = 'black', paintType;
	var sprayInterval, sprayImg, sprayAngle = 0, sprayRadius = 10;
	var textBox, textBoxActive;
	var canvas, ctx;
	var graffitiWall;
	var inDraw;
	var localDrawings  = [];
	var remoteDrawings = [];
	var sprayBatch     = [];
	var pencilBatch    = [];

	function BurntCanvas() {}

	BurntCanvas.prototype.lightMatch = function(url) {
		graffitiWall = new Firebase(base_url);
		graffitiWall.on('child_added', function(snap) {
			var val = snap.val();
			if (val.uniqueID !== uniqueID) {
				val.id = snap.name();
				remoteDrawings.push(val);
				paintFromObject(val);
			} else {
				localDrawings[localDrawings.length-1].id = snap.name();
			}
		});
		graffitiWall.on('child_removed', function(snap) {
			if (snap.val().uniqueID !== uniqueID) {
				for (var i = 0; i < remoteDrawings.length; i++) {
					if (remoteDrawings[i].id === snap.name()) {
						remoteDrawings.splice(i,1);
						drawAll();
						return;
					}
				}
			}
		});
		return this;
	};

	BurntCanvas.prototype.extinguish = function() {

	};

	function paintFromObject(obj) {
		if (obj.type === TYPES.SPRAY || obj.type === TYPES.PENCIL) {
			var method = (obj.type === TYPES.SPRAY) ? sprayRemote : drawRemote;
			var arr = obj.data.split('&');
			for (var i = 0, xy; i < arr.length; i++) {
				xy = method({
					color: obj.color,
					data: arr[i].split('_')
				}, xy);
			}
		}else if (obj.type === TYPES.TEXT) {
			writeRemoteText({
				color: obj.color,
				data: obj.data.split('_')
			});
		}
	}

	function setCanvas() {
		canvas = document.getElementById('BurntCanvas');
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
        ctx = canvas.getContext('2d');

        canvas.addEventListener('mousemove', function (e) {
            canvasEvent('move', e);
        }, false);
        canvas.addEventListener('mousedown', function (e) {
            canvasEvent('start', e);
        }, false);
        canvas.addEventListener('mouseup', function (e) {
            canvasEvent('stop', e);
        }, false);
	}
	setCanvas();

	function setImages() {
		wallImg = new Image();
		wallImg.src = 'img/wall.png';
		wallImg.onload = function() {
            ctx.drawImage(wallImg, 0, 0, canvas.width, canvas.height);
        };
        sprayImg = new Image();
        sprayImg.src = 'img/splatter.png';
    }
	setImages();

	function setChoices() {
		var container = document.createElement('div');

		setButtons(container);
		setTextBox();

		var colors = ['green', 'blue', 'red', 'black', 'white'];
		for (var i = 0; i < colors.length; i++) {
			createColorChoice(colors[i], container);
		}
		
		document.getElementById('canvasChoices').appendChild(container);
		setToSketch();
	}
	setChoices();

	function saveContext(text) {
		if (paintType === TYPES.PENCIL) {
			pencilBatch.push([currX,currY].join('_'));
		} else if (paintType === TYPES.SPRAY) {
			sprayBatch.push([currX,currY,sprayAngle].join('_'));
		} else if (paintType === TYPES.TEXT) {
			var data = {
				uniqueID: uniqueID,
				type: paintType,
				color: paintColor,
				data: [currX,currY,text].join('_')
			}
			localDrawings.push(data);
			graffitiWall.push(data);
		}
	}

	/*  ---- CANVAS PAINTING METHODS ---- */

    function draw() {
        ctx.beginPath();
        ctx.moveTo(prevX || currX, prevY || currX);
        ctx.lineTo(currX, currY);
        ctx.strokeStyle = paintColor;
        ctx.stroke();
        ctx.closePath();
        saveContext();
	}

	// x,y,prevX,prevY
    function drawRemote(data, oldXY) {
		var x = parseInt(data.data[0]);
		var y = parseInt(data.data[1]);
		var oldX = oldXY ? oldXY[0] : x;
		var oldY = oldXY ? oldXY[1] : y;

		ctx.beginPath();
		ctx.moveTo(oldX, oldY);
		ctx.lineTo(x, y);
		ctx.strokeStyle = data.color;
		ctx.stroke();
		ctx.closePath();
		return [x,y];
	}

	function spray() {
		sprayAngle += 41;
		if (sprayAngle > 360) sprayAngle -=360;
		ctx.save();
		ctx.translate(currX, currY);
		ctx.rotate(sprayAngle * Math.PI / 180);
		ctx.translate(-currX-sprayRadius, -currY-sprayRadius);
		ctx.drawImage(sprayImg, currX, currY, sprayRadius*2, sprayRadius*2);
		ctx.restore();
		saveContext();
	}

    function sprayRemote(data) {
        var x = parseInt(data.data[0]);
        var y = parseInt(data.data[1]);
        var angle = parseInt(data.data[2]);

		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(angle * Math.PI / 180);
		ctx.translate(-x-sprayRadius, -y-sprayRadius);
		ctx.drawImage(sprayImg, x, y, sprayRadius*2, sprayRadius*2);
		ctx.restore();
	}

	function writeText(text) {
		ctx.fillStyle = paintColor;
		ctx.font = '15px sans-serif';
		ctx.fillText(text, currX + 7, currY + 20);
		saveContext(text);
		textBoxActive = false;
	}
	
	function writeRemoteText(json) {
		var x = parseInt(json.data[0]);
		var y = parseInt(json.data[1]);
		var text = json.data[2];
		ctx.fillStyle = json.color;
		ctx.font = '15px sans-serif';
		ctx.fillText(text, x + 7, y + 20);
	}

	/* ---- CANVAS EVENT HANDLERS ---- */

	function finishDrawing() {
		inDraw = false;
		var data = {
			uniqueID: uniqueID,
			type: TYPES.PENCIL,
			color: paintColor,
			data: pencilBatch.join('&')
		};
		localDrawings.push(data);
		graffitiWall.push(data);
		pencilBatch = [];
	}

	function startSpraying(position) {
		sprayInterval = setInterval(spray, 50);
		if (textBoxActive) {
			textBox.parentNode.removeChild(textBox);
			textBoxActive = false;
		}
	}
  
	function finishSpraying(position) {
		clearInterval(sprayInterval);
		var data = {
			uniqueID: uniqueID,
			type: TYPES.SPRAY,
			color: paintColor,
			data: sprayBatch.join('&')
		};
		localDrawings.push(data);
		graffitiWall.push(data);
		sprayBatch = [];
	}

	function requestText() {
		if (!textBoxActive) {
			textBoxActive = true;
			textBox.style.left = currX + 'px';
			textBox.style.top  = currY + 'px';
			textBox.style.color = paintColor;
			document.body.appendChild(textBox);
		}
	}

	function moveText() {
		textBox.style.left = currX + 'px';
		textBox.style.top  = currY + 'px';
	}

	function setXY(e) {
        prevX = currX;
        prevY = currY;
        currX = e.clientX - canvas.offsetLeft;
        currY = e.clientY - canvas.offsetTop;
	}

	function canvasEvent(type, e) {
		if (type == 'stop') {
            if (paintType === TYPES.SPRAY) {
                finishSpraying();
            } else if (paintType === TYPES.PENCIL) {
                finishDrawing();
            }
        } else if (type == 'move') {
            if (inDraw) {
                setXY(e);
                if (paintType === TYPES.PENCIL) {
                    draw();
                } else if (paintType === TYPES.TEXT) {
                    moveText();
                }
            }
		} else if (type == 'start') {
            setXY(e);
            if (paintType === TYPES.SPRAY) {
                startSpraying();
            } else if (paintType === TYPES.TEXT) {
                requestText();
            } else if (paintType === TYPES.PENCIL) {
                if (textBoxActive) {
                    textBox.parentNode.removeChild(textBox);
					textBoxActive = false;
				}
				inDraw = true;
            }
        }
	}

    function undo() {
    	if (localDrawings.length > 0) {
			var toUndo = localDrawings.pop();
			drawAll();
			var ref = new Firebase(base_url + toUndo.id);
			ref.remove();
		} else {
			console.log("No more moves to undo");
		}
	}

	function drawAll() {
		canvas.width = canvas.width;
		ctx.drawImage(wallImg, 0, 0, canvas.width, canvas.height);
		for (var i = 0; i < localDrawings.length; i++) {
			paintFromObject(localDrawings[i]);
		}
		for (var i = 0; i < remoteDrawings.length; i++) {
			paintFromObject(remoteDrawings[i]);
		}
	}

    function highlight(type) {
		document.getElementById('spray').style.backgroundColor  = (type === TYPES.SPRAY)  ? 'hsl(0,0%,75%)' : 'white';
		document.getElementById('pencil').style.backgroundColor = (type === TYPES.PENCIL) ? 'hsl(0,0%,75%)' : 'white';
		document.getElementById('text').style.backgroundColor   = (type === TYPES.TEXT)   ? 'hsl(0,0%,75%)' : 'white';
    }

	function setToSpray() {
		paintType = TYPES.SPRAY;
		highlight(TYPES.SPRAY);
	}

	function setToSketch() {
		paintType = TYPES.PENCIL;
		highlight(TYPES.PENCIL);
	}

	function setToText() {
		paintType = TYPES.TEXT;
		highlight(TYPES.TEXT);
	}

	function setButtons(container) {
		var button_list = [
			{name: 'undo', fn: undo},
			{name: 'pencil', fn: setToSketch},
			{name: 'spray', fn: setToSpray},
			{name: 'text', fn: setToText}
		];

		for (var i = 0; i < button_list.length; i++) {
			var button = button_list[i];
			var node = document.createElement('div');
			node.style.backgroundImage = 'url(img/' + button.name + '.png)';
			node.className = 'choice choiceImg';
			node.id = button.name;
			node.addEventListener('click', button.fn);
			container.appendChild(node);
		}

	}

	function createColorChoice(color, container) {
		var node = document.createElement('div');
		node.className = 'choice';
		node.style.backgroundColor = color;
		node.addEventListener('click', function() {
			paintColor = color;
		});
		container.appendChild(node);
	}

	function setTextBox() {
		textBox = document.createElement('input');
		textBox.id = 'requestText';
		textBox.setAttribute('autofocus', true);
		textBox.addEventListener('mouseup', function() {
			inDraw = false;
		});
		textBox.addEventListener('keydown', function(e) {
			if (e.keyCode === 13) {
				writeText(textBox.value);
				textBox.value = '';
				textBox.parentNode.removeChild(textBox);
			}
		});
	}

	return new BurntCanvas().lightMatch();

});