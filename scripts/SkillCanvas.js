define([], function() {

	var intervalID, skills = [], end;

	var canvas = document.getElementById("SkillCanvas");
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  var ctx = canvas.getContext("2d");

  var boundaries = {
  	top: 22,
  	left: 0,
  	bottom: canvas.height - 15,
  	right: canvas.width
  }

  setupSkills();

	var SkillCanvas = function() {};

	SkillCanvas.prototype.start = function() {
		if (!requestAnimationFrame) {
			if (mozRequestAnimationFrame) {
				requestAnimationFrame = mozRequestAnimationFrame;
			} else if (webkitRequestAnimationFrame) {
				requestAnimationFrame = webkitRequestAnimationFrame;
			} else {
				requestAnimationFrame = function(cb) {
					setTimeout(cb, 1000/60);
				}
			}
		}
		fly();
	};

	SkillCanvas.prototype.stop = function() {
		clearInterval(skillInterval);
	};

	function setupSkills() {
		var titles = ["AngularJS", "HTML5", "Git", "Firebase", "jQuery", "Karma", "Android", "Django", "REST", "AJAX", "Python", "jQueryUI", "NodeJS", "Java", "API", "Scrum", "MVC", "CSS3", "LESS.CSS", "Bootstrap"];
		for (var i = 0; i < titles.length; i++) {
			skills.push({
				color: "black",
				text: titles[i],
				x: Math.floor(Math.random() * canvas.width),
				y: Math.floor(Math.random() * canvas.height),
				v_dir: Math.floor(Math.random() * 2),
				h_dir: Math.floor(Math.random() * 2),
				width: titles[i].length * 19
			});
		}
	};


	var DIRECTIONS = {UP: 0, RIGHT: 1, DOWN: 2, LEFT: 3};
	function updateSkill(skill) {
		if (skill.v_dir === DIRECTIONS.UP) {
			if (skill.y <= boundaries.top) {
				skill.v_dir = DIRECTIONS.DOWN;
			} else {
				skill.y--;
			}
		} else {
			if (skill.y >= boundaries.bottom) {
				skill.v_dir = DIRECTIONS.UP;
			} else {
				skill.y++;
			}
		}

		if (skill.h_dir === DIRECTIONS.RIGHT) {
			if (skill.x >= boundaries.right - skill.width) {
				skill.h_dir = DIRECTIONS.LEFT;
			} else {
				skill.x++;
			}
		} else {
			if (skill.x <= boundaries.left) {
				skill.h_dir = DIRECTIONS.RIGHT;
			} else {
				skill.x--;
			}
		}
	}

	function fly() {
		canvas.width = canvas.width;
		for (var i = 0; i < skills.length; i++) {
			var skill = skills[i];
			ctx.font = '30px sans-serif';
			ctx.fillStyle = skill.color;
	  	ctx.fillText(skill.text, skill.x, skill.y);
	  	updateSkill(skill);
		};
		if (!end) {
			requestAnimationFrame(fly);
		}
	};

	return new SkillCanvas();
});
