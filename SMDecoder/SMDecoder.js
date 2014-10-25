/*
	Product: SMDecoder
	Description: SMDecoder integration in node.js for realtime decoding
	License: http://creativecommons.org/licenses/by/3.0/legalcode

	FileVersion: 0.1-rev00001					Date: 2014-01-28
	By Blackcancer

	website: http://initsysrev.net
	support: blackcancer@initsysrev.net
	credit: - http://phpjs.org
			- Megacrafter127
			- der_scheme
			- tambry

	about format: Header, Logic, Meta and modeles are adapted from 
	"blueprint.py" by trambry. You can find structure specification
	at http://http://www.starmadewiki.com/wiki/File_format
*/


//-------------------------------------------
// CONSTANTES & VARIABLES
//-------------------------------------------
const	_EVENT	= require('events'),
		_FS		= require('fs'),
		_PATH	= require('path'),
		_STREAM	= require('stream'),
		_ZLIB	= require('zlib'),
		_ADMZIP	= require('adm-zip'),

		_NULL32 = '00000000',
		_NULL64 = '0000000000000000',

		//StarMade tags value
		_TAG_FINISH			= 0,
		_TAG_STR_BYTE		= 1,
		_TAG_STR_SHORT		= 2,
		_TAG_STR_INT		= 3,
		_TAG_STR_LONG		= 4,
		_TAG_STR_FLOAT		= 5,
		_TAG_STR_DOUBLE		= 6,
		_TAG_STR_BYTEARRAY	= 7,
		_TAG_STR_STRING		= 8,
		_TAG_STR_FLOAT3		= 9,
		_TAG_STR_INT3		= 10,
		_TAG_STR_BYTE3		= 11,
		_TAG_STR_LIST		= 12,
		_TAG_STR_STRUCT		= 13,
		_TAG_STR_SERIAL		= 14,

		//Anonym tags
		_TAG_RGBA			= 241,
		_TAG_UNK			= 242,		//added to dev 0.107 bit length: 136
		_TAG_STRUCT			= 243,
		_TAG_LIST			= 244,
		_TAG_BYTE3			= 245,
		_TAG_INT3			= 246,
		_TAG_FLOAT3			= 247,
		_TAG_STRING			= 248,
		_TAG_BYTEARRAY		= 249,
		_TAG_DOUBLE			= 250,
		_TAG_FLOAT			= 251,
		_TAG_LONG			= 252,
		_TAG_INT			= 253,
		_TAG_SHORT			= 254,
		_TAG_BYTE			= 255;


//-------------------------------------------
// Format readers
//-------------------------------------------
var readCat		= function(args, callback){
	args = args || {};

	if(!args.path){
		throw "No given path.";
	}

	var	cat		= {},
		data	= {},
		stream	= _FS.createReadStream(args.path, {start: 0, highWaterMark: 40960}),
		err;

	stream.on('readable',	function(){
		data = mainLoop(stream);
		stream.read();
	});

	stream.on('end',		function(){
		if(!args.format){
			callback(err, data, args);
		}
		else {
			var	ships		= data.cv0.pv0,
				rateList	= data.cv0.r0;

			for(var i in ships){
				var	name		= ships[i][0],
					bytePerm	= getPerm(ships[i][2]),
					rate		= {},
					perm		= {
						faction:	bytePerm[0],
						other:		bytePerm[1],
						homeBase:	bytePerm[2]
					};

				if(rateList[name]){
					for(var j in rateList[name]){
						user		= rateList[name][j][0];
						rate[user]	= rateList[name][j][1];
					}
				}

				cat[name]	= {
					creator:		ships[i][1],
					permission:		perm,
					price:			ships[i][3],
					description:	ships[i][4],
					rate:			rate
				};

				var j = 0;
				for(var key in ships){
					j++;
				}

				if(j > 5){
					cat[name].long_b	= ships[i][5];
					cat[name].int_b		= ships[i][6];
				}
			}

			callback(err, cat, args);
		}
	});
};

var readEnt		= function(args, callback){
	args = args || {};

	if(!args.path){
		throw "No given path.";
	}

	var	ent		= {},
		data	= {},
		stream	= _FS.createReadStream(args.path, {start: 0, highWaterMark: 40960}),
		err;

	stream.on('readable', function(){
		data = mainLoop(stream);
		stream.read();
	});

	stream.on('end', function(){
		if(!args.format){
			callback(err, data, args);
		}
		else {
			var file = args.path.split('/'),
				sc;

			file = file[file.length - 1].split('_')[1];

			switch(file){
				case 'FLOATINGROCK':
					ent = formatAsteroid(data);
				break;

				case 'PLANET':
					ent = formatPlanet(data);
				break;

				case 'PLANETCORE':
					ent = formatPlanetCore(data);
				break;

				case 'PLAYERCHARACTER':
					ent = formatPlayerChar(data, args.path);
				break;

				case 'PLAYERSTATE':
					ent = formatPlayerStat(data, args.path);
				break;

				case 'SHIP':
					ent = formatShip(data);
				break;

				case 'SHOP':
					ent = formatShop(data);
				break;

				case 'SPACESTATION':
					ent = formatSpaceStation(data);
				break;
			}

			callback(err, ent, args);
		}
	});
};

var readFac		= function(args, callback){
	args = args || {};

	if(!args.path){
		throw "No given path.";
	}

	var	fac		= {},
		data	= {},
		stream	= _FS.createReadStream(args.path, {start: 0, highWaterMark: 40960}),
		err;

	stream.on('readable', function(){
		data = mainLoop(stream);
		stream.read();
	});

	stream.on('end', function(){
		if(!args.format){
			callback(err, data, args);
		}
		else {
			var news		= {},
				factions	= data['factions-v0'][0]['f0'];

			if(data['factions-v0']['NStruct']['FN']){
				var tmpNews = data['factions-v0']['NStruct']['FN']['fp-v0'];

				for(var i in tmpNews){
					news[tmpNews[i]['dt']] = {
						'fid':		tmpNews[i]['id'],
						'author':	tmpNews[i]['op'],
						'msg':		tmpNews[i]['msg'],
						'perm':		tmpNews[i]['perm']
					}
				}
			}

			for(var i in factions){
				var id		= factions[i]['id'],
					ranks	= [],
					mem		= {},
					enemies	= [],
					options = {
						'public':		(factions[i][4] == 1)? true : false,
						'warOnHostile':	(factions[i]['aw'] == 1)? true : false,
						'NeutralEnemy':	(factions[i]['en'] == 1)? true : false
					},
					home	= {
						'uid':		factions[i]['home'],
						'sector':	factions[i][5]
					};

				for(var j in factions[i]['used_0'][0][1]){
					var bytePerm	= getPerm(factions[i]['used_0'][0][1][j]),
						perm		= {};

					perm.name	= factions[i]['used_0'][0][2][j];
					perm.perm	= {
						'edit':				bytePerm[0],
						'kick':				bytePerm[1],
						'invite':			bytePerm[2],
						'permission-edit':	bytePerm[3],
					};

					ranks.push(perm)
				}

				if(typeof factions[i]['mem'][0][0] == 'object'){

					for(var j in factions[i]['mem'][0]){
						var name = factions[i]['mem'][0][j][0];

						mem[name] = factions[i]['mem'][0][j][1];
					}

				}
				else {
					var name = factions[i]['mem'][0][0];
					mem[name] = factions[i]['mem'][0][1];
				}

				for(var j in factions[i]['mem'][1]){
					var name = factions[i]['mem'][1][j];
					enemies.push(name);
				}


				fac[id] = {
					'uid':			factions[i][0],
					'name':			factions[i][1],
					'description':	factions[i][2],
					'ranks':		ranks,
					'members':		mem,
					'pEnemies':		enemies,
					'home':			home,
					'pw':			factions[i]['pw'],
					'fn':			factions[i]['fn'],
					'options':		options,
					'news':			{},
					'timestamp':	factions[i][3]
				}

				for(var key in news){
					if(news[key].fid == id){
						fac[id].news[key] = {
							'author':	news[key].author,
							'msg':		news[key].msg,
							'perm':		news[key].perm
						}

					}
				}

				if(factions[i] > 14){
					fac[id]['int_a'] = factions[i][3];
					fac[id]['v3f_a'] = factions[i][7];
				}
			}

			callback(err, fac, args);
		}
	});
};

