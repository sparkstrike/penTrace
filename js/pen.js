var camera;
var light;
var paper;
var scene;
var penPath;
var paperCanvas;
var penGroup;
var controls = new function() {
		this.direction = 0;
		this.speed = 0.15;
		this.run = false;
	};


function init() {
	paperCanvas = new PaperCanvas(512, 512, 64, 64);
	
	penPath = new PathCans("path", 256, 256, 64, 64, 2, controls.speed);
	penPath.setRedrawCall(function(){
		penGroup.clearTrack()
		paperCanvas.clearPaper();
	});
	
	var stats = new Stats();
	stats.setMode(0); // 0: fps, 1: ms 
	stats.domElement.style.position = "absolute";
	stats.domElement.style.left = '0px';
	stats.domElement.style.top = '0px';
	document.getElementById("Stats-output").appendChild(stats.domElement);
	
	var gui = new dat.GUI();
	gui.add(controls, "direction", 0, 90).onChange(function(e){
		penGroup.setDefectEularY(e/180*Math.PI);
		penPath.inf.innerHTML = "("+penGroup.defectPos.x.toFixed(2)+" , "+penGroup.defectPos.z.toFixed(2)+")";
	});
	gui.add(controls, "speed", 0.01, 0.2).onChange(function(e){
		penPath.microStepLen = e;
	});
	gui.add(controls, "run");

	var renderer = new THREE.WebGLRenderer();
	renderer.setClearColorHex();
	renderer.setClearColor(new THREE.Color(0xEEEEEE));
	renderer.setSize(window.innerWidth, window.innerHeight);
	scene = new THREE.Scene();
	scene.position.set(-25, 0, -25);

	camera = new THREE.PerspectiveCamera(45, (window.innerWidth) / window.innerHeight, 0.1, 1500);
	camera.position.set(30, 30, 55);

	var axes = new THREE.AxisHelper(20);
	scene.add(axes);

	var paperGeometry = new THREE.PlaneGeometry(64, 64);
	var paperMaterial = new THREE.MeshBasicMaterial({map: paperCanvas.texture});
	paper = new THREE.Mesh(paperGeometry, paperMaterial);
	paper.rotation.x = -0.5 * Math.PI;
	paper.position.x = 32;
	paper.position.y = 0.5;
	paper.position.z = 32;
	paper.receiveShadow = true;
	scene.add(paper);
	
	penGroup = new PenGroup(2, paper.position.y);
	scene.add(penGroup.group);
	penPath.inf.innerHTML = "("+penGroup.defectPos.x.toFixed(2)+" , "+penGroup.defectPos.z.toFixed(2)+")";

	light = new THREE.SpotLight("#ffffff");
	light.position.set(400, 600, 800);
	light.castShadow = true;
	light.shadowCameraNear = 2;
	light.shadowCameraFar = 200;
	light.shadowCameraFov = 30;
	light.target = paper;
	light.distance = 0;
	light.angle = 0.4;
	scene.add(light);

	document.getElementById("WebGL-output").appendChild(renderer.domElement);
	var orbit = new THREE.OrbitControls(camera, renderer.domElement);
	orbit.userPanSpeed = 0.3;
	render();

	function render() {
		if (controls.run) {
			penGroup.move(penPath.calePath(), paperCanvas);
		};
		stats.update();
		orbit.update();
		requestAnimationFrame(render);
		renderer.render(scene, camera);
	}
}
window.onload = init;


