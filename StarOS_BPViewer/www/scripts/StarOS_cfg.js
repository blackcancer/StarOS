/*
	Product: StarOS configuration file
	Description: This file is required by all StarOS scripts
	License: http://creativecommons.org/licenses/by/3.0/legalcode

	FileVersion: 0.1-rev00001					Date: 2014-04-07
	By Blackcancer

	website: http://initsysrev.net
	support: blackcancer@initsysrev.net
*/

(function(){
	window.StarOS = window.StarOS || {};

	//START OF CONFIG
	config = {
		//--------------------------------------------
		// Paths
		//--------------------------------------------
		path: {
			site:		'/var/www/',						// full path of your site
			lib:		'/var/www/scripts/lib/',			// full path of JavaScript libs
			starosLib:	'/var/www/scripts/StarOS_libs/',	// full path of StarOS libs
			json:		'/var/www/scripts/StarOS_json/',	// full path of StarOS json folder

			starmade:	'/srv/starmade/'					// full path of Starmade
		},


		//--------------------------------------------
		// Address
		//--------------------------------------------
		StarOS_serv: {
			host:		window.location.host,
			port:		4243
		},

		StarMade_serv: {
			host:		'initsysrev.net',
			port:		4242
		},

		//--------------------------------------------
		// Languages
		//--------------------------------------------
		langs: {
			"default":	'en',
			availible:	 ['fr', 'fr-fr', 'en', 'en-fr']
		},

		//--------------------------------------------
		// Theme
		//--------------------------------------------
		theme: {
			"default":	'default',
			fonts:		[
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
			]
		},

		//--------------------------------------------
		// Video
		//--------------------------------------------
		video: {
			texturePack: 'realistic',
			textureSize: '64',
			useNormal:	false,
			antialias:	false,
			skybox: 'galaxy'
		}
	};
	//END OF CONFIG

	StarOS.config = StarOS.config || config;
})();