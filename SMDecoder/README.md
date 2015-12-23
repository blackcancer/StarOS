SMDecoder Class
==========

Description: Intergrate Starmade files within your own projects.  
License: [Creative Common](http://creativecommons.org/licenses/by/3.0/legalcode)  
Version: 0.7  
SM-Version: dev build 0.19+ 
Date: 2014-01-03  
  
By Blackcancer  
website: http://initsysrev.net  
support: blackcancer@initsysrev.net  
credit:  
-	http://phpjs.org  
-	Megacrafter127  
-	der_scheme  
-	tambry  
-	thecko




### ==> CHANGELOG <==
0.6:  
-	Full rewrite of SMDecoder  
-	Move binary decoder inside std.php  
-	Move stream read functions inside std.php  
-	Update decoder for dev build 0.19+  
-	Need fix for *.smbpm format  
-	Need fix for format functions

### ==> SETUP <==

-	Include `SMDecoder.php` in your project.  
-	Call new SMDecoder() object.  
-	To use binary functions include `std.php` and call it with new Binary().  

### ==> DOCUMENTATION <==

Public functions syntax:  
`decodeSMFile(string $file, bool $formated = false);`

return an array with decoded data. File format accepted are *.cat, *.fac, *.ent, *.smbph, *.smbpl, *.smbpm and *.smd2  
If formated = true then return special formated array (will be used in StarOS projects);  
  
use example:  
```php
	$ent = $SMD->decodeSMFile("/Dir/of/Your/File/FACTIONS.fac");
```
return an array of decoded starmade file
  
  
Binary functions converte String to int, float or double value  
```php
	$bin = new Binary();
```
  
`$bin->int(string $binary, bool $isUint = false);`  
if isUint is false return int else return unsigned int.  
String lenght must be between 8 and 64  
  
`bin->float(string $binary);`  
return a float. String lenght must be 32  
  
`bin->double(string $binary);`
return a double. String lenght must be 64  
  
`bin->bytesToBin(string $bytes);`
return a binary string.  