/*
类说明：用于加载场景中的小球，笔尖，环形箭头
参数说明 r:小球半径， disH:纸张的高度，Y轴
公用对象
	this.group 其中包括笔珠、杂质、箭头灯模型
接口函数
function move(t,pCans);
	函数说明 将penGroup移动并旋转到指定位置，并绘制纸张贴图
	参数说明 t:包含当前笔珠坐标、欧拉角，pCans:纸张贴图管理类的实例
*/
function PenGroup(r, disH){
	var self = this;
	this.disH = disH;
	this.defectPos = new THREE.Vector3(0, 0, 2);
	this.defEul = new THREE.Euler(0, 0, 0, "XZY");
	this.ballR = r;
	this.group = new THREE.Object3D();
	this.group.position.x = 10;
	this.group.position.y = this.ballR;
	this.group.position.z = 0;
	this.group.castShadow = true;
	//ball
	var ballGeometry = new THREE.SphereGeometry(this.ballR, 30, 30);
	var ballMaterial = new THREE.MeshLambertMaterial({
		color: 0x505050
	});
	this.ball = new THREE.Mesh(ballGeometry, ballMaterial);
	this.ball.rotation.reorder("YZX");
	this.ball.castShadow = true;
	this.group.add(this.ball);
	//ballArrow
	this.ballAxis = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(1, 0, 0), 7, 0xff0000);
	this.ball.add(this.ballAxis);
	//path axis
	this.ballPathAxis = new THREE.AxisHelper(10);
	this.group.add(this.ballPathAxis);
	//pen stl
	new THREE.STLLoader().load("./src/pen.stl", function(geometry) {
		//console.log(geometry);
		var mat = new THREE.MeshPhongMaterial({
			color: 0xc0c0c0
		});
		mat.side = THREE.DoubleSide;
		//var ballMaterial = new THREE.MeshBasicMaterial({color: 0x7777ff, wireframe: true});
		self.pen = new THREE.Mesh(geometry, mat);
		self.pen.rotation.x = -Math.PI / 2;
		self.pen.rotation.z = -Math.PI / 2;
		self.pen.rotation.y = 0;
		//pen.position.y = -0.5;
		self.group.add(self.pen);
	});
	//arrow stl
	new THREE.STLLoader().load("./src/arrow.stl", function(geometry) {
		//console.log(geometry);
		var geometry = self.geometryBais(geometry, 5, 0, 0);
		var mat = new THREE.MeshPhongMaterial({
			color: 0xff0000
		});
		self.arrow = new THREE.Mesh(geometry, mat);
		self.ball.add(self.arrow);
	});
	
	this.move = function(t,pCans) {
		if (t == undefined)
			return;
		this.group.position.z = t.posZ;
		this.group.position.x = t.posX;
		this.ball.rotation.x = t.rotX;
		this.ball.rotation.y = t.rotY;
		this.ballPathAxis.rotation.y = t.rotY;
		this.ball.add(this.add());
		if(pCans != undefined)
			pCans.draw(t.rotY, t.posX, t.posZ);
		this.ball.children.forEach(function(e) {
			if (e.ballPos == undefined)
				return;
			var d = self.cale(e.ballPos);
			//console.log(d);
			if (d.y <= (self.disH)) {
				//console.log(d.y);
				self.ball.remove(e);
				//drawTrack(d.x, d.z);
				if(pCans != undefined)
					pCans.draw(t.rotY, t.posX, t.posZ, d.x, d.z);
				//drawPoint(d.x, d.z);
			}else if(d.y > self.ballR) {
				self.ball.remove(e);
			}
		});
	}
	this.geometryBais = function(g, x, y, z, a) {
		g.vertices.forEach(function(e) {
			if(a != undefined)
				e.applyEuler(a);
			e.x += x;
			e.y += y;
			e.z += z;
		});
		return g;
	}
	this.cale = function(z){
		var a = new THREE.Vector3().copy(z);
		var e = new THREE.Euler(this.ball.rotation.x, this.ball.rotation.y, 0, "YZX");
		a.applyEuler(e);
		a.x += this.group.position.x;
		a.y += this.group.position.y;
		a.z += this.group.position.z;
		return a;
	}

	this.add = function() {
		var pointGeometry = this.geometryBais(new THREE.PlaneGeometry(0.2, 0.2), this.defectPos.x, this.defectPos.y, this.defectPos.z, this.defEul);
		var pointMaterial = new THREE.MeshBasicMaterial({
			color: 0xffffff
		});
		var point = new THREE.Mesh(pointGeometry, pointMaterial);
		point.rotation.x = -this.ball.rotation.x;
		point.rotation.y = -this.ball.rotation.y;
		//console.log(ball.rotation);
		var a = new THREE.Vector3(this.defectPos.x, this.defectPos.y, this.defectPos.z);
		var e = new THREE.Euler(-this.ball.rotation.x, -this.ball.rotation.y, 0, "XZY");
		a.applyEuler(e);
		point.ballPos = new THREE.Vector3().copy(a);
		//console.log(point.ballPos);
		return point;
	}
	
	this.clearTrack = function(){
		this.ball.children.forEach(function(e){
			if (e.ballPos == undefined)
				return;
			else
				self.ball.remove(e);
		});
	}
	this.setDefectEularY = function(y){
		this.defEul.y = y;
		this.pen.rotation.z = -Math.PI/2 + y;
		this.defectPos.set(0,0,2);
		this.defectPos.applyEuler(this.defEul);
	}
}


