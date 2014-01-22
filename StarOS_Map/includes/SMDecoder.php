<?php
	/*
		Product: SMDecoder Class
		Description: Intergrate Starmade files within your own projects.
		License: http://creativecommons.org/licenses/by/3.0/legalcode

		FileVersion: 0.6-rev00001						Date: 2014-01-03
		By Blackcancer
		
		website: http://initsysrev.net
		support: blackcancer@initsysrev.net

		Header, Logic, Meta and Modele are adapted from "blueprint.py" by tambry.
		Information about files structure can be found on StarMade wiki:
		http://http://www.starmadewiki.com/wiki/File_format
	*/

	header('Content-Type: text/html; charset=UTF-8');

	define("NULL32", "00000000000000000000000000000000");
	define("NULL64", "0000000000000000000000000000000000000000000000000000000000000000");
	define("NULLFLOAT", 0.0);
	
	define("TAG_STR_BYTE", 		chr(1));
	define("TAG_STR_SHORT", 	chr(2));
	define("TAG_STR_INT", 		chr(3));
	define("TAG_STR_LONG", 		chr(4));
	define("TAG_STR_FLOAT", 	chr(5));
	define("TAG_STR_DOUBLE", 	chr(6));
	define("TAG_STR_BYTEARRAY", chr(7));
	define("TAG_STR_STRING", 	chr(8));
	define("TAG_STR_FLOAT3", 	chr(9));
	define("TAG_STR_INT3",		chr(10));
	define("TAG_STR_BYTE3", 	chr(11));
	define("TAG_STR_LIST",		chr(12));
	define("TAG_STR_STRUCT",	chr(13));
	define("TAG_STR_SERIAL",	chr(14));
	
	define("TAG_ARRAYDATA",		chr(243));
	define("TAG_INT3",			chr(246));
	define("TAG_STRING",		chr(248));
	define("TAG_DOUBLE",		chr(250));
	define("TAG_FLOAT",			chr(251));
	define("TAG_LONG",			chr(252));
	define("TAG_INT",			chr(253));
	define("TAG_SHORT",			chr(254));
	define("TAG_BYTE",			chr(255));



	class SMDecoder{
		private $stream;
		private $type;
		
		public function decodeSMFile($file, $formated = false){
			$ent = array();
			$this->stream = fopen($file, "rb");
			$ext = pathinfo($file, PATHINFO_EXTENSION);

			switch($ext){
				case "cat":
					$ent = $this->mainDecoder();
					if($formated){
						$ent = $this->formatCat($ent);
					}
					break;

				case "ent":
					$ent = $this->mainDecoder();
					if($formated){
						$this->type = $this->getEntType($file);
						switch($this->type){
							case 1:
								$ent = $this->formatShop($ent);
								break;

							case 2:
								$ent = $this->formatStation($ent);
								break;

							case 3:
								$ent = $this->formatAst($ent);
								break;

							case 4:
								$ent = $this->formatPlan($ent);
								break;

							case 5:
								$ent = $this->formatShip($ent);
								break;

							case 6:
								preg_match('/(?:PLAYERCHARACTER_)(.+)(?:.ent)/', $file, $matches);
								$pseudo = $matches[1];
								$ent = $this->formatChar($ent, $pseudo);
								break;

							case 7:
								preg_match('/(?:PLAYERSTATE_)(.+)(?:.ent)/', $file, $matches);
								$pseudo = $matches[1];
								$ent = $this->formatStats($ent, $pseudo);
								break;
						}
					}
					break;

				case "fac":
					$ent = $this->mainDecoder();
					if($formated){
						$ent = $this->formatFac($ent);
					}
					break;

				case "smbph":
					$ent = $this->decodeHeader();
					break;

				case "smbpl":
					$fileSize = filesize($file);
					$ent = $this->decodeLogic($fileSize);
					break;

				case "smbpm":
					$fileSize = filesize($file);
					$ent = $this->decodeMeta($fileSize);
					break;

				case "smd2":
					$fileSize = filesize($file);
					$ent = $this->decodeModel($fileSize);
					break;

				default:
					die("Unknown file format");
			}
			fclose($this->stream);
			return $ent;
		}


		//============================= Main Decoder =============================//

		private function mainDecoder(){
			$data = array();
			$data['short_a'] = $this->readInt16();
			$type = $this->readByte();

			while($type != ''){
				
				$resp = $this->parseTag($type);
				
				if(isset($resp['name'])){
					$data[$resp['name']] = $resp['data'];
				}
				else{
					array_push($data, $resp);
				}

				$type = $this->readByte();
			}

			return $data;
		}


		//============================= Entity Decoder  =============================//

		private function getEntType($file){

			if(strpos($file, 'SHOP') !== false){
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
			}

			return -1;
		}


		//============================= Header Decoder  =============================//

		private function decodeHeader(){
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

			$return['int_a'] = $this->readInt32();
			$return['int_b'] = $this->readInt32();
			$return['bounds_a'] = array($this->readFloat(), $this->readFloat(), $this->readFloat());
			$return['bounds_b'] = array($this->readFloat(), $this->readFloat(), $this->readFloat());
			$blockTblLen = $this->readInt32();
			$return['blockTableLen'] = $blockTblLen;
			$return['blocks'] = array();

			for($i = 0; $i < $blockTblLen; $i++){
				$index = $this->readInt16();
				$qty = $this->readInt32();
				$return['blocks'][$index] = $qty;
			}
			return $return;
		}


		//============================= Logic Decoder   =============================//

		private function decodeLogic($fileSize){
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

			$return = array();

			while (ftell($this->stream) < $fileSize){
				$return['int_a'] = $this->readInt32();
				$numControls = $this->readInt32();
				$return['controllers'] = array();

				for($i = 0; $i < $numControls; $i++){
					$dict = array();
					$dict['pos'] = array($this->readInt16(), $this->readInt16(), $this->readInt16());
					$numGroups = $this->readInt32();
					$dict['q'] = array();

					for($j = 0; $j < $numGroups; $j++){
						$tag = $this->readInt16();
						$numBlocks = $this->readInt32();
						$dict['q'][$tag] = array();

						for($x = 0; $x < $numBlocks; $x++){
							array_push($dict['q'][$tag], array($this->readInt16(), $this->readInt16(), $this->readInt16()));
						}
					}
					array_push($return['controllers'], $dict);
				}
			}
			return $return;
		}


		//============================= Meta Decoder    =============================//

		private function decodeMeta($fileSize){
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

			$return['int_a'] = $this->readInt32();
			$return['byte_a'] = $this->readInt8();

			if($return['byte_a'] == 3){
				$numDocked = $this->readInt32();
				$return['docked'] = array();

				for($i = 0; $i < $numDocked; $i++){
					$name = $this->readString();
					$q = array($this->readInt32(), $this->readInt32(), $this->readInt32());
					$a = array($this->readFloat(), $this->readFloat(), $this->readFloat());
					$docking = $this->readInt16();

					$arr = array(
						'name' => $name,
						'q' => $q,
						'a' => $a,
						'dockID' => $docking
					);
					array_push($return['docked'], $arr);
				}

				$return['byte_b'] = $this->readByte();
				$return['gzip'] = $this->readInt16();

				$type = $this->readByte();
				while($type != ''){

					$resp = $this->parseTag($type);

					if(isset($resp['name'])){
						$return[$resp['name']] = $resp['data'];
					}
					else{
						array_push($return, $resp);
					}

					$type = $this->readByte();
				}
			}

			return $return;
		}


		//============================= Modele Decoder  =============================//

		private function decodeModel($fileSize){

			/*
				Read a starmade data file (.smd2)
				
				This function will probably be really inefficient for large ships!
				
				 start     type
					0         int                       unknown int
					4         chunkIndex[16][16][16]      chunkIndex struct (see below) arranged in a 16x16x16 array
					32772     long[16][16][16]          chunk timestamp information arranged in a 16x16x16 array
					65540     chunkData[]               5120 byte chunks
			
					Note that there may exist chunk timestamps and chunks that are not referenced in the chunkIndex table and seemingly serve no purpose.
					
					chunkIndex is an 8 byte struct
						int     chunkId     Index into the chunkData[] array.  If no chunk exists for this point in the array, chunkId = -1
						int     chunklen    The total chunk size in bytes (excluding the zero padding).  Equal to the chunk's "inlen" field plus 25 (the chunk header size)
					
					chunkData is a 5120 byte structure
						long    timestamp   Unix timestamp in milliseconds
						int[3]  q           Relative chunk position
						int     type        Chunk type (?) usually 0x1
						int     inlen       Compressed data length
						byte    data[inlen] ZLIB-compressed data of rawChunkData[16][16][16]
						byte    padding[]   Zero padded to 5120 byte boundary
					
					rawChunkData is a 3 byte bitfield
						Bits
						23-21   3 lower bits of orientation
						20      isActive or MSB of the orientation
						19-11   hitpoints
						10-0    blockID
			*/

			$data = array();

			$data['filelen'] = $fileSize;
			$numChunks = ($fileSize - 4 - 32768 - 32768) / 5120;

			$data['int_a'] = $this->readInt32();
			$data['chunkIndex'] = array();
			$data['chunkTimestamps'] = array();
			$data['chunks'] = array();

			//First 32KB area
			for($i = 0; $i < 4096; $i++){
				$chunkId = $this->readInt32();
				$chunkLen = $this->readInt32();

				if($chunkId != -1){
					$pos = array($i % 16, ($i / 16) % 16, ($i / 256) % 16);
					$pos = array(16 * ($pos[0] - 8), 16 * ($pos[1] - 8), 16 * ($pos[2] - 8));
					$posStr = $pos[0].','.$pos[1].','.$pos[2];
					
					$data['chunkIndex'][$posStr] = array(
						'id' => $chunkId,
						'len' => $chunkLen
					);
				}
			}

			//Second 32KB area
			for($i = 0; $i < 4096; $i++){
				$timestamp = $this->readInt64();

				if($timestamp > 0){
					$pos = array($i % 16, ($i / 16) % 16, ($i / 256) % 16);
					$pos = array(16 * ($pos[0] - 8), 16 * ($pos[1] - 8), 16 * ($pos[2] - 8));
					$posStr = $pos[0].','.$pos[1].','.$pos[2];

					$data['chunkTimestamps'][$posStr] = $timestamp;
				}
			}

			for($chunk = 0; $chunk < $numChunks; $chunk++){
				$chunkDict = array();
				$chunkDict['blocks'] = array();
				$chunkDict['timestamp'] = $this->readInt64();
				$chunkDict['pos'] = array($this->readInt32(), $this->readInt32(), $this->readInt32());
				$chunkDict['type'] = $this->readByte();
				$inLen = $this->readInt32();

				$inData = $this->readBytes(5120-25);
				$outData = gzuncompress($inData);

				for($block = 0; $block < 16*16*16; $block++){
					$idx = $block * 3;
					$str = chr(0);
					for($i = 0; $i < 3; $i++){
						$str .= $outData[$idx + $i];
					}
					$blockData = $this->binToInt32($str);
					$blockId = $this->bits($blockData, 0, 11);

					if($blockId != 0){
						$pos = array($block % 16, ($block / 16) % 16, ($block / 256) % 16);
						$posStr = $pos[0].','.$pos[1].','.$pos[2];

						$chunkDict['blocks'][$posStr] = array(
							'id' => $blockId,
							'hp' => $this->bits($blockData, 11, 9),
							'active' => $this->bits($blockData, 20, 1),
							'orient' => $this->bits($blockData, 21, 3)
						);
					}

				}

				array_push($data['chunks'], $chunkDict);
			}

			return $data;			
		}


		//===========================================================================//

		public function checkServ($host, $port){

			$packet = pack("N", 9).pack("c", 42).pack("n", -1).pack("c", 1).pack("c", 111).pack("N", 0);
			$this->stream = fsockopen($host, $port, $errno, $errstr, 1);

			if($this->stream && $errno ==0){
				fputs($this->stream, $packet);
				$this->readBytes(4); //buffer size

				$timestamp = $this->readInt64();
				
				$this->readBytes(8); //unknown bytes, probably type long
				
				$this->readBytes(1); //tag 0x07 type short
				$this->readInt16(); //unknow short

				$this->readBytes(1); //tag 0x03 type float
				$version = round($this->readFloat(), 5);
				
				$this->readBytes(1); //tag 0x04 type string
				$name = $this->readString();

				$this->readBytes(1); //tag 0x04 type string
				$desc = $this->readString();

				$this->readBytes(1); //tag 0x02 type long
				$startTime = $this->readInt64();

				$this->readBytes(1); //tag 0x01 type int32
				$connected = $this->readInt32();

				$this->readBytes(1); //tag 0x01 type int32
				$maxPlayer = $this->readInt32();

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


		//================================ Tag Parser ===============================//

		private function parseTag($type){
			$data = null;
			$listName = array(
				"AIElement",
				"wepContr",
				"PointDist",
				"inventory",
				"f0",
				"0FN",
				"FN",
				"fp-v0",
				"0"
			);

			switch($type){
				case TAG_STR_BYTE:
					$data['name'] = $this->readString();
					$data['data'] = $this->readInt8();
					break;

				case TAG_STR_SHORT:
					$data['name'] = $this->readString();
					$data['data'] = $this->readInt16();
					break;

				case TAG_STR_INT:
					$data['name'] = $this->readString();
					$data['data'] = $this->readInt32();
					break;

				case TAG_STR_LONG:
					$data['name'] = $this->readString();
					$data['data'] = $this->readInt64();
					break;

				case TAG_STR_FLOAT:
					$data['name'] = $this->readString();
					$data['data'] = $this->readFloat();
					break;

				case TAG_STR_DOUBLE:
					$data['name'] = $this->readString();
					$data['data'] = $this->readDouble();
					break;

				case TAG_STR_BYTEARRAY:
					$data['name'] = $this->readString();
					$data['data'] = array();
					$len = $this->readInt32();

					for($i = 0; $i < $len; $i++){
						array_push($data['data'], $this->readInt8());
					}

					break;

				case TAG_STR_STRING:
					$data['name'] = $this->readString();
					$data['data'] = $this->readString();
					break;

				case TAG_STR_FLOAT3:
					$data['name'] = $this->readString();
					$data['data'] = array($this->readFloat(), $this->readFloat(), $this->readFloat());
					break;

				case TAG_STR_INT3:
					$data['name'] = $this->readString();
					$data['data'] = array($this->readInt32(), $this->readInt32(), $this->readInt32());
					break;

				case TAG_STR_BYTE3:
					$data['name'] = $this->readString();
					$data['data'] = array($this->readInt8(), $this->readInt8(), $this->readInt8());
					break;

				case TAG_STR_LIST:
					$data['name'] = $this->readString();
					$data['data'] = array();
					$next = $this->readByte();
					$len = $this->readInt32();
					
					for($i = 0; $i < $len; $i++){
						array_push($data['data'], $this->parseList($next));
					}

					break;

				case TAG_STR_STRUCT:
					$data['name'] = $this->readString();
					$data['data'] = array();
					$next = $this->readByte();
					$i = 0;
					while($next != chr(0)){

						$resp = $this->parseTag($next);

						if(is_array($resp) && isset($resp['name'])){

							if(in_array($resp['name'], $listName)){
								$offset = $resp['name'] . $i;
								$data['data'][$offset] = $resp['data'];
								$i++;
							}
							else{
								$data['data'][$resp['name']] = $resp['data'];
								$i = 0;
							}

						}
						else{
							array_push($data['data'], $resp);
						}

						$next = $this->readByte();
					}

					break;

				case TAG_STR_SERIAL:
					$data['name'] = $this->readString();
					$data['data'] = '';
					$nextBytes = null;

					while($nextBytes != chr(8).chr(0).chr(8).'realname'){
						$data['data'] .= $this->readByte();
						$nextBytes = $this->readNextBytes(11);
					}

					break;

				case TAG_ARRAYDATA:
					$data = array();
					$next = $this->readByte();
					$i = 0;
					while($next != chr(0)){

						$resp = $this->parseTag($next);

						if(is_array($resp) && isset($resp['name'])){

							if(in_array($resp['name'], $listName)){
								$offset = $resp['name'] . $i;
								$data[$offset] = $resp['data'];
								$i++;
							}
							else{
								$data[$resp['name']] = $resp['data'];
								$i = 0;
							}

						}
						else{
							array_push($data, $resp);
						}

						$next = $this->readByte();

					}

					break;

				case TAG_INT3:
					$data = array($this->readInt32(), $this->readInt32(), $this->readInt32());
					break;

				case TAG_STRING:
					$data = $this->readString();
					break;

				case TAG_DOUBLE:
					$data = $this->readDouble();
					break;

				case TAG_FLOAT:
					$data = $this->readFloat();
					break;


				case TAG_LONG:
					$data = $this->readInt64();
					break;

				case TAG_INT:
					$data = $this->readInt32();
					break;

				case TAG_SHORT:
					$data = $this->readInt16();
					break;

				case TAG_BYTE:
					$data = $this->readInt8();
					break;

				default:
					echo 'Warning: Unrecognized tag type '. dechex(ord($type));
					break;
			}

			return $data;
		}

		private function parseList($type){
			$data = null;
			
			switch($type){
				case TAG_STR_BYTE:
					$data = $this->readInt8();
					break;

				case TAG_STR_SHORT:
					$data = $this->readInt16();
					break;

				case TAG_STR_INT:
					$data = $this->readInt32();
					break;

				case TAG_STR_LONG:
					$data = $this->readInt64();
					break;

				case TAG_STR_FLOAT:
					$data = $this->readFloat();
					break;

				case TAG_STR_DOUBLE:
					$data = $this->readDouble();
					break;

				case TAG_STR_BYTEARRAY:
					$data = array();
					$len = $this->readInt32();
					
					for($i = 0; $i < $len; $i++){
						array_push($data, $this->readInt8());
					}
					
					break;

				case TAG_STR_STRING:
					$data = $this->readString();
					break;

				case TAG_STR_FLOAT3:
					$data = array($this->readFloat(), $this->readFloat(), $this->readFloat());
					break;

				case TAG_STR_INT3:
					$data = array($this->readInt32(), $this->readInt32(), $this->readInt32());
					break;

				case TAG_STR_BYTE3:
					$data = array($this->readInt8(), $this->readInt8(), $this->readInt8());
					break;

				default:
					echo 'Warning: Unrecognized tag type '. dechex(ord($type));
					break;
			}

			return $data;
		}


		//============================= Object Formater =============================//

		private function formatCat($ent){
			$data = array();
			$ships = $ent['cv0']['pv0'];
			$rateList = $ent['cv0']['r0'];

			for($i = 0; $i < count($ships); $i++){
				$name = $ships[$i][0];
				$creat = $ships[$i][1];
				$shipPerm = $ships[$i][2];
				$price = $ships[$i][3];
				$desc = $ships[$i][4];

				switch($shipPerm){
					case 0:
						$perm['faction'] = false;
						$perm['other'] = false;
						$perm['homeBase'] = false;
						break;
					case 1:

						$perm['faction'] = true;
						$perm['other'] = false;
						$perm['homeBase'] = false;
						break;
					case 2:

						$perm['faction'] = false;
						$perm['other'] = true;
						$perm['homeBase'] = false;
						break;
					case 3:

						$perm['faction'] = true;
						$perm['other'] = true;
						$perm['homeBase'] = false;
						break;
					case 4:

						$perm['faction'] = false;
						$perm['other'] = false;
						$perm['homeBase'] = true;
						break;
					case 5:

						$perm['faction'] = true;
						$perm['other'] = false;
						$perm['homeBase'] = true;
						break;
					case 6:

						$perm['faction'] = false;
						$perm['other'] = true;
						$perm['homeBase'] = true;
						break;

					case 7:
						$perm['faction'] = true;
						$perm['other'] = true;
						$perm['homeBase'] = true;
						break;

					case 26:
						$perm['faction'] = false;
						$perm['other'] = true;
						$perm['homeBase'] = false;
						break;

					default:
						$perm['faction'] = false;
						$perm['other'] = true;
						$perm['homeBase'] = false;
						break;
				}

				$data[$name]['creator'] = $creat;
				$data[$name]['permission'] = $perm;
				$data[$name]['price'] = $price;
				$data[$name]['description'] = $desc;
				if(isset($rateList[$name])){
					$data[$name]['rate'] = $rateList[$name];
				}
			}
			
			return $data;
		}

		private function formatFac($ent){
			$data = array();
			$factions = $ent['factions-v0'][0];
			$NStruct = $ent['factions-v0']['NStruct'];
			$news = array();

			foreach($NStruct as $key => $val){
				if(is_array($NStruct[$key])){
					foreach($NStruct[$key] as $key2 => $val2){
						$dt = (string)$NStruct[$key][$key2]['dt'];
						$id = $NStruct[$key][$key2]['id'];
						$op = $NStruct[$key][$key2]['op'];
						$msg = $NStruct[$key][$key2]['msg'];
						$perm = $NStruct[$key][$key2]['perm'];

						$news[$dt]['fid'] = $id;
						$news[$dt]['author'] = $op;
						$news[$dt]['msg'] = $msg;
						$news[$dt]['perm'] = $perm;
					}
				}
			}

			foreach($factions as $key => $val){
				$id = $factions[$key]['id'];
				$data[$id]['uid'] = $factions[$key][0];
				$data[$id]['name'] = $factions[$key][1];
				$data[$id]['description'] = $factions[$key][2];

				for($j = 0; $j < count($factions[$key]['mem']); $j++){
					$player = $factions[$key]['mem'][$j][0];
					$rank = $factions[$key]['mem'][$j][1];
					$data[$id]['member'][$player] = $rank;
				}

				$data[$id]['ranks'] = array();
				for($j = 0; $j < count($factions[$key]['00'][2]); $j++){
					$arr['name'] = $factions[$key]['00'][2][$j];
					$prem = $factions[$key]['00'][1][$j];
					switch($prem){
						case 0:
							$arr['perm']['edit'] = false;
							$arr['perm']['kick'] = false;
							$arr['perm']['invite'] = false;
							$arr['perm']['permission-edit'] = false;
							break;

						case 1:
							$arr['perm']['edit'] = true;
							$arr['perm']['kick'] = false;
							$arr['perm']['invite'] = false;
							$arr['perm']['permission-edit'] = false;
							break;

						case 2:
							$arr['perm']['edit'] = false;
							$arr['perm']['kick'] = true;
							$arr['perm']['invite'] = false;
							$arr['perm']['permission-edit'] = false;
							break;

						case 3:
							$arr['perm']['edit'] = true;
							$arr['perm']['kick'] = true;
							$arr['perm']['invite'] = false;
							$arr['perm']['permission-edit'] = false;
							break;

						case 4:
							$arr['perm']['edit'] = false;
							$arr['perm']['kick'] = false;
							$arr['perm']['invite'] = true;
							$arr['perm']['permission-edit'] = false;
							break;

						case 5:
							$arr['perm']['edit'] = true;
							$arr['perm']['kick'] = false;
							$arr['perm']['invite'] = true;
							$arr['perm']['permission-edit'] = false;
							break;

						case 6:
							$arr['perm']['edit'] = false;
							$arr['perm']['kick'] = true;
							$arr['perm']['invite'] = true;
							$arr['perm']['permission-edit'] = false;
							break;

						case 7:
							$arr['perm']['edit'] = true;
							$arr['perm']['kick'] = true;
							$arr['perm']['invite'] = true;
							$arr['perm']['permission-edit'] = false;
							break;

						case 8:
							$arr['perm']['edit'] = false;
							$arr['perm']['kick'] = false;
							$arr['perm']['invite'] = false;
							$arr['perm']['permission-edit'] = true;
							break;

						case 9:
							$arr['perm']['edit'] = true;
							$arr['perm']['kick'] = false;
							$arr['perm']['invite'] = false;
							$arr['perm']['permission-edit'] = true;
							break;

						case 10:
							$arr['perm']['edit'] = false;
							$arr['perm']['kick'] = true;
							$arr['perm']['invite'] = false;
							$arr['perm']['permission-edit'] = true;
							break;

						case 11:
							$arr['perm']['edit'] = true;
							$arr['perm']['kick'] = true;
							$arr['perm']['invite'] = false;
							$arr['perm']['permission-edit'] = true;
							break;

						case 12:
							$arr['perm']['edit'] = false;
							$arr['perm']['kick'] = false;
							$arr['perm']['invite'] = true;
							$arr['perm']['permission-edit'] = true;
							break;

						case 13:
							$arr['perm']['edit'] = true;
							$arr['perm']['kick'] = false;
							$arr['perm']['invite'] = true;
							$arr['perm']['permission-edit'] = true;
							break;

						case 14:
							$arr['perm']['edit'] = false;
							$arr['perm']['kick'] = true;
							$arr['perm']['invite'] = true;
							$arr['perm']['permission-edit'] = true;
							break;

						case 15:
							$arr['perm']['edit'] = true;
							$arr['perm']['kick'] = true;
							$arr['perm']['invite'] = true;
							$arr['perm']['permission-edit'] = true;
							break;

						case 2047:
							$arr['perm']['edit'] = true;
							$arr['perm']['kick'] = true;
							$arr['perm']['invite'] = true;
							$arr['perm']['permission-edit'] = true;
							break;

						default:
							$arr['perm']['edit'] = false;
							$arr['perm']['kick'] = false;
							$arr['perm']['invite'] = false;
							$arr['perm']['permission-edit'] = false;
							break;
					}
					array_push($data[$id]['ranks'], $arr);
				}

				$data[$id]['home']['uid'] = $factions[$key]['home'];
				$data[$id]['home']['sector']['x'] = $factions[$key][5][0];
				$data[$id]['home']['sector']['y'] = $factions[$key][5][1];
				$data[$id]['home']['sector']['z'] = $factions[$key][5][2];
				$data[$id]['pw'] = $factions[$key]['pw'];
				$data[$id]['fn'] = $factions[$key]['fn'];
				$data[$id]['options']['public'] = ($factions[$key][4] == 1) ? true : false;
				$data[$id]['options']['warOnHostile'] = ($factions[$key]['aw'] == 1) ? true : false;
				$data[$id]['options']['NeutralEnemy'] = ($factions[$key]['en'] == 1) ? true : false;

				foreach($news as $key2 => $val2){
					if($news[$key2]['fid'] == $id){
						$data[$id]['news'][$key2]['author'] = $news[$key2]['author'];
						$data[$id]['news'][$key2]['msg'] = $news[$key2]['msg'];
						$data[$id]['news'][$key2]['perm'] = $news[$key2]['perm'];
					}
				}
			}
			
			return $data;
		}

		private function formatShop($ent){
			$data = array();
			$sc = $ent['ShopSpaceStation2']['sc'];
			$uid = $sc['uniqueId'];
			$transform = $sc['transformable']['transform'];

			$data[$uid]['type'] = $this->type;

			$data[$uid]['dim']['maxPos']['x'] = $sc['maxPos'][0];
			$data[$uid]['dim']['maxPos']['y'] = $sc['maxPos'][1];
			$data[$uid]['dim']['maxPos']['z'] = $sc['maxPos'][2];

			$data[$uid]['dim']['minPos']['x'] = $sc['minPos'][0];
			$data[$uid]['dim']['minPos']['y'] = $sc['minPos'][1];
			$data[$uid]['dim']['minPos']['z'] = $sc['minPos'][2];

			$data[$uid]['dock']['dockedTo'] = $sc[0][0];
			$data[$uid]['dock']['dockedToPos']['x'] = $sc[0][1][0];
			$data[$uid]['dock']['dockedToPos']['y'] = $sc[0][1][1];
			$data[$uid]['dock']['dockedToPos']['z'] = $sc[0][1][2];
			$data[$uid]['dock']['byte_a'] = $sc[0][2];
			$data[$uid]['dock']['byte_b'] = $sc[0][3];
			$data[$uid]['dock']['s'] = $sc[0]['s'];

			$data[$uid]['cs1'] = htmlentities((string)$sc['cs1']);
			$data[$uid]['realname'] = ($sc['realname'] == 'undef') ? 'Shop' : $sc['realname'];

			$data[$uid]['transformable']['mass'] = $sc['transformable']['mass'];

			$data[$uid]['transformable']['transformX']['x'] = $transform[0];
			$data[$uid]['transformable']['transformX']['y'] = $transform[1];
			$data[$uid]['transformable']['transformX']['z'] = $transform[2];

			$data[$uid]['transformable']['transformY']['x'] = $transform[4];
			$data[$uid]['transformable']['transformY']['y'] = $transform[5];
			$data[$uid]['transformable']['transformY']['z'] = $transform[6];

			$data[$uid]['transformable']['transformZ']['x'] = $transform[8];
			$data[$uid]['transformable']['transformZ']['y'] = $transform[9];
			$data[$uid]['transformable']['transformZ']['z'] = $transform[10];

			$data[$uid]['transformable']['localPos']['x'] = $transform[12];
			$data[$uid]['transformable']['localPos']['y'] = $transform[13];
			$data[$uid]['transformable']['localPos']['z'] = $transform[14];

			$data[$uid]['transformable']['sPos']['x'] = $sc['transformable']['sPos'][0];
			$data[$uid]['transformable']['sPos']['y'] = $sc['transformable']['sPos'][1];
			$data[$uid]['transformable']['sPos']['z'] = $sc['transformable']['sPos'][2];

			$data[$uid]['transformable']['noAI'] = $sc['transformable']['noAI'];
			$data[$uid]['transformable']['fid'] = $sc['transformable']['fid'];
			$data[$uid]['transformable']['own'] = $sc['transformable']['own'];

			$data[$uid]['dummy'] = $sc['dummy'];

			$data[$uid]['creatorId']['creator'] = ($sc['1'] == '') ? '<system>' : $sc['1'];
			$data[$uid]['creatorId']['lastMod'] = $sc['2'];
			$data[$uid]['creatorId']['seed'] = $sc['3'];
			$data[$uid]['creatorId']['touched'] = ($sc['4'] == 1) ? true : false;
			$data[$uid]['creatorId']['byte_y'] = $sc['5'];
			$data[$uid]['creatorId']['genId'] = $sc['creatoreId'];

			$data[$uid]['inventory'] = $ent['ShopSpaceStation2']['inventory0'];
			$data[$uid]['inventory']['credits'] = $ent['ShopSpaceStation2'][0][4];

			$data[$uid]['unk_last']['double_z'] = $ent['ShopSpaceStation2'][0][0];
			$data[$uid]['unk_last']['long_z'] = $ent['ShopSpaceStation2'][0][1];
			$data[$uid]['unk_last']['arrData_y'] = $ent['ShopSpaceStation2'][0][2];
			$data[$uid]['unk_last']['byte_z'] = $ent['ShopSpaceStation2'][0][3];
			$data[$uid]['unk_last']['arrData_z'] = $ent['ShopSpaceStation2'][0][5];

			return $data;
		}

		private function formatStation($ent){
			$data = array();
			$sc = $ent['SpaceStation']['sc'];
			$uid = $sc['uniqueId'];
			$transform = $sc['transformable']['transform'];
			$AIConfig = $sc['transformable']['AIConfig0'];

			$data[$uid]['type'] = $this->type;

			$data[$uid]['dim']['maxPos']['x'] = $sc['maxPos'][0];
			$data[$uid]['dim']['maxPos']['y'] = $sc['maxPos'][1];
			$data[$uid]['dim']['maxPos']['z'] = $sc['maxPos'][2];

			$data[$uid]['dim']['minPos']['x'] = $sc['minPos'][0];
			$data[$uid]['dim']['minPos']['y'] = $sc['minPos'][1];
			$data[$uid]['dim']['minPos']['z'] = $sc['minPos'][2];

			$data[$uid]['dock']['dockedTo'] = $sc[0][0];
			$data[$uid]['dock']['dockedToPos']['x'] = $sc[0][1][0];
			$data[$uid]['dock']['dockedToPos']['y'] = $sc[0][1][1];
			$data[$uid]['dock']['dockedToPos']['z'] = $sc[0][1][2];
			$data[$uid]['dock']['byte_a'] = $sc[0][2];
			$data[$uid]['dock']['byte_b'] = $sc[0][3];
			$data[$uid]['dock']['s'] = $sc[0]['s'];

			$data[$uid]['cs1'] = htmlentities((string)$sc['cs1']);
			$data[$uid]['realname'] = ($sc['realname'] == 'undef') ? 'Asteroid' : $sc['realname'];

			$data[$uid]['transformable']['mass'] = $sc['transformable']['mass'];

			$data[$uid]['transformable']['transformX']['x'] = $transform[0];
			$data[$uid]['transformable']['transformX']['y'] = $transform[1];
			$data[$uid]['transformable']['transformX']['z'] = $transform[2];

			$data[$uid]['transformable']['transformY']['x'] = $transform[4];
			$data[$uid]['transformable']['transformY']['y'] = $transform[5];
			$data[$uid]['transformable']['transformY']['z'] = $transform[6];

			$data[$uid]['transformable']['transformZ']['x'] = $transform[8];
			$data[$uid]['transformable']['transformZ']['y'] = $transform[9];
			$data[$uid]['transformable']['transformZ']['z'] = $transform[10];

			$data[$uid]['transformable']['localPos']['x'] = $transform[12];
			$data[$uid]['transformable']['localPos']['y'] = $transform[13];
			$data[$uid]['transformable']['localPos']['z'] = $transform[14];

			$data[$uid]['transformable']['sPos']['x'] = $sc['transformable']['sPos'][0];
			$data[$uid]['transformable']['sPos']['y'] = $sc['transformable']['sPos'][1];
			$data[$uid]['transformable']['sPos']['z'] = $sc['transformable']['sPos'][2];

			$configType = $AIConfig['AIElement0']['type'];
			$data[$uid]['transformable']['AIConfig'][$configType] = $AIConfig['AIElement0']['state'];
			$configType = $AIConfig['AIElement1']['type'];
			$data[$uid]['transformable']['AIConfig'][$configType] = $AIConfig['AIElement1']['state'];
			$configType = $AIConfig['AIElement2']['type'];
			$data[$uid]['transformable']['AIConfig'][$configType] = $AIConfig['AIElement2']['state'];
			$data[$uid]['transformable']['fid'] = $sc['transformable']['fid'];
			$data[$uid]['transformable']['own'] = $sc['transformable']['own'];

			$data[$uid]['container'] = array();
			$data[$uid]['container']['controllerStructure'] = array();
			$data[$uid]['container']['shipMan0'] = array();

			$oriController = $sc['container']['controllerStructure'];
			foreach($oriController as $key => $val){
				$arr['type'] = $oriController[$key]['type'];
				$arr['index'] = $oriController[$key]['index'];
				$arr['inventory'] = $oriController[$key]['inventory0'];
				array_push($data[$uid]['container']['controllerStructure'], $arr);
			}

			$oriShipMan = $sc['container']['shipMan0'];
			foreach($oriShipMan as $key => $val){
				array_push($data[$uid]['container']['shipMan0'], $oriShipMan[$key]);
			}

			$data[$uid]['container']['power'] = $sc['container']['pw'];
			$data[$uid]['container']['shield'] = $sc['container']['sh'];
			$data[$uid]['container']['exS']['inventory'] = $sc['container']['exS']['inventory0'];

			$data[$uid]['container']['exS']['unk']['double_a'] = $sc['container']['exS'][0][0];
			$data[$uid]['container']['exS']['unk']['long_a'] = $sc['container']['exS'][0][1];
			$data[$uid]['container']['exS']['unk']['arrData_a'] = $sc['container']['exS'][0][2];
			$data[$uid]['container']['exS']['unk']['byte_a'] = $sc['container']['exS'][0][3];
			$data[$uid]['container']['exS']['unk']['arrData_b'] = $sc['container']['exS'][0][5];

			$data[$uid]['creatorId']['creator'] = ($sc['1'] == '') ? '<system>' : $sc['1'];
			$data[$uid]['creatorId']['lastMod'] = $sc['2'];
			$data[$uid]['creatorId']['seed'] = $sc['3'];
			$data[$uid]['creatorId']['touched'] = ($sc['4'] == 1) ? true : false;
			$data[$uid]['creatorId']['long_z'] = $sc['5'];
			$data[$uid]['creatorId']['genId'] = $sc['creatoreId'];

			return $data;
		}

		private function formatAst($ent){
			$data = array();
			$sc = $ent['sc'];
			$uid = $sc['uniqueId'];
			$transform = $sc['transformable']['transform'];

			$data[$uid]['type'] = $this->type;

			$data[$uid]['dim']['maxPos']['x'] = $sc['maxPos'][0];
			$data[$uid]['dim']['maxPos']['y'] = $sc['maxPos'][1];
			$data[$uid]['dim']['maxPos']['z'] = $sc['maxPos'][2];

			$data[$uid]['dim']['minPos']['x'] = $sc['minPos'][0];
			$data[$uid]['dim']['minPos']['y'] = $sc['minPos'][1];
			$data[$uid]['dim']['minPos']['z'] = $sc['minPos'][2];

			$data[$uid]['dock']['dockedTo'] = $sc[0][0];
			$data[$uid]['dock']['dockedToPos']['x'] = $sc[0][1][0];
			$data[$uid]['dock']['dockedToPos']['y'] = $sc[0][1][1];
			$data[$uid]['dock']['dockedToPos']['z'] = $sc[0][1][2];
			$data[$uid]['dock']['byte_a'] = $sc[0][2];
			$data[$uid]['dock']['byte_b'] = $sc[0][3];
			$data[$uid]['dock']['s'] = $sc[0]['s'];

			$data[$uid]['cs1'] = htmlentities((string)$sc['cs1']);
			$data[$uid]['realname'] = ($sc['realname'] == 'undef') ? 'Asteroid' : $sc['realname'];

			$data[$uid]['transformable']['mass'] = $sc['transformable']['mass'];

			$data[$uid]['transformable']['transformX']['x'] = $transform[0];
			$data[$uid]['transformable']['transformX']['y'] = $transform[1];
			$data[$uid]['transformable']['transformX']['z'] = $transform[2];

			$data[$uid]['transformable']['transformY']['x'] = $transform[4];
			$data[$uid]['transformable']['transformY']['y'] = $transform[5];
			$data[$uid]['transformable']['transformY']['z'] = $transform[6];

			$data[$uid]['transformable']['transformZ']['x'] = $transform[8];
			$data[$uid]['transformable']['transformZ']['y'] = $transform[9];
			$data[$uid]['transformable']['transformZ']['z'] = $transform[10];

			$data[$uid]['transformable']['localPos']['x'] = $transform[12];
			$data[$uid]['transformable']['localPos']['y'] = $transform[13];
			$data[$uid]['transformable']['localPos']['z'] = $transform[14];

			$data[$uid]['transformable']['sPos']['x'] = $sc['transformable']['sPos'][0];
			$data[$uid]['transformable']['sPos']['y'] = $sc['transformable']['sPos'][1];
			$data[$uid]['transformable']['sPos']['z'] = $sc['transformable']['sPos'][2];

			$data[$uid]['transformable']['noAI'] = $sc['transformable']['noAI'];
			$data[$uid]['transformable']['fid'] = $sc['transformable']['fid'];
			$data[$uid]['transformable']['own'] = $sc['transformable']['own'];

			$data[$uid]['dummy'] = $sc['dummy'];

			$data[$uid]['creatorId']['creator'] = ($sc['1'] == '') ? '<system>' : $sc['1'];
			$data[$uid]['creatorId']['lastMod'] = $sc['2'];
			$data[$uid]['creatorId']['seed'] = $sc['3'];
			$data[$uid]['creatorId']['touched'] = ($sc['4'] == 1) ? true : false;
			$data[$uid]['creatorId']['byte_z'] = $sc['5'];
			$data[$uid]['creatorId']['genId'] = $sc['creatoreId'];

			return $data;
		}

		private function formatPlan($ent){
			$data = array();
			$sc = $ent['Planet']['sc'];
			$uid = $sc['uniqueId'];
			$transform = $sc['transformable']['transform'];
			$AIConfig = $sc['transformable']['AIConfig0'];

			$data[$uid]['type'] = $this->type;
			$data[$uid]['byte_a'] = $ent['Planet'][0];

			$data[$uid]['dim']['maxPos']['x'] = $sc['maxPos'][0];
			$data[$uid]['dim']['maxPos']['y'] = $sc['maxPos'][1];
			$data[$uid]['dim']['maxPos']['z'] = $sc['maxPos'][2];

			$data[$uid]['dim']['minPos']['x'] = $sc['minPos'][0];
			$data[$uid]['dim']['minPos']['y'] = $sc['minPos'][1];
			$data[$uid]['dim']['minPos']['z'] = $sc['minPos'][2];

			$data[$uid]['dock']['dockedTo'] = $sc[0][0];
			$data[$uid]['dock']['dockedToPos']['x'] = $sc[0][1][0];
			$data[$uid]['dock']['dockedToPos']['y'] = $sc[0][1][1];
			$data[$uid]['dock']['dockedToPos']['z'] = $sc[0][1][2];
			$data[$uid]['dock']['byte_a'] = $sc[0][2];
			$data[$uid]['dock']['byte_b'] = $sc[0][3];
			$data[$uid]['dock']['s'] = $sc[0]['s'];

			$data[$uid]['cs1'] = htmlentities((string)$sc['cs1']);
			$data[$uid]['realname'] = ($sc['realname'] == 'undef') ? 'Asteroid' : $sc['realname'];

			$data[$uid]['transformable']['mass'] = $sc['transformable']['mass'];

			$data[$uid]['transformable']['transformX']['x'] = $transform[0];
			$data[$uid]['transformable']['transformX']['y'] = $transform[1];
			$data[$uid]['transformable']['transformX']['z'] = $transform[2];

			$data[$uid]['transformable']['transformY']['x'] = $transform[4];
			$data[$uid]['transformable']['transformY']['y'] = $transform[5];
			$data[$uid]['transformable']['transformY']['z'] = $transform[6];

			$data[$uid]['transformable']['transformZ']['x'] = $transform[8];
			$data[$uid]['transformable']['transformZ']['y'] = $transform[9];
			$data[$uid]['transformable']['transformZ']['z'] = $transform[10];

			$data[$uid]['transformable']['localPos']['x'] = $transform[12];
			$data[$uid]['transformable']['localPos']['y'] = $transform[13];
			$data[$uid]['transformable']['localPos']['z'] = $transform[14];

			$data[$uid]['transformable']['sPos']['x'] = $sc['transformable']['sPos'][0];
			$data[$uid]['transformable']['sPos']['y'] = $sc['transformable']['sPos'][1];
			$data[$uid]['transformable']['sPos']['z'] = $sc['transformable']['sPos'][2];

			$configType = $AIConfig['AIElement0']['type'];
			$data[$uid]['transformable']['AIConfig'][$configType] = $AIConfig['AIElement0']['state'];
			$configType = $AIConfig['AIElement1']['type'];
			$data[$uid]['transformable']['AIConfig'][$configType] = $AIConfig['AIElement1']['state'];
			$configType = $AIConfig['AIElement2']['type'];
			$data[$uid]['transformable']['AIConfig'][$configType] = $AIConfig['AIElement2']['state'];
			$data[$uid]['transformable']['fid'] = $sc['transformable']['fid'];
			$data[$uid]['transformable']['own'] = $sc['transformable']['own'];

			$data[$uid]['container'] = array();
			$data[$uid]['container']['controllerStructure'] = array();
			$data[$uid]['container']['shipMan0'] = array();

			$oriController = $sc['container']['controllerStructure'];
			foreach($oriController as $key => $val){
				$arr['type'] = $oriController[$key]['type'];
				$arr['index'] = $oriController[$key]['index'];
				$arr['inventory'] = $oriController[$key]['inventory0'];
				array_push($data[$uid]['container']['controllerStructure'], $arr);
			}

			$oriShipMan = $sc['container']['shipMan0'];
			foreach($oriShipMan as $key => $val){
				array_push($data[$uid]['container']['shipMan0'], $oriShipMan[$key]);
			}

			$data[$uid]['container']['power'] = $sc['container']['pw'];
			$data[$uid]['container']['shield'] = $sc['container']['sh'];
			$data[$uid]['container']['exS']['inventory'] = $sc['container']['exS']['inventory0'];

			$data[$uid]['container']['exS']['unk']['double_a'] = $sc['container']['exS'][0][0];
			$data[$uid]['container']['exS']['unk']['long_a'] = $sc['container']['exS'][0][1];
			$data[$uid]['container']['exS']['unk']['arrData_a'] = $sc['container']['exS'][0][2];
			$data[$uid]['container']['exS']['unk']['byte_a'] = $sc['container']['exS'][0][3];
			$data[$uid]['container']['exS']['unk']['arrData_b'] = $sc['container']['exS'][0][5];

			$data[$uid]['creatorId']['creator'] = ($sc['1'] == '') ? '<system>' : $sc['1'];
			$data[$uid]['creatorId']['lastMod'] = $sc['2'];
			$data[$uid]['creatorId']['seed'] = $sc['3'];
			$data[$uid]['creatorId']['touched'] = ($sc['4'] == 1) ? true : false;
			$data[$uid]['creatorId']['long_z'] = $sc['5'];
			$data[$uid]['creatorId']['genId'] = $sc['creatoreId'];

			return $data;
		}

		private function formatShip($ent){
			$data = array();
			$sc = $ent['sc'];
			$uid = $sc['uniqueId'];
			$transform = $sc['transformable']['transform'];
			$AIConfig = $sc['transformable']['AIConfig0'];

			$data[$uid]['type'] = $this->type;

			$data[$uid]['dim']['maxPos']['x'] = $sc['maxPos'][0];
			$data[$uid]['dim']['maxPos']['y'] = $sc['maxPos'][1];
			$data[$uid]['dim']['maxPos']['z'] = $sc['maxPos'][2];

			$data[$uid]['dim']['minPos']['x'] = $sc['minPos'][0];
			$data[$uid]['dim']['minPos']['y'] = $sc['minPos'][1];
			$data[$uid]['dim']['minPos']['z'] = $sc['minPos'][2];

			$data[$uid]['dock']['dockedTo'] = $sc[0][0];
			$data[$uid]['dock']['dockedToPos']['x'] = $sc[0][1][0];
			$data[$uid]['dock']['dockedToPos']['y'] = $sc[0][1][1];
			$data[$uid]['dock']['dockedToPos']['z'] = $sc[0][1][2];
			$data[$uid]['dock']['byte_a'] = $sc[0][2];
			$data[$uid]['dock']['byte_b'] = $sc[0][3];
			$data[$uid]['dock']['s'] = $sc[0]['s'];

			$data[$uid]['cs1'] = htmlentities((string)$sc['cs1']);
			$data[$uid]['realname'] = ($sc['realname'] == 'undef') ? 'Asteroid' : $sc['realname'];

			$data[$uid]['transformable']['mass'] = $sc['transformable']['mass'];

			$data[$uid]['transformable']['transformX']['x'] = $transform[0];
			$data[$uid]['transformable']['transformX']['y'] = $transform[1];
			$data[$uid]['transformable']['transformX']['z'] = $transform[2];

			$data[$uid]['transformable']['transformY']['x'] = $transform[4];
			$data[$uid]['transformable']['transformY']['y'] = $transform[5];
			$data[$uid]['transformable']['transformY']['z'] = $transform[6];

			$data[$uid]['transformable']['transformZ']['x'] = $transform[8];
			$data[$uid]['transformable']['transformZ']['y'] = $transform[9];
			$data[$uid]['transformable']['transformZ']['z'] = $transform[10];

			$data[$uid]['transformable']['localPos']['x'] = $transform[12];
			$data[$uid]['transformable']['localPos']['y'] = $transform[13];
			$data[$uid]['transformable']['localPos']['z'] = $transform[14];

			$data[$uid]['transformable']['sPos']['x'] = $sc['transformable']['sPos'][0];
			$data[$uid]['transformable']['sPos']['y'] = $sc['transformable']['sPos'][1];
			$data[$uid]['transformable']['sPos']['z'] = $sc['transformable']['sPos'][2];

			$configType = $AIConfig['AIElement0']['type'];
			$data[$uid]['transformable']['AIConfig'][$configType] = $AIConfig['AIElement0']['state'];
			$configType = $AIConfig['AIElement1']['type'];
			$data[$uid]['transformable']['AIConfig'][$configType] = $AIConfig['AIElement1']['state'];
			$configType = $AIConfig['AIElement2']['type'];
			$data[$uid]['transformable']['AIConfig'][$configType] = $AIConfig['AIElement2']['state'];
			$data[$uid]['transformable']['fid'] = $sc['transformable']['fid'];
			$data[$uid]['transformable']['own'] = $sc['transformable']['own'];

			$data[$uid]['container'] = array();
			$data[$uid]['container']['controllerStructure'] = array();
			$data[$uid]['container']['shipMan0'] = array();

			$oriController = $sc['container']['controllerStructure'];
			foreach($oriController as $key => $val){
				$arr['type'] = $oriController[$key]['type'];
				$arr['index'] = $oriController[$key]['index'];
				$arr['inventory'] = $oriController[$key]['inventory0'];
				array_push($data[$uid]['container']['controllerStructure'], $arr);
			}

			$oriShipMan = $sc['container']['shipMan0'];
			foreach($oriShipMan as $key => $val){
				array_push($data[$uid]['container']['shipMan0'], $oriShipMan[$key]);
			}

			$data[$uid]['container']['power'] = $sc['container']['pw'];
			$data[$uid]['container']['shield'] = $sc['container']['sh'];
			$data[$uid]['container']['ex'] = $sc['container']['ex'];

			$data[$uid]['creatorId']['creator'] = ($sc['1'] == '') ? '<system>' : $sc['1'];
			$data[$uid]['creatorId']['lastMod'] = $sc['2'];
			$data[$uid]['creatorId']['seed'] = $sc['3'];
			$data[$uid]['creatorId']['touched'] = ($sc['4'] == 1) ? true : false;
			$data[$uid]['creatorId']['long_z'] = $sc['5'];
			$data[$uid]['creatorId']['genId'] = $sc['creatoreId'];

			return $data;
		}

		private function formatChar($ent, $pseudo){
			$data = array();
			$sc = $ent['PlayerCharacter'];
			$transform = $sc['transformable']['transform'];

			$data['name'] = $pseudo;
			$data['id'] = $sc['id'];			
			$data['speed'] = $sc['speed'];	
			$data['stepHeight'] = $sc['stepHeight'];

			$data['transformable']['mass'] = $sc['transformable']['mass'];

			$data['transformable']['transformX']['x'] = $transform[0];
			$data['transformable']['transformX']['y'] = $transform[1];
			$data['transformable']['transformX']['z'] = $transform[2];

			$data['transformable']['transformY']['x'] = $transform[4];
			$data['transformable']['transformY']['y'] = $transform[5];
			$data['transformable']['transformY']['z'] = $transform[6];

			$data['transformable']['transformZ']['x'] = $transform[8];
			$data['transformable']['transformZ']['y'] = $transform[9];
			$data['transformable']['transformZ']['z'] = $transform[10];

			$data['transformable']['localPos']['x'] = $transform[12];
			$data['transformable']['localPos']['y'] = $transform[13];
			$data['transformable']['localPos']['z'] = $transform[14];

			$data['transformable']['sPos']['x'] = $sc['transformable']['sPos'][0];
			$data['transformable']['sPos']['y'] = $sc['transformable']['sPos'][1];
			$data['transformable']['sPos']['z'] = $sc['transformable']['sPos'][2];

			$data['transformable']['noAI'] = $sc['transformable']['noAI'];
			$data['transformable']['fid'] = $sc['transformable']['fid'];
			$data['transformable']['own'] = $sc['transformable']['own'];

			return $data;
		}

		private function formatStats($ent, $pseudo){
			$data = array();
			$sc = $ent['PlayerState'];

			$data['name'] = $pseudo;
			$data['credits'] = $sc['credits'];
			$data['inventory'] = $sc['inventory0'];
			$data['spawn'] = $sc['spawn'];
			$data['sector'] = $sc['sector'];
			$data['lspawn'] = $sc['lspawn'];
			$data['lsector'] = $sc['lsector'];
			$data['fid'] = $sc['pFac-v0'][0];
			$data['lastLogin'] = $sc[0];
			$data['unk_timestamp'] = $sc[1];
			$data['lastShip'] = $sc[2];

			for($i = 0; $i < count($sc['hist']); $i++){
				$data['hist'][$i]['timestamp'] = $sc['hist'][$i][0];
				$data['hist'][$i]['ip'] = $sc['hist'][$i][1];
			}

			for($i = 0; $i < count($sc[$pseudo]); $i++){
				$data[$pseudo][$i]['ship'] = $sc[$pseudo][$i][0];
				$data[$pseudo][$i]['unk'] = $sc[$pseudo][$i][1];
			}
			
			return $data;
		}


		//============================= Binary Decoders =============================//

		private function readByte(){
			return fread($this->stream, 1);
		}

		private function readNextByte(){
			$pos = ftell($this->stream);
			$byte = $this->readByte();
			fseek($this->stream, $pos);
			return $byte;
		}

		private function readNextBytes($lenght){
			$pos = ftell($this->stream);
			$byte = $this->readBytes($lenght);
			fseek($this->stream, $pos);
			return $byte;
		}

		private function readBytes($length){
			return fread($this->stream, $length);
		}

		private function readInt8(){
			$byte = fread($this->stream, 1);
			return $this->binToInt8($byte);
		}

		private function readInt16(){
			$bytes = fread($this->stream, 2);
			return $this->binToInt16($bytes);
		}

		private function readInt32(){
			$bytes = fread($this->stream, 4);
			return $this->binToInt32($bytes);
		}

		private function readInt64(){
			$bytes = fread($this->stream, 8);
			return $this->binToInt64($bytes);
		}

		private function readFloat(){
			$bytes = fread($this->stream, 4);
			return $this->binToFloat($bytes);
		}

		private function readDouble(){
			$bytes = fread($this->stream, 8);
			return $this->binToDouble($bytes);
		}

		private function readString(){
			$bytes = fread($this->stream, 2);
			$length = $this->binToInt16($bytes);
			$string = '';
			if($length > 0){
				$string = fread($this->stream, $length);
			}
			return $string;
		}

		public function binToInt8($binStr){
			$byte = sprintf("%08b", ord($binStr));
			return bindec($byte);
		}

		public function binToInt16($binStr){
			$bytes = null;
			for($i = 0; $i < 2; $i++){
				$bytes .= sprintf("%08b", ord($binStr[$i]));
			}
			return bindec($bytes);
		}

		public function binToInt32($binStr){
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

		public function binToInt64($binStr){
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

		public function binToFloat($binStr){
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
					$hex = $this->hexReverse($hex);
					$hex = $this->hexify($hex);

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

		public function binToDouble($binStr){
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
					$hex = $this->hexReverse($hex);
					$hex = $this->hexify($hex);

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

		public function hexReverse($hex){
			$return = "";
			$hexArr = explode(" ", $hex);

			foreach ($hexArr as $i) {
				$return = $i . " " . $return;
			}

			$return = substr($return, 0, -1);
			return $return;
		}

		public function hexify($hex){
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

		public function bits($x, $start, $len){
			//Used to mask a portion of a bitfield.
			$x = $x >> $start;
			$x = $x & (pow(2, $len )-1);
			
			return $x;
		}
	}
?>