var readSmbph	= function(args, callback){
	args = args || {};

	if(!args.path){
		throw "No given path.";
	}

	var	smbph	= {},
		stream	= _FS.createReadStream(args.path, {start: 0, highWaterMark: 40960}),
		err;

	stream.on('readable', function(){
		smbph.int_a = readInt32(stream);
		smbph.type = readInt32(stream);

		smbph.bounds_n = vector3(readFloat(stream), readFloat(stream), readFloat(stream));
		smbph.bounds_p = vector3(readFloat(stream), readFloat(stream), readFloat(stream));

		smbph.blockTableLen = readInt32(stream);

		smbph.blocks = {};
		for(var i = 0; i < smbph.blockTableLen; i++){
			var index = readUInt16(stream);
			smbph.blocks[index] = readUInt32(stream);
		}

		stream.read();
	});

	stream.on('end', function(){
			callback(err, smbph, args);
	});
};

var readSmbpl	= function(args, callback){
	args = args || {};

	if(!args.path){
		throw "No given path.";
	}

	var	smbpl	= {},
		data	= {},
		stream	= _FS.createReadStream(args.path, {start: 0, highWaterMark: 40960}),
		err;

	stream.on('readable', function(){
		var ctrLen = 0;

		data.controllers = [];

		data.int_a	= readInt32(stream);
		ctrLen		= readInt32(stream);

		for(var i = 0; i < ctrLen; i++){
			var dict = {
					'position': vector3(readInt16(stream), readInt16(stream), readInt16(stream)),
					'group': {}
				},
				numGrp	= readInt32(stream);

			for(var j = 0; j < numGrp; j++){
				var tag			= readInt16(stream),
					numBlocks	= readInt32(stream);

				dict.group[tag]		= [];
				for(var k = 0; k < numBlocks; k++){
					dict.group[tag].push(vector3(readInt16(stream), readInt16(stream), readInt16(stream)));
				}
			}

			data.controllers.push(dict);
		}

		stream.read();
	});

	stream.on('end', function(){
		if(!args.format){
			callback(err, data, args);
		}
		else {
			smbpl.int_a			= data.int_a;
			smbpl.controllers	= {};

			for(var i = 0, il = data.controllers.length; i < il; i++){
				var pos = data.controllers[i].position.x + "," + data.controllers[i].position.y + "," + data.controllers[i].position.z;

				smbpl.controllers[pos] = {};
				for(var key in data.controllers[i].group){
					if(!smbpl.controllers[pos][key]){
						smbpl.controllers[pos][key] = [];
					}

					for(var j = 0, jl = data.controllers[i].group[key].length; j < jl; j++){
						smbpl.controllers[pos][key].push(data.controllers[i].group[key][j]);
					}
				}
			}

			callback(err, smbpl, args);
		}
	});
};

var readSmbpm	= function(args, callback){
	args = args || {};

	if(!args.path){
		throw "No given path.";
	}

	var	smbpm	= {},
		data	= {},
		stream	= _FS.createReadStream(args.path, {start: 0, highWaterMark: 40960}),
		err;

	stream.on('readable', function(){
		data.int_a	= readInt32(stream);
		data.byte_a	= readInt8(stream);

		if(data.byte_a == 3){
			var docked = readUInt32(stream);

			data.docked = [];
			for(var i = 0; i < docked; i++){
				data.docked.push({
					'name':		readString(stream),
					'position':	vector3(readInt32(stream), readInt32(stream), readInt32(stream)),
					'v3f':		vector3(readFloat(stream), readFloat(stream), readFloat(stream)),
					'dockType':	readInt16(stream)
				});

				readByte(stream);
			}

			data.byte_b	= readByte(stream);
			data.gzip	= readInt16(stream);

			var tag = readUInt8(stream);
			while(tag != _TAG_FINISH){
				var resp = parseTag(stream, tag);

				data[resp.name] = resp.value;

				tag = readUInt8(stream);
			}
		}

		stream.read();
	});

	stream.on('end', function(){
		if(!args.format){
			callback(err, data, args);
		}
		else {
			smbpm = data;

			if(data.container){
				smbpm.container = getContainer(data.container);
			}

			callback(err, smbpm, args);
		}
	});
};

