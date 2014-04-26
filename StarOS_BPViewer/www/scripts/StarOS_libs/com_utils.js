/*
	Product: StarOS COM utils
	Description: This script provide basic lib for StarOS communication
	License: http://creativecommons.org/licenses/by/3.0/legalcode

	FileVersion: 0.1-rev00001					Date: 2014-04-07
	By Blackcancer

	website: http://initsysrev.net
	support: blackcancer@initsysrev.net
*/

(function(){
	window.StarOS = window.StarOS || {};

	/**
	* Ajax function
	**/
	var Ajax = function(url, onSuccess, onError, args){
		if(!url){
			throw "No URL given.";
		}

		args	= args			|| {};

		var post	= args.post		|| {},
			parse	= args.parse	|| false,
			method	= args.method	|| 'GET',
			sync	= (args.sync)? false : true,
			xhr;

		method	= method.toUpperCase();

		if(window.XMLHttpRequest){
			xhr = new XMLHttpRequest();
		}
		else if(window.ActiveXObject){
			try {
				xhr = new ActiveXObject('Msxml2.XMLHTTP');
			}
			catch(cErr){
				try {
					xhr = new ActiveXObject('Microsoft.XMLHTTP');
				}
				catch(cErr){
				}
			}
		}

		if(!xhr){
			console.err("Cannot create an XMLHTTP instance");
			return false;
		}

		xhr.onreadystatechange = function(){
			if(this.readyState === 4){
				var cType = this.getResponseHeader('Content-Type'),
					err, resp;

				if(cType === 'application/json' && parse){
					try {
						resp = JSON.parse(this.responseText);
					}
					catch(cErr){
						err = {
							errno:			800,
							code:			'EJSONPARSE',
							description:	"An error occurred while parsing: " + cErr
						}
					}
				}
				else if(cType === 'text/xml' || cType === 'application/xml'){
					resp = this.responseXML;
				}
				else {
					resp = this.responseText;
				}

				if(this.status === 200 && !err){
					onSuccess(resp, this, url);
				}
				else {
					if(!err && cType !== 'application/json'){
						err = {
							errno:			300,
							code:			'ESRVCOM',
							description:	"Server error: " + (resp || "Fatal error")
						}
					}

					onError(err, resp, this, url);
				}
			}
		};

		xhr.open(method, url, sync);

		if(method === 'GET'){
			xhr.send();
		}
		else {
			if(typeof post !== 'String'){
				post = JSON.stringify(post);
			}

			xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
			xhr.send(post);
		}

		return true;
	};


	//--------------------------------------------
	// Socket Class
	//--------------------------------------------
	var Socket = function(host, port){
		var url		= host + ':' + port;

		this.host		= host;
		this.port		= port;
		this.connected	= false;

		//connect socket
		this.socket	= io.connect(url);

		//Add event listener to socket
		this.socket.on('connect',		this.onConnect.bind(this));
		this.socket.on('message',		this.onMessage.bind(this));
		this.socket.on('disconnect',	this.onDisconnect.bind(this));
	};

	Socket.prototype.onConnect = function(){
		var event = document.createEvent('Event');

		this.connected = true;

		event.initEvent("socket::connected",true,true);
		document.dispatchEvent(event);
	};

	Socket.prototype.onMessage = function(msg, cb){
		console.group("Socket::onMessage()");
		console.log("message:",	msg);
		console.groupEnd();

		cb.apply(this, arguments);
	};

	Socket.prototype.onDisconnect = function(){
		var event = document.createEvent('Event');

		this.connected = false;

		event.initEvent("socket::disconnected",true,true);
		document.dispatchEvent(event);
		
		console.log("Socket disconnected!");
	};

	Socket.prototype.on = function(event, cb){
		if(!event instanceof String && !cb instanceof Function){
			console.group("Socket::onOther(event, callback)");
			console.err("\"event\" must be a String and \"callback\" must be a Function");
			console.groupEnd();
			throw "Error: event must be a string and callback a function";
		}
		else {
			this.socket.on(event, cb);
		}
	};

	Socket.prototype.callAPI = function(caller, meth, fn, args){
		if(!meth){
			console.group("Socket::callAPI(method, function, arguments)");
			console.error("function need arguments (string)\"method\"");
			console.groupEnd();
		}
		else {

			if(!fn){
				console.group("Socket::callAPI(method, function, arguments)");
				console.error("function need arguments (string)\"function\"");
				console.groupEnd();
			}
			else {
				args	= args	|| {};
				
				this.socket.emit('API', {
					caller: caller,
					meth:	meth,
					fn :	fn,
					args:	args
				});
			}

		}
	};

	Socket.prototype.callStarmadeAPI = function(caller, meth, fn, args){
		if(!meth){
			console.group("Socket::callAPI(method, function, arguments)");
			console.error("function need arguments (string)\"method\"");
			console.groupEnd();
		}
		else {

			if(!fn){
				console.group("Socket::callAPI(method, function, arguments)");
				console.error("function need arguments (string)\"function\"");
				console.groupEnd();
			}
			else {
				args	= args	|| {};
				
				this.socket.emit('StarMadeAPI', {
					caller: caller,
					meth:	meth,
					fn :	fn,
					args:	args
				});
			}

		}
	};


	//--------------------------------------------
	// Exporting Class and Functions
	//--------------------------------------------
	StarOS.COM			= StarOS.COM		|| {};

	StarOS.COM.Ajax		= StarOS.COM.Ajax	|| Ajax;
	StarOS.COM.Socket	= StarOS.COM.Socket	|| Socket;
})();