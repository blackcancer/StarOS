/*
	Product: StarOS Map
	Description: This script generate a 3D Starmap for starmade
	License: http://creativecommons.org/licenses/by/3.0/legalcode

	FileVersion: 0.5-rev00001					Date: 2013-12-28
	By Blackcancer

	website: http://initsysrev.net
	support: blackcancer@initsysrev.net
*/

var StarOS_Map = function(options){
	this.settings = options || {};

	if(!this.settings.parentId){
		alert("StarOS_Map: You must specify the parentId parameter.");
	}
	else{

		//DEFAULT PARAMETERS --------------------------------------
		//					 All default parameters start with DEF_
		//					Second part of name is varible name
		var DEF_debug = false,
			DEF_fallback = false,
			DEF_width = $('StarOS_map').width(),
			DEF_height = $('StarOS_map').height(),
			DEF_fsKey = "f",
			DEF_useLogin = false,
			DEF_showShip = false,
			DEF_showAsteroid = false,
			DEF_showEntInfo = {
				faction: false,
				mass: false,
				power: false,
				shield: false
			},
			DEF_view = {
				aspect: 0,		//aspect will be define line 52
				angle: 45,
				near: 0.1,
				far: 4100000
			};

		//APPLY PARAMETERS DEFINE BY USER ---------------------
		//					All final variables are in CAPS for 
		//					better readability
		var $parent		  = $('#' + this.settings.parentId),
			DEBUG		  = this.settings.debug		   || DEF_debug,
			FALLBACK	  = this.settings.fallback	   || DEF_fallback,
			WIDTH		  = this.settings.width		   || DEF_width,
			HEIGHT		  = this.settings.height	   || DEF_height,
			FS_KEY		  = this.settings.fsKey		   || DEF_fsKey,
			SHOW_SHIP	  = this.settings.showShip	   || DEF_showShip,
			SHOW_ASTEROID = this.settings.showAsteroid || DEF_showAsteroid,
			USE_LOGIN 	  = this.settings.useLogin	   || DEF_useLogin,
			SHOW_ENT_INFO = DEF_showEntInfo;
			VIEW = {
				aspect: 0,
				angle: 0,
				near: 0,
				far: 0
			};

		DEF_view.aspect = WIDTH / HEIGHT;

		if(this.settings.view != undefined){
			VIEW.aspect = this.settings.view.aspect || DEF_view.aspect;
			VIEW.angle 	= this.settings.view.angle 	|| DEF_view.angle;
			VIEW.near	= this.settings.view.near 	|| DEF_view.near;
			VIEW.far 	= this.settings.view.far 	|| DEF_view.far;
		}
		else{
			VIEW = DEF_view;
		}

		if(this.settings.showEntInfo != undefined){
			SHOW_ENT_INFO.faction = this.settings.showEntInfo.faction || DEF_showEntInfo.faction;
			SHOW_ENT_INFO.mass 	= this.settings.showEntInfo.mass 	|| DEF_showEntInfo.mass;
			SHOW_ENT_INFO.power	= this.settings.showEntInfo.power 	|| DEF_showEntInfo.power;
			SHOW_ENT_INFO.shield = this.settings.showEntInfo.shield || DEF_showEntInfo.shield;
		}
		else{
			SHOW_ENT_INFO = DEF_showEntInfo;
		}

		var MAPCLASS = this,
			_SESSION = {},
			entDictionary ={},
			facDictionary ={},
			playDictionary = {},
			user = {},
			mouseMove ={},
			chunk = [],
			chunkSprite = [],
			chunkEnt = {},
			chunkSize = 16,
			currentSystem = [0, 0, 0],
			sectorSize = 1300,
			intersected = false,
			logged = false,
			showInfo = false,
			keyboard, projector, scene, camera, renderer, controls, stats, chunkLoader;

		StarOS_Map.prototype.init = function(){

			this.getPlayers();
			this.getFactions();
			if(USE_LOGIN){
				jqxhr_session = $.ajax({
					url: 'includes/functions.php',
					type: 'GET',
					async: false,
					data: {'get': 'session'},
					dataType: 'json'
				})
				.done(function(json){
					if(DEBUG){console.debug("Load _SESSION...");}
					
					_SESSION = json;
				})
				.fail(function(result, err_code, err){
					if(DEBUG_MODE){
						console.debug("JQXHR_session " + err);
					}
				});

				if(_SESSION.user != undefined){
					if(DEBUG){console.debug("Logged!");}
					logged = true;
				}
				this.initLogin();
			}
			this.systemSelector();
			this.initWebGL();
			this.updateDomElem();
			this.initChunk();
			this.initSkybox();
			this.setupEvent();

			this.animate = this.animate.bind(this);
			this.animate();
		},


		StarOS_Map.prototype.getPlayers = function(){
			if(DEBUG){console.debug("Requesting players.json...");}

			jqxhr_play = $.ajax({
				url:'scripts/StarOS_json/players.json',
				type: 'GET',
				async: false,
				dataType: 'json'
			})
			.done(function(json){playDictionary = json;})
			.fail(function(result, err_code, err){
				if(DEBUG){console.debug("JQXHR_play " + err);}
			});
		},


		StarOS_Map.prototype.getFactions = function(){
			if(DEBUG){console.debug("Requesting factions.json...");}

			jqxhr_fac = $.getJSON('scripts/StarOS_json/factions.json')
			.done(function(json){facDictionary = json;})
			.fail(function(result, err_code, err){
				if(DEBUG){console.debug("JQXHR_fac " + err);}
			});
		},


		StarOS_Map.prototype.retrievingPlayer = function(){
			if(DEBUG){console.debug("retrieving player from playDictionary");}

			for(i in playDictionary){
				if(playDictionary[i].name = _SESSION.user){
					user = playDictionary[i];
				}
			}

			if(DEBUG){
				console.debug("Player data:");
				console.debug(user);
			}
		},


		StarOS_Map.prototype.initWebGL = function(){

			if(DEBUG){console.debug("Initialize WebGL...");}

			keyboard = new THREEx.KeyboardState();
			projector = new THREE.Projector();
			scene = new THREE.Scene();
			camera = new THREE.PerspectiveCamera(
				VIEW.angle,
				VIEW.aspect,
				VIEW.near,
				VIEW.far
			);

			if(Detector.webgl){

				if(DEBUG){console.debug("Use WebGLRenderer...");}

				renderer = new THREE.WebGLRenderer({
					antialias: true
				});

			}
			else{

				if(DEBUG){console.debug("Use CanvasRenderer...");}

				renderer = new THREE.CanvasRenderer();

			}

			scene.add(camera);
			camera.position.set(sectorSize * 4, sectorSize * 4, sectorSize * 4);

			renderer.setSize(WIDTH, HEIGHT);
			renderer.domElement.id = "StarOS_mapRender";
			$parent.append(renderer.domElement);
			$parent.width(WIDTH);
			$parent.height(HEIGHT);
		},


		StarOS_Map.prototype.initSkybox = function(){

			if(DEBUG){console.debug("Initialize skyBox...");}

			var imagePrefix = "res/img/starmap/skybox/generic_",
				directions = ["posx", "negx", "posy", "negy", "posz", "negz"],
				imageSuffix = ".png",
				geometry = new THREE.CubeGeometry(VIEW.far, VIEW.far, VIEW.far),
				materialList = [],
				material, skyBox, i;

			for(i = 0; i < 6; i++){
				materialList.push(new THREE.MeshBasicMaterial({
					map: THREE.ImageUtils.loadTexture(imagePrefix + directions[i] + imageSuffix),
					side: THREE.BackSide
				}));
			}

			material = new THREE.MeshFaceMaterial(materialList);
			skyBox = new THREE.Mesh(geometry, material);
			skyBox.name = "skyBox";
			scene.add(skyBox);
		},


		StarOS_Map.prototype.initChunk = function(){

			if(window.Worker && !FALLBACK){

				if(DEBUG){console.debug("Initialize worker chunkLoader.js...");}

				var data = {};
				chunkLoader = new Worker("scripts/StarOS_Map/chunkLoader.js");
				chunkLoader.onmessage = function(event){
					MAPCLASS.parseWorker(event);
				};

				data.showShip = SHOW_SHIP;
				data.showAsteroid = SHOW_ASTEROID;
				data.useLogin = USE_LOGIN;
				data.currentSystem = currentSystem;
				data.chunkSize = chunkSize;
				data.sectorSize = sectorSize;
				data.fid = 0;

				if(user.fid != undefined){
					data.fid = user.fid;
				}

				chunkLoader.postMessage({
					type: 'initChunk',
					value: data
				});
				
			}
			else{

				if(DEBUG){console.debug("Worker not yet implemented, fallback loading mode");}

				this.fallbackInitChunk();

			}

		},


		StarOS_Map.prototype.reinitChunk = function(){

			if(DEBUG){console.debug("Reinitialize chunk...");}

			this.unloadChunk();
			this.initChunk();

		},


		StarOS_Map.prototype.fallbackInitChunk = function(){

			if(DEBUG){console.debug("Fallback: \"Init entities\"");}

			$.getJSON('scripts/StarOS_json/entities.json')
			.done(function(json){
				var i, fid = 0;

				if(user.fid != undefined){
					fid = user.fid
				}

				if(!SHOW_SHIP || !SHOW_ASTEROID || USE_LOGIN){
					for(i in json){
						if(!SHOW_SHIP && json[i].type == 5){
							delete json[i];
						}
						else if(!SHOW_ASTEROID && json[i].type == 3){
							delete json[i];
						}
						else if(USE_LOGIN){
							if(json[i].fid != fid && json[i].fid != 0){
								delete json[i];
							}
						}
					}
				}

				if(DEBUG){
					console.debug("Fallback: \"Entities received\"---->");
					console.debug(json);
				}

				entDictionary = json;
				MAPCLASS.fallbackLoadChunk();
			})
			.fail(function(result, err_code, err){
				if(DEBUG){console.debug("JQXHR_play " + err);}
			});
		},


		StarOS_Map.prototype.fallbackLoadChunk = function(){

			if(DEBUG){console.debug("Fallback: \"Loading chunk\"");}
			var system = [],
				minChunkCoord = [],
				maxChunkCoord = [],
				i;

			for(i in currentSystem){
				if(currentSystem[i] >= 0){

					//systeme need to by currentSystem + 1 for chunkCoord calculation
					system[i] = currentSystem[i] + 1;

					//define coords of minChunkCoord && maxChunkCoord for positif sector pos
					maxChunkCoord[i] = system[i] * chunkSize -1;
					minChunkCoord[i] = maxChunkCoord[i] - chunkSize + 1;
				} 
				else{
					system[i] = currentSystem[i];

					//define coords of minChunkCoord && maxChunkCoord for negative sector pos
					maxChunkCoord[i] = system[i] * chunkSize;
					minChunkCoord[i] = maxChunkCoord[i] + chunkSize -1;
				}
			}
			for(i in entDictionary){
				if(entDictionary[i].sPos.x.between(minChunkCoord[0],maxChunkCoord[0])){
					if(entDictionary[i].sPos.y.between(minChunkCoord[1],maxChunkCoord[1])){
						if(entDictionary[i].sPos.z.between(minChunkCoord[2],maxChunkCoord[2])){

							lPos = entDictionary[i].localPos;
							sPos = {
								x: Math.floor(entDictionary[i].sPos.x / system[0]),
								y: Math.floor(entDictionary[i].sPos.y / system[1]),
								z: Math.floor(entDictionary[i].sPos.z / system[2])
							}

							pos = {
								x: sectorSize * sPos.x + sectorSize /2 + lPos.x,
								y: sectorSize * sPos.y + sectorSize /2 + lPos.y,
								z: sectorSize * sPos.z + sectorSize /2 + lPos.z,
							}

							centredPos = {
								x: pos.x - (sectorSize * chunkSize)/2,
								y: pos.y - (sectorSize * chunkSize)/2,
								z: pos.z - (sectorSize * chunkSize)/2
							}

							entity = {};
							entity.position = {};
							entity.sector = {};
							entity.creator	= entDictionary[i].creator;
							entity.fid		= entDictionary[i].fid;
							entity.genId	= entDictionary[i].genId;
							entity.lastMod	= entDictionary[i].lastMod;
							entity.mass		= entDictionary[i].mass;
							entity.name		= entDictionary[i].name;
							entity.position.x = centredPos.x;
							entity.position.y = centredPos.y;
							entity.position.z = centredPos.z;
							entity.power	= entDictionary[i].pw;
							entity.sector.x	= entDictionary[i].sPos.x;
							entity.sector.y	= entDictionary[i].sPos.y;
							entity.sector.z	= entDictionary[i].sPos.z;
							entity.shield	= entDictionary[i].sh;
							entity.type		= entDictionary[i].type;
							entity.uid		= entDictionary[i].uid;
							chunk.push(entity);			
						}
					}
				}
			}

			this.renderChunk();
		},


		StarOS_Map.prototype.unloadChunk = function(){

			if(DEBUG){console.debug("Remove actual entities...");}

			for(i in chunk){
				scene.remove(chunkSprite[i].sprite);
			}

			chunk = [];
			chunkSprite = [];
			chunkEnt= {};
		},


		StarOS_Map.prototype.updateChunk = function(){
			if(window.Worker && !FALLBACK){

				if(DEBUG){console.debug("Initialize worker chunkLoader.js...");}

				var data = {};
				chunkLoader = new Worker("scripts/StarOS_Map/chunkLoader.js");
				chunkLoader.onmessage = function(event){
					MAPCLASS.parseWorker(event);
				};

				data.entDictionary = entDictionary;
				data.currentSystem = currentSystem;
				data.chunkSize = chunkSize;
				data.sectorSize = sectorSize;

				chunkLoader.postMessage({
					type: 'loadChunk',
					value: data
				});
			}
			else{
				this.fallbackLoadChunk()
			}
		}


		StarOS_Map.prototype.renderChunk = function(){
			var i = 0;

			console.debug("Render chunk...");
			console.debug("calculate " + chunk.length + " entities");

			for(i; i < chunk.length; i++){
				entity = new StarmapEntity();
				entity.creator	= chunk[i].creator;
				entity.fid		= chunk[i].fid;
				entity.genId	= chunk[i].genId;
				entity.lastMod	= chunk[i].lastMod;
				entity.mass		= chunk[i].mass;
				entity.name		= chunk[i].name;
				entity.position = chunk[i].position;
				entity.power	= chunk[i].power;
				entity.sector   = chunk[i].sector;
				entity.shield	= chunk[i].shield;
				entity.type		= chunk[i].type;
				entity.uid		= chunk[i].uid;
				entity.init();

				entity.generate(camera, scene);
				chunkEnt[entity.uid] = entity;
				chunkSprite.push(entity);
			}

			this.render;
		},


		StarOS_Map.prototype.animate = function(){

			requestAnimationFrame(StarOS_Map.prototype.animate.bind(this));
			this.render();		
			this.update();

		},


		StarOS_Map.prototype.update = function(){
			
			controls.update();

			if(!THREEx.FullScreen.activated()){
				renderer.setSize(WIDTH, HEIGHT);
			}

			if (keyboard.pressed("space")){
				camera.position.set(sectorSize, sectorSize, sectorSize);
			}

			if(DEBUG){
				stats.update();
			}
		},


		StarOS_Map.prototype.render = function(){

			renderer.render(scene, camera);

		},
		

		StarOS_Map.prototype.setupEvent = function(){
			$button = $('#mapInfoButton');

			// EVENTS
			$(document).mousemove(MAPCLASS.onMouseMove);
			$(document).mousedown(MAPCLASS.onMouseDown);
			$(window).resize(function(){
				MAPCLASS.updateDomElem();
			});
			$button.click(function(){
				$('#mapInfo').toggle();
				if(this.showInfo){
					$('#mapInfoButton').css('background-image', 'url(res/img/starmap/buttonUnroll.png)');
					showInfo = false;
				} else {
					$('#mapInfoButton').css('background-image', 'url(res/img/starmap/buttonRoll.png)');
					showInfo = true;
				}
			});
			THREEx.FullScreen.bindKey({
				charCode: FS_KEY.charCodeAt(0)
			});

			//CONTROLS
			controls = new THREE.OrbitControls(camera, renderer.domElement);

			if(DEBUG){
				//STATS
				stats = new Stats();
				stats.domElement.id = "Debugs_stats";
				$parent.append(stats.domElement);

				//COORDS LABELS
				$coordX = $('<label id="CoordX"/>');
				$coordY = $('<label id="CoordY"/>');
				$coordX.text("x: 0");
				$coordY.text("y: 0");
				$coordX.css({
					'position': 'absolute',
					'left': '0px',
					'bottom': '15px'
				});
				$coordY.css({
					'position': 'absolute',
					'left': '0px',
					'bottom': '0px'
				});
				$parent.append($coordX);
				$parent.append($coordY);
			}

		},


		StarOS_Map.prototype.onMouseMove = function(event){
			event.preventDefault();

			var $canvas = $('#StarOS_mapRender');
			mouseMove.x =  ((event.clientX - $canvas.offset().left) / $canvas.width())  * 2 - 1;
			mouseMove.y = -((event.clientY - $canvas.offset().top) / $canvas.height()) * 2 + 1;

			if(DEBUG){
				$('#CoordX').text("x: " + mouseMove.x);
				$('#CoordY').text("y: " + mouseMove.y);
			}
		},


		StarOS_Map.prototype.onMouseDown = function(event){
			var vector, ray, intersect, uid;

			vector = new THREE.Vector3(mouseMove.x, mouseMove.y, 0.5);
			projector.unprojectVector(vector, camera);
			ray = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());
			intersect = ray.intersectObjects(scene.children);

			if(intersect.length > 0 && intersect[0].object.uid){
				uid = intersect[0].object.uid;
				MAPCLASS.entityMapInfo(chunkEnt[uid]);
			}
		},


		StarOS_Map.prototype.initLogin = function(){
			var $body		= $('#MapLogin_body'),
				$form 		= $('<form 	id="StarOS_LoginForm"/>'),
				$user 		= $('<label id="StarOS_UserField"/>'),
				$pass 		= $('<label id="StarOS_PassField"/>'),
				$userIn 	= $('<input type="text" id="StarOS_UserInput"/>'),
				$passIn 	= $('<input type="password" id="StarOS_PassInput"/>'),
				$connect 	= $('<input type="submit" id="StarOS_ConnectBtn"/>'),
				$invited 	= $('<input type="submit" id="StarOS_InvitBtn"/>');

			$user.text("Login:");
			$pass.text("Password:");
			$connect.val("");
			$invited.val("Invited");

			$connect.mouseover(function(){
				if(!logged){$connect.css('background-position', '0px -44px');}
				else{$connect.css('background-position', '-104px -44px');}
			});

			$connect.mouseout(function(){
				if(!logged){$connect.css('background-position', '0px 0px');}
				else{$connect.css('background-position', '-104px 0px');}
			});

			$connect.click(function(event){
				event.preventDefault();

				if(!logged){

					if($userIn.val() != "" && $passIn.val() != ""){

						jqxhr_log = $.ajax({
							url: 'includes/functions.php',
							type: 'GET',
							data: {'get': 'login', 'user': encodeURIComponent($userIn.val()), 'pass': encodeURIComponent($passIn.val())},
							dataType:'json'
						})
						.done(function(data){
							_SESSION = data;
							if(_SESSION.user != undefined){

								if(DEBUG){
									console.debug("Logged!");
									console.debug(_SESSION);
								}

								logged = true;
								$connect.css('background-position', '-104px 0px');
								$user.css('visibility', 'hidden');
								$userIn.css('visibility', 'hidden');
								$pass.css('visibility', 'hidden');
								$passIn.css('visibility', 'hidden');
								MAPCLASS.retrievingPlayer();
								MAPCLASS.reinitChunk();

							} else {

								console.debug(data);
								alert("Bad login");

							}
						})
						.fail(function(result, err_code, err){
							if(DEBUG){console.debug("JQXHR_log " + err);}
						});

					}
					else{
						alert("All fields are not filled");
					}
				}
				else{

					var jqxhr_logout = $.ajax({
						url: 'includes/functions.php',
						type: 'GET',
						data: {'get': 'logout'},
						dataType: 'json'
					})
					.done(function(data){
						if(DEBUG){
							console.debug("logout");
							console.debug(_SESSION);
						}

						logged = false;
						_SESSION = data;
						$connect.css('background-position', '0px 0px');
						$user.css('visibility', 'visible');
						$userIn.css('visibility', 'visible');
						$pass.css('visibility', 'visible');
						$passIn.css('visibility', 'visible');
						MAPCLASS.reinitChunk();
					})
					.fail(function(result, err_code, err){
						if(DEBUG){console.debug("JQXHR_logout " + err);}
						alert("Error: impossible to disconnect.");
					});

				}
			});

			if(logged){
				$connect.css('background-position', '-104px 0px');
				$user.css('visibility', 'hidden');
				$userIn.css('visibility', 'hidden');
				$pass.css('visibility', 'hidden');
				$passIn.css('visibility', 'hidden');
				this.retrievingPlayer();
			}

			$form.append($user);
			$form.append($userIn);
			$form.append($pass);
			$form.append($passIn);
			$form.append($connect);

			$body.append($form);
		},


		StarOS_Map.prototype.entityMapInfo = function(entity){
			if(DEBUG){
				console.debug("Show entity info:");
				console.debug(entity);
			}
			
			var $mapInfo = $('#mapInfo'),
				$img = $('<img id="mapInfPic" class="mapInfo"/>'),
				$name = $('<h4 id="mapInfName" class="mapInfo"/>'),
				$type = $('<label id="mapInfType" class="mapInfo"/>'),
				$pos = $('<label id="mapInfPos" class="mapInfo"/>'),
				$fac = $('<label id="mapInfFac" class="mapInfo"/>'),
				$mass = $('<label id="mapInfMass" class="mapInfo"/>'),
				$pow = $('<label id="mapInfPow" class="mapInfo"/>'),
				$sh = $('<label id="mapInfSh" class="mapInfo"/>'),
				$shRate = $('<label id="mapInfShRate" class="mapInfo"/>'),
				$border = $('<div id="mapInfBrd"/>'),
				facName = "None",
				isHomeworld = false,
				faction = SHOW_ENT_INFO.faction,
				mass = SHOW_ENT_INFO.mass,
				power = SHOW_ENT_INFO.power,
				shield = SHOW_ENT_INFO.shield,
				shieldBlocks = getShieldBlocks(entity.shield),
				rechargeRate = getShieldRate(shieldBlocks),
				mapInfoHeight = 0,
				offsetTop = 3,
				offsetSepar = 8,
				margin;


			$mapInfo.empty();
			$mapInfo.show();

			$img = $('<img id="mapInfPic" class="mapInfo"/>');
			$img.attr('src', entity.texture.sourceFile);
			$img.attr('width', entity.scale[0]);
			$img.attr('height', entity.scale[1]);
			$mapInfo.append($img);
			margin = ($mapInfo.width() - $img.width()) / 2;
			$img.css({
				"left": margin + "px",
				"top": (125 - $img.height()) / 2 + "px"
			})

			mapInfoHeight = 125;

			$name.text(entity.name);
			$mapInfo.append($name);
			margin = ($mapInfo.width() - $name.width()) / 2;
			$name.css({
				"left": margin + "px",
				"top": mapInfoHeight + "px"
			});

			mapInfoHeight += $name.height();
			mapInfoHeight += offsetSepar;

			$type.text("Type: " + entity.typeLabel);
			$mapInfo.append($type);
			$type.css("top", mapInfoHeight + "px");

			mapInfoHeight += $type.height();
			mapInfoHeight += offsetTop;

			$pos.text("Sector: " + entity.sector.x + ", " + entity.sector.y + ", " + entity.sector.z);
			$mapInfo.append($pos);
			$pos.css("top", mapInfoHeight + "px");

			mapInfoHeight += $type.height();

			if(faction){
				mapInfoHeight += offsetTop;

				for(i in facDictionary){
					if(entity.fid == facDictionary[i].id){
						facName = facDictionary[i].name;
						isHomeworld = (entity.uid == facDictionary[i].home) ? true : false;
					}
				}

				isHomeworld ? $fac.text("Faction: " + facName + "'s Homeworld") : $fac.text("Faction: " + facName);
				$fac.css("top", mapInfoHeight + "px");
				$mapInfo.append($fac);

				mapInfoHeight += $fac.height();
				mapInfoHeight += offsetTop;
			}


			if(mass || power || shield){
				mapInfoHeight += offsetSepar;
				if(mass){
					$mass.text("Mass: " + entity.mass);
					$mapInfo.append($mass);
					$mass.css("top", mapInfoHeight + "px");

					mapInfoHeight += $mass.height();
					mapInfoHeight += offsetTop;
				}

				if(power){
					$pow.text("Max power: " + entity.power);
					$mapInfo.append($pow);
					$pow.css("top", mapInfoHeight + "px");

					mapInfoHeight += $pow.height();
					mapInfoHeight += offsetTop;
				}

				if(shield){
					$sh.text("Max shield: " + entity.shield);
					$mapInfo.append($sh);
					$sh.css("top", mapInfoHeight + "px");

					mapInfoHeight += $sh.height();
					mapInfoHeight += offsetTop;

					$shRate.text("Shield recharge: " + rechargeRate + " s/sec");
					$mapInfo.append($shRate);
					$shRate.css("top", mapInfoHeight + "px");
					
					mapInfoHeight += $shRate.height();
					mapInfoHeight += offsetTop;
				}
			} else {
				mapInfoHeight += offsetTop;
			}

			$mapInfo.append($border);
			mapInfoHeight -= offsetTop;
			$border.css("top", mapInfoHeight + "px");
			$mapInfo.height(mapInfoHeight);
		},


		StarOS_Map.prototype.systemSelector = function(){
			var $parent = $('#sysSelect');
				$xField = $('<input type="text" id="sysSelectFX"/>'),
				$yField = $('<input type="text" id="sysSelectFY"/>'),
				$zField = $('<input type="text" id="sysSelectFZ"/>'),
				$button = $('<input type="submit" id="sysSelectBtn"/>');

			$xField.val("0");
			$yField.val("0");
			$zField.val("0");
			$button.val("Search");

			$xField.keyup(function () { 
				this.value = this.value.replace(/[^0-9\.-]/g,'');
			});
			$yField.keyup(function () { 
				this.value = this.value.replace(/[^0-9\.-]/g,'');
			});;
			$zField.keyup(function () { 
				this.value = this.value.replace(/[^0-9\.-]/g,'');
			});

			$button.click(function(e){
				e.preventDefault();
				$xField.val() == "" ? $xField.val(0) : $xField.val();
				$yField.val() == "" ? $yField.val(0) : $xField.val();
				$zField.val() == "" ? $zField.val(0) : $xField.val();

				currentSystem[0] = parseInt($xField.val());
				currentSystem[1] = parseInt($yField.val());
				currentSystem[2] = parseInt($zField.val());

				MAPCLASS.unloadChunk();
				MAPCLASS.updateChunk();
			});

			$parent.append($xField);
			$parent.append($yField);
			$parent.append($zField);
			$parent.append($button);
		},


		StarOS_Map.prototype.updateDomElem = function(){
			var $StarOS_Map = $('#StarOS_map'),
				$starmap_BrdL = $('#starmap_borderL'),
				$starmap_BrdR = $('#starmap_borderR'),
				$starmap_BrdT = $('#starmap_borderT'),
				$starmap_BrdB = $('#starmap_borderB')

			WIDTH = $StarOS_Map.width() - ($starmap_BrdL.width() + $starmap_BrdR.width());
			HEIGHT = $StarOS_Map.height() - ($starmap_BrdT.height() + $starmap_BrdB.height());

			$parent.width(WIDTH);
			$starmap_BrdT.width(WIDTH);
			$starmap_BrdB.width(WIDTH);
			$parent.height(HEIGHT);
			$starmap_BrdL.height(HEIGHT);
			$starmap_BrdR.height(HEIGHT);

			if(DEBUG){
				$('#sysSelect').css('top', '55px');
			}

			// notify the renderer of the size change
			renderer.setSize(WIDTH, HEIGHT);
			// update the camera
			camera.aspect = WIDTH / HEIGHT;
			camera.updateProjectionMatrix();
		};


		StarOS_Map.prototype.parseWorker = function(event){
			var data = event.data;

			if(data.type === 'debug' && DEBUG){
				if(data.object){
					console.debug(data.object);
				}

				console.debug(data.value);

			}
			else if(data.type === 'entDic'){
				if(DEBUG){
					console.debug(data.value);
					console.debug(data.object);
				}

				entDictionary = data.object;

			}
			else if(data.type === 'chunk'){
				if(DEBUG){
					console.debug(data.value);
					console.debug(data.object);
				}

				chunk = data.object;
				MAPCLASS.renderChunk();
			}

		},


		this.init()
	}
};

getShieldBlocks = function(shield){
	power = 2/3;
	return Math.round(Math.pow(shield / 350 , 1 /power)) / 3.5;
};

getShieldRate = function(blocks){
	return Math.floor(Math.pow(blocks * 5, 0.5) * 50);
};

Number.prototype.between = function(first,last){
	return (first < last ? this >= first && this <= last : this >= last && this <= first);
};