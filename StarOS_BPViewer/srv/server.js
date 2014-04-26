/*
	Product: StarOS
	Description: This is the backend server for StarOS
	License: http://creativecommons.org/licenses/by/3.0/legalcode

	FileVersion: 0.1-rev00010					Date: 2014-01-28
	By Blackcancer

	website: http://initsysrev.net
	support: blackcancer@initsysrev.net
*/

//-------------------------------------------
// CONSTANTES & VARIABLES
//-------------------------------------------
const	_HTTP		= require('http'),
		_PATH		= require('path'),
		_FS			= require('fs'),
		_NET		= require('net'),
		_QS			= require('querystring'),
		_URL		= require('url'),
		_EVENT		= require('events'),
		_SOCKET		= require('socket.io'),
		_JSDOM		= require('jsdom'),
		_XML		= require('xmldom').DOMParser,
		_LOGGER		= require('./logger'),
		_ERR		= require('./errno'),

		_confPath	= _PATH.join(_PATH.dirname(__filename), 'settings.json');

var _config ={
		path: {
			site:		'/var/www/vhosts/initsysrev.net/dev/StarOS_BPViewer/',
			json:		'/var/www/vhosts/initsysrev.net/dev/StarOS_BPViewer/scripts/StarOS_json/',
			starmade:	'/var/www/vhosts/initsysrev.net/srv/starmade/',
			log:		'/var/log/StarOS'
		},

		StarOS_serv: {
			host:		'dev.initsysrev.net',
			port:		4243
		},

		StarMade_serv: {
			host:		'initsysrev.net',
			port:		4242
		},

		Site_serv:{
			host:		'http://dev.initsysrev.net',
			port:		80
		}
	},

	mimes =	{
		'.htm':		'text/html',
		'.html':	'text/html',
		'.xml':		'text/xml',
		'.css':		'text/css',
		'.txt':		'text/plain',
		'.doc':		'text/plain',

		'.png':		'image/png',
		'.bmp':		'image/bmp',
		'.gif':		'image/gif',
		'.jpg':		'image/jpeg',
		'.jpeg':	'image/jpeg',

		'.aac':		'audio/aac',
		'.mp4':		'audio/mp4',
		'.m4a':		'audio/mp4',
		'.mp1':		'audio/mpeg',
		'.mp2':		'audio/mpeg',
		'.mp3':		'audio/mpeg',
		'.mpg':		'audio/mpeg',
		'.mpeg':	'audio/mpeg',
		'.oga':		'audio/ogg',
		'.ogg':		'audio/ogg',
		'.wav':		'audio/wav',
		'.webm':	'audio/webm',

		'.mp4':		'video/mp4',
		'.m4v':		'video/mp4',
		'.ogv':		'video/ogg',
		'.webm':	'video/webm',
		'.avi':		'video/x-ms-video',
		'.flv':		'video/x-flv',
		'.mkv':		'video/x-matroska',

		'.py':		'application/x-python',
		'.js':		'application/javascript',
		'.json':	'application/json',

		'.sment':	'application/sment',
		'.smskin':	'application/smskin',
		'.smsec':	'application/smsec',
		'.ent':		'application/ent',
		'.fac':		'application/fac',
		'.cat':		'application/cat',

		'.otf':		'font/opentype',
		'.ttf':		'font/opentype',


		'default': 'application/octet-stream'
	},

	_cache = {
		starmade: {
			admins:		[],
			blocks:		[],
			blocksType:	{},
			catalog:	{},
			ship:		{}
		}
	},

	_server, _io, _logger;


//------------------------------------------
// HELPERS
//------------------------------------------
/**
* Get MIME
*/
function getMime(file) {
	var i = file.lastIndexOf("."),
		ext = (i === -1) ? "default" : file.substr(i),
		mimeTypes = mimes;

	return mimeTypes[ext.toLowerCase()] || mimeTypes.default;
};

function parseBool(string){
	string = string.toLowerCase();
	return (string == "true");
};


//------------------------------------------
// PRELOADING FUNCTIONS
//------------------------------------------
/**
*	Merge config
**/
function mergeConfig (){
	if(_FS.existsSync(_confPath)){
		console.log("[SERVER]:", "Configuration file found...");
		try {
			//read settings.json content
			var data = _FS.readFileSync(_confPath);
			if(data){
				data = JSON.parse(data.toString());

				//for each configs in settings.json, add/replace default config
				for(var i in data){
					if(typeof data[i] == 'object'){
						for(var j in data[i]){
							_config[i][j] = data[i][j] ;

						}
					}
					else {
						_config[i] = data[i];
					}
				}
			}
			else{
				throw "Can not read file or is empty!";
			}
		}
		catch (cErr){
			console.log("Config", "Failed to parse settings JSON file", "-", String(cErr));
		}
	}
	else {
		console.log("Server","No configuration file found...");
	}
};