var readSmd2	= function(args, callback){
	args = args || {};

	if(!args.path){
		throw "No given path.";
	}

	var	smd2	= {},
		stream	= _FS.createReadStream(args.path, {start: 0, highWaterMark: 4096 * 5120 + 32768 * 2 + 4}),
		err;

	stream.on('readable', function(){
		var flength			= stream._readableState.length,
			numChunks		= (flength - 4 - (32768 * 2)) / 5120,
			parsedChunks	= 0;

		smd2.version			= readInt32(stream);
		smd2.fileSize			= flength;

		//First 32KB area
		smd2.chunkIndex = {};
		for(var i = 0; i < 4096; i++){
			var chunkId		= readInt32(stream),
				chunkLen	= readInt32(stream);

			if(chunkId != -1){
				var pos		= [Math.floor((i % 16) - 8), Math.floor(((i / 16) % 16) - 8), Math.floor(((i / 256) % 16) - 8)],
					posStr	= (pos[0] * 16) + ',' + (pos[1] * 16) + ',' + (pos[2] * 16);

				smd2.chunkIndex[posStr] = {
					id:		chunkId,
					length:	chunkLen
				};
			}
		}

		//Second 32KB area
		smd2.chunkTimestamps = {};
		for(var i = 0; i < 4096; i++){
			var timestamp = readInt64(stream);

			if(timestamp > 0){
				var pos		= [Math.floor((i % 16) - 8), Math.floor(((i / 16) % 16) - 8), Math.floor(((i / 256) % 16) - 8)],
					posStr	= (pos[0] * 16) + ',' + (pos[1] * 16) + ',' + (pos[2] * 16);


				smd2.chunkTimestamps[posStr] = timestamp;
			}
		}

		//Last KB area
		smd2.chunks = [];
		for(var i = 0; i < numChunks; i++){
			var chunkDict	= {},
				compressed	= 5120 - 25,
				inLen, inData, outData;

			if(smd2.version >= 1){
				chunkDict.byte_a	= readInt8(stream);
				compressed			= 5120 - 26;
			}

			chunkDict.timestamp	= readInt64(stream);
			chunkDict.pos		= vector3(readInt32(stream), readInt32(stream), readInt32(stream));
			chunkDict.type		= readUInt8(stream);
			chunkDict.blocks	= {};
			inLen				= readUInt32(stream);
			inData				= stream.read(compressed);

			smd2.chunks.push(chunkDict);

			_ZLIB.unzip(inData, function(err, ungziped){
				if(err){
					console.log(err)
				}

				parsedChunks++;

				ungziped = ungziped.toString();
				for(var j = 0; j < 4096; j++){
					var id	= j * 3,
						str	= '00';

					for(var k = 0; k < 3; k++){
						var hex = ungziped.charCodeAt(id + k).toString(16)
						str += hex.length < 2 ? '0' + hex : hex;
					}

					blockData	= readStrInt32(str);
					blockId		= bits(blockData, 0, 11);

					if(blockId != 0){
						var pos		= [Math.floor(j % 16), Math.floor((j / 16) % 16), Math.floor((j / 256) % 16)];
							posStr	= pos[0] + ',' + pos[1] + ',' + pos[2];

						smd2.chunks[parsedChunks -1].blocks[posStr] = {
							id:			blockId,
							hp:			bits(blockData, 11, 9),
							isActive:	bits(blockData, 20, 1),
							orient:		bits(blockData, 21, 3),
						};
					}
				}

				if(parsedChunks == numChunks){
					callback(err, smd2, args);
					stream.read();
				}
			});
		}
		stream.read();
	});
};

var readSment	= function(args, callback){
	args = args || {};

	if(!args.path){
		throw "No given path.";
	}

	var zip			= new _ADMZIP(args.path),
		zipEntries	= zip.getEntries();

	out = {};
	for(entry in zipEntries){
	}

	callback(null, out, args);
};

var readSmsec	= function(args, callback){
	args = args || {};

	if(!args.path){
		throw "No given path.";
	}

	var	ent		= {},
		data	= {},
		stream	= _FS.createReadStream(args.path, {start: 0, highWaterMark: 40960}),
		err;

	stream.on('readable', function(){
		// data = mainLoop(stream);
		stream.read();
	});

	stream.on('end', function(){
		if(!args.format){
			callback(err, data, args);
		}
		else {
		}
	});
};

var readSmskin	= function(args, callback){
	args = args || {};

	if(!args.path){
		throw "No given path.";
	}

	var zip			= new _ADMZIP(args.path),
		zipEntries	= zip.getEntries();

	out = {};
	for(entry in zipEntries){
		data = "data:image/png;filename=" + zipEntries[entry].name + ";base64," + zipEntries[entry].getData().toString('base64');
		out[zipEntries[entry].name] = data;
	}

	callback(null, out, args);
};


//-------------------------------------------
// Formaters
//-------------------------------------------
var formatAsteroid		= function(data){
	var ent	= {},
		sc	= data.sc;

	ent.uniqueId		= sc.uniqueId;
	ent.type			= 3;
	ent.cs1				= sc.cs1;
	ent.realname		= (sc.realname == 'undef') ? 'Asteroid' : sc.realname;
	ent.dim				= getDim(sc);
	ent.dock			= getDock(sc);
	ent.transformable	= getTransformable(sc.transformable);
	ent.dummy			= sc.dummy;
	ent.creatorId		= getCreator(sc);

	return ent;

};

var formatShip			= function(data){
	var ent	= {},
		sc	= data.sc;

	ent.uniqueId		= sc.uniqueId;
	ent.type			= 5;
	ent.isTurret		= false;
	ent.cs1				= sc.cs1;
	ent.realname		= "";
	ent.dim				= getDim(sc);
	ent.dock			= getDock(sc);
	ent.transformable	= getTransformable(sc.transformable);
	ent.container		= getContainer(sc.container);
	ent.creatorId		= getCreator(sc);

	if(sc.realname == 'Turret'){
		ent.isTurret = true;
		ent.realname = sc.realname;
	}
	else {
		ent.realname = (sc.realname == 'undef')? 'Ship' : sc.realname;
	}

	return ent;
};

var formatShop			= function(data){
	var ent	= {},
		sc	= data.ShopSpaceStation2.sc;

	ent.uniqueId		= sc.uniqueId;
	ent.type			= 1;
	ent.cs1				= sc.cs1;
	ent.realname		= (sc.realname == 'undef') ? 'Shop' : sc.realname;
	ent.dim				= getDim(sc);
	ent.dock			= getDock(sc);
	ent.transformable	= getTransformable(sc['transformable']);
	ent.dummy			= sc.dummy;
	ent.creatorId		= getCreator(sc);
	ent.inventory		= getInventory(data.ShopSpaceStation2.inv);
	ent.struct_c		= data.ShopSpaceStation2[0];

	return ent;
};

var formatSpaceStation	= function(data){
	var ent	= {},
		sc	= data.SpaceStation.sc;

	ent.uniqueId		= sc.uniqueId;
	ent.type			= 2;
	ent.cs1				= sc.cs1;
	ent.realname		= (sc.realname == 'undef') ? 'Station' : sc.realname;
	ent.dim				= getDim(sc);
	ent.dock			= getDock(sc);
	ent.transformable	= getTransformable(sc.transformable);
	ent.container		= getContainer(sc.container);
	ent.creatorId		= getCreator(sc);

	return ent;
};

var formatPlanetCore	= function(data){
	var ent	= {},
		sc	= data[0].PlanetCore;

	ent.uniqueId		= sc[0];
	ent.type			= 0;
	ent.realname		= 'Planet Core';
	ent.float_a			= sc[1];
	ent.struct_a		= sc[2];
	ent.struct_b		= sc[3];
	ent.struct_c		= sc[4];
	ent.struct_d		= sc[5];
	ent.struct_e		= sc[6];
	ent.transformable	= getTransformable(sc['transformable']);

	return ent;
};

var formatPlanet		= function(data){
	var ent	= {},
		sc	= data.Planet.sc;

	ent.uniqueId		= sc.uniqueId;
	ent.type			= 4;
	ent.core			= (data.Planet[1] == 'none')? false : data.Planet[1];
	ent.part			= data.Planet[0];
	ent.cs1				= sc.cs1;
	ent.realname		= (sc.realname == 'undef') ? 'Planet' : sc.realname;
	ent.dim				= getDim(sc);
	ent.dock			= getDock(sc);
	ent.transformable	= getTransformable(sc.transformable);
	ent.container		= getContainer(sc.container);
	ent.creatorId		= getCreator(sc);

	return ent;
};

