<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN"
"http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
	<head>

		<title>StarMade Login</title>
        
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <meta http-equiv="Content-Language" content="fr"/>
        <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
        <meta name="Description" content="" />
        <meta name="Keywords" content="" />
     
		<?php
			session_start();
			include_once 'include/functions.php';
			
			if(isset($_POST['submit'])){
				if(isset($_POST['login']) && isset($_POST['password'])){
					
					$params = array('username' => urlencode($_POST['login']),
									'password' =>  urlencode($_POST['password']));
					starmadeLogin($params);
					var_dump($_SESSION);
					
				}
			}
		?>
	</head>

    <body>
    	<div>
        	<h3 id="title">Starmade login system</h3>
        </div>
        <div>
            <form id="cmd" method="post" action="<?php echo $_SERVER['PHP_SELF']?>"> 
                <input type="text" name="login" id="login" placeholder="login"/>
                <input type="password" name="password" id="password" placeholder=""/>
                <input type="submit" name="submit" value="Login"/><br/>
            </form>
    		<p>This login let players login to your site with there starmade login. You can use $_SESSION data to get badges of players, his timezone, if it's an upgraded user...<br/>Use this information without malice</p>
        </div>
    </body>
</html>