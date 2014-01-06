<?php
	/*
		Product: SMDecoder Class
		Description: Intergrate Starmade files within your own projects.
		License: http://creativecommons.org/licenses/by/3.0/legalcode

		FileVersion: 0.5-rev00003						Date: 2014-01-03
		By Blackcancer
		
		website: http://initsysrev.net
		support: blackcancer@initsysrev.net

		Header, Logic and Meta are adapted from "blueprint.py" by tambry
		Meta not yet finish

		This is a list of most used chars in regex.
		In starmade files, all string start with chr(strlen(string))
		exemple: fid = strlen('fid') = 3 = chr(3),
				 chr(3).'fid' is string to search

			chr(0)   = \x00 = NUL
			chr(1)   = \x01 = SOH
			chr(2)   = \x02 = STX
			chr(3)   = \x03 = ETX
			chr(4)   = \x04 = EOT
			chr(5)   = \x05 = ENQ
			chr(6)   = \x06 = ACK
			chr(7)   = \x07 = BEL
			chr(8)   = \x08 = BS
			chr(9)   = \x09 = HT
			chr(10)  = \x0A = LF
			chr(11)  = \x0B = VT
			chr(12)  = \x0C = FF
			chr(13)  = \x0D = CR
			chr(14)  = \x0E = SO
			chr(15)  = \x0F = SI
			chr(16)  = \x10 = DLE
			chr(17)  = \x11 = DC1
			chr(18)  = \x12 = DC2
			chr(19)  = \x13 = DC3
			chr(20)  = \x14 = DC4
			chr(243) = \xF3 = ó
			chr(248) = \xF8 = ø
			chr(252) = \xFC = ü
			chr(253) = \xFD = ý
			chr(255) = \xFF = ÿ
	*/

	header('Content-Type: text/html; charset=UTF-8');

	define("NULL32", "00000000000000000000000000000000");
	define("NULL64", "0000000000000000000000000000000000000000000000000000000000000000");
	define("NULLFLOAT", 0.0);



	class SMDecoder{
		public function decodeSMFile($file){
			$ent = array();
			$data = file_get_contents($file);
			$ext = pathinfo($file, PATHINFO_EXTENSION);

			switch($ext){
				case "cat":
					$ent = $this->decodeCat($data);
					break;

				case "ent":
					$type = $this->getType($file);

					switch($type){
						case 6:
							$ent = $this->decodePlayChar($data, $file, $type);
							break;

						case 7:
							$ent = $this->decodePlayStat($data, $file, $type);
							break;

						default:
							$ent = $this->decodeEnt($data, $type);
							break;
					}

					break;
				case "fac":
					$ent = $this->decodeFac($data);
					break;

				case "smbph":
					$ent = $this->decodeHeader($file);
					break;

				case "smbpl":
					$ent = $this->decodeLogic($file);
					break;

				case "smbpm":
					$ent = $this->decodeMeta($file);
					break;

				case "smd2":
					echo "starmade mesh file format";
					break;

				default:
					die("Unknown file format");
			}

			return $ent;
		}


		//============================= Catalog Decoder =============================//

		private function decodeCat($data){
			$return = array();
			if(preg_match_all('/(?:\xF3\xF8)(.+)(?:\x00\x02r0)/Us', $data, $catData)){
				$shipsArr = explode(chr(243).chr(248), $catData[1][0]);

				for($i = 0; $i < count($shipsArr); $i++){
					$shipData = explode(chr(248), $shipsArr[$i]);
					$shipName = $shipData[0];
					$shipCreator = explode(chr(253), $shipData[1]);
					$shipDesc = explode(chr(252), $shipData[2]);

					$return[$i]['ship'] = trim($shipName, "\x00..\x1F");
					$return[$i]['creator'] = trim($shipCreator[0], "\x00..\x1F");
					$return[$i]['desc'] = substr($shipDesc[0], 2);

					$regex = $return[$i]['ship'].'\xF3\xF8\x00\x0B'.$return[$i]['creator'].'\xFF';
					preg_match('/(?:'.$regex.')(.+)([\x00-\x0F]+?)/Us', $data, $rateData);
					if(count($rateData) > 0){
						$rate = $rateData[1];
						$return[$i]['rate'] = bindec(sprintf("%80b", ord($rate[0])));
					}
					else{
						$return[$i]['rate'] = 0;
					}
				}
			}
			return $return;
		}


		//============================= Entity Decoder  =============================//

		private function decodeEnt($data, $type){
			$return = array();

			$transform = $this->getTransform($data);
			$creation = $this->getCreation($data);

			$return['uid'] 		  = $this->getUid($data);
			$return['type'] 	  = $type;
			$return['name'] 	  = $this->getName($data);
			$return['creator'] 	  = $creation[0];
			$return['lastMod'] 	  = $creation[1];
			$return['fid'] 		  = $this->getFid($data);
			$return['mass'] 	  = $this->getMass($data);
			if($type == 2 || $type == 4 || $type == 5){
				$return['pw'] = (double)$this->getPw($data);
				$return['sh'] = (double)$this->getSh($data);
			} else {
				$return['pw'] = (double)0;
				$return['sh'] = (double)0;
			}
			$return['AIconfig']	  = $this->getAI($data);
			//$return['contenairs'] = $this->getContainers($data);
			$return['sPos'] = $this->getSPos($data);
			$return['localPos']   = $transform['o'];
			$return['transformX'] = $transform['x'];
			$return['transformY'] = $transform['y'];
			$return['transformZ'] = $transform['z'];
			$return['dim'] 		  = $this->getDim($data);
			$return['genId'] 	  = $creation[2];

			return $return;
		}

		private function decodePlayChar($data, $file, $type){
			preg_match('/(?:PLAYERCHARACTER_)(.+)(?:.ent)/', $file, $matches);
			$transform = $this->getTransform($data);
			$return = array();

			$return['id'] = $this->getPlayCharId($data);
			$return['type'] = $type;
			$return['name'] = $matches[1];
			$return['speed'] = $this->getSpeed($data);
			$return['mass'] = $this->getMass($data);
			$return['stepHeight'] = $this->getStepHeight($data);
			$return['sPos'] = $this->getSPos($data);
			$return['localPos'] = $transform['o'];
			$return['transformX'] = $transform['x'];
			$return['transformY'] = $transform['y'];
			$return['transformZ'] = $transform['z'];

			return $return;
		}

		private function decodePlayStat($data, $file, $type){
			$return = array();

			preg_match('/(?:PLAYERSTATE_)(.+)(?:.ent)/', $file, $matches);
			$return['name'] = $matches[1];
			$return['credits'] = $this->getCredits($data);
			//$return['inventory'] = $this->getPlayInv($data);
			$return['spawn'] = $this->getSpawn($data);
			$return['sector'] = $this->getSector($data);
			$return['lspawn'] = $this->getLspawn($data);
			$return['lsector'] = $this->getLsector($data);
			$return['fid'] = $this->getPFac($data);

			return $return;
		}

			//====================== Sub functions PUBLIC =======================//
		public function getName($data){
			preg_match('/(?:\x00\x08realname)(.+)(?:\x0d\x00)/Us', $data, $matches);
			$return = substr($matches[1],2);

			return $return;
		}

		public function getSPos($data){
			preg_match('/(?:\x00\x04sPos)(.+)(?:\x03\x00\x03fid)/Us', $data, $matches);
			$dump = str_split($matches[1],4);

			$return = array(
				'x' => binInt32($dump[0]),
				'y' => binInt32($dump[1]),
				'z' => binInt32($dump[2])
			);

			return $return;
		}

		public function getType($file){

			if(strpos($file, 'FLOATING_ITEMS_ARCHIVE') !== false){
				return 0;
			}else if(strpos($file, 'SHOP') !== false){
				return 1;
			}else if(strpos($file, 'SPACESTATION') !== false){
				return 2;
			}else if(strpos($file, 'FLOATINGROCK') !== false){
				return 3;
			}else if(strpos($file, 'PLANET') !== false){
				return 4;
			}else if(strpos($file, 'SHIP') !== false){
				return 5;
			}else if(strpos($file, 'PLAYERCHARACTER') !== false){
				return 6;
			}else if(strpos($file, 'PLAYERSTATE') !== false){
				return 7;
			}else{
				return -1;
			}
		}

		public function getUid($data){
			preg_match('/(?:ENTITY_)(.+)(?:)/', $data, $return);
			return $return[0]; 
		}

			//====================== Sub functions PRIVATE ======================//
		private function getAI($data){
			if(preg_match('/\x00\x04noAI\x00\x0A/Us', $data)) return "noAI";
			$str = "\x08\x00\x05state\x00";
			preg_match('/(?:\x00\x06AIM_AT\x08\x00\x05state\x00)(.+)(?:\x00\x0D)/Us', $data, $matches1);
			preg_match('/(?:\x00\x04TYPE\x08\x00\x05state\x00)(.+)(?:\x00\x0D)/Us', $data, $matches2);
			preg_match('/(?:\x00\x06ACTIVE\x08\x00\x05state\x00)(.+)(?:\x00\x00)/Us', $data, $matches3);
			$dump1 = substr($matches1[1], 1);
			$dump2 = substr($matches2[1], 1);
			$dump3 = substr($matches3[1], 1);
			
			$return = array(
				'AIM_AT' => $dump1,
				'TYPE' => $dump2,
				'ACTIVE' => $dump3
			);
			
			return $return;
		}

		private function getCreation($data){
			preg_match('/(?:\x00\x0AcreatoreId)(.+)(?:)/', $data, $matches);

			$arr = explode(chr(248),$matches[1]);
			$creator = substr($arr[1],1);
			$last_mod = substr($arr[2],1);
			$last_mod = explode(chr(252), $last_mod);
			$gen_id = substr($arr[0], 3);
			$gen_id = bindec(sprintf("%08b", ord($gen_id)));
			$return = array();
			$return[] = $creator;
			$return[] = $last_mod[0];
			$return[] = $gen_id;

			if($return[0] == chr(0)){
				$return[0] = "<system>";
			}
			if($return[1] == chr(0)){
				$return[1] = "";
			}

			return $return;
		}

		private function getCredits($data){
			preg_match('/(?:\x00\x07credits)(.+)(?:\x09\x00\x05spawn)/', $data, $matches);
			$return = $matches[1];
			
			return binInt32($return);
		}

		private function getDim($data){
			preg_match('/(?:\x00\x06maxPos)(.+)(?:\x0A\x00\x06minPos)/Us', $data, $matches1);
			preg_match('/(?:\x00\x06minPos)(.+)(?:\xF3\xF8\x00\x04NONE)/', $data, $matches2);
			$dump1 = str_split($matches1[1],4);
			$dump2 = str_split($matches2[1],4);
			
			$maxPos = array(
				'x' => binInt32($dump1[0]),
				'y' => binInt32($dump1[1]),
				'z' => binInt32($dump1[2])
			);
			
			$minPos = array(
				'x' => binInt32($dump2[0]),
				'y' => binInt32($dump2[1]),
				'z' => binInt32($dump2[2])
			);
			
			$return = array(
				'maxPos' => $maxPos,
				'minPos' => $minPos
			);
			
			return $return;
		}

		private function getFid($data){
			preg_match('/(?:\x00\x03fid)(.+)(?:\x08\x00\x03own)/Us', $data, $matches);
			$return = $matches[1];

			return binInt32($return);
		}

		private function getLsector($data){
			preg_match('/(?:\x00\x07lsector)(.+)(?:\x0D\x00\x07)/', $data, $matches);
			$dump = str_split($matches[1], 4);

			$return = array(
				'x' => binInt32($dump[0]),
				'y' => binInt32($dump[1]),
				'z' => binInt32($dump[2])
			);

			return $return;
		}

		private function getLspawn($data){
			preg_match('/(?:\x00\x06lspawn)(.+)(?:\x0A\x00\x07)/', $data, $matches);
			$dump = str_split($matches[1], 4);

			$return = array(
				'x' => binFloat($dump[0]),
				'y' => binFloat($dump[1]),
				'z' => binFloat($dump[2])
			);

			return $return;
		}

		private function getMass($data){
			preg_match('/(?:\x00\x04mass)(.+)(?:\x0C\x00\x09transform)/Us', $data, $matches);
			$return = $matches[1];

			return round(binFloat($return), 1);
		}

		private function getPFac($data){
			preg_match('/(?:\x00\x07pFac-v0\xFD)(.+)(?:\x00\xFC)/', $data, $matches);
			return binInt32($matches[1]);
		}

		private function getPlayCharId($data){
			preg_match('/(?:\x03\x00\x02id)(.+)(?:\x05\x00\x05)/Us', $data, $matches);
			return binInt32($matches[1]);
		}

		private function getPw($data){
			preg_match('/(?:\x00\x02pw)(.+)(?:\x06\x00\x02sh)/Us', $data, $matches);
			$return = $matches[1];

			return round(binDouble($return),1);
		}

		private function getSector($data){
			preg_match('/(?:\x00\x06sector)(.+)(?:\x09\x00\x6lspawn)/', $data, $matches);
			$dump = str_split($matches[1], 4);

			$return = array(
				'x' => binInt32($dump[0]),
				'y' => binInt32($dump[1]),
				'z' => binInt32($dump[2])
			);

			return $return;
		}

		private function getSh($data){
			preg_match('/(?:\x00\x02sh)(.+)(?:ex)/Us', $data, $matches);
			$return = substr($matches[1],0,-3);

			return round(binDouble($return),1);
		}

		private function getSpawn($data){
			preg_match('/(?:\x00\x05spawn)(.+)(?:\x0D\x00\x09)/', $data, $matches);
			$dump = str_split($matches[1], 4);

			$return = array(
				'x' => binFloat($dump[0]),
				'y' => binFloat($dump[1]),
				'z' => binFloat($dump[2])
			);

			return $return;
		}

		private function getSpeed($data){
			preg_match('/(?:\x00\x05speed)(.+)(?:\x05\x00\x0A)/Us', $data, $matches);
			$return = $matches[1];

			return binFloat($return);
		}

		private function getStepHeight($data){
			preg_match('/(?:\x05\x00\x0AstepHeight)(.+)(?:\x0D\x00\x0D)/Us', $data, $matches);
			return binInt32($matches[1]);
		}

		private function getTransform($data){
			preg_match('/(?:\x00\x09transform\x05\x00\x00\x00\x10)(.+)(?:[\x02]|[\x0D]\x00)/s', $data, $matches);
			$dump = str_split($matches[1],4);

			$x = array(
				'x' => binFloat($dump[0]),
				'y' => binFloat($dump[1]),
				'z' => binFloat($dump[2])
			);

			$y = array(
				'x' => binFloat($dump[4]),
				'y' => binFloat($dump[5]),
				'z' => binFloat($dump[6])
			);

			$z = array(
				'x' => binFloat($dump[8]),
				'y' => binFloat($dump[9]),
				'z' => binFloat($dump[10])
			);

			$o = array(
				'x' => binFloat($dump[12]),
				'y' => binFloat($dump[13]),
				'z' => binFloat($dump[14])
			);

			$return = array(
				'x' => $x,
				'y' => $y,
				'z' => $z,
				'o' => $o,
				'float' => binFloat($dump[15])
			);

			return $return;
		}

			//==================== EXPERIMENTAL Sub functions ====================//
		private function getContainers($data){
			if(preg_match('/\x00\x13controllerStructure\x00\x0D/Us', $data)){
				return "noInventory";
			}

			preg_match('/(?:\x00\x09inventory)(.+)(?:\x00\x08shipMan0)/Us', $data, $matches);
			$str = chr(0).chr(9)."inventory".chr(3);
			$inventory = explode($str , $matches[1]);
			$return = array();
			for($i = 0; $i < count($inventory); $i++){
				$arr = explode("\x0D\x00",$inventory[$i]);
				$index1 = explode("index", $arr[0]);
				$index1 = str_split($index1[1], 4);
				$pos = array(
					'x' => binInt32($index1[0]),
					'y' => binInt32($index1[1]),
					'z' => binInt32($index1[2])
				);
				$arr[1] = substr($arr[1], 19);
				$slotsSplit = explode("\x0C\x00\x05types\x02\x00\x00", $arr[1]);
				$slotsList = str_split($slotsSplit[0], 4);
				$slotsUsed = count($slotsList) - 1;
				$slotsArr = array();
				
				$blocksList = str_split($slotsSplit[1], 2);
				$arr[2] = substr($arr[2],7);
				$valueList = explode(chr(253), $arr[2]);
				$valueList = array_slice($valueList, 1);
				if(count($valueList)){
					$valueList[$slotsUsed -1] = substr($valueList[$slotsUsed -1], 0, 4);
				}
				for($j = 0; $j < $slotsUsed; $j++){
					$blockId = $blocksList[$j];
					$slotsArr[binInt32($slotsList[$j])] = array (
						'block' => binInt16($blockId),
						'qty' => binInt32($valueList[$j])
					);
					var_dump($valueList[$j]);
				}
				$return[$i] = array(
					'pos' => $pos,
					'slots' => $slotsArr
				);
			}

			return $return;
		}

		private function getPlayInv($data){
			preg_match('/(?:\x00\x05slots\x03)(.+)(?:\x0C\x00\x05types)/Us', $data, $matches1);
			preg_match('/(?:\x00\x05types\x02\x00\x00)(.+)(?:\x0D\x00\x06values)/Us', $data, $matches2);
			preg_match('/(?:\x00\x06values)(.+)(?:\x0A\x00\x06sector)/Us', $data, $matches3);
			$slots = str_split($matches1[1], 4);
			$blocks = str_split($matches2[1], 2);
			$qtys = str_split($matches3[1], 5);
			$return = array();

			for($i = 0; $i < count($qtys); $i++){
				$qtys[$i] = substr($qtys[$i], 1);
			}

			for($i = 0; $i < count($slots) - 1; $i++){
				$return[binInt32($slots[$i])] = array(
					'block' => binInt16($blocks[$i]),
					'qty' => binInt32($qtys[$i])
				);
			}
			
			return $return;
		}

		private function getWeapons($data){
		}


		//============================= Faction Decoder =============================//

		private function decodeFac($data){
			$faction = array();

			//Get Faction ID
			preg_match_all('/(?:\x00\x02id)(.+)(?:\x01\x00\x02fn)/Us', $data, $fdata);
			$fNumber = count($fdata[1]);
			for($i = 0; $i < $fNumber; $i++){
				$faction[$i]['id'] = binInt32($fdata[1][$i]);
			}

			//Get Faction UID, Name and Description
			preg_match_all('/(?:f0\xF8\x00)(.+)(?:\xFC\x00)/Us', $data, $fdata);
			for($i = 0; $i < $fNumber; $i++){
				$arr = explode (chr(248) ,$fdata[1][$i]);
				$faction[$i]['uid'] = substr($arr[0], 1);
				$faction[$i]['name'] = substr($arr[1], 2);
				$faction[$i]['description'] = substr($arr[2], 2);
			}

			//Get Faction members and grade
			preg_match_all('/(?:mem\xF3\xF8)(.+)(?:\x0D\x00\x01)/Us', $data, $fdata);
			for($i = 0; $i < $fNumber; $i++){
				if(isset($fdata[1][$i])){
					$arr = explode(chr(243). chr(248), $fdata[1][$i]);
					for($x = 0; $x < count($arr); $x++){
						preg_match_all('/(?:\xFF)(.+)(?:\x00)/US', $arr[$x], $rank);
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
			preg_match_all('/(?:\x010\xFD)(.+)(?:\x00\x04home)/Us', $data, $fdata);
			for($i = 0; $i < $fNumber; $i++){
				preg_match_all('/(?:\xF3\xF8)(.+)(?:)/', $fdata[1][$i], $fdata2);
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


		//============================= Header Decoder  =============================//

		private function decodeHeader($file){
			/*
				start	type
					0	int				unknown int
					4	int				unknown int
					8	float[3]		3d float vector (bounding box of ship)
					20	float[3]		3d float fector (bounding box of ship)
					32	int				number of block table entries (N)
					36	blockEntry[N]	block entry

				blockEntry is a 6 byte value
					0	short			blockID
					2	int				blockQuantity
			*/
			$return = array();

			$stream = fopen($file, "rb");
			$return['int_a'] = readInt32($stream);
			$return['int_b'] = readInt32($stream);
			$return['bounds_a'] = array(readFloat($stream), readFloat($stream), readFloat($stream));
			$return['bounds_b'] = array(readFloat($stream), readFloat($stream), readFloat($stream));
			$blockTblLen = readInt32($stream);
			$return['blockTableLen'] = $blockTblLen;
			$return['blocks'] = array();

			for($i = 0; $i < $blockTblLen; $i++){
				$index = readInt16($stream);
				$qty = readInt32($stream);
				$return['blocks'][$index] = $qty;
			}

			fclose($stream);
			return $return;
		}


		//============================= Logic Decoder   =============================//

		private function decodeLogic($file){
			/*  
			start   type
				0	int					unknown int
				4	int					numControllers (N)
				8	controllerEntry[N]

			controllerEntry is a variable length struct
				0   short[3]			Position of the controller block, for example the core is defined at (8, 8, 8)
				12  int					Number of groups of controlled blocks.  (M)
				16  groupEntry[M]

			groupEntry is a variable length struct
				0   short				Block ID for all blocks in this group
				2   int					Number of blocks in the group (I)
				6   short[3][I]			Array of blocks positions for each of the I blocks

			FOR EXAMPLE, a file might have this data:

			numControllers = 2
			controllerEntry[0] (will be the ship core)
				position: (8,8,8) (since it's the ship core)
				numGroups: 2
				group[0]
					blockID: 4 (Salvager computer)
					numBlocks: 1 (# of salvage computer on the ship)
					blockArray: (8,8,13) (1 entry containing 3 shorts, which is the position of the salvage computer)
				group[1]
					blockID: 8 (Thruster)
					numBlocks: 12 (# of thrusters)
					blockArray: (12 entries containing 3 shorts each, the position of each thruster)
			controllerEntry[1] (the salvager computer)
				position: (8,8,13)
				numGroups: 1
				group[0]
					blockID: 24 (Salvage cannon)
					numBlocks: 10
					blockArray: (10 entries containing 3 shorts each, the position of each salvage cannon)
			*/
			
			$stream = fopen($file, "rb");
			$fileSize = filesize($file);
			$return = array();

			while (ftell($stream) < $fileSize){
				$return['int_a'] = readInt32($stream);
				$numControls = readInt32($stream);
				$return['controllers'] = array();

				for($i = 0; $i < $numControls; $i++){
					$dict = array();
					$dict['pos'] = array(readInt16($stream), readInt16($stream), readInt16($stream));
					$numGroups = readInt32($stream);
					$dict['q'] = array();

					for($j = 0; $j < $numGroups; $j++){
						$tag = readInt16($stream);
						$numBlocks = readInt32($stream);
						$dict['q'][$tag] = array();

						for($x = 0; $x < $numBlocks; $x++){
							array_push($dict['q'][$tag], array(readInt16($stream), readInt16($stream), readInt16($stream)));
						}
					}
					array_push($return['controllers'], $dict);
				}
			}
			fclose($stream);
			return $return;
		}


		//============================= Meta Decoder    =============================//

		private function decodeMeta($file){
			/*
			start     type
				0       int				unknown int
				4       byte			unknown byte. Currently expecting a 0x03 here.
				5       int				number of dockEntry (docked ship/turrets)
				9       dockEntry[N]	data about each docked ship/turret
				vary    byte			unknown byte
				vary    short			specifies if GZIP compression is used on the tagStruct
				vary    tagStruct[]		additional metadata in a tag structure
				
				
			dockEntry is a variable length struct
			start		type
				0		int				length of the string giving attached ship's subfolder
				4		wchar[N]		ship subfolder string given in modified UTF-8 encoding
				vary	int[3]			q vector, the location of the dock block
				vary	float[3]		a vector, ???
				vary	short			block ID of the dock block
				
			tagStruct encodes variety of data types in a tree structure
			start       type
				0       byte            tag type
				1       int             length of the tag name string
				5       wchar[N]        tag name string in modified UTF-8 encoding
				vary    vary            tag data
				
			special tag types (see code for full list and encoding):
				0x0     End of tag struct marker -- no tag name or data follows this
				0xD     Start of new tag struct
				0xE     Serialized object (not yet implemented here)
			*/
			
			$return = array();
			
			$stream = fopen($file, "rb");
			$fileSize = filesize($file);
			$return['int_a'] = readInt32($stream);
			$return['byte_a'] = bindec(sprintf("%08b", ord(fread($stream, 1))));

			if($return['byte_a'] == 3){
				$numDocked = readInt32($stream);
				$return['docked'] = array();

				for($i = 0; $i < $numDocked; $i++){
					$nLenght = bindec(fread($stream, 1));
					$name = fread($stream, $nLenght);
					$q = array(readInt32($stream), readInt32($stream), readInt32($stream));
					$a = array(bin2Float($stream), bin2Float($stream), bin2Float($stream));
					$docking = readInt16($stream);

					$arr = array(
						'name' => $name,
						'q' => $q,
						'a' => $a,
						'dockID' => $docking
					);
					array_push($return['docked'], $arr);
				}
				
				$return['byte_b'] = bindec(sprintf("%08b", ord(fread($stream, 1))));
				fread($stream, 4);
				$index1 = readStr($stream);
				$return[$index1] = array();
				fread($stream, 2);
				$index2 = readStr($stream);
				$return[$index1][$index2] = array();

				if(fread($stream, 1) != "\x00"){
				}

				fread($stream, 2);
				$index1 = readStr($stream);
				$return[$index1] = array();
			}

			fclose($stream);
			return $return;
		}


		//============================= Modele Decoder  =============================//

		private function decodeModel($file){
		}
	}

	function binDouble($binStr){
		$bytes = null;

		if(strlen($binStr) == 8){

			for($i = 0; $i < 8; $i++){
				$bytes .= sprintf("%08b", ord($binStr[$i]));
			}

			if($bytes === NULL64){
				return NULLFLOAT;
			}
			else{
				$hex = base_convert($bytes, 2, 16);
				$hex = chunk_split($hex, 2, " ");
				$hex = substr($hex, 0, -1);
				$hex = hexReverse($hex);
				$hex = hexify($hex);
				if($hex === false){
					die("Error: Invalide hex for double");
				}
				$dec = unpack("d", $hex);
			}
		}
		else{
			die("Error: double type have 8 bytes.\n");
		}

		return $dec[1];
	}

	function binFloat($binStr){
		$bytes = null;

		if(strlen($binStr) == 4){

			for($i = 0; $i < 4; $i++){
				$bytes .= sprintf("%08b", ord($binStr[$i]));
			}

			if($bytes === NULL32){
				return NULLFLOAT;
			}
			else{
				$hex = base_convert($bytes, 2, 16);
				$hex = chunk_split($hex, 2, " ");
				$hex = substr($hex, 0, -1);
				$hex = hexReverse($hex);
				$hex = hexify($hex);
				if($hex === false){
					die("Error: Invalide hex for float");
				}
				$dec = unpack("f", $hex);
				if($dec[1] == (-0)){
					$dec[1] = (float)0;
				}
			}
		}
		else{
			die("Error: float type have 4 bytes.\n");
		}

		return $dec[1];
	}

	function binInt16($binStr){
		$bytes = null;
		
		for($i = 0; $i < 2; $i++){
			$bytes .= sprintf("%08b", ord($binStr[$i]));
		}
		
		return bindec($bytes);
	}

	function binInt32($binStr){
		$bytes = null;
		if(strlen($binStr) == 4){

			for($i = 0; $i < 4; $i++){
				$bytes .= sprintf("%08b", ord($binStr[$i]));
			}

			if($bytes[0] == "1"){
				$out = "";
				$mode = "init";

				for($i = strlen($bytes)-1; $i >= 0; $i--){
					if($mode != "init"){
						$out = ($bytes[$i] == "0" ? "1" : "0").$out;
					}
					else{
						if($bytes[$i] == "1"){
							$out = "1".$out;
							$mode = "invert";
						}
						else{
							$out = "0".$out;
						}
					}
				}

				return bindec($out) * (-1);
			}
		}
		else{
			die("Error: int type have 4 bytes.\n");
		}
		return bindec($bytes);
	}

	function binInt64($binStr){
		$bytes = null;
		if(strlen($binStr) == 8){

			for($i = 0; $i < 8; $i++){
				$bytes .= sprintf("%08b", ord($binStr[$i]));
			}

			if($bytes[0] == "1"){
				$out = "";
				$mode = "init";

				for($i = strlen($bytes)-1; $i >= 0; $i--){
					if($mode != "init"){
						$out = ($bytes[$i] == "0" ? "1" : "0").$out;
					}
					else{
						if($bytes[$i] == "1"){
							$out = "1".$out;
							$mode = "invert";
						}
						else{
							$out = "0".$out;
						}
					}
				}

				return bindec($out) * (-1);
			}
		}
		else{
			die("Error: int type have 4 bytes.\n");
		}
		return bindec($bytes);
	}

	function checkServ($host, $port){
		$packet = pack("N", 9).pack("c", 42).pack("n", -1).pack("c", 1).pack("c", 111).pack("N", 0);
		$socket = fsockopen($host, $port, $errno, $errstr, 1);

		if($socket && $errno ==0){
			fputs($socket, $packet);
			fread($socket, 4); //buffer size

			$timestamp = readInt64($socket);
			fread($socket, 12);

			$version = round(readFloat($socket), 5);
			fread($socket, 2);

			$name = readStr($socket);
			fread($socket, 2);

			$desc = readStr($socket);
			fread($socket, 1); //unkown bytes

			$startTime = readInt64($socket);
			fread($socket, 1); //unkown bytes

			$connected = readInt32($socket);
			fread($socket, 1); //unkown bytes

			$maxPlayer = readInt32($socket);

			$return = array(
				'online' => true,
				'timestamp' => $timestamp,
				'version' => $version,
				'name' => $name,
				'description' => $desc,
				'startTime' => $startTime,
				'connected' => $connected,
				'maxPlayer' => $maxPlayer
			);
		}
		else{
			$return = array(
				'online' => false,
				'timestamp' => round(microtime(1) * 1000),
				'version' => 'unknown',
				'name' => 'unknown',
				'description' => 'unknown',
				'startTime' => 0,
				'connected' => 'unknown',
				'maxPlayer' => 'unknown'
			);
		}

		return $return;
	}

	function hexReverse($hex){
		$return = "";
		$hexArr = explode(" ", $hex);

		foreach ($hexArr as $i) {
			$return = $i . " " . $return;
		}

		$return = substr($return, 0, -1);
		return $return;
	}

	function hexify($hex){
		static $hexVal = array(
			'0'=>0,		'1'=>1,		'2'=>2,		'3'=>3,
			'4'=>4,		'5'=>5,		'6'=>6,		'7'=>7,
			'8'=>8,		'9'=>9,		'A'=>10,	'B'=>11,
			'C'=>12,	'D'=>13,	'E'=>14,	'F'=>15,
			'a'=>10,	'b'=>11,	'c'=>12,	'd'=>13,
			'e'=>14,	'f'=>15,
		);
		$return = '';
		$hexArr = explode(' ', $hex);

		foreach ($hexArr as $i) {

			if (!ctype_xdigit($i)){
				return false;
			}

			$tmp = $hexVal[$i{0}] * 16 + $hexVal[$i{1}];
			$return .= chr($tmp);
		}

		return $return;
	}

	function readFloat($stream){
		return binFloat(fread($stream, 4));
	}

	function readInt16($stream){
		return binInt16(fread($stream, 2));
	}

	function readInt32($stream){
		return binInt32(fread($stream, 4));
	}

	function readInt64($stream){
		return binInt64(fread($stream, 8));
	}

	function readStr($stream){
		$strLength = bindec(sprintf("%08b", ord(fread($stream, 1))));
		return fread($stream, $strLength);
	}
?>