var formatPlayerChar	= function(data, file){
	var ent		= {},
		sc		= data.PlayerCharacter,
		name	= file.split('/');

	name = name[name.length - 1].replace('ENTITY_PLAYERCHARACTER_', '').replace('.ent', '');

	ent.name			= name;
	ent.type			= 6;
	ent.id				= sc.id;
	ent.speed			= sc.speed;
	ent.stepHeight		= sc.stepHeight;
	ent.transformable	= getTransformable(sc.transformable);

	return ent;
};

var formatPlayerStat	= function(data, file){
	var ent		= {},
		sc		= data.PlayerState,
		hist			= [],
		inv				= [],
		ships			= [],
		ai_entity		= [],
		name	= file.split('/');

	name = name[name.length - 1].replace('ENTITY_PLAYERSTATE_', '').replace('.ent', '');

	for(var i = 0, il = sc.hist.length; i < il; i++){
		hist.push({
			'timestamp':	sc.hist[i][0],
			'ip':			sc.hist[i][1],
			'string_c':		sc.hist[i][2]
		});
	}

	for(var key in sc[name]){
		ships.push({
			'ship':			sc[name][key][0],
			'struct_a':		sc[name][key][1]
		});
	}

	for(var key in sc[4][0]){
		ai_entity.push(sc[4][0][key]);
	}

	for(var i = 6; i < 9; i++){
		inv.push({
			'int_a':	sc[i][0][0],
			'inv':		getInventory(sc[i]['inv'])
		});
	}

	ent.name			= name;
	ent.type			= 7;
	ent.credits			= sc.credits;
	ent.inventory		= getInventory(sc.inv);
	ent.spawn			= sc.spawn;
	ent.sector			= sc.sector;
	ent.lspawn			= sc.lspawn;
	ent.lsector			= sc.lsector;
	ent.fid				= sc['pFac-v0'][0];
	ent.lastLogin		= sc[0];
	ent.lastLogout		= sc[1];
	ent.hist			= hist;
	ent.ci0				= sc.ci0;
	ent.lastShip		= sc[2];
	ent.ships			= ships;
	ent.AI_Entity		= ai_entity;
	ent.int_b			= sc[3];
	ent.byte_a			= sc[5];
	ent.unk_invs		= inv;

	return ent;
};


//-------------------------------------------
// Parsers
//-------------------------------------------
var mainLoop	= function(stream){
	var data = {
			gzip: readInt16(stream)
		},
		i = 0,
		tag = readUInt8(stream);

	while(tag != _TAG_FINISH){
		var v = parseTag(stream, tag);

		if(v.name){
			data[v.name] = v.value;
		}
		else {
			data[i.toString()] = v;
			i++;
		}

		tag = readUInt8(stream);
	}

	return data;
};

var parseTag	= function(stream, tag){
	var data;

	switch(tag){
		case _TAG_STR_BYTE:
			data = {
				name:	readString(stream),
				value:	readInt8(stream)
			};
		break;

		case _TAG_BYTE:
			data = readInt8(stream);
		break;

		case _TAG_STR_SHORT:
			data = {
				name:	readString(stream),
				value:	readInt16(stream)
			};
		break;

		case _TAG_SHORT:
			data = readInt16(stream);
		break;

		case _TAG_STR_INT:
			data = {
				name:	readString(stream),
				value:	readInt32(stream)
			};
		break;

		case _TAG_INT:
			data = readInt32(stream);
		break;

		case _TAG_STR_LONG:
			data = {
				name:	readString(stream),
				value:	readInt64(stream)
			};
		break;

		case _TAG_LONG:
			data = readInt64(stream);
		break;

		case _TAG_STR_FLOAT:
			data = {
				name:	readString(stream),
				value:	readFloat(stream)
			};
		break;

		case _TAG_FLOAT:
			data = readFloat(stream);
		break;

		case _TAG_STR_DOUBLE:
			data = {
				name:	readString(stream),
				value:	readDouble(stream)
			};
		break;

		case _TAG_DOUBLE:
			data = readDouble(stream);
		break;

		case _TAG_STR_BYTEARRAY:
			data = {
				name:	readString(stream),
				value:	[]
			};

			for(var i = readInt32(stream); i--;){
				data.value.push(readInt8(stream));
			}
		break;

		case _TAG_BYTEARRAY:
			data	= []

			for(var i = readInt32(stream); i--;){
				data.push(readInt8(stream));
			}
		break;

		case _TAG_STR_STRING:
			data = {
				name:	readString(stream),
				value:	readString(stream)
			};
		break;

		case _TAG_STRING:
			data = readString(stream);
		break;

		case _TAG_STR_FLOAT3:
			data = {
				name:	readString(stream),
				value:	vector3(readFloat(stream), readFloat(stream), readFloat(stream))
			};
		break;

		case _TAG_FLOAT3:
			data = vector3(readFloat(stream), readFloat(stream), readFloat(stream));
		break;

		case _TAG_STR_INT3:
			data = {
				name:	readString(stream),
				value:	vector3(readInt32(stream), readInt32(stream), readInt32(stream))
			};
		break;

		case _TAG_INT3:
			data = vector3(readInt32(stream), readInt32(stream), readInt32(stream));
		break;


		case _TAG_STR_BYTE3:
			data = {
				name:	readString(stream),
				value:	[readInt8(stream), readInt8(stream), readInt8(stream)]
			};
		break;

		case _TAG_BYTE3:
			data = [readInt8(stream), readInt8(stream), readInt8(stream)];
		break;

		case _TAG_STR_LIST:
			data	= {
				name:	readString(stream),
				value:	[]
			};

			var nextTag	= readUInt8(stream);

			for(var i = readInt32(stream); i--;){
				data.value.push(parseList(stream, nextTag));
			}
		break;

		case _TAG_LIST:
			data	= [];
			var nextTag	= readUInt8(stream);

			for(var i = readInt32(stream); i--;){
				data.push(parseList(stream, nextTag));
			}

		break;

		case _TAG_STR_STRUCT:
			var name = readString(stream),
				nextTag	= readUInt8(stream),
				i		= 0;

			data	= {
				name:	name,
				value:	{}
			};

			while(nextTag != _TAG_FINISH){
				var	resp	= parseTag(stream, nextTag);

				if(resp instanceof Object && !(resp instanceof Array) && resp.name){

					if(!data.value[resp.name]){
						data.value[resp.name] = resp.value;
					}
					else {

						if(!(data.value[resp.name] instanceof Array)){
							if(isNaN(resp.name)){
								var tmp	= data.value[resp.name];
								data.value[resp.name] = [];

								data.value[resp.name].push(tmp);
								data.value[resp.name].push(resp.value);
							}
							else {
								//need to be improved
								data.value['used_' + resp.name] = [];
								data.value['used_' + resp.name].push(resp.value);
							}

						}
						else if(resp.value instanceof Array && compareKey(data.value[resp.name], resp.value)){
							var tmp	= data.value[resp.name];
							data.value[resp.name] = [];

							data.value[resp.name].push(tmp);
							data.value[resp.name].push(resp.value);
						}
						else {
							data.value[resp.name].push(resp.value);
						}
					}

				}
				else {
					data.value[i.toString()] = resp;
					i++;
				}

				nextTag	= readUInt8(stream);
			}

		break;

		case _TAG_STRUCT:
			var nextTag	= readUInt8(stream),
				i		= 0;

			data	= {};

			while(nextTag != _TAG_FINISH){
				var	resp	= parseTag(stream, nextTag);

				if(resp instanceof Object && !(resp instanceof Array) && resp.name){

					if(!data[resp.name]){
						data[resp.name] = resp.value;
					}
					else {

						if(!(data[resp.name] instanceof Array)){
							if(isNaN(resp.name)){
								var tmp	= data[resp.name];
								data[resp.name] = [];

								data[resp.name].push(tmp);
								data[resp.name].push(resp.value);
							}
							else {
								//need to be improved
								data['used_' + resp.name] = [];
								data['used_' + resp.name].push(resp.value);
							}

						}
						else if(resp.value instanceof Array && compareKey(data[resp.name], resp.value)){
							var tmp	= data[resp.name];
							data[resp.name] = [];

							data[resp.name].push(tmp);
							data[resp.name].push(resp.value);
						}
						else {
							data[resp.name].push(resp.value);
						}
					}

				}
				else {
					data[i.toString()] = resp;
					i++;
				}

				nextTag	= readUInt8(stream);
			}
		break;


		case _TAG_STR_SERIAL:
			data = {
				name:	readString(stream),
				value:	''
			};

			var nextBytes = readNextBytes(stream, 11);

			while(nextBytes != '\b\0\brealname'){
				data.value += readByte(stream);
				nextBytes = readNextBytes(stream, 11);
			}
		break;

		case _TAG_RGBA:
			data = colorRGBA(readFloat(stream), readFloat(stream), readFloat(stream), readFloat(stream));
		break;

		case _TAG_UNK:
			data = readBytes(stream, 16);
		break;

		default:
			console.log('Warning:', 'Unrecognized tag type in parseTag -> charCode', parseInt(tag));
		break;
	}

	return data;
};

