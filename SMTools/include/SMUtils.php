<?php
	/*
		Product: SMUtils Class & SMLogin Class
		Description: Intergrate Starmade files in your own projects.
		License: http://creativecommons.org/licenses/by/3.0/legalcode

		FileVersion: 0.1-rev00001					Date: 2015-12-23
		By Blackcancer

		website: http://initsysrev.net
		support: blackcancer@initsysrev.net
		credit: - deceze
	*/

	header('Content-Type: text/html; charset=UTF-8');

	include_once 'std.php';


	//--------------------------------------------
	// SMUtils Class
	//--------------------------------------------
	class SMUtils {
		private $smFolder;

		/*
		 * __construct($folder)
		 *
		 * @param string $folder folder used for configuration files
		 */
		public function __construct($folder){
			$this->smFolder = $folder;
		}

		/*
		 * getServerCfg()
		 *
		 * @return an array[X](			X is for number of entries
		 *		"param",				string					parameter name
		 *		"value",				string/int/float/bool	parameter value
		 *		"com"					string					parameter comment
		 *	)
		 */
		public function getServerCfg(){
			try {
				$file	= file_get_contents(joinPaths($this->smFolder, 'server.cfg'));

				return $this->StringToCfg($file);
			}
			catch(Exception $e){
				throw new Exception('Error loading \''. $e->getFile() .'\' at line '. $e->getLine() .': '. $e->getMessage());
			}

			return false;
		}

		/*
		 * setServerCfg($data)
		 *
		 * @param array $data server configuration
		 * @return 0
		 * @return -1 on error
		 */
		public function setServerCfg($data){
			try {
				$str = $this->CfgToString($data);
				file_put_contents(joinPaths($this->smFolder, 'server.cfg'), $str);

				return 0;
			}
			catch(Exception $e){
				throw new Exception('Error loading \''. $e->getFile() .'\' at line '. $e->getLine() .': '. $e->getMessage());
			}

			return -1;
		}

		/*
		 * getServerMsg()
		 *
		 * @return a string of server-message.txt
		 */
		public function getServerMsg(){
			try {
				return file_get_contents(joinPaths($this->smFolder, 'server-message.txt'));
			}
			catch(Exception $e){
				throw new Exception('Error loading \''. $e->getFile() .'\' at line '. $e->getLine() .': '. $e->getMessage());
			}

			return false;
		}

		/*
		 * setServerMsg($data)
		 *
		 * @param string $data server message
		 * @return 0
		 * @return -1 on error
		 */
		public function setServerMsg($data){
			try {
				file_put_contents(joinPaths($this->smFolder, 'server-message.txt'), $data);

				return 0;
			}
			catch(Exception $e){
				throw new Exception('Error loading \''. $e->getFile() .'\' at line '. $e->getLine() .': '. $e->getMessage());
			}

			return -1;
		}

		/*
		 * getGameConfigXML()
		 *
		 * not yet implemented
		 */
		public function getGameConfigXML(){}

		/*
		 * setGameConfigXML($data)
		 *
		 * not yet implemented
		 */
		public function setGameConfigXML($data){}

		/*
		 * getProtected()
		 *
		 * @return an array[X](			X is for number of entries
		 *		"name",					string	protected name
		 *		"account",				string	starmade account
		 *		"time"					long	protection time
		 *	)
		 */
		public function getProtected(){
			try {
				$file	= file_get_contents(joinPaths($this->smFolder, 'protected.txt'));
				$lines	= explode("\n", $file);
				$cfg	= array();

				for($i = 0; $i < count($lines) - 1; $i++){
					$arr = explode(';', $lines[$i]);
					$cfg[$i] = array(
						'name'		=> $arr[0],
						'account'	=> $arr[1],
						'time'		=> $arr[2]
					);
				}

				return $cfg;
			}
			catch(Exception $e){
				throw new Exception('Error loading \''. $e->getFile() .'\' at line '. $e->getLine() .': '. $e->getMessage());
			}

			return false;
		}

		/*
		 * setProtected($data)
		 *
		 * @param array $data protected account
		 * @return 0
		 * @return -1 on error
		 */
		public function setProtected($data){
			try {
				$str = "";

				for($i = 0; $i < count($data); $i++){
					$str .= join(';', $data[$i]) . "\n";
				}

				file_put_contents(joinPaths($this->smFolder, 'protected.txt'), $str);

				return 0;
			}
			catch(Exception $e){
				throw new Exception('Error loading \''. $e->getFile() .'\' at line '. $e->getLine() .': '. $e->getMessage());
			}

			return -1;
		}

		/*
		 * getAdmins()
		 *
		 * @return an array of admins in admin.txt
		 */
		public function getAdmins(){
			try {
				$file	= file_get_contents(joinPaths($this->smFolder, 'admins.txt'));
				$data	= explode("\n", $file);

				return array_slice($data, 0, count($data) - 1);
			}
			catch(Exception $e){
				throw new Exception('Error loading \''. $e->getFile() .'\' at line '. $e->getLine() .': '. $e->getMessage());
			}

			return false;
		}

		/*
		 * setAdmins($data)
		 *
		 * @param array $data admins
		 * @return 0
		 * @return -1 on error
		 */
		public function setAdmins($data){
			try {
				$str = "";
				
				for($i = 0; $i < count($data); $i++){
					$str .= $data[$i] . "\n";
				}

				file_put_contents(joinPaths($this->smFolder, 'admins.txt'), $str);

				return 0;
			}
			catch(Exception $e){
				throw new Exception('Error loading \''. $e->getFile() .'\' at line '. $e->getLine() .': '. $e->getMessage());
			}

			return -1;
		}

		/*
		 * getBlacklist()
		 *
		 * @return an array[X](			X is for number of entries
		 *		"type",					string	can be ipt for ip, act for account
		 *		"time",					long	-1 is for perma ban or timesamp for temporaty ban
		 *		"name"					string	can be ip or account
		 *	)
		 */
		public function getBlacklist(){
			try {
				$file	= file_get_contents(joinPaths($this->smFolder, 'blacklist.txt'));
				$lines	= explode("\n", $file);
				$cfg	= array();

				for($i = 0; $i < count($lines) - 1; $i++){
					$arr = explode(':', $lines[$i]);
					$cfg[$i] = array(
						'type'	=> $arr[0],
						'time'	=> $arr[1],
						'name'	=> $arr[2]
					);
				}

				return $cfg;
			}
			catch(Exception $e){
				throw new Exception('Error loading \''. $e->getFile() .'\' at line '. $e->getLine() .': '. $e->getMessage());
			}

			return false;
		}

		/*
		 * setBlacklist()
		 *
		 * @param array $data blacklisted accounts/ip
		 * @return 0
		 * @return -1 on error
		 */
		public function setBlacklist($data){
			try {
				$str = "";

				for($i = 0; $i < count($data); $i++){
					$str .= join(':', $data[$i]) . "\n";
				}

				file_put_contents(joinPaths($this->smFolder, 'blacklist.txt'), $str);

				return 0;
			}
			catch(Exception $e){
				throw new Exception('Error loading \''. $e->getFile() .'\' at line '. $e->getLine() .': '. $e->getMessage());
			}

			return -1;
		}

		/*
		 * getWhitelist()
		 *
		 * @return an array[X](			X is for number of entries
		 *		"type",					string	can be ipt for ip, act for account, nmt for user
		 *		"time",					long	-1 is for perma ban or timesamp for temporaty ban
		 *		"name"					string	can be ip or account or user
		 */
		public function getWhitelist(){
			try {
				$file	= file_get_contents(joinPaths($this->smFolder, 'whitelist.txt'));
				$lines	= explode("\n", $file);
				$cfg	= array();

				for($i = 0; $i < count($lines) - 1; $i++){
					$arr = explode(':', $lines[$i]);
					$cfg[$i] = array(
						'type'	=> $arr[0],
						'time'	=> $arr[1],
						'name'	=> $arr[2]
					);
				}

				return $cfg;
			}
			catch(Exception $e){
				throw new Exception('Error loading \''. $e->getFile() .'\' at line '. $e->getLine() .': '. $e->getMessage());
			}

			return false;
		}

		/*
		 * setWhitelist($data)
		 *
		 * @param array $data whitelisted accounts/ip/users
		 * @return 0
		 * @return -1 on error
		 */
		public function setWhitelist($data){
			try {
				$str = "";

				for($i = 0; $i < count($data); $i++){
					$str .= join(':', $data[$i]) . "\n";
				}

				file_put_contents(joinPaths($this->smFolder, 'whitelist.txt'), $str);

				return 0;
			}
			catch(Exception $e){
				throw new Exception('Error loading \''. $e->getFile() .'\' at line '. $e->getLine() .': '. $e->getMessage());
			}

			return -1;
		}

		/*
		 * getVersion()
		 *
		 * @return an array(
		 *		"build",					string	build number
		 *		"date"						string	formated date: yyyymmdd_hhmmss
		 *	)
		 */
		public function getVersion(){
			try {
				$file	= file_get_contents(joinPaths($this->smFolder, 'version.txt'));
				$data	= explode("#", $file);

				return array(
					'build'	=> $data[0],
					'date'	=> $data[1]
				);
			}
			catch(Exception $e){
				throw new Exception('Error loading \''. $e->getFile() .'\' at line '. $e->getLine() .': '. $e->getMessage());
			}

			return false;}

		/*
		 * getVersion()
		 *
		 * @return an array(
		 *		"long",					unknown long
		 *		"short",				unknown short
		 *		"timestamp",			current timestamp
		 *		"version",				server build
		 *		"name",					server name
		 *		"description",			server description
		 *		"startTime",			server start time
		 *		"connected",			connected player
		 *		"maxPlayer",			server capacity
		 *	)
		 * @return false on error or server offline
		 */
		public function checkServ($host, $port){
			$stream	= fsockopen($host, $port, $errno, $errstr, 1);
			$return	= false;
			$packet = pack("N", 9).pack("c", 42).pack("n", -1).pack("c", 1).pack("c", 111).pack("N", 0);

			if($stream && $errno == 0){
				fputs($stream, $packet);
				$reader = new StreamReader($stream);

				$size		= $reader->readInt(32, true);

				$timestamp	= $reader->readInt(64, true);
				$long		= $reader->readInt(64);

				$tag		= $reader->readBytes(1);			//tag 0x07 type short
				$short		= $reader->readInt(16);

				$tag		= $reader->readBytes(1);			//tag 0x03 type float
				$version	= $reader->readFloat();

				$tag		= $reader->readBytes(1);			//tag 0x04 type string
				$length		= $reader->readInt(16, true);
				$name		= $reader->readBytes($length);

				$tag		= $reader->readBytes(1);			//tag 0x04 type string
				$length		= $reader->readInt(16, true);
				$desc		= $reader->readBytes($length);

				$tag		= $reader->readBytes(1);			//tag 0x02 type long
				$startTime	= $reader->readInt(64, true);

				$tag		= $reader->readBytes(1);			//tag 0x01 type int
				$connected	= $reader->readInt(32, true);

				$tag		= $reader->readBytes(1);			//tag 0x01 type int
				$maxPlayer	= $reader->readInt(32, true);

				return array(
					'long'			=> $long,
					'short'			=> $short,
					'timestamp'		=> $timestamp,
					'version'		=> $version,
					'name'			=> $name,
					'description'	=> $desc,
					'startTime'		=> $startTime,
					'connected'		=> $connected,
					'maxPlayer'		=> $maxPlayer
				);
			}

			return false;
		}

		private function StringToCfg($data){
			$lines	= explode("\r\n", $data);
			$cfg	= array();

			for($i = 0; $i < count($lines); $i++){
				$cfg[$i] = array();

				if(substr($lines[$i], 0, 1) == '#' or substr($lines[$i], 0, 2) == '//'){
					$cfg[$i]['param'] = $lines[$i];
				}
				else {
					$arr1	= explode(' = ', $lines[$i]);
					$cfg[$i]['param']	= $arr1[0];

					if(count($arr1) > 1){
						for($j = 2; $j < count($arr1); $j++){
							$arr1[1] .= ' = ' . $arr1[$j];
						}
						$arr2 = explode(' //', $arr1[1]);

						if(is_numeric($arr2[0])){
							if(strpos($arr2[0], '.') > 0){
								$arr2[0] = floatval($arr2[0]);
							}
							else{
								$arr2[0] = intval($arr2[0]);
							}
						}
						else if($arr2[1] == 'true'){
							$arr2[1] = true;
						}
						else if($arr2[1] == 'false'){
							$arr2[1] = false;
						}

						$cfg[$i]['value']	= strtolower($arr2[0]);
						$cfg[$i]['com']		= $arr2[1];
					}
				}
			}

			return $cfg;
		}

		private function CfgToString($data){
			$str = "";

			for($i = 0; $i < count($data); $i++){
				if(count($data[$i]) < 3){
					$str .= $data[$i]['param'];
				}
				else {
					$str .= $data[$i]['param'] . ' = ' . $data[$i]['value'] . ' //' . $data[$i]['com'];
				}

				$str .= "\r\n";
			}

			return $str;
		}

	}

	class SMLogin {
		private $client_id		= "YOUR APPLICATION ID";
		private $client_secret	= "YOUR APPLICATION SECRET ID";
		private $redirectUri	= "YOUR REDIRECTION URI";
		private $baseUrl		= "https://registry.star-made.org/oauth/";
		private $apiUrl			= "https://registry.star-made.org/api/v1/";
		private $token			= array(
			"access"	=> null,
			"type"		=> null,
			"expires"	=> 0,
			"refresh"	=> null,
			"scope"		=> "public"
		);

		public function __construct(){
		}

		/*
		 * getAccessToken()
		 *
		 * @return string $this->token['access']
		 */
		public function getAccessToken(){
			return $this->token['access'];
		}

		/*
		 * getAccessToken()
		 *
		 * @return string $this->token['type']
		 */
		public function getTokenType(){
			return $this->token['type'];
		}

		/*
		 * getAccessToken()
		 *
		 * @return string $this->token['expires']
		 */
		public function getExpires(){
			return $this->token['expires'];
		}

		/*
		 * getAccessToken()
		 *
		 * @return string $this->token['refresh']
		 */
		public function getRefreshToken(){
			return $this->token['refresh'];
		}

		/*
		 * getAccessToken()
		 *
		 * @return string $this->token['scope']
		 */
		public function getscope(){
			return $this->token['scope'];
		}

		/*
		 * publicLogin($user, $passwd)
		 *
		 * request login with identifiant $user and $password, less security for user
		 * @param string $user user name
		 * @param string $passwd password
		 * @return true
		 * @return false on error
		 */
		public function publicLogin($user, $passwd){
			$url	= $this->baseUrl . "token";
			$data	= array(
				"client_id"		=> $this->client_id,
				"grant_type"	=> "password",
				"username"		=> $user,
				"password"		=> $passwd,
				"scope"			=> "public read_citizen_info client"
			);
			$options = array(
				'http' => array(
					'header'	=> "Content-type: application/x-www-form-urlencoded\r\n",
					'method'	=> 'POST',
					'content'	=> http_build_query($data)
				),
			);

			$context	= stream_context_create($options);
			$result		= file_get_contents($url, false, $context);

			if(!$result){
				return false;
			}

			$this->setToken(json_decode($result, true));
			return true;
		}

		/*
		 * appLogin()
		 *
		 * redirect user on starmade registery for login 
		 * @return authentification code trought url, used for getAccessToken()
		 */
		public function appLogin(){
			$url	= $this->baseUrl . "authorize";
			$url	.= '?client_id='		. $this->client_id;
			$url	.= '&client_secret='	. $this->client_secret;
			$url	.= '&response_type='	. 'code';
			$url	.= '&redirect_uri='		. $this->redirectUri;
			header("Location: " . $url);
		}

		/*
		 * getAuthToken($code)
		 *
		 * @param string $code obtain from $_GET['code'] after appLogin
		 * @return true
		 * @return false on error
		 */
		public function getAuthToken($code){
			$url	= $this->baseUrl . "token";
			$data	= array(
				"client_id"		=> $this->client_id,
				"client_secret"	=> $this->client_secret,
				"code"			=> $code,
				"redirect_uri"	=> $this->redirectUri,
				"grant_type"	=> "authorization_code"
			);

			$request = curl_init();
			curl_setopt($request, CURLOPT_URL, $url);
			curl_setopt($request, CURLOPT_POST, true);
			curl_setopt($request, CURLOPT_RETURNTRANSFER, true);
			curl_setopt($request, CURLOPT_SSL_VERIFYPEER, true);
			curl_setopt($request, CURLOPT_POSTFIELDS, http_build_query($data, null, '&'));

			$result = curl_exec($request);
			curl_close($request);

			if(array_key_exists('error',json_decode($result))){
				return false;
			}

			$this->setToken(json_decode($result, true));
			var_dump(json_decode($result, true));
			return true;
		}

		/*
		 * requestSelf()
		 *
		 * @return array(
		 *		"user" => array(
		 *			"id",					int		user id
		 *			"email",				string	user mail
		 *			"username",				string	user name
		 *			"skin_url",				string	user skin at given url
		 *			"upgraded",				bool	user own starmade
		 *			"created_at",			string	creation date of account
		 *			"tester",				bool	is tester
		 *			"steam_link" => array(
		 *				"user_id",			int		user id
		 *				"steam_id",			string	steam user id
		 *				"created_at"		string	creation date of link between starmade and steam
		 *			)
		 *		)
		 *	)
		 * @return false on error
		 */
		public function requestSelf(){
			if(!$this->token['access']){
				return false;
			}

			$url		= $this->apiUrl . "users/me.json";
			$options	= array(
				'http'		=> array(
					'header'	=> "Authorization: Bearer " . $this->token['access'] . "\r\n",
					'method'	=> "GET"
				),
			);

			$context	= stream_context_create($options);
			$result		= file_get_contents($url, false, $context);

			return json_decode($result, true);
		}

		/*
		 * requestAuthToken()
		 *
		 * @return a string authentification token
		 * @return false on error
		*/
		public function requestAuthToken(){
			if(!$this->token['access']){
				return false;
			}

			$url		= $this->apiUrl . "users/login_request.json";
			$options = array(
				'http' => array(
					'header'	=> "Authorization: Bearer " . $this->token['access'] . "\r\n",
					'method'	=> "POST"
				),
			);

			$context	= stream_context_create($options);
			$result		= file_get_contents($url, false, $context);

			return json_decode($result, true);
		}

		/*
		*	not used actually
		*/
		public function verifyAuthToken($authToken, $serverName){
			$url		= $this->apiUrl . "servers/login_request";
			$data	= array(
				"token"		=> $authToken,
				"address"	=> $serverName,
			);
			$options = array(
				'http' => array(
					'header'	=> "Content-type: application/x-www-form-urlencoded\r\n",
					'method'	=> 'POST',
					'content'	=> http_build_query($data)
				),
			);

			$context	= stream_context_create($options);
			$result		= file_get_contents($url, false, $context);

			return json_decode($result, true);
		}

		/*
		 * getAllUploads()
		 *
		 * @return array(
		 *		"count",						int		count of blueprints
		 *		"blueprints" => array(
		 *			X => array(					int		current key in blueprints array
		 *				"blueprint" =>array(
		 *					"id",				int		id on star-made.org
		 *					"name",				string	name of blueprint
		 *					"description",		string	description of blueprint
		 *					"type",				string	type of blueprint (can be "Ship", "Station" or "Unknown")
		 *					"url",				string	blueprint url
		 *				),
		 *			)
		 *		)
		 *	)
		 * @return false on error
		 */
		public function getAllUploads(){
			if(!$this->token['access']){
				return false;
			}

			$url		= $this->apiUrl . "blueprints.json";
			$options = array(
				'http' => array(
					'header'	=> "Authorization: Bearer " . $this->token['access'] . "\r\n",
					'method'	=> "GET"
				),
			);

			$context	= stream_context_create($options);
			$result		= file_get_contents($url, false, $context);

			return json_decode($result, true);
		}

		/*
		 * WIP
		 */
		public function upload($token, $file, $bpName, $bpType, $desc){
			if(!$this->token['access']){
				return false;
			}

			$url		= $this->apiUrl . "blueprints.json";
			$request	= curl_init();
			$data = array(
				"file"				=> '@' . $file,
				"blueprint_type"	=> $bpType,
				"name"				=> $bpName,
				"description"		=> $desc
			);

			curl_setopt($request, CURLOPT_URL, $url);
			curl_setopt($request, CURLOPT_HTTPHEADER, array("Authorization: Bearer " . $this->token['access']));
			curl_setopt($request, CURLOPT_POST, 1);
			curl_setopt($request, CURLOPT_POSTFIELDS, $data);

			$result = curl_exec($request);
			curl_close($request);

			return json_decode($result, true);
		}

		/*
		 * setToken($data)
		 *
		 * Set $this->token
		 * @param array $data access token
		 */
		private function setToken($data){
			$this->token['access']	= $data['access_token'];
			$this->token['type']	= $data['token_type'];
			$this->token['expires']	= $data['expires_in'];
			$this->token['refresh']	= $data['refresh_token'];
			$this->token['scope']	= $data['scope'];
		}

	}

	function joinPaths() {
		$args = func_get_args();
		$paths = array();
		foreach ($args as $arg) {
			$paths = array_merge($paths, (array)$arg);
		}

		$paths = array_map(create_function('$p', 'return trim($p, "/");'), $paths);
		$paths = array_filter($paths);
		return join('/', $paths);
	}

?>