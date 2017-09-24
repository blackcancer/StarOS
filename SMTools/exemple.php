<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN"
"http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
	<head>
		<title>StarMade Decoder</title>

		<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
		<meta http-equiv="Content-Language" content="fr"/>
		<meta http-equiv="X-UA-Compatible" content="IE=edge"/>
		<meta name="Description" content="" />
		<meta name="Keywords" content="" />
	</head>

	<body>
		<?php
			include_once 'include/SMDecoder.php';	// to use SMDecoder class
			include_once 'include/SMUtils.php';		// to use SMUtiles class & SMLogin class

			//OPTION TO EXECUTE EXEMPLE
			$options = array(
				'SMDecoder'		=> true,
				'SMUtils'		=> false,
				'SMLogin'		=> false,
				'useAppLogin'	=> false,
				'user'			=> '',
				'passwd'		=> ''
			);

			//--------------------------------------------
			// Exemple for SMDecoder
			//--------------------------------------------

			if($options['SMDecoder']){
				//declare SMDecoder
				$SMD = new SMDecoder();

				//decode SM file (you can test with file in "./test files")
				$ent = $SMD->decodeSMFile('test files/ENTITY_FLOATINGROCK_1449804139109_1_3_5_0.ent');

				//Print decoded file
				var_dump($ent);
			}

			//--------------------------------------------
			// Exemple for SMUtils
			//--------------------------------------------

			if($options['SMUtils']){
				//declare SMUtils
				$SMU = new SMUtils('/files');

				//get "./test files/server.cfg" file
				$file = $SMU->getServerCfg();

				//look over $file array
				for($i = 0; $i < count($file); $i++){
					//change for parameter WORLD
					if($file[$i]["param"] == "WORLD"){
						$file[$i]["value"]	= "New world name";
						$file[$i]["com"]	= "currently loaded world";
					}

					//change for parameter CHEST_LOOT_COUNT_MULTIPLIER
					if($file[$i]["param"] == "CHEST_LOOT_COUNT_MULTIPLIER"){
						$file[$i]["value"] = 0.5;
					}
				}

				//save changes in "./test files/server.cfg"
				$SMU->setServerCfg($file);

				//check for server status
				$data = $SMU->checkServ("initsysrev.net", 4242);

				//Print server status
				var_dump($data);
			}

			//--------------------------------------------
			// Exemple for SMLogin
			//--------------------------------------------

			if($options['SMLogin']){
				//declare SMLogin
				$SML = new SMLogin();
				$logged = false;

				//if $options['useAppLogin'] is set to true use login trought starmade registry
				if($options['useAppLogin']){
					//check if url contain authantification code
					if(!isset($_GET['code'])){
						$SML->appLogin();
					}
					else {
						$logged = $SML->getAuthToken($_GET['code']);
					}
				}
				else {
					//request login with user name and password
					$logged = $SML->publicLogin($options['user'], $options['passwd']);
				}

				//check if there's no error
				if(!$logged){
					echo "Can't log user";
				}
				else {
					//request user data
					$user = $SML->requestSelf();

					//print data
					echo "<div>";
					echo "[USER DATA] </br>";
					echo "id:&emsp;&emsp;&emsp;&nbsp;&nbsp;" .	$user['user']['id'] . " </br>";
					echo "email:&emsp;&emsp;" .					$user['user']['email'] . " </br>";
					echo "user name:&nbsp;" .					$user['user']['username'] . " </br>";
					echo "skin url:&emsp;&nbsp;" .				$user['user']['skin_url'] . " </br>";
					echo "upgraded:&nbsp;&nbsp;" .				$user['user']['upgraded'] . " </br>";
					echo "steam link:</br>";
					echo "&emsp; user id:&emsp;&nbsp;&nbsp;" .	$user['user']['steam_link']['user_id'] . " </br>";
					echo "&emsp; steam id:&nbsp;&nbsp;&nbsp;" .	$user['user']['steam_link']['steam_id'] . " </br>";
					echo "&emsp; created at:&nbsp;" .			$user['user']['steam_link']['created_at'] . " </br>";
					echo "created at:&nbsp;&nbsp;&nbsp;" .		$user['user']['created_at'] . " </br>";

					echo "</br>";
					echo "access token:&emsp;" .				$SML->getAccessToken() . "</br>";
					echo "Token type:&emsp;&nbsp;&nbsp;" .		$SML->getTokenType() . "</br>";
					echo "Token Expire:&nbsp;&nbsp;&nbsp;" .	$SML->getExpires() . "</br>";
					echo "Token Refresh:&nbsp;" .				$SML->getRefreshToken() . "</br>";
					echo "Token scope:&emsp;" .					$SML->getscope() . "</br>";
					echo "Token auth:&emsp;" .					implode("; ", $SML->requestAuthToken()) . "</br>";
					var_dump($SML->requestAuthToken());
					echo "</div>";

					file_put_contents('json/blueprints.json', json_encode($bp, JSON_FORCE_OBJECT));
				}
			}
		?>
	</body>
</html>