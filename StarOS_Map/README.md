StarOS_Map
==========

Description: A starmap for StarMade, this project is subproject of StarOS.  
License: [Creative Common](http://creativecommons.org/licenses/by/3.0/legalcode)  
Version: 0.5-rev00101  
Date: 2014-01-6  

By Blackcancer  
website: http://initsysrev.net  
support: blackcancer@initsysrev.net  



### ==> Requierement <==
-	A web server with PHP 5.4+ ([Ubuntu - LAMP](https://help.ubuntu.com/community/ApacheMySQLPHP) || [Windows - Wamp](http://www.wampserver.com/en/))  
-	Node.js v0.10.25 ([Ubuntu - Node.js](http://askubuntu.com/questions/49390/how-do-i-install-the-latest-version-of-node-js) || [Windows - Node.js](http://nodejs.org/download/))  
-	For Windows user, php need to be in environment variables. ([Add PHP](http://www.php.net/manual/en/install.windows.commandline.php))  

### ==> CHANGELOG <==
5.0-rev00101:
-	Update StarOS Map to work with StarMade v0.1+ (old versoin still works)
-	Add control box  
-	Add entity type 'Turret'  
-	Add property windows with theme and font selection  
-	Add translation files  
-	Add node.js server for better loading of StarOS's json files  
-	Reworked debug  
-	Reworked informations for more style customization  
-	Reworked loading window  
-	New JavaScript Class for developpement (need more optimization and functions)  
-	Removing fullscreen key (this event start when you use login field, it's realy annoying)  

5.0-rev00011:
-	Change entity files generation (improve map loading)
-	Add Solar systems view
-	Add system selection from objects in Solar systems view
-	Add star to system content view
-	Add loading box
-	Add Message box for empty system (only empty if system is populated with everything that's not part of your factions)
-	Update StarOS_Map to be compatible with SMDecoder v0.6
-	Change entity informations (show or hide certain informations) 
-	Remove old system selector
-	Correct camera position on "space" press

5.0-rev00001:
-	Add worker for loading and parsing entities.json (better FPS, less firefox crash)
-	Add option StarOS Login (comes with new entites filter)
-	Add option fallback for old loading
-	Add options for mapInfo
-	Add debug informations
-	Add new decode function to SMDecoder
-	Correct camera lookAt
-	Rewrite of all files

0.4:
-	Add option debug to show or not fps
-	Improve texture loading with Gravypod's help
-	Improve setup with Gravypod's help

0.3:
-	Change generation system to generate only Solar system (chunk 16x16x16).
-	Add system selector box to change solar system.

0.2:
-	Migrate SQL database to json file.
-	Improve 3D objects.
-	Add option to show Asteroids.

0.1:
-	Get information relative to an entity when you click on it.
-	Show starmade entity in 3D space.
-	Generate SQL database from starmade file.
  
  
### ==> SETUP <==

-	[Wiki EN - Install](https://github.com/blackcancer/StarOS/wiki/1.2-Install)  
-	[Wiki FR - Installation](https://github.com/blackcancer/StarOS/wiki/1.2-Installation)  
  
  
### ==> Configure <==

-	[Wiki EN - Configure](https://github.com/blackcancer/StarOS/wiki/1.3-Configure)  
-	[Wiki FR - Configuration](https://github.com/blackcancer/StarOS/wiki/1.3-Configuration)  
  
  
### ==> Usage <==

-	[Wiki EN - Use](https://github.com/blackcancer/StarOS/wiki/1.4-Use)  
-	[Wiki FR - Utilisation](https://github.com/blackcancer/StarOS/wiki/1.4-Utilisation)
