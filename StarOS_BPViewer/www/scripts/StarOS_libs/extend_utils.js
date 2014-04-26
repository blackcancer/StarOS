/*
	Product: StarOs extend utils
	Description: The script extend basic javascript options and add 
	common functions
	License: http://creativecommons.org/licenses/by/3.0/legalcode

	FileVersion: 0.1-rev00001					Date: 2014-04-07
	By Blackcancer

	website: http://initsysrev.net
	support: blackcancer@initsysrev.net
*/

(function(){

	/**
	* String to bool
	**/
	var parseBool = function(string){
		string = string.toLowerCase();
		return (string == "true");
	};

	/**
	* shedule(f, c, t) delay execution of functions
	* 
	* @param array   f: array of functions to execute
	* @param context c: where are called functions
	* @param integer t: timer
	**/
	var shedule = function(functions, context, timer){
		setTimeout(function(){
			var process = functions.shift();
			process.call(context);

			if(functions.lenght > 0){
				setTimeout(arguments.callee, timer);
			}
		}, timer);
	};

	var chunk = function(array, process, context, timer, callback){
		setTimeout(function(){
			var item = array.shift();
			process.call(context, item);

			if (array.length > 0){
				setTimeout(arguments.callee, timer);
			}
			else {
				callback = callback || function(){};
				callback();
			}
		}, timer);
	};

	function download(uri, name) {

		function eventFire(el, etype){
			if (el.fireEvent) {
				(el.fireEvent('on' + etype));
			} else {
				var evObj = document.createEvent('Events');
				evObj.initEvent(etype, true, false);
				el.dispatchEvent(evObj);
			}
		}

		var link = document.createElement("a");
		link.download = name;
		link.href = uri;
		eventFire(link, "click");

	};

	var cloneObj = function(o){
		var p,r = {};
		for (p in o){
			//omitting checks for functions, date objects and the like
			r[p] = (typeof o[p] == 'object') ? cloneObj(o[p]) : o[p];
		}
		return r;
	};

	var sortCoords = function(arr){

		arr.sort(function(a, b) {
			var tmpA = a.split(','),
				tmpB = b.split(',');
			return (parseInt(tmpA[0]) < parseInt(tmpB[0]))? -1 : (parseInt(tmpA[0]) > parseInt(tmpB[0])) ? 1 : (parseInt(tmpA[1]) < parseInt(tmpB[1])) ? -1 : (parseInt(tmpA[1]) > parseInt(tmpB[1])) ? 1 : (parseInt(tmpA[2]) < parseInt(tmpB[2])) ? -1 : (parseInt(tmpA[2]) > parseInt(tmpB[2])) ? 1 : 0;
		});

		return arr;
	}


	//--------------------------------------------
	// Extend js class
	//--------------------------------------------
	/**
	* String.capitalize() change first char to cap
	**/
	String.prototype.capitalize = function() {
		return this.charAt(0).toUpperCase() + this.slice(1);
	};

	/**
	* Number.format(n, x, s, c)
	* 
	* @param integer n: length of decimal
	* @param integer x: length of whole part
	* @param mixed   s: sections delimiter
	* @param mixed   c: decimal delimiter
	**/
	Number.prototype.format = function(n, x, s, c) {
		var re = '\\d(?=(\\d{' + (x || 3) + '})+' + (n > 0 ? '\\D' : '$') + ')',
			num = this.toFixed(Math.max(0, ~~n));

		return (c ? num.replace('.', c) : num).replace(new RegExp(re, 'g'), '$&' + (s || ','));
	};

	window.parseBool		= window.parseBool			|| parseBool;
	window.shedule			= window.shedule			|| shedule;
	window.chunk			= window.chunk				|| chunk;
	window.download			= window.download			|| download;
	window.cloneObj			= window.cloneObj			|| cloneObj;
	window.sortCoords		= window.sortCoords		|| sortCoords;
})();