/**
*	Check if port is available
**/
function portAvail(port, callback){
	var tester = _NET.createServer()
	.once('error', onErr)
	.once('listening', onListen)
	.once('close', onClose)
	.listen(port);

	function onErr(err){
		if(err.code = 'EADDRINUSE'){
			return cb(err);
		}
		_logger.debug(err);
	};

	function onListen(){
		tester.close();
	};

	function onClose(){
		callback(null);
	};
};

/**
*	Set starmade config as cache
**/
function setCache(){
	var path = {
		admin:			_PATH.join(_config.path.starmade, 'admins.txt'),
		blockConfig:	_PATH.join(_config.path.starmade, 'data/config/BlockConfig.xml'),
		blockTypes:		_PATH.join(_config.path.starmade, 'data/config/BlockTypes.properties'),
		catalog:		_PATH.join(_config.path.json, 'CATALOG.json')
	};

	//get admins.txt
	_FS.readFile(path.admin, adminCB);

	//get BlockTypes.properties
	_FS.readFile(path.blockTypes, blockTypesCB);

	//get CATALOG.json
	_FS.readFile(path.catalog, catalogCB);

	function adminCB		(err, data){
		if(err){
			err = _ERR.code[err.code];
			_logger.warn ("CACHE", "Error n°" + err.errno + ":", err.description, ".\nCannot get", path.admin);
		}
		else {
			if(data){
				data = data.toString().split('\n');
				_cache.starmade.admins = data;
			}
		}
	};

	function blockTypesCB	(err, data){
		if(err){
			err = _ERR.code[err.code];
			_logger.warn ("CACHE", "Error n°" + err.errno + ":", err.description, ".\nCannot get", path.blockTypes);
		}
		else {
			if(data){
				data = StarMadeAPI.format.CfgToJSON(data.toString());
				_cache.starmade.blockTypes = data;

				//get BlockConfig.xml
				_FS.readFile(path.blockConfig, blockConfigCB);
			}
		}
	};

	function blockConfigCB	(err, data){
		if(err){
			err = _ERR.code[err.code];
			_logger.warn ("CACHE", "Error n°" + err.errno + ":", err.description, ".\nCannot get", path.blockConfig);
		}
		else {
			if(data){
				var xml = new _XML().parseFromString(data.toString());

				var blocks = xml.getElementsByTagName("Block");

				for(var i = 0; i < blocks.length; i++){
					var type	= blocks[i].attributes.getNamedItem("type").nodeValue,
						recipe	= blocks[i].getElementsByTagName("CubatomRecipe"),
						comp	= blocks[i].getElementsByTagName("CubatomCompound")[0].getElementsByTagName("Cubatom"),
						color	= blocks[i].getElementsByTagName("LightSourceColor")[0].textContent;

					color = color.split(",");
					for(var j = 0; j < color.length; j++){
						color[j] = parseFloat(color[j]);
					}

					var block = {
						name:		blocks[i].attributes.getNamedItem("name").nodeValue,
						icon:		parseInt(blocks[i].attributes.getNamedItem("icon").nodeValue),
						textureId:	parseInt(blocks[i].attributes.getNamedItem("textureId").nodeValue),
						type:		type,
						properties:	{
							individualSides:	parseInt(blocks[i].getElementsByTagName("IndividualSides")[0].textContent),
							price:				parseInt(blocks[i].getElementsByTagName("Price")[0].textContent),
							cubatomRecipe:		{
								mass:		recipe[0].getElementsByTagName("mass")[0].textContent,
								spinning:	recipe[0].getElementsByTagName("spinning")[0].textContent
							},
							cubatomCompound:	{
								"0": {
									mass:			comp[0].getElementsByTagName("mass")[0].textContent,
									spinning:		comp[0].getElementsByTagName("spinning")[0].textContent,
									thermal:		comp[0].getElementsByTagName("thermal")[0].textContent,
									conductivity:	comp[0].getElementsByTagName("conductivity")[0].textContent
								},
								"1": {
									mass:			comp[1].getElementsByTagName("mass")[0].textContent,
									spinning:		comp[1].getElementsByTagName("spinning")[0].textContent,
									thermal:		comp[1].getElementsByTagName("thermal")[0].textContent,
									conductivity:	comp[1].getElementsByTagName("conductivity")[0].textContent
								}
							},
							projectionTo:		parseInt(blocks[i].getElementsByTagName("ProjectionTo")[0].textContent),
							animated:			parseBool(blocks[i].getElementsByTagName("Animated")[0].textContent),
							armour:				parseInt(blocks[i].getElementsByTagName("Armour")[0].textContent),
							transparency:		parseBool(blocks[i].getElementsByTagName("Transparency")[0].textContent),
							inShop:				parseBool(blocks[i].getElementsByTagName("InShop")[0].textContent),
							orientation:			parseBool(blocks[i].getElementsByTagName("Orientation")[0].textContent),
							entrable:			parseBool(blocks[i].getElementsByTagName("Enterable")[0].textContent),
							lightSource:		parseBool(blocks[i].getElementsByTagName("LightSource")[0].textContent),
							hitpoints:			parseInt(blocks[i].getElementsByTagName("Hitpoints")[0].textContent),
							placable:			parseBool(blocks[i].getElementsByTagName("Placable")[0].textContent),
							inRecipe:			parseBool(blocks[i].getElementsByTagName("InRecipe")[0].textContent),
							canActivate:		parseBool(blocks[i].getElementsByTagName("CanActivate")[0].textContent),
							physical:			parseBool(blocks[i].getElementsByTagName("Physical")[0].textContent),
							blockStyle:			parseInt(blocks[i].getElementsByTagName("BlockStyle")[0].textContent),
							lightSourceColor:	color
						}
					};

					_cache.starmade.blocks[_cache.starmade.blockTypes[type]] = block;
				}

			}
		}
	};

	function catalogCB		(err, data){
		if(err){
			err = _ERR.code[err.code];
			_logger.warn ("CACHE", "Error n°" + err.errno + ":", err.description, ".\nCannot get", path.catalog);
		}
		else {
			if(data){
				data = JSON.parse(data.toString());
				_cache.starmade.catalog = data;
			}
		}
	};
};


