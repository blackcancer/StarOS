/*
	Product: StarOS Map
	Description: This script generate a 3D Starmap for starmade
	License: http://creativecommons.org/licenses/by/3.0/legalcode

	FileVersion: 0.5-rev00011					Date: 2013-12-28
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
			systemDict ={},
			systemSprite =[],
			facDictionary ={},
			user = {},
			mouseMove ={},
			chunks = [],
			chunkSprite = [],
			chunkEnt = {},
			chunkSize = 16,
			currentSystem = [0, 0, 0],
			sectorSize = 1300,   //sector marge is included
			intersected = false,
			logged = false,
			showInfo = false,
			sysView = false,
			keyboard, projector, scene, camera, renderer, controls, stats, chunkLoader, systemLoader;

		StarOS_Map.prototype.init = function(){
			
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
					MAPCLASS.logs("Load _SESSION...");
					_SESSION = json;
				})
				.fail(function(result, err_code, err){
					MAPCLASS.logs("JQXHR_session " + err);
				});

				if(_SESSION.user != undefined){
					this.logs("Logged!");
					logged = true;
				}
				this.initLogin();
			}
			
			this.initWebGL();
			this.initSkybox();
			
			this.updateDomElem();
			this.initWorker('initSystemDict');
			this.setupEvent();

			this.animate = this.animate.bind(this);
			this.animate();
		},


		StarOS_Map.prototype.getPlayer = function(){
			this.logs("Requesting Stats_"+ _SESSION.user.name +".json...");
			
			jqxhr_play = $.ajax({
				url:'scripts/StarOS_json/Players/Stats_'+ _SESSION.user.name +'.json',
				type: 'GET',
				async: false,
				dataType: 'json'
			})
			.done(function(json){user = json;})
			.fail(function(result, err_code, err){
				MAPCLASS.logs("JQXHR_play " + err);
			});
			
			this.logs("Player data:", user);
		},


		StarOS_Map.prototype.getFactions = function(){
			this.logs("Requesting factions.json...");

			jqxhr_fac = $.getJSON('scripts/StarOS_json/factions.json')
			.done(function(json){facDictionary = json;})
			.fail(function(result, err_code, err){
				MAPCLASS.logs("JQXHR_fac " + err);
			});
		},


		StarOS_Map.prototype.initWebGL = function(){

			this.logs("Initialize WebGL...");

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

				this.logs("Use WebGLRenderer...");

				renderer = new THREE.WebGLRenderer({
					antialias: true
				});

			}
			else{

				this.logs("Use CanvasRenderer...");

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

			this.logs("Initialize skyBox...");

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
		
		
		StarOS_Map.prototype.initWorker = function(command, data){
			if(window.Worker && !FALLBACK){
				
				this.logs("Initialize worker worker_systemLoader.js...");

				systemLoader = new Worker("scripts/StarOS_Map/worker_systemLoader.js");
				systemLoader.onmessage = function(event){
					MAPCLASS.parseWorker(event);
				};
				systemLoader.postMessage({
					command: command,
					data: data,
				});
			}
			else{				
				this.logs("Worker not yet implemented, fallback loading mode...");
				
				switch(command){
					case 'initSystemDict':
						this.fallbackInitSysDict();
						break;
					case 'initSectors':
						this.fallbackInitSectors(data);
						break;
					default:
						this.logs("Unknow command -> " + command);
						break;
				}
			}
			
		},


		StarOS_Map.prototype.fallbackInitSysDict = function(){
			this.logs("Fallback loading system dictionnary");
			this.loading("Fallback loading system from database...");

			$.getJSON('scripts/StarOS_json/Entities/systems.json')
			.done(function(json){
				var sys, coords;
				
				for(sys in json){
					coords = json[sys].split("_");
					systemDict[sys] = {
						x: parseInt(coords[0]),
						y: parseInt(coords[1]),
						z: parseInt(coords[2])
					}
				}

				MAPCLASS.renderSystem();
			})
			.fail(function(result, err_code, err){
				MAPCLASS.logs("GetJson fallback system dictionnary " + err);
			})
		},


		StarOS_Map.prototype.renderSystem = function(){
			this.logs("Render global systems view...");

			var texture = THREE.ImageUtils.loadTexture("res/img/starmap/icons/disc.png");
			
			for(key in systemDict){
				var material, sprite;

				material = new THREE.SpriteMaterial({
					map: texture,
					useScreenCoordinates: false,
					color: 0xffffff
				});
				material.color.setHSL(0.5, 0.75, 0.5 );
				
				sprite = new THREE.Sprite(material);
				sprite.position = {
					x: systemDict[key].x * 500,
					y: systemDict[key].y * 500,
					z: systemDict[key].z * 500
				};
				
				sprite.scale.set(200, 200, 1.0)
				sprite.StarOS_uid = "Sys" + key;
				systemSprite.push(sprite)
				scene.add(sprite);
			}
			$('#StarOS_Loading').hide();
		},


		StarOS_Map.prototype.fallbackInitSectors = function(data){
			var folder = currentSystem[0] + "_" + currentSystem[1] + "_" + currentSystem[2],
				folders = [],
				entFiles = [],
				i, str;
				
			this.logs("Fallback loading sectors");
			this.loading("Fallback loading sectors from database...");
			
			$.ajax({
				url: "scripts/StarOS_json/Entities/" + folder + "/sectors.json",
				type: 'GET',
				async: false,
				dataType: 'json'
			})
			.done(function(json){
				
				for(sec in json){
					folders.push("scripts/StarOS_json/Entities/" + folder + "/" + json[sec] + "/");
				}
				
				for(i = 0; i < folders.length; i++){
					$.ajax({
						url: folders[i] + "entities.json",
						type: 'GET',
						async: false,
						dataType: 'json'
					})
					.done(function(json){
						
						for(fid in json){
							if(USE_LOGIN){
								if(fid != 0 && fid != data.fid){
									delete json[fid];
								}
							}
							
							if(json[fid] != undefined){
								if(!SHOW_SHIP || !SHOW_ASTEROID){
									for(ent in json[fid]){
										str = json[fid][ent];
										if(!SHOW_SHIP && str.indexOf("_SHIP_") != -1){
											delete json[fid][ent];
										}
										
										if(!SHOW_ASTEROID && str.indexOf("_FLOATINGROCK_") != -1){
											delete json[fid][ent];
										}
									}
								}
								
								if(Object.keys(json[fid]).length === 0){
									delete json[fid];
								}
							}
							
							for(ent in json[fid]){
								entFiles.push(folders[i] + json[fid][ent]);
							}
						}
						
					})
					.fail(function(result, err_code, err){
						MAPCLASS.logs("GetJson fallback entities list in " + folders + " " + err);
					});
				}
			})
			.fail(function(result, err_code, err){
				MAPCLASS.logs("GetJson fallback sectors list " + err);
			});
			
			this.fallbackLoadEntities(entFiles);
		},


		StarOS_Map.prototype.fallbackLoadEntities = function(entFiles){
			var system = [],
				entity = {},
				lPos = {},
				sPos = {},
				pos = {},
				centredPos = {},
				i, uid;

			this.logs("Fallback loading entities files");
			this.loading("Fallback loading entities from database...");

			for(i in currentSystem){
				system[i] = currentSystem[i];
				if(system[i] >= 0){
					system[i] = currentSystem[i] +1;
				}
			}

			for(i = 0; i < entFiles.length; i++){
				$.ajax({
					url: entFiles[i],
					type: 'GET',
					async: false,
					dataType: 'json'
				})
				.done(function(json){
					uid = Object.keys(json)[0];
		
					sPos = {
						x: json[uid].transformable.sPos.x / system[0],
						y: json[uid].transformable.sPos.y / system[1],
						z: json[uid].transformable.sPos.z / system[2]
					};
										
					pos = {
						x: sectorSize * sPos.x + sectorSize /2 + json[uid].transformable.localPos.x,
						y: sectorSize * sPos.y + sectorSize /2 + json[uid].transformable.localPos.y,
						z: sectorSize * sPos.z + sectorSize /2 + json[uid].transformable.localPos.z,
					};
				
					centredPos = {
						x: pos.x - (sectorSize * chunkSize)/2,
						y: pos.y - (sectorSize * chunkSize)/2,
						z: pos.z - (sectorSize * chunkSize)/2
					};
					
					entity = {
						creator: json[uid].creatorId.creator,
						fid: json[uid].transformable.fid,
						genId: json[uid].creatorId.genId,
						lastMod: json[uid].creatorId.lastMod,
						mass: json[uid].transformable.mass.toFixed(1),
						name: json[uid].transformable.realname,
						position: centredPos,
						power: Math.round((json[uid].container != undefined)? json[uid].container.power : 0),
						sector: json[uid].transformable.sPos,
						shield: (json[uid].container != undefined)? json[uid].container.shield : 0,
						type: json[uid].type,
						uid: uid
					}
					
					chunks.push(entity);
				})
				.fail(function(result, err_code, err){
					MAPCLASS.logs("GetJson fallback entity file" + folders[i] + " " + err);
				});
			}

			this.renderChunk();
		},
		
		
		StarOS_Map.prototype.unloadSprite = function(array){
			this.logs("Unload objects...");
			for(i = 0; i < array.length; i++){
				scene.remove(array[i]);
			}
			return array = [];
		},


		StarOS_Map.prototype.renderChunk = function(){
			var i = 0,
				material, sprite, texture;
			
			this.logs("Render chunk...");
			this.logs("calculate " + (chunks.length + 1) +" entities");

			for(i; i < chunks.length; i++){
				entity = new StarmapEntity();
				entity.creator	= chunks[i].creator;
				entity.fid		= chunks[i].fid;
				entity.genId	= chunks[i].genId;
				entity.lastMod	= chunks[i].lastMod;
				entity.mass		= chunks[i].mass;
				entity.name		= chunks[i].name;
				entity.position = chunks[i].position;
				entity.power	= chunks[i].power;
				entity.sector   = chunks[i].sector;
				entity.shield	= chunks[i].shield;
				entity.type		= chunks[i].type;
				entity.uid		= chunks[i].uid;
				entity.init();
				
				entity.generate(camera, scene);
				chunkEnt[entity.uid] = entity;
				chunkSprite.push(entity.sprite);
			}

			if(chunks.length == 0){
				$('#StarOS_Empty').show();
				$('#empty-text').html("Everything that is not part of your faction is hidden");
			}
			texture = THREE.ImageUtils.loadTexture("res/img/starmap/icons/disc.png");

			material = new THREE.SpriteMaterial({
				map: texture,
				useScreenCoordinates: false,
				color: 0xffffff
			});
			material.color.setHSL(0.12, 0.75, 0.5 );
			
			sprite = new THREE.Sprite(material);
			sprite.position = {
				x: 0,
				y: 0,
				z: 0
			};
				
			sprite.scale.set(500, 500, 1.0)
			sprite.StarOS_uid = "Sun";
			chunkSprite.push(sprite)
			scene.add(sprite);
			
			this.render;
			$('#StarOS_backBtn').toggle();
			$('#StarOS_Loading').hide();
		},


		StarOS_Map.prototype.animate = function(){

			requestAnimationFrame(StarOS_Map.prototype.animate.bind(this));
			this.render();		
			this.update();

		},


		StarOS_Map.prototype.update = function(){
			var vector, ray, intersect, uid;

			vector = new THREE.Vector3(mouseMove.x, mouseMove.y, 0.5);
			projector.unprojectVector(vector, camera);
			ray = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());
			intersect = ray.intersectObjects(scene.children);

			if(intersect.length > 0 && intersect[0].object.StarOS_uid){
				uid = intersect[0].object.StarOS_uid;

				if(uid.indexOf("Sys") != -1){

					uid = uid.replace("Sys", '');
					str = systemDict[uid].x + ", " + systemDict[uid].y + ", " + systemDict[uid].z;
					$('#StarOS_object-coords').html(str);
					$('#StarOS_object-coords').show();
				}
				else{
					$('#StarOS_object-coords').html();
					$('#StarOS_object-coords').hide();
				}
			}
			else{
				$('#StarOS_object-coords').html();
				$('#StarOS_object-coords').hide();
			}
			
			controls.update();

			if(!THREEx.FullScreen.activated()){
				renderer.setSize(WIDTH, HEIGHT);
			}

			if (keyboard.pressed("space")){
				camera.position.set(sectorSize * 4, sectorSize * 4, sectorSize * 4);
			}

			if(DEBUG){
				stats.update();
			}
		},


		StarOS_Map.prototype.render = function(){

			renderer.render(scene, camera);

		},
		

		StarOS_Map.prototype.setupEvent = function(){
			var $button = $('#mapInfoButton'),
				$back 	= $('#StarOS_backBtn');

			// EVENTS
			$(document).mousemove(MAPCLASS.onMouseMove);
			$(document).mousedown(MAPCLASS.onMouseDown);
			$(window).resize(function(){
				MAPCLASS.updateDomElem();
			});

			$button.click(function(){
				if(!$('#mapInfo').is(':empty')){
					$('#mapInfo').toggle();
					if(showInfo){
						$('#mapInfoButton').css('background-position', '0px -20px');
						showInfo = false;
					} else {
						$('#mapInfoButton').css('background-position', '0px 0px');
						showInfo = true;
					}
				}
			});

			$back.click(function(){
				chunkSprite = MAPCLASS.unloadSprite(chunkSprite);
				chunks = [];
				chunkEnt= {};

				MAPCLASS.renderSystem();
				$('#StarOS_Empty').hide();
				$(this).toggle();
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

				//Back putton pos
				$back.css({
					'top': $(Debugs_stats).offset().top + $(Debugs_stats).height() + "px"
				})
				//COORDS LABELS
				$divCoords = $('<div id="CoordBox"/>');
				$coordX = $('<label id="CoordX"/>');
				$coordY = $('<label id="CoordY"/>');
				$coordX.text("x: 0");
				$coordY.text("y: 0");
				$divCoords.css({
					'background-color': 'rgb(8, 8, 24)',
					'position': 'absolute',
					'left': '0px',
					'bottom': '0px',
					'margin': '0px',
					'padding': '0px',
					'height': '40px',
					'width': '210px'
				});

				$coordX.css({
					'position': 'absolute',
					'left': '5px',
					'bottom': '20px'
				});

				$coordY.css({
					'position': 'absolute',
					'left': '5px',
					'bottom': '5px'
				});

				$divCoords.append($coordX);
				$divCoords.append($coordY);
				$parent.append($divCoords);
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

			if(intersect.length > 0 && intersect[0].object.StarOS_uid){
				uid = intersect[0].object.StarOS_uid;

				if(uid.indexOf("Sys") != -1){

					uid = uid.replace("Sys", '');
					currentSystem = [systemDict[uid].x, systemDict[uid].y, systemDict[uid].z];

					var data ={};
					data.currentSystem = currentSystem;
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

					systemSprite = MAPCLASS.unloadSprite(systemSprite);
					MAPCLASS.initWorker('initSectors', data);
				}
				else if(uid.indexOf("Sun") != -1){
				}
				else{
					MAPCLASS.entityMapInfo(chunkEnt[uid]);
				}
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

								MAPCLASS.logs("Logged!", _SESSION);

								logged = true;
								$connect.css('background-position', '-104px 0px');
								$user.css('visibility', 'hidden');
								$userIn.css('visibility', 'hidden');
								$pass.css('visibility', 'hidden');
								$passIn.css('visibility', 'hidden');
								MAPCLASS.getPlayer();
								MAPCLASS.reinitChunk();

							} else {

								MAPCLASS.logs(data);
								alert("Bad login");

							}
						})
						.fail(function(result, err_code, err){
							MAPCLASS.logs("JQXHR_log " + err);
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
						MAPCLASS.logs("logout");

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
						MAPCLASS.logs("JQXHR_logout " + err);
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
				this.getPlayer();
			}

			$form.append($user);
			$form.append($userIn);
			$form.append($pass);
			$form.append($passIn);
			$form.append($connect);

			$body.append($form);
		},


		StarOS_Map.prototype.entityMapInfo = function(entity){
			this.logs("Show entity info", entity)
			
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
			$('#mapInfoButton').css('background-position', '0px 0px');
			showInfo = true;
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

			if(entity.type == 4){
				$type.text("Type: " + entity.typeLabel);
				$mapInfo.append($type);
				$type.css("top", mapInfoHeight + "px");

				mapInfoHeight += $type.height();
				mapInfoHeight += offsetTop;
			}

			$pos.text("Sector: " + entity.sector.x + ", " + entity.sector.y + ", " + entity.sector.z);
			$mapInfo.append($pos);
			$pos.css("top", mapInfoHeight + "px");

			mapInfoHeight += $pos.height();

			if(faction && entity.fid != 0){
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
					if(entity.mass == 0){
						$mass.text("Mass: Unknown");
					}
					else{
						$mass.text("Mass: " + entity.mass);
					}
					$mapInfo.append($mass);
					$mass.css("top", mapInfoHeight + "px");

					mapInfoHeight += $mass.height();
					mapInfoHeight += offsetTop;
				}

				if(power){
					if(entity.type != 1 && entity.type != 3){
						if(entity.power == 0){
							$pow.text("Max power: Unknown");
						}
						else{
							$pow.text("Max power: " + entity.power);
						}
						$mapInfo.append($pow);
						$pow.css("top", mapInfoHeight + "px");
	
						mapInfoHeight += $pow.height();
						mapInfoHeight += offsetTop;
					}
				}

				if(shield && entity.shield != 0){
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
			}
			else {
				mapInfoHeight += offsetTop;
			}

			$mapInfo.append($border);
			mapInfoHeight -= offsetTop;
			$border.css("top", mapInfoHeight + "px");
			$mapInfo.height(mapInfoHeight);
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

			switch(data.type){
				case 'debug':
					this.logs(data.value, data.data, data.source);
					break;
					
				case 'renderSystem':
					systemDict = data.value;
					this.renderSystem();
					break;
					
				case 'renderChunk':
					chunks = data.value;
					this.renderChunk();
					break;
					
				case 'load':
					this.loading(data.value);
					break;
					
				default:
					this.logs("Invalide worker's data type -> " + data.type);
					break;
			}
		},


		StarOS_Map.prototype.loading = function(string){
			$('#StarOS_Loading').show();
			$('#loading-text').html(string);
		},


		StarOS_Map.prototype.logs = function( string, data, source){
			filesource = source || "StarOS_Map.js"
			if(DEBUG){
				console.debug(filesource + ": \"" + string + "\"");
				if(data != undefined){
					console.debug(data);
				}
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