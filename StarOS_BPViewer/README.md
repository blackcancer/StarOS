StarOS_Map
==========

Description: A 3D Blueprint viewer for StarMade.  
License: [Creative Common](http://creativecommons.org/licenses/by/3.0/legalcode)  
Version: 0.1-rev00001  
Date: 2014-04-35  
  
By Blackcancer  
website: http://initsysrev.net  
support: blackcancer@initsysrev.net  



### ==> Requierement <==
-	Apache
-	PHP 5+
-	node.js

### ==> CHANGELOG <==
0.1-rev00001:
-	View of blueprint, his info and catalog data  
-	Controller viewer  
-	Exporting render as PNG  
-	Download link  
-	Embed option  
-	Property window  
-	StarMade bloc for JavaScript  



### ==> SETUP <==
-	[wiki](https://github.com/blackcancer/StarOS/wiki/2.2-Install)



### ==> USAGE <==
-	Maintain left clique allows you to rotate the map.  
-	Maintain right clique allows you to move laterally the map.  
-	Mouse wheel lets you zoom-in/zoom-out.  
-	Maintain mouse wheel lets you zoom-in/zoom-out more quickly.  
-	Space bar reset the camera position.  
-	Right click pop button to show property window, you can change theme, font, texturepack, skybox (for embed version), enable/disable normal map and anti-aliasing.
-	Click on controller in weapons menu will show controller view, use Escape to get ship view back
-	"P" key Export render as PNG



### ==> DOCUMENTATION <==
call BPViewer:
```javascript
var bpViewer = new StarOS.BPViewer(settings);
```

BPViewer can have different arguments:  

```javascript
var settings = {
	debug: (bool),			//default false
	parentId: (string),		//default use body else, use specified element (by id)
	view:{
		aspect: (int),  	//default width / height
		angle: (int),		//default 45
		near: (int),		//default 0.1
		far: (int)			//default 4100000
	}
};
```

each arguments are optional.  
"view" this options are relative to three.js camera, use only if you now what you are doing.  