var parseList	= function(stream, tag){
	var data;

	switch(tag){
		case _TAG_STR_BYTE:
			data = readInt8(stream);
		break;

		case _TAG_STR_SHORT:
			data = readInt16(stream);
		break;

		case _TAG_STR_INT:
			data = readInt32(stream);
		break;

		case _TAG_STR_LONG:
			data = readInt64(stream);
		break;

		case _TAG_STR_FLOAT:
			data = readFloat(stream);
		break;

		case _TAG_STR_DOUBLE:
			data = readDouble(stream);
		break;

		case _TAG_STR_BYTEARRAY:
			data = [];

			for(var i = readInt32(stream); i--;){
				data.value.push(readInt8(stream));
			}
		break;

		case _TAG_STR_STRING:
			data = readString(stream);
		break;

		case _TAG_STR_FLOAT3:
			data = [readFloat(stream), readFloat(stream), readFloat(stream)];
		break;

		case _TAG_STR_INT3:
			data = [readInt32(stream), readInt32(stream), readInt32(stream)];
		break;

		case _TAG_STR_BYTE3:
			data = [readInt8(stream), readInt8(stream), readInt8(stream)];
		break;

		default:
			console.log('Warning:', 'Unrecognized tag type in parseList -> charCode', tag);
		break;
	}

	return data;
};


//-------------------------------------------
// Getters
//-------------------------------------------
var getPerm				= function(val){
	var bytes	= strPad(val.toString(2), 16),
		arr		= [];

	bytes = bytes.split('');
	for(var i = bytes.length; i--;){
		arr.push((bytes[i] == '1')? true : false);
	}

	return arr;
};

var getDim				= function(arr){
	return {
		'maxPos': arr.maxPos,
		'minPos': arr.minPos
	};
};

var getDock				= function(arr){
	if(arr['dock']){
		return {
			'dockedTo':		arr.dock.dockedTo,
			'dockedToPos':	arr.dock.dockedToPos,
			'byte_a':		arr.dock[0],
			'byte_b':		arr.dock[1],
			's':			arr.dock.s
		};
	}
	else {
		var i = 0;
		for(key in arr[0]){
			i++;
		}

		if(i === 5){
			return {
				'dockedTo':		arr[0][0],
				'dockedToPos':	arr[0][1],
				'byte_a':		arr[0][2],
				'byte_b':		arr[0][3],
				's':			arr[0]['s']
			};
		}
		else {
			return {
				'dockedTo':		arr[0][0],
				'dockedToPos':	arr[0][1],
				'byte_a':		arr[0][2],
				'byte_b':		arr[0][3],
				'v3f':			arr[0]['s'],
				'byte_c':		arr[0][4],
				'rgba':			arr[0][5]
			};
		}
	}
};

var getTransformable	= function(arr){
	var transform	= getTransform(arr.transform);

	return {
		'mass':			arr.mass,
		'transformX':	transform[0],
		'transformY':	transform[1],
		'transformZ':	transform[2],
		'localPos':		transform[3],
		'sPos':			arr.sPos,
		'AIConfig':		(arr.noAI)? 'noAI' : getAIConfig(arr),
		'fid':			arr.fid,
		'own':			arr.own,
	};
};

var getTransform		= function(arr){
	return [
		vector4(arr[0], arr[1], arr[2], arr[3]),
		vector4(arr[4], arr[5], arr[6], arr[7]),
		vector4(arr[8], arr[9], arr[10], arr[11]),
		vector4(arr[12], arr[13], arr[14], arr[16])
	];
};

var getAIConfig			= function(arr){
	if(arr.AIConfig0){
		return [
			arr.AIConfig0.AIElement0.state,
			arr.AIConfig0.AIElement1.state,
			arr.AIConfig0.AIElement2.state
		];
	}
	else {
		var data = {};

		for(key in arr.AIConfig1){
			data[arr.AIConfig1[key][0]] = arr.AIConfig1[key][1];
		}

		return data;
	}

	return "unknown AI";
};

var getCount			= function(arr){
	var data = [];

	for(var key in arr){
		data.push({
			'id':		arr[key][0],
			'count':	arr[key][1]
		});
	}

	return data;
};

var getContainer		= function(arr){
	var contStruct	= [],
		ex			= (arr.exS)? 'exS' : 'ex';

	if(arr.controllerStructure.inventory){
		var cont = arr.controllerStructure.inventory;

		for(var key in cont){
			contStruct.push({
				'type':		cont[key].type,
				'index':	cont[key].index,
				'stash':	{
					'filters':	getCount(cont[key].stash[0][1]),
					'inv':		getInventory(cont[key].stash.inv)
				}
			});
		}
	}

	return {
		'controllerStructure':	contStruct,
		'shipMan0':				arr.shipMan0,
		'power':				arr.pw,
		'shield':				arr.sh,
		'ex':					arr[ex],
		'a':					arr.a,
		'screen':				arr[0],
		'device':				getCount(arr[1]),
		'struct_c':				arr[3],
		'int_c':				arr[2],
	};
};

var getInventory		= function(arr){
	var data = [];

	for(var key in arr[0]){
		var slot	= arr[0][key],
			id		= arr[1][key],
			tmp		= arr[2][key];

		if(typeof tmp == 'object'){

			data[slot] = {
				'id':		id,
				'count':	1,
				'meta':		{
					'id':		tmp[1],
					'metaId':	tmp[3],
					'meta':		tmp[2],
					'int_a':	tmp[0]
				}
			};

		}
		else {
			data[slot] = {
				'id':		id,
				'count':	tmp
			};
		}
	}

	return data;
};