/*
类说明：纸张贴图管理类，用于绘制纸张的贴图，贴图中展示了笔迹和杂质的痕迹，输入离散的小球位置和杂质位置
参数说明 w:纸张贴图canvas的宽 h:纸张贴图canvas的长，pW:场景中纸张的宽，pH:场景中纸张的长
接口函数
	function clearPaper() 清空纸张贴图并更新
	function draw(r1, x1, y1, x2, y2)
		函数说明 在纸张贴图中绘制笔迹和杂质的痕迹，只是一个离散的点，
		参数说明 r1:笔珠半径 x1 y1:笔珠坐标 x2 y2:笔珠上接近纸张的杂质的坐标
*/
function PaperCanvas(w,h,pW,pH){
	this.cansW = w;
	this.cansH = h;
	this.wSca = w/pW;
	this.hSca = h/pH;
	this.canvas = document.createElement('canvas');
	this.canvas.width = this.cansW;
	this.canvas.height = this.cansH;
	this.cans = this.canvas.getContext('2d');
	if (this.cans) {
		this.cans.fillStyle = 'white';
		this.cans.fillRect(0, 0, this.cansW, this.cansH);
	} else {
		alert('your brower can not run webgl');
	}
	this.texture = new THREE.Texture(this.canvas);
	this.texture.needsUpdate = true;
	this.clearPaper = function(){
		this.cans.fillStyle = 'white';
		this.cans.fillRect(0, 0, this.cansW, this.cansH);
		this.texture.needsUpdate = true;
	}
	this.draw = function(r1, x1, y1, x2, y2) {
		var r = 10;
		if(x2 == undefined){
			this.cans.beginPath();
			this.cans.arc(x1 * this.wSca, y1 * this.hSca, r, -r1, -r1 + Math.PI, false);
			//this.cans.closePath();
			this.cans.lineWidth = 2;
			this.cans.strokeStyle = 'black';
			this.cans.stroke();
		}else{
			var l = Math.sqrt((x2-x1)*(x2-x1) + (y2-y1)*(y2-y1));
			var x = x1 + (x2 - x1) / l * r/this.wSca
			var y = y1 + (y2 - y1) / l * r/this.hSca;
			this.cans.beginPath();
			this.cans.arc(x*this.wSca, y*this.hSca, 3, 0, Math.PI*2, true);
			this.cans.closePath();
			this.cans.fillStyle = 'white';
			this.cans.fill();
		};
		this.texture.needsUpdate = true;
	}
}


