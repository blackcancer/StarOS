StarMade_Login
==========

Description: Intergrate Starmade login within your own projects.  
License: [Creative Common](http://creativecommons.org/licenses/by/3.0/legalcode)  
Version: 0.1  
Date: 2014-01-03

By Blackcancer  
support: blackcancer@initsysrev.net



### ==> CHANGELOG <==

0.1:
-	Create functions to login as starmade user.

### ==> SETUP <==

-	Include `functions.php` to your login page.
-	Be sure to have `session_start()` on your page.
	
### ==> DOCUMENTATION <==

function syntax:
`starmadeLogin(array $params);`

use example:
```php
$params = array(
	'username' => $userName,
	'password' => $userPass
);

starmadeLogin($params);
```
The function return empty array if bad login else an array of $data is stored in $_SESSION.
You can find an exemple of content of this array in login.json