/*
	Product: StarOS GUI utils
	Description: This script provide basic lib for StarOS gui
	License: http://creativecommons.org/licenses/by/3.0/legalcode

	FileVersion: 0.1-rev00001					Date: 2014-04-07
	By Blackcancer

	website: http://initsysrev.net
	support: blackcancer@initsysrev.net
*/

(function(){
	window.StarOS = window.StarOS || {};


	//--------------------------------------------
	// CSS functions
	//--------------------------------------------
	/**
	* get theme folders
	**/
	function getTheme(name){
		if ( name === null ) {
		  return 'res/themes/default/style.css';
		}
		return 'res/themes/' + name + '/style.css';
	};

	/**
	* apply theme css to your page
	**/
	function applyTheme(name){
		// Theme
		var tlink = document.getElementById("StarOSTheme");
		console.log("Theme:", name);
		tlink.setAttribute('href', getTheme(name));
	};

	/**
	* get Translation file
	**/
	function getLanguage(){
		var userLang		= navigator.language || navigator.userLanguage,
			languages		= StarOS.config.langs.availible,
			default_lang	= StarOS.config.langs.default;

		//What language will be used
		for(var i = 0; i < languages.length; i++){
			if(userLang.toLowerCase() == languages[i].toLowerCase()){
				default_lang = userLang.toLowerCase();
			}
		}

		console.log("Language: " + default_lang)

		var StarOS_serv = StarOS.config.StarOS_serv,
			params = 'path=' + StarOS.config.path.json + 'Translates/' + default_lang + '.json';

		if(!StarOS.COM.Ajax('http://' + StarOS.config.StarOS_serv.host + ':' + StarOS.config.StarOS_serv.port + '/getFile?' + params, onSuccess, onError, {sync:true})){
			console.log("err");
		}
		function onSuccess(data, xhr, url){
			StarOS.translation = JSON.parse(data);
		}

		function onError(err, data, xhr, url){
			console.log(err);
			StarOS.translation = false;
		}
	}

	//Abbreviate "new Dialog()" to "dial()"
	function dial(msg){
		new Dialog(msg, arguments);
	};

	//--------------------------------------------
	// Window Class
	//--------------------------------------------
	var Window = (function(){
		var _id = 0;

		return function(args){

			args		= args		|| {};
			args.pos	= args.pos	|| {};
			args.size	= args.size	|| {};

			//Default attributs
			this.parent	= args.parent || document.body;
			this.name	= args.name	|| 'Window_' + _id;
			this.id		= _id;
			this.fixed	= args.fixed || false;

			this.pos	= {
				x: args.pos.x || 0,
				y: args.pos.y || 0
			};

			this.size	= {
				width:	args.size.width		|| '100%',
				height:	args.size.height	|| '100%'
			};

			this.dom = {
				body:		document.createElement('div'),
				content:	document.createElement('div'),
				brd: {
					leftTop:		document.createElement('div'),
					top:			document.createElement('div'),
					rightTop:		document.createElement('div'),

					left:			document.createElement('div'),
					right:			document.createElement('div'),

					leftBottom:		document.createElement('div'),
					bottom:			document.createElement('div'),
					rightBottom:	document.createElement('div'),
				}
			}
			this.isVisible		= true;

			this.create();
			_id ++;
		};
	})();

	Window.prototype.create	= function(){

		this.dom.body.id		= this.name;
		this.dom.body.className	= 'Window_body';
		this.dom.body.className	+= ' absolute';

		this.dom.content.className	= 'Window_content';
		this.dom.content.className	+= ' absolute';

		for(node in this.dom.brd){
			this.dom.brd[node].className = 'Window_border';
			this.dom.brd[node].className += ' Window_brd_' + node;
			this.dom.brd[node].className += ' absolute';

			this.dom.body.appendChild(this.dom.brd[node]);
		}

		this.dom.body.appendChild(this.dom.content);
		this.parent.appendChild(this.dom.body);

		this.dom.body.style.width	= this.size.width;
		this.dom.body.style.height	= this.size.height;

		this.update();
	};

	Window.prototype.update		= function(){
		//Resize body
		this.dom.body.style.width	= this.size.width;
		this.dom.body.style.height	= this.size.height;

		//Getting dimensions
		var brdWidth	= this.dom.brd.left.offsetWidth,
			brdHeight	= this.dom.brd.top.offsetHeight,
			innerWidth	= this.dom.body.offsetWidth - (2 * brdWidth),
			innerHeight	= this.dom.body.offsetHeight - (2 * brdHeight);

		//Resize content
		this.dom.content.style.width	= innerWidth + 'px';
		this.dom.content.style.height	= innerHeight + 'px';

		//Resize borders
		this.dom.brd.top.style.width	= innerWidth + 'px';
		this.dom.brd.bottom.style.width	= innerWidth + 'px';
		this.dom.brd.left.style.height	= innerHeight + 'px';
		this.dom.brd.right.style.height	= innerHeight + 'px';

		//Position content
		this.dom.content.style.left		= brdWidth + 'px';
		this.dom.content.style.top		= brdHeight + 'px';

		//Position borders
		this.dom.brd.top.style.left		= brdWidth + 'px';
		this.dom.brd.left.style.top		= brdHeight + 'px';
		this.dom.brd.bottom.style.left	= brdWidth + 'px';
		this.dom.brd.bottom.style.top	= brdHeight + innerHeight + 'px';
		this.dom.brd.right.style.top	= brdHeight + 'px';
		this.dom.brd.right.style.left	= brdWidth + innerWidth + 'px';

		//Position corners
		this.dom.brd.rightTop.style.left	= brdWidth + innerWidth + 'px';
		this.dom.brd.rightBottom.style.left	= brdWidth + innerWidth + 'px';
		this.dom.brd.rightBottom.style.top	= brdHeight + innerHeight + 'px';
		this.dom.brd.leftBottom.style.top	= brdHeight + innerHeight + 'px';

		//Position window
		if(!this.fixed){
			this.dom.body.style.left	= this.pos.x;
			this.dom.body.style.top		= this.pos.y;
		}
	};

	Window.prototype.toggle		= function(){
		if(this.isVisible){
			this.hide();
		}
		else {
			this.show();
		}
	};

	Window.prototype.show		= function(){
		this.dom.body.style.display = 'block';
		this.isVisible = true;
	};

	Window.prototype.hide		= function(){
		this.dom.body.style.display = 'none';
		this.isVisible = false;
	};

	Window.prototype.destroy	= function(){
		this.parent.removeChild(this.dom.body);

		while (this.dom.content.firstChild) {
			this.dom.content.removeChild(this.dom.content.firstChild);
		}

		delete this;
	}


	//--------------------------------------------
	// Dialog window Class
	//--------------------------------------------
	var Dialog = function(msg){
		var args	= Array.prototype.slice.call(arguments, 1),
			p		= document.createElement('p'),
			submit	= document.createElement('input'),
			_SELF	= this;

		Window.apply(this, args);

		msg = msg.replace(/\n/g,"<br />");
		msg = msg.replace(/\r/g,"<br />");
		msg = msg.replace(/\t/g,"&nbsp;&nbsp;&nbsp;&nbsp;");
		p.innerHTML = msg;
		
		//Input config
		submit.name = submit.value = "Ok";
		submit.type = 'submit';

		submit.className = 'GUI_button';
		submit.className += ' Dial_ok';

		//Add DOM
		var div = document.createElement('div');
		div.className = "Dial_content"
		div.appendChild(p);
		this.dom.content.appendChild(div);
		this.dom.content.appendChild(submit);

		//Setup size
		this.size.width = '350px';
		this.size.height = p.offsetHeight + submit.offsetHeight + this.dom.brd.top.offsetHeight * 2 + 60 + 'px';

		div.style.height = p.offsetHeight + 50 + 'px';
		//Setup pos
		this.pos.x = (this.parent.offsetWidth - 350) / 2 + 'px';
		this.pos.y = '0px';

		//Setup z-index
		this.dom.body.style.zIndex = 999999;

		//Update DOM with new params
		this.update();

		submit.focus();
		//Input style
		submit.style.left = (350 - submit.offsetWidth - this.dom.brd.left.offsetWidth * 2)  / 2+ 'px';
		submit.addEventListener('click', onClick);

		function onClick(event){
			event.preventDefault();
			_SELF.destroy();
		}
	};

	Dialog.prototype = Object.create(Window.prototype);


	//--------------------------------------------
	// Property window Class
	//--------------------------------------------
	var Property = function(parent){
		args = [{
			parent: parent,
			name: "StarOS_property",
			size: {
				width:	'350px',
				height:	'180px'
			},
			pos: {
				x: (parent.offsetWidth - 350) / 2 + 'px',
				y: (parent.offsetHeight - 180) / 2 + 'px'
			}
		}];

		Window.apply(this, args);

		var _SELF = this;
			select = {
				themeSelec:	document.createElement('select'),
				fontSelec:	document.createElement('select'),
				sizeSelec:	document.createElement('select'),
				theme:		document.createElement('label'),
				font:		document.createElement('label'),
				size:		document.createElement('label'),
				showcase:	document.createElement('span')
			},

			inputs = {
				ok:		document.createElement('input'),
				cancel:	document.createElement('input'),
				apply:	document.createElement('input')
			};

		for(var node in select){
			select[node].className = 'Property_' + node;
			select[node].className += ' absolute';

			_SELF.dom.content.appendChild(select[node]);
		}

		for(var node in inputs){
			inputs[node].className = 'Property_button' + node.capitalize();
			inputs[node].className += ' GUI_button';
			inputs[node].className += ' absolute';
			inputs[node].type = 'submit';
			inputs[node].value = inputs[node].name = _translate.PropertyWindow.buttons[node];

			_SELF.dom.content.appendChild(inputs[node]);
		}

		select.theme.innerHTML		= _translate.PropertyWindow.theme + ":";
		select.font.innerHTML		= _translate.PropertyWindow.font + ":";
		select.size.innerHTML		= _translate.PropertyWindow.size + ":";
		select.showcase.innerHTML	= "Preview text for font and size.";

		_socket.callAPI('Property', 'vfs', 'dir', {path: SITE_PATH + 'res/themes'});

		_socket.on('API::Property', function(err, files){
			if(err){
				console.log(err);
			}
			else {

				var i = 0;
				for(var file in files){
					var option = document.createElement('option');
					option.text = files[file];
					select.themeSelec.add(option);
					if(files[file] == THEME){
						select.themeSelec.selectedIndex = i;
					}
					i++;
				}


			}
		});

		for(var i = 0; i < fonts.length; i++){
			var option = document.createElement('option');
			option.text = fonts[i];
			select.fontSelec.add(option);
		}

		for(var i = 6; i < 30; i++){
			var option = document.createElement('option');
			option.text = i;
			select.sizeSelec.add(option);
		}

		select.themeSelec.addEventListener("change",	changeCSS, false);
		select.themeSelec.addEventListener("keypress",	changeCSS, false);
		select.themeSelec.addEventListener("paste",		changeCSS, false);
		select.themeSelec.addEventListener("input",		changeCSS, false);

		select.fontSelec.addEventListener("change",		changeFont, false);
		select.fontSelec.addEventListener("keypress",	changeFont, false);
		select.fontSelec.addEventListener("paste",		changeFont, false);
		select.fontSelec.addEventListener("input",		changeFont, false);

		select.sizeSelec.addEventListener("change",		changeSize, false);
		select.sizeSelec.addEventListener("keypress",	changeSize, false);
		select.sizeSelec.addEventListener("paste",		changeSize, false);
		select.sizeSelec.addEventListener("input",		changeSize, false);

		inputs.ok.addEventListener(		"click", onOk,		false);
		inputs.cancel.addEventListener(	"click", onCancel,	false);
		inputs.apply.addEventListener(	"click", onApply,	false);

		function changeCSS(event){
			applyTheme(select.themeSelec.value);
			//set timeout to wait css loading
			setTimeout(function(){
				_SELF.update();
				var event = document.createEvent('Event');
				event.initEvent("PropertyWindow::needUpdate", true, true);
				document.dispatchEvent(event);
			}, 500);
		};

		function changeFont(event){
			select.showcase.style.fontFamily = select.fontSelec.value + ', serif';
			select.showcase.style.left = (_SELF.dom.content.offsetWidth - select.showcase.offsetWidth) / 2 + 'px';
		};

		function changeSize(event){
			select.showcase.style.fontSize = select.sizeSelec.value + 'px';
			select.showcase.style.left = (_SELF.dom.content.offsetWidth - select.showcase.offsetWidth) / 2 + 'px';
		};

		function onOk(event){
			event.preventDefault();
			if(select.showcase.style.fontSize != ""){
				document.body.style.fontSize = select.sizeSelec.value + 'px';
			}

			if(select.showcase.style.fontFamily != ""){
				document.body.style.fontFamily = select.fontSelec.value + ', serif';
			}

			if(select.themeSelec.value != THEME){
			}

			select.themeSelec.value = THEME;

			_SELF.destroy();
		};

		function onCancel(event){
			event.preventDefault();
			if(select.themeSelec.value != THEME){
				applyTheme(THEME);
				setTimeout(function(){
					_SELF.update();
					var event = document.createEvent('Event');
					event.initEvent("PropertyWindow::needUpdate", true, true);
					document.dispatchEvent(event);
				}, 500);
			}

			_SELF.destroy();
		};

		function onApply(event){
			event.preventDefault();
			console.log(select.showcase.style.fontSize)
			if(select.showcase.style.fontSize != ""){
				document.body.style.fontSize = select.sizeSelec.value + 'px';
			}
			
			if(select.showcase.style.fontFamily != ""){
				document.body.style.fontFamily = select.fontSelec.value + ', serif';
			}

			select.themeSelec.value = THEME;
		};

		select.showcase.style.left = (_SELF.dom.content.offsetWidth - select.showcase.offsetWidth) / 2 + 'px';
	};

	Property.prototype = Object.create(Window.prototype);


	//--------------------------------------------
	// Init this lib
	//--------------------------------------------
	applyTheme(StarOS.config.theme.default);
	getLanguage();


	//--------------------------------------------
	// Exporting Class and Functions
	//--------------------------------------------
	StarOS.WIN			= StarOS.WIN		|| {};

	StarOS.WIN.Window	= StarOS.WIN.Window	|| Window;
	StarOS.WIN.Dialog	= StarOS.WIN.Dialog	|| Dialog;
	StarOS.WIN.Property	= StarOS.WIN.Window	|| Property;
	StarOS.dial			= StarOS.dial		|| dial;

	StarOS.getTheme		= StarOS.getTheme	|| getTheme;
	StarOS.applyTheme	= StarOS.applyTheme	|| applyTheme;
})();