/*类说明：在画面左下角添加一个的手绘canvas，响应用户手绘，并且输出离散的手绘路径
参数说明：id:html中放置手绘canvas的div的ID，w:手绘canvas的宽，h:手绘canvas的长，pW:场景中纸张的宽，pH:场景中纸张的长，r:小球半径, misStep:手绘canvas中记录的每个点最后形成动画的步进，注意这里的步进长度是相对场景的
接口函数
	function setRedrawCall(f) 设置手绘区重新绘制时的回调函数
	function setFinishDrawCall(f) 设置收回去完成一次绘制时的回调函数
*/
function PathCans(id, w, h, pW, pH, r, micStep) {
	this.ballR = r;
	this.w = w;
	this.h = h;
	this.paWiSc = w / pW;
	this.paHeSc = h / pH;
	this.div = document.getElementById(id);
	this.mouseDownState = false;
	this.points = new Array(300);
	this.poP = 0;
	//滑动滤波窗口数组
	this.poBuf = new Array(20);
	this.poBufP = 0;
	this.pathLen = 0;
	this.pathP = 0;
	this.redrawCall = undefined;
	this.microStepLen = micStep;
	//  this.stepLen = {x:0,y:0};
	this.curStepAmount = 2;
	this.curStepIndex = 2;
	//creat p
	this.inf = document.createElement('p');
	this.inf.innerHTML = "hello";
	$(this.inf).css({
		position: "absolute",
		left: "0px",
		top: (window.innerHeight - h - 4 - 40) + "px"
	});
	this.div.appendChild(this.inf);
	//create canvas
	this.canvas = document.createElement('canvas');
	this.canvas.width = w;
	this.canvas.height = h;
	$(this.canvas).css({
		position: "absolute",
		left: "0px",
		top: (window.innerHeight - h - 4) + "px",
		border: "2px solid"
	});
	this.div.appendChild(this.canvas);
	this.cans = this.canvas.getContext('2d');

	this.cans.fillStyle = "white";
	this.cans.fillRect(0, 0, this.w, this.h);
	var self = this;
	$(this.canvas).mousedown(function(e) {
		if (self.redrawCall != undefined)
			self.redrawCall();
		self.mouseDownState = true;
		self.poP = 0;
		self.pathLen = 0;
		self.pathP = 0;
		self.curStepIndex = 2;
		self.curStepAmount = 2;
		//清空画布
		self.cans.fillStyle = "white";
		self.cans.fillRect(0, 0, self.w, self.h);
		
		for (var i = 0; i < self.poBuf.length; i += 1) {
			//self.poBuf[i] = {x:e.offsetX, y:e.offsetY};
			self.poBuf[i] = {x:e.offsetX, y: e.offsetY};
		};
	});

	$(this.canvas).mouseup(function(e) {
		self.mouseDownState = false;
		if (self.finishDrawCall != undefined)
			self.finishDrawCall();
	});
	$(this.canvas).mouseleave(function(e) {
		self.mouseDownState = false;
	});

	$(this.canvas).mousemove(function(e) {
		if (self.mouseDownState == false || self.poP >= (self.points.length - 1))
			return;
		var x = 0,y = 0;	
		self.poBuf[self.poBufP].x = e.offsetX;
		self.poBuf[self.poBufP].y = e.offsetY;
		for (var i = 0; i < self.poBuf.length; i += 1) {
			x += self.poBuf[i].x;
			y += self.poBuf[i].y;
		};

		x = x / self.poBuf.length;
		y = y / self.poBuf.length;
		self.poBufP += 1;
		if (self.poBufP >= self.poBuf.length)
			self.poBufP = 0;

		self.cans.beginPath();
		self.cans.arc(x, y, 4, 0, Math.PI * 2, true);
		self.cans.closePath();
		self.cans.fillStyle = 'black';
		self.cans.fill();
		self.points[self.poP] = {
			x: x / self.paWiSc,
			y: y / self.paHeSc
		};
		self.poP += 1;
	});
	this.setRedrawCall = function(f) {
		if (f instanceof Function) {
			this.redrawCall = f;
		}
	};
	this.setFinishDrawCall = function(f) {
		if (f instanceof Function) {
			this.finishDrawCall = f;
		}
	};
	this.calePath = function() {
		if (this.pathP >= (this.poP-1))
			return;
		var posZ, posX, rotY, rotX, posX2, posZ2, l;
		if (this.curStepIndex >= this.curStepAmount) {
			this.x = this.points[this.pathP].x;
			this.z = this.points[this.pathP].y;
			this.x2 = this.points[this.pathP + 1].x;
			this.z2 = this.points[this.pathP + 1].y;
			l = Math.sqrt((this.z - this.z2) * (this.z - this.z2) + (this.x - this.x2) * (this.x - this.x2));
			this.curStepAmount = Math.ceil(l / this.microStepLen);
			// console.log(this.curStepAmount);
			this.curStepIndex = 0;
			this.pathP += 1;
		}
		// console.log("("+this.x.toFixed(3)+","+this.z.toFixed(3)+")->("+this.x2.toFixed(3)+","+this.z2.toFixed(3)+")");
		posX = this.x + (this.x2 - this.x) / this.curStepAmount * this.curStepIndex;
		posZ = this.z + (this.z2 - this.z) / this.curStepAmount * this.curStepIndex;
		this.curStepIndex += 1;
		posX2 = this.x + (this.x2 - this.x) / this.curStepAmount * this.curStepIndex;
		posZ2 = this.z + (this.z2 - this.z) / this.curStepAmount * this.curStepIndex;
		l = Math.sqrt((posZ - posZ2) * (posZ - posZ2) + (posX - posX2) * (posX - posX2));
		this.pathLen += l;
		rotX = this.pathLen / this.ballR;
		if (posX2 >= posX) {
			rotY = Math.acos((posZ2 - posZ) / l);
		} else {
			rotY = Math.PI + Math.acos((posZ - posZ2) / l);
		};

		// console.log(this.curStepIndex+"/"+this.curStepAmount+" ("+posX.toFixed(3)+","+posZ.toFixed(3)+")");
		return {
			posZ: posZ,
			posX: posX,
			rotY: rotY,
			rotX: rotX
		};
	}
};