var getCreator			= function(arr){
	var ai_entity = {};

	for(var key in arr){
		if(key.indexOf('[') === 0){
			var str = key.substr(1);
			str = str.substr(0, str.length - 1);
			str = str.split(', ', str);

			if(str.length == 0){
				str = key.substr(1);
				str = str.substr(0, str.length - 1);

				if(str.indexOf('AICharacter') >= 0){
					var child = arr[key][0][1];

					ai_entity[str] = {
						'short_a':	arr[key][0][0],
						'data':		{ 
							'name':				child[3],
							'uid':				child[0],
							'speed':			child[1],
							'stepHeigt':		child[2],
							'HP':				child[4][1],
							'transformable':	getTransformable(child['transformable']),
							'inventory':		getInventory(child[4]['inv'])
						}
					};
				}
			}
			else {

				for(var i = 0, il = str.length; i < il; i++){
					if(str.indexOf('AICharacter') >= 0){
						var child = arr[key][0][1];

						ai_entity[str[i]] = {
							'short_a':	arr[key][i][0][0],
							'data':		{ 
								'name':				child[3],
								'uid':				child[0],
								'speed':			child[1],
								'stepHeigt':		child[2],
								'HP':				child[4][1],
								'transformable':	getTransformable(child['transformable']),
								'inventory':		getInventory(child[4]['inv'])
							}
						};
					}
				}
			}
		}
	}

	return {
		'creator':		(arr[1] == '')? '<system>' : arr[1],
		'lastMod':		arr[2],
		'seed':			arr[3],
		'touched':		(arr[4] == 1)? true : false,
		'genId':		arr['creatoreId'],
		'AI_Entity':	ai_entity,
		'byte_a':		(arr[5])? arr[5] : -1,
		'byte_b':		arr[6],
	};
};


//-------------------------------------------
// Readers
//-------------------------------------------
var readByte		= function(stream){
	var str = stream.read(1);
	if(!str){
		return str;
	}
	return str.toString('hex');
};

var readBytes		= function(stream, length){
	return stream.read(length).toString('hex');
};

var readNextByte	= function(stream){
	var str = stream._readableState.buffer[0].slice(0,1);
	if(!str){
		return str;
	}
	return str.toString('hex');
};

var readNextBytes	= function(stream, length){
	var str = stream._readableState.buffer[0].slice(0,length);
	return str.toString();
};

var readInt8		= function(stream){
	var bin = hex2bin(stream.read(1).toString('hex'));
	if(!bin.valid){
		return !bin.valid;
	}
	return binToInt8(bin.result);
};

var readUInt8		= function(stream){
	var data = stream.read(1);
	if(!data){
		return 0;
	}

	var bin = hex2bin(data.toString('hex'));
	if(!bin.valid){
		return !bin.valid;
	}
	return bindec(bin.result);
};

var readInt16		= function(stream){
	var str = stream.read(2);
	var bin = hex2bin(str.toString('hex'));
	if(!bin.valid){
		return !bin.valid;
	}
	return binToInt16(bin.result);
};

var readUInt16		= function(stream){
	var bin = hex2bin(stream.read(2).toString('hex'));
	if(!bin.valid){
		return !bin.valid;
	}
	return bindec(bin.result);
};

var readInt32		= function(stream){
	var bin = hex2bin(stream.read(4).toString('hex'));
	if(!bin.valid){
		return !bin.valid;
	}
	return binToInt32(bin.result);
};

var readUInt32		= function(stream){
	var bin = hex2bin(stream.read(4).toString('hex'));
	if(!bin.valid){
		return !bin.valid;
	}
	return bindec(bin.result);
};

var readStrInt32	= function(str){
	var bin = hex2bin(str);
	if(!bin.valid){
		return !bin.valid;
	}
	return binToInt32(bin.result);
};

var readInt64		= function(stream){
	var bin = hex2bin(stream.read(8).toString('hex'));
	if(!bin.valid){
		return !bin.valid;
	}
	return binToInt64(bin.result);
};

var readUInt64		= function(stream){
	var bin = hex2bin(stream.read(8).toString('hex'));
	if(!bin.valid){
		return !bin.valid;
	}
	return bindec(bin.result);
};

var readFloat		= function(stream){
	var bin = stream.read(4).toString('hex');
	return binToFloat(bin);
};

var readDouble		= function(stream){
	var bin = stream.read(8).toString('hex');
	return binToDouble(bin);
};

var readString		= function(stream){
	var len = readUInt16(stream),
		str = '';
	if(len > 0){
		str = stream.read(len).toString();
	}

	return str;
};


//-------------------------------------------
// Decoders
//-------------------------------------------
var bits		= function(x, start, len){
	x = x >> start;
	x = x & (Math.pow(2, len) - 1);

	return x;
};

var binToInt8	= function(bytes){
	var out		= '',
		mode	= 'init';

	if(bytes[0] !== '1'){
		return bindec(bytes);
	}

	for(var i = bytes.length; i--;){
		if(mode != 'init'){
			out = ((bytes[i] == '0') ? '1' : '0') + out;
		}
		else {
			if(bytes[i] == '1'){
				out = '1' + out;
				mode = 'invert';
			}
			else {
				out = '0' + out;
			}
		}
	}

	return bindec(out) * (-1);
};

var binToInt16	= function(bytes){
	var out		= '',
		mode	= 'init';

	if(bytes[0] !== '1'){
		return bindec(bytes);
	}

	for(var i = bytes.length; i--;){
		if(mode != 'init'){
			out = ((bytes[i] == '0') ? '1' : '0') + out;
		}
		else {
			if(bytes[i] == '1'){
				out = '1' + out;
				mode = 'invert';
			}
			else {
				out = '0' + out;
			}
		}
	}

	return bindec(out) * (-1);
};

var binToInt32	= function(bytes){
	var out		= '',
		mode	= 'init';

	if(bytes[0] !== '1'){
		return bindec(bytes);
	}

	for(var i = bytes.length; i--;){
		if(mode != 'init'){
			out = ((bytes[i] == '0') ? '1' : '0') + out;
		}
		else {
			if(bytes[i] == '1'){
				out = '1' + out;
				mode = 'invert';
			}
			else {
				out = '0' + out;
			}
		}
	}

	return bindec(out) * (-1);
};

var binToInt64	= function(bytes){
	var out		= '',
		mode	= 'init';

	if(bytes[0] !== '1'){
		return bindec(bytes);
	}

	for(var i = bytes.length; i--;){
		if(mode != 'init'){
			out = ((bytes[i] == '0') ? '1' : '0') + out;
		}
		else {
			if(bytes[i] == '1'){
				out = '1' + out;
				mode = 'invert';
			}
			else {
				out = '0' + out;
			}
		}
	}

	return bindec(out) * (-1);
};