//------------------------------------------
// REQUEST FUNCTIONS
//------------------------------------------
function AjaxRequest(request, response){
	var url		= _URL.parse(request.url, true),
		path	= decodeURIComponent(url.pathname);

	if(path == "/getFile"){
		respondFile(url.query.path, request, response);
	}

	function respondFile(path, request, response){
		var stat	= new _EVENT.EventEmitter();

		stat.on('API::vfs::fread()', vfsFreadCB);

		API.vfs.fread({
			path: path
		}, stat);

		function vfsFreadCB(err, data){
			if(err){
				_logger.warn("API", "ERROR " + err.errno + ":", "API::" + caller, err.description);
			}

			response.setHeader('X-UA-Compatible', "IE=Edge,chrome=1");

			// Website you wish to allow to connect
			response.setHeader('Access-Control-Allow-Origin', '*');

			// Request methods you wish to allow
			response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

			// Request headers you wish to allow
			response.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

			// Set to true if you need the website to include cookies in the requests sent
			// to the API (e.g. in case you use sessions)
			response.setHeader('Access-Control-Allow-Credentials', true);

			response.setHeader('Content-Type', 'text/plain');
			response.writeHead(200);
			response.write(data);
			response.end();
		}
	};
};

function SocketRequest(socket){
	_logger.notice("Socket", "Client connected!");

	socket.on('message', receiveMsg);
	socket.on('API', callAPI);
	socket.on('StarMadeAPI', callStarMadeAPI);

	function receiveMsg(msg, cb){
	};

	function callAPI(data){
		try {
			var caller	= data.caller || null,
				meth	= data.meth	|| null,
				fn		= data.fn	|| null,
				fargs	= data.args	|| {},
				stat	= new _EVENT.EventEmitter();

			if(!meth){
				throw {code:'ENULLMETH', other: null}
			}

			if(!fn){
				throw {code:'ENULLFNC', other: null}
			}

			if(!API[meth]){
				throw {code:'ENOMETH', other: meth};
			}

			if(!API[meth][fn]){
				throw {code:'ENOFNC', other: fn};
			}

			stat.on('API::vfs::fread()', callback);
			stat.on('API::vfs::dir()', callback);

			API[meth][fn](fargs, stat);

			function callback(err, data){
				if(err){
					_logger.warn("API", "ERROR on call", meth + "." + fn + "()");
					_logger.warn("API", "ERROR " + err.errno + ":", "API::" + caller, err.description);
				}

				socket.emit('API::' + caller, err, data);
			}

		}
		catch(cErr){
			var err = _ERR.code[cErr.code];
			_logger.warn("API", "Error n°" + err.errno + ":", err.description, "->", cErr.other);
			socket.emit("APIerr", err);
		}
	};

	function callStarMadeAPI(data){
		try {
			var caller	= data.caller || null,
				meth	= data.meth	|| null,
				fn		= data.fn	|| null,
				fargs	= data.args	|| {},
				stat	= new _EVENT.EventEmitter();

			if(!meth){
				throw {code:'ENULLMETH', other: null}
			}

			if(!fn){
				throw {code:'ENULLFNC', other: null}
			}

			if(!StarMadeAPI[meth]){
				throw {code:'ENOMETH', other: meth};
			}

			if(!StarMadeAPI[meth][fn]){
				throw {code:'ENOFNC', other: fn};
			}

			stat.on('StarMadeAPI::math::calculSmd2()', callback);
			stat.on('StarMadeAPI::loader::ship()', callback);

			StarMadeAPI[meth][fn](fargs, stat);

			function callback(err, data){
				if(err && err.length !== 0){
					_logger.warn("StarMade API", "ERROR on call", meth + "." + fn + "()");
					_logger.warn("StarMade API", "ERROR " + err.errno + ":", caller, err.description);
				}

				socket.emit('StarMadeAPI::' + caller, err, data);
			};

		}
		catch(cErr){
			var err = _ERR.code[cErr.code];
			if(err){
				_logger.warn("StarMadeAPI", "Error n°" + err.errno + ":", err.description, "->", cErr.other);
			}
			else {
			console.log(cErr);
				_logger.warn("StarMadeAPI", "Error :", cErr);
			}
			socket.emit("StarMadeAPIerr", err);
		}
	};
};


