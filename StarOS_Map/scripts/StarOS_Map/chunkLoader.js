/*
	Product: StarOS Map worker
	Description: This worker load entites for StarOS_Map.js
	License: http://creativecommons.org/licenses/by/3.0/legalcode

	FileVersion: 0.1-rev00001					Date: 2014-01-03
	By Blackcancer

	website: http://initsysrev.net
	support: blackcancer@initsysrev.net
*/

var entDictionary ={},
	chunk = [],
	currentSystem = [],
	SELF = self,
	sectorSize, chunkSize, showShip, showAsteroid, useLogin, fid;

onmessage = function(event){
	var data = event.data

	if(data.type === 'initChunk'){

		postMessage({
			type: 'debug',
			value: "ChunkLoader.js: \"Initialize chunk...\""
		});

		showShip = data.value.showShip;
		showAsteroid = data.value.showAsteroid;
		useLogin = data.value.useLogin;
		fid = data.value.fid;
		chunkSize = data.value.chunkSize;
		currentSystem = data.value.currentSystem;
		sectorSize = data.value.sectorSize;
		initChunk();
	}
	else if(data.type === 'loadChunk'){
		entDictionary = data.value.entDictionary
		chunkSize = data.value.chunkSize;
		currentSystem = data.value.currentSystem;
		sectorSize = data.value.sectorSize;
		loadChunk();
	}
}

function initChunk(){
	var xhr = new XMLHttpRequest;
	xhr.open('GET', '../StarOS_json/entities.json');
	xhr.send(null);

	xhr.onreadystatechange = function(){
		if (xhr.readyState == 4){
			if(xhr.status == 200){
				var i,
					json = JSON.parse(xhr.responseText);

				if(!showShip || !showAsteroid || useLogin){
					for(i in json){
						if(!showShip && json[i].type == 5){
							delete json[i];
						}
						else if(!showAsteroid && json[i].type == 3){
							delete json[i];
						}
						else if(useLogin){
							if(json[i].fid != fid && json[i].fid != 0){
								delete json[i];
							}
						}
					}
				}
				entDictionary = json;

				SELF.postMessage({
					type: 'entDic',
					value: "ChunkLoader.js: \"Send entities dictionary\" --->",
					object: entDictionary
				});

				loadChunk();

			}
			else{
				SELF.postMessage({
					type: 'debug',
					value: "ChunkLoader.js: \"xhr err " + xhr.status + ": " + xhr.statusText + "\"" 
				});
			}
		}
	}
}

function loadChunk(){
	postMessage({
		type: 'debug',
		value: "ChunkLoader.js: \"Load chunk....\""
	});

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
	postMessage({
		type: 'chunk',
		value: "ChunkLoader.js: \"Chunk loaded...\"",
		object: chunk
	});
	close();
}

Number.prototype.between = function(first,last){
	return (first < last ? this >= first && this <= last : this >= last && this <= first);
}