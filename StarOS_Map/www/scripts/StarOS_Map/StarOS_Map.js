/*
	Product: StarOS Map
	Description: This script generate a 3D Starmap for starmade
	License: http://creativecommons.org/licenses/by/3.0/legalcode

	FileVersion: 5.0-rev00101					Date: 2013-12-28
	By Blackcancer

	website: http://initsysrev.net
	support: blackcancer@initsysrev.net
*/

//Anonyme function is used to encapsule class and functions
(function(){
	//Preload default texture for entities
	var loadedTexture = {
		shop:		new THREE.ImageUtils.loadTexture('res/img/starmap/icons/shop.png'),
		station:	new THREE.ImageUtils.loadTexture('res/img/starmap/icons/station.png'),
		asteroid:	new THREE.ImageUtils.loadTexture('res/img/starmap/icons/asteroid.png'),
		ship:		new THREE.ImageUtils.loadTexture('res/img/starmap/icons/ship.png'),
		turret:		new THREE.ImageUtils.loadTexture('res/img/starmap/icons/turret.png'),
		sun:		new THREE.ImageUtils.loadTexture('res/img/starmap/icons/sun.png'),
		other:		new THREE.ImageUtils.loadTexture('res/img/starmap/icons/disc.png'),
		unknown:	new THREE.ImageUtils.loadTexture('res/img/starmap/icons/unknown.png'),
		planet: {
			red:		new THREE.ImageUtils.loadTexture('res/img/starmap/icons/redPlanet.png'),
			terran:		new THREE.ImageUtils.loadTexture('res/img/starmap/icons/terranPlanet.png'),
			desert:		new THREE.ImageUtils.loadTexture('res/img/starmap/icons/desertPlanet.png'),
			alien:		new THREE.ImageUtils.loadTexture('res/img/starmap/icons/alienPlanet.png'), 
			ice:		new THREE.ImageUtils.loadTexture('res/img/starmap/icons/icePlanet.png'),
			unknown:	new THREE.ImageUtils.loadTexture('res/img/starmap/icons/fallPlanet.png'),
		}
	};

	var fonts = [
		"cursive",
		"monospace",
		"serif",
		"sans-serif",
		"fantasy",
		"default",
		"Arial",
		"Arial Black",
		"Arial Narrow",
		"Arial Rounded MT Bold",
		"Bookman Old Style",
		"Bradley Hand ITC",
		"Century",
		"Century Gothic",
		"Comic Sans MS",
		"Courier",
		"Courier New",
		"Georgia",
		"Gentium",
		"Impact",
		"King",
		"Lucida Console",
		"Lalit",
		"Modena",
		"Monotype Corsiva",
		"Neuropolitical Rg",
		"Papyrus",
		"Tahoma",
		"TeX",
		"Times",
		"Times New Roman",
		"Trebuchet MS",
		"Verdana",
		"Verona"
	];

	const _CHUNKSIZE	= 16;
	const _SECTORSIZE	= 1300;

	//GLOBAL VARIABLES
	var StarOS = {},
		DEBUG = false,
		DEF_LANG	= '',
		LANGUAGES	= [],
		SITE_PATH	= '',
		THEME		= '',
		_translate	= {},
		_socket, _session, _log;


	//--------------------------------------------
	// Starmap Class
	//--------------------------------------------
	var Starmap = function(args){
		
		args			= args			|| {};
		args.socket		= args.socket	|| {};
		args.show		= args.show 	|| {};
		args.ent_info	= args.ent_info	|| {};
		args.view		= args.view 	|| {};
		
		//CONSTANTES -----------------------------------------------------------
		//					All constantes start with underscore and are in CAPS
		const _SELF			= this;
		
		//MERGE PARAMETERS DEFINE BY USER ----------------------------------------
		//				All parameters are in CAPS for better readability
		var $parent		= document.getElementById(args.parentId) || document.body,
			WIDTH		= args.width		|| false,
			HEIGHT		= args.height		|| false,
			JSON_PATH	= args.json_path	|| '/var/www/scripts/StarOS_json/',
			USE_LOGIN	= args.use_login	|| false,

			SOCKET		= {
				host: args.StarOS_serv.host	|| window.location.host,
				port: args.StarOS_serv.port	|| 8000
			},

			SHOW		= {
				ship	: args.show.ship 		|| false,
				asteroid: args.show.asteroid	|| false,
			},

			ENT_INFO	= {
				faction:	args.ent_info.faction	|| false,
				mass:		args.ent_info.mass		|| false,
				power:		args.ent_info.power		|| false,
				shield:		args.ent_info.shield	|| false
			},

			VIEW		= {
				aspect	: args.view.aspect	|| (WIDTH != false && HEIGHT != false)? WIDTH / HEIGHT : false,
				fov		: args.view.fov		|| 45,
				near	: args.view.near	|| 0.1,
				far		: args.view.far		|| 4100000
			};

		//SETUP GLOBAL VARIABLES
		DEBUG		= args.debug		|| false;
		DEF_LANG	= args.default_lang	|| 'en';
		LANGUAGES	= args.languages	|| ['fr', 'en'];
		SITE_PATH	= args.site_path	|| '/var/www/';
		THEME		= args.theme		|| 'default';

		_session = {};

		//Set default theme
		applyThemeCSS(THEME);
		_log = new DebugLog();
		getLanguage();

		//CLASS VARIABLES --------------------------------------------------------
		//					All class variavles start with underscore
		var _user			= {},
			_logged			= false,
			_factionDict	= {},

			_toLoad			= 0,
			_loaded			= 0,

			_entityDict		= {},

			_systemDict		= {},
			_systemSprite	= [],

			_previousSys		= [0, 0, 0],
			_currentSys		= [0, 0, 0],
			_previousSec		= [0, 0, 0],
			_currentSec		= [0, 0, 0],

			_previousView	= 0,
			_currentView	= 0,

			_chunks			= [],
			_chunkEnt		= {},
			_chunkDict		= {},
			_chunkSprite	= [],

			_mouse		= {
				x: 0,
				y: 0
			},
			_intersected	= false,

			_showInfo		= false,
			_sysView		= false,

			_show = {
				shop:		true,
				station:	true,
				asteroid:	true,
				planet:		true,
				ship:		true,
				turret:		true,
			},

			_mainWindow, _loadWindow, _checkWindow, _debugWindow, _webGL;

		//set timeout to wait css loading
		setTimeout(function(){_SELF.init();}, 1000);

		Starmap.prototype.init = function(){
			//Connect to server
			_socket = new Socket(SOCKET.host, SOCKET.port);
			document.addEventListener('socket::connected', socketConnect.bind(this));

			//Create main window of Starmap
			_mainWindow = new Window({
				parent: $parent,
				name: "Starmap",
				size: {
					width:	(WIDTH)? WIDTH + 'px' : '99%',
					height:	(HEIGHT)? HEIGHT + 'px' : '98%'
				}
			});

			if(VIEW.aspect == false){
				VIEW.aspect = _mainWindow.dom.content.offsetWidth / _mainWindow.dom.content.offsetHeight;
			}

			//Create basic WebGL functions for Starmap
			_webGL = new WebGL({
				parent: _mainWindow.dom.content,
				view: VIEW,
				cameraPos :{
					x: _SECTORSIZE * 4,
					y: _SECTORSIZE * 4,
					z: _SECTORSIZE * 4
				}
			});
			
			this.labelInfo = document.createElement('label');
			this.labelInfo.id = 'Starmap_Info';
			this.labelInfo.className = 'absolute';

			_mainWindow.dom.content.appendChild(this.labelInfo);

			this.GL_InitSkyBox();
			this.GUI_Loading();
			this.GUI_ControlBox();
			DEBUG ? this.GUI_Debug() : null;

			this.SetupEvent();

			function socketConnect(){
				this.Sock_GetFactions();
				this.Sock_GetEntityDict();
				document.addEventListener('Starmap::Sock_GetEntityDict', function(){
					if(USE_LOGIN){
						_SELF.login();
					}
					else {
						_SELF.setupSysDict(_SELF.GL_RenderSystemView);
					}
				});

			};
		};

		Starmap.prototype.login = function(){
			console.group("StarOS::Starmap::login()");
			var session_xhr = AJAX();

			//Request session function on functions.php
			console.log("Request for previous session.");
			session_xhr.open('GET', 'includes/functions.php?get=session');
			session_xhr.send(null);

			session_xhr.onreadystatechange = function(){
				if(session_xhr.readyState == 4){
					//console.group("StarOS::Starmap::login()");
					if(session_xhr.status == 200){
						var data = JSON.parse(session_xhr.responseText);

						//If function return sesssion data
						if(data.user != undefined){
							_session = data;
							_logged = true
							console.log("Logged");
							DEBUG ? console.debug("Session:", _session) : null;
						}
						!_logged ? console.log("No previous session.") : null;
					}
					else {
						console.error("Error: Can't get session.");
						dial("Error: Can't get session.");
					}
					console.groupEnd();
					_SELF.GUI_Login();
				}
			};

		};

		Starmap.prototype.setupSysDict = function(callback){
			_log.group("StarOS::Starmap::setupSysDict()");
			_systemDict = {};

			for(var ent in _entityDict){
				if(_entityDict[ent].fid == 0 || _entityDict[ent].fid == _user.fid){

					//If show.shop and entity type == shop than skip next part of loop
					if(!_show.shop && _entityDict[ent].type == 1){
						continue;
					}

					//If show.station and entity type == station than skip next part of loop
					if(!_show.station && _entityDict[ent].type == 2){
						continue;
					}

					//If show.asteroid and entity type == asteroid than skip next part of loop
					if(!_show.asteroid && _entityDict[ent].type == 3){
						continue;
					}

					//If show.planet and entity type == planet than skip next part of loop
					if(!_show.planet && _entityDict[ent].type == 4){
						continue;
					}

					//If show.ship and entity type == ship than skip next part of loop
					if(!_show.ship && _entityDict[ent].type == 5){
						continue;
					}

					//If show.ship and entity type == ship than skip next part of loop
					if(!_show.ship && _entityDict[ent].type == 6){
						continue;
					}

					//Set array of sector coords
					var entPos = [_entityDict[ent].sPos.x, _entityDict[ent].sPos.y, _entityDict[ent].sPos.z],
					//Convert sector coords to system coords
						sysCoords = (Math.floor(entPos[0] / _CHUNKSIZE)) + '_' + (Math.floor(entPos[1] / _CHUNKSIZE)) + '_' + (Math.floor(entPos[2] / _CHUNKSIZE)),
						secCoords = entPos[0] + '_' + entPos[1] + '_' + entPos[2];

					//If system coords object does not exist to _systemDict, instantiate it
					if(_systemDict[sysCoords] == undefined){
						_systemDict[sysCoords] = {};
					}

					if(_systemDict[sysCoords][secCoords] == undefined){
						_systemDict[sysCoords][secCoords] = {};
					}

					//Add entity to _systemDict as systemCoords
					_systemDict[sysCoords][secCoords][ent] = _entityDict[ent];
				}
			}
			_log.debug("Systems:", _systemDict);
			_log.debug("Done.");
			_log.end();

			callback();

		};

		Starmap.prototype.isEmpty = function(object){
			for ( var p in object ) { 
				if(object.hasOwnProperty(p)){
					return false;
				}
			}
			return true;
		};

		//GUI functions
		Starmap.prototype.GUI_Login				= function(){
			var dom = {
				form:	document.createElement('form'),
				labels: {
					user:	document.createElement('label'),
					pass:	document.createElement('label')
				},
				inputs: {
					user:	document.createElement('input'),
					pass:	document.createElement('input'),
					button:	document.createElement('input')
				}
			},

				btnOri = {
				x: 0,
				y: 0
			},
				ori;

			dom.form.id = 'StarOS_Login';
			dom.form.className = 'absolute';

			//Set text and class for each labels
			for(var node in dom.labels){
				dom.labels[node].innerHTML = _translate.login[node] + ":";
				dom.labels[node].className = 'SLogin_' + node;
				dom.labels[node].className += ' GUI_label';
				dom.labels[node].className += ' absolute';

				dom.form.appendChild(dom.labels[node]);
			}

			//Set inputs type
			dom.inputs.user.type	= 'text';
			dom.inputs.pass.type	= 'password';
			dom.inputs.button.type	= 'submit';

			//Set class for each inputs
			for(var node in dom.inputs){
				dom.inputs[node].className = 'SLogin_' + node + 'Field';
				dom.inputs[node].className += ' GUI_textField';
				dom.inputs[node].className += ' absolute';

				dom.form.appendChild(dom.inputs[node]);
			}

			//Set name, value and class for input button
			dom.inputs.button.value		= dom.inputs.button.name = " ";
			dom.inputs.button.className = 'SLogin_buttonDisc';
			dom.inputs.button.className	+= ' GUI_button';
			dom.inputs.button.className	+= ' absolute';

			//Append DOM to html page
			_mainWindow.dom.content.appendChild(dom.form);

			//Add event listener on button
			dom.inputs.button.addEventListener('click', click, false);

			if(_logged){
				//Hide label and fields of login gui
				dom.labels.user.style.display	= 'none';
				dom.labels.pass.style.display	= 'none';
				dom.inputs.user.style.display	= 'none';
				dom.inputs.pass.style.display	= 'none';

				//Change class name for button background
				dom.inputs.button.className = 'SLogin_buttonConn';
				dom.inputs.button.className += ' GUI_button';
				dom.inputs.button.className	+= ' absolute';

				//Getting player stats
				_SELF.Sock_Getplayer();

				//Setup system dictionary to match with user's fid
				document.addEventListener('Starmap::Sock_Getplayer', function(){
					_SELF.setupSysDict(_SELF.GL_RenderSystemView);
				});
			}
			else {
				_SELF.setupSysDict(_SELF.GL_RenderSystemView);
			}

			//On event functions
			function click(event){
				event.preventDefault();		//Remove default event
				var login_xhr = AJAX();
				if(_logged){

					//Request logout function
					login_xhr.open('GET', 'includes/functions.php?get=logout');
					login_xhr.send(null);

					login_xhr.onreadystatechange = function(){
						if(login_xhr.readyState == 4){
							if(login_xhr.status == 200){
								_logged = false;
								//Empty _session
								_session = {};
								_user = {};
								//Show label and fields of login gui
								dom.labels.user.style.display	= 'block';
								dom.labels.pass.style.display	= 'block';
								dom.inputs.user.style.display	= 'block';
								dom.inputs.pass.style.display	= 'block';

								//Change class name for button background
								dom.inputs.button.className = 'SLogin_buttonDisc';
								dom.inputs.button.className	+= ' GUI_button';
								dom.inputs.button.className	+= ' absolute';

								//Reset system to match with invited user's fid
								if(_socket.connected){
									_SELF.GL_ClearScene();
									_SELF.setupSysDict(_SELF.GL_UpdateCurrentView);
								}

							}
							else {
								dial(_translate.login.disconnectErr);
							}
						}
					};

				}
				else {
					//Check if all fields are filled
					if(dom.inputs.user.value != "" && dom.inputs.pass.value != ""){

						//Encode user and password for url usage
						var user = encodeURIComponent(dom.inputs.user.value),
							pass = encodeURIComponent(dom.inputs.pass.value);

						//Request login function
						login_xhr.open('GET', 'includes/functions.php?get=login&user=' + user + '&pass=' + pass);
						login_xhr.send(null);

						login_xhr.onreadystatechange = function(){
							if(login_xhr.readyState == 4){
								if(login_xhr.status == 200){
									var data = JSON.parse(login_xhr.responseText);
									//Set _session with requested data
									_session = data;
									
									if(_session.user != undefined){
										_logged = true;

										//Hide label and fields of login gui
										dom.labels.user.style.display	= 'none';
										dom.labels.pass.style.display	= 'none';
										dom.inputs.user.style.display	= 'none';
										dom.inputs.pass.style.display	= 'none';

										//Change class name for button background
										dom.inputs.button.className = 'SLogin_buttonConn';
										dom.inputs.button.className += ' GUI_button';
										dom.inputs.button.className	+= ' absolute';

										if(_socket.connected){
											_SELF.Sock_Getplayer();

											//Reset system to match with user's fid
											document.addEventListener('Starmap::Sock_Getplayer', function(){
												_SELF.GL_ClearScene();
												_SELF.setupSysDict(_SELF.GL_UpdateCurrentView);
											});
										}

									}
									else {
										dial(_translate.login.badLogin);
									}

								}
								else {
									dial(_translate.login.connectErr);
								}
							}
						};

					}
					else {
						dial(_translate.login.emptyField);
					}

				}

			};
		};

		Starmap.prototype.GUI_MapInfo			= function(entity){
			//DOM nodes
			var dom = {
				body:		document.createElement('div'),
				button:		document.createElement('input'),
				box:		document.createElement('div'),
				content:	document.createElement('div'),
				icon:		document.createElement('img'),
				realname:	document.createElement('label'),
				dl: document.createElement('dl'),
				brd: {
					bottom:	document.createElement('div'),
					corner:	document.createElement('div'),
					right:	document.createElement('div')
				},
				dt: {
					type:		document.createElement('dt'),
					sector:		document.createElement('dt'),
					faction:	document.createElement('dt'),
					mass:		document.createElement('dt'),
					power:		document.createElement('dt'),
					shield:		document.createElement('dt'),
				}
			},

				fName		= _translate.mapInfo.fname,
				isHomeworld	= false,
				show_fac	= ENT_INFO.faction,
				show_mass	= ENT_INFO.mass,
				show_pw		= ENT_INFO.power,
				show_sh		= ENT_INFO.shield,
				shBlocks	= getShBlocks(entity.container.shield),
				shRate		= getShRate(shBlocks),
				hidden		= false,
				dd,

				//Clear old infobox
				old = document.getElementById('Starmap_infobox');

			if(old){
				old.parentNode.removeChild(old);
			}

			//Body id (main div)
			dom.body.id = 'Starmap_infobox';
			dom.body.className = 'absolute';

			//Input type, name and class
			dom.button.type			= 'submit';
			dom.button.name			= dom.button.value = _translate.mapInfo.button + ":";
			dom.button.className	= 'Infobox_btnHide';
			dom.button.className	+= ' GUI_button';

			//Add event listener on button
			dom.button.addEventListener('click', onMouseClick);

			dom.box.className = 'Infobox_box';
			dom.content.className = 'Infobox_content';
			dom.content.className += ' absolute';
			dom.box.appendChild(dom.content);

			for(var node in dom.brd){
				dom.brd[node].className = 'Infobox_brd_' + node;
				dom.brd[node].className += ' absolute';

				dom.box.appendChild(dom.brd[node]);
			}

			//Icon source, size and class
			dom.icon.src			= entity.texture.sourceFile;
			dom.icon.style.width	= entity.scale[0] + 'px';
			dom.icon.style.height	= entity.scale[1] + 'px';
			dom.icon.className		= 'Infobox_icon';

			//Set content of faction label
			if(entity.transformable.fid != 0){
				for(var fac in _factionDict){
					fName		= _factionDict[fac].name;

					if(entity.uniqueId == _factionDict[fac].home){
						fName += _translate.mapInfo.home;
					}

					break;
				}
			}
			else if(entity.type == 1){
				fName = _factionDict['-2'].name;
			}

			dom.realname.className = 'Infobox_realname';
			dom.realname.innerHTML = entity.realname;

			for(var node in dom.dt){
				dom.dt[node].innerHTML = _translate.mapInfo.dt[node] + ":";
			}

			//Compose DOM
			dom.content.appendChild(dom.icon);
			dom.content.appendChild(document.createElement('br'));
			dom.content.appendChild(dom.realname);

			dd = document.createElement('dd');
			dd.innerHTML = entity.typeLabel;
			dom.dl.appendChild(dom.dt.type);
			dom.dl.appendChild(dd);

			dd = document.createElement('dd');
			dd.innerHTML = entity.transformable.sPos.x + ", " + entity.transformable.sPos.y + ", " + entity.transformable.sPos.z;
			dom.dl.appendChild(dom.dt.sector);
			dom.dl.appendChild(dd);

			if(show_fac){
				dd = document.createElement('dd');
				dd.innerHTML = fName;
				dom.dl.appendChild(dom.dt.faction);
				dom.dl.appendChild(dd);
			}

			if(show_mass){
				dd = document.createElement('dd');
				dd.innerHTML = entity.transformable.mass.toFixed(1);
				dom.dl.appendChild(dom.dt.mass);
				dom.dl.appendChild(dd);
			}

			if(show_pw){
				dd = document.createElement('dd');
				dd.innerHTML = entity.container.power.toFixed(1);
				dom.dl.appendChild(dom.dt.power);
				dom.dl.appendChild(dd);
			}

			if(show_sh){
				dd = document.createElement('dd');
				dd.innerHTML = entity.container.shield + " (" + shRate + " s/sec)";
				dom.dl.appendChild(dom.dt.shield);
				dom.dl.appendChild(dd);
			}

			dom.content.appendChild(dom.dl);
			dom.body.appendChild(dom.button);
			dom.body.appendChild(dom.box);

			//Append DOM to HTML
			_mainWindow.dom.content.appendChild(dom.body);

			//Update CSS
			dom.body.style.width = dom.button.offsetWidth + 'px';
			dom.body.style.height = dom.button.offsetHeight + dom.content.offsetHeight + dom.brd.bottom.offsetHeight + 'px';

			dom.box.style.width = dom.button.offsetWidth + 'px';
			dom.box.style.height = dom.body.offsetHeight - dom.button.offsetHeight + 'px';

			dom.content.style.width = dom.box.offsetWidth - dom.brd.right.offsetWidth + 'px';

			dom.brd.bottom.style.width = dom.content.offsetWidth + 'px';
			dom.brd.right.style.height = dom.content.offsetHeight + 'px';
			
			dom.icon.style.marginLeft = (dom.content.offsetWidth - dom.icon.offsetWidth) / 2 + 'px';
			dom.realname.style.marginLeft = (dom.content.offsetWidth - dom.realname.offsetWidth) / 2 + 'px';

			function onMouseClick(event){
				if(hidden){
					dom.box.style.display = 'block';
					dom.button.className	= 'Infobox_btnHide';
					dom.button.className	+= ' GUI_button';
					hidden = false;
				}
				else {
					dom.box.style.display = 'none';
					dom.button.className	= 'Infobox_btnShow';
					dom.button.className	+= ' GUI_button';
					hidden = true;
				}
			};
		};

		Starmap.prototype.GUI_ControlBox			= function(){

			var dom = {
				body:		document.createElement('div'),
				toggleBtn:	document.createElement('input'),
				select: {
					form: document.createElement('form'),
					labels: {
						shop:		document.createElement('label'),
						station:	document.createElement('label'),
						asteroid:	document.createElement('label'),
						planet:		document.createElement('label'),
						ship:		document.createElement('label'),
						turret:		document.createElement('label')
					},
					inputs: {
						shop:		document.createElement('input'),
						station:	document.createElement('input'),
						asteroid:	document.createElement('input'),
						planet:		document.createElement('input'),
						ship:		document.createElement('input'),
						turret:		document.createElement('input')
					}
				},
				search: {
					form: document.createElement('form'),
					labels: {
						system:	document.createElement('label'),
						sector:	document.createElement('label'),
						other:	document.createElement('label')
					},
					inputs: {
						system:	document.createElement('input'),
						sector:	document.createElement('input'),
						other:	document.createElement('input'),
						field:	document.createElement('input'),
						search:	document.createElement('input')
					}
				},
				back: {
					form: document.createElement('form'),
					inputs: {
						back:		document.createElement('input'),
						sysView:	document.createElement('input'),
					}
				}
			},
				hidden = false;

			dom.body.id = 'Starmap_controlBoxBody';
			dom.body.className = 'absolute';

			//Construct ControlBox toggle
			dom.toggleBtn.className	= 'ControlBox_toggleBtnHide';
			dom.toggleBtn.className	+= ' GUI_button';
			dom.toggleBtn.className	+= ' absolute';
			dom.toggleBtn.value		= dom.toggleBtn.name= " ";
			dom.toggleBtn.type		= 'submit';

			dom.body.appendChild(dom.toggleBtn);
			_mainWindow.dom.content.appendChild(dom.body);

			dom.body.style.top = (_mainWindow.dom.content.offsetHeight - dom.body.offsetHeight)/ 2 + 'px';

			_checkWindow = new Window({
				parent:	dom.body,
				name:	"Starmap_controlBox",
				size:	{
					width:	dom.body.offsetWidth - dom.toggleBtn.offsetWidth + 'px',
					height:	dom.body.offsetHeight + 'px'
				},
				pos:	{
					x: dom.toggleBtn.offsetWidth + 'px',
					y: '0px'
				}
			});

			window.addEventListener('resize', onResize);

			//Construct select box
			dom.select.form.id = 'Starmap_selectbox';

			for(var node in dom.select.labels){

				dom.select.labels[node].innerHTML	= _translate.control.select[node];
				dom.select.labels[node].htmlFor		= dom.select.inputs[node].name = dom.select.inputs[node].id = node;

				dom.select.labels[node].className	= 'SelectBox_' + node;
				dom.select.inputs[node].className	= 'SelectBox_CHK' + node;
				dom.select.inputs[node].className	+= ' GUI_checkbox';
				
				dom.select.inputs[node].type	= 'checkbox';
				dom.select.inputs[node].checked = true;

				if(!SHOW.ship && node == 'ship'){
					continue;
				}
				if(!SHOW.ship && node == 'turret'){
					continue;
				}
				if(!SHOW.asteroid && node == 'asteroid'){
					continue;
				}

				dom.select.form.appendChild(dom.select.inputs[node]);
				dom.select.form.appendChild(dom.select.labels[node]);
				dom.select.form.appendChild(document.createElement('br'));

				dom.select.inputs[node].addEventListener('click', onCheckClick, false);
			}

			dom.select.inputs.asteroid.checked = _show.asteroid = SHOW.asteroid;
			dom.select.inputs.ship.checked = dom.select.inputs.turret.checked = _show.ship = _show.turret = SHOW.ship;

			dom.toggleBtn.addEventListener('click',		onToggleClick);

			//Construct search box
			dom.search.form.id = 'Starmap_searchbox';

			dom.search.inputs.field.className	= 'SearchBox_searchField';
			dom.search.inputs.field.className	+= ' GUI_textField';
			dom.search.inputs.field.placeholder	= _translate.control.search.placeholder;
			dom.search.inputs.field.type		= 'text';

			dom.search.form.appendChild(dom.search.inputs.field);

			dom.search.inputs.field.addEventListener('keypress',	onSearchKeyPress,	false);
			dom.search.inputs.field.addEventListener('keyup',		onSearchKeyUp,		false);

			for(var node in dom.search.labels){
				dom.search.labels[node].innerHTML	= _translate.control.search[node];
				dom.search.labels[node].htmlFor		= dom.search.inputs[node].name = dom.search.inputs[node].id = node;

				dom.search.labels[node].className	= 'SearchBox_' + node;
				dom.search.inputs[node].className	= 'SearchBox_RAD' + node;
				dom.search.inputs[node].className	+= ' GUI_radio';

				dom.search.inputs[node].type		= 'radio';

				dom.search.form.appendChild(dom.search.inputs[node]);
				dom.search.form.appendChild(dom.search.labels[node]);
				dom.search.form.appendChild(document.createElement('br'));

				dom.search.inputs[node].addEventListener('click', onRadioClick, false);
			}

			dom.search.inputs.system.checked	= true;
			dom.search.inputs.sector.checked	= false;
			dom.search.inputs.other.checked		= false;

			dom.search.inputs.search.className		= 'SearchBox_searchBtn';
			dom.search.inputs.search.className		+= ' GUI_button';
			dom.search.inputs.search.name			= dom.search.inputs.search.value = _translate.control.search.button;
			dom.search.inputs.search.type			= 'submit';

			dom.search.form.appendChild(dom.search.inputs.search);

			dom.search.inputs.search.addEventListener('click', onSearchClick, false);

			//Construct back box
			dom.back.form.id = 'Starmap_back';

			for(var node in dom.back.inputs){
				dom.back.inputs[node].className		= 'BackBox_' + node;
				dom.back.inputs[node].className		+= ' GUI_button';
				dom.back.inputs[node].type			= 'submit';
				dom.back.inputs[node].name			= dom.back.inputs[node].value = _translate.control.back[node];

				dom.back.form.appendChild(dom.back.inputs[node]);
			}

			//Add event listener on button
			dom.back.inputs.back.addEventListener(		'click', onBackClick,		false);
			dom.back.inputs.sysView.addEventListener(	'click', onSysViewClick,	false);

			//Append DOM to html page
			_checkWindow.dom.content.appendChild(dom.select.form);
			_checkWindow.dom.content.appendChild(dom.search.form);
			_checkWindow.dom.content.appendChild(dom.back.form);

			function onResize(event){
				dom.body.style.top = (_mainWindow.dom.content.offsetHeight - dom.body.offsetHeight)/ 2 + 'px';
			};

			function onToggleClick(event){
				if(hidden){
					dom.toggleBtn.style.left = '0px';
					/*dom.toggleBtn.style.backgroundPosition = '0px -30px';*/

					dom.toggleBtn.className	= 'ControlBox_toggleBtnHide';
					dom.toggleBtn.className	+= ' GUI_button';
					dom.toggleBtn.className	+= ' absolute';

					_checkWindow.toggle();
					hidden = false;
				}
				else {
					dom.toggleBtn.style.left = dom.body.offsetWidth - dom.toggleBtn.offsetWidth + 'px';
					/*dom.toggleBtn.style.backgroundPosition = '0px -50px';*/

					dom.toggleBtn.className	= 'ControlBox_toggleBtnShow';
					dom.toggleBtn.className	+= ' GUI_button';
					dom.toggleBtn.className	+= ' absolute';

					_checkWindow.toggle();
					hidden = true;
				}
			};

			function onCheckClick(event){
				_show[this.name] = this.checked;
				_SELF.setupSysDict(_SELF.GL_UpdateCurrentView);
			};

			function onSearchClick(event){
				event.preventDefault();

				if(dom.search.inputs.system.checked){
					//Search for System
					if(!dom.search.inputs.field.value.match(/^[\-0-9]+\,[\-0-9]+\,[\-0-9]+/)){

						dial(_translate.control.coordFormat);

					}
					else {
						var coords = dom.search.inputs.field.value.split(','),
							coordStr;

						//Convert all number to int (this will remove useless 0 like 01)
						for(var i = 0; i < 3; i++){
							coords[i] = parseInt(coords[i]);
						}

						coordStr = coords.join('_');

						if(_systemDict[coordStr]){

							_previousSys = _currentSys;
							_currentSys = coords;
							_SELF.Sock_GetSysEntities();

						}
						else {
							dial(_translate.control.noSys);
						}
					}
					return;
				}
				else if(dom.search.inputs.sector.checked){
					//Search for Sector
					if(!dom.search.inputs.field.value.match(/^[\-0-9]+\,[\-0-9]+\,[\-0-9]+/)){

						dial(_translate.control.coordFormat);

					}
					else {
						var	secCoords	= dom.search.inputs.field.value.split(','),
							secCoordStr	= secCoords.join('_'),
							sysCoordStr	= Math.floor(secCoords[0] / _CHUNKSIZE) + '_' + Math.floor(secCoords[1] / _CHUNKSIZE) + '_' + Math.floor(secCoords[2] / _CHUNKSIZE);

						//Convert all number to int (this will remove useless 0 like 01)
						for(var i = 0; i < 3; i++){
							secCoords[i] = parseInt(secCoords[i]);
						}

						if(_systemDict[sysCoordStr][secCoordStr]){

							_previousSys = _currentSys;
							_previousSec = _currentSec;

							_currentSys = sysCoordStr.split('_');
							_currentSec = secCoords;
							_SELF.Sock_GetSecEntities();

						}
						else {
							dial(_translate.control.noSec);
						}
					}
					return;
				}
				else if(dom.search.inputs.other.checked){
					//Search for name or Entity name
					var search = dom.search.inputs.field.value;

					if(search == "Turret" || search == "Shop" || search == "Planet" || search == "Asteroid"){
						dial(_translate.control.noGeneric);
					}
					else {
						for(var sys in _systemDict){
							for(var sec in _systemDict[sys]){
								for(var ent in _systemDict[sys][sec]){

									if(ent == search || _systemDict[sys][sec][ent].realname == search){

										_previousSys = _currentSys;
										_previousSec = _currentSec;

										_currentSys = sys.split('_');
										_currentSec = sec.split('_');

										_SELF.Sock_GetSecEntities();

										return;
									}

								}
							}
						}
						dial("\"" + search + "\"" + _translate.control.notFound);
					}
					return;
				}

			};

			function onRadioClick(event){
				for(el in dom.search.inputs){
					if(dom.search.inputs[el].type != 'radio' || dom.search.inputs[el] == this){
						continue;
					}
					dom.search.inputs[el].checked = false;
				}

				this.checked = true;

				if(this.name == "Other"){
					dom.search.inputs.field.removeEventListener('keypress', onSearchKeyPress);
					dom.search.inputs.field.removeEventListener('keyup', onSearchKeyUp);
				}
				else {
					dom.search.inputs.field.addEventListener('keypress', onSearchKeyPress, false);
					dom.search.inputs.field.addEventListener('keyup', onSearchKeyUp, false);
				}
			};

			function onSearchKeyPress(event){
				var txt = String.fromCharCode(event.which || event.keyCode);

				switch(event.which || event.keyCode){
					case 0:
					break;

					case 8:
					break;

					case 13:
						fakeClick(event, dom.search.inputs.search);
					break;

					default:
						if (!txt.match(/[\-0-9\,\_\.\s.]/)){
							event.preventDefault();
						}
					break;
				}
			};

			function onSearchKeyUp(event){
				var txt = dom.search.inputs.field.value;

				txt = txt.replace(/[\_\s\.]/, ",");
				txt = txt.replace(/\,[\_\,\s\.$]/, ",");

				if(txt.match(/[0-9]\-$/)){
					txt = txt.replace(/\-$/, "");
				}
				
				if(txt.match(/^[\-0-9]+\,[\-0-9]+\,[\-0-9]+/)){
					match = txt.match(/^[\-0-9]+\,[\-0-9]+\,[\-0-9]+/);
					txt = match[0];
				}

				dom.search.inputs.field.value = txt;
			}

			function fakeClick(event, anchorObj){
				if(anchorObj.click){
					anchorObj.click();
				}
				else if(document.createEvent){

					if(event.target !== anchorObj){
						var evt = document.createEvent('MouseEvents'); 
						evt.initMouseEvent('click', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null); 
						var allowDefault = anchorObj.dispatchEvent(evt);
					}

				}
			};

			function onBackClick(event){
				event.preventDefault();

				switch(_previousView){
					case 0:
						_SELF.GL_RenderSystemView();
					break;

					case 1:
						_SELF.Sock_GetSysEntities();
					break;

					case 2:
						_SELF.Sock_GetSecEntities();
					break;

					default:
						dial("Unknown previous view!");
					break;
				}
			};

			function onSysViewClick(event){
				event.preventDefault();

				if(_currentView != 0){
					_SELF.GL_RenderSystemView();
				}
			};
		};

		Starmap.prototype.GUI_Loading			= function(){
			_loadWindow = new Window({
				parent: _mainWindow.dom.content,
				name: "Starmap_loading",
				size: {
					width: '220px',
					height: '110px'
				},
				pos: {
					x: (_mainWindow.dom.content.offsetWidth - 220)/2 + 'px',
					y: (_mainWindow.dom.content.offsetHeight - 110)/2 + 'px'
				}
			});
		};

		Starmap.prototype.GUI_UpdateLoading		= function(){
			_loadWindow.show();
			//Update content with current %
			_loadWindow.dom.content.innerHTML = (_loaded * 100 / _toLoad).toFixed(0) + "% Loaded...";

			//If load is complet
			if(_loaded >= _toLoad){
				_loadWindow.dom.content.removeChild(_loadWindow.dom.content.firstChild);
				_loadWindow.hide();
				_toLoad = 0;
				_loaded = 0;
			}
		};

		Starmap.prototype.GUI_Debug = function(){
			_debugWindow = new Window({
				parent: _mainWindow.dom.content,
				name: "Starmap_debug",
				fixed: true,
				size: {
					width:	'210px',
					height:	'100px'
				},
				pos: {
					x: - _mainWindow.dom.brd.left.offsetWidth + 'px',
					y: _mainWindow.dom.content.offsetHeight - (100 - _mainWindow.dom.brd.bottom.offsetHeight) + 'px'
				}
			});

			this.debugDom = {
				stats: new Stats(),
				labels:	{
					mouseX:		document.createElement('label'),
					mouseY:		document.createElement('label'),
					currView:	document.createElement('label'),
					prevView:	document.createElement('label'),
					currCoords:	document.createElement('label')
				}
			}

			this.debugDom.stats.domElement.className = 'Debug_stats';
			this.debugDom.stats.domElement.className += ' absolute';

			_debugWindow.dom.content.appendChild(this.debugDom.stats.domElement);

			for(var node in this.debugDom.labels){
				this.debugDom.labels[node].className = 'Debug_' + node;
				this.debugDom.labels[node].className += ' absolute';

				_debugWindow.dom.content.appendChild(this.debugDom.labels[node]);
			}

			this.updateDebug();
		};
		//End of GUI functions

		//Socket calls
		Starmap.prototype.Sock_GetFactions	= function(){

			//Request faction file
			_socket.callAPI('getFactions', 'vfs', 'fread', {
				path: JSON_PATH + 'FACTIONS.json'
			});

			_socket.on('API::getFactions', getFactions);

			function getFactions(err, data){
				_log.group("StarOS::Starmap::Sock_GetFactions()");

				if(err){
					_log.debug("Can not get factions file.");
					console.error(err);
				}
				else {

					_factionDict = JSON.parse(data);
					_log.debug("Factions:", _factionDict);

				}

				_log.debug("Done.");
				_log.end();
			}
		};

		Starmap.prototype.Sock_Getplayer		= function(){

			//Request user state file
			_socket.callAPI('getPlayer', 'vfs', 'fread', {
				path: JSON_PATH + 'Player/PLAYERSTATE_' + _session.user.name + '.json'
			});

			_socket.on('API::getPlayer', getPlayer);

			function getPlayer(err, data){
				_log.group("StarOS::Starmap::Sock_Getplayer()");

				if(err){
					_log.debug("Can not get player file.");
					console.error(err);
				}
				else {

					_user = JSON.parse(data);
					_log.debug("PLAYERSTATE_" + _session.user.name + ":", _user);

				}

				_log.debug("Done.");
				_log.end();

				var event = document.createEvent('Event');
				event.initEvent("Starmap::Sock_Getplayer", true, true);
				document.dispatchEvent(event);
			}
		};

		Starmap.prototype.Sock_GetEntityDict	= function(){

			//Request DATA-BASE file (is a summary of all entity)
			_socket.callAPI('getEntityDict', 'vfs', 'fread', {
				path: JSON_PATH + 'Entities/DATABASE.json'
			});

			_socket.on('API::getEntityDict', getEntityDict);

			function getEntityDict(err, data){
				_log.group("StarOS::Starmap::Sock_GetEntityDict()");

				if(err){
					_log.debug("Can not get database file.");
					console.error(err);
				}
				else {

					_entityDict = JSON.parse(data);
					_log.debug("Database:", _entityDict);

				}

				_log.debug("Done");
				_log.end();

				var event = document.createEvent('Event');
				event.initEvent("Starmap::Sock_GetEntityDict", true, true);
				document.dispatchEvent(event);
			}
		};

		Starmap.prototype.Sock_GetSysEntities	= function(){
			_log.group("StarOS::Starmap::Sock_GetSysEntities()");

			var	sys = _currentSys.join('_');

			_previousView = _currentView;
			_currentView = 1;

			//Calculate number of object to load
			for(var sec in _systemDict[sys]){
				for(var ent in _systemDict[sys][sec]){
					_toLoad++;
				}
			}

			_log.debug("Loading", _toLoad, "file(s).");
			_log.debug("System coordinate:", _currentSys[0], _currentSys[1], _currentSys[2]);
			_log.debug("System:", _systemDict[sys]);

			//Update load window content
			_SELF.GUI_UpdateLoading();
			//Clear the current scene
			_SELF.GL_ClearScene();
			//Render Sun of System
			_SELF.GL_RenderSun();

			for(var sec in _systemDict[sys]){
				for(var ent in _systemDict[sys][sec]){
					//Request each files in System
					_socket.callAPI('getEntity::' + ent, 'vfs', 'fread', {
						path: JSON_PATH + 'Entities/' + ent + '.json'
					});

					//Render each entity with callback function
					_socket.on('API::getEntity::' + ent, _SELF.GL_RenderEntity);
				}
			}

			_log.end();

		};

		Starmap.prototype.Sock_GetSecEntities	= function(){
			_log.group("StarOS::Starmap::Sock_GetSecEntities()");

			var	sys = _currentSys.join('_'),
				sec = _currentSec.join('_'),
				solar = [_currentSys[0] * _CHUNKSIZE + 8, _currentSys[1] * _CHUNKSIZE + 8, _currentSys[2] * _CHUNKSIZE + 8];

			//Update view type
			_previousView = _currentView;
			_currentView = 2;

			//Calculate objects to render
			for(var ent in _systemDict[sys][sec]){
				_toLoad++;
			}

			_log.debug("Loading", _toLoad, "file(s).");
			_log.debug("System coordinate:", _currentSys[0], _currentSys[1], _currentSys[2]);
			_log.debug("Sector coordinate:", _currentSec[0], _currentSec[1], _currentSec[2]);
			_log.debug("Sector:", _systemDict[sys][sec]);

			//Update load window content
			_SELF.GUI_UpdateLoading();
			//Clear the current scene
			_SELF.GL_ClearScene();

			//Check if is solar sector
			if(_currentSec[0] == solar[0] && _currentSec[1] == solar[1] && _currentSec[2] == solar[2]){
				_SELF.GL_RenderSun();
			}

			for(var ent in _systemDict[sys][sec]){
				//Request each files in System
				_socket.callAPI('getEntity::' + ent, 'vfs', 'fread', {
					path: JSON_PATH + 'Entities/' + ent + '.json'
				});

				//Render each entity with callback function
				_socket.on('API::getEntity::' + ent, _SELF.GL_RenderEntity);
			}

			_log.end();

		};

		Starmap.prototype.Sock_GetArrEntities	= function(arr){
			for(var i = 0; i < arr.length; i++){
				//Request each files in System
				_socket.callAPI('getEntity::' + arr[i], 'vfs', 'fread', {
					path: JSON_PATH + 'Entities/' + arr[i] + '.json'
				});

				//Render each entity with callback function
				_socket.on('API::getEntity::' + arr[i], _SELF.GL_RenderEntity);
			}
		}
		//End of Socket calls

		//GL functions
		Starmap.prototype.GL_InitSkyBox			= function(){

			var imgPrefix	= 'res/img/starmap/skybox/generic_',
				directions	= ['posx', 'negx', 'posy', 'negy', 'posz', 'negz'],
				imgExt		= '.png',
				geometry	= new THREE.CubeGeometry(VIEW.far, VIEW.far, VIEW.far),
				materialLst	= [],
				material, skybox, i;

			for(i = 0; i < 6; i++){
				materialLst.push(new THREE.MeshBasicMaterial({
					map: THREE.ImageUtils.loadTexture(imgPrefix + directions[i] + imgExt),
					side: THREE.BackSide
				}));
			}

			material	= new THREE.MeshFaceMaterial(materialLst);

			skyBox		= new THREE.Mesh(geometry, material);
			skyBox.name	= 'skyBox';

			_webGL.scene.add(skyBox);

		};

		Starmap.prototype.GL_RenderSystemView	= function(){
			var texture = loadedTexture.other;

			_previousView = _currentView;
			_currentView = 0;

			for(key in _systemDict){
				_toLoad++;
			}

			_SELF.GUI_UpdateLoading();
			_SELF.GL_ClearScene();

			for(key in _systemDict){
				var material, sprite, pos;
				
				pos = key.split('_');

				material = new THREE.SpriteMaterial({
					map: texture,
					useScreenCoordinates: false,
					color: 0xffffff
				});
				material.color.setHSL(0.5, 0.75, 0.5 );

				sprite = new THREE.Sprite(material);
				sprite.position = {
					x: pos[0] * 500,
					y: pos[1] * 500,
					z: pos[2] * 500
				};

				sprite.scale.set(200, 200, 1.0);
				sprite.StarOS_uid = 'Sys' + key;
				_systemSprite.push(sprite);
				_webGL.scene.add(sprite);

				//update load window content
				_loaded++;
				_SELF.GUI_UpdateLoading();
			}

		};

		Starmap.prototype.GL_RenderEntity		= function(err, data){
			if(err){
				console.error(err);

				//Update load window content
				_loaded++;
				_SELF.GUI_UpdateLoading();
			}
			else {
				var entity = new Entity(),
				sprite;

				entity.init(JSON.parse(data));
				sprite = entity.genSprite();
				_chunkEnt[entity.uniqueId] = entity;
				_webGL.scene.add(sprite);

				//Update load window content
				_loaded++;
				_SELF.GUI_UpdateLoading();
			}
		};

		Starmap.prototype.GL_RenderSun			= function(){
			var sunSphere, glowSphere, sunTexture, sunMaterial, glowMaterial, sun, glow;
			_toLoad++;
			
			sunSphere	= new THREE.SphereGeometry(250, 32, 32);
			sunTexture	= loadedTexture.sun;
			sunMaterial	= new THREE.MeshBasicMaterial({
				map: sunTexture
			});

			sun	= new THREE.Mesh(sunSphere, sunMaterial);
			sun.position.set(0, 0, 0);
			sun.StarOS_uid = 'Sun';

			_webGL.scene.add(sun);


			// create custom material from the shader code in index.html
			// that is within specially labeled script tags
			glowSphere	= new THREE.SphereGeometry(300, 32, 32);
			glowMaterial = new THREE.ShaderMaterial({
				uniforms:		{},
				vertexShader:	document.getElementById( 'vertexShader'   ).textContent,
				fragmentShader:	document.getElementById( 'fragmentShader' ).textContent,
				side:			THREE.BackSide,
				blending:		THREE.AdditiveBlending,
				transparent:	true
			});

			glow = new THREE.Mesh(glowSphere, glowMaterial);
			glow.position.set(0, 0, 0);
			glow.StarOS_uid = 'SunShad';

			_webGL.scene.add(glow);

			//Update load window content
			_loaded++;
			_SELF.GUI_UpdateLoading();
		};

		Starmap.prototype.GL_UpdateCurrentView	= function(){
			switch(_currentView){
				case 0:
					_SELF.GL_UpdateSystemSprites();
				break;
				case 1:
					_SELF.GL_UpdateChunkSprites();
				break;
				case 2:
					_SELF.GL_UpdateSecSprites();
				break;
				default:
					_SELF.GL_RenderSystemView();
				break;
			}
		};

		Starmap.prototype.GL_UpdateSystemSprites	= function(){

			//Check if _systemDict is empty
			if(this.isEmpty(_systemDict)){
				this.GL_ClearScene();
				return;
			}

			var alreadyExist	= [],
				toRemove		= [],
				toAdd			= [],
				texture = THREE.ImageUtils.loadTexture('res/img/starmap/icons/disc.png');

			//Merge current sprites with current _systemDict
			for(var child in _webGL.scene.children){

				//If children has StarOS_uid mean it's a Starmap sprite
				if(_webGL.scene.children[child].StarOS_uid != undefined){
					var key = _webGL.scene.children[child].StarOS_uid.replace('Sys', '');

					//If does not exist anymore, add to remove array and move to next child
					if(!_systemDict[key]){
						toRemove.push(_webGL.scene.children[child]);
						continue;
					}

					//If Already exist, push it to already exist array
					alreadyExist.push(key);

				}

			}

			//Remove old sprites
			for(var i = 0; i < toRemove.length; i++){
				_webGL.scene.remove(toRemove[i]);
			}

			for(var sys in _systemDict){
				var exist = false;

				for(var i = 0; i < alreadyExist.length; i++){
					if(alreadyExist[i] == sys){
						exist = true;
					}
				}

				if(!exist){
					toAdd.push(sys);
				}

			}

			for(var i = 0; i < toAdd.length; i++){
				var material, sprite, pos;

				pos = toAdd[i].split('_');

				material = new THREE.SpriteMaterial({
					map: texture,
					useScreenCoordinates: false,
					color: 0xffffff
				});
				material.color.setHSL(0.5, 0.75, 0.5 );

				sprite = new THREE.Sprite(material);
				sprite.position = {
					x: pos[0] * 500,
					y: pos[1] * 500,
					z: pos[2] * 500
				};

				sprite.scale.set(200, 200, 1.0);
				sprite.StarOS_uid = 'Sys' + toAdd[i];
				_systemSprite.push(sprite);
				_webGL.scene.add(sprite);
			}

		};

		Starmap.prototype.GL_UpdateChunkSprites	= function(){

			var alreadyExist	= [],
				toRemove		= [],
				toAdd			= [],
				sys				= _currentSys.join('_');

			
			if(this.isEmpty(_systemDict[sys])){
				for(var child in _webGL.scene.children){
					//If children has StarOS_uid and is not the sun add it to remove array
					if(_webGL.scene.children[child].StarOS_uid && _webGL.scene.children[child].StarOS_uid.indexOf('Sun') ==-1){
						toRemove.push(_webGL.scene.children[child]);
					}
				}

				//Remove each object in remove array
				for(var i = 0; i < toRemove.length; i++){
					_webGL.scene.remove(toRemove[i]);
				}

				return;
			}

			//Merge current sprites with current _systemDict
			for(var child in _webGL.scene.children){

				//If children has StarOS_uid mean it's a Starmap sprite
				if(_webGL.scene.children[child].StarOS_uid != undefined){
					var key = _webGL.scene.children[child].StarOS_uid,
						exist = false;

					//If children is sun go next children
					if(key.indexOf('Sun') != -1){
						continue;
					}

					for(var sec in _systemDict[sys]){
						//If exist in _systemDict, add to already exist array and move to next child
						if(_systemDict[sys][sec][key]){
							exist = true;
							alreadyExist.push(key);
							break;
						}

					}

					//If does not exist anymore, push it to remove array
					if(!exist){
						toRemove.push(_webGL.scene.children[child]);
					}

				}

			}

			//Check new sprites
			for(var sec in _systemDict[sys]){
				for(var ent in _systemDict[sys][sec]){

					var exist = false;

					for(var i = 0; i < alreadyExist.length; i++){
						if(alreadyExist[i] == ent){
							exist = true;
							break;
						}
					}

					if(exist){
						continue;
					}

					toAdd.push(ent);

				}
			}

			_toLoad = toAdd.length;

			//Remove old sprites
			for(var i = 0; i < toRemove.length; i++){
				_webGL.scene.remove(toRemove[i]);
			}

			//If new sprites, render them
			if(toAdd.length > 0){
				_SELF.Sock_GetArrEntities(toAdd);
			}

		};

		Starmap.prototype.GL_UpdateSecSprites	= function(){

			var alreadyExist	= [],
				toRemove		= [],
				toAdd			= [],
				sys				= _currentSys.join('_');
				sec				= _currentSec.join('_');

			
			if(this.isEmpty(_systemDict[sys][sec])){
				for(var child in _webGL.scene.children){
					//If children has StarOS_uid and is not the sun add it to remove array
					if(_webGL.scene.children[child].StarOS_uid && _webGL.scene.children[child].StarOS_uid.indexOf('Sun') ==-1){
						toRemove.push(_webGL.scene.children[child]);
					}
				}

				//Remove each object in remove array
				for(var i = 0; i < toRemove.length; i++){
					_webGL.scene.remove(toRemove[i]);
				}

				return;
			}

			//Merge current sprites with current _systemDict
			for(var child in _webGL.scene.children){

				//If children has StarOS_uid mean it's a Starmap sprite
				if(_webGL.scene.children[child].StarOS_uid != undefined){
					var key = _webGL.scene.children[child].StarOS_uid,
						exist = false;

					//If children is sun go next children
					if(key.indexOf('Sun') != -1){
						continue;
					}

					//If exist in _systemDict, add to already exist array and move to next child
					if(_systemDict[sys][sec][key]){
						exist = true;
						alreadyExist.push(key);
						break;
					}

					//If does not exist anymore, push it to remove array
					if(!exist){
						toRemove.push(_webGL.scene.children[child]);
					}

				}

			}


			//Check new sprites
			for(var ent in _systemDict[sys][sec]){

				var exist = false;

				for(var i = 0; i < alreadyExist.length; i++){
					if(alreadyExist[i] == ent){
						exist = true;
						break;
					}
				}

				if(exist){
					continue;
				}

				toAdd.push(ent);

			}

			//Remove old sprites
			for(var i = 0; i < toRemove.length; i++){
				_webGL.scene.remove(toRemove[i]);
			}

			//If new sprites, render them
			if(toAdd.length > 0){
				_toLoad = toAdd.length;
				_SELF.Sock_GetArrEntities(toAdd);
			}

		};

		Starmap.prototype.GL_ClearScene			= function(){

			var objects = [];
			for(var child in _webGL.scene.children){
				if(_webGL.scene.children[child].StarOS_uid){
					objects.push(_webGL.scene.children[child]);
				}
			}

			for(var i = 0; i < objects.length; i++){
				_webGL.scene.remove(objects[i]);
			}
		};
		//End of GL functions

		//Event functions
		Starmap.prototype.SetupEvent	= function(){
			_webGL.renderer.domElement.addEventListener('mousemove', _SELF.onMouseMove, false);
			_webGL.renderer.domElement.addEventListener('mousedown', _SELF.onMouseDown, false);

			/*$parent.addEventListener('click', function(){
				applyThemeCSS("neon2");
			});*/
			_mainWindow.dom.content.addEventListener('contextmenu', _SELF.onContextMenu, false);

			window.addEventListener('resize', _SELF.onResize, false);

		};

		Starmap.prototype.onMouseMove	= function(event){
			event.preventDefault();
			
			var renderer			= _webGL.renderer.domElement,
				rendererOffsetLeft	= _mainWindow.dom.brd.left.offsetWidth + _mainWindow.dom.brd.left.offsetLeft + _mainWindow.dom.body.offsetLeft,
				rendererOffsetTop	= _mainWindow.dom.brd.top.offsetHeight + _mainWindow.dom.brd.top.offsetTop + _mainWindow.dom.body.offsetTop,
				vector, ray, intersect, uid, camPos;

			_mouse.x = ((event.clientX - rendererOffsetLeft) / renderer.offsetWidth) * 2 - 1;
			_mouse.y = -((event.clientY - rendererOffsetTop) / renderer.offsetHeight) * 2 + 1;

			vector		= new THREE.Vector3(_mouse.x, _mouse.y, 0.5);
			camPos		= _webGL.camera.position;
			_webGL.projector.unprojectVector(vector, _webGL.camera);
			ray			= new THREE.Raycaster(camPos, vector.sub(camPos).normalize());
			intersect	= ray.intersectObjects(_webGL.scene.children);

			for(var i = 0; i < intersect.length; i++){
				if(intersect[i].object.StarOS_uid){
					uid = intersect[i].object.StarOS_uid;

					if(uid.indexOf('Sys') != -1){
						var coords;

						uid = uid.replace('Sys', '');
						coords = uid.split('_');

						_SELF.labelInfo.innerHTML = coords.join(", ");
						_SELF.labelInfo.style.left = (_mainWindow.dom.content.offsetWidth - _SELF.labelInfo.offsetWidth) / 2 + 'px';
					} 
					else if(uid.indexOf('Sun') != -1){
						_SELF.labelInfo.innerHTML = "Sun";
						_SELF.labelInfo.style.left = (_mainWindow.dom.content.offsetWidth - _SELF.labelInfo.offsetWidth) / 2 + 'px';
					}
					else {
						_SELF.labelInfo.innerHTML = _chunkEnt[uid].realname;
						_SELF.labelInfo.style.left = (_mainWindow.dom.content.offsetWidth - _SELF.labelInfo.offsetWidth) / 2 + 'px';
					}

					break;
				}
				else {
					_SELF.labelInfo.innerHTML = "";
				}
			}

		};

		Starmap.prototype.onMouseDown	= function(event){
			var vector, ray, intersect, uid, camPos;

			vector		= new THREE.Vector3(_mouse.x, _mouse.y, 0.5);
			camPos		= _webGL.camera.position;
			_webGL.projector.unprojectVector(vector, _webGL.camera);
			ray			= new THREE.Raycaster(camPos, vector.sub(camPos).normalize());
			intersect	= ray.intersectObjects(_webGL.scene.children);

			for(var i = 0; i < intersect.length; i++){
				if(intersect[i].object.StarOS_uid){
					uid = intersect[i].object.StarOS_uid;

					if(uid.indexOf('Sys') != -1){
						var coords;

						uid = uid.replace('Sys', '');
						coords = uid.split('_');

						_previousSys = _currentSys;
						_currentSys = coords;

						_SELF.Sock_GetSysEntities();
					} 
					else if(uid.indexOf('Sun') != -1){
					}
					else {
						_log.debug("Entity:", _chunkEnt[uid])
						_SELF.GUI_MapInfo(_chunkEnt[uid]);
					}

					break;
				}
			}

		};

		Starmap.prototype.onContextMenu		= function(event){
			event.preventDefault();

			var menu = document.createElement('div'),
				property = document.createElement('input');

			menu.id = 'contextmenu';
			menu.className = 'GUI_contextmenu';

			menu.style.position = 'absolute';
			menu.style.left = event.clientX - 15 + 'px';
			menu.style.top = event.clientY - 15 + 'px';

			property.className = 'property';
			property.className += ' GUI_menuButton';
			property.type = 'submit';
			property.value = property.name = "property";

			menu.appendChild(property);

			_mainWindow.dom.content.appendChild(menu);

			menu.addEventListener('mouseout', function(event){
				//this is the original element the event handler was assigned to
				var e = event.toElement || event.relatedTarget;

				//check for all children levels (checking from bottom up)
				while(e && e.parentNode && e.parentNode != window) {
					if(e.parentNode == this||  e == this){
						if(e.preventDefault) e.preventDefault();
						return false;
					}
					e = e.parentNode;
				}
				this.parentNode.removeChild(this);
			});

			property.addEventListener('click', function(event){
				event.preventDefault();
				var property = new PropertyWindow(_mainWindow.dom.content);
				
				document.addEventListener('PropertyWindow::needUpdate', _SELF.onResize);
			});
		};

		Starmap.prototype.onResize		= function(event){
			_mainWindow.size.width = (WIDTH)? WIDTH + 'px' : '99%';
			_mainWindow.size.height = (HEIGHT)? HEIGHT + 'px' : '98%';

			_mainWindow.update();
			_loadWindow.update();
			_checkWindow.update();
			_debugWindow.update();
			_webGL.renderer.setSize(_mainWindow.dom.content.offsetWidth, _mainWindow.dom.content.offsetHeight);
			_webGL.camera.aspect = _mainWindow.dom.content.offsetWidth / _mainWindow.dom.content.offsetHeight;
			_webGL.camera.updateProjectionMatrix();
			_webGL.render();
		};

		Starmap.prototype.updateDebug	= function(){
			requestAnimationFrame(Starmap.prototype.updateDebug.bind(this)); //--> requestAnimationFrame() is a window function

			this.debugDom.labels.mouseX.innerHTML = "x: " + _mouse.x.toFixed(5);
			this.debugDom.labels.mouseY.innerHTML = "y: " + _mouse.y.toFixed(5);
			this.debugDom.labels.currView.innerHTML = "View id: " + _currentView;
			this.debugDom.labels.prevView.innerHTML = "Previous view: " + _previousView;

			switch(_currentView){
				case 0:
					this.debugDom.labels.currCoords.innerHTML = "";
				break;

				case 1:
					this.debugDom.labels.currCoords.innerHTML = "System: " +_currentSys.join(", ");
				break;

				case 2:
					this.debugDom.labels.currCoords.innerHTML = "Sector: " +_currentSec.join(", ");
				break;
			}

			this.debugDom.stats.update();
		};
		//End of Event functions
	};


	//--------------------------------------------
	//	Entity Class
	//--------------------------------------------
	var Entity = function(){
		this.uniqueId		= "undef";
		this.type			= 0;
		this.typeLabel		= "undef";
		this.realname		= "undef";
		this.container		= false;

		this.dim			= {
			maxPos: {
				x: 0,
				y: 0,
				z: 0
			},
			minPos: {
				x: 0,
				y: 0,
				z: 0
			}
		};

		this.dock			= {
			dockedTo:		"NONE",
			dockedToPos:	{
				x: 0,
				y: 0,
				z: 0
			}
		};

		this.transformable	= {
			mass:		0,
			transformX:	{
				x: 0,
				y: 0,
				z: 0
			},
			transformY:	{
				x: 0,
				y: 0,
				z: 0
			},
			transformZ:	{
				x: 0,
				y: 0,
				z: 0
			},
			localPos:	{
				x: 0,
				y: 0,
				z: 0
			},
			sPos:		{
				x: 0,
				y: 0,
				z: 0
			},
			AI: false,
			fid: 0,
			own: ""
		};

		this.creatorId		= {
			creator:	"unknown",
			lastMod:	"",
			seed:		0,
			touched:	false,
			genId:		0
		};

		this.scale		= [120, 120, 1.0];
		this.planeScale	= this.scale;
		this.texture	= null;
	};

	Entity.prototype.init = function(data){
		this.uniqueId		= data.uniqueId;
		this.type			= data.type;
		this.realname		= data.realname;
		this.dim			= data.dim
		this.dock			= data.dock;

		this.transformable	= {
			mass:		data.transformable.mass,
			transformX:	data.transformable.transformX,
			transformY:	data.transformable.transformY,
			transformZ:	data.transformable.transformZ,
			localPos:	data.transformable.localPos,
			sPos:		data.transformable.sPos,
			AI:			data.transformable.AIConfig || false,
			fid:		data.transformable.fid,
			own:		data.transformable.own
		};

		if(data.container){
			this.container = {
				chest:		data.container.controllerStructure,
				computer:	data.container.shipMan0,
				power:		data.container.power,
				shield:		data.container.shield
			};
		}
		else if(data.inventory){
			this.container = {
				chest:		{
					"0": {
						inventory: data.inventory
					}
				},
				computer:	false,
				power:		0,
				shield:		0
			};
		}
		else {
			this.container = {
				chest:		false,
				computer:	false,
				power:		0,
				shield:		0
			};
		}

		this.creatorId = data.creatorId;
		
		if(this.type == 4){
			this.typeLabel = _translate.type[this.type][this.creatorId.genId];
		}
		else {
			this.typeLabel = _translate.type[this.type];
		}

		switch(this.type){
			case 1:
				this.texture	= loadedTexture.shop;
				this.planeScale[0]	= this.scale[0] / 2;
			break;

			case 2:
				this.texture		= loadedTexture.station;
			break;

			case 3:
				this.realname	= "Asteroid";
				this.texture	= loadedTexture.asteroid;
				this.scale[0]	= this.scale[0] / 2;
				this.scale[1]	= this.scale[1] / 2;
				this.planeScale	= this.scale;
			break;

			case 4:
				switch(this.creatorId.genId){
					case 0:
						this.texture	= loadedTexture.planet.red;
					break;

					case 1:
						this.texture	= loadedTexture.planet.terran;
					break;

					case 2:
						this.texture	= loadedTexture.planet.desert;
					break;

					case 3:
						this.texture	= loadedTexture.planet.alien;
					break;

					case 4:
						this.texture	= loadedTexture.planet.ice;
					break;

					default:
						this.texture	= loadedTexture.planet.unknown;
					break;
				}
			break;

			case 5:
				this.texture	= loadedTexture.ship;
			break;

			case 6:
				this.texture	= loadedTexture.turret;
				this.scale[0]	= this.scale[0] / 2;
				this.scale[1]	= this.scale[1] / 2;
			break;

			default:
				this.typeLabel	= this.realname;
				this.texture	= loadedTexture.unknown;
			break;
		}

	};

	Entity.prototype.genSprite = function(){
		var sprite, material,
			system		= [],
			spritePos	= {},
			sPos		= this.transformable.sPos,
			localPos	= this.transformable.localPos,
			currentSys	= [Math.floor(sPos.x / _CHUNKSIZE), Math.floor(sPos.y / _CHUNKSIZE), Math.floor(sPos.z / _CHUNKSIZE)];

		for(var i = 0; i < 3; i++){
			if(currentSys[i] >= 0){
				system[i] = currentSys[i] +1;
				continue;
			}
			system[i] = currentSys[i];
		}

		spritePos = {
			//sPos / system[0]		= sector pos in system
			//-> * _SECTORSIZE		= real sector pos in system
			//-> + _SECTORSIZE / 2	= center of sector in system
			//-> + localPos			= position of object in system
			x: (sPos.x / system[0] * _SECTORSIZE + _SECTORSIZE / 2 + localPos.x) /4.7,
			y: (sPos.y / system[1] * _SECTORSIZE + _SECTORSIZE / 2 + localPos.y) /4.7,
			z: (sPos.z / system[2] * _SECTORSIZE + _SECTORSIZE / 2 + localPos.z) /4.7
		}

		material	= new THREE.SpriteMaterial({
			map: this.texture,
			useScreenCoordinates: false
		});

		if(this.transformable.fid == -1){
			material.setValues({color: 0xff0000});
		}
		
		sprite = new THREE.Sprite(material);
		sprite.position = spritePos;
		sprite.StarOS_uid = this.uniqueId;
		sprite.scale.set(this.scale[0], this.scale[1], this.scale[2]);

		return sprite;
	};


	//--------------------------------------------
	// Socket Class
	//--------------------------------------------
	var Socket = function(host, port){
		var url		= host + ':' + port;

		this.host		= host;
		this.port		= port;
		this.connected	= false;

		DEBUG ? console.group("StarOS::Socket()") : null;
		DEBUG ? console.debug("Connecting to " + url + "...") : null;
		DEBUG ? console.groupEnd() : null;

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


	//--------------------------------------------
	// Window Class
	//--------------------------------------------
	var Window = (function(){
		var _id = 0;

		return function(args) {

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
			this.content		= null;
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
		this.dom.content.appendChild(p);
		this.dom.content.appendChild(submit);

		//Setup size
		this.size.width = '350px';
		this.size.height = p.offsetHeight + submit.offsetHeight + this.dom.brd.left.offsetWidth * 2 + 30 + 'px';

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
	var PropertyWindow = function(parent){
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
			applyThemeCSS(select.themeSelec.value);
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
				applyThemeCSS(THEME);
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

	PropertyWindow.prototype = Object.create(Window.prototype);


	//--------------------------------------------
	// WebGL Class
	//--------------------------------------------
	var WebGL = function(args){
		console.group("StarOS::WebGL()");

		args			= args			|| {};
		args.size		= args.size		|| {};
		args.view		= args.view 	|| {};
		args.cameraPos	= args.cameraPos|| {};

		//Merge parameters
		this.parent = args.parent || document.body;

		this.size			= {};
		this.size.width		= args.size.width	|| (this.parent != document.body)? this.parent.offsetWidth	: 1280;
		this.size.height	= args.size.height	|| (this.parent != document.body)? this.parent.offsetHeight : 720;

		this.view			= {};
		this.view.aspect	= args.view.aspect	|| this.size.width / this.size.height;
		this.view.fov		= args.view.fov		|| 45;
		this.view.near		= args.view.near	|| 0.1;
		this.view.far		= args.view.far		|| 4100000;

		this.cameraPos		= {};
		this.cameraPos.x	= args.cameraPos.x	|| 0;
		this.cameraPos.y	= args.cameraPos.y	|| 0;
		this.cameraPos.z	= args.cameraPos.z	|| 0;


		//Instantiate Three objects
		console.log("Instantiate Three.js objects...");
		this.keyboard	= new THREEx.KeyboardState();
		this.projector	= new THREE.Projector();
		this.scene		= new THREE.Scene();
		this.camera		= new THREE.PerspectiveCamera();

		try {

			this.renderer = new THREE.WebGLRenderer({
				antialias: true
			});
			console.log("WebGLRenderer loaded.");

		}
		catch(cErr){
			console.warn("Can not load WebGLRenderer, trying with CanvasRenderer.");
			try {
				this.renderer = new THREE.CanvasRenderer();
				console.log("CanvasRenderer loaded.");
			}
			catch(cErr){
				console.err("Can not load Renderer.");
				throw "Can not load Renderer";
			}

		}

		//Add camera to scene
		this.scene.add(this.camera);

		//Setup camera
		console.log("Update camera view....");
		this.camera.fov		= this.view.fov;
		this.camera.aspect	= this.view.aspect;
		this.camera.near	= this.view.near;
		this.camera.far		= this.view.far;
		this.camera.position.set(this.cameraPos.x, this.cameraPos.y, this.cameraPos.z);
		this.camera.updateProjectionMatrix();
		
		//Add class to renderer DOM
		this.renderer.domElement.className = 'renderer';
		//Set size of  renderer DOM
		this.renderer.setSize(this.size.width, this.size.height);
		//Append renderer to html page (parent DOM)
		this.parent.appendChild(this.renderer.domElement);

		//Add orbite controle
		console.log("Add orbite controle...");
		this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);

		this.animate(); //--> animate is a function that render and update WebGL each x sec
		console.log("Done.");
		console.groupEnd();
	};

	WebGL.prototype.animate = function(){
		requestAnimationFrame(WebGL.prototype.animate.bind(this)); //--> requestAnimationFrame() is a window function
		this.render();
		this.update();
	};

	WebGL.prototype.update = function(){
		this.controls.update();

		if (this.keyboard.pressed("space")){
			this.camera.position.set(this.cameraPos.x, this.cameraPos.y, this.cameraPos.z);
		}
	};

	WebGL.prototype.render = function(){
		this.renderer.render(this.scene, this.camera);
	};


	//--------------------------------------------
	// Debug Class
	//--------------------------------------------
	var DebugLog = function(){};

	DebugLog.prototype.group = function(grp){
		DEBUG ? console.group(grp) : null;
	};

	DebugLog.prototype.end = function(){
		DEBUG ? console.groupEnd() : null;
	};

	DebugLog.prototype.debug = function(){
		DEBUG ? console.debug.apply(window.console, arguments) : null;
	};


	//Abbreviate "new Dialog()" to "dial()"
	function dial(msg){
		new Dialog(msg, arguments);
	};

	function AJAX(){
		var xhr;

		//Try to instantiate XHR Object
		if (window.XMLHttpRequest) {
			xhr = new XMLHttpRequest();
		}
		else if (window.ActiveXObject) { // Internet Explorer

			try {
				xhr = new ActiveXObject('Msxml2.XMLHTTP');
			}
			catch(e){

				try {
					xhr = new ActiveXObject('Microsoft.XMLHTTP');
				}
				catch(e){
				}

			}

		}

		//If can't instantiate XHR Object
		if ( !xhr ) {
			console.error("Error: Your browser does not support XMLHttpRequest or ActiveXObject!");
			throw "Your browser does not support XMLHttpRequest or ActiveXObject!";
			return;
		}

		return xhr;
	};

	function getShBlocks(shield){
		power = 2/3;
		return Math.round(Math.pow(shield / 350 , 1 /power)) / 3.5;
	};

	function getShRate(blocks){
		return Math.floor(Math.pow(blocks * 5, 0.5) * 50);
	};

	function getLanguage(){
		var userLang = navigator.language || navigator.userLanguage,
			lang_xhr = AJAX();
		
		for(var i = 0; i < LANGUAGES.length; i++){
			if(userLang == LANGUAGES[i]){
				DEBUG ? console.debug("User language:", userLang) : null;
				default_lang = userLang;
			}
		}

		lang_xhr.open('GET', 'scripts/StarOS_json/Translates/' + default_lang + '.json', false);
		lang_xhr.send(null);

		if(lang_xhr.status == 200){
			_translate = JSON.parse(lang_xhr.responseText);
		}
		else {
			console.error("Error: Can't get translation file, make sure the file " + default_lang + ".json exist");
			throw "Error: Can't get translation file " + default_lang + ".json.";
		}
	};

	function getThemeCSS(name){
		if ( name === null ) {
		  return 'res/themes/default/style.css';
		}
		return 'res/themes/' + name + '/style.css';
	};

	function applyThemeCSS(name){
		// Theme
		var tlink = document.getElementById("StarOSTheme");
		console.log("theme:", name);
		tlink.setAttribute('href', getThemeCSS(name));
	};

	String.prototype.capitalize = function() {
		return this.charAt(0).toUpperCase() + this.slice(1);
	};


	StarOS.Starmap	= Starmap;
	StarOS.Entity	= Entity;
	StarOS.Socket	= Socket;
	StarOS.Window	= Window;
	StarOS.Dialog	= Dialog;
	StarOS.WebGL	= WebGL;

	StarOS.dial			= dial;
	StarOS.AJAX			= AJAX;
	StarOS.getShBlocks	= getShBlocks;
	StarOS.getShRate	= getShRate;

	window.StarOS = StarOS;
})();