//------------------------------------------
// API
//------------------------------------------
var API = {
	vfs:	{},
	com:	{},
	sec:	{}
};

//Virtual File System functions
API.vfs.exist		= function(fargs, emiter){
	fargs = fargs || {};

	if(!fargs.path){
		throw "No given path.";
	}

	_FS.exists(fargs.path, callback);

	function callback(exist){
		emiter.emit('API::vfs::exist()', exist);
	};
};

API.vfs.dir			= function(fargs, emiter){
	fargs = fargs || {};

	if(!fargs.path){
		throw "No given path.";
	}

	_FS.readdir(fargs.path, callback);

	function callback(err, data){
		if(err){
			err			= _ERR.code[err.code];
			err.path	= fargs.path;
		}

		emiter.emit('API::vfs::dir()', err, data);
	};
};

API.vfs.fread		= function(fargs, emiter){
	fargs			= fargs			|| {};
	fargs.opts		= fargs.opts	|| {};
	fargs.format	= fargs.format	|| "";

	if(!fargs.path){
		throw "No given path.";
	}

	_FS.readFile(fargs.path, callback);

	function callback(err, data){
		if(err){
			err			= _ERR.code[err.code];
			err.path	= fargs.path;
		}

		if(data){
			if(fargs.format == "source"){
				var fname = fargs.path.split('/');
				fname = encodeURIComponent(fname[fname.length -1]);
				data = "data:" + getMime(fargs.path) + ";filename=" + fname + ";base64," + (new Buffer(data).toString('base64'));
			}
			else {
				data = data.toString();
			}
		}

		emiter.emit('API::vfs::fread()', err, data, fargs.path);
	};
};

API.vfs.fwrite		= function(fargs, emiter){
	fargs		= fargs			|| {};
	fargs.data	= fargs.data	|| "";
	fargs.opts	= fargs.opts	|| {};

	if(!fargs.path){
		throw "No given path.";
	}

	_FS.writeFile(fargs.path, fargs.data, fargs.opts, callback);

	function callback(err, data){
		if(err){
			err			= _ERR.code[err.code];
			err.path	= fargs.path;
			err.data	= fargs.data;
		}

		emiter.emit('API::vfs::fwrite()', err);
	};
};

//Communications functions
// API.com

//Security functions
API.sec.chmod =	function(fargs, emiter){
	fargs = fargs || {};

	if(!fargs.path){
		throw "No given path.";
	}
};

API.sec.chown =	function(fargs, emiter){
	fargs = fargs || {};

	if(!fargs.path){
		throw "No given path.";
	}
};


//------------------------------------------
// STARMADE API
//------------------------------------------
var StarMadeAPI = {
	loader:	{},
	math:	{},
	format:	{}
};

