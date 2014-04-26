/*
	Product: StarOS - BPViewer
	Description: This script provide a 3D render of starmade 
	blueprints
	License: http://creativecommons.org/licenses/by/3.0/legalcode

	FileVersion: 0.1-rev00001					Date: 2014-04-07
	By Blackcancer

	website: http://initsysrev.net
	support: blackcancer@initsysrev.net
*/

(function(){
	window.StarOS = window.StarOS || {};

	//GLOBAL CONSTANTES --------------------------
	const	_VERSION		= "0.1-rev00001",
			_TRANSLATION	= StarOS.translation.BPViewer,
			_SMTRANSLATION	= StarOS.translation.StarMade,
			_USESTORAGE		= (('localStorage'    in window) && window['localStorage'] !== null),
			_CONFIG = StarOS.config;

	var _BPVIEWER,
		_PROPERTYWIN;

	//GLOBAL COMPUTED VARIABLES ------------------
	//					All class variables start 
	//					with underscore
	var _toLoad			= 0,
		_loaded			= 0,

		_shipList		= [],

		_smd2			= [],
		_header			= {},
		_logic			= {},
		_meta			= {},

		_catalog		= {},
		_currentShip	= "",
		_wepCtr			= {},
		_wepBlocks		= [],
		_currentChunks	= [],
		_currentBlocks	= 0,
		_currentObj		= null,
		_embedURI		= "",
		_embedded		= false,

		_mouse		= {
			x: 0,
			y: 0
		},
		_intersected	= false,

		_socket = new StarOS.COM.Socket(_CONFIG.StarOS_serv.host, _CONFIG.StarOS_serv.port),
		_divSelect		= document.createElement('div'),
		_divRenderer	= document.createElement('div'),
		_iframe, _loadWindow, _debugWindow, _weaponsWindow, _webGL;

	//GLOBAL USER VARIABLES ----------------------
	//				All parameters are in CAPS for
	//				better readability
	var PARENT, DEBUG, WIDTH, HEIGHT, VIEW;


	var BPViewer = function(args){

		args			= args			|| {};
		args.view		= args.view 	|| {};

		_BPVIEWER = this;

		//Set global user variable
		PARENT		= document.getElementById(args.parentId)	|| document.body;
		DEBUG		= args.debug		|| false;
		WIDTH		= args.width		|| false;
		HEIGHT		= args.height		|| false;

		VIEW		= {
			aspect:	args.view.aspect	|| (WIDTH != false && HEIGHT != false)? WIDTH / HEIGHT : false,
			fov:	args.view.fov		|| 45,
			near:	args.view.near		|| 0.1,
			far:	args.view.far		|| 4100000
		};

		_BPVIEWER.init();
	};

	BPViewer.prototype.init = function(){

		_BPVIEWER.SocketOnResp();

		var url = window.location,
			args = {};
			search = url.search.replace('?', '').split('&');

		for(var i = 0; i < search.length; i++){
			var params = search[i].split('=');
			args[decodeURIComponent(params[0])] = decodeURIComponent(params[1]);
		}

		_divSelect.id = 'BPViewer_Left';
		_divRenderer.id = 'BPViewer_Right';

		if(args.name){
			var arrFrames = parent.document.getElementsByTagName("IFRAME");

			for (var i = 0; i < arrFrames.length; i++) {
				if (arrFrames[i].contentWindow === window){
					_iframe = arrFrames[i];
					PARENT.style.width = _iframe.width + 'px';
					PARENT.style.height = _iframe.height + 'px';
				};
			}

			if(!_iframe){
				PARENT.style.width = '1280px';
				PARENT.style.height = '768px';
			}

			DEBUG = false;
			_currentShip = args.name;
			_embedded = true;
		}

		if(!_embedded){
			PARENT.appendChild(_divSelect);
			//get list of blueprints
			_BPVIEWER.GUI_ShipSelect();
			_BPVIEWER.GUI_Tooltips();
			_BPVIEWER.Get_Catalog();
			_BPVIEWER.Get_BpFolders();
			_divRenderer.style.width = PARENT.offsetWidth - _divSelect.offsetWidth + 'px';
		}

		PARENT.appendChild(_divRenderer);
		DEBUG ? _BPVIEWER.GUI_Debug() : null;
		//initialize GUI
		_BPVIEWER.GUI_Loading();
		_BPVIEWER.GUI_Buttons();
		_BPVIEWER.GUI_Renderer();
		_BPVIEWER.GUI_ShipInfoBox();
		_BPVIEWER.GUI_LinkBox();
		_BPVIEWER.GUI_WeaponWin();

		if(_embedded){
			_webGL.renderer.domElement.className = 'EmbedRenderer';
			_BPVIEWER.Get_ShipData();
			_BPVIEWER.GL_InitSkyBox();
		}

		//initialize events
		_BPVIEWER.SetupEvent();

		//initialize 3D scene
		if(StarOS.config.video.useNormal){
			_BPVIEWER.GL_InitLights();
		}

	};

	//GUI functions
	BPViewer.prototype.GUI_Buttons		= function(){
		dom = {
			div:			document.createElement('div'),
			informations:	document.createElement('input'),
			weapons:		document.createElement('input'),
			'?':			document.createElement('input')
		};

		dom.div.id			= 'Button_Box';
		dom.div.className	= 'absolute';

		dom.informations.id		= 'Info_btn';
		dom.informations.name	= dom.informations.value = "Informations";

		dom.weapons.id		= 'Weapons_btn';
		dom.weapons.name	= dom.weapons.value = "Weapons";

		dom['?'].id		= 'Link_btn';
		dom['?'].name	= dom['?'].value = " ";

		dom.informations.className	= dom.weapons.className	= dom['?'].className	= 'GUI_button';
		dom.informations.type		= dom.weapons.type		= dom['?'].type			= 'submit';

		dom.div.appendChild(dom.informations);
		dom.div.appendChild(dom.weapons);
		dom.div.appendChild(dom['?']);

		dom.informations.addEventListener(	'click', onInfoClick);
		dom.weapons.addEventListener(		'click', onWeaponsClick);
		dom['?'].addEventListener(			'click', onLinkClick);

		_divRenderer.appendChild(dom.div);

		if(!_embedded){
			dom.div.style.left = document.getElementById('BPViewer_SelShip').offsetWidth + 'px';
		}
		else {
			var space = PARENT.offsetWidth - (dom.informations.offsetWidth + dom.weapons.offsetWidth + dom['?'].offsetWidth + 5);
			dom.div.style.marginLeft = "0px";
			dom.div.style.width = "100%";
			dom.informations.style.left = space / 2 + "px";
			dom.weapons.style.left = space / 2 + dom.informations.offsetWidth + 5 + "px";
			dom['?'].style.right = "0px";
		}

		function onInfoClick(event){
			event.preventDefault();

			if(_currentShip){
				var infoBox = document.getElementById('Info_box');

				if(infoBox.style.display == "none"){
					infoBox.style.display = "block";
				}
				else {
					infoBox.style.display = "none";
				}
			}
		};

		function onWeaponsClick(event){
			event.preventDefault();

			if(_weaponsWindow && _currentShip){
				_weaponsWindow.toggle();
			}
		};

		function onLinkClick(event){
			event.preventDefault();

			if(_currentShip){
				var linkBox = document.getElementById('Link_box');

				if(linkBox.style.display == "none"){
					linkBox.style.display = "block";
				}
				else {
					linkBox.style.display = "none";
				}
			}
		};
	};

	BPViewer.prototype.GUI_Debug		= function(){

		_debugWindow = new StarOS.WIN.Window({
			parent: _divRenderer,
			name: "BPViewer_debug",
			fixed: true,
			size: {
				width:	'300px',
				height:	'100px'
			},
			pos: {
				x:	'0px',
				y:	_divRenderer.offsetHeight - 100 + 'px'
			}
		});

		_BPVIEWER.debugDom = {
			stats: new Stats(),
			labels:	{
				mouseX:		document.createElement('label'),
				mouseY:		document.createElement('label'),
				currShip:	document.createElement('label'),
				shipFiles:	document.createElement('label'),
				blocks:	document.createElement('label')
			}
		}

		_BPVIEWER.debugDom.stats.domElement.className = 'Debug_stats';
		_BPVIEWER.debugDom.stats.domElement.className += ' absolute';

		_debugWindow.dom.content.appendChild(_BPVIEWER.debugDom.stats.domElement);

		for(var node in _BPVIEWER.debugDom.labels){
			_BPVIEWER.debugDom.labels[node].className = 'Debug_' + node;
			_BPVIEWER.debugDom.labels[node].className += ' absolute';

			_debugWindow.dom.content.appendChild(_BPVIEWER.debugDom.labels[node]);
		}

		_BPVIEWER.UpdateDebug();

	};

	BPViewer.prototype.GUI_LinkBox		=function(){
		var dom = {
			div:		document.createElement('div'),
			embed:		document.createElement('label'),
			embedField:	document.createElement('textarea'),
			download:	document.createElement('input')
		};

		dom.div.id				= 'Link_box';
		dom.div.className		= 'absolute';
		dom.div.style.display	= 'none';

		dom.embed.innerHTML	= (_TRANSLATION.linkBox.embed).capitalize() + ":";

		dom.download.type		= 'submit';
		dom.download.id			= 'Link_download';
		dom.download.className	= 'GUI_button';
		dom.download.name		= dom.download.value = (_TRANSLATION.linkBox.download).capitalize();

		dom.download.addEventListener('click', onClick, false);

		dom.div.appendChild(dom.embed);
		dom.div.appendChild(dom.embedField);
		dom.div.appendChild(dom.download);

		// dom.embedField.type			= 'text';
		dom.embedField.id			= 'Link_embedField';
		dom.embedField.className	= 'GUI_textField';

		_divRenderer.appendChild(dom.div);

		function onClick(event){
			event.preventDefault();

			if(_currentShip){
				var args = {
					path: _CONFIG.path.starmade + 'blueprints/exported/' + _currentShip + ".sment",
					format: "source"
				}

				_socket.callAPI('getDownload', 'vfs', 'fread', args);

				dom.download.download = _currentShip + ".sment";
			}
		};
	};

	BPViewer.prototype.GUI_Loading		= function(){
	};

	BPViewer.prototype.GUI_Renderer		= function(){

		_webGL = new StarOS.GL.WebGL({
			parent:		_divRenderer,
			size:		{
				width: '100%',
				height: '100%'
			},
			view:		VIEW,
			antialias:	_CONFIG.video.antialias,
			alpha:		true,
			cameraPos:	{
				x: 20,
				y: 20,
				z: 20
			}
		});

		if (_webGL.context == 'WebGLRenderer'){
			_webGL.renderer.autoUpdateObjects = false;
			_webGL.renderer.autoScaleCubemaps = false;
			_webGL.renderer.autoClear = false;
			_webGL.renderer.autoClearColor = false;
			_webGL.renderer.setClearColor( 0x000000, 0 );
		}

	};

	BPViewer.prototype.GUI_ShipInfoBox	= function(){
		var dom = {
			div:	document.createElement('div'),
			dlDim:	document.createElement('dl'),
			dlExt:	document.createElement('dl'),
			dtDim:	{
				mass:	document.createElement('dt'),
				length:	document.createElement('dt'),
				height:	document.createElement('dt'),
				width:	document.createElement('dt')
			},
			ddDim:	{
				mass:	document.createElement('dd'),
				length:	document.createElement('dd'),
				height:	document.createElement('dd'),
				width:	document.createElement('dd')
			},
			dtExt:	{
				power:	document.createElement('dt'),
				shield:	document.createElement('dt')
			},
			ddExt:	{
				power:	document.createElement('dd'),
				shield:	document.createElement('dd')
			}
		};

		dom.div.id				= 'Info_box';
		dom.div.className		= 'absolute';
		dom.div.style.display	= 'none';

		dom.dlDim.id			= 'Info_dlDim';
		dom.dlExt.id			= 'Info_dlExt';

		for(var dt in dom.dtDim){
			dom.dtDim[dt].innerHTML = (_SMTRANSLATION[dt]).capitalize() + ":";
			dom.ddDim[dt].id = 'Info_' + dt;

			dom.dlDim.appendChild(dom.dtDim[dt]);
			dom.dlDim.appendChild(dom.ddDim[dt]);
		}

		for(var dt in dom.dtExt){
			dom.dtExt[dt].innerHTML = (_SMTRANSLATION[dt]).capitalize() + ":";
			dom.ddExt[dt].id = 'Info_' + dt;

			dom.dlExt.appendChild(dom.dtExt[dt]);
			dom.dlExt.appendChild(dom.ddExt[dt]);
		}

		dom.div.appendChild(dom.dlDim);
		dom.div.appendChild(dom.dlExt);

		_divRenderer.appendChild(dom.div);
	};

	BPViewer.prototype.GUI_ShipSelect	= function(){

		dom = {
			div:	document.createElement('div'),
			select:	document.createElement('select'),
			valide:	document.createElement('input')
		}

		dom.div.id			= 'BPViewer_SelShip';

		dom.select.id			= 'SelShip_Selector';
		dom.select.className	= 'GUI_ListBox';
		dom.select.setAttribute('size', 20);

		dom.select.addEventListener("change", onChange, false);

		dom.div.appendChild(dom.select);
		_divSelect.appendChild(dom.div);

		function onChange(event){
			if(event.target.value !== _currentShip){
				if(_toLoad != _loaded){
					var option = document.getElementsByName(_currentShip);
					if(option){
						option.selected = true;
						event.target.selected = false;
					}
					return;
				}

				_currentShip = event.target.value;
				_embedURI = window.location + "ship_id?name=" + encodeURIComponent(_currentShip);

				DEBUG ? _BPVIEWER.debugDom.labels.currShip.innerHTML = "Ship: " + _currentShip : null;

				_BPVIEWER.GL_ClearScene();
				_BPVIEWER.Get_ShipData();

				var selector	= document.getElementById("Weapons_Selector").options,
					div			= document.getElementById("Weapons_CompInfo");

				div.style.display		= 'none';

				div.innerHTML			= '';

				for(var i = 0; i < selector.length; i++){
					selector[i].selected = false;
				}

				div.style.display		= 'block';
			}
		};

	};

	BPViewer.prototype.GUI_Tooltips		= function(){
		var dom = {
			div:	document.createElement('div'),
			desc:	document.createElement('p'),
			dl:		document.createElement('dl'),
			dt:	{
				author:	document.createElement('dt'),
				price:	document.createElement('dt'),
				rate:	document.createElement('dt')
			},
			dd:	{
				author:	document.createElement('dd'),
				price:	document.createElement('dd'),
				rate:	document.createElement('dd')
			}
		}

		dom.div.style.display		= 'none';
		dom.div.id			= 'Tooltips_box';
		dom.div.className	= 'absolute';
		dom.desc.id			= 'Tooltips_desc';

		for(var dt in dom.dt){
			dom.dt[dt].innerHTML = (_SMTRANSLATION.catalog[dt]).capitalize() + ":";
			dom.dd[dt].id = 'Tooltips_' + dt;

			dom.dl.appendChild(dom.dt[dt]);
			dom.dl.appendChild(dom.dd[dt]);
		}

		dom.div.appendChild(dom.dl);
		dom.div.appendChild(dom.desc);
		_divRenderer.appendChild(dom.div);
	};

	BPViewer.prototype.GUI_WeaponWin	= function(){
		var dom = {
			compDiv:	document.createElement('div'),
			infoDiv:	document.createElement('div'),
			select:		document.createElement('select')
		};

		_weaponsWindow = new StarOS.WIN.Window({
			parent:	_divRenderer,
			name:	"Weapons",
			pos:	{
				x: _webGL.renderer.domElement.offsetLeft + ((_webGL.renderer.domElement.offsetWidth - 400) / 2) + 'px',
				y: _divRenderer.offsetHeight - 240 + 'px'
			},
			size: {
				width:	'400px',
				height:	'240px'
			}
		});

		_weaponsWindow.toggle();

		dom.compDiv.id			= 'Weapons_SelComp';
		dom.infoDiv.id			= 'Weapons_CompInfo';

		dom.select.id			= 'Weapons_Selector';
		dom.select.className	= 'GUI_ListBox';
		dom.select.setAttribute('size', 3);

		dom.select.addEventListener("change", onChange, false);

		dom.compDiv.appendChild(dom.select);
		_weaponsWindow.dom.content.appendChild(dom.compDiv);
		_weaponsWindow.dom.content.appendChild(dom.infoDiv);

		function onChange(event){
			var tmparr		= ((event.target.selectedOptions['0'].id).replace('comp_', '')).split('_'),
				wid			= tmparr[0],
				cPos		= tmparr[1],
				grpBlock	= [],
				compObj		= new THREE.Object3D(),
				data;

			//Remove old overlay
			_BPVIEWER.GL_ClearWOverlay();
			_wepCtr[wid]			= {};
			_wepCtr[wid][cPos]		= {};
			_wepCtr[wid][cPos].groupSize = [];
			_wepCtr[wid][cPos].group = [];
			_wepCtr[wid][cPos].obj = null

			//Change shipOpacity
			_BPVIEWER.GL_SetShipOpa(0.05);

			_BPVIEWER.GL_RenderWepCtr(wid, cPos);
		};
	};

	//Socket calls
	BPViewer.prototype.Get_BpFolders	= function(){

		var args = {
			path: _CONFIG.path.json + 'Blueprint/'
		};

		_socket.callAPI('getBpFolders', 'vfs', 'dir', args);

	};

	BPViewer.prototype.Get_Catalog	= function(){

		var params = "path=" + _CONFIG.path.json + 'CATALOG.json';

		if(!StarOS.COM.Ajax('http://' + StarOS.config.StarOS_serv.host + ':' + StarOS.config.StarOS_serv.port + '/getFile?' + params, onSuccess, onError, {sync:true})){
			console.log("err");
		}
		function onSuccess(data, xhr, url){
			_catalog = JSON.parse(data);
		}

		function onError(err, data, xhr, url){
			_catalog = false;
		}

	};

	BPViewer.prototype.Get_ShipData		= function(){

		var args = {
			name: _currentShip
		};

		_socket.callStarmadeAPI('getShipData', 'loader', 'ship', args);

	};

	BPViewer.prototype.SocketOnResp		= function(){

		_socket.on('API::getBpFolders',		function(err, files){
			if(err){
				console.log(err);
				StarOS.dial("Server Error " + err.errno + ": " + err.description +
					"\n \"" + err.path.replace(_CONFIG.path.json, "") + "\"" +
					"\n " +
					"\nPlease, contact your admin");

				throw err;
			}

			_shipList = files;

			//set Ship selector
			if(!_embedded){
				var select = document.getElementById('SelShip_Selector');
				select.style.display = "none";

				if(select){
					select.innerHTML = '';
				}

				for(var i = 0, len = _shipList.length; i < len; i++){
					var option = document.createElement('option');

					option.text = _shipList[i];
					option.name = _shipList[i];
					option.addEventListener('mouseover', _BPVIEWER.ShowTooltips);
					option.addEventListener('mouseout', function(){
						var tooltips = document.getElementById('Tooltips_box');
						tooltips.style.display = 'none';
					});
					select.add(option);
				}
				select.style.display = "block";
			}

		});

		_socket.on('API::getDownload',		function(err, data){
			if(err){
				console.log(err);
				StarOS.dial("Server Error " + err.errno + ": " + err.description +
					"\n \"" + err.path.replace(_CONFIG.path.json, "") + "\"" +
					"\n " +
					"\nPlease, contact your admin");

				throw err;
			}

			download(data, _currentShip + ".sment");
		});

		_socket.on('StarMadeAPI::getShipData',	function(err, data){
			if(err && err != []){
				for(var i = 0, len = err.length; i < len; i++){
					console.log("Error n°" + err.errno + ":", err.description, "->", err.path);
				}
			}

			_currentData = data;

			var length		= data.header.bounds_b[0] + (-data.header.bounds_a[0]),
				height		= data.header.bounds_b[1] + (-data.header.bounds_a[1]),
				width		= data.header.bounds_b[2] + (-data.header.bounds_a[2]),
				timer		= data.smd2.visible.length * 10,
				camTarget	= new THREE.Vector3();

			camTarget.x = data.header.bounds_b[0] - (length / 2) - 0.5;
			camTarget.y = data.header.bounds_b[1] - (height / 2) - 0.5;
			camTarget.z = data.header.bounds_b[2] - (width / 2) - 0.5;

			_webGL.camera.position.set(length, height, width);
			_webGL.controls.center = camTarget;

			timer = Math.min(500 , timer);

			chunk(data.smd2.visible, _BPVIEWER.GL_RenderShip, _BPVIEWER, timer);


			//set ship info
			var massInfo	= document.getElementById('Info_mass'),
				lenInfo		= document.getElementById('Info_length'),
				heiInfo		= document.getElementById('Info_height'),
				widInfo		= document.getElementById('Info_width'),
				pwInfo		= document.getElementById('Info_power'),
				shInfo		= document.getElementById('Info_shield'),
				blocks		= 0,
				pw			= (data.meta.container) ? data.meta.container.pw : 20000,
				shBl		= (data.header.blocks["3"]) ? data.header.blocks["3"] : 0,
				shield		= new StarOS.SM.Shield(shBl);

			for(var block in data.header.blocks){
				blocks += data.header.blocks[block]
			}

			massInfo.innerHTML	= (blocks / 10).toFixed(1);
			lenInfo.innerHTML	= length - 2 + "m";
			heiInfo.innerHTML	= height - 2 + "m";
			widInfo.innerHTML	= width - 2 + "m";

			pw = Math.max(20000, pw);

			pwInfo.innerHTML	= pw.format(1, 3, ' ' , '.');
			shInfo.innerHTML	= shield.getCapacity().format(1, 3, ' ' , '.') + " (" + shield.getRate().format(0, 3, ' ' , '.') + " s/sec)";

			//set Link data
			var linkEmbed	= document.getElementById('Link_embedField'),
				toEmbed = "<iframe width='640' height='480' src='" + _embedURI + "' frameborder='0' allowfullscreen></iframe>";

			linkEmbed.value = toEmbed;

			//set controllers
			var select = document.getElementById('Weapons_Selector');
			select.style.display = "none";

			select.innerHTML = '';

			for(var comp in data.logic.controllers['8,8,8']){
				var bid = parseInt(comp);
				if(bid == 8 || bid == 14){
					continue;
				}

				for(var nbr in data.logic.controllers['8,8,8'][comp]){
					var option = document.createElement('option');

					option.text = StarOS.SMgl.blocksDef[bid].name + " (" + data.logic.controllers['8,8,8'][comp][nbr] + ")";
					option.id = "comp_" + bid + "_" + data.logic.controllers['8,8,8'][comp][nbr];
					select.add(option);
				}
			}

			select.style.display = "block";
		});

	}

	//GL functions
	BPViewer.prototype.GL_ClearScene	= function(){
		for(var i in _currentChunks){
			_webGL.scene.remove(_currentChunks[i]);
		}

		_BPVIEWER.GL_ClearWOverlay();
	};

	BPViewer.prototype.GL_InitSkyBox	= function(){

		var imgPrefix	= 'res/img/skybox/' + _CONFIG.video.skybox + '/generic_',
			directions	= ['posx', 'negx', 'posy', 'negy', 'posz', 'negz'],
			imgExt		= '.png',
			geometry	= new THREE.CubeGeometry(VIEW.far, VIEW.far, VIEW.far),
			materialLst	= [],
			material, skybox, i;

		for(i = 0; i < 6; i++){
			materialLst.push(new THREE.MeshBasicMaterial({
				map: THREE.ImageUtils.loadTexture(imgPrefix + directions[i] + imgExt),
				side: THREE.BackSide
			}));
		}

		material	= new THREE.MeshFaceMaterial(materialLst);

		skyBox		= new THREE.Mesh(geometry, material);
		skyBox.name	= 'skyBox';

		_webGL.scene.add(skyBox);
		if (_webGL.context == 'WebGLRenderer'){
			_webGL.renderer.initWebGLObjects(_webGL.scene);
		}
	};

	BPViewer.prototype.GL_InitLights	= function(){

		var hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.6 ),
			dirLight = new THREE.DirectionalLight( 0xffffff, 1 ),
			d = 50;

		hemiLight.color.setHSL( 0.6, 0.75, 1 );
		hemiLight.groundColor.setHSL( 0.095, 0.5, 1 );
		hemiLight.position.set( 0, 500, 0 );
		hemiLight.name = "light";

		dirLight.color.setHSL( 0.1, 0.1, 1 );
		dirLight.position.set( 50, -200, -100 );
		dirLight.position.multiplyScalar( 50 );

		dirLight.castShadow = true;

		dirLight.shadowMapWidth = 2048;
		dirLight.shadowMapHeight = 2048;

		dirLight.shadowCameraLeft = -d;
		dirLight.shadowCameraRight = d;
		dirLight.shadowCameraTop = d;
		dirLight.shadowCameraBottom = -d;

		dirLight.shadowCameraFar = 3500;
		dirLight.shadowBias = -0.0001;
		dirLight.shadowDarkness = 0.35;
		dirLight.name = "light";

		_webGL.scene.add( hemiLight );
		_webGL.scene.add( dirLight );

	};

	BPViewer.prototype.GL_RenderShip	= function(data){
		var chunk = new THREE.Object3D();

		for(var bl in data){
			var block = new StarOS.SMgl.getBlock(data[bl].id, data[bl].orient, data[bl].isActive, data[bl].hp, _currentData.smd2.version);

			block.mesh.position.set(data[bl].pos[0], data[bl].pos[1], data[bl].pos[2]);
			block.mesh.rotationAutoUpdate	= false;
			block.mesh.matrixAutoUpdate		= false;
			block.mesh.updateMatrix();

			chunk.add(block.mesh);
			// if(StarOS.config.video.useNormal && block.light){
				// chunk.add(block.light);
			// }
		}

		chunk.rotationAutoUpdate	= false;
		chunk.matrixAutoUpdate		= false;
		chunk.updateMatrix();
		chunk.StarOS_type = "chunk";

		_currentChunks.push(chunk)
		_webGL.scene.add(chunk);

		if (_webGL.context == 'WebGLRenderer'){
			_webGL.renderer.initWebGLObjects(_webGL.scene);
		}
	};

	BPViewer.prototype.GL_ClearWOverlay	= function(){
		for(var wid in _wepCtr){
			for(var pos in _wepCtr[wid]){
				if(_wepCtr[wid][pos].obj){
					_webGL.scene.remove(_wepCtr[wid][pos].obj);
				}
			}
		}

		if (_webGL.context == 'WebGLRenderer'){
			_webGL.renderer.initWebGLObjects(_webGL.scene);
		}
	};

	BPViewer.prototype.GL_SetShipOpa	= function(opacity){
		for(var object in _webGL.scene.children){
			if(_webGL.scene.children[object].StarOS_type && _webGL.scene.children[object].StarOS_type == "chunk"){
				for(var mesh in _webGL.scene.children[object].children){
					_webGL.scene.children[object].children[mesh].material.opacity = opacity;
				}
			}
		}

		if (_webGL.context == 'WebGLRenderer'){
			_webGL.renderer.initWebGLObjects(_webGL.scene);
		}
	};

	BPViewer.prototype.GL_RenderWepCtr	= function(wid, cPos){

		var chkPos		= cPos.split(','),
			cannonId	= "",
			grpBlock	= [],
			grpBlockLen	= [],
			smd			= _currentData.smd2.complete,
			compObj		= new THREE.Object3D();

		var div = document.getElementById('Weapons_CompInfo');
		div.style.display = "none";
		div.innerHTML = '';

		for(var i = 3; i--;){
			chkPos[i] = Math.floor(parseInt(chkPos[i]) / 16);
			if(chkPos[i] > 16 || chkPos[i] < 0){
				chkPos = Math.floor(parseInt(chkPos[i]) / 16);
			}
		}

		for(var file in _currentData.smd2.complete){
			if(_currentData.smd2.complete[file][chkPos]){
				var bData = _currentData.smd2.complete[file][chkPos][cPos],
					block = new StarOS.SMgl.getBlock(bData.id, bData.orient, bData.isActive, bData.hp);

				block.mesh.position.set(bData.pos[0], bData.pos[1], bData.pos[2]);
				block.mesh.material.setValues({color: 0xf66fff});
				block.mesh.rotationAutoUpdate	= false;
				block.mesh.matrixAutoUpdate		= false;
				block.mesh.updateMatrix();

				compObj.add(block.mesh);
				break;
			}
		}

		chkPos = chkPos.join(',');
		if(_currentData.logic.controllers[cPos]){
			for(var id in _currentData.logic.controllers[cPos]){
				cannonId = id;
				var posGrp = cloneObj(_currentData.logic.controllers[cPos][id]);

				for(var b in posGrp){
					var	posValue	= posGrp[b],
						tmpGrp		= StarOS.SM.getBlockGroup(posGrp, posValue);


					tmpGrp = sortCoords(tmpGrp);

					if(grpBlock.indexOf(tmpGrp, grpBlock) == -1){
						grpBlock.push(tmpGrp);
					}
				}

				break;
			}

			for(var i = grpBlock.length; i--;){
				grpBlockLen = grpBlock[i].length;

				for(var j = grpBlock[i].length; j--;){
					var pos = (grpBlock[i][j]).split(','),
						chk = pos.slice(0);

					for(var k = 3; k--;){
						pos[k] = parseInt(pos[k]);

						while(pos[k] > 16 || pos[k] < 0){
							pos[k] = Math.floor(pos[k] % 16);
						}
					}

					for(var k = 3; k--;){
						chk[k] = parseInt(chk[k]);
						chk[k] = Math.floor(chk[k] / 16);

						if(chk[k] > 16 || chk[k] < 0){
							chk[k] = Math.floor(chk[k] / 16);
						}
					}

					chk = chk.join(',');
					pos = pos.join(',');

					for(var f in smd){
						if(smd[f][chk] && smd[f][chk][pos]){
							var bData = smd[f][chk][pos];
								block = StarOS.SMgl.getBlock(bData.id, bData.orient, bData.isActive, bData.hp);

							block.mesh.position.set(bData.pos[0], bData.pos[1], bData.pos[2]);
							block.mesh.material.setValues({color: 0xf66fff});
							block.mesh.rotationAutoUpdate	= false;
							block.mesh.matrixAutoUpdate		= false;
							block.mesh.updateMatrix();

							compObj.add(block.mesh);

							break;
						}
					}
				}
				_wepCtr[wid][cPos].groupSize[i] = grpBlockLen;
			}

			_wepCtr[wid][cPos].group = grpBlock.length;
		}

		if(wid == '6' || wid == '38' || wid == '54' || wid == '46'){
			var dom = {
				div: document.createElement('div')
			};

			if(_currentData.meta.container){
				var Did;

				for(var D in _currentData.meta.container.shipMan0[wid]){
					for(var pointDist in _currentData.meta.container.shipMan0[wid][D]){
						if(_currentData.meta.container.shipMan0[wid][D][pointDist].controller == cPos){
							Did = D;
							break;
						}
					}
					if(Did){
						break;
					}
				}

				for(var i = 0; i < _wepCtr[wid][cPos].group; i++){
					var dom2 = {
							div:	document.createElement('div'),
							separator:	document.createElement('div'),
						},
						dist = cloneObj(_currentData.meta.container.shipMan0[wid][D]["PointDist" + i]),
						weaponDistArgs = [],
						weaponUnit = new StarOS.SM.ControllerUnit().getControllerById(parseInt(wid));

					weaponUnit.init();
					weaponUnit.setIdPos(dist.idPos);
					weaponUnit.setMaxPoints(_wepCtr[wid][cPos].groupSize[i]);
					for(var effect in dist.EffectStruct){
						weaponDistArgs.push({effectId: parseInt(effect), distrib: dist.EffectStruct[effect]});
					}
					weaponUnit.receiveDistChange(weaponDistArgs);

					dom2.separator.className		= 'separator';

					dom.div.appendChild(weaponUnit.domElement);
					dom.div.appendChild(dom2.separator);
					div.appendChild(dom.div);
				}
			}
			else {
				for(var i = 0; i < _wepCtr[wid][cPos].group; i++){
					var dom2 = {
							div:	document.createElement('div'),
							separator:	document.createElement('div'),
						},
						weaponDistArgs = [],
						weaponUnit = new StarOS.SM.ControllerUnit().getControllerById(parseInt(wid));

					weaponUnit.setIdPos(grpBlock[i][0]);
					weaponUnit.setMaxPoints(_wepCtr[wid][cPos].groupSize[i]);
					weaponUnit.init();

					dom2.separator.className		= 'separator';

					dom.div.appendChild(weaponUnit.domElement);
					dom.div.appendChild(dom2.separator);
					div.appendChild(dom.div);
				}
			}
		}
		else {
			var dom = {
					div:	document.createElement('div'),
					dl:		document.createElement('dl'),
					dt:	{
						type: document.createElement('dt'),
						location: document.createElement('dt')
					},
					dd:	{
						type: document.createElement('dd'),
						location: document.createElement('dd')
					},
					dlGrp:	document.createElement('dl'),
					dtGrp:	document.createElement('dt'),
					ddGrp:	document.createElement('dd'),
				},
				len = _wepCtr[wid][cPos].group;

			for(var dt in dom.dt){
				dom.dt[dt].innerHTML = (_SMTRANSLATION.controller[dt]).capitalize() + ":";
				dom.dt[dt].className = "dt_level1";
				dom.dd[dt].className = "dd_level1";
				dom.dl.appendChild(dom.dt[dt]);
				dom.dl.appendChild(dom.dd[dt]);
			}

			dom.dl.className	= "dl_level1";
			dom.dtGrp.className	= "dt_level2";
			dom.ddGrp.className	= "dd_level2";
			dom.dlGrp.className	= "dl_level2";

			dom.dd.location.innerHTML	= cPos.replace(/\,/g, ', ');
			dom.dtGrp.innerHTML	= (_SMTRANSLATION.controller.groups).capitalize() + ":";
			dom.ddGrp.innerHTML	= len;

			dom.dlGrp.appendChild(dom.dtGrp);
			dom.dlGrp.appendChild(dom.ddGrp);
			dom.div.appendChild(dom.dl);
			dom.div.appendChild(dom.dlGrp);

			if(len == 0){

				var separator	= document.createElement('div'),
					BasicUnit	= new StarOS.SM.ControllerUnit().getControllerById(wid),
					cName		= BasicUnit.getControllerName();

				BasicUnit.init();

				separator.className		= "separator";
				dom.dd.type.innerHTML	= _SMTRANSLATION.controller.name[cName].capitalize();
				dom.div.appendChild(separator);

				if(wid == 15 || wid == 22){
					var blocks = 0;
					for(var block in _currentData.header.blocks){
						blocks += _currentData.header.blocks[block]
					}
					BasicUnit.setMaxPoints(blocks / 10);
					dom.div.appendChild(BasicUnit.domElement);
				}

			}
			else {

				for(var i = 0; i < len; i++){
					var dom2 = {
							separator:	document.createElement('div'),
							labelUnit:	document.createElement('label')
						},
						BasicUnit = new StarOS.SM.ControllerUnit().getControllerById(wid),
						cName		= BasicUnit.getControllerName();

					BasicUnit.init();
					BasicUnit.setMaxPoints(_wepCtr[wid][cPos].groupSize[i]);
					BasicUnit.setDimensions(grpBlock[i][0], grpBlock[i][grpBlock[i].length -1]);
					if(wid == 344){
						BasicUnit.setGroup(grpBlock[i]);
					}

					dom2.labelUnit.innerHTML	= (_SMTRANSLATION.controller.unit).capitalize() + " " + (i + 1);
					dom2.separator.className	= "separator";

					dom.dd.type.innerHTML		= _SMTRANSLATION.controller.name[cName].capitalize();

					dom.div.appendChild(dom2.separator);
					dom.div.appendChild(dom2.labelUnit);
					dom.div.appendChild(BasicUnit.domElement);
				}

			}

			div.appendChild(dom.div);

		}

		div.style.display = "block";

		compObj.rotationAutoUpdate	= false;
		compObj.matrixAutoUpdate	= false;
		compObj.updateMatrix();
		compObj.StarOS_type = "wepOverlay";
		_wepCtr[wid][cPos].obj = compObj;

		_webGL.scene.add(compObj);

		if (_webGL.context == 'WebGLRenderer'){
			_webGL.renderer.initWebGLObjects(_webGL.scene);
		}

	};

	//Event functions
	BPViewer.prototype.SetupEvent		= function(){

		_webGL.renderer.domElement.addEventListener('mousemove',	_BPVIEWER.onMouseMove,	false);
		_webGL.renderer.domElement.addEventListener('mousedown',	_BPVIEWER.onMouseDown,	false);

		PARENT.addEventListener('contextmenu',	_BPVIEWER.onContextMenu,	false);

		window.addEventListener('resize',		_BPVIEWER.onResize,			false);
		window.addEventListener("keyup",		_BPVIEWER.onKeyUp,			false);

	};

	BPViewer.prototype.UpdateDebug		= function(){

		requestAnimationFrame(BPViewer.prototype.UpdateDebug); //--> requestAnimationFrame() is a window function

		_BPVIEWER.debugDom.labels.mouseX.innerHTML = "x: " + _mouse.x.toFixed(5);
		_BPVIEWER.debugDom.labels.mouseY.innerHTML = "y: " + _mouse.y.toFixed(5);

		_BPVIEWER.debugDom.stats.update();

	};

	BPViewer.prototype.onMouseMove		= function(event){

		event.preventDefault();

		var renderer			= _webGL.renderer.domElement,
			rendererOffsetLeft	= PARENT.offsetLeft,
			rendererOffsetTop	= PARENT.offsetTop;

		_mouse.x = ((event.clientX - rendererOffsetLeft) / renderer.offsetWidth) * 2 - 1;
		_mouse.y = -((event.clientY - rendererOffsetTop) / renderer.offsetHeight) * 2 + 1;

	};

	BPViewer.prototype.onMouseDown		= function(event){

		event.preventDefault();

	};

	BPViewer.prototype.onContextMenu	= function(event){

		event.preventDefault();

		var menu = document.createElement('div'),
			property = document.createElement('input');

		menu.id = 'contextmenu';
		menu.className = 'GUI_contextmenu';

		menu.style.position = 'absolute';
		menu.style.left = event.clientX - 15 + 'px';
		menu.style.top = event.clientY - 15 + 'px';

		property.className = 'property';
		property.className += ' GUI_menuButton';
		property.type = 'submit';
		property.value = property.name = "property";

		menu.appendChild(property);

		PARENT.appendChild(menu);

		menu.addEventListener('mouseout', function(event){
			//this is the original element the event handler was assigned to
			var e = event.toElement || event.relatedTarget;

			//check for all children levels (checking from bottom up)
			while(e && e.parentNode && e.parentNode != window) {
				if(e.parentNode == this||  e == this){
					if(e.preventDefault) e.preventDefault();
					return false;
				}
				e = e.parentNode;
			}
			this.parentNode.removeChild(this);
		});

		property.addEventListener('click', function(event){
			event.preventDefault();
			var property = new PropertyWindow(PARENT, _BPVIEWER);
		});

	};

	BPViewer.prototype.onResize			= function(event){

		DEBUG ? _debugWindow.update(): null;

	};

	BPViewer.prototype.onKeyUp			= function(event){

		var key = event.which;

		switch(key){
			case 27: // escape key
				var selector	= document.getElementById("Weapons_Selector").options,
					div			= document.getElementById("Weapons_CompInfo");

				div.style.display		= 'none';

				div.innerHTML			= '';

				for(var i = 0; i < selector.length; i++){
					selector[i].selected = false;
				}

				div.style.display		= 'block';

				_BPVIEWER.GL_ClearWOverlay();
				_BPVIEWER.GL_SetShipOpa(1.0);
			break;

			case 80: // "p" key
				if(_currentShip){
					try {
						var imgData = _webGL.renderer.domElement.toDataURL();
						download(imgData, _currentShip + ".png");
					} 
					catch(cErr) {
						dial("Browser does not support taking screenshot of 3d context");
						return;
					}
				}
			break;

			default:
				return;
			break;
		}

	};

	BPViewer.prototype.ShowTooltips		= function(event){
		var tooltips	= document.getElementById('Tooltips_box'),
			author		= document.getElementById('Tooltips_author'),
			desc		= document.getElementById('Tooltips_desc'),
			price		= document.getElementById('Tooltips_price'),
			rate		= document.getElementById('Tooltips_rate'),
			shipName	= event.target.innerHTML,
			totalRate	= 0;

		if(_catalog[shipName]){
			author.innerHTML	= _catalog[shipName].creator;
			desc.innerHTML		= _catalog[shipName].description;
			price.innerHTML		= _catalog[shipName].price.format(0, 3,' ', ',');

			if(_catalog[shipName].rate){
				var i = 0;
				for(var vote in _catalog[shipName].rate){
					totalRate += _catalog[shipName].rate[vote]['1'];
					i++;
				}

				totalRate = totalRate / i;
			}

			rate.innerHTML = totalRate + "/10";
		}
		else {
			author.innerHTML	= (_TRANSLATION.noData).capitalize();
			desc.innerHTML		= (_TRANSLATION.noData).capitalize();
			price.innerHTML		= (_TRANSLATION.noData).capitalize();
			rate.innerHTML = "unk/10";
		}


		tooltips.style.top = event.y - 25 + 'px';
		tooltips.style.display = "block";
	};

	BPViewer.prototype.update			= function(){

		// _loadWindow.update();
		DEBUG ? _debugWindow.update() : null;
		if(!_weaponsWindow.isVisible){
			_weaponsWindow.toggle();
			_weaponsWindow.update();
			_weaponsWindow.toggle();
		}
		else {
			_weaponsWindow.update();
		}
	};

	//getters
	BPViewer.prototype.getVersion	= function(){

		return _VERSION;

	};


	var PropertyWindow = function(parent, context){
		_PROPERTYWIN	= this;
		var args =  [{
			parent: parent,
			name: "BPViewer_property",
			size: {
				width:	'375px',
				height:	'220px'
			},
			pos: {
				x: (parent.offsetWidth - 375) / 2 + 'px',
				y: (parent.offsetHeight - 220) / 2 + 'px'
			}
		}];

		StarOS.WIN.Window.apply(this, args);

		this.themeList		= document.createElement('select');
		this.fontList		= document.createElement('select');
		this.fontSizeList	= document.createElement('select');
		this.texList		= document.createElement('select');
		this.texSizeList	= document.createElement('select');
		this.skyList		= document.createElement('select');
		this.normalCheck	= document.createElement('input');
		this.aliasCheck		= document.createElement('input');
		this.showcase		= document.createElement('span');
		this.context		= context;

		this.init();
	};

	PropertyWindow.prototype		= Object.create(StarOS.WIN.Window.prototype);

	PropertyWindow.prototype.init	= function(){
		var dls = {
				theme:		document.createElement('dl'),
				font:		document.createElement('dl'),
				fontSize:	document.createElement('dl'),
				texture:	document.createElement('dl'),
				texSize:	document.createElement('dl'),
				skybox:		document.createElement('dl')
			},
			dts = {
				theme:		document.createElement('dt'),
				font:		document.createElement('dt'),
				fontSize:	document.createElement('dt'),
				texture:	document.createElement('dt'),
				texSize:	document.createElement('dt'),
				skybox:		document.createElement('dt')
			},
			dds = {
				theme:		document.createElement('dd'),
				font:		document.createElement('dd'),
				fontSize:	document.createElement('dd'),
				texture:	document.createElement('dd'),
				texSize:	document.createElement('dd'),
				skybox:		document.createElement('dd')
			},
			inputs = {
				ok:		document.createElement('input'),
				cancel:	document.createElement('input'),
				apply:	document.createElement('input')
			},
			labelNormal	= document.createElement('label'),
			labelAlias	= document.createElement('label');

		_socket.callAPI('getThemes', 'vfs', 'dir', {path: _CONFIG.path.site + 'res/themes'});
		_socket.callAPI('getTextures', 'vfs', 'dir', {path: _CONFIG.path.site + 'res/img/textures'});
		_socket.callAPI('getSkybox', 'vfs', 'dir', {path: _CONFIG.path.site + 'res/img/skybox'});

		dds.theme.appendChild(_PROPERTYWIN.themeList);
		dds.font.appendChild(_PROPERTYWIN.fontList);
		dds.fontSize.appendChild(_PROPERTYWIN.fontSizeList);
		dds.texture.appendChild(_PROPERTYWIN.texList);
		dds.texSize.appendChild(_PROPERTYWIN.texSizeList);
		dds.skybox.appendChild(_PROPERTYWIN.skyList);

		dls.theme.className		= "PropertyDl_left";
		dls.font.className		= "PropertyDl_left";
		dls.texture.className	= "PropertyDl_left";
		dls.skybox.className	= "PropertyDl_left";

		dts.theme.className		= "PropertyDt_left";
		dts.font.className		= "PropertyDt_left";
		dts.texture.className	= "PropertyDt_left";
		dts.skybox.className	= "PropertyDt_left";

		dds.theme.className		= "PropertyDd_left";
		dds.font.className		= "PropertyDd_left";
		dds.texture.className	= "PropertyDd_left";
		dds.skybox.className	= "PropertyDd_left";

		dls.fontSize.className	= "PropertyDl_right";
		dls.texSize.className	= "PropertyDl_right";

		dts.fontSize.className	= "PropertyDt_right";
		dts.texSize.className	= "PropertyDt_right";

		dds.fontSize.className	= "PropertyDd_right";
		dds.texSize.className	= "PropertyDd_right";

		_PROPERTYWIN.normalCheck.type = _PROPERTYWIN.aliasCheck.type = 'checkbox';
		_PROPERTYWIN.normalCheck.className = _PROPERTYWIN.aliasCheck.className = 'GUI_checkbox';
		_PROPERTYWIN.normalCheck.checked = _CONFIG.video.useNormal;
		_PROPERTYWIN.aliasCheck.checked = _CONFIG.video.antialias;

		labelNormal.innerHTML = (_TRANSLATION.propertyWin.normal).capitalize() + ":";
		labelAlias.innerHTML = (_TRANSLATION.propertyWin.antialias).capitalize() + ":";
		labelNormal.htmlFor = _PROPERTYWIN.normalCheck.id = _PROPERTYWIN.normalCheck.name = "Property_normal";
		labelAlias.htmlFor = _PROPERTYWIN.aliasCheck.id = _PROPERTYWIN.aliasCheck.name = "Property_antialias";
		labelNormal.id = "Property_normalLab";
		labelAlias.id = "Property_antialiasLab";

		labelNormal.className = labelAlias.className = _PROPERTYWIN.normalCheck.className = _PROPERTYWIN.aliasCheck.className = 'absolute';
		_PROPERTYWIN.normalCheck.className = _PROPERTYWIN.aliasCheck.className += ' GUI_checkbox';

		_PROPERTYWIN.showcase.innerHTML	= "Preview text for font and size.";
		_PROPERTYWIN.showcase.className	= 'absolute';

		_socket.on('API::getThemes', function(err, files){
			if(err){
				console.log(err);
				StarOS.dial("Server Error " + err.errno + ": " + err.description +
					"\n \"" + err.path.replace(_CONFIG.path.site, "") + "\"" +
					"\n " +
					"\nPlease, contact your admin");

				throw err;
			}
			else {
				var i = 0;

				_PROPERTYWIN.themeList.innerHTML = '';
				for(var file in files){
					var option = document.createElement('option');

					option.text = files[file];
					_PROPERTYWIN.themeList.add(option);
					if(files[file] == _CONFIG.theme.default){
						_PROPERTYWIN.themeList.selectedIndex = i;
					}
					i++;
				}
			}
		});

		_socket.on('API::getTextures', function(err, files){
			if(err){
				console.log(err);
				StarOS.dial("Server Error " + err.errno + ": " + err.description +
					"\n \"" + err.path.replace(_CONFIG.path.site, "") + "\"" +
					"\n " +
					"\nPlease, contact your admin");

				throw err;
			}
			else {
				var i = 0;

				_PROPERTYWIN.texList.innerHTML = '';
				for(var file in files){
					var option = document.createElement('option');

					option.text = files[file];
					_PROPERTYWIN.texList.add(option);
					if(files[file] == _CONFIG.video.texturePack){
						_PROPERTYWIN.texList.selectedIndex = i;
						_socket.callAPI('getTextureSizes', 'vfs', 'dir', {path: _CONFIG.path.site + 'res/img/textures/' + files[file]});
					}
					i++;
				}
			}
		});

		_socket.on('API::getSkybox', function(err, files){
			if(err){
				console.log(err);
				StarOS.dial("Server Error " + err.errno + ": " + err.description +
					"\n \"" + err.path.replace(_CONFIG.path.site, "") + "\"" +
					"\n " +
					"\nPlease, contact your admin");

				throw err;
			}
			else {
				var i = 0;

				_PROPERTYWIN.skyList.innerHTML = '';
				for(var file in files){
					var option = document.createElement('option');

					option.text = files[file];
					_PROPERTYWIN.skyList.add(option);
					if(files[file] == _CONFIG.video.skybox){
						_PROPERTYWIN.skyList.selectedIndex = i;
					}
					i++;
				}
			}
		});

		_socket.on('API::getTextureSizes', function(err, files){
			if(err){
				console.log(err);
				StarOS.dial("Server Error " + err.errno + ": " + err.description +
					"\n \"" + err.path.replace(_CONFIG.path.site, "") + "\"" +
					"\n " +
					"\nPlease, contact your admin");

				throw err;
			}
			else {
				var i = 0;

				_PROPERTYWIN.texSizeList.innerHTML = '';
				for(var file in files){
					var option = document.createElement('option');

					option.text = files[file];
					_PROPERTYWIN.texSizeList.add(option);
					if(files[file] == _CONFIG.video.textureSize){
						_PROPERTYWIN.texSizeList.selectedIndex = i;
					}
					i++;
				}
			}
		});

		for(var i = 0; i < _CONFIG.theme.fonts.length; i++){
			var option = document.createElement('option');

			option.text = _CONFIG.theme.fonts[i];
			this.fontList.add(option);
		}

		for(var i = 6; i < 30; i++){
			var option = document.createElement('option');
			option.text = i;
			this.fontSizeList.add(option);
		}

		for(var dl in dls){
			dts[dl].innerHTML = (_TRANSLATION.propertyWin[dl].capitalize()) + ":";
			dls[dl].appendChild(dts[dl]);
			dls[dl].appendChild(dds[dl]);
			_PROPERTYWIN.dom.content.appendChild(dls[dl]);
		}

		_PROPERTYWIN.dom.content.appendChild(labelNormal);
		_PROPERTYWIN.dom.content.appendChild(_PROPERTYWIN.normalCheck);

		_PROPERTYWIN.dom.content.appendChild(labelAlias);
		_PROPERTYWIN.dom.content.appendChild(_PROPERTYWIN.aliasCheck);

		_PROPERTYWIN.dom.content.appendChild(_PROPERTYWIN.showcase);

		for(var input in inputs){
			inputs[input].className = 'Property_button' + input.capitalize();
			inputs[input].className += ' GUI_button';
			inputs[input].className += ' absolute';
			inputs[input].type = 'submit';
			inputs[input].value = inputs[input].name = _TRANSLATION.propertyWin.buttons[input];

			_PROPERTYWIN.dom.content.appendChild(inputs[input]);
		}

		_PROPERTYWIN.themeList.addEventListener("change",		_PROPERTYWIN.onCssChange	, false);
		_PROPERTYWIN.fontList.addEventListener("change",		_PROPERTYWIN.onFontChange	, false);
		_PROPERTYWIN.fontSizeList.addEventListener("change",	_PROPERTYWIN.onFSizeChange	, false);
		_PROPERTYWIN.texList.addEventListener("change",			onTexChange					, false);
		_PROPERTYWIN.texSizeList.addEventListener("change",		_PROPERTYWIN.onTSizeChange	, false);
		_PROPERTYWIN.skyList.addEventListener("change",			_PROPERTYWIN.onSkyChange	, false);

		_PROPERTYWIN.normalCheck.addEventListener("click",			_PROPERTYWIN.onNormalClick, false);
		_PROPERTYWIN.aliasCheck.addEventListener("click",			_PROPERTYWIN.onAliasClick, false);

		inputs.ok.addEventListener(		"click", _PROPERTYWIN.onOkClick,		false);
		inputs.cancel.addEventListener(	"click", _PROPERTYWIN.onCancelClick,	false);
		inputs.apply.addEventListener(	"click", _PROPERTYWIN.onApplyClick,		false);

		function onTexChange(event){
			_socket.callAPI('getTextureSizes', 'vfs', 'dir', {path: _CONFIG.path.site + 'res/img/textures/' + _PROPERTYWIN.texList.value});
		};

	};

	PropertyWindow.prototype.onCssChange	= function(event){

		StarOS.applyTheme(_PROPERTYWIN.themeList.value);
		//set timeout to wait css loading
		setTimeout(function(){
			_PROPERTYWIN.context.update();
			_PROPERTYWIN.update();
		}, 500);

	};

	PropertyWindow.prototype.onFontChange	= function(event){
		_PROPERTYWIN.showcase.style.fontFamily = _PROPERTYWIN.fontList.value + ', serif';
		_PROPERTYWIN.showcase.style.left = (_PROPERTYWIN.dom.content.offsetWidth - _PROPERTYWIN.showcase.offsetWidth) / 2 + 'px';
	};

	PropertyWindow.prototype.onFSizeChange	= function(event){
		_PROPERTYWIN.showcase.style.fontSize = _PROPERTYWIN.fontSizeList.value + 'px';
		_PROPERTYWIN.showcase.style.left = (_PROPERTYWIN.dom.content.offsetWidth - _PROPERTYWIN.showcase.offsetWidth) / 2 + 'px';
	};

	PropertyWindow.prototype.onTSizeChange	= function(event){
		StarOS.dial(_TRANSLATION.needApplyReload);
	};

	PropertyWindow.prototype.onSkyChange	= function(event){

		if(_embedded){
			for(var child in _webGL.scene.children){
				if(_webGL.scene.children[child].name == "skyBox"){

					var imgPrefix	= 'res/img/skybox/' + _PROPERTYWIN.skyList.value + '/generic_',
						directions	= ['posx', 'negx', 'posy', 'negy', 'posz', 'negz'],
						imgExt		= '.png',
						materialLst	= [],
						material, i;

					for(i = 0; i < 6; i++){
						materialLst.push(new THREE.MeshBasicMaterial({
							map: THREE.ImageUtils.loadTexture(imgPrefix + directions[i] + imgExt),
							side: THREE.BackSide
						}));
					}
					material	= new THREE.MeshFaceMaterial(materialLst);
					_webGL.scene.children[child].material = material;

					if (_webGL.context == 'WebGLRenderer'){
						_webGL.renderer.initWebGLObjects(_webGL.scene);
					}
					return;
				}
			}
		}

	};

	PropertyWindow.prototype.onNormalClick	= function(event){
		StarOS.dial(_TRANSLATION.needApplyReload);
	};

	PropertyWindow.prototype.onAliasClick	= function(event){
		StarOS.dial(_TRANSLATION.needApplyReload);
	};

	PropertyWindow.prototype.onOkClick		= function(event){

		event.preventDefault();

		if(_PROPERTYWIN.themeList.value){
			_CONFIG.theme.default = _PROPERTYWIN.themeList.value;
		}

		if(_PROPERTYWIN.showcase.style.fontFamily != ""){
			document.body.style.fontFamily = _PROPERTYWIN.fontList.value + ', serif';
		}

		if(_PROPERTYWIN.showcase.style.fontSize != ""){
			document.body.style.fontSize = _PROPERTYWIN.fontSizeList.value + 'px';
		}

		if(_PROPERTYWIN.texList.value){
			_CONFIG.video.texturePack = _PROPERTYWIN.texList.value;
		}

		if(_PROPERTYWIN.texSizeList.value){
			_CONFIG.video.textureSize = _PROPERTYWIN.texSizeList.value;
		}

		if(_PROPERTYWIN.skyList.value){
			_CONFIG.video.skybox = _PROPERTYWIN.skyList.value;
		}

		for(var child in _webGL.scene.children){
			if(_webGL.scene.children[child].name == "light"){
				_webGL.scene.remove(_webGL.scene.children[child]);
			}
		}
		_CONFIG.video.useNormal = _PROPERTYWIN.normalCheck.checked;

		if(_PROPERTYWIN.normalCheck.checked){
			_PROPERTYWIN.context.GL_InitLights();
		}

		_CONFIG.video.antialias = _PROPERTYWIN.aliasCheck.checked;

		if(_USESTORAGE){
			localStorage.setItem('StarOS_Cfg',  JSON.stringify(_CONFIG));
		}

		_PROPERTYWIN.destroy();
	};

	PropertyWindow.prototype.onCancelClick	= function(event){

		event.preventDefault();

		if(_PROPERTYWIN.themeList.value != _CONFIG.theme.default){
			StarOS.applyTheme(_CONFIG.theme.default);
			//set timeout to wait css loading
			setTimeout(function(){
				_PROPERTYWIN.context.update();
				_PROPERTYWIN.update();
			}, 500);
		}

		if(_PROPERTYWIN.skyList.value != _CONFIG.video.skybox){

			if(_embedded){
				for(var child in _webGL.scene.children){
					if(_webGL.scene.children[child].name == "skyBox"){

						var imgPrefix	= 'res/img/skybox/' + _CONFIG.video.skybox + '/generic_',
							directions	= ['posx', 'negx', 'posy', 'negy', 'posz', 'negz'],
							imgExt		= '.png',
							materialLst	= [],
							material, i;

						for(i = 0; i < 6; i++){
							materialLst.push(new THREE.MeshBasicMaterial({
								map: THREE.ImageUtils.loadTexture(imgPrefix + directions[i] + imgExt),
								side: THREE.BackSide
							}));
						}
						material	= new THREE.MeshFaceMaterial(materialLst);
						_webGL.scene.children[child].material = material;

						if (_webGL.context == 'WebGLRenderer'){
							_webGL.renderer.initWebGLObjects(_webGL.scene);
						}
						break;
					}
				}
			}
		}

		_PROPERTYWIN.destroy();

	};

	PropertyWindow.prototype.onApplyClick	= function(event){

		event.preventDefault();

		if(_PROPERTYWIN.themeList.value){
			_CONFIG.theme.default = _PROPERTYWIN.themeList.value;
		}

		if(_PROPERTYWIN.showcase.style.fontFamily != ""){
			document.body.style.fontFamily = _PROPERTYWIN.fontList.value + ', serif';
		}

		if(_PROPERTYWIN.showcase.style.fontSize != ""){
			document.body.style.fontSize = _PROPERTYWIN.fontSizeList.value + 'px';
		}

		if(_PROPERTYWIN.texList.value){
			_CONFIG.video.texturePack = _PROPERTYWIN.texList.value;
		}

		if(_PROPERTYWIN.texSizeList.value){
			_CONFIG.video.textureSize = _PROPERTYWIN.texSizeList.value;
		}

		if(_PROPERTYWIN.skyList.value){
			_CONFIG.video.skybox = _PROPERTYWIN.skyList.value;
		}

		_CONFIG.video.useNormal = _PROPERTYWIN.normalCheck.value;
		if(_PROPERTYWIN.normalCheck.value){
			_PROPERTYWIN.context.GL_InitLights();
		}
		_CONFIG.video.antialias = _PROPERTYWIN.aliasCheck.value;

		if(_USESTORAGE){
			localStorage.setItem('StarOS_Cfg',  JSON.stringify(_CONFIG));
		}

	};


	//--------------------------------------------
	// Exporting Class and Functions
	//--------------------------------------------

	StarOS.BPViewer = StarOS.BPViewer || BPViewer;
})();