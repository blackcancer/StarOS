<?php
	header('Content-Type: text/html; charset=UTF-8');
		/*
			Based on: SMDecoder Class
			Description: Intergrate Starmade files within your own projects.
			License: http://creativecommons.org/licenses/by/3.0/legalcode
			FileVersion: 0.4
			Date: 2013-08-29
			By Blackcancer
			website: http://initsysrev.net
			support: blackcancer@initsysrev.net
		*/

	class SMDecoder {
		
		private $null32 = "00000000000000000000000000000000";
		private $null64 = "0000000000000000000000000000000000000000000000000000000000000000";
		private $nullFloat = 0.0;
		
		public $entity = array();
		public $faction = array();
		public $catalog = array();
		
		public function decodeSMFile($file){
			$data = file_get_contents($file);
			$ext = pathinfo($file, PATHINFO_EXTENSION);
			
			if($ext == "fac"){
				$entity = $this->decodeFac($data);
			}
			else if($ext == "ent"){
				$type = $this->getType($file);
				if($type > 0 && $type < 6){
					//OBJECTS -----------------------------------------------------------
					$entity['uid'] = $this->getUID($data);			//get Unique ID
					$entity['type'] = $type;						//get Type
					$entity['name'] = $this->getName($data);		//get Name
					$entity['mass'] = (float)$this->getMass($data);		//get Mass
					if($type == 2 || $type == 4 || $type == 5){
						$entity['pw'] = (double)$this->getPw($data);		//get Power Capacity
						$entity['sh'] = (double)$this->getSh($data);		//get Shield Capacity
					} else {
						$entity['pw'] = (double)0;					//set Power Capacity 0
						$entity['sh'] = (double)0;					//set Shield Capacity 0
					}
					$entity['fid'] = $this->getFID($data);	//get Faction ID
					$creation = $this->getCreation($data);
					if($creation[0] == chr(0)){
						$creation[0] = "<system>";
					}
					if($creation[1] == chr(0)){
						$creation[1] = "";
					}
					$entity['creator'] = $creation[0];				//get Creator
					$entity['lastMod'] = $creation[1];				//get Last_Mod
					$entity['sPos'] = $this->getSecPos($data);		//get sPos
					$transform = $this->getTransform($data, $entity['type']);
					$entity['transformX'] = $transform['x'];		//get transformX
					$entity['transformY'] = $transform['y'];		//get transformY
					$entity['transformZ'] = $transform['z'];		//get transformZ
					$entity['localPos'] = $transform['o'];			//get LocalPos
					$entity['dim'] = $this->getDim($data);			//get DIM
					$entity['genId'] = $creation[2];				//get Gen_ID
					//-------------------------------------------------------------------
					
				} else if($type == 6){
					$entity['type'] = $type;
					$match = preg_match('/(?:PLAYERCHARACTER_)(.+)(?:.ent)/', $file, $matches);
					$entity['name'] = $matches[1];
					$entity['mass'] = (float)$this->getMass($data);		//get Mass
					$entity['sPos'] = $this->getSecPos($data);		//get sPos
					$transform = $this->getTransform($data, $entity['Type']);
					$entity['transformX'] = $transform['x'];		//get transformX
					$entity['transformY'] = $transform['y'];		//get transformY
					$entity['transformZ'] = $transform['z'];		//get transformZ
					$entity['localPos'] = $transform['o'];			//get LocalPos
				} else if($type == 7){
					$match = preg_match('/(?:PLAYERSTATE_)(.+)(?:.ent)/', $file, $matches);
					$entity['name'] = $matches[1];
					$entity['credits'] = $this->getCredits($data);
					$entity['sector'] = $this->getSector($data);
					$entity['fid'] = $this->getPFac($data);
				} else {
					return -1;
				}
			}
			else if($ext == "cat"){
				$entity = $this->decodeCat($data);
			}
			else if($ext == "smd2"){
				echo "starmade mesh file format";
			}
			else{
				die("Erreur : Unknow file format");
			}
			return $entity;
		}
		

	//============================= Faction Decoder =============================//

		public function decodeFac($data){
			//Get Faction ID
			preg_match_all('/(?:id)(.+)(?:fn)/Us', $data, $fdata);
			$fNumber = count($fdata[1]);
			for($i = 0; $i < $fNumber; $i++){
				$byte = null;
				for ($x = 0; $x < strlen($fdata[1][$i]) -3; $x++){
					$byte .= sprintf('%08b', ord($fdata[1][$i][$x]));
				}
				$faction[$i]['id'] = $this->bin2Int($byte);
			}
			
			//Get Faction UID, Name and Description
			preg_match_all('/(?:f0'.chr(248).'\x00)(.+)(?:'.chr(252).')/Us', $data, $fdata);
			for($i = 0; $i < $fNumber; $i++){
				$arr = explode (chr(248) ,$fdata[1][$i]);
				$faction[$i]['uid'] = substr($arr[0], 1);
				$faction[$i]['name'] = substr($arr[1], 2);
				$faction[$i]['description'] = substr($arr[2], 2);
			}
			
			//Get Faction members and grade
			preg_match_all('/(?:mem'.chr(243).chr(248).')(.+)(?:\x0D)/Us', $data, $fdata);
			for($i = 0; $i < $fNumber; $i++){
				if(isset($fdata[1][$i])){
					$arr = explode(chr(243). chr(248), $fdata[1][$i]);
					for($x = 0; $x < count($arr); $x++){
						preg_match_all('/(?:'.chr(255).')(.+)(?:\x00)/US', $arr[$x], $rank);
						$rank = (bindec(sprintf('%08b', ord($rank[1][0]))));
						$arr[$x] = substr(substr($arr[$x], 2), 0, -3);
						if($x == count($arr) -1){
							$arr[$x] = substr($arr[$x], 0, -3);
						}
						$fArr[$x]['name'] = $arr[$x];
						$fArr[$x]['rank'] = $rank;
					}
					$faction[$i]['member'] = $fArr;
				} else {
					$faction[$i]['member'] = array();
				}
			}
			
			//Get Faction ranks
			preg_match_all('/(?:0'.chr(253).')(.+)(?:\x00\x04home)/Us', $data, $fdata);
			for($i = 0; $i < $fNumber; $i++){
				preg_match_all('/(?:'.chr(243). chr(248).')(.+)(?:)/', $fdata[1][$i], $fdata2);
				$str = substr($fdata2[1][0], 2);
				$str = str_replace(chr(7), chr(15), $str);
				$arr = explode(chr(0).chr(15), $str);
				for($x = 0; $x < count($arr); $x++){
					$arr[$x] = substr($arr[$x], 0, -1); //trim function don't remove last NUL char on the 3 first iteration
					$arr[$x] = trim($arr[$x], "\x00..\x1F");
				}
				$faction[$i]['ranks'] = $arr;
			}
			
			//Get Faction home
			preg_match_all('/(?:home\x00)(.+)(?:\x08)/Us', $data, $fdata);
			for($i = 0; $i < $fNumber; $i++){
				if(isset($fdata[1][$i]) && $fdata[1][$i] != chr(0)){
					$faction[$i]['home'] = substr($fdata[1][$i], 1);
				} else {
					$faction[$i]['home'] = '';
				}
			}
			return $faction;
		}
		
		
	//============================= Entity Decoder =============================//
		
		public function getUID($data){
			$match = preg_match('/(?:ENTITY_)(.+)(?:)/', $data, $matches);
			return $matches[0]; 
		}
		
		public function getType($data){
			preg_match('/(?:ENTITY_)([A-Z]+)(?:_)/', $data, $matches);
			if(isset($matches[1])){
				if(strpos($matches[1], 'FLOATING_ITEMS_ARCHIVE') !== false){
					return 0;
				}else if(strpos($matches[1], 'SHOP') !== false){
					return 1;
				}else if(strpos($matches[1], 'SPACESTATION') !== false){
					return 2;
				}else if(strpos($matches[1], 'FLOATINGROCK') !== false){
					return 3;
				}else if(strpos($matches[1], 'PLANET') !== false){
					return 4;
				}else if(strpos($matches[1], 'SHIP') !== false){
					return 5;
				}else if(strpos($matches[1], 'PLAYERCHARACTER') !== false){
					return 6;
				}else if(strpos($matches[1], 'PLAYERSTATE') !== false){
					return 7;
				}else{
					return -1;
				}
			}else{
				return -1;
			}
		}
		
		public function getName($data){
			$match = preg_match('/(?:realname)(.+)(?:transformable)/', $data, $matches);
			$dump = substr(substr($matches[1],2),0,-3);
			return $dump;
		}
		
		public function getMass($data){
			$match = preg_match('/(?:mass)(.+)(?:transform)/', $data, $matches);
			$dump = $matches[1];
			$byteInt = null;
			for ($i = 0; $i < strlen($dump) -3; $i++){
				$byteInt .= sprintf("%08b", ord($dump[$i]));
			}
			return round($this->bin2Float($byteInt),1);
		}
		
		public function getPw($data){
			$match = preg_match('/(?:pw)(.+)(?:sh)/', $data, $matches);
			$dump = $matches[1];
			$byteInt = null;
			for ($i = 0; $i < strlen($dump) -3; $i++){
				$byteInt .= sprintf("%08b", ord($dump[$i]));
			}
			return round($this->bin2Double($byteInt),1);
		}
		
		public function getSh($data){
			preg_match('/(?:pw)(.+)(?:ex)/Us', $data, $matches);
			$str = $matches[0];
			preg_match('/(?:sh)(.+)(?:ex)/Us', $str, $matches);
			$dump = substr($matches[1],0,-2);
			$byteInt = null;
			for ($i = 0; $i < strlen($dump) -1; $i++){
				$byteInt .= sprintf("%08b", ord($dump[$i]));
			}
			return round($this->bin2Double($byteInt),1);
		}
		
		public function getFID($data){
			$match = preg_match('/(?:fid)(.+)(?:own)/', $data, $matches);
			$dump = $matches[1];
			$byteInt = null;
			for ($i = 0; $i < strlen($dump) -3; $i++){
				$byteInt .= sprintf("%08b", ord($dump[$i]));
			}
			return $this->bin2Int($byteInt);
		}
		
		public function getCreation($data){
			$match = preg_match('/(?:creatoreId)(.+)(?:)/', $data, $matches);
			$arr = explode(chr(248),$matches[1]);
			$creator = substr($arr[1],1);
			$last_mod = substr($arr[2],1);
			$last_mod = explode(chr(252), $last_mod);
			$gen_id = substr($arr[0], 3);
			$gen_id = bindec(sprintf("%08b", ord($gen_id)));
			$resp = array();
			$resp[] = $creator;
			$resp[] = $last_mod[0];
			$resp[] = $gen_id;
			return $resp;
		}
		
		public function getSecPos($data){
			$match = preg_match('/(?:sPos)(.+)(?:)/', $data, $matches);
			$dump = $matches[1];
			$byteInt = null;
			for ($i = 0; $i < strlen($dump); $i++){
				$byteInt .= sprintf("%08b", ord($dump[$i]));
			}
			$coords = str_split($byteInt,32);
			if(strlen($coords[2]) < 32){
				$coords[2] = '00000000000000000000000000001010';
			}
			$arr = array();
			$arr['x'] = $this->bin2Int($coords[0]);
			$arr['y'] = $this->bin2Int($coords[1]);
			$arr['z'] = $this->bin2Int($coords[2]);
			return $arr;
		}
		
		public function getTransform($data, $type){
			$char = chr(9);
			$word = '';
			if($type == 2 ||$type == 4 ||$type == 5){
				$word = "AIConfig0";
			}else if($type == 1 || $type == 3 || $type == 6){
				$word = "noAI";
			}
			$match = preg_match('/(?:'.$char.'transform)(.+)(?:'.$word.')/s', $data, $matches);
			$dump = substr(substr($matches[1],0,-3),5);
			$byteInt = null;
			for ($i = 0; $i < strlen($dump) ; $i++){
				$byteInt .= sprintf("%08b", ord($dump[$i]));
			}
			$bytesArr = str_split($byteInt,32);
			$xArr = array(
				'x' => $this->bin2Float($bytesArr[0]),
				'y' => $this->bin2Float($bytesArr[1]),
				'z' => $this->bin2Float($bytesArr[2])
			);
			$yArr = array(
				'x' => $this->bin2Float($bytesArr[4]),
				'y' => $this->bin2Float($bytesArr[5]),
				'z' => $this->bin2Float($bytesArr[6])
			);
			$zArr = array(
				'x' => $this->bin2Float($bytesArr[8]),
				'y' => $this->bin2Float($bytesArr[9]),
				'z' => $this->bin2Float($bytesArr[10])
			);
			$oArr = array(
				'x' => $this->bin2Float($bytesArr[12]),
				'y' => $this->bin2Float($bytesArr[13]),
				'z' => $this->bin2Float($bytesArr[14])
			);
			$coords = array(
				'x' => $xArr,
				'y' => $yArr,
				'z' => $zArr,
				'o' => $oArr,
				'float' => $this->bin2Float($bytesArr[15])
			);
			return $coords;
		}
		
		public function getDim($data){
			$match = preg_match('/(?:maxPos)(.+)(?:)/', $data, $matches);
			$dump = $matches[1];
			$byteInt = null;
			for ($i = 0; $i < strlen($dump); $i++){
				$byteInt .= sprintf("%08b", ord($dump[$i]));
			}
			$coords = str_split($byteInt,32);
			$dimArr = array();
			$dimArr[] = $this->bin2Int($coords[0]);
			$dimArr[] = $this->bin2Int($coords[1]);
			$dimArr[] = $this->bin2Int($coords[2]);
			$match = preg_match('/(?:minPos)(.+)(?:)/', $data, $matches);
			$dump = $matches[1];
			$byteInt = null;
			for ($i = 0; $i < strlen($dump)-10; $i++){
				$byteInt .= sprintf("%08b", ord($dump[$i]));
			}
			$coords = str_split($byteInt,32);
			$dimArr[] = $this->bin2Int($coords[0]);
			$dimArr[] = $this->bin2Int($coords[1]);
			$dimArr[] = $this->bin2Int($coords[2]);
			
			return $dimArr;
		}
		
		public function getCredits($data){
			$match = preg_match('/(?:credits)(.+)(?:spawn)/', $data, $matches);
			$dump = substr($matches[1],0, -3);
			$byteInt = null;
			for ($i = 0; $i < strlen($dump) ; $i++){
				$byteInt .= sprintf("%08b", ord($dump[$i]));
			}
			return bindec($byteInt);
		}
		
		public function getSector($data){
			$match = preg_match('/(?:sector)(.+)(?:lspawn)/', $data, $matches);
			$dump = $matches[1];
			$byteInt = null;
			for ($i = 0; $i < strlen($dump) -3 ; $i++){
				$byteInt .= sprintf("%08b", ord($dump[$i]));
			}
			$bytesArr = str_split($byteInt,32);
			$xArr = array(
				'x' => bindec($bytesArr[0]),
				'y' => bindec($bytesArr[1]),
				'z' => bindec($bytesArr[2])
			);
			return $xArr;
		}
		
		public function getPFac($data){
			$str = '\x00'.chr(252);
			$match = preg_match('/(?:pFac-v0)(.+)(?:'.$str.')/', $data, $matches);
			$dump = $matches[1];
			$byteInt = null;
			for ($i = 1; $i < strlen($dump) ; $i++){
				$byteInt .= sprintf("%08b", ord($dump[$i]));
			}
			return bindec($byteInt);
		}
		
		//DEPRECATED==============================>
		public function getDockedTo($data){
			$match = preg_match('/(?:dockedTo)(.+)(?:)/', $data, $matches);
			$dump = substr($matches[1],2);
			return $dump;
		}
		//========================================>

		
	//============================= Faction Decoder =============================//

		public function decodeCat($data){
			$unicode = "\x{09}\x{0a}\x{0d}\x{20}-\x{7e}"; // basic ascii chars plus CR,LF and TAB
			preg_match_all('/(?:'.chr(243).chr(248).')(.+)(?:'.chr(2).'r0)/Us', $data, $cdata);
			$shipsArr = explode(chr(243).chr(248), $cdata[1][0]);
			for($i = 0; $i < count($shipsArr); $i++){
				$shipData = explode(chr(248), $shipsArr[$i]);
				$ship = $shipData[0];
				$creator = explode(chr(253),$shipData[1]);
				$desc = explode(chr(252),$shipData[2]);
				$catalog[$i]['ship'] = trim($ship, "\x00..\x1F");
				$catalog[$i]['creator'] = trim($creator[0], "\x00..\x1F");
				$catalog[$i]['desc'] = substr($desc[0], 2);
				$str = $catalog[$i]['ship'].chr(243).chr(248).'\x00'.chr(11).$catalog[$i]['creator'].chr(255);
				preg_match('/(?:'.$str.')([\x00-\x0F]+?)/Us', $data, $match);
				if(count($match) > 0){
					$str = $match[1];
					$catalog[$i]['rate'] = bindec(sprintf("%08b", ord($str[0])));
				} else {
					$catalog[$i]['rate'] = 0;
				}
			}
			return $catalog;
		}
		
	//============================= Binary Decoder =============================//
		
		private function bin2Int($data){
			if(strlen($data) != 32){
				return -1;
			} else {
				if($data[0] == "1"){
					$out = "";
					$mode = "init";
					for($x = strlen($data)-1; $x >= 0; $x--) {
						if ($mode != "init")
							$out = ($data[$x] == "0" ? "1" : "0").$out;
						else {
							if($data[$x] == "1") {
								$out = "1".$out;
								$mode = "invert";
							}
							else
								$out = "0".$out;
						}
					}
					return bindec($out) *-1;
				}
				else{
					return bindec($data);
				}
			}
		}
			
		private function bin2Float($data){
			if(strlen($data) != 32){
				return -1;
			} else {
				if($data === $this->null32){
					return $this->nullFloat;
				} else {
					$hex = substr(chunk_split(base_convert($data, 2, 16), 2, " "), 0, -1);
					$hexRev = $this->hexReverse($hex);
					$hexi = $this->hexify($hexRev);
					if($hexi === false) die("Invalid input\n");
					$decode = unpack("f", $hexi);
					if($decode[1] == -0){
						$decode[1] = (float)0;
					}
					return $decode[1];
				}
			}
		}
		
		private function bin2Double($data){
			if(strlen($data) != 64){
				return -1;
			} else {
				if($data === $this->null64){
					return $this->nullFloat;
				} else {
					$hex = substr(chunk_split(base_convert($data, 2, 16), 2, " "), 0, -1);
					$hexRev = $this->hexReverse($hex);
					$hexi = $this->hexify($hexRev);
					if($hexi === false) die("Invalid input\n");
					$decode = unpack("d", $hexi);
					return $decode[1];
					
				}
			}
		}
		
		private function hexReverse($hex){
			$r = '';
			$hexArray = explode(' ', $hex);
			foreach ($hexArray as $z) {
				$r = $z . ' ' . $r;
			}
			return substr($r, 0, -1);
		}
		
		private function hexify($hex){
			static $hexVal = array(
				'0'=>0, '1'=>1, '2'=>2, '3'=>3,
				'4'=>4, '5'=>5, '6'=>6, '7'=>7,
				'8'=>8, '9'=>9, 'A'=>10, 'B'=>11,
				'C'=>12, 'D'=>13, 'E'=>14, 'F'=>15,
				'a'=>10, 'b'=>11, 'c'=>12, 'd'=>13, 'e'=>14, 'f'=>15,
			);
			$r = '';
			$hexArray = explode(' ', $hex);
			foreach ($hexArray as $z) {
				if (!ctype_xdigit($z)) return false;
				$tmp = $hexVal[$z{0}] * 16 + $hexVal[$z{1}];
				$r .= chr($tmp);
			}
			return $r;
		}


	//============================= Other StarMade Functions =============================//

		public function getServerInfo(){
			$buffer = '';
			$host = SM_HOST;
			$port = SM_PORT;
			$packet = pack("N", 9).pack("c", 42).pack("n", -1).pack("c", 1).pack("c", 111).pack("N", 0);
			
			$octet = 8;
			$intSize = 32;
			$longSize = $floatSize = 64;
			
			$socket = socket_create(AF_INET, SOCK_STREAM,SOL_TCP);
			if(socket_connect($socket, $host, $port)){
				socket_sendto($socket, $packet, strlen($packet), 0 , $host, $port);
				socket_recvfrom($socket, $buffer, 8190, 0 , $host, $port);
			
				$byteBuffer = array();
				for ($i = 0; $i < strlen($buffer); $i++){
					$byteBuffer[] = sprintf('%08b', ord($buffer[$i]));
				}
				
				$timestamp = null;
				for($i = 4; $i < 12; $i++){
					$timestamp .= $byteBuffer[$i];
				}
				
				$startTime = null;
				for($i = count($byteBuffer) - 17; $i < count($byteBuffer)-10; $i++){
					$startTime .= $byteBuffer[$i];
				}
				$timestamp = substr(bindec($timestamp),0,-3);
				$arr['timestamp'] = $timestamp;
				$startTime = substr(bindec($startTime),0,-3);
				$arr['startTime'] = $startTime;
				
				$version = null;
				for($i = 24; $i < 28; $i++){
					$version .= $byteBuffer[$i];
				}
				$arr['version'] = round($this->bin2Float($version),5);
				
				$connected = null;
				for($i = count($byteBuffer) - 9; $i < count($byteBuffer)-5; $i++){
					$connected .= $byteBuffer[$i];
				}
				$arr['Connected'] = $this->bin2Int($connected);
				
				$maxPlayer = null;
				for($i = count($byteBuffer) - 4; $i < count($byteBuffer); $i++){
					$maxPlayer .= $byteBuffer[$i];
				}
				$arr['MaxPlayer'] = $this->bin2Int($maxPlayer);
							
				return $arr;
			}else{
				return false;
			}
		}
	}
?>