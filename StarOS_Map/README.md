StarOS_Map
==========

Description: A starmap for StarMade, this project is subproject of StarOS.  
License: [Creative Common](http://creativecommons.org/licenses/by/3.0/legalcode)  
Version: 0.5-rev00001
Date: 2014-01-6

By Blackcancer  
website: http://initsysrev.net
support: blackcancer@initsysrev.net



### ==> Requierement <==
-	Apache
-	PHP 5+

### ==> CHANGELOG <==
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

-	if you already have StarOS Map before v0.5 you need to remove it
-	copy all file in your site.
-	In shell, type: `php setup.php DIRECTORY/OF/YOUR/GAME`.
-	Update your map with command `php setup.php DIRECTORY/OF/YOUR/GAME`


	
### ==> DOCUMENTATION <==

StarOS_Map can have different arguments:  

```javascript
parentId: (string),
showShip: (bool),		//default false
showAsteroid: (bool),	//default false
showEntInf:{
	faction: (bool),	//default false, show faction in Informations:
	mass: (bool),		//default false, show mass in Informations:
	power: (bool),		//default false, show power in Informations:
	shield: (bool)		//default false, show shield in Informations:
},
useLogin: (bool),		//default false, use StarOS Login
debug: (bool),			//default false
FsKey: (string),		//default "f"
view:{
	aspect: (int),  	//default width / height
	angle: (int),		//default 45
	near: (int),		//default 0.1
	far: (int)			//default 4100000
}
```

each arguments are optional except parentId.  
"showShip" set true to show ship in starmap.  
"showAsteroid" set true to show asteroids in starmap.  
"debug" set true to show debug information like fps.  
"FsKey" is the default key used for switch to fullscreen, only char and number are allowed.  
"view" this options are relative to three.js camera, use only if you now what you are doing.  
you can use "space" to reset camera.  
