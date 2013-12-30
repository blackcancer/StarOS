StarOS_Map
==========

Description: A starmap for StarMade, this project is subproject of StarOS.  
License: [Creative Common](http://creativecommons.org/licenses/by/3.0/legalcode)  
Version: 0.4  
Date: 2014-12-30

By Blackcancer  
support: blackcancer@initsysrev.net



### ==> CHANGELOG <==

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

-	copy all file in your site without index.html.
-	Add all javascript in index.html header to your page.
-	In the balise `<body>` , add this:

```html
<div id="ID_OF_THE_STARMAP_DIV"></div>
<script type="text/javascript">
<!--
	$(document).ready(function(){
		starmap = new StarOS_Map({
			parentId: 'ID_OF_THE_STARMAP_DIV',
		});
	});
-->
</script>
```
-	In shell, type: `php setup.php DIRECTORY/OF/YOUR/GAME`.
-	Update your map with command `php setup.php DIRECTORY/OF/YOUR/GAME [optional args entities | players | factions]`  
	Use optional args for a specific update


	
### ==> DOCUMENTATION <==

StarOS_Map can have different arguments:  

```javascript
parentId: (string),
width: (int),			//default 800
height: (int),			//default 600
spawn:{
	x: (int),			//default 2
	y: (int),			//default 2
	z: (int)			//default 2
},
showShip: (bool),		//default false
showAsteroid: (bool),	//default false
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
"width and height" define the size used by canvas.  
"spawn" is the default point where camera looking.  
"showShip" set true to show ship in starmap.  
"showAsteroid" set true to show asteroids in starmap.  
"debug" set true to show debug information like fps.
"FsKey" is the default key used for switch to fullscreen, only char and number are allowed.  
"view" this options are relative to three.js camera, use only if you now what you are doing.  
you can use "space" to reset camera.  
