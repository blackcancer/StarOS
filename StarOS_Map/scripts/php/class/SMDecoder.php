<?php
	/*
		Based on: SMDecoder Class
		Description: Intergrate Starmade files within your own projects.
		License: http://creativecommons.org/licenses/by/3.0/legalcode
		FileVersion: 0.5
		Date: 2013-08-29
		By Blackcancer
		website: http://initsysrev.net
		support: blackcancer@initsysrev.net
	*/

	header('Content-Type: text/html; charset=UTF-8');

	define("NULL32", "00000000000000000000000000000000");
	define("NULL64", "0000000000000000000000000000000000000000000000000000000000000000");
	define("NULLFLOAT", 0.0);

	class SMDecoder {
		
		
		public function decodeSMFile($file){
			$entity = array();
			$data = file_get_contents($file);
			$ext = pathinfo($file, PATHINFO_EXTENSION);
			
			switch($ext){                                
				case "fac":
					$entity = $this->decodeFac($data);
					break;
				case "ent":
					$type = $this->getType($file);
					switch($type){
						case 6:
							$entity = $this->decodePlayChar($data, $type);
							break;
						case 7:
							$entity = $this->decodePlayState($data, $file);
							break;
						default:
							$entity = $this->decodeEnt($data, $type);
							break;
					}
					break;
				case "cat":
					$entity = $this->decodeCat($data);
					break;
				case "smbph":
					$entity = $this->decodeHeader($file);
					break;
				case "smbpl":
					$entity = $this->decodeLogic($file);
					break;
				case "smbpm":
					$entity = $this->decodeMeta($file);
					break;
				case "smd2":
					echo "starmade mesh file format";
					break;
				default:
					die("Unknown file format");
			}
			return $entity;
		}
		

	//============================= Faction Decoder =============================//

		private function decodeFac($data){
			$faction = array();
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
		private function decodeEnt($data, $type){
			$arr = array();
			
			$arr['uid'] = $this->getUID($data);					//get Unique ID
			$arr['type'] = $type;								//get Type
			$arr['name'] = $this->getName($data);				//get Name
			$arr['mass'] = (float)$this->getMass($data);		//get Mass
			if($type == 2 || $type == 4 || $type == 5){
				$arr['pw'] = (double)$this->getPw($data);		//get Power Capacity
				$arr['sh'] = (double)$this->getSh($data);		//get Shield Capacity
			} else {
				$arr['pw'] = (double)0;							//set Power Capacity 0
				$arr['sh'] = (double)0;							//set Shield Capacity 0
			}
			$arr['fid'] = $this->getFID($data);					//get Faction ID
			$arr['AIConfig'] = $this->getAI($data);				//get AIConfig
			$arr['container'] = $this->getContenairs($data); 	//get inventory and content
			$creation = $this->getCreation($data);
			if($creation[0] == chr(0)){
				$creation[0] = "<system>";
			}
			if($creation[1] == chr(0)){
				$creation[1] = "";
			}
			$arr['creator'] = $creation[0];						//get Creator
			$arr['lastMod'] = $creation[1];						//get Last_Mod
			$arr['sPos'] = $this->getSecPos($data);				//get sPos
			$transform = $this->getTransform($data, $arr['type']);
			$arr['transformX'] = $transform['x'];				//get transformX
			$arr['transformY'] = $transform['y'];				//get transformY
			$arr['transformZ'] = $transform['z'];				//get transformZ
			$arr['localPos'] = $transform['o'];					//get LocalPos
			$arr['dim'] = $this->getDim($data);					//get DIM
			$arr['genId'] = $creation[2];						//get Gen_ID
			
			return $arr;	
		}
		
		private function decodePlayChar($data, $type){
			$arr = array();
			
			preg_match('/(?:PLAYERCHARACTER_)(.+)(?:.ent)/', $file, $matches);
			$arr['type'] = $type;
			$arr['name'] = $matches[1];
			$arr['mass'] = (float)$this->getMass($data);		//get Mass
			$arr['sPos'] = $this->getSecPos($data);				//get sPos
			$transform = $this->getTransform($data, $entity['Type']);
			$arr['transformX'] = $transform['x'];				//get transformX
			$arr['transformY'] = $transform['y'];				//get transformY
			$arr['transformZ'] = $transform['z'];				//get transformZ
			$arr['localPos'] = $transform['o'];					//get LocalPos
			
			return $arr;
		}
		
		private function decodePlayState($data, $file){
			$arr = array();
			preg_match('/(?:PLAYERSTATE_)(.+)(?:.ent)/', $file, $matches);
			$arr['name'] = $matches[1];
			$arr['credits'] = $this->getCredits($data);
			$arr['inventory'] = $this->getPlayInv($data);
			$arr['spawn'] = $this->getSpawn($data);
			$arr['sector'] = $this->getSector($data);
			$arr['lspawn'] = $this->getLspawn($data);
			$arr['lsector'] = $this->getLsector($data);
			$arr['fid'] = $this->getPFac($data);
			
			return $arr;
		}
		
		//========== sub function ==========//
		public function getUID($data){
			preg_match('/(?:ENTITY_)(.+)(?:)/', $data, $matches);
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
			preg_match('/(?:\x00\x08realname)(.+)(?:\x0d\x00)/Us', $data, $matches);
			$dump = substr($matches[1],2);
			return $dump;
		}
		
		private function getMass($data){
			preg_match('/(?:\x00\x04mass)(.+)(?:\x0C\x00\x09transform)/Us', $data, $matches);
			$dump = $matches[1];
			return round(binFloat($dump), 1);
		}
		
		private function getPw($data){
			preg_match('/(?:\x00\x02pw)(.+)(?:\x06\x00\x02sh)/Us', $data, $matches);
			$dump = $matches[1];
			return round(binDouble($dump),1);
		}
		
		private function getSh($data){
			preg_match('/(?:\x00\x02sh)(.+)(?:ex)/Us', $data, $matches);
			$dump = substr($matches[1],0,-3);
			return round(binDouble($dump),1);
		}
		
		private function getFID($data){
			preg_match('/(?:\x00\x03fid)(.+)(?:\x08\x00\x03own)/Us', $data, $matches);
			$dump = $matches[1];
			return binInt($dump);
		}
		
		private function getCreation($data){
			preg_match('/(?:\x00\x0AcreatoreId)(.+)(?:)/', $data, $matches);
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
			preg_match('/(?:\x00\x04sPos)(.+)(?:\x03\x00\x03fid)/Us', $data, $matches);
			$dump = str_split($matches[1],4);
			$arr = array(
				'x' => binInt($dump[0]),
				'y' => binInt($dump[1]),
				'z' => binInt($dump[2])
			);
			return $arr;
		}
		
		private function getTransform($data, $type){
			
			preg_match('/(?:\x00\x09transform\x05\x00\x00\x00\x10)(.+)(?:[\x02]|[\x0D]\x00)/s', $data, $matches);
			$dump = str_split($matches[1],4);
			$xArr = array(
				'x' => binFloat($dump[0]),
				'y' => binFloat($dump[1]),
				'z' => binFloat($dump[2])
			);
			$yArr = array(
				'x' => binFloat($dump[4]),
				'y' => binFloat($dump[5]),
				'z' => binFloat($dump[6])
			);
			$zArr = array(
				'x' => binFloat($dump[8]),
				'y' => binFloat($dump[9]),
				'z' => binFloat($dump[10])
			);
			$oArr = array(
				'x' => binFloat($dump[12]),
				'y' => binFloat($dump[13]),
				'z' => binFloat($dump[14])
			);
			$coords = array(
				'x' => $xArr,
				'y' => $yArr,
				'z' => $zArr,
				'o' => $oArr,
				'float' => binFloat($dump[15])
			);
			return $coords;
		}
		
		private function getDim($data){
			$chrs = chr(243).chr(248);
			preg_match('/(?:\x00\x06maxPos)(.+)(?:\x0A\x00\x06minPos)/Us', $data, $matches1);
			preg_match('/(?:\x00\x06minPos)(.+)(?:'.$chrs.'\x00\x04NONE)/', $data, $matches2);
			$dump1 = str_split($matches1[1],4);
			$dump2 = str_split($matches2[1],4);
			
			$maxPos = array(
				'x' => binInt($dump1[0]),
				'y' => binInt($dump1[1]),
				'z' => binInt($dump1[2])
			);
			
			$minPos = array(
				'x' => binInt($dump2[0]),
				'y' => binInt($dump2[1]),
				'z' => binInt($dump2[2])
			);
			
			$dimArr = array(
				'maxPos' => $maxPos,
				'minPos' => $minPos
			);
			
			return $dimArr;
		}
		
		private function getAI($data){
			if(preg_match('/\x00\x04noAI\x00\x0A/Us', $data)) return "noAI";
			$str = "\x08\x00\x05state\x00";
			preg_match('/(?:\x00\x06AIM_AT\x08\x00\x05state\x00)(.+)(?:\x00\x0D)/Us', $data, $matches1);
			preg_match('/(?:\x00\x04TYPE\x08\x00\x05state\x00)(.+)(?:\x00\x0D)/Us', $data, $matches2);
			preg_match('/(?:\x00\x06ACTIVE\x08\x00\x05state\x00)(.+)(?:\x00\x00)/Us', $data, $matches3);
			$dump1 = substr($matches1[1], 1);
			$dump2 = substr($matches2[1], 1);
			$dump3 = substr($matches3[1], 1);
			
			$arr = array(
				'AIM_AT' => $dump1,
				'TYPE' => $dump2,
				'ACTIVE' => $dump3
			);
			
			return $arr;
		}
		
		private function getContenairs($data){
			if(preg_match('/\x00\x13controllerStructure\x00\x0D/Us', $data))return "noInventory";
			preg_match('/(?:\x00\x09inventory)(.+)(?:\x00\x08shipMan0)/Us', $data, $matches);
			$str = chr(0).chr(9)."inventory".chr(3);
			$inventory = explode($str , $matches[1]);
			$returnArr = array();
			for($i = 0; $i < count($inventory); $i++){
				$arr = explode("\x0D\x00",$inventory[$i]);
				$index1 = explode("index", $arr[0]);
				$index1 = str_split($index1[1], 4);
				$pos = array(
					'x' => binInt($index1[0]),
					'y' => binInt($index1[1]),
					'z' => binInt($index1[2])
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
				if(count($valueList))
					$valueList[$slotsUsed -1] = substr($valueList[$slotsUsed -1], 0, 4);
				for($j = 0; $j < $slotsUsed; $j++){
					$blockId = $blocksList[$j];
					$byte = null;
					for($x = 0; $x < 2; $x++){
						$byte .= sprintf("%08b", ord($blockId[$x]));
					}
					$blockId = bindec($byte);
					$slotsArr[binInt($slotsList[$j])] = array (
						'block' => $blockId,
						'qty' => binInt($valueList[$j])
					);
				}
				$returnArr[$i] = array(
					'pos' => $pos,
					'slots' => $slotsArr
				);
				
			}
			return $returnArr;
		}
		
		private function getWeapons($data){
		}
		
		private function getCredits($data){
			preg_match('/(?:\x00\x07credits)(.+)(?:\x09\x00\x05spawn)/', $data, $matches);
			$dump = $matches[1];
			return binInt($dump);
		}
		
		private function getPlayInv($data){
			preg_match('/(?:\x00\x05slots\x03)(.+)(?:\x0C\x00\x05types)/Us', $data, $matches1);
			preg_match('/(?:\x00\x05types\x02\x00\x00)(.+)(?:\x0D\x00\x06values)/Us', $data, $matches2);
			preg_match('/(?:\x00\x06values)(.+)(?:\x0A\x00\x06sector)/Us', $data, $matches3);
			$slots = str_split($matches1[1], 4);
			$blocks = str_split($matches2[1], 2);
			$qtys = str_split($matches3[1], 5);
			var_dump($slots);
			var_dump($blocks);
			var_dump($qtys);
			
			for($i = 0; $i < count($qtys); $i++){
				$qtys[$i] = substr($qtys[$i], 1);
			}
			
			$inv = array();
			for($i = 0; $i < count($slots) - 1; $i++){
				$str = $blocks[$i];
				$byte = null;
				for($j = 0; $j < 2; $j++){
					$byte .= sprintf("%08b", ord($str[$j]));
				}
				$inv[binInt($slots[$i])] = array(
					'block' => bindec($byte),
					'qty' => binInt($qtys[$i])
				);
			}
			
			return $inv;
		}
		
		private function getSpawn($data){
			preg_match('/(?:\x00\x05spawn)(.+)(?:\x0D\x00\x09)/', $data, $matches);
			$dump = str_split($matches[1], 4);
			$xArr = array(
				'x' => binFloat($dump[0]),
				'y' => binFloat($dump[1]),
				'z' => binFloat($dump[2])
			);
			return $xArr;
		}
		
		private function getSector($data){
			preg_match('/(?:\x00\x06sector)(.+)(?:\x09\x00\x6lspawn)/', $data, $matches);
			$dump = str_split($matches[1], 4);
			$xArr = array(
				'x' => binInt($dump[0]),
				'y' => binInt($dump[1]),
				'z' => binInt($dump[2])
			);
			return $xArr;
		}
		
		private function getLspawn($data){
			preg_match('/(?:\x00\x06lspawn)(.+)(?:\x0A\x00\x07)/', $data, $matches);
			$dump = str_split($matches[1], 4);
			$xArr = array(
				'x' => binFloat($dump[0]),
				'y' => binFloat($dump[1]),
				'z' => binFloat($dump[2])
			);
			return $xArr;
		}
		
		private function getLsector($data){
			preg_match('/(?:\x00\x07lsector)(.+)(?:\x0D\x00\x07)/', $data, $matches);
			$dump = str_split($matches[1], 4);
			$xArr = array(
				'x' => binInt($dump[0]),
				'y' => binInt($dump[1]),
				'z' => binInt($dump[2])
			);
			return $xArr;
		}
		
		private function getPFac($data){
			preg_match('/(?:\x00\x07pFac-v0\xFD)(.+)(?:\x00\xFC)/', $data, $matches);
			$dump = $matches[1];
			return binInt($dump);
		}

		
	//============================= Catalog Decoder =============================//

		private function decodeCat($data){
			$catalog = array();
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
		
		
	//============================= Header Decoder =============================//
	
		private function decodeHeader($file){
			$header = array();
			
			$stream = fopen($file, "rb");
			$header['int_a'] = $this->readInt32($stream);
			$header['int_b'] = $this->readInt32($stream);
			$header['bounds_a'] = array($this->readFloat($stream), $this->readFloat($stream), $this->readFloat($stream));
			$header['bounds_b'] = array($this->readFloat($stream), $this->readFloat($stream), $this->readFloat($stream));
			$blockTblLen = $this->readInt32($stream);
			$header['blockTableLen'] = $blockTblLen;
			$header['blocks'] = array();
			for($i = 0; $i < $blockTblLen; $i++){
				$index = $this->readInt16($stream);
				$qty = $this->readInt32($stream);
				$header['blocks'][$index] = $qty;
			}
			fclose($stream);
			return $header;
		}
		
		
	//============================= Logic Decoder =============================//
	
		private function decodeLogic($file){
			$logic = array();
			
			$stream = fopen($file, "rb");
			$fileSize = filesize($file);
			while (ftell($stream) < $fileSize){
				$logic['int_a'] = $this->readInt32($stream);
				$numControls = $this->readInt32($stream);
				
				$logic['controllers'] = array();
				
				for($i = 0; $i < $numControls; $i++){
					$dict = array();
					$dict['pos'] = array($this->readInt16($stream), $this->readInt16($stream), $this->readInt16($stream));
					$numGroups = $this->readInt32($stream);
					$dict['q'] = array();
					
					for($j = 0; $j < $numGroups; $j++){
						$tag = $this->readInt16($stream);
						$numBlocks = $this->readInt32($stream);
						
						$dict['q'][$tag] = array();
						
						for($x = 0; $x < $numBlocks; $x++){
							array_push($dict['q'][$tag], array($this->readInt16($stream), $this->readInt16($stream), $this->readInt16($stream)));
						}
					}
					array_push($logic['controllers'], $dict);
				}
			}
			fclose($stream);
			return $logic;
		}
	
	
	//============================= Meta Decoder =============================//
	
		private function decodeMeta($file){
			$meta = array();
			
			$stream = fopen($file, "rb");
			$fileSize = filesize($file);
			$meta['int_a'] = $this->readInt32($stream);
			$meta['byte_a'] = bindec(sprintf("%08b", ord(fread($stream, 1))));
			
			if($meta['byte_a'] == 3){
				$numDocked = $this->readInt32($stream);
				$meta['docked'] = array();
				for($i = 0; $i < $numDocked; $i++){
					$nLenght = bindec(fread($stream, 1));
					$name = fread($stream, $nLenght);
					$q = array($this->readInt32($stream), $this->readInt32($stream), $this->readInt32($stream));
					$a = array($this->bin2Float($stream), $this->bin2Float($stream), $this->bin2Float($stream));
					$docking = $this->readInt16($stream);
					$arr = array(
						'name' => $name,
						'q' => $q,
						'a' => $a,
						'dockID' => $docking
					);
					array_push($meta['docked'], $arr);
				}
				$meta['byte_b'] = bindec(sprintf("%08b", ord(fread($stream, 1))));
				fread($stream, 4);
				$index1 = $this->readStr($stream);
				$meta[$index1] = array();
				fread($stream, 2);
				$index2 = $this->readStr($stream);
				$meta[$index1][$index2] = array();
				if(fread($stream, 1) != "\x00"){
				}
				fread($stream, 2);
				$index1 = $this->readStr($stream);
				$meta[$index1] = array();
			}
			fclose($stream);
			
			return $meta;
		}
		
	
	//============================= Old Binary Decoder =============================//
	
	//DEPRECATED===================================================================>//
		private function readInvStruct($arr, $stream){
			
		}
		private function readStr($stream){
			$strLength = bindec(sprintf("%08b", ord(fread($stream, 1))));
			return fread($stream, $strLength);
		}
	
		private function readInt16($stream){
			$read = fread($stream, 2);
			$byte = null;
			for($i = 0; $i < 2; $i++){
				$byte .= sprintf("%08b", ord($read[$i]));
			}
			return bindec($byte);
		}
	
		private function readInt32($stream){
			$read = fread($stream, 4);
			$byte = null;
			for($i = 0; $i < 4; $i++){
				$byte .= sprintf("%08b", ord($read[$i]));
			}
			return $this->bin2Int($byte);
		}
		
		private function readFloat($stream){
			$read = fread($stream, 4);
			$byte = null;
			for($i = 0; $i < 4; $i++){
				$byte .= sprintf("%08b", ord($read[$i]));
			}
			return $this->bin2Float($byte);
		}
		
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
				if($data === NULL32){
					return NULLFLOAT;
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
				if($data === NULL64){
					return NULL64;
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
	//<=========================================================================DEPRECATED//

	//============================= Other StarMade Functions =============================//

		private function getServerInfo(){
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
	
	function binInt($str){
		if(strlen($str) != 4){
			die("Error: Invalide byte format.\n");
		}
		else{
			$byte = null;
			for($i = 0; $i < 4; $i++){
				$byte .= sprintf("%08b", ord($str[$i]));
			}
			if($byte[0] == "1"){
				$out = "";
				$mode = "init";
				for($x = strlen($byte)-1; $x >= 0; $x--) {
					if($mode != "init")
						$out = ($byte[$x] == "0" ? "1" : "0").$out;
					else{
						if($byte[$x] == "1"){
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
				return bindec($byte);
			}
		}
	}
	
	function binFloat($str){
		if(strlen($str) != 4){
			die("Error: Invalide byte format.\n");
		}
		else{
			$byte = null;
			for($i = 0; $i < 4; $i++){
				$byte .= sprintf("%08b", ord($str[$i]));
			}
			if($byte === NULL32){
				return NULLFLOAT;
			}
			else{
				$hex = substr(chunk_split(base_convert($byte, 2, 16), 2, " "), 0, -1);
				$hexRev = hexReverse($hex);
				$hexi = hexify($hexRev);
				if($hexi === false) die("Invalid input\n");
				$decode = unpack("f", $hexi);
				if($decode[1] == -0){
					$decode[1] = (float)0;
				}
				return $decode[1];
			}
		}
	}
	
	function binDouble($str){
		if(strlen($str) != 8){
			die("Error: Invalide byte format.\n");
		}
		else{
			$byte = null;
			for($i = 0; $i < 8; $i++){
				$byte .= sprintf("%08b", ord($str[$i]));
			}
			if($byte === NULL64){
				return NULLFLOAT;
			}
			else{
				$hex = substr(chunk_split(base_convert($byte, 2, 16), 2, " "), 0, -1);
				$hexRev = hexReverse($hex);
				$hexi = hexify($hexRev);
				if($hexi === false) die("Invalid input\n");
				$decode = unpack("d", $hexi);
				return $decode[1];
			}
		}
	}
	
	function hexReverse($hex){
		$r = '';
		$hexArray = explode(' ', $hex);
		foreach ($hexArray as $z) {
			$r = $z . ' ' . $r;
		}
		return substr($r, 0, -1);
	}
	
	function hexify($hex){
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
	
	function si2bin($si, $bits=32) {
		if ($si >= -pow(2,$bits-1) and $si <= pow(2,$bits-1) ){
			if ($si >= 0){ // positive or zero
			
				$bin = base_convert($si,10,2);
				// pad to $bits bit
				$bin_length = strlen($bin);
				if ($bin_length < $bits) $bin = str_repeat ( "0", $bits-$bin_length).$bin;
			}
			else{// negative
			
				$si = -$si-pow(2,$bits);
				$bin = base_convert($si,10,2);
				$bin_length = strlen($bin);
				if ($bin_length > $bits) $bin = str_repeat ( "1", $bits-$bin_length).$bin;
			}
			return $bin;
		}
	} 
	
	function is_VectorArr($arr, $type){
		if(!is_array($arr)){
			return false;
		}
		if(count($arr) != 3){
			return false;
		}
		for($i = 0; $i < count($arr); $i++){
			switch($type){
				case "i":
					if(!is_int($arr[$i])){
						return false;
					}
					break;
				case "f":
					if(!is_float($arr[$i])){
						return false;
					}
					break;
				case "d":
					if(!is_double($arr[$i])){
						return false;
					}
					break;
				case "a":
					if(!is_array($arr[$i])){
						return false;
					}
					break;
				default:
					return false;
					break;
			}
		}
		
		return true;
	}
?>