// Loader functions
StarMadeAPI.loader.ship			= function(fargs, emiter){
	fargs	=	fargs || {};

	if(!fargs.name){
		throw "No ship name given.";
	}

	var toLoad = 4,
		loaded = 0,
		globErr = [],
		stat = new _EVENT.EventEmitter(),
		ship = {};

	if(_cache.starmade.ship[fargs.name]){
		_logger.info("StarMade API", "Retrieving ship \"" + fargs.name + "\" data...");
		emiter.emit('StarMadeAPI::loader::ship()', null, _cache.starmade.ship[fargs.name]);
	}
	else {

		stat.on('API::vfs::fread()', vfsFreadCB);
		stat.on('API::vfs::dir()', vfsDirCB);
		stat.on('StarMadeAPI::math::calculSmd2()', calculCB);

		//getting header file
		API.vfs.fread({
			path: _PATH.join(_config.path.json, 'Blueprint/' + fargs.name + '/header.json')
		}, stat);

		//getting logic file
		API.vfs.fread({
			path: _PATH.join(_config.path.json, 'Blueprint/' + fargs.name + '/logic.json')
		}, stat);

		//getting meta file
		API.vfs.fread({
			path: _PATH.join(_config.path.json, 'Blueprint/' + fargs.name + '/meta.json')
		}, stat);

		//getting smd2 files
		API.vfs.dir({
			path: _PATH.join(_config.path.json, 'Blueprint/' + fargs.name + '/DATA/')
		}, stat);

		//callback
		function vfsFreadCB(err, data, path){
			if(err){
				globErr.push(err);
			}

			loaded++;
			if(data){
				if(path.match("header")){
					ship.header = JSON.parse(data.toString());
				}
				else if(path.match("logic")){
					ship.logic = JSON.parse(data.toString());
				}
				else {
					ship.meta = JSON.parse(data.toString());
				}
			}
			if(loaded == toLoad){
				callback();
			}
	};

		function vfsDirCB(err, files){
			if(err){
				globErr.push(err);
			}

			for(var i = 0, len = files.length; i < len; i++){
				files[i] = _PATH.join(_config.path.json, 'Blueprint/' + fargs.name + '/DATA/', files[i])
			}
			StarMadeAPI.math.calculSmd2({files: files}, stat);
		};

		function calculCB(err, data){
			if(err){
				globErr.push(err);
			}

			loaded++;
			if(data){
				ship.smd2 = data
			}

			if(loaded == toLoad){
				callback();
			}
		};

		function callback(){
			_logger.info("StarMade API", "Storing ship \"" + fargs.name + "\" data...");
			_cache.starmade.ship[fargs.name] = ship;
			emiter.emit('StarMadeAPI::loader::ship()', globErr, ship);
		};
	}
};