var binToFloat	= function(hex){
	var dec;

	if(hex === _NULL32){
		return parseFloat('0');
	}

	hex = chunk_split(hex, 2, " ");
	hex = hex.slice(0, -1);
	hex = hexReverse(hex);
	hex = hexify(hex);
	dec = unpack('f', hex);

	if(dec[''] == (-0)){
		dec[''] = parseFloat('0');
	}

	return dec[''];
};

var binToDouble	= function(hex){
	var dec;

	if(hex === _NULL64){
		return parseFloat('0');
	}

	hex = chunk_split(hex, 2, " ");
	hex = hex.slice(0, -1);
	hex = hexReverse(hex);
	hex = hexify(hex);
	dec = unpack('d', hex);

	if(dec[''] == (-0)){
		dec[''] = parseFloat('0');
	}

	return dec[''];
};

var hexReverse	= function(hex){
	var data = '',
		hexArr = hex.split(' ');

	for(i in hexArr){
		data = hexArr[i] + " " + data;
	}

	return data.slice(0, -1);
};

var hexify		= function(hex){
	const hexVal = {
		'0': 0,
		'1': 1,
		'2': 2,
		'3': 3,
		'4': 4,
		'5': 5,
		'6': 6,
		'7': 7,
		'8': 8,
		'9': 9,
		'A': 10,
		'a': 10,
		'B': 11,
		'b': 11,
		'C': 12,
		'c': 12,
		'D': 13,
		'd': 13,
		'E': 14,
		'e': 14,
		'F': 15,
		'f': 15
	};

	var data = '',
		hexArr = hex.split(' ');

	for(i in hexArr){
		var tmp = hexVal[hexArr[i][0]] * 16 + hexVal[hexArr[i][1]];
		data += String.fromCharCode(tmp);
	}

	return data;
};


//-------------------------------------------
// Helpers (http://phpjs.org)
//-------------------------------------------
var bindec				= function(bin) {
	bin = (bin + '').replace(/[^01]/gi, '');
	return parseInt(bin, 2);
};

var chunk_split			= function(body, chunklen, end) {
	chunklen = parseInt(chunklen, 10) || 76;
	end = end || '\r\n';

	if(chunklen < 1){
		return false;
	}

	return body.match(new RegExp('.{0,' + chunklen + '}', 'g')).join(end);
};

