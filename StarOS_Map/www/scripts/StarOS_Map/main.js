/*
	Product: StarOS Map
	Description: This script generate a 3D Starmap for starmade
	License: http://creativecommons.org/licenses/by/3.0/legalcode

	FileVersion: 5.0-rev00101					Date: 2013-12-28
	By Blackcancer

	website: http://initsysrev.net
	support: blackcancer@initsysrev.net
*/

var settings = {
	debug		: true,
	use_login	: true,
	json_path	: '/var/www/scripts/StarOS_json/',
	site_path	: '/var/www/',
	width		: 1280,
	height		: 720,
	languages	: ['fr', 'fr-FR', 'en', 'en-US'],
	default_lang: 'en',
	theme		: 'default',


	show		:{
		ship		: true,
		asteroid	: true,
	},

	ent_info	: {
		faction:	true,
		mass:		true,
		power:		true,
		shield:		true
	},

	view		: {
		aspect	: 16/9,
		fov		: 45,
		near	: 0.1,
		far		: 4100000
	},

	StarOS_serv	:{
		host : window.location.host,
		port : 8000
	}
};

try {
	var starmap = new StarOS.Starmap(settings);
}
catch(cErr){

	console.error(cErr.stack);

	//Crash report to blackcancer@initsysrev
	var action	= prompt("StarOS Map crash report.\n\n\tWhat are you doing on the starmap when the crash occurred?"),
		link	= 'mailto:blackcancer@initsysrev'
				+ '?subject=' + encodeURIComponent("StarOS Map crash report")
				+ '&body=' + encodeURIComponent(action + "\n" + cErr.stack);

	if(action != null){
		window.location = link;
	}

}