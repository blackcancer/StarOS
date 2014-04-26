/*
	Product: StarOS starmade utils
	Description: This script provide basic lib for starmade file get / set
	License: http://creativecommons.org/licenses/by/3.0/legalcode

	FileVersion: 0.1-rev00001					Date: 2014-04-07
	By Blackcancer

	website: http://initsysrev.net
	support: blackcancer@initsysrev.net
*/

(function(){
	window.StarOS = window.StarOS || {};

	const _TRANSLATION = (StarOS.translation && StarOS.translation.StarMade)? StarOS.translation.StarMade : false;

	var _socket = new StarOS.COM.Socket(StarOS.config.StarOS_serv.host, StarOS.config.StarOS_serv.port);

	function log_2(n){
		return Math.log(n) / Math.log(2);
	}

	//--------------------------------------------
	// Converstion functions
	//--------------------------------------------
	function CfgToJSON(data){
		var lines	= data.split('\r\n'),
			options	= {};

		for(var i = 0, len = lines.length; i < len; i++){
			var arr;

			lines[i]	= lines[i].replace(/\/\/.*/,'');
			lines[i]	= lines[i].replace(/\s+/g,"");

			arr		= lines[i].split("=");

			if(arr[1] !== undefined || arr[0] !== ""){
				arr[1]	= arr[1].toLowerCase();
				if(arr[1].indexOf('.') != -1 && !isNaN(parseFloat(arr[1]))){
					arr[1] = parseFloat(arr[1]);
				}
				else if(!isNaN(parseInt(arr[1]))){
					arr[1] = parseInt(arr[1]);
				}
				else if(arr[1] == "true"){
					arr[1] = true;
				}
				else if(arr[1] == "false"){
					arr[1] = false;
				}
				options[arr[0]] = arr[1];
			}

		}

		return options;
	};

	function ListToArr(data){
		var lines	= data.split('\r\n'),
			len		= lines.length,
			middle	= 0,
			left	= [],
			right	= [],
			val		= [];

		if(len < 2){
			return lines;
		}

		middle = Math.floor(len / 2);
		left = lines.slice(0, middle);
		right = lines.slice(middle);

		while(left.length > 0 && right.length > 0){
			var leftArr = left.shift(),
				rightArr = right.shift();

			leftArr = leftArr.split(':');
			rightArr = rightArr.split(':');

			if(leftArr[0] !== "" && leftArr[1]){
				val.push(leftArr[1]);
			}

			if(rightArr[0] !== "" && rightArr[1]){
				val.push(rightArr[1]);
			}
		}

		return val;
	};

	function StringToXml(data){
		var xml;

		if (window.ActiveXObject){
			xml = new ActiveXObject('Microsoft.XMLDOM');
			xml.async='false';
			xml.loadXML(data);
		}
		else {
			var parser = new DOMParser();
			xml = parser.parseFromString(data,'text/xml');
		}

		return xml;
	};

	function JSONtoCfg(json){
		var str = "";

		for(var obj in json){
			str += obj + " = " + json[obj] + "\r\n";
		}

		return str;
	};

	function ArrToList(arr){
		var str = "";
			len = arr.length,
			middle = 0;
			left = [],
			right = [];

		if(len == 1){
			str = "nm:" + arr[0] + "\r\n";
			return str;
		}

		middle = Math.floor(len / 2);
		left = arr.slice(0, middle);
		right = arr.slice(middle);

		while(left.length > 0 && right.length > 0){
			str += "nm:" + left.shift() + "\r\n";
			str += "nm:" + right.shift() + "\r\n";
		}

		return str;
	};


	//--------------------------------------------
	// getters
	//--------------------------------------------
	/**
	* get admins list
	**/
	var getAdminsTxt = function(callback){
		_socket.callAPI('getAdminsTxt', 'vfs', 'fread', {path: StarOS.config.path.starmade + 'admins.txt'});

		_socket.on('API::getAdminsTxt', function(err, data){
			if(data){
				data = data.split('\n');
			}
			callback(err, data);
		});
	};

	/**
	* get Server whitelist
	**/
	var getWhitlistTxt = function(callback){
		_socket.callAPI('getWhitlistTxt', 'vfs', 'fread', {path: StarOS.config.path.starmade + 'whitelist.txt'});

		_socket.on('API::getWhitlistTxt', function(err, data){
			if(data){
				data = ListToArr(data);
			}
			callback(err, data);
		});
	};

	/**
	* get Server blacklist
	**/
	var getBlacklistTxt = function(callback){
		_socket.callAPI('getBlacklistTxt', 'vfs', 'fread', {path: StarOS.config.path.starmade + 'blacklist.txt'});

		_socket.on('API::getBlacklistTxt', function(err, data){
			if(data){
				data = ListToArr(data);
			}
			callback(err, data);
		});
	};

	/**
	* get Server configuration file
	**/
	var getServerCfg = function(callback){
		_socket.callAPI('getServerCfg', 'vfs', 'fread', {path: StarOS.config.path.starmade + 'server.cfg'});

		_socket.on('API::getServerCfg', function(err, data){
			if(data){
				data = CfgToJSON(data);
			}

			callback(err, data);
		});
	};

	/**
	* get Server login message
	**/
	var getServerMsg = function(callback){
		_socket.callAPI('getServerMsg', 'vfs', 'fread', {path: StarOS.config.path.starmade + 'server-message.txt'});

		_socket.on('API::getServerMsg', function(err, data){
			callback(err, data);
		});
	};

	/**
	* get Server version
	**/
	var getVersionTxt = function(callback){
		_socket.callAPI('getVersionTxt', 'vfs', 'fread', {path: StarOS.config.path.starmade + 'version.txt'});

		_socket.on('API::getServerMsg', function(err, data){
			if(data){
				var arr			= data.split('#'),
					version		= arr[0],
					fulldate	= arr[1].split('_'),
					hour		= fulldate[1].match(/.{1,2}/g).join(':'),
					date		= fulldate[0].replace(/(\d{4})(\d{2})(\d{2})/, '$3/$2/$1');

				data = {
					version:	version,
					date:		date,
					hour:		hour
				}
			}
			callback(err, data);
		});
	};

	/**
	* get last log
	**/
	var getLastLog = function(callback){
		_socket.callAPI('getLastLog', 'vfs', 'fread', {path: StarOS.config.path.starmade + 'logs/log.txt.0'});

		_socket.on('API::getLastLog', function(err, data){
			if(data){
			}
			callback(err, data);
		});
	};

	/**
	* get last serverlog
	**/
	var getLastServerLog = function(callback){
		_socket.callAPI('getLastServerLog', 'vfs', 'fread', {path: StarOS.config.path.starmade + 'logs/serverlog.txt.0'});

		_socket.on('API::getLastServerLog', function(err, data){
			if(data){
			}
			callback(err, data);
		});
	};

	/**
	* get block definition
	**/
	var getBlockDef = function(callback){
		_socket.callAPI('getBlockDef', 'vfs', 'fread', {path: StarOS.config.path.starmade + 'data/config/BlockConfig.xml'});

		_socket.on('API::getBlockDef', function(err, data){
			if(data){
				data = StringToXml(data);
			}
			callback(err, data);
		});
	};

	/**
	* get block type
	**/
	var getBlockType = function(callback){
		_socket.callAPI('getBlockType', 'vfs', 'fread', {path: StarOS.config.path.starmade + 'data/config/BlockTypes.properties'});

		_socket.on('API::getBlockType', function(err, data){
			if(data){
				data = CfgToJSON(data);
			}
			callback(err, data);
		});
	};

	/**
	* get block definition synchro
	**/
	var getSyncBlockDef	= function(callback){
		var StarOS_serv = StarOS.config.StarOS_serv,
			params = 'path=' + StarOS.config.path.starmade + 'data/config/BlockConfig.xml',
			blocksDef;

		if(!StarOS.COM.Ajax('http://' + StarOS_serv.host + ':' + StarOS_serv.port + '/getFile?' + params, onSuccess, onError, {sync:true})){
			console.log("err");
		}
		function onSuccess(data, xhr, url){
			blocksDef = StringToXml(data);
		}

		function onError(err, data, xhr, url){
			blocksDef = false;
		}

		return blocksDef;
	};

	/**
	* get block type synchro
	**/
	var getSyncBlockType	= function(callback){
		var StarOS_serv = StarOS.config.StarOS_serv,
			params = 'path=' + StarOS.config.path.starmade + 'data/config/BlockTypes.properties',
			blockType;

		if(!StarOS.COM.Ajax('http://' + StarOS.config.StarOS_serv.host + ':' + StarOS.config.StarOS_serv.port + '/getFile?' + params, onSuccess, onError, {sync:true})){
			console.log("err");
		}
		function onSuccess(data, xhr, url){
			blockType = CfgToJSON(data);
		}

		function onError(err, data, xhr, url){
			blockType = false;
		}

		return blockType;
	};

	/**
	* get log book entries
	**/
	var getLogBooks		= function(callback){
		_socket.callAPI('getLogBooks', 'vfs', 'fread', {path: StarOS.config.path.starmade + 'data/config/logbookEntriesGen.txt'});

		_socket.on('API::getLogBooks', function(err, data){
			if(data){
				data = data.split('\r\n-\r\n');
			}
			callback(err, data);
		});
	};

	var getBlockGroup	= function(blocks, idPos){
		var group = [],
			exist = false;

		pos = idPos.split(',');
		for(var i = 3; i--;){
			pos[i] = parseInt(pos[i]);
		}

		for(var b in blocks){
			if(blocks[b] == (pos[0] + 1) + "," + pos[1] + "," + pos[2]){
				group.push(blocks[b]);
				delete blocks[b];
			}
			else if(blocks[b] == (pos[0] - 1) + "," + pos[1] + "," + pos[2]){
				group.push(blocks[b]);
				delete blocks[b];
			}

			else if(blocks[b] == pos[0] + "," + (pos[1] + 1) + "," + pos[2]){
				group.push(blocks[b]);
				delete blocks[b];
			}
			else if(blocks[b] == pos[0] + "," + (pos[1] - 1) + "," + pos[2]){
				group.push(blocks[b]);
				delete blocks[b];
			}

			else if(blocks[b] == pos[0] + "," + pos[1] + "," + (pos[2] + 1)){
				group.push(blocks[b]);
				delete blocks[b];
			}
			else if(blocks[b] == pos[0] + "," + pos[1] + "," + (pos[2] - 1)){
				group.push(blocks[b]);
				delete blocks[b];
			}

			if(group.length == 5){
				break;
			}
		}

		for(var i = 0, len = group.length; i < len; i++){
			var returned = getBlockGroup(blocks, group[i]);
			group = group.concat(returned);
		}

		return group;

	}

	var getBoundBox		= function(grpBlocks){
		var box = {
			minX: 8,
			minY: 8,
			minZ: 8,
			maxX: 0,
			maxY: 0,
			maxZ: 0
		}

		for(var i = 0, len = grpBlocks.length; i < len; i++){
			var splited = grpBlocks[i].split(',');

			box.minX = (splited[0] < box.minX) ? splited[0] : box.minX;
			box.minY = (splited[1] < box.minY) ? splited[1] : box.minY;
			box.minZ = (splited[2] < box.minZ) ? splited[2] : box.minZ;

			box.maxX = (splited[0] > box.maxX) ? splited[0] : box.maxX;
			box.maxY = (splited[1] > box.maxY) ? splited[1] : box.maxY;
			box.maxZ = (splited[2] > box.maxZ) ? splited[2] : box.maxZ;
		}

		return box;
	};

	//--------------------------------------------
	// setters
	//--------------------------------------------
	/**
	* set admins list
	**/
	var setAdminsTxt = function(arr, callback){
		var data = arr.join('\n');

		_socket.callAPI('setAdminsTxt', 'vfs', 'fwrite', {path: StarOS.config.path.starmade + 'admins.txt', data: data});

		_socket.on('API::setAdminsTxt', function(err){
			callback(err);
		});
	};

	/**
	* set whitelist list
	**/
	var setWhitelistTxt = function(arr, callback){
		var data = ArrToList(arr);

		_socket.callAPI('setWhitelistTxt', 'vfs', 'fwrite', {path: StarOS.config.path.starmade + 'whitelist.txt', data: data});

		_socket.on('API::setWhitelistTxt', function(err){
			callback(err);
		});
	};

	/**
	* set blacklist list
	**/
	var setBlacklistTxt = function(arr, callback){
		var data = ArrToList(arr);

		_socket.callAPI('setBlacklistTxt', 'vfs', 'fwrite', {path: StarOS.config.path.starmade + 'blacklist.txt', data: data});

		_socket.on('API::setBlacklistTxt', function(err){
			callback(err);
		});
	};

	/**
	* set Server config
	**/
	var setServerCfg = function(json, callback){
		var data = JSONtoCfg(json);

		_socket.callAPI('setServerCfg', 'vfs', 'fwrite', {path: StarOS.config.path.starmade + 'server.cfg', data: data});

		_socket.on('API::setServerCfg', function(err){
			callback(err);
		});
	};

	/**
	* set Server login message
	**/
	var setServerMsg = function(json, callback){
		_socket.callAPI('setServerMsg', 'vfs', 'fwrite', {path: StarOS.config.path.starmade + 'server-message.cfg', data: data});

		_socket.on('API::setServerMsg', function(err){
			callback(err);
		});
	};

	/**
	* set log book entries
	**/
	var setLogBooks = function(arr, callback){
		var data = arr.join('\r\n-\r\n');

		_socket.callAPI('setLogBooks', 'vfs', 'fwrite', {path: StarOS.config.path.starmade + 'data/config/logbookEntriesGen.txt', data: data});

		_socket.on('API::setLogBooks', function(err){
			callback(err);
		});
	};


	//--------------------------------------------
	// Shield Class
	//--------------------------------------------
	var Shield = function(size){
		this.size		= size || 0;
		this.capacity	= 0;
		this.rate		= 0;
		this.recovery	= 0;
		this.needUpdate	= true;
	};

	Shield.prototype.update			= function(){
		this.capacity	= Math.pow(this.size * 3.5, 0.66666) * 350;
		this.rate		= Math.pow(this.size * 5, 0.5) * 50;

		if(this.size > 256){
			this.recovery = 1.0;
		}
		else if(this.size > 1024){
			this.recovery = 2.0;
		}
		else if(this.size > 4096){
			this.recovery = 3.0;
		}
		else if(this.size > 16384){
			this.recovery = 4.0;
		}
		else if(this.size > 262144){
			this.recovery = 5.0;
		}

		this.recovery = 0.5;
		this.needUpdate	= false;
	};

	Shield.prototype.getCapacity	= function(){
		if(this.needUpdate){
			this.update();
		}

		return this.capacity;
	};

	Shield.prototype.getRate		= function(){
		if(this.needUpdate){
			this.update();
		}

		return this.rate;
	};

	Shield.prototype.getRecovery	= function(){
		if(this.needUpdate){
			this.update();
		}

		return this.recovery;
	};

	Shield.prototype.getSize		= function(){
		return this.size;
	};

	Shield.prototype.setSize		= function(n){
		var oldVal	= this.size;
		this.size	= n;

		if(n != oldVal){
			this.needUpdate = true;
		}
	};


	//--------------------------------------------
	// ControllerUnit Class
	//--------------------------------------------
	var ControllerUnit = function(){
		this.controllers = [];
		this.initControllers();
	};

	ControllerUnit.prototype.initControllers	= function(){
		this.controllers.push(new WeaponComp());
		this.controllers.push(new D1000MissileCPU());
		this.controllers.push(new SDKBMissileCPU());
		this.controllers.push(new SDBBMissileCPU());
		this.controllers.push(new SalvageUnit());
		this.controllers.push(new RepairUnit());
		this.controllers.push(new PowerDrainUnit());
		this.controllers.push(new PowerSupplyUnit());
		this.controllers.push(new JamUnit());
		this.controllers.push(new CloakUnit());
		this.controllers.push(new PulseUnit());
	};

	ControllerUnit.prototype.getControllers		= function(){
		return this.controllers;
	};

	ControllerUnit.prototype.getControllerById	= function(n){
		var controllers = this.getControllers();
		for(var i = 0, len = controllers.length; i < len; i++){
			if(controllers[i].getControllerId() == n){
				return controllers[i];
			}
		}
	};


	//--------------------------------------------
	// BasicUnit Class
	//--------------------------------------------
	var BasicUnit = (function(){
		_uid = 0;

		return function(){
			this.size			= 0;
			this.value			= 0;
			this.needUpdate		= true;
			this.domElement		= null;
			this.pos			= '8,8,8';
			this.minPos			= '8,8,8';
			this.maxPos			= '8,8,8';
			this.uid = _uid;

			_uid++;
		}
	})();

	BasicUnit.prototype.init			= function(){
		this.setDomElement();
		this.recalculate();
	};

	BasicUnit.prototype.getValue		= function(){
		if(this.needUpdate){
			this.recalculate();
			this.needUpdate = false;
		}

		return this.value;
	};

	BasicUnit.prototype.recalculate		= function(){};

	BasicUnit.prototype.setDomElement	= function(){};

	BasicUnit.prototype.setDimensions	= function(minPos, maxPos){
		var oldMinPos = this.minPos,
			oldMaxPos = this.maxPos;

		this.minPos = minPos;
		this.maxPos = maxPos;

		if(oldMinPos != this.minPos || oldMaxPos != this.maxPos){
			this.setDomElement();
		}
	};

	BasicUnit.prototype.setMaxPoints	= function(n){
		var oldVal = this.size;
		this.size = n;

		if(oldVal != n){
			this.recalculate();
			this.setDomElement();
		}
	};


	//--------------------------------------------
	// SalvageUnit Class
	//--------------------------------------------
	var SalvageUnit = function (){
		BasicUnit.apply(this, arguments);
		this.SALVAGE	= 4;
	};

	SalvageUnit.prototype					= Object.create(BasicUnit.prototype);

	SalvageUnit.prototype.getControllerId	= function(){
		return this.SALVAGE;
	};

	SalvageUnit.prototype.getControllerName	= function(){
		return "salvage";
	};

	SalvageUnit.prototype.recalculate		= function(){
		this.value = 7 / Math.pow(Math.max(0, this.size), 1.2);
	};

	SalvageUnit.prototype.setDomElement		= function(){
		var _self = this;
		var div	= document.createElement('div'),
			dl	= document.createElement('dl'),
			dt	= {
				dimension:		document.createElement('dt'),
				salvageSpeed:	document.createElement('dt')
			},
			dd		= {
				dimension:		document.createElement('dd'),
				salvageSpeed:	document.createElement('dd')
			},
			dtName = _TRANSLATION ? _TRANSLATION.controller.dimension : "dimension";

		dl.className = 'dl_level3';
		dl.className += ' withSlide';

		dt.dimension.innerHTML		= dtName.capitalize() + ":";
		dd.dimension.innerHTML		= "(" + this.minPos + "), (" + this.maxPos + ")";

		dtName = _TRANSLATION ? _TRANSLATION.controller.salvageSpeed : "salvage speed";
		dt.salvageSpeed.innerHTML		= dtName.capitalize() + ":";
		dd.salvageSpeed.innerHTML		= this.getValue().toFixed(6);

		for(var i in dt){
			dt[i].className = 'dt_level3';
			dd[i].className = 'dd_level3';
			dl.appendChild(dt[i]);
			dl.appendChild(dd[i]);
		}

		this.domElement = dl;
	};


	//--------------------------------------------
	// JamUnit Class
	//--------------------------------------------
	var JamUnit = function (){
		BasicUnit.apply(this, arguments);
		this.RADARJAM	= 15;
	};

	JamUnit.prototype					= Object.create(BasicUnit.prototype);

	JamUnit.prototype.getControllerId	= function(){
		return this.RADARJAM;
	};

	JamUnit.prototype.getControllerName	= function(){
		return "jammer";
	};

	JamUnit.prototype.recalculate		= function(){
		this.value = 500 * this.size;
	};

	JamUnit.prototype.setDomElement		= function(){
		var _self = this;
		var div	= document.createElement('div'),
			dl	= document.createElement('dl'),
			dt	= {
				dimension:		document.createElement('dt'),
				jamPower:		document.createElement('dt')
			},
			dd		= {
				dimension:		document.createElement('dd'),
				jamPower:		document.createElement('dd')
			},
			dtName = _TRANSLATION ? _TRANSLATION.controller.dimension : "dimension";

		dl.className = 'dl_level3';
		dl.className += ' withSlide';

		dt.dimension.innerHTML		= dtName.capitalize() + ":";
		dd.dimension.innerHTML		= "(" + this.minPos + "), (" + this.maxPos + ")";

		dtName = _TRANSLATION ? _TRANSLATION.controller.jamPower : "power";
		dt.jamPower.innerHTML		= dtName.capitalize() + ":";
		dd.jamPower.innerHTML		= this.getValue().toFixed(1) + "e/sec";

		for(var i in dt){
			dt[i].className = 'dt_level3';
			dd[i].className = 'dd_level3';
			dl.appendChild(dt[i]);
			dl.appendChild(dd[i]);
		}

		this.domElement = dl;
	};


	//--------------------------------------------
	// CloakUnit Class
	//--------------------------------------------
	var CloakUnit = function (){
		BasicUnit.apply(this, arguments);
		this.CLOAKER	= 22;
	};

	CloakUnit.prototype						= Object.create(BasicUnit.prototype);

	CloakUnit.prototype.getControllerId		= function(){
		return this.CLOAKER;
	};

	CloakUnit.prototype.getControllerName	= function(){
		return "cloaker";
	};

	CloakUnit.prototype.recalculate			= function(){
		this.value = 1000 * this.size;
	};

	CloakUnit.prototype.setDomElement		= function(){
		var _self = this;
		var div	= document.createElement('div'),
			dl	= document.createElement('dl'),
			dt	= {
				dimension:		document.createElement('dt'),
				cloakPower:		document.createElement('dt')
			},
			dd		= {
				dimension:		document.createElement('dd'),
				cloakPower:		document.createElement('dd')
			},
			dtName = _TRANSLATION ? _TRANSLATION.controller.dimension : "dimension";

		dl.className = 'dl_level3';
		dl.className += ' withSlide';

		dt.dimension.innerHTML		= dtName.capitalize() + ":";
		dd.dimension.innerHTML		= "(" + this.minPos + "), (" + this.maxPos + ")";

		dtName = _TRANSLATION ? _TRANSLATION.controller.cloakPower : "power";
		dt.cloakPower.innerHTML		= dtName.capitalize() + ":";
		dd.cloakPower.innerHTML		= this.getValue().toFixed(1) + "e/sec";

		for(var i in dt){
			dt[i].className = 'dt_level3';
			dd[i].className = 'dd_level3';
			dl.appendChild(dt[i]);
			dl.appendChild(dd[i]);
		}

		this.domElement = dl;
	};


	//--------------------------------------------
	// RepairUnit Class
	//--------------------------------------------
	var RepairUnit = function (){
		BasicUnit.apply(this, arguments);
		this.REPAIR	= 39;
	};

	RepairUnit.prototype					= Object.create(BasicUnit.prototype);

	RepairUnit.prototype.getControllerId	= function(){
		return this.REPAIR;
	};

	RepairUnit.prototype.getControllerName	= function(){
		return "repair beam";
	};

	RepairUnit.prototype.recalculate		= function(){
		this.value = 3 / Math.pow(Math.max(0, this.size), 1.13);
	};

	RepairUnit.prototype.setDomElement		= function(){
		var _self = this;
		var div	= document.createElement('div'),
			dl	= document.createElement('dl'),
			dt	= {
				dimension:		document.createElement('dt'),
				repairSpeed:	document.createElement('dt')
			},
			dd		= {
				dimension:		document.createElement('dd'),
				repairSpeed:	document.createElement('dd')
			},
			dtName = _TRANSLATION ? _TRANSLATION.controller.dimension : "dimension";

		dl.className = 'dl_level3';
		dl.className += ' withSlide';

		dt.dimension.innerHTML		= dtName.capitalize() + ":";
		dd.dimension.innerHTML		= "(" + this.minPos + "), (" + this.maxPos + ")";

		dtName = _TRANSLATION ? _TRANSLATION.controller.repairSpeed : "salvage speed";
		dt.repairSpeed.innerHTML		= dtName.capitalize() + ":";
		dd.repairSpeed.innerHTML		= this.getValue().toFixed(6);

		for(var i in dt){
			dt[i].className = 'dt_level3';
			dd[i].className = 'dd_level3';
			dl.appendChild(dt[i]);
			dl.appendChild(dd[i]);
		}

		this.domElement = dl;
	};


	//--------------------------------------------
	// PowerDrainUnit Class
	//--------------------------------------------
	var PowerDrainUnit = function (){
		BasicUnit.apply(this, arguments);
		this.POWERDRAIN	= 332;
	};

	PowerDrainUnit.prototype					= Object.create(BasicUnit.prototype);

	PowerDrainUnit.prototype.getControllerId	= function(){
		return this.POWERDRAIN;
	};

	PowerDrainUnit.prototype.getControllerName	= function(){
		return "power drain beam";
	};

	PowerDrainUnit.prototype.recalculate		= function(){
		this.value = 7 / Math.pow(Math.max(0, this.size), 1.2);
	};

	PowerDrainUnit.prototype.setDomElement		= function(){
		var _self = this;
		var div	= document.createElement('div'),
			dl	= document.createElement('dl'),
			dt	= {
				dimension:		document.createElement('dt'),
				drainSpeed:	document.createElement('dt')
			},
			dd		= {
				dimension:		document.createElement('dd'),
				drainSpeed:	document.createElement('dd')
			},
			dtName = _TRANSLATION ? _TRANSLATION.controller.dimension : "dimension";

		dl.className = 'dl_level3';
		dl.className += ' withSlide';

		dt.dimension.innerHTML		= dtName.capitalize() + ":";
		dd.dimension.innerHTML		= "(" + this.minPos + "), (" + this.maxPos + ")";

		dtName = _TRANSLATION ? _TRANSLATION.controller.drainSpeed : "drain speed";
		dt.drainSpeed.innerHTML		= dtName.capitalize() + ":";
		dd.drainSpeed.innerHTML		= this.getValue().toFixed(6);

		for(var i in dt){
			dt[i].className = 'dt_level3';
			dd[i].className = 'dd_level3';
			dl.appendChild(dt[i]);
			dl.appendChild(dd[i]);
		}

		this.domElement = dl;
	};


	//--------------------------------------------
	// PowerSupplyUnit Class
	//--------------------------------------------
	var PowerSupplyUnit = function (){
		BasicUnit.apply(this, arguments);
		this.POWERSUPPLY	= 334;
	};

	PowerSupplyUnit.prototype					= Object.create(BasicUnit.prototype);

	PowerSupplyUnit.prototype.getControllerId	= function(){
		return this.POWERSUPPLY;
	};

	PowerSupplyUnit.prototype.getControllerName	= function(){
		return "power supply beam";
	};

	PowerSupplyUnit.prototype.recalculate		= function(){
		this.value = 7 / Math.pow(Math.max(0, this.size), 1.2);
	};

	PowerSupplyUnit.prototype.setDomElement		= function(){
		var _self = this;
		var div	= document.createElement('div'),
			dl	= document.createElement('dl'),
			dt	= {
				dimension:		document.createElement('dt'),
				supplySpeed:	document.createElement('dt')
			},
			dd		= {
				dimension:		document.createElement('dd'),
				supplySpeed:	document.createElement('dd')
			},
			dtName = _TRANSLATION ? _TRANSLATION.controller.dimension : "dimension";

		dl.className = 'dl_level3';
		dl.className += ' withSlide';

		dt.dimension.innerHTML		= dtName.capitalize() + ":";
		dd.dimension.innerHTML		= "(" + this.minPos + "), (" + this.maxPos + ")";

		dtName = _TRANSLATION ? _TRANSLATION.controller.supplySpeed : "supply speed";
		dt.supplySpeed.innerHTML		= dtName.capitalize() + ":";
		dd.supplySpeed.innerHTML		= this.getValue().toFixed(6);

		for(var i in dt){
			dt[i].className = 'dt_level3';
			dd[i].className = 'dd_level3';
			dl.appendChild(dt[i]);
			dl.appendChild(dd[i]);
		}

		this.domElement = dl;
	};


	//--------------------------------------------
	// PulseUnit Class
	//--------------------------------------------
	var PulseUnit = function (){
		BasicUnit.apply(this, arguments);
		this.PULSE	= 344;
		this.reload	= 0;
		this.radius	= 0;
		this.force	= 0;
		this.group	= [];
	};

	PulseUnit.prototype						= Object.create(BasicUnit.prototype);

	PulseUnit.prototype.getControllerId		= function(){
		return this.PULSE;
	};

	PulseUnit.prototype.getControllerName	= function(){
		return "pulse";
	};

	PulseUnit.prototype.getReload			= function(){
		if(this.needUpdate){
			this.recalculate();
			this.needUpdate = false;
		}

		return this.reload;
	};

	PulseUnit.prototype.getRadius			= function(){
		if(this.needUpdate){
			this.recalculate();
			this.needUpdate = false;
		}

		return this.radius;
	};

	PulseUnit.prototype.getForce			= function(){
		if(this.needUpdate){
			this.recalculate();
			this.needUpdate = false;
		}

		return this.force;
	};

	PulseUnit.prototype.setGroup			= function(group){
		var oldVal = this.group;
		this.group = group;

		if(oldVal != group){
			this.recalculate();
			this.setDomElement();
		}
	};

	PulseUnit.prototype.recalculate			= function(){
		var box = getBoundBox(this.group);

		this.reload	= Math.max(0.05, 25 / Math.max(1.0, log_2(box.maxX - box.minX)));
		this.radius	= Math.max(10, 10 + Math.pow(box.maxY - box.minY + 1, 1.1)) * 0.53;
		this.force	= Math.max(1, log_2((box.maxX - box.minX) * 25) *100);
		this.value = 7 / Math.pow(Math.max(0, this.size), 1.2);
	};

	PulseUnit.prototype.setDomElement		= function(){
		var _self = this;
		var div	= document.createElement('div'),
			dl	= document.createElement('dl'),
			dt	= {
				reload:	document.createElement('dt'),
				radius:	document.createElement('dt'),
				force:		document.createElement('dt')
			},
			dd		= {
				reload:	document.createElement('dd'),
				radius:	document.createElement('dd'),
				force:		document.createElement('dd')
			},
			defName	= {
				reload:	'reload',
				radius:	'radius',
				force:	'force'
			};

		dl.className = 'dl_level3';
		dl.className += ' withSlide';

		dd.reload.innerHTML		= '(X)  ' + this.getReload().toFixed(1) + " sec";
		dd.radius.innerHTML		= '(Y)  ' + this.getRadius().toFixed(6) + " m ";
		dd.force.innerHTML		= '(Z)  ' + this.getForce().toFixed(4) + " N";

		for(var i in dt){
			var dtName = _TRANSLATION ? _TRANSLATION.controller.effect[i] : defName[i];

			dt[i].innerHTML		= dtName.capitalize() + ":";
			dt[i].className = 'dt_level3';
			dd[i].className = 'dd_level3';
			dl.appendChild(dt[i]);
			dl.appendChild(dd[i]);
		}

		this.domElement = dl;
	};


	//--------------------------------------------
	// PointDistributionUnit Class
	//--------------------------------------------
	var PointDistributionUnit = (function() {
		_uid = 0;

		return function(){
			this.effects		= [];
			this.maxPoints		= 0;
			this.redistribute	= true;
			this.domElement		= null;
			this.idPos			= '8,8,8';
			this.uid = _uid;

			_uid++;
		}
	})();

	PointDistributionUnit.prototype.distributePoints	= function(){
		this.resetPointsSpent();

		var calculedPoints = j = 0;

		for(j; j < this.effects.length; j++){
			var points = this.effects[j].getDistribution() / 100 * this.getMaxPoints();

			this.effects[j].setPointsSpend(points);
			calculedPoints += points;
		}


		var rest = (this.getMaxPoints() - calculedPoints) / this.effects.length;
		j = 0;
		while(calculedPoints < this.getMaxPoints()){
			this.effects[j].setPointsSpend(this.effects[j].getPointsSpend() + rest);
			j = (j + 1) % this.effects.length;
			calculedPoints += rest;
		}
	};

	PointDistributionUnit.prototype.init				= function(){
			this.effects = this.initEffects();
			this.initDist();
			this.setDomElement();
	};

	PointDistributionUnit.prototype.initDist			= function(){
		var percent = 1 / this.effects.length * 100;

		for(var i = 0; i < this.effects.length; i++){
			this.effects[i].setDistribution(percent);
		}
	};

	PointDistributionUnit.prototype.setDomElement		= function(){
		var _self = this;
		var div			= document.createElement('div'),
			dlUnit		= document.createElement('dl'),
			dlEffects	= document.createElement('dl'),
			dtUnit		= {
				weaponPos:	document.createElement('dt'),
				rest:		document.createElement('dt')
			},
			ddUnit		= {
				weaponPos:	document.createElement('dd'),
				rest:		document.createElement('dd')
			};

		div.className		= 'controller';
		dlUnit.className	= 'dl_level1';
		dlEffects.className	= 'dl_level3';
		dlEffects.className	+= ' withSlide';

		for(var dt in dtUnit){
			dtUnit[dt].innerHTML = _TRANSLATION.controller[dt] + ":";

			dtUnit[dt].className = 'dt_level1';
			ddUnit[dt].className = 'dd_level1';
			ddUnit[dt].className += ' dd_Large';

			dlUnit.appendChild(dtUnit[dt]);
			dlUnit.appendChild(ddUnit[dt]);
		}

		for(var i = 0, len = this.effects.length; i < len; i++){
			var dt		= document.createElement('dt'),
				dd		= document.createElement('dd'),
				slider	= document.createElement('input'),
				eName	= this.effects[i].getName(),
				eTrans	= _TRANSLATION ? _TRANSLATION.controller.effect[eName] : eName;

			dt.innerHTML = eTrans.capitalize() + ":";
			dd.innerHTML = this.effects[i].toString();

			slider.type = 'range';
			slider.setAttribute('min',	 '0');
			slider.setAttribute('max',	 '100');
			slider.setAttribute('step',	 '1');
			slider.setAttribute('value', this.effects[i].getDistribution());
			slider.addEventListener('input', onInput, false);

			dt.className		= 'dt_level3';
			dd.className		= 'dd_level3';
			slider.className	= 'slider';
			dd.id				= 'dd_' + this.uid + "_" + this.getControllerId() + "_" + this.effects[i].getEffectId();
			slider.id			= 'slider_' + this.uid + "_" + this.getControllerId() + "_" + this.effects[i].getEffectId();

			dlEffects.appendChild(dt);
			dlEffects.appendChild(dd);
			dlEffects.appendChild(slider);
		}

		ddUnit.weaponPos.innerHTML	= this.idPos;
		ddUnit.rest.innerHTML		= this.getAvailableDist() +"%";

		div.appendChild(dlUnit);
		div.appendChild(dlEffects);
		this.domElement = div;

		function onInput(event){
			var idArr	= event.target.id.split("_"),
				val		= parseInt(event.target.value),
				id		= idArr[3];

			if(_self.getAvailableDist() == 0 && val > _self.getEffectById(id).getDistribution()){
				event.target.value = _self.getEffectById(id).getDistribution();
				return;
			}
			else {
				var effects = _self.getEffects()
				if(_self.getAvailableDist() < 0){
					val = 100;
					for(var i = 0, len = effects.length; i < len; i++){
						if(effects[i].getEffectId() == id){
							continue;
						}
					val -= effects[i].getDistribution();
					}
				}
				_self.receiveDistChange([{effectId: id, distrib: val}]);

				dlEffects.parentNode.style.display = "none";

				for(var i = 0, len = effects.length; i < len; i++){
					var slider	= document.getElementById('slider_'	+ idArr[1] + '_' + idArr[2] + '_' + effects[i].getEffectId()),
						dd		= document.getElementById('dd_'		+ idArr[1] + '_' + idArr[2] + '_' + effects[i].getEffectId());

					slider.setAttribute('value', effects[i].getDistribution());
					dd.innerHTML	= effects[i].toString();
				}
				ddUnit.rest.innerHTML		= _self.getAvailableDist() +"%";

				dlEffects.parentNode.style.display = "block";
			}

		};
	};

	PointDistributionUnit.prototype.initEffects			= function(){};	//abstract function

	PointDistributionUnit.prototype.getAvailableDist	= function(){
		var dist = 0;
		effects = this.effects;
		for(var i = 0; i < effects.length; i++){
			dist += effects[i].getDistribution();
		}

		return 100 - dist;
	};

	PointDistributionUnit.prototype.getEffects			= function(){
		if(this.redistribute){
			this.distributePoints();
			this.redistribute = false
		}
		return this.effects;
	};

	PointDistributionUnit.prototype.getEffectById		= function(n){
		var effects = this.getEffects();
		for(var i = 0, len = effects.length; i < len; i++){
			if(effects[i].getEffectId() == n){
				return effects[i];
			}
		}
	};

	PointDistributionUnit.prototype.getMaxPoints		= function(){
		return this.maxPoints;
	};

	PointDistributionUnit.prototype.receiveDistChange	= function(args){
		for(var i = 0; i < args.length; i++){
			var effect = this.getEffectById(args[i].effectId);
			effect.setDistribution(args[i].distrib);
		}

		this.distributePoints();
		this.getAvailableDist();
	};

	PointDistributionUnit.prototype.resetPointsSpent	= function(){
		var effects = this.effects;
		for(var i = 0, len = effects.lenght; i < len; i++){
			effects[i].reset();
		}
	};

	PointDistributionUnit.prototype.setMaxPoints		= function(n){
		var oldVal		= this.maxPoints;
		this.maxPoints	= n;

		if(oldVal != n){
			this.redistribute = true;
		}
	};

	PointDistributionUnit.prototype.setIdPos			= function(idPos){
		this.idPos = idPos;
		this.setDomElement();
	}


	//--------------------------------------------
	// WeaponUnit Class
	//--------------------------------------------
	var WeaponUnit = function(){
		PointDistributionUnit.apply(this, arguments);
		this.DAMAGE		= 0;
		this.DISTANCE	= 1;
		this.REALOAD	= 2;
		this.SPEED		= 3;
	};

	WeaponUnit.prototype				= Object.create(PointDistributionUnit.prototype);

	WeaponUnit.prototype.getDamage		= function(){
		return this.getEffects()[0].getValue();
	};

	WeaponUnit.prototype.getDistance	= function(){
		return this.getEffects()[1].getValue();
	};

	WeaponUnit.prototype.getReloadTime	= function(){
		return this.getEffects()[2].getValue();
	};

	WeaponUnit.prototype.getSpeed		= function(){
		return this.getEffects()[3].getValue();
	};

	WeaponUnit.prototype.initEffects	= function(){
		arrayOfEffect = [];
		arrayOfEffect[0] = new DamagePoint(this);
		arrayOfEffect[1] = new DistPoint(this);
		arrayOfEffect[2] = new ReloadPoint(this);
		arrayOfEffect[3] = new SpeedPoint(this);

		return arrayOfEffect;
	};


	//--------------------------------------------
	// WeaponComp Class
	//--------------------------------------------
	var WeaponComp = function(){
		WeaponUnit.apply(this, arguments);
		this.WEAPONCOMP = 6;
	};

	WeaponComp.prototype					= Object.create(WeaponUnit.prototype);

	WeaponComp.prototype.getControllerId	= function(){
		return this.WEAPONCOMP;
	};


	//--------------------------------------------
	// MissileUnit Class
	//--------------------------------------------
	var MissileUnit = function(){
		PointDistributionUnit.apply(this, arguments);
		this.DAMAGE		= 0;
		this.DISTANCE	= 1;
		this.REALOAD	= 2;
		this.SPEED		= 3;
		this.RADIUS		= 4;
	};

	MissileUnit.prototype					= Object.create(PointDistributionUnit.prototype);

	MissileUnit.prototype.getDamage			= function(){
		return this.getEffects()[0].getValue();
	};

	MissileUnit.prototype.getDistance		= function(){
		return this.getEffects()[1].getValue();
	};

	MissileUnit.prototype.getReloadTime		= function(){
		return this.getEffects()[2].getValue();
	};

	MissileUnit.prototype.getSpeed			= function(){
		return this.getEffects()[3].getValue();
	};

	MissileUnit.prototype.getBlastRadius	= function(){
		return this.getEffects()[4].getValue();
	};

	MissileUnit.prototype.initEffects		= function(){
		arrayOfEffect = [];
		arrayOfEffect[0] = new MissileDamagePoint(this);
		arrayOfEffect[1] = new MissileDistPoint(this);
		arrayOfEffect[2] = new MissileReloadPoint(this);
		arrayOfEffect[3] = new MissileSpeedPoint(this);
		arrayOfEffect[4] = new MissileRadiusPoint(this);

		return arrayOfEffect;
	};


	//--------------------------------------------
	// D1000MissileCPU Class
	//--------------------------------------------
	var D1000MissileCPU = function(){
		MissileUnit.apply(this, arguments);
		this.D1000 = 38;
	};

	D1000MissileCPU.prototype					= Object.create(MissileUnit.prototype);

	D1000MissileCPU.prototype.getControllerId	= function(){
		return this.D1000;
	};


	//--------------------------------------------
	// SDKBMissileCPU Class
	//--------------------------------------------
	var SDKBMissileCPU = function(){
		MissileUnit.apply(this, arguments);
		this.SDKB = 46;
	};

	SDKBMissileCPU.prototype					= Object.create(MissileUnit.prototype);

	SDKBMissileCPU.prototype.getControllerId	= function(){
		return this.SDKB;
	};


	//--------------------------------------------
	// SDBBMissileCPU Class
	//--------------------------------------------
	var SDBBMissileCPU = function(){
		MissileUnit.apply(this, arguments);
		this.SDBB = 54;
	};

	SDBBMissileCPU.prototype					= Object.create(MissileUnit.prototype);

	SDBBMissileCPU.prototype.getControllerId	= function(){
		return this.SDBB;
	};


	//--------------------------------------------
	// PointEffect Class
	//--------------------------------------------
	var PointEffect = function(unit){
		this.unit			= unit;
		this.distribution	= 0;
		this.pointsSpend	= 0;
		this.value			= 0;
		this.needUpdate		= true;
	};

	PointEffect.prototype.getEffectId		= function(){};

	PointEffect.prototype.getDistribution	= function(){
		return this.distribution;
	};

	PointEffect.prototype.getName			= function(){};	//abstract function

	PointEffect.prototype.getPointsSpend	= function(){
		return this.pointsSpend;
	};

	PointEffect.prototype.getUID			= function(){
		return "effect" + this.getEffectId();
	};

	PointEffect.prototype.getUnit			= function(){
		return this.unit;
	};

	PointEffect.prototype.getValue			= function(){
		if(this.needUpdate){
			this.recalculate();

			this.needUpdate = false;
		}

		return this.value;
	};

	PointEffect.prototype.decreaseDist		= function(n){
		if(this.distribution > 0){
			this.distribution = Math.max(this.distribution - n, 0);
		}

		this.needUpdate = true;
	};

	PointEffect.prototype.increaseDist		= function(n){
		var rest = this.getUnit().getAvailibleDist();

		if(rest > 0){
			if(n > rest){
				n = rest;
			}

			this.distribution += n;
		}

		this.needUpdate = true;
	};

	PointEffect.prototype.recalculate		= function(){};	//abstract function

	PointEffect.prototype.reset				= function(){
		this.setPointsSpend(0);
	};

	PointEffect.prototype.setDistribution	= function(n){
		this.distribution = n;
	};

	PointEffect.prototype.setPointsSpend	= function(n){
		var oldPoint = this.pointsSpend;
		this.pointsSpend = n;

		if(n != oldPoint){
			this.needUpdate = true;
		}
	};

	PointEffect.prototype.toString			= function(){
		return this.distribution + "% = " + this.getValue().toFixed(1);
	};


	//--------------------------------------------
	// DamagePoint Class
	//--------------------------------------------
	var DamagePoint = function(){
		PointEffect.apply(this, arguments);
	};

	DamagePoint.prototype				= Object.create(PointEffect.prototype);

	DamagePoint.prototype.getEffectId	= function(){
		return 0;
	};

	DamagePoint.prototype.getName		= function(){
		return "damage";
	};

	DamagePoint.prototype.recalculate	= function(){
		this.value = Math.max(1.0, Math.pow(this.getPointsSpend() * 0.1, 0.5) * 160);
		this.getUnit().getEffectById(2).needUpdate = true;
	};


	//--------------------------------------------
	// DistPoint Class
	//--------------------------------------------
	var DistPoint = function(){
		PointEffect.apply(this, arguments);
	};

	DistPoint.prototype				= Object.create(PointEffect.prototype);

	DistPoint.prototype.getEffectId	= function(){
		return 1;
	};

	DistPoint.prototype.getName		= function(){
		return "distance";
	};

	DistPoint.prototype.recalculate	= function(){
		this.value = Math.max(80, 290 + Math.pow(this.getPointsSpend(), 0.5) * 80);
	};


	//--------------------------------------------
	// ReloadPoint Class
	//--------------------------------------------
	var ReloadPoint = function(){
		PointEffect.apply(this, arguments);
	};

	ReloadPoint.prototype				= Object.create(PointEffect.prototype);

	ReloadPoint.prototype.getEffectId	= function(){
		return 2;
	};

	ReloadPoint.prototype.getName		= function(){
		return "reload";
	};

	ReloadPoint.prototype.recalculate	= function(){
		this.getUnit().getEffectById(0).recalculate();
		var damage = this.getUnit().getEffectById(0).getValue(),

			speed = Math.pow(this.getPointsSpend() * 2 + 10, -0.9) * (1000 + damage * 15) + 70;

		this.value = Math.max(50.0, speed);
	};


	//--------------------------------------------
	// SpeedPoint Class
	//--------------------------------------------
	var SpeedPoint = function(){
		PointEffect.apply(this, arguments);
	};

	SpeedPoint.prototype				= Object.create(PointEffect.prototype);

	SpeedPoint.prototype.getEffectId	= function(){
		return 3;
	};

	SpeedPoint.prototype.getName		= function(){
		return "speed";
	};

	SpeedPoint.prototype.recalculate	= function(){
		this.value = Math.max(1.0, 15 + Math.pow(this.getPointsSpend() * 0.1, 0.5) * 16);
	};


	//--------------------------------------------
	// MissileDamagePoint Class
	//--------------------------------------------
	var MissileDamagePoint = function(){
		PointEffect.apply(this, arguments);
	};

	MissileDamagePoint.prototype				= Object.create(PointEffect.prototype);

	MissileDamagePoint.prototype.getEffectId	= function(){
		return 0;
	};

	MissileDamagePoint.prototype.getName		= function(){
		return "damage";
	};

	MissileDamagePoint.prototype.recalculate	= function(){
		this.value = Math.max(10, log_2(this.getPointsSpend() * 4) * 50);
	};


	//--------------------------------------------
	// MissileDistPoint Class
	//--------------------------------------------
	var MissileDistPoint = function(){
		PointEffect.apply(this, arguments);
	};

	MissileDistPoint.prototype				= Object.create(PointEffect.prototype);

	MissileDistPoint.prototype.getEffectId	= function(){
		return 1;
	};

	MissileDistPoint.prototype.getName		= function(){
		return "distance";
	};

	MissileDistPoint.prototype.recalculate	= function(){
		this.value = Math.max(19, log_2(this.getPointsSpend() * 3.75) * 19);
	};


	//--------------------------------------------
	// MissileReloadPoint Class
	//--------------------------------------------
	var MissileReloadPoint = function(){
		PointEffect.apply(this, arguments);
	};

	MissileReloadPoint.prototype				= Object.create(PointEffect.prototype);

	MissileReloadPoint.prototype.getEffectId	= function(){
		return 2;
	};

	MissileReloadPoint.prototype.getName		= function(){
		return "reload";
	};

	MissileReloadPoint.prototype.recalculate	= function(){
		this.value = Math.max(0.05, 200 / Math.max(1, log_2(this.getPointsSpend() * 3.75) * 2));
	};


	//--------------------------------------------
	// MissileSpeedPoint Class
	//--------------------------------------------
	var MissileSpeedPoint = function(){
		PointEffect.apply(this, arguments);
	};

	MissileSpeedPoint.prototype				= Object.create(PointEffect.prototype);

	MissileSpeedPoint.prototype.getEffectId	= function(){
		return 3;
	};

	MissileSpeedPoint.prototype.getName		= function(){
		return "speed";
	};

	MissileSpeedPoint.prototype.recalculate	= function(){
		this.value = Math.max(0.2, 0.2 + log_2(this.getPointsSpend() * 3.75) * 0.5);
	};

	//--------------------------------------------
	// MissileRadiusPoint Class
	//--------------------------------------------
	var MissileRadiusPoint = function(){
		PointEffect.apply(this, arguments);
	};

	MissileRadiusPoint.prototype				= Object.create(PointEffect.prototype);

	MissileRadiusPoint.prototype.getEffectId	= function(){
		return 4;
	};

	MissileRadiusPoint.prototype.getName		= function(){
		return "radius";
	};

	MissileRadiusPoint.prototype.recalculate	= function(){
		this.value = Math.max(3, 3 + log_2(this.getPointsSpend() * 3.75) * 3);
	};


	//--------------------------------------------
	// Exporting Class and Functions
	//--------------------------------------------

	StarOS.SM					= StarOS.SM || {};

	//getters
	StarOS.SM.getAdminsTxt		= StarOS.SM.getAdminsTxt		|| getAdminsTxt;
	StarOS.SM.getWhitlistTxt	= StarOS.SM.getWhitlistTxt		|| getWhitlistTxt;
	StarOS.SM.getBlacklistTxt	= StarOS.SM.getBlacklistTxt		|| getAdminsTxt;
	StarOS.SM.getServerCfg		= StarOS.SM.getServerCfg		|| getServerCfg;
	StarOS.SM.getServerMsg		= StarOS.SM.getServerMsg		|| getServerMsg;
	StarOS.SM.getVersionTxt		= StarOS.SM.getVersionTxt		|| getVersionTxt;
	StarOS.SM.getLastLog		= StarOS.SM.getLastLog			|| getLastLog;
	StarOS.SM.getLastServerLog	= StarOS.SM.getLastServerLog	|| getLastServerLog;
	StarOS.SM.getBlockDef		= StarOS.SM.getBlockDef			|| getBlockDef;
	StarOS.SM.getBlockType		= StarOS.SM.getBlockType		|| getBlockType;
	StarOS.SM.getSyncBlockDef	= StarOS.SM.getSyncBlockDef		|| getSyncBlockDef;
	StarOS.SM.getSyncBlockType	= StarOS.SM.getSyncBlockType	|| getSyncBlockType;
	StarOS.SM.getLogBooks		= StarOS.SM.getLogBooks			|| getLogBooks;
	StarOS.SM.getBlockGroup		= StarOS.SM.getBlockGroup		|| getBlockGroup;

	//setters
	StarOS.SM.setAdminsTxt		= StarOS.SM.setAdminsTxt		|| setAdminsTxt;
	StarOS.SM.setWhitelistTxt	= StarOS.SM.setWhitelistTxt		|| setWhitelistTxt;
	StarOS.SM.setBlacklistTxt	= StarOS.SM.setBlacklistTxt		|| setBlacklistTxt;
	StarOS.SM.setServerCfg		= StarOS.SM.setServerCfg		|| setServerCfg;
	StarOS.SM.setServerMsg		= StarOS.SM.setServerMsg		|| setServerMsg;
	StarOS.SM.setLogBooks		= StarOS.SM.setLogBooks			|| setLogBooks;

	//Classes
	StarOS.SM.Shield			= StarOS.SM.Shield			|| Shield;
	StarOS.SM.ControllerUnit	= StarOS.SM.ControllerUnit	|| ControllerUnit;

})();