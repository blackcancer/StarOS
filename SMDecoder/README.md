SMDecoder Class
==========

Description: Intergrate Starmade files within your own projects.  
License: [Creative Common](http://creativecommons.org/licenses/by/3.0/legalcode)  
Version: 0.6-rev00030  
SM-Version: dev build 0.175  
Date: 2014-01-03  
  
By Blackcancer  
website: http://initsysrev.net  
support: blackcancer@initsysrev.net  




### ==> CHANGELOG <==
0.6-rev00030:
-	Update to StarMade 0.175
-	Added support for .sment (not for docked parts)
-	Added support for .smskin
-	Improve formating code

0.6-rev00013:
-	Correction of formatMeta()
-	Correction of meta data decoder (docking byte)  

0.6-rev00011:
-	Add function formatLogic()  
-	Add function formatMeta()  
-	Correction of meta data decoder (multiple computers support)  

0.6-rev00008:
-	Correction for shop, planet, station and ship retro-compatibility  

0.6-rev00007:
-	Correction of shop retro-compatibility  

0.6-rev00006:
-	Update smd2 decoding for 0.1+ support  

0.6-rev00005:
-	Add personnal enemies support for FACTIONS.fac file  

0.6-rev00004:
-	Add retro-compatibility for StarMade < 0.1  

0.6-rev00003:
-	Add new tag chr(241) actual unknown  
-	Update for AIConfig  
-	Rework output format  
-	Correction of date ;)  

0.6:
-	Complete rework of class.  

### ==> SETUP <==

-	Include `SMDecoder.php` in your project.  
-	Call new SMDecoder() object.  
	
### ==> DOCUMENTATION <==

Public functions syntax:  
`decodeSMFile(string $file, bool $formated = false);`

return an array with decoded data. File format accepted are *.cat, *.fac, *.ent, *.smbph, *.smbpl, *.smbpm and *.smd2  
If formated = true then return special formated array (will be used in StarOS projects);  
  
use example:  
```php
	$ent = $SMD->decodeSMFile("/Dir/of/Your/File/FACTIONS.fac");
```
  
`checkServ(string $host, int $port);`  

return an array with server informations.  
Array index are:  
-online  
-timestamp  
-version  
-name  
-description  
-startTime  
-connected  
-maxPlayer  

use example:  
```php
	$ent = $SMD->checkServ("127.0.0.1", 4242);
```
  
Binary function converte String to int, float or double value  
`binToInt8(string $str);`  
return an int. String lenght must be 1  
  
`binToInt16(string $str);`  
return an int. String lenght must be 2  
  
`binToInt32(string $str);`  
return an int. String lenght must be 4  
  
`binToInt64(string $str);`
return an float. String lenght must be 8  
  
`binToIntFloat(string $str);`
return an float. String lenght must be 4  
  
`binToIntDouble(string $str);`
return an double. String lenght must be 8  
