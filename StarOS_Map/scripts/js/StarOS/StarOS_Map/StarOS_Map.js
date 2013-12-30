/*
   Product: StarOS Map
   Description: This script generate a 3D Starmap for starmade
   License: http://creativecommons.org/licenses/by/3.0/legalcode

   FileVersion: 0.4							Date: 2013-12-28
   By Blackcancer
  
   website: http://initsysrev.net
   support: blackcancer@initsysrev.net
*/

var StarOS_Map = function(options){
	this.settings = options || {};
	if(!this.settings.parentId){
		alert("StarOS Map: You must specify the parentId parameter.");
	} 
	else {
		StarOS_Map.prototype.init = function(){
			this.DEFAULT_WIDTH	= 800;
			this.DEFAULT_HEIGHT = 600;
			this.DEFAULT_FS_KEY = "f";
			this.DEFAULT_SPAWN  = {
				x: 8,
				y: 8,
				z: 8
			};
			this.DEFAULT_SHOW_SHIP = false;
			this.DEFAULT_SHOW_ASTEROID = false;
			this.DEFAULT_DEBUG = false;

			this.entityDictionary = new Object;
			this.factionDictionary = new Object;
			this.mouseMove = new Object;
			this.spawnPos = new Object;
			this.chunk = new Array;
			this.chunkSize = 16;
			this.currentSystem = [0, 0, 0];
			this.sectorSize = 1300;
			this.mapScale = 4.7;
			this.intersected = false;
			this.container = $('#' + this.settings.parentId);
			this.showInfo = false;

			this.stageWidth  = parseInt(this.settings.width || this.DEFAULT_WIDTH);
			this.stageHeight = parseInt(this.settings.height || this.DEFAULT_HEIGHT);
			this.stageFsKey = this.settings.FsKey || this.DEFAULT_FS_KEY;
			this.stageShowShip = this.settings.showShip || this.DEFAULT_SHOW_SHIP;
			this.stageShowAsteroid = this.settings.showAsteroid || this.DEFAULT_SHOW_ASTEROID;
			this.stageDebug = this.settings.debug || this.DEFAULT_DEBUG;
			
			this.DEFAULT_VIEW = {
				ASPECT: this.stageWidth / this.stageHeight,
				ANGLE: 	45,
				NEAR:	0.1,
				FAR: 	4100000
			};

			if(this.settings.view != undefined){
				this.stageView = {
					aspect: parseInt(this.settings.view.aspect || this.DEFAULT_VIEW.ASPECT),
					angle:  parseInt(this.settings.view.angle  || this.DEFAULT_VIEW.ANGLE),
					near:   parseInt(this.settings.view.near   || this.DEFAULT_VIEW.NEAR),
					far:    parseInt(this.settings.view.far    || this.DEFAULT_VIEW.FAR)
				}
			} else {
				this.stageView = {
					aspect: this.DEFAULT_VIEW.ASPECT,
					angle:  this.DEFAULT_VIEW.ANGLE,
					near:   this.DEFAULT_VIEW.NEAR,
					far:    this.DEFAULT_VIEW.FAR
				}
			}

			if(this.settings.spawn != undefined){
				this.stageSpawn = {
					x: parseInt(this.settings.spawn.x || this.DEFAULT_SPAWN.x),
					y: parseInt(this.settings.spawn.y || this.DEFAULT_SPAWN.y),
					z: parseInt(this.settings.spawn.z || this.DEFAULT_SPAWN.z)
				}
			} else {
				this.stageSpawn = {
					x: this.DEFAULT_SPAWN.x,
					y: this.DEFAULT_SPAWN.y,
					z: this.DEFAULT_SPAWN.z
				}
			}

			this.spawnPos = {
				x: ((this.stageSpawn.x * this.sectorSize) + (this.sectorSize / 2)) / this.mapScale,
				y: ((this.stageSpawn.y * this.sectorSize) + (this.sectorSize / 2)) / this.mapScale,
				z: ((this.stageSpawn.z * this.sectorSize) + (this.sectorSize / 2)) / this.mapScale
			};
			this.initWebGL();
			this.setupEvent();
			this.systemSelector();

			this.animate = this.animate.bind(this);
			this.animate();
		},

		StarOS_Map.prototype.initWebGL = function(){
			this.keyboard = new THREEx.KeyboardState();
			this.projector = new THREE.Projector();
			this.scene = new THREE.Scene();
			this.camera = new THREE.PerspectiveCamera(
				this.stageView.angle,
				this.stageView.aspect,
				this.stageView.neat,
				this.stageView.far
			);
			if(Detector.webgl){
				this.renderer = new THREE.WebGLRenderer({
					antialias: true
				});
			} else {
				this.renderer = new THREE.CanvasRenderer();
			}

			this.scene.add(this.camera);
			this.camera.position.set(this.spawnPos.x, this.spawnPos.y, 10000);
			this.camera.lookAt(this.spawnPos);

			this.renderer.setSize(this.stageWidth, this.stageHeight);
			this.renderer.domElement.id = "StarmapRenderer";
			this.container.append(this.renderer.domElement);
			this.container.width(this.stageWidth);
			this.container.height(this.stageHeight);

			this.initSkybox();
			this.loadChunk();
			this.initFaction();
		},

		StarOS_Map.prototype.initSkybox = function(){
			var imagePrefix = "res/img/starmap/skybox/generic_",
			 	directions  = ["posx", "negx", "posy", "negy", "posz", "negz"],
			    imageSuffix = ".png",
				geometry = new THREE.CubeGeometry(this.stageView.far, this.stageView.far, this.stageView.far),   
				materialArray = [];
				
			for (var i = 0; i < 6; i++)
				materialArray.push(new THREE.MeshBasicMaterial({
					map: THREE.ImageUtils.loadTexture(imagePrefix + directions[i] + imageSuffix),
					side: THREE.BackSide
				}));
			var material = new THREE.MeshFaceMaterial( materialArray ),
				skyBox = new THREE.Mesh(geometry, material);
			this.scene.add(skyBox);
		},
		
		StarOS_Map.prototype.loadChunk = function(){
			var StarMap = this,
				jqxhr = $.getJSON('scripts/js/StarOS/StarOS_json/entities.json')
			.done(function(json){
				var	system = new Array,
					minChunkCoord = new Array,
					maxChunkCoord = new Array;
					isPositive = false;
				$.each(StarMap.currentSystem, function(i){
					if(StarMap.currentSystem[i] >= 0){
						system[i] = StarMap.currentSystem[i] + 1;
						maxChunkCoord[i] = system[i] * StarMap.chunkSize -1;
						minChunkCoord[i] = maxChunkCoord[i] - StarMap.chunkSize + 1;
					} else{
						system[i] = StarMap.currentSystem[i];
						maxChunkCoord[i] = system[i] * StarMap.chunkSize;
						minChunkCoord[i] = maxChunkCoord[i] + StarMap.chunkSize -1;
					}
				});
				if(!StarMap.stageShowShip){
					$.each(json,function(i){
					   if(json[i].type == 5 ){
						   delete json[i];
					   }
					});
				}
				if(!StarMap.stageShowAsteroid){
					$.each(json,function(i){
					   if(json[i].type == 3 ){
						   delete json[i];
					   }
					});
				}
				$.each(json,function(i){					
					if(json[i].sPos.x.between(minChunkCoord[0],maxChunkCoord[0])){
						if(json[i].sPos.y.between(minChunkCoord[1],maxChunkCoord[1])){
							if(json[i].sPos.z.between(minChunkCoord[2],maxChunkCoord[2])){
								entity = new StarmapEntity();
								entity.creator	= json[i].creator;
								entity.fid		= json[i].fid;
								entity.genId	= json[i].genId;
								entity.lastMod	= json[i].lastMod;
								entity.mass		= json[i].mass;
								entity.name		= json[i].name;
								entity.position.x = StarMap.sectorSize * Math.floor(json[i].sPos.x / system[0] ) + json[i].localPos.x;
								entity.position.y = StarMap.sectorSize * Math.floor(json[i].sPos.y / system[1] ) + json[i].localPos.y;
								entity.position.z = StarMap.sectorSize * Math.floor(json[i].sPos.z / system[1] ) + json[i].localPos.z;
								entity.power	= json[i].pw;
								entity.sector.x	= json[i].sPos.x;
								entity.sector.y	= json[i].sPos.y;
								entity.sector.z	= json[i].sPos.z;
								entity.shield	= json[i].sh;
								entity.type		= json[i].type;
								entity.uid		= json[i].uid;
								entity.init();
								entity.generate(StarMap.camera, StarMap.scene, StarMap.mapScale);
								
								StarMap.entityDictionary[entity.uid] = entity;
								StarMap.chunk.push(entity.sprite);
							}
						}
					}
				});
			})
			.fail(function(result, err_code, err){console.debug("Ajax error: " + err);})
			.always(function(){});
		},
		
		StarOS_Map.prototype.unloadChunk = function(){
			var StarMap = this;
			$.each(this.chunk, function(i){
				StarMap.scene.remove(StarMap.chunk[i]);
			});
			this.chunk = [];
		},
		
		StarOS_Map.prototype.initFaction = function(){
			var StarMap = this;
			jqxhrFaction = $.getJSON('scripts/js/StarOS/StarOS_json/factions.json')
			.done(function(json){
				StarMap.factionDictionary = json;
			})
			.fail(function(result, err_code, err){console.debug("Ajax error: " + err);})
			.always(function(){});
		},

		StarOS_Map.prototype.setupEvent = function(){
			// EVENTS
			THREEx.WindowResize(this.renderer, this.camera);
			THREEx.FullScreen.bindKey({
				charCode: this.stageFsKey.charCodeAt(0)
			});
			
			//CONTROLS
			this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
			
			//STATS
			if(this.stageDebug){
				this.stats = new Stats();
				this.stats.domElement.style.position = 'absolute';
				this.stats.domElement.style.top = this.container.offset().top + 'px';
				this.stats.domElement.style.left = (this.container.width() + this.container.offset().left - 80) + 'px';
				this.stats.domElement.style.zIndex = 100;
				this.container.append(this.stats.domElement);
			}
			
			//EVENT LISTENER
			document.addEventListener( 'mousemove', this.onMouseMove.bind(this), false );
			document.addEventListener( 'mousedown', this.onMouseDown.bind(this), false );
			$button = $('#mapInfoButton');
			$button.css('top', $("#StarmapRenderer").offset().top + 'px');
			$('#mapInfo').css('top', $("#StarmapRenderer").offset().top + $button.height() + 'px');
			$button.click(function(){
				$('#mapInfo').toggle();
				if(this.showInfo){
					$('#mapInfoButton').css('background-image', 'url(../../../../res/img/starmap/buttonUnroll.png)');
					this.showInfo = false;
				} else {
					$('#mapInfoButton').css('background-image', 'url(../../../../res/img/starmap/buttonRoll.png)');
					this.showInfo = true;
				}
			}).bind(this);
		},

		StarOS_Map.prototype.onMouseMove = function(event){
			event.preventDefault();
			
			$canvas = $('#StarmapRenderer');
			this.mouseMove.x =  ((event.clientX - $canvas.offset().left) / $canvas.width())  * 2 - 1;
			this.mouseMove.y = -((event.clientY - $canvas.offset().top) / $canvas.height()) * 2 + 1;
		},

		StarOS_Map.prototype.onMouseDown = function(event){			
			var vector = new THREE.Vector3(this.mouseMove.x, this.mouseMove.y, 0.5);
			this.projector.unprojectVector(vector, this.camera);
			var ray = new THREE.Raycaster(this.camera.position, vector.sub(this.camera.position).normalize());
			var intersects = ray.intersectObjects(this.scene.children)
			
			if(intersects.length > 0 && intersects[0].object.uid){
				var uid = intersects[0].object.uid;
				this.EntityMapInfo(this.entityDictionary[uid]);
			}
		},

		StarOS_Map.prototype.EntityMapInfo = function(entity){
			var	facName = "None",
				isHomeworld = false;
			
			for(i in this.factionDictionary){
				if(entity.fid == this.factionDictionary[i].id){
					facName = this.factionDictionary[i].name;
					isHomeworld = (entity.uid == this.factionDictionary[i].home) ? true : false;
				}
			}
			
			$parent = $('#mapInfo');
			$parent.empty();
			
			$img = $('<img id="mapInfPic" class="mapInfo"/>');
			$img.attr('src', entity.texture.sourceFile);
			$img.attr('width', entity.scale[0]);
			$img.attr('height', entity.scale[1]);
			
			$name = $('<h4 id="mapInfName" class="mapInfo"/>');
			$name.text(entity.name);
			margin = ($parent.width() - textWidth($name.text())) / 2;
			$name.css('left', margin - 10 + 'px');
			
			$type = $('<label id="mapInfType" class="mapInfo"/>');
			$type.text("Type: " + entity.typeLabel);
			
			$pos = $('<label id="mapInfPos" class="mapInfo"/>');
			$pos.text("Sector: " + entity.sector.x + ", " + entity.sector.y + ", " + entity.sector.z);
			
			$fac = $('<label id="mapInfFac" class="mapInfo"/>');
			isHomeworld ? $fac.text("Faction: " + facName + "'s Homeworld") : $fac.text("Faction: " + facName);
			
			$mass = $('<label id="mapInfMass" class="mapInfo"/>');
			$mass.text("Mass: " + entity.mass);
			
			$pow = $('<label id="mapInfPow" class="mapInfo"/>');
			$pow.text("Max power: " + entity.power);
			
			shieldBlocks = getShieldBlocks(entity.shield);
			rechargeRate = getShieldRate(shieldBlocks);
			
			$sh = $('<label id="mapInfSh" class="mapInfo"/>');
			$sh.text("Max shield: " + entity.shield);
			$shRate = $('<label id="mapInfShRate" class="mapInfo"/>');
			$shRate.text("Shield recharge: " + rechargeRate + " s/sec");
			
			$parent.append($img);
			$parent.append($name);
			$parent.append($type);
			$parent.append($pos);
			$parent.append($fac);
			$parent.append($mass);
			$parent.append($pow);
			$parent.append($sh);
			$parent.append($shRate);
			
			$parent.show();
		},
		
		StarOS_Map.prototype.systemSelector = function(){
			var $parent = $('#sysSelect'),
				$xLabel = $('<label type="text" id="sysSelectLX"/>'),
				$xField = $('<input type="text" id="sysSelectFX"/>'),
				$yLabel = $('<label type="text" id="sysSelectLY"/>'),
				$yField = $('<input type="text" id="sysSelectFY"/>'),
				$zLabel = $('<label type="text" id="sysSelectLZ"/>'),
				$zField = $('<input type="text" id="sysSelectFZ"/>'),
				$button = $('<input type="submit" id="sysSelectBtn"/>'),
				StarMap = this;
				
			$xLabel.text("x:");
			$xField.val("0");
			$yLabel.text("y:");
			$yField.val("0");
			$zLabel.text("z:");
			$zField.val("0");
			$button.val("Search");
			
			$xField.keyup(function () { 
				this.value = this.value.replace(/[^0-9\.]/g,'');
			});
			$yField.keyup(function () { 
				this.value = this.value.replace(/[^0-9\.-]/g,'');
			});;
			$zField.keyup(function () { 
				this.value = this.value.replace(/[^0-9\.\-]/g,'');
			});
			
			$button.click(function(e){
				e.preventDefault();
				$xField.val() == "" ? $xField.val(0) : $xField.val();
				$yField.val() == "" ? $yField.val(0) : $xField.val();
				$zField.val() == "" ? $zField.val(0) : $xField.val();
				
				StarMap.currentSystem[0] = parseInt($xField.val());
				StarMap.currentSystem[1] = parseInt($yField.val());
				StarMap.currentSystem[2] = parseInt($zField.val());
				
				StarMap.unloadChunk();
				StarMap.loadChunk();
			});
			$parent.css('left', this.container.width() + this.container.offset().left - $parent.width() - 10 + 'px');
			if(this.stageDebug){
				$parent.css('top', this.stats.domElement.offsetHeight + 20 + 'px');
			} else {
				$parent.css('top', $("#StarmapRenderer").offset().top + 10 +'px');
			}
			
			$parent.append($xLabel);
			$parent.append($xField);
			$parent.append($yLabel);
			$parent.append($yField);
			$parent.append($zLabel);
			$parent.append($zField);
			$parent.append($button);
		},

		StarOS_Map.prototype.animate = function(){
  			requestAnimationFrame(StarOS_Map.prototype.animate.bind(this));
			this.render();		
			this.update();
		},

		StarOS_Map.prototype.update = function(){
			
			if(!THREEx.FullScreen.activated()){
				this.renderer.setSize(this.stageWidth, this.stageHeight);
			}
			
			if (this.keyboard.pressed("space")){
				this.camera.position.set(this.spawnPos.x, this.spawnPos.y, 10000);
				this.camera.lookAt(this.spawnPos);
			}
			
			if(this.stageDebug){
				this.stats.update();
			}
			this.controls.update();
		},

		StarOS_Map.prototype.render = function(){
			this.renderer.render( this.scene, this.camera );
		},

		this.init();
	}
};

getShieldBlocks = function(shield){
	power = 2/3;
	return Math.round(Math.pow(shield / 350 , 1 /power)) / 3.5;
};

getShieldRate = function(blocks){
	return Math.floor(Math.pow(blocks * 5, 0.5) * 50);
};
	
textWidth = function(text){
	var calc = '<span style="display:none">' + text + '</span>';
	$('body').append(calc);
	var width = $('body').find('span:last').width();
	$('body').find('span:last').remove();
	return width;
};

Number.prototype.between = function(first,last){
    return (first < last ? this >= first && this <= last : this >= last && this <= first);
};