/*
	Product: StarOS
	Description: This is the backend server for StarOS
	License: http://creativecommons.org/licenses/by/3.0/legalcode

	FileVersion: 0.1-rev00001					Date: 2014-01-28
	By Blackcancer

	website: http://initsysrev.net
	support: blackcancer@initsysrev.net
*/


//-------------------------------------------
// CONSTANTES & VARIABLES
//-------------------------------------------

	//NODE.JS MODULES
const _HTTP	= require('http'),
	_PATH	= require('path'),
	_FS		= require('fs'),
	_NET	= require('net'),
	_QS		= require("querystring"),
	_URL	= require('url'),
	_EVENT	= require('events'),
	//SOCKET.IO MODULE
	_SOCK	= require('socket.io'),
	//INCLUDE JS FILE
	Logger	= require('./logger'),
	ErrCode = require('./errno')
	//OTHER CONSTANTES
	spath	= _PATH.join(_PATH.dirname(__filename), 'settings.json'),
	apath	= _PATH.join(_PATH.dirname(__filename), 'apps');

var config = {
	port:		8000,
	dir:		null,
	appdirs:	['/opt/StarOS/bin', '/opt/StarOS/usr/bin'],
	vfsdir:		'/opt/StarOS/',
	homeroot:	'/opt/StarOS/root',
	homedir:	'/opt/StarOS/home',
	tmpdir:		'/opt/StarOS/tmp'
};

var server, io,
	logger = new Logger();


//------------------------------------------
// API FUNCTIONS
//------------------------------------------
var API = {};

/**
* API.vsf Functions
**/
API.vfs = {};

API.vfs.exist = function(fargs, emiter){
};

API.vfs.dir = function(fargs, emiter){
	_FS.readdir(fargs.path, callback)
	
	function callback(err, files){
		if(err){
			err.path = fargs.path;
		}
		emiter.emit('API::vfs::fread()', err, files);
	}
};

API.vfs.fread = function(fargs, emiter){
	_FS.readFile(fargs.path, callback)
	
	function callback(err, data){
		if(data){
			data = data.toString();
		}
		if(err){
			err.path = fargs.path;
		}
		emiter.emit('API::vfs::fread()', err, data);
	}
};

/**
* API.com Functions
**/
API.com = {};

/**
* API.sec Functions
**/
API.sec = {};

API.sec.chmod = function(fargs, emiter){
};

API.sec.chown = function(fargs, emiter){
};


//-------------------------------------------
// BASIC FUNCTIONS
//-------------------------------------------

/**
*	Check if port is available
**/
function isPortAvail(port, cb) {
	var tester = _NET.createServer()
	.once('error', onErr)
	.once('listening', onListen)
	.once('close', onClose)
	.listen(port);

	function onErr(err){
		if(err.code = 'EADDRINUSE'){
			return cb(err);
		}
		logger.debug(err);
	};

	function onListen(){
		tester.close();
	};

	function onClose(){
		cb(null);
	};
}

function errLog(ori, err, other){
	var str = ""
	if(other){
		str += "\"" + other + "\" ";
	}
	str += err.description
	logger.err(ori, "Error n°" + err.errno, "-", str);
};

/**
*	On client connection functions
**/
function onSocConn(socket){
	logger.notice("Socket", "Client connected!");

	socket.on('message', receivedMsg);

	function receivedMsg(msg, cb){
	};

	socket.on('API', callAPI);

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

			
			API[meth][fn](fargs, stat);
			stat.on('API::vfs::fread()', vfsFreadCB)
			
			function vfsFreadCB(err, data){
				if(err){
					logger.warn("API", "ERROR on call", meth + "." + fn + "()");
					path = err.path
					err = ErrCode.code[err.code];
					err.path = path;
					logger.warn("API", "ERROR " + err.errno + ":", "API::" + caller, err.description);
				}
				socket.emit('API::' + caller, err, data);
			}

		}
		catch(cErr){
			/*var err = ErrCode.code[cErr.code];
			errLog("API", err, cErr.other);
			socket.emit("APIerr", err);*/
		}
	};
};


//------------------------------------------
// MAIN PROCESS
//------------------------------------------

//Check if settings.json exist
if(_FS.existsSync(spath)){
	logger.info("Config","Configuration file found...");
	try {
		//read settings.json content
		var data = _FS.readFileSync(spath);

		//if settings.json has content
		if(data && data != ""){
			//convert settings.json content to object
			data = JSON.parse(data.toString());

			//for each configs in settings.json, add/replace default config
			for(var i in data){
				logger.debug("Config", "Add/replace", i);
				config[i] = data[i];
			}

		}
		else{
			throw "Can not read file or is empty!"
		}

	}
	catch(cErr){
		logger.warn("Config", "Failed to parse settings JSON file", "-", String(cErr));
	}
}

//Check if appdirs config exist and is an array
if(config.appdirs === null || !(config.appdirs instanceof Array)){
	//if does not exist or is not an array, use apath
	config.appdirs = [apath];
}

//Check if dir config exist
if(!config.dir){
	//if does not exist use server path
	config.dir = _FS.realpathSync('.');
}

//Check if port is available before starting server
isPortAvail(config.port, function(err, avail){
	if(err){
		err = ErrCode.code[err.code];
		logger.emerg("Server", "Error n°" + err.errno, "-", "Can not run server on port " + config.port + ",", err.description);
	}
	else{
		logger.info("Server", "Starting server on port", config.port, "...");

		server = _HTTP.createServer().listen(config.port);
		
		io = _SOCK.listen(server, {log: false});	//SOCKET LOG!!

		//On client connection callback onSocConn function
		io.sockets.on('connection', onSocConn);
	}
});