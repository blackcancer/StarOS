/*
	Product: StarOS GL utils
	Description: This script provide basic lib for StarOS WebGL / Canvas
	License: http://creativecommons.org/licenses/by/3.0/legalcode

	FileVersion: 0.1-rev00001					Date: 2014-04-07
	By Blackcancer

	website: http://initsysrev.net
	support: blackcancer@initsysrev.net
*/

(function(){
	window.StarOS = window.StarOS || {};

	//--------------------------------------------
	// WebGL Class
	//--------------------------------------------
	var WebGL = function(args){
		console.groupCollapsed("StarOS::WebGL()");

		args			= args			|| {};
		args.size		= args.size		|| {};
		args.view		= args.view 	|| {};
		args.cameraPos	= args.cameraPos|| {};

		//Merge parameters
		this.parent = args.parent || document.body;

		this.size			= {};
		this.size.width		= args.size.width	|| (this.parent != document.body)? this.parent.offsetWidth	: 1280;
		this.size.height	= args.size.height	|| (this.parent != document.body)? this.parent.offsetHeight : 720;

		this.view			= {};
		this.view.aspect	= args.view.aspect	|| this.size.width / this.size.height;
		this.view.fov		= args.view.fov		|| 45;
		this.view.near		= args.view.near	|| 0.1;
		this.view.far		= args.view.far		|| 4100000;

		this.cameraPos		= {};
		this.cameraPos.x	= args.cameraPos.x	|| 0;
		this.cameraPos.y	= args.cameraPos.y	|| 0;
		this.cameraPos.z	= args.cameraPos.z	|| 0;


		//Instantiate Three objects
		console.log("Instantiate Three.js objects...");
		this.keyboard	= new THREEx.KeyboardState();
		this.projector	= new THREE.Projector();
		this.scene		= new THREE.Scene();
		this.camera		= new THREE.PerspectiveCamera();

		try {

			this.renderer = new THREE.WebGLRenderer({
				antialias:	args.antialias	|| false,
				alpha:		args.alpha		|| false
			});
			this.context = 'WebGLRenderer';
			console.log("WebGLRenderer loaded.");

		}
		catch(cErr){
			console.warn("Can not load WebGLRenderer, trying with CanvasRenderer.");
			console.warn(cErr);
			try {
				this.renderer = new THREE.CanvasRenderer();
				console.log("CanvasRenderer loaded.");
				this.context = 'CanvasRenderer';
			}
			catch(cErr){
				console.err("Can not load Renderer.");
				throw "Can not load Renderer";
			}

		}

		//Add camera to scene
		this.scene.add(this.camera);

		//Setup camera
		console.log("Update camera view...");
		this.camera.fov		= this.view.fov;
		this.camera.aspect	= this.view.aspect;
		this.camera.near	= this.view.near;
		this.camera.far		= this.view.far;
		this.camera.position.set(2, 2, 2);
		this.camera.updateProjectionMatrix();
		
		//Add class to renderer DOM
		this.renderer.domElement.className = 'renderer';
		//Set size of  renderer DOM
		this.renderer.setSize(this.size.width, this.size.height);
		//Append renderer to html page (parent DOM)
		this.parent.appendChild(this.renderer.domElement);

		//Add orbite controle
		console.log("Add orbite controle...");
		this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
		this.controls.userPanSpeed = 0.3;

		this.animate(); //--> animate is a function that render and update WebGL each x sec
		console.log("Done.");
		console.groupEnd();
	};

	WebGL.prototype.animate = function(){
		requestAnimationFrame(WebGL.prototype.animate.bind(this)); //--> requestAnimationFrame() is a window function
		this.render();
		this.update();
	};

	WebGL.prototype.update = function(){
		this.controls.update();

		if (this.keyboard.pressed("space")){
			this.camera.position.set(this.cameraPos.x, this.cameraPos.y, this.cameraPos.z);
		}
	};

	WebGL.prototype.render = function(){
		this.renderer.render(this.scene, this.camera);
	};


	//--------------------------------------------
	// Exporting Class and Functions
	//--------------------------------------------
	StarOS.GL			= StarOS.GL			|| {};

	StarOS.GL.WebGL		= StarOS.GL.WebGL	|| WebGL;
})();