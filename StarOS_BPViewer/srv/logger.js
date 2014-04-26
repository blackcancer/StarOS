/*
	Product: Logger
	Description: Logger module for StarOS
	License: http://creativecommons.org/licenses/by/3.0/legalcode

	FileVersion: 0.1-rev00001					Date: 2014-01-28
	By Blackcancer

	website: http://initsysrev.net
	support: blackcancer@initsysrev.net
*/

var _FS		= require('fs'),
	_PATH	= require('path'),

	levels = [
	'emerg',
	'alert',
	'crit',
	'err',
	'warn',
	'notice',
	'info',
	'debug'
	],

	colors = [
		//emerg
		"\033[1;31m\033[4;31m", //rouge gras souligné
		//alert
		"\033[35m", 			//magenta
		//crit
		"\033[1;31m",			//rouge gras
		//err
		"\033[31m",				//rouge
		//warn
		"\033[33m",				//jaune
		//notice
		"\033[36m",				//cyan
		//info
		"\033[0m",				//blanc
		//debug
		"\033[90m"				//gris foncé
	];

var Logger = module.exports = function(options){
	options			= options		 || {};
	this.level		= 7				 || options.level;
	this.enabled	= true			 || options.enabled;
	this.logdir		= options.logdir ||'/var/log/StarOS';

	var file = _PATH.join(this.logdir, "server.log");

	if(_FS.existsSync(file)){
		var count = 0,
			flist = [],
			exist = true;

		while(exist){
			var ofile = _PATH.join(this.logdir, "server." + count + ".log");
			if(_FS.existsSync(ofile)){
				flist.push(ofile);
				count++;
			}
			else{
				exist = false;
			}
		}
		count--;

		for(var i = flist.length -1; i > -1; i--){
			_FS.renameSync(flist[i], _PATH.join(this.logdir, "server." + (i + 1) + ".log"))
		}

		_FS.renameSync(file, _PATH.join(this.logdir, "server.0.log"))

	}
	this.stream = _FS.createWriteStream(_PATH.join(this.logdir, "server.log"));
};

Logger.prototype.log = function(call, type){
	var index = levels.indexOf(call),
		args = toArray(arguments).slice(2),
		log = "",
		log2 = "",
		date = new Date(),
		m = date.getMonth().toString(),
		d = date.getDate().toString(),
		h = date.getHours().toString(),
		min = date.getMinutes().toString(),
		s = date.getSeconds().toString(),
		month = (m.length != 2) ? "0" + m : m,
		day = (d.length != 2) ? "0" + d : d,
		hours = (h.length != 2) ? "0" + h : h,
		minutes = (min.length != 2) ? "0" + min : min,
		seconds = (s.length != 2) ? "0" + s : s,

		dayStr = date.getFullYear() + "-" + month + "-" + day,
		hourStr = hours + ":" + minutes + ":" + seconds,
		dateStr = "[" + dayStr + " " + hourStr + "]";

	if(index > this.level || !this.enabled){
		return this;
	}

	for(var i = 0; i < args.length; i++){
		arg = args[i];
		arg2 = args[i];
		if(typeof args[i] === 'object'){
			arg = serialize(args[i]);
			arg2 = fileSerialize(args[i]);
		}
		log += " " + arg;
		log2 += " " + arg2;
	}

	type = "[" + type.toUpperCase() + "]";
	header = dateStr + " " + type;
	var logStr = header + ":" + log + "\n";

	this.stream.write(logStr);
	if(index == 0){
		console.log(colors[index] + header + ":" + log2 + "\033[0m");
	}
	else {
		console.log(colors[index] + header + "\033[0m:" + log2);
	}
};

levels.forEach(function (name) {
	Logger.prototype[name] = function (type) {
		args = Array.prototype.slice.call(arguments, 1)
		this.log.apply(this, [name, type].concat(toArray(arguments).slice(1)));
	};
})

/**
 * Pads the nice output to the longest log level.
 */

function pad(str){
	var max = 0;

	for(var i = 0, l = levels.length; i < l; i++){
		max = Math.max(max, levels[i].length);
	}

	if(str.length < max){
		return str + new Array(max - str.length + 1).join(' ');
	}

	return str;
};

function toArray(enu){
	var arr = [];

	for (var i = 0, l = enu.length; i < l; i++){
		arr.push(enu[i]);
	}

	return arr;
};

function serialize(obj){
	str = "Read object content\n"
	str += JSON.stringify(obj, null, "\t");
	return str;
};

function fileSerialize(obj){
	var str = "Read object content\n",
		newobj = JSON.stringify(obj, null, 2),
		keys = newobj.match(/(\".*\"):/g) || [],
		strings = newobj.match(/(\".+?\")/g) || [],
		numbers = newobj.match(/(\d+),/g) || [];

	for(var i = 0; i < keys.length; i++){
		newobj = newobj.replace(keys[i], colors[5] + keys[i].replace(/\"/g, "") + "\033[0m");
	}

	for(var i = 0; i < strings.length; i++){
		newobj = newobj.replace(strings[i], colors[4] + strings[i] + "\033[0m");
	}

	for(var i = 0; i < keys.length; i++){
		newobj = newobj.replace(numbers[i], colors[3] + numbers[i] + "\033[0m");
	}

	str += newobj;
	return str;
}