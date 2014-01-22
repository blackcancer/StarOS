/*
	Product: StarOS Map worker
	Description: This worker load entites for StarOS_Map.js
	License: http://creativecommons.org/licenses/by/3.0/legalcode

	FileVersion: 0.1-rev00011					Date: 2014-01-03
	By Blackcancer

	website: http://initsysrev.net
	support: blackcancer@initsysrev.net
*/

var sysDict = {},
	chunks = [],
	currentSystem = [],
	SELF = self,
	sectorSize, chunkSize, showShip, showAsteroid, useLogin, userFid;
	
	
onmessage = function(event){
	received = event.data
	switch(received.command){
		case 'initSystemDict':

			logs("Loading system dictionnary");
			sendResult('load', "Loading system from database...");
			systemDict = initSystemDict();

			logs("System dictionnary loaded");
			sendResult('renderSystem', systemDict);
			close();
			break;
			
		case 'initSectors':
			data = received.data;
			currentSystem = data.currentSystem;
			useLogin = data.useLogin;
			userFid = data.fid;
			showShip = data.showShip;
			showAsteroid = data.showAsteroid;
			sectorSize = data.sectorSize;
			chunkSize = data.chunkSize;

			logs("Loading sectors");
			sendResult('load', "Loading sectors from database...");
			initSectors();
			
			coord = currentSystem[0] + "," + currentSystem[1] + "," + currentSystem[2];
			logs("System '" + coord + "' is loaded");
			sendResult('load', "Loading entities from database...");
			sendResult('renderChunk', chunks);
			close();
			break;
					
		default:
			this.logs("Invalide command -> " + data.type);
			break;
			
	}
};

function initSystemDict(){
	var sys_xhr = new XMLHttpRequest(),
		data = {},
		json;
	
	sys_xhr.open('GET', '../StarOS_json/Entities/systems.json', false);
	sys_xhr.send(null);
	json = JSON.parse(sys_xhr.responseText);
	
	for(sys in json){
		coords = json[sys].split("_");
		data[sys] = {
			x: parseInt(coords[0]),
			y: parseInt(coords[1]),
			z: parseInt(coords[2])
		}
	}
	
	return data;
};

function initSectors(){
	var sec_xhr = new XMLHttpRequest(),
		entFile_xhr = new XMLHttpRequest(),
		folder = currentSystem[0] + "_" + currentSystem[1] + "_"  + currentSystem[2],
		folders = [],
		entFiles = [],
		data = {},
		json, i, str;
		
		
	sec_xhr.open('GET', "../StarOS_json/Entities/" + folder + "/sectors.json", false);
	sec_xhr.send(null);
	json = JSON.parse(sec_xhr.responseText);
	
	for(sec in json){
		folders.push("../StarOS_json/Entities/" + folder + "/" + json[sec] + "/");
	}
	
	for(i = 0; i < folders.length; i++){
		entFile_xhr.open('GET', folders[i] + "entities.json", false);
		entFile_xhr.send(null);
		json = JSON.parse(entFile_xhr.responseText);
		
		for(fid in json){

			if(useLogin){
				if(fid != 0 && fid != userFid){
					delete json[fid];
				}
			}
			
			if(json[fid] != undefined){
				if(!showShip || !showAsteroid){
					for(ent in json[fid]){
						str = json[fid][ent];
						if(!showShip && str.indexOf("_SHIP_") != -1){
							delete json[fid][ent];
						}
						
						if(!showAsteroid && str.indexOf("_FLOATINGROCK_") != -1){
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
	}
	
	loadEntities(entFiles);
};

function loadEntities(entFiles){
	var entity_xhr = new XMLHttpRequest(),
		system = [],
		entity = {},
		lPos = {},
		sPos = {}, 
		pos = {}, 
		centredPos = {}, 
		i, json, uid;
	
	logs("Loading entites files");
	
	for(i in currentSystem){
		system[i] = currentSystem[i];
		if(system[i] >= 0){
			system[i] = currentSystem[i] + 1;
		}
	}
	
	for(i = 0; i < entFiles.length; i++){
		entity_xhr.open('GET', entFiles[i], false);
		entity_xhr.send(null);
		json = JSON.parse(entity_xhr.responseText);
		
		uid = Object.keys(json)[0];
		
		sPos = {
			x: json[uid].transformable.sPos.x / system[0],
			y: Math.floor(json[uid].transformable.sPos.y / system[1]),
			z: Math.floor(json[uid].transformable.sPos.z / system[2])
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
			name: json[uid].realname,
			position: centredPos,
			power: Math.round((json[uid].container != undefined)? json[uid].container.power : 0),
			sector: json[uid].transformable.sPos,
			shield: (json[uid].container != undefined)? json[uid].container.shield : 0,
			type: json[uid].type,
			uid: uid
		}
		
		chunks.push(entity);
	}
};

function logs(string, data){
	self.postMessage({
		type: 'debug',
		value: string,
		data: data,
		source: "worker_systemLoader.js"
	});
};

function sendResult(type, val){
	self.postMessage({
		type: type,
		value: val
	});
};