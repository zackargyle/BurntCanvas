require(["BurntCanvas"], function(BurntCanvas) {
	console.log(
		"  _    _    _    _    _     _    _    _    _    _    _   "            + "\n" +
		" / \\  / \\  / \\  / \\  / \\   / \\  / \\  / \\  / \\  / \\  / \\  " + "\n" +
		"( B )( u )( r )( n )( t ) ( C )( a )( n )( v )( a )( s ) "            + "\n" +
		" \\_/  \\_/  \\_/  \\_/  \\_/   \\_/  \\_/  \\_/  \\_/  \\_/  \\_/  " + "\n"
	);

	var logoImg = new Image(500,180);
    logoImg.src = 'img/logo.png';
    logoImg.id  = 'logo';
    logoImg.onload = function() {
    	this.style.left = (window.innerWidth  - 500) / 2 + 'px';
    	this.style.top  = (window.innerHeight) / 4 + 'px';
    	document.body.appendChild(this);
    }
});