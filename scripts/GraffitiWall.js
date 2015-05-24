(function(global) {

    var SPRAY_INTERVAL = 50;

    var COLORS = {
        black: 'hsl(0,0%,0%)',
        blue:  'hsl(236,87%,42%)',
        green: 'hsl(107,45%,40%)',
        red:   'hsl(0,78%,48%)',
        white: 'hsl(0,3%,94%)'
    };

    var TYPES = {
        pencil: 0,
        spray: 1,
        text: 2
    };

    var GraffityWall = function(config) {
        this.init(config);
        this.initChoices();
        this.initTextBox();
        this.initCanvas(config);
        this.initImages(config.background);

        this.firebase = new Firebase(this.FIREBASE_URL);
        this.initRemoteAdded();
        this.initRemoteRemoved();
        this.ready = true;
        this.render();
    };

    GraffityWall.prototype.render = function() {
        this.canvas.width = this.canvas.width;
        this.localDrawings.forEach(this.paintFromObject.bind(this));
        this.remoteDrawings.forEach(this.paintFromObject.bind(this));
    };

    GraffityWall.prototype.save = function(data) {
        if (data) {
            var json = {
                uniqueID: this.UNIQUE_ID,
                type: this.type,
                color: this.color,
                data: data
            };
            this.localDrawings.push(json);
            this.firebase.push(json);
        }
    };

    GraffityWall.prototype.undo = function() {
        if (this.localDrawings.length > 0) {
            var drawing = this.localDrawings.pop();
            var ref = new Firebase(this.FIREBASE_URL + drawing.id);
            ref.remove();
            this.render();
        } else {
            console.log("No more moves to undo");
        }
    };

    GraffityWall.prototype.saveContext = function(text) {
        if (this.type === TYPES.pencil) {
            this.pencilBatch.push([this.curr.x, this.curr.y].join('_'));
        } else if (this.type === TYPES.spray) {
            this.sprayBatch.push([this.curr.x, this.curr.y, this.angle].join('_'));
        } else if (this.type === TYPES.text) {
            this.finishText(text);
        }
    };

    /*          INIT METHODS            */

    GraffityWall.prototype.init = function(config) {
        this.UNIQUE_ID = Utils.createUniqueId();
        this.FIREBASE_URL = config.firebase;

        this.remoteDrawings = [];
        this.localDrawings = [];
        this.pencilBatch = [];
        this.sprayImages = {};
        this.sprayBatch = [];

        this.prev = { x: null, y: null };
        this.curr = { x: null, y: null };

        this.type = TYPES.pencil;
        this.color = 'black';
        this.radius = 10;
        this.angle = 0;
        this.interval = null;

        this.inDraw = false;
        this.ready = false;
    };

    GraffityWall.prototype.initRemoteAdded = function() {
        this.firebase.on('child_added', function(snap) {
            var data = snap.val();
            if (data.uniqueID !== this.UNIQUE_ID) {
                data.id = snap.name();
                this.remoteDrawings.push(data);
                this.paintFromObject(data);
            } else {
                this.localDrawings[this.localDrawings.length-1].id = snap.name();
            }
        }.bind(this));
    };

    GraffityWall.prototype.initRemoteRemoved = function() {
        this.firebase.on('child_removed', function(snap) {
            if (snap.val().uniqueID !== this.UNIQUE_ID) {
                Utils.removeById(this.remoteDrawings, snap.name());
                this.render();
            }
        }.bind(this));
    };

    GraffityWall.prototype.initImages = function(backgroundSrc) {
        Object.keys(COLORS).forEach(function(color) {
            this.sprayImages[color] = new Image();
            this.sprayImages[color].src = 'img/spray_'+color+'.png';
        }.bind(this));
        this.sprayImage = this.sprayImages.black;
    };

    GraffityWall.prototype.initCanvas = function(config) {
        this.canvas = document.querySelector(config.canvas);
        this.canvas.width = config.width;
        this.canvas.height = config.height;
        this.ctx = this.canvas.getContext('2d');

        this.canvas.addEventListener('mousemove', function (e) {
            this.canvasEvent('move', e);
        }.bind(this), false);
        this.canvas.addEventListener('mousedown', function (e) {
            this.canvasEvent('start', e);
        }.bind(this), false);
        this.canvas.addEventListener('mouseup', function (e) {
            this.canvasEvent('stop', e);
        }.bind(this), false);
    };

    GraffityWall.prototype.initChoices = function() {
        // Type CHOICES
        var types = document.querySelectorAll('.choiceImg');
        [].forEach.call(types, function(choice) {
            if (choice.id === 'undo') {
                choice.addEventListener('click', this.undo.bind(this));
            } else {
                choice.addEventListener('click', this.select.bind(this, TYPES[choice.id]));
            }
        }.bind(this));

        // Color CHOICES
        var colors = document.querySelectorAll('.color');
        [].forEach.call(colors, function(choice) {
            choice.addEventListener('click', function(e) {
                this.color = e.target.getAttribute('data-color');
                this.sprayImage = this.sprayImages[this.color];
            }.bind(this));
        }.bind(this));
    };

    GraffityWall.prototype.initTextBox = function() {
        this.textBox = document.createElement('input');
        this.textBox.id = 'requestText';
        this.textBox.setAttribute('autofocus', true);
        this.textBox.addEventListener('mouseup', function() {
            this.inDraw = false;
        }.bind(this));
        this.textBox.addEventListener('keydown', function(e) {
            if (e.keyCode === 13) {
                this.writeLocalText(this.textBox.value);
                this.removeTextBox();
            }
        }.bind(this));
    };

    /*          EVENT HANDLERS          */

    GraffityWall.prototype.canvasEvent = function(type, e) {
        if (type == 'stop') {
            this.stop();
        } else if (type == 'move') {
            this.move(e);
        } else if (type == 'start') {
            this.start(e);
        }
    };

    GraffityWall.prototype.start = function(e) {
        this.inDraw = true;
        this.setXY(e);
        if (this.type === TYPES.spray) {
            this.startSpraying();
        } else if (this.type === TYPES.text) {
            this.addTextBox();
        } else if (this.type === TYPES.pencil) {
            this.removeTextBox();
        }
    };

    GraffityWall.prototype.stop = function() {
        if (this.type === TYPES.spray) {
            this.finishSpraying();
        } else if (this.type === TYPES.pencil) {
            this.finishDrawing();
        }
        this.inDraw = false;
    };

    GraffityWall.prototype.move = function(e) {
        if (this.inDraw) {
            this.setXY(e);
            if (this.type === TYPES.pencil) {
                this.drawLocal();
            } else if (this.type === TYPES.text) {
                this.moveTextBox();
            }
        }
    };

    GraffityWall.prototype.setXY = function(e) {
        this.prev.x = this.curr.x;
        this.prev.y = this.curr.y;
        this.curr.x = e.clientX - this.canvas.offsetLeft;
        this.curr.y = e.clientY - this.canvas.offsetTop;
    };

    /*          PAINT METHODS           */

    GraffityWall.prototype.draw = function(currX, currY, prevX, prevY, color) {
        this.ctx.beginPath();
        this.ctx.moveTo(prevX || currX, prevY || currX);
        this.ctx.lineTo(currX, currY);
        this.ctx.strokeStyle = COLORS[color];
        this.ctx.stroke();
        this.ctx.closePath();
    };

    GraffityWall.prototype.drawLocal = function() {
        this.draw(this.curr.x, this.curr.y, this.prev.x, this.prev.y, this.color);
        this.saveContext();
    }

    GraffityWall.prototype.drawRemote = function(data, prevXY) {
        var currX = parseInt(data.data[0]);
        var currY = parseInt(data.data[1]);
        var prevX = prevXY ? prevXY[0] : currX;
        var prevY = prevXY ? prevXY[1] : currY;

        this.draw(currX, currY, prevX, prevY, data.color);
        return [currX, currY];
    };

    GraffityWall.prototype.spray = function(x, y, angle, img) {
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(angle * Math.PI / 180);
        this.ctx.translate(-x-this.radius, -y-this.radius);
        this.ctx.drawImage(img, x, y, this.radius*2, this.radius*2);
        this.ctx.restore();
    }

    GraffityWall.prototype.sprayLocal = function() {
        this.angle += 41;
        if (this.angle > 360) this.angle -=360;
        this.spray(this.curr.x, this.curr.y, this.angle, this.sprayImage);
        this.saveContext();
    };

    GraffityWall.prototype.sprayRemote = function(data) {
        var x = parseInt(data.data[0]);
        var y = parseInt(data.data[1]);
        var angle = parseInt(data.data[2]);
        this.spray(x, y, angle, this.sprayImages[data.color]);
    };

    GraffityWall.prototype.writeText = function(text, x, y, color) {
        this.ctx.fillStyle = COLORS[color];
        this.ctx.font = '15px sans-serif';
        this.ctx.fillText(text, x + 7, y + 20);
    };

    GraffityWall.prototype.writeLocalText = function(text) {
        this.writeText(text, this.curr.x, this.curr.y, this.color);
        this.saveContext(text);
    };

    GraffityWall.prototype.writeRemoteText = function(data) {
        var x = parseInt(data.data[0]);
        var y = parseInt(data.data[1]);
        var text = data.data[2];
        this.writeText(text, x, y, COLORS[data.color]);
    };

    GraffityWall.prototype.paintFromObject = function(obj) {
        if (obj.type === TYPES.spray || obj.type === TYPES.pencil) {
            var method = (obj.type === TYPES.spray) ? this.sprayRemote : this.drawRemote;
            var prevXY;
            obj.data.split('&').forEach(function(data) {
                prevXY = method.call(this, {
                    color: obj.color,
                    data: data.split('_')
                }, prevXY);
            }.bind(this));
        } else if (obj.type === TYPES.text) {
            this.writeRemoteText({
                color: obj.color,
                data: obj.data.split('_')
            });
        }
    };

    GraffityWall.prototype.startSpraying = function() {
        this.interval = setInterval(this.sprayLocal.bind(this), SPRAY_INTERVAL);
        this.removeTextBox();
    };

    GraffityWall.prototype.finishSpraying = function() {
        clearInterval(this.interval);
        var data = this.sprayBatch.join('&');
        this.sprayBatch = [];
        this.save(data);
    };

    GraffityWall.prototype.finishDrawing = function() {
        var data = this.pencilBatch.join('&');
        this.pencilBatch = [];
        this.inDraw = false;
        this.save(data);
    };

    GraffityWall.prototype.finishText = function(text) {
        var data = [this.curr.x, this.curr.y, text].join('_');
        this.save(data)
    };

    /*          HELPER METHODS          */

    (function() {
        var text = document.getElementById('text');
        var spray = document.getElementById('spray');
        var pencil = document.getElementById('pencil');

        GraffityWall.prototype.select = function(type) {
            this.type = type;
            text.style.backgroundColor   = (type === TYPES.text)   ? 'hsl(0,0%,75%)' : 'white';
            spray.style.backgroundColor  = (type === TYPES.spray)  ? 'hsl(0,0%,75%)' : 'white';
            pencil.style.backgroundColor = (type === TYPES.pencil) ? 'hsl(0,0%,75%)' : 'white';
        };
    }());

    GraffityWall.prototype.addTextBox = function() {
        if (!this.textBoxActive) {
            this.textBoxActive = true;
            this.textBox.style.left = this.curr.x + 'px';
            this.textBox.style.top  = this.curr.y + 'px';
            this.textBox.style.color = COLORS[this.color];
            document.body.appendChild(this.textBox);
        }
    };

    GraffityWall.prototype.removeTextBox = function() {
        if (this.textBoxActive) {
            this.textBox.parentNode.removeChild(this.textBox);
            this.textBox.value = '';
            this.textBoxActive = false;
        }
    };

    GraffityWall.prototype.moveTextBox = function() {
        this.textBox.style.left = this.curr.x + 'px';
        this.textBox.style.top  = this.curr.y + 'px';
    };

    var Utils = {};

    Utils.createUniqueId = function() {
        return 'xxZxAxCxKxx'.replace(/[x]/g, function(c) {
            var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });
    };

    Utils.removeById = function(array, id) {
        for (var i = 0; i < array.length; i++) {
            if (array[i].id === id) {
                return array.splice(i, 1);
            }
        }
    };

    global.GraffityWall = GraffityWall;

}(window));