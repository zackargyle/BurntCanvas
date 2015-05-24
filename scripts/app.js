
console.log(
	"  _    _    _    _    _    _    _    _"           + "\n" +
	" / \\  / \\  / \\  / \\  / \\  / \\  / \\  / \\ " + "\n" +
	"( G )( r )( a )( f )( f )( i )( t )( y )"         + "\n" +
	" \\_/  \\_/  \\_/  \\_/  \\_/  \\_/  \\_/  \\_/ " + "\n"
);

var App = {}

App.init = function() {
    this.loadLogo();
    this.initGraffiti();
};

App.loadLogo = function() {
    var logoImg = new Image(500,180);
    logoImg.src = 'img/logo.png';
    logoImg.id  = 'logo';
    logoImg.onload = function() {
        this.style.left = (window.innerWidth  - 500) / 2 + 'px';
        this.style.top  = (window.innerHeight) / 4 + 'px';
        document.body.appendChild(this);
    }
};

App.initGraffiti = function() {
    this.wall = new GraffityWall({
        canvas: '#graffiti',
        firebase: 'https://zackargyle.firebaseIO.com/Graffiti/',
        height: window.innerHeight,
        width: window.innerWidth,
    });
};

App.init();