var unpack				= function(format, data) {
	// http://kevin.vanzonneveld.net
	// +	original by: Tim de Koning (http://www.kingsquare.nl)
	// +		parts by: Jonas Raoni Soares Silva - http://www.jsfromhell.com
	// +		parts by: Joshua Bell - http://cautionsingularityahead.blogspot.nl/
	// +
	// +	bugfixed by: marcuswestin
	// %		note 1: Float decoding by: Jonas Raoni Soares Silva
	// %		note 2: Home: http://www.kingsquare.nl/blog/22-12-2009/13650536
	// %		note 3: Feedback: phpjs-unpack@kingsquare.nl
	// %		note 4: 'machine dependant byte order and size' aren't
	// %		note 5: applicable for JavaScript unpack works as on a 32bit,
	// %		note 6: little endian machine
	// *	  example 1: unpack('d', "\u0000\u0000\u0000\u0000\u00008YÀ");
	// *	  returns 1: { "": -100.875 }

	var formatPointer = 0, dataPointer = 0, result = {}, instruction = '',
		quantifier = '', label = '', currentData = '', i = 0, j = 0,
		word = '', fbits = 0, ebits = 0, dataByteLength = 0;

	// Used by float decoding - by Joshua Bell
	//http://cautionsingularityahead.blogspot.nl/2010/04/javascript-and-ieee754-redux.html
	var fromIEEE754 = function(bytes, ebits, fbits) {
		// Bytes to bits
		var bits = [];
		for(var i = bytes.length; i; i -= 1){
			var byte = bytes[i - 1];

			for(var j = 8; j; j -= 1){
				bits.push(byte % 2 ? 1 : 0); byte = byte >> 1;
			}
		}

		bits.reverse();
		var str = bits.join('');
		// Unpack sign, exponent, fraction
		var bias = (1 << (ebits - 1)) - 1;
		var s = parseInt(str.substring(0, 1), 2) ? -1 : 1;
		var e = parseInt(str.substring(1, 1 + ebits), 2);
		var f = parseInt(str.substring(1 + ebits), 2);

		// Produce number
		if(e === (1 << ebits) - 1){
			return f !== 0 ? NaN : s * Infinity;
		}
		else if(e > 0){
			return s * Math.pow(2, e - bias) * (1 + f / Math.pow(2, fbits));
		}
		else if(f !== 0){
			return s * Math.pow(2, -(bias-1)) * (f / Math.pow(2, fbits));
		}
		else {
			return s * 0;
		}
	}

	while(formatPointer < format.length){
		instruction = format.charAt(formatPointer);

		// Start reading 'quantifier'
		quantifier = '';
		formatPointer++;
		while((formatPointer < format.length) && (format.charAt(formatPointer).match(/[\d\*]/) !== null)){
			quantifier += format.charAt(formatPointer);
			formatPointer++;
		}

		if(quantifier === ''){
			quantifier = '1';
		}

		// Start reading label
		label = '';
		while((formatPointer < format.length) && (format.charAt(formatPointer) !== '/')){
			label += format.charAt(formatPointer);
			formatPointer++;
		}

		if(format.charAt(formatPointer) === '/'){
			formatPointer++;
		}

		// Process given instruction
		switch (instruction) {
			case 'a': // NUL-padded string
			case 'A': // SPACE-padded string
				if(quantifier === '*'){
					quantifier = data.length - dataPointer;
				}
				else {
					quantifier = parseInt(quantifier, 10);
				}
				currentData = data.substr(dataPointer, quantifier);
				dataPointer += quantifier;

				if(instruction === 'a'){
					currentResult = currentData.replace(/\0+$/, '');
				}
				else {
					currentResult = currentData.replace(/ +$/, '');
				}
				result[label] = currentResult;
			break;

			case 'h': // Hex string, low nibble first
			case 'H': // Hex string, high nibble first
				if(quantifier === '*'){
					quantifier = data.length - dataPointer;
				}
				else {
					quantifier = parseInt(quantifier, 10);
				}
				currentData = data.substr(dataPointer, quantifier);
				dataPointer += quantifier;

				if(quantifier > currentData.length){
					throw new Error('Warning: unpack(): Type ' + instruction +
									': not enough input, need ' + quantifier);
				}

				currentResult = '';
				for (i = 0; i < currentData.length; i++) {
					word = currentData.charCodeAt(i).toString(16);

					if (instruction === 'h') {
						word = word[1] + word[0];
					}

					currentResult += word;
				}

				result[label] = currentResult;
			break;

			case 'c': // signed char
			case 'C': // unsigned c
				if(quantifier === '*'){
					quantifier = data.length - dataPointer;
				}
				else {
					quantifier = parseInt(quantifier, 10);
				}

				currentData = data.substr(dataPointer, quantifier);
				dataPointer += quantifier;

				for (i = 0; i < currentData.length; i++) {
					currentResult = currentData.charCodeAt(i);
					if ((instruction === 'c') && (currentResult >= 128)) {
						currentResult -= 256;
					}

					result[label + (quantifier > 1 ? (i + 1) : '')] = currentResult;
				}
			break;

			case 'S': // unsigned short (always 16 bit, machine byte order)
			case 's': // signed short (always 16 bit, machine byte order)
			case 'v': // unsigned short (always 16 bit, little endian byte order)
				if(quantifier === '*'){
					quantifier = (data.length - dataPointer) / 2;
				} 
				else {
					quantifier = parseInt(quantifier, 10);
				}

				currentData = data.substr(dataPointer, quantifier * 2);
				dataPointer += quantifier * 2;

				for (i = 0; i < currentData.length; i += 2) {
					// sum per word;
					currentResult = ((currentData.charCodeAt(i + 1) & 0xFF) << 8) + (currentData.charCodeAt(i) & 0xFF);

					if ((instruction === 's') && (currentResult >= 32768)) {
						currentResult -= 65536;
					}

					result[label + (quantifier > 1 ? ((i / 2) + 1) : '')] = currentResult;
				}
			break;

			case 'n': // unsigned short (always 16 bit, big endian byte order)
				if(quantifier === '*'){
					quantifier = (data.length - dataPointer) / 2;
				} 
				else {
					quantifier = parseInt(quantifier, 10);
				}

				currentData = data.substr(dataPointer, quantifier * 2);
				dataPointer += quantifier * 2;

				for (i = 0; i < currentData.length; i += 2) {
					// sum per word;
					currentResult = ((currentData.charCodeAt(i) & 0xFF) << 8) + (currentData.charCodeAt(i + 1) & 0xFF);
					result[label + (quantifier > 1 ? ((i / 2) + 1) : '')] = currentResult;
				}
			break;

			case 'i': // signed integer (machine dependent size and byte order)
			case 'I': // unsigned integer (machine dependent size & byte order)
			case 'l': // signed long (always 32 bit, machine byte order)
			case 'L': // unsigned long (always 32 bit, machine byte order)
			case 'V': // unsigned long (always 32 bit, little endian byte order)
				if(quantifier === '*'){
					quantifier = (data.length - dataPointer) / 4;
				}
				else {
					quantifier = parseInt(quantifier, 10);
				}

				currentData = data.substr(dataPointer, quantifier * 4);
				dataPointer += quantifier * 4;

				for (i = 0; i < currentData.length; i += 4) {
					currentResult = ((currentData.charCodeAt(i + 3) & 0xFF) << 24) +
									((currentData.charCodeAt(i + 2) & 0xFF) << 16) +
									((currentData.charCodeAt(i + 1) & 0xFF) << 8) +
									((currentData.charCodeAt(i) & 0xFF));

					result[label + (quantifier > 1 ? ((i / 4) + 1) : '')] = currentResult;
				}
			break;

			case 'N': // unsigned long (always 32 bit, little endian byte order)
				if(quantifier === '*'){
					quantifier = (data.length - dataPointer) / 4;
				} 
				else {
					quantifier = parseInt(quantifier, 10);
				}

				currentData = data.substr(dataPointer, quantifier * 4);
				dataPointer += quantifier * 4;

				for (i = 0; i < currentData.length; i += 4) {
					currentResult = ((currentData.charCodeAt(i) & 0xFF) << 24) +
									((currentData.charCodeAt(i + 1) & 0xFF) << 16) +
									((currentData.charCodeAt(i + 2) & 0xFF) << 8) +
									((currentData.charCodeAt(i + 3) & 0xFF));

					result[label + (quantifier > 1 ? ((i / 4) + 1) : '')] = currentResult;
				}
			break;

			case 'f': //float
			case 'd': //double
				ebits = 8;
				fbits = (instruction === 'f') ? 23 : 52;
				dataByteLength = 4;
				if(instruction === 'd'){
					ebits = 11;
					dataByteLength = 8;
				}

				if(quantifier === '*'){
					quantifier = (data.length - dataPointer) / dataByteLength;
				} 
				else {
					quantifier = parseInt(quantifier, 10);
				}

				currentData = data.substr(dataPointer, quantifier * dataByteLength);
				dataPointer += quantifier * dataByteLength;

				for (i = 0; i < currentData.length; i += dataByteLength) {
					data = currentData.substr(i, dataByteLength);

					bytes = [];
					for (j = data.length - 1; j >= 0; --j) {
						bytes.push(data.charCodeAt(j));
					}

					result[label + (quantifier > 1 ? ((i / 4) + 1) : '')] = fromIEEE754(bytes, ebits, fbits);
				}
			break;

			case 'x': // NUL byte
			case 'X': // Back up one byte
			case '@': // NUL byte
			if(quantifier === '*'){
				quantifier = data.length - dataPointer;
			} 
			else {
				quantifier = parseInt(quantifier, 10);
			}

			if(quantifier > 0){
				if(instruction === 'X'){
					dataPointer -= quantifier;
				} 
				else {
					if(instruction === 'x'){
						dataPointer += quantifier;
					} 
					else {
						dataPointer = quantifier;
					}
				}
			}
			break;

			default:
				throw new Error('Warning:  unpack() Type ' + instruction +
								': unknown format code');
		}
	}
	return result;
}

var hex2bin				= function(hex){
	var i, k, part, ret = '';
	// lookup table for easier conversion. '0' characters are padded for '1' to '7'
	var lookupTable = {
		'0': '0000', '1': '0001', '2': '0010', '3': '0011', '4': '0100',
		'5': '0101', '6': '0110', '7': '0111', '8': '1000', '9': '1001',
		'a': '1010', 'b': '1011', 'c': '1100', 'd': '1101',
		'e': '1110', 'f': '1111',
		'A': '1010', 'B': '1011', 'C': '1100', 'D': '1101',
		'E': '1110', 'F': '1111'
	};
	for (i = 0; i < hex.length; i += 1) {
		if (lookupTable.hasOwnProperty(hex[i])) {
			ret += lookupTable[hex[i]];
		} else {
			return { valid: false };
		}
	}
	return { valid: true, result: ret };
}

var compareKey			= function(arr1, arr2){
	for(key in arr1){
		if(!arr2.hasOwnProperty(key)){
			return false;
		}
	}

	return true;
};

var vector3				= function(x, y, z){
	return {'x': x, 'y': y, 'z': z};
};

var vector4				= function(x, y , z, w){
	return {'x': x, 'y': y, 'z': z, 'w': w};
};

var colorRGBA			= function(r, g, b, a){
	return {'r': r, 'g': g, 'b': b, 'a': a};
};

var strPad		= function(input, length, string) {
	string = string || '0'; input = input + '';
	return input.length >= length ? input : new Array(length - input.length + 1).join(string) + input;
};


//-------------------------------------------
// Exported
//-------------------------------------------
exports.readCat		= readCat;
exports.readEnt		= readEnt;
exports.readFac		= readFac;
exports.readSmbph	= readSmbph;
exports.readSmbpl	= readSmbpl;
exports.readSmbpm	= readSmbpm;
exports.readSmd2	= readSmd2;
exports.readSment	= readSment;
exports.readSmsec	= readSmsec;
exports.readSmskin	= readSmskin;