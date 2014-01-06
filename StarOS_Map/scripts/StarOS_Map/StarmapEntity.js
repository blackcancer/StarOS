/*
	Product: StarOS Map entity
	Description: This script id the class object for entity
	License: http://creativecommons.org/licenses/by/3.0/legalcode

	FileVersion: 0.3-rev00001					Date: 2013-12-28
	By Blackcancer

	website: http://initsysrev.net
	support: blackcancer@initsysrev.net
*/
var LoadedTextures = {
	shop: new THREE.ImageUtils.loadTexture("res/img/starmap/shop.png"),
	station: new THREE.ImageUtils.loadTexture("res/img/starmap/station.png"),
	asteroid: new THREE.ImageUtils.loadTexture("res/img/starmap/asteroid.png"),
	ship: new THREE.ImageUtils.loadTexture("res/img/starmap/ship.png"),
	planet: {
		red: new THREE.ImageUtils.loadTexture("res/img/starmap/redPlanet.png"),
		terran: new THREE.ImageUtils.loadTexture("res/img/starmap/terranPlanet.png"),
		desert: new THREE.ImageUtils.loadTexture("res/img/starmap/desertPlanet.png"),
		alien: new THREE.ImageUtils.loadTexture("res/img/starmap/alienPlanet.png"), 
		ice: new THREE.ImageUtils.loadTexture("res/img/starmap/icePlanet.png"),
		unknown: new THREE.ImageUtils.loadTexture("res/img/starmap/fallPlanet.png"),
	}
};

var StarmapEntity = function(){
	this.creator = "unknown",
	this.fid = 0,
	this.genId = 0,
	this.lastMod = "",
	this.mass = 0.0,
	this.name = "undef",
	this.position = {
		x: 0,
		y: 0,
		z: 0
	},
	this.power = 0,
	this.sector ={
		x: 0,
		y: 0,
		z: 0
	},
	this.shield = 0.0,
	this.type = 0,
	this.uid = undefined;
	this.scale = [120, 120, 1.0];
	this.planeScale = this.scale;

	StarmapEntity.prototype.init = function(){
		switch(this.type){
			case 1:
				this.name = "Shop";
				this.texture = LoadedTextures.shop;
				this.planeScale = [64, 120, 1.0];
				this.typeLabel = "Shop";
				break;
			case 2:
				this.texture = LoadedTextures.station;
				this.typeLabel = "Station";
				break;
			case 3:
				this.name = "Asteroid";
				this.scale[0] = this.scale[0]/2
				this.scale[1] = this.scale[1]/2
				this.planeScale = this.scale;
				this.texture = LoadedTextures.asteroid;
				this.typeLabel = "Asteroid";
				break;
			case 4:
				switch(this.genId){
					case 0:
						this.texture = LoadedTextures.planet.red;
						this.typeLabel = "Red planet";
						break;
					case 1:
						this.texture = LoadedTextures.planet.terran;
						this.typeLabel = "Terran planet";
						break;
					case 2:
						this.texture = LoadedTextures.planet.desert;
						this.typeLabel = "Desert planet";
						break;
					case 3:
						this.texture = LoadedTextures.planet.alien;
						this.typeLabel = "Alien planet";
						break;
					case 4:
						this.texture = LoadedTextures.planet.ice;
				this.typeLabel = "Ice planet";
						break;
					default:
						this.texture = LoadedTextures.planet.unknown;
						this.typeLabel = "Unknown planet";
						break;
				};
				break;
			case 5:
				this.texture = LoadedTextures.ship;
				this.typeLabel = "Ship";
				break;
			default:
				break;
		};
	},

	StarmapEntity.prototype.generate = function(camera, scene){
		texture	 = this.texture,
		material = new THREE.SpriteMaterial({
			map: texture,
			useScreenCoordinates: false
		});
		if(this.fid == -1){
			material.setValues({color: 0xff0000});
		}
		this.sprite	 = new THREE.Sprite(material);
		this.position.x = this.position.x / 4.7;
		this.position.y = this.position.y / 4.7;
		this.position.z = this.position.z / 4.7;
		this.sprite.position = this.position;
		this.sprite.uid = this.uid;
		this.sprite.scale.set(this.scale[0], this.scale[1], this.scale[2]);
		scene.add(this.sprite);
	}
}