// Math functions
StarMadeAPI.math.calculSmd2		= function(fargs, emiter){
	fargs = fargs || {};

	if(!fargs.files){
		throw "No given files.";
	}

	var stat = new _EVENT.EventEmitter(),
		fname = fargs.files[0].split('/'),
		toLoad	= fargs.files.length,
		loaded	= 0,
		smd2	= [],
		errors	= [];

	fname = fname[fname.length - 3];

	stat.on('API::vfs::fread()', vfsFreadCB);

	if(_cache.starmade.ship[fname]){
		_logger.info("StarMade API", "Retrieving ship \"" + fname + "\" model...");
		emiter.emit('StarMadeAPI::math::calculSmd2()', null, _cache.starmade.ship[fname].smd2);
	}
	else {
		for(var i = 0; i < fargs.files.length; i++){
			API.vfs.fread({path: fargs.files[i]}, stat);
		}
	}

	function vfsFreadCB(err, data, path){
		if(err){
			errors.push(err);
			return
		}
		var fileName	= path.split('/'),
			coords		= [];
		fileName		= fileName[fileName.length - 1];
		fileName		= fileName.split('.');
		coords.push(fileName[1]);
		coords.push(fileName[2]);
		coords.push(fileName[3]);
		data			= JSON.parse(data);

		smd2[coords.join(',')] = data;
		loaded++;

		if(loaded == toLoad){
			parseSmd(err, smd2);
		}
	};

	function parseSmd(err, smd2){
		var globChunk			= {},
			visibleGlobChunk	= [],
			version;

		for(var file in smd2){
			var version = smd2[file].int_a;
			var chunk			= {},
				visibleChunk	= {},
				globChunkPos	= file.split(','),
				globChunkX		= parseInt(globChunkPos[0]),
				globChunkY		= parseInt(globChunkPos[1]),
				globChunkZ		= parseInt(globChunkPos[2]),
				oAGlobX, oBGlobX, oAGlobY, oBGlobY, oAGlobZ, oBGlobZ;

				oAGlobX	= globChunkX + "," + globChunkY + "," + globChunkZ;
				oBGlobX	= globChunkX + "," + globChunkY + "," + globChunkZ;
				oAGlobY	= globChunkX + "," + globChunkY + "," + globChunkZ;
				oBGlobY	= globChunkX + "," + globChunkY + "," + globChunkZ;
				oAGlobZ	= globChunkX + "," + globChunkY + "," + globChunkZ;
				oBGlobZ	= globChunkX + "," + globChunkY + "," + globChunkZ;

			for(var chk in smd2[file].chunks){
				var chunkInner	= {},
					visibleChunkInner	= [],
					chunkX		= smd2[file].chunks[chk].pos["0"] / 16,
					chunkY		= smd2[file].chunks[chk].pos["1"] / 16,
					chunkZ		= smd2[file].chunks[chk].pos["2"] / 16,
					AGlobX		= oAGlobX,
					BGlobX		= oBGlobX,
					AGlobY		= oAGlobY,
					BGlobY		= oBGlobY,
					AGlobZ		= oAGlobZ,
					BGlobZ		= oBGlobZ,
					oAChunkX, oBChunkX, oAChunkY, oBChunkY, oAChunkZ, oBChunkZ;

				//Checking for X pos
				if(chunkX != -8 || chunkX != 8){
					oAChunkX	= (chunkX + 1) + "," + chunkY + "," + chunkZ;
					oBChunkX	= (chunkX - 1) + "," + chunkY + "," + chunkZ;
				}
				else {

					if(chunkX == -8){
						oAChunkX	= (chunkX + 1)	+ "," + chunkY + "," + chunkZ;
						oBChunkX	= 8				+ "," + chunkY + "," + chunkZ;

						BGlobX	= (globChunkX - 1) + "," + globChunkY + "," + globChunkZ;
					}
					else {
						oAChunkX	= (-8)			+ "," + chunkY + "," + chunkZ;
						oBChunkX	= (chunkX + 1)	+ "," + chunkY + "," + chunkZ;

						AGlobX	= (globChunkX + 1) + "," + globChunkY + "," + globChunkZ;
					}

				}

				//Checking for Y pos
				if(chunkY != -8 || chunkY != 8){
					oAChunkY	= chunkX + "," + (chunkY + 1) + "," + chunkZ;
					oBChunkY	= chunkX + "," + (chunkY - 1) + "," + chunkZ;

				}
				else {

					if(chunkY == -8){
						oAChunkY	= chunkX + "," + (chunkY + 1)	+ "," + chunkZ;
						oBChunkY	= chunkX + "," + 8				+ "," + chunkZ;

						BGlobY	= globChunkX + "," + (globChunkY - 1) + "," + globChunkZ;
					}
					else {
						oAChunkY	= chunkX + "," + (-8)			+ "," + chunkZ;
						oBChunkY	= chunkX + "," + (chunkY - 1)	+ "," + chunkZ;

						AGlobY	= globChunkX + "," + (globChunkY + 1) + "," + globChunkZ;
					}

				}

				//Checking for Z pos
				if(chunkX != -8 || chunkX != 8){
					oAChunkZ	= chunkX + "," + chunkY + "," + (chunkZ + 1);
					oBChunkZ	= chunkX + "," + chunkY + "," + (chunkZ - 1);
				}
				else {

						if(chunkX == -8){
							oAChunkZ	= chunkX + "," + chunkY + "," + (chunkZ + 1);
							oBChunkZ	= chunkX + "," + chunkY + "," + 8;

							BGlobZ	= globChunkX + "," + globChunkY + "," + (globChunkZ - 1);
						}
						else {
							oAChunkZ	= chunkX + "," + chunkY + "," + (-8);
							oBChunkZ	= chunkX + "," + chunkY + "," + (chunkZ - 1);

							AGlobZ	= globChunkX + "," + globChunkY + "," + (globChunkZ + 1);
						}

					}

				for(var bl in smd2[file].chunks[chk].blocks){
					var pos		= bl.split(","),
						blockX	= parseInt(pos[0]),
						blockY	= parseInt(pos[1]),
						blockZ	= parseInt(pos[2]),
						AChunkX	= oAChunkX,
						BChunkX	= oBChunkX,
						AChunkY	= oAChunkY,
						BChunkY	= oBChunkY,
						AChunkZ	= oAChunkZ,
						BChunkZ	= oBChunkZ,
						px = py = pz = nx = ny = nz = isHidden = false,
						ABlockX, BBlockX, ABlockY, BBlockY, ABlockZ, BBlockZ,
						block;

					//Checking for X pos
					if(blockX != 0 || blockX != 15){
						ABlockX	= (blockX + 1) + "," + blockY + "," + blockZ;
						BBlockX	= (blockX - 1) + "," + blockY + "," + blockZ;

						AChunkX	= chunkX + "," + chunkY + "," + chunkZ;
						BChunkX	= chunkX + "," + chunkY + "," + chunkZ;

						AGlobX	= oAGlobX;
						BGlobX	= oBGlobX;

					}
					else {

						if(blockX == 0){
							ABlockX	= (blockX + 1)	+ "," + blockY + "," + blockZ;
							BBlockX	= 15				+ "," + blockY + "," + blockZ;

							AChunkX	= chunkX + "," + chunkY + "," + chunkZ;
							AGlobX	= oAGlobX;
						}
						else {
							ABlockX	= 0				+ "," + blockY + "," + blockZ;
							BBlockX	= (blockX - 1)	+ "," + blockY + "," + blockZ;

							BChunkX	= chunkX + "," + chunkY + "," + chunkZ;
							BGlobX	= oBGlobX;
						}

					}

					//Checking for Y pos
					if(blockY != 0 || blockY != 15){
						ABlockY	= blockX + "," + (blockY + 1) + "," + blockZ;
						BBlockY	= blockX + "," + (blockY - 1) + "," + blockZ;

						AChunkY	= chunkX + "," + chunkY + "," + chunkZ;
						BChunkY	= chunkX + "," + chunkY + "," + chunkZ;

						AGlobY	= oAGlobY;
						BGlobY	= oBGlobY;
					}
					else {

						if(blockY == 0){
							ABlockY	= blockX + "," + (blockY + 1) + "," + blockZ;
							BBlockY	= blockX + "," + 15			  + "," + blockZ;

							AChunkY	= chunkX + "," + chunkY + "," + chunkZ;
							AGlobY	= oAGlobY;
						}
						else {
							ABlockY	= blockX + "," + 0			  + "," + blockZ;
							BBlockY	= blockX + "," + (blockY - 1) + "," + blockZ;

							BChunkY	= chunkX + "," + chunkY + "," + chunkZ;
							BGlobY	= oBGlobY;
						}

					}

					//Checking for Z pos
					if(blockZ != 0 || blockZ != 15){
						ABlockZ	= blockX + "," + blockY + "," + (blockZ + 1);
						BBlockZ	= blockX + "," + blockY + "," + (blockZ - 1);

						AChunkZ	= chunkX + "," + chunkY + "," + chunkZ;
						BChunkZ	= chunkX + "," + chunkY + "," + chunkZ;

						AGlobZ	= oAGlobY;
						BGlobZ	= oBGlobY;
					}
					else {

						if(blockZ == 0){
							ABlockZ	= blockX + "," + blockY + "," + (blockZ + 1);
							BBlockZ	= blockX + "," + blockY + "," + 15;

							AChunkZ	= chunkX + "," + chunkY + "," + chunkZ;
							AGlobZ	= oAGlobY;
						}
						else {
							ABlockZ	= blockX + "," + blockY + "," + 0;
							BBlockZ	= blockX + "," + blockY + "," + (blockZ - 1);

							BChunkZ	= chunkX + "," + chunkY + "," + chunkZ;
							BGlobZ	= oBGlobY;
						}

					}


					if(smd2[AGlobX]){
						if(smd2[AGlobX].chunkIndex[AChunkX]){
							var chkId = smd2[AGlobX].chunkIndex[AChunkX].id;
							if(smd2[AGlobX].chunks[chkId].blocks[ABlockX]){
								var bid			= smd2[AGlobX].chunks[chkId].blocks[ABlockX].id,
									blockStyle	= _cache.starmade.blocks[bid].properties.blockStyle;

								px = (blockStyle == 0 && bid != 63) ? true : false;
							}
						}
					}

					if(smd2[BGlobX]){
						if(smd2[BGlobX].chunkIndex[BChunkX]){
							var chkId = smd2[BGlobX].chunkIndex[BChunkX].id;
							if(smd2[BGlobX].chunks[chkId].blocks[BBlockX]){
								var bid			= smd2[BGlobX].chunks[chkId].blocks[BBlockX].id,
									blockStyle	= _cache.starmade.blocks[bid].properties.blockStyle;

								nx = (blockStyle == 0 && bid != 63) ? true : false;
							}
						}
					}

					if(smd2[AGlobY]){
						if(smd2[AGlobY].chunkIndex[AChunkY]){
							var chkId = smd2[AGlobY].chunkIndex[AChunkY].id;
							if(smd2[AGlobY].chunks[chkId].blocks[ABlockY]){
								var bid			= smd2[AGlobY].chunks[chkId].blocks[ABlockY].id,
									blockStyle	= _cache.starmade.blocks[bid].properties.blockStyle;

								py = (blockStyle == 0 && bid != 63) ? true : false;
							}
						}
					}

					if(smd2[BGlobY]){
						if(smd2[BGlobY].chunkIndex[BChunkY]){
							var chkId = smd2[BGlobY].chunkIndex[BChunkY].id;
							if(smd2[BGlobY].chunks[chkId].blocks[BBlockY]){
								var bid			= smd2[BGlobY].chunks[chkId].blocks[BBlockY].id,
									blockStyle	= _cache.starmade.blocks[bid].properties.blockStyle;

								ny = (blockStyle == 0 && bid != 63) ? true : false;
							}
						}
					}

					if(smd2[AGlobZ]){
						if(smd2[AGlobZ].chunkIndex[AChunkZ]){
							var chkId = smd2[AGlobZ].chunkIndex[AChunkZ].id;
							if(smd2[AGlobZ].chunks[chkId].blocks[ABlockZ]){
								var bid			= smd2[AGlobZ].chunks[chkId].blocks[ABlockZ].id,
									blockStyle	= _cache.starmade.blocks[bid].properties.blockStyle;

								pz = (blockStyle == 0 && bid != 63) ? true : false;
							}
						}
					}

					if(smd2[BGlobZ]){
						if(smd2[BGlobZ].chunkIndex[BChunkZ]){
							var chkId = smd2[BGlobZ].chunkIndex[BChunkZ].id;
							if(smd2[BGlobZ].chunks[chkId].blocks[BBlockZ]){
								var bid			= smd2[BGlobZ].chunks[chkId].blocks[BBlockZ].id,
									blockStyle	= _cache.starmade.blocks[bid].properties.blockStyle;

								nz = (blockStyle == 0 && bid != 63) ? true : false;
							}
						}
					}

					if(px && py && pz && nx && ny && nz){
						isHidden = true;
					}

					block = {
						id:			smd2[file].chunks[chk].blocks[bl].id,
						hp:			smd2[file].chunks[chk].blocks[bl].hp,
						orient:		smd2[file].chunks[chk].blocks[bl].orient,
						isActive:	smd2[file].chunks[chk].blocks[bl].isActive,
						isHidden:	isHidden,
						pos:		[]
					};


					block.pos[0] = (globChunkX >= 0) ? (blockX + (16 * chunkX) * (globChunkX + 1)) - 8 : (blockX + (16 * (chunkX + 8)) * globChunkX) - 8;
					block.pos[1] = (globChunkY >= 0) ? (blockY + (16 * chunkY) * (globChunkY + 1)) - 8 : (blockY + (16 * (chunkY + 8)) * globChunkY) - 8;
					block.pos[2] = (globChunkZ >= 0) ? (blockZ + (16 * chunkZ) * (globChunkZ + 1)) - 8 : (blockZ + (16 * (chunkZ + 8)) * globChunkZ) - 8;

					chunkInner[bl] = block;

					if(!isHidden){
						visibleChunkInner.push(block);
					}

				}

				chunk[chunkX + "," + chunkY + "," + chunkZ] = chunkInner;
				visibleGlobChunk.push(visibleChunkInner);

			}

			globChunk[file] = chunk;

		}

		emiter.emit('StarMadeAPI::math::calculSmd2()', err, {version: version, complete: globChunk, visible: visibleGlobChunk});
	}
};

// Format functions
StarMadeAPI.format.CfgToJSON	= function(data){
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

StarMadeAPI.format.ListToArr	= function(data){
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

StarMadeAPI.format.StringToXml	= function(data){
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

StarMadeAPI.format.JSONtoCfg	= function(data){
	var str = "";

	for(var obj in json){
		str += obj + " = " + json[obj] + "\r\n";
	}

	return str;
};

StarMadeAPI.format.ArrToList	= function(data){
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


//------------------------------------------
// MAIN PROCESS
//------------------------------------------

mergeConfig();
_logger = new _LOGGER({level: 7, logdir: _config.path.log});
setCache();
portAvail(_config.StarOS_serv.port, isAvail);

function isAvail(err){
	if(err){
		err = _ERR.code[err.code];
		_logger.emerg("Server", "Error n°" + err.errno, "-", "Can not run server on port " + _config.StarOS_serv.port + "\n", err.description);
	}
	else {
		_logger.info("Server", "Starting server on port", _config.StarOS_serv.port, "...");

		_server	= _HTTP.createServer(AjaxRequest).listen(_config.StarOS_serv.port);
		_io		= _SOCKET.listen(_server, {log: false});
		_io.sockets.on('connection', SocketRequest);
	}
}