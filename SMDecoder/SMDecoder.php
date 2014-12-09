<?php
	/*
		Product: SMDecoder Class
		Description: Intergrate Starmade files within your own projects.
		License: http://creativecommons.org/licenses/by/3.0/legalcode

		FileVersion: 0.6-rev00033						Date: 2014-01-03
		By Blackcancer
		
		website: http://initsysrev.net
		support: blackcancer@initsysrev.net
		credit: - http://phpjs.org
				- Megacrafter127
				- der_scheme
				- tambry
	
		about format: Header, Logic, Meta and modeles are adapted from 
		"blueprint.py" by trambry. You can find structure specification
		at http://http://www.starmadewiki.com/wiki/File_format
	*/

	header('Content-Type: text/html; charset=UTF-8');

	define("NULL32", "00000000000000000000000000000000");
	define("NULL64", "0000000000000000000000000000000000000000000000000000000000000000");
	define("NULLFLOAT", 0.0);

	define("TAG_FINISH", 		chr(0));
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

	define("TAG_RGBA",			chr(241));
	define("TAG_UNK",			chr(242));		//added to dev 0.107 bit length: 136
	define("TAG_STRUCT",		chr(243));
	define("TAG_LIST",			chr(244));
	define("TAG_BYTE3",			chr(245));
	define("TAG_INT3",			chr(246));
	define("TAG_FLOAT3",		chr(247));
	define("TAG_STRING",		chr(248));
	define("TAG_BYTEARRAY",		chr(249));
	define("TAG_DOUBLE",		chr(250));
	define("TAG_FLOAT",			chr(251));
	define("TAG_LONG",			chr(252));
	define("TAG_INT",			chr(253));
	define("TAG_SHORT",			chr(254));
	define("TAG_BYTE",			chr(255));

	class SMDecoder{
		private $stream;
		private $type;

		public function decodeSMFile($file, $formated = false, $fileSize = null, $ext = null){
			$ent = array();
			$this->stream = fopen($file, "rb");
			if(!$ext){
				$ext = pathinfo($file, PATHINFO_EXTENSION);
			}

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
							case 0:
								$ent = $this->formatPlanCore($ent);
							break;

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
					if(!$fileSize){
						$fileSize = filesize($file);
					}
					$ent = $this->decodeLogic($fileSize);

					if($formated){
						$ent = $this->formatLogic($ent);
					}
				break;

				case "smbpm":
					if(!$fileSize){
						$fileSize = filesize($file);
					}
					$ent = $this->decodeMeta($fileSize);
					if($formated){
						$ent = $this->formatMeta($ent);
					}
				break;

				case "smd2":
					if(!$fileSize){
						$fileSize = filesize($file);
					}
					$ent = $this->decodeModel($fileSize);
				break;

				case "sment":
					$ent = $this->uncompressEnt($file, $formated);
				break;

				case "smskin":
					$ent = $this->uncompressSkin($file);
				break;

				default:
					die("Unknown file format");
			}

			if(is_resource($this->stream)){
				fclose($this->stream);
			}

			return $this->convertArrayToUtf8($ent);
		}


		//============================= Main Decoder =============================//
		private function mainDecoder(){
			$data = array();
			$data['gzip'] = $this->readInt16();
			$tag = $this->readByte();

			while( ord($tag) != TAG_FINISH){

				$resp = $this->parseTag($tag);

				if(isset($resp['name'])){
					$data[$resp['name']] = $resp['data'];
				}
				else{
					array_push($data, $resp);
				}

				$tag = $this->readByte();
			}

			return $data;
		}


		//============================= Entity Decoder  =============================//
		private function getEntType($file){

			if(strpos($file, 'PLANETCORE') !== false){
				return 0;
			}
			else if(strpos($file, 'SHOP') !== false){
				return 1;
			}
			else if(strpos($file, 'SPACESTATION') !== false){
				return 2;
			}
			else if(strpos($file, 'FLOATINGROCK') !== false){
				return 3;
			}
			else if(strpos($file, 'PLANET') !== false){
				return 4;
			}
			else if(strpos($file, 'SHIP') !== false){
				return 5;
			}
			else if(strpos($file, 'PLAYERCHARACTER') !== false){
				return 6;
			}
			else if(strpos($file, 'PLAYERSTATE') !== false){
				return 7;
			}

			return -1;
		}


		//============================= Header Decoder  =============================//
		private function decodeHeader(){
			/*
				start	type
					0	int				unknown int
					4	int				entity type
					8	float[3]		3d float vector (negative bounding box of ship)
					20	float[3]		3d float fector (positive bounding box of ship)
					32	int				number of block table entries (N)
					36	blockEntry[N]	block entry

				blockEntry is a 6 byte value
					0	short			blockID
					2	int				blockQuantity
			*/
			$return = array();

			$return['int_a']	= $this->readInt32();
			$return['type']		= $this->readInt32();
			$return['bounds_n']	= $this->vector3([$this->readFloat(), $this->readFloat(), $this->readFloat()]);
			$return['bounds_p']	= $this->vector3([$this->readFloat(), $this->readFloat(), $this->readFloat()]);

			$return['blockTableLen'] = $this->readUInt32();

			$return['blocks'] = array();
			for($i = 0; $i < $return['blockTableLen']; $i++){
				$return['blocks'][$this->readUInt16()] = $this->readUInt32();
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

			ctrLen = 2
			controllerEntry[0] (will be the ship core)
				position: (8,8,8) (since it's the ship core)
				numGrp: 2
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
				numGrp: 1
				group[0]
					blockID: 24 (Salvage cannon)
					numBlocks: 10
					blockArray: (10 entries containing 3 shorts each, the position of each salvage cannon)
			*/

			$return = array();

			while (ftell($this->stream) < $fileSize){
				$return['int_a']	= $this->readInt32();
				$ctrLen				= $this->readUInt32();

				$return['controllers'] = array();
				for($i = 0; $i < $ctrLen; $i++){
					$dict				= array();
					$dict['position']	= $this->vector3([$this->readInt16(), $this->readInt16(), $this->readInt16()]);
					$numGrp				= $this->readUInt32();

					$dict['group'] = array();
					for($j = 0; $j < $numGrp; $j++){
						$tag		= $this->readInt16();
						$numBlocks	= $this->readUInt32();

						$dict['group'][$tag] = array();
						for($x = 0; $x < $numBlocks; $x++){
							array_push($dict['group'][$tag], $this->vector3([$this->readInt16(), $this->readInt16(), $this->readInt16()]));
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
				start		type
					0		int				unknown int
					4		byte			unknown byte. Currently expecting a 0x03 here.
					5		int				number of dockEntry (docked ship/turrets)
					9		dockEntry[N]	data about each docked ship/turret
					vary	byte			unknown byte
					vary	short			specifies if GZIP compression is used on the tagStruct
					vary	tagStruct[]		additional metadata in a tag structure

				dockEntry is a variable length struct
				start		type
					0		int				length of the string giving attached ship's subfolder
					4		wchar[N]		ship subfolder string given in modified UTF-8 encoding
					vary	int[3]			q vector, the location of the dock block
					vary	float[3]		a vector, ???
					vary	short			block ID of the dock block

				tagStruct encodes variety of data types in a tree structure
				start		type
					0		byte			tag type
					1		int				length of the tag name string
					5		wchar[N]		tag name string in modified UTF-8 encoding
					vary	vary			tag data

				special tag types (see code for full list and encoding):
					0x0		End of tag struct marker -- no tag name or data follows this
					0xD		Start of new tag struct
					0xE		Serialized object (not yet implemented here)
			*/

			$return = array();

			$return['int_a']	= $this->readInt32();
			$return['byte_a']	= $this->readInt8();

			if($return['byte_a'] == 3){
				$numDocked			= $this->readUInt32();

				$return['docked'] = array();
				for($i = 0; $i < $numDocked; $i++){
					$arr		= array(
						'name'		=> $this->readString(),
						'position'	=> $this->vector3([$this->readInt32(), $this->readInt32(), $this->readInt32()]),
						'v3f'		=> $this->vector3([$this->readFloat(), $this->readFloat(), $this->readFloat()]),
						'dockType'	=> $this->readInt16()
					);

					array_push($return['docked'], $arr);
					$this->readByte();
				}

				$return['byte_b'] = $this->readByte();
				$return['gzip'] = $this->readInt16();

				$tag = $this->readByte();
				while($tag != ''){

					$data = $this->parseTag($tag);

					if(isset($data['name'])){
						$return[$data['name']] = $data['data'];
					}
					else{
						array_push($return, $data);
					}

					$tag = $this->readByte();
				}
			}

			return $return;
		}


		//============================= Modele Decoder  =============================//
		private function decodeModel($fileSize){

			/*
				Read a starmade data file (.smd2)

				This function will probably be really inefficient for large ships!

				 start		type
					0		int						unknown int
					4		chunkIndex[16][16][16]	chunkIndex struct (see below) arranged in a 16x16x16 array
					32772	long[16][16][16]		chunk timestamp information arranged in a 16x16x16 array
					65540	chunkData[]				5120 byte chunks

					Note that there may exist chunk timestamps and chunks that are not referenced in the chunkIndex table and seemingly serve no purpose.

					chunkIndex is an 8 byte struct
						int		chunkId		Index into the chunkData[] array.  If no chunk exists for this point in the array, chunkId = -1
						int		chunklen	The total chunk size in bytes (excluding the zero padding).  Equal to the chunk's "inlen" field plus 25 (the chunk header size)

					chunkData is a 5120 byte structure
						long	timestamp	Unix timestamp in milliseconds
						int[3]	q			Relative chunk position
						int		type		Chunk type (?) usually 0x1
						int		inlen		Compressed data length
						byte	data[inlen]	ZLIB-compressed data of rawChunkData[16][16][16]
						byte	padding[]	Zero padded to 5120 byte boundary

					rawChunkData is a 3 byte bitfield
						Bits
						23-21	3 lower bits of orientation
						20		isActive or MSB of the orientation
						19-11	hitpoints
						10-0	blockID
			*/

			$data = array();

			$data['filelen']			= $fileSize;
			$data['int_a']				= $this->readInt32();
			$numChunks = ($fileSize - 4 - 32768 - 32768) / 5120;


			//First 32KB area
			$data['chunkIndex'] = array();
			for($i = 0; $i < 4096; $i++){
				$chunkId	= $this->readInt32();
				$chunkLen	= $this->readInt32();

				if($chunkId != -1){
					$pos	= array(($i % 16) - 8, (($i / 16) % 16) - 8, (($i / 256) % 16) - 8);
					$posStr	= ($pos[0] * 16) . ',' . ($pos[1] * 16) . ',' . ($pos[2] * 16);

					$data['chunkIndex'][$posStr] = array(
						'id'	=> $chunkId,
						'len'	=> $chunkLen
					);
				}
			}

			//Second 32KB area
			$data['chunkTimestamps'] = array();
			for($i = 0; $i < 4096; $i++){
				$timestamp = $this->readInt64();

				if($timestamp > 0){
					$pos	= array(($i % 16) - 8, (($i / 16) % 16) - 8, (($i / 256) % 16) - 8);
					$posStr	= ($pos[0] * 16) . ',' . ($pos[1] * 16) . ',' . ($pos[2] * 16);

					$data['chunkTimestamps'][$posStr] = $timestamp;
				}
			}

			//Last KB area
			$data['chunks'] = array();
			for($i = 0; $i < $numChunks; $i++){
				$chunkDict	= array();
				$compressed	= 5120 - 25;
				$inLen		= null;
				$inData		= null;
				$outData	= null;

				//retro-compatibility support
				if($data['int_a'] >= 1){
					$chunkDict['byte_a']	= $this->readByte();
					$compressed				= 5120 - 26;
				}

				$chunkDict['timestamp']	= $this->readInt64();
				$chunkDict['pos']		= array($this->readInt32(), $this->readInt32(), $this->readInt32());
				$chunkDict['type']		= $this->readByte();
				$chunkDict['blocks']	= array();

				$inLen		= $this->readInt32();
				$inData		= $this->readBytes($compressed);
				$outData	= gzuncompress($inData);

				for($j = 0; $j < 4096; $j++){
					$id		= $j * 3;
					$str	= chr(0);

					for($k = 0; $k < 3; $k++){
						$str .= $outData[$id + $k];
					}

					$blockData	= $this->binToInt32($str);
					$blockId	= $this->bits($blockData, 0, 11);

					if($blockId != 0){
						$pos	= array($j % 16, ($j / 16) % 16, ($j / 256) % 16);
						$posStr	= ($pos[0] * 16) . ',' . ($pos[1] * 16) . ',' . ($pos[2] * 16);

						$chunkDict['blocks'][$posStr] = array(
							'id'		=> $blockId,
							'hp'		=> $this->bits($blockData, 11, 9),
							'isActive'	=> $this->bits($blockData, 20, 1),
							'orient'	=> $this->bits($blockData, 21, 3)
						);
					}

				}

				array_push($data['chunks'], $chunkDict);
			}

			return $data;
		}


		private function uncompressSkin($file){
			// open compressed
			$content = array();
			$zip = zip_open($file);

			// look for error
			if(!is_resource($zip)){
				die($this->zipFileErrMsg($zip));
			}

			//read compressed content
			while($zip_entry = zip_read($zip)){
				$path = zip_entry_name($zip_entry);

				if(zip_entry_open($zip, $zip_entry, 'r')){

					$content[$path] = array(
						'size' => zip_entry_filesize($zip_entry),
						'data' => "data:image/png;filename=" . $path . ";base64," . base64_encode(zip_entry_read($zip_entry, zip_entry_filesize($zip_entry)))
					);

					zip_entry_close($zip_entry);
				}
			}

			// close compressed
			zip_close($zip);
			return $content;
		}


		private function uncompressEnt($file, $formated){
			// open compressed
			$content = array();
			$zip = zip_open($file);

			// look for error
			if(!is_resource($zip)){
				die($this->zipFileErrMsg($zip));
			}

			//read compressed content
			while($zip_entry = zip_read($zip)){
				$path		= zip_entry_name($zip_entry);
				$splited	= explode('/', $path);


				if(zip_entry_open($zip, $zip_entry, 'r')){

					if(count($splited) > 2 && strpos($splited[1], 'DATA') !== false){
						if(!array_key_exists('DATA', $content)){
							$content[$splited[1]] = array();
						}

						$ext = explode('.', $splited[2]);
						$ext = $ext[count($ext) - 1];
						$data = zip_entry_read($zip_entry, zip_entry_filesize($zip_entry));
						$size = zip_entry_filesize($zip_entry);

						$content[$splited[1]][$splited[2]] = $this->decodeSMFile("data://text/plain;base64," . base64_encode($data), $formated, $size, $ext);

						zip_entry_close($zip_entry);
					}
					else if(count($splited) === 2){
						$ext = explode('.', $splited[1]);
						$ext = $ext[count($ext) - 1];
						$data = zip_entry_read($zip_entry, zip_entry_filesize($zip_entry));
						$size = zip_entry_filesize($zip_entry);

						$content[$splited[1]] = $this->decodeSMFile("data://text/plain;base64," . base64_encode($data), $formated, $size, $ext);

						zip_entry_close($zip_entry);
					}
				}
			}

			// close compressed
			zip_close($zip);
			var_dump($content);
			return $content;
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

			switch($type){
				case TAG_STR_BYTE:
					$data['name'] = $this->readString();
					$data['data'] = $this->readInt8();
				break;

				case TAG_BYTE:
					$data = $this->readInt8();
				break;

				case TAG_STR_SHORT:
					$data['name'] = $this->readString();
					$data['data'] = $this->readInt16();
				break;

				case TAG_SHORT:
					$data = $this->readInt16();
				break;

				case TAG_STR_INT:
					$data['name'] = $this->readString();
					$data['data'] = $this->readInt32();
				break;

				case TAG_INT:
					$data = $this->readInt32();
				break;

				case TAG_STR_LONG:
					$data['name'] = $this->readString();
					$data['data'] = $this->readInt64();
				break;

				case TAG_LONG:
					$data = $this->readInt64();
				break;

				case TAG_STR_FLOAT:
					$data['name'] = $this->readString();
					$data['data'] = $this->readFloat();
				break;

				case TAG_FLOAT:
					$data = $this->readFloat();
				break;

				case TAG_STR_DOUBLE:
					$data['name'] = $this->readString();
					$data['data'] = $this->readDouble();
				break;

				case TAG_DOUBLE:
					$data = $this->readDouble();
				break;

				case TAG_STR_STRING:
					$data['name'] = $this->readString();
					$data['data'] = $this->readString();
				break;

				case TAG_STRING:
					$data = $this->readString();
				break;

				case TAG_STR_BYTEARRAY:
					$data['name'] = $this->readString();
					$data['data'] = array();
					$len = $this->readInt32();

					for($i = 0; $i < $len; $i++){
						array_push($data['data'], $this->readInt8());
					}
				break;

				case TAG_BYTEARRAY:
					$data = array();
					$len = $this->readInt32();

					for($i = 0; $i < $len; $i++){
						array_push($data['data'], $this->readInt8());
					}
				break;

				case TAG_STR_FLOAT3:
					$data['name'] = $this->readString();
					$data['data'] = $this->vector3($this->readFloat(), $this->readFloat(), $this->readFloat());
				break;

				case TAG_FLOAT3:
					$data = $this->vector3($this->readFloat(), $this->readFloat(), $this->readFloat());
				break;

				case TAG_STR_INT3:
					$data['name'] = $this->readString();
					$data['data'] = $this->vector3($this->readInt32(), $this->readInt32(), $this->readInt32());
				break;

				case TAG_INT3:
					$data = $this->vector3($this->readInt32(), $this->readInt32(), $this->readInt32());
				break;

				case TAG_STR_BYTE3:
					$data['name'] = $this->readString();
					$data['data'] = array($this->readInt8(), $this->readInt8(), $this->readInt8());
				break;

				case TAG_BYTE3:
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

				case TAG_LIST:
					$data = array();
					$next = $this->readByte();
					$len = $this->readInt32();

					for($i = 0; $i < $len; $i++){
						array_push($data, $this->parseList($next));
					}
				break;

				case TAG_STR_STRUCT:
					$data['name'] = $this->readString();
					$data['data'] = array();
					$next = $this->readByte();
					$i = 0;
					while($next != TAG_FINISH){

						$resp = $this->parseTag($next);

						if(is_array($resp) && isset($resp['name'])){
							$key = $resp['name'];

							if(!array_key_exists($key, $data['data'])){
								$data['data'][$key] = $resp['data'];
								//array_push($data['data'][$key], $resp['data']);
							}
							else{
								if(!is_array($data['data'][$key])){
									if(!is_numeric($key)){
										$tmp = $data['data'][$key];
										$data['data'][$key] = array();
										array_push($data['data'][$key], $tmp);
										array_push($data['data'][$key], $resp['data']);
									}
									else {
										//need to be improved
										$data['data']['used_' . $key] = array();
										array_push($data['data']['used_' . $key], $resp['data']);
									}
								}
								else if(is_array($resp['data']) && count(array_diff_key($resp['data'], $data['data'][$key])) < 1){
									$tmp = $data['data'][$key];
									$data['data'][$key] = array();

									/*for($i = 0; $i < count($tmp); $i++){
									}*/
									array_push($data['data'][$key], $tmp);
									array_push($data['data'][$key], $resp['data']);
								}
								else {
									array_push($data['data'][$key], $resp['data']);
								}
							}

						}
						else{
							array_push($data['data'], $resp);
						}

						$next = $this->readByte();
					}
				break;

				case TAG_STRUCT:
					$data = array();
					$next = $this->readByte();
					$i = 0;
					while($next != TAG_FINISH){

						$resp = $this->parseTag($next);

						if(is_array($resp) && isset($resp['name'])){
							$key = $resp['name'];

							if(!array_key_exists($key, $data)){
								$data[$key] = $resp['data'];
								//array_push($data[$key], $resp['data']);
							}
							else{
								if(!is_array($data[$key])){
									if(!is_numeric($key)){
										$tmp = $data[$key];
										$data[$key] = array();
										array_push($data[$key], $tmp);
										array_push($data[$key], $resp['data']);
									}
									else {
										$data['used_' . $key] = array();
										array_push($data['used_' . $key], $resp['data']);
									}
								}
								else if(is_array($resp['data']) && !array_diff_key($resp['data'], $data[$key])){
									$tmp = $data[$key];
									$data[$key] = array();

									array_push($data[$key], $tmp);
									array_push($data[$key], $resp['data']);
								}
								else {
									array_push($data[$key], $resp['data']);
								}
							}
						}
						else{
							array_push($data, $resp);
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

				case TAG_UNK:
					$data = $this->readBytes(16);
				break;

				case TAG_RGBA:
					$data = $this->colorRGBA($this->readFloat(), $this->readFloat(), $this->readFloat(), $this->readFloat());
				break;

				default:
                    trigger_error( 'Unrecognized tag type in parseTag() -> '. dechex(ord($type)). chr(13).chr(10) , E_USER_WARNING );
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
					$data = $this->vector3($this->readFloat(), $this->readFloat(), $this->readFloat());
				break;

				case TAG_STR_INT3:
					$data = $this->vector3($this->readInt32(), $this->readInt32(), $this->readInt32());
				break;

				case TAG_STR_BYTE3:
					$data = array($this->readInt8(), $this->readInt8(), $this->readInt8());
				break;

				default:
                  trigger_error( 'Unrecognized tag type  in parseList() -> '. dechex(ord($type)). chr(13).chr(10) , E_USER_WARNING );
					break;
			}

			return $data;
		}


		//============================= Object Formater =============================//
		private function formatCat($ent){
			$data		= array();
			$ships		= $ent['cv0']['pv0'];
			$rateList	= $ent['cv0']['r0'];

			for($i = 0; $i < count($ships); $i++){
				$name		= $ships[$i][0];
				$shipPerm	= $this->formatPerm($ships[$i][2]);

				$perm = array(
					'faction'	=> $shipPerm[0],
					'other'		=> $shipPerm[1],
					'homeBase'	=> $shipPerm[2]
				);

				$data[$name] = array(
					'creator'		=> $ships[$i][1],
					'permission'	=> $perm,
					'price'			=> $ships[$i][3],
					'description'	=> $ships[$i][4],
				);

				//version 0.17+
				if(count($ships[$i]) > 5){
					$data[$name]['long_b']	= $ships[$i][5]; 
					$data[$name]['int_b']	= $ships[$i][6]; 
				}

				if(isset($rateList[$name])){
					for($j = 0; $j < count($rateList[$name]); $j++){
						$user = $rateList[$name][$j][0];
						$data[$name]['rate'][$user]	= $rateList[$name][$j][1];
					}
				}

			}

			return $data;
		}

		private function formatFac($ent){
			$data		= array();
			$news		= array();
			$factions	= $ent['factions-v0'][0]['f0'];

			if(array_key_exists('FN' ,$ent['factions-v0']['NStruct'])){
				$tmpNews	= $ent['factions-v0']['NStruct']['FN']['fp-v0'];

				for($i = 0; $i < count($tmpNews); $i++){
					$dt		= (string)$tmpNews[$i]['dt'];

					$news[$dt] = array(
						'fid'		=> $tmpNews[$i]['id'],
						'author'	=> $tmpNews[$i]['op'],
						'msg'		=> $tmpNews[$i]['msg'],
						'perm'		=> $tmpNews[$i]['perm'],
					);
				}
			}

			for($i = 0; $i < count($factions); $i++){
				$id = $factions[$i]['id'];

				$data[$id]['uid']			= $factions[$i][0];
				$data[$id]['name']			= $factions[$i][1];
				$data[$id]['description']	= $factions[$i][2];
				$data[$id]['ranks']			= array();
				$data[$id]['members']		= array();
				$data[$id]['pEnemies']		= array();
				$data[$id]['home']			= array();
				$data[$id]['pw']			= $factions[$i]['pw'];
				$data[$id]['fn']			= $factions[$i]['fn'];

				//Populate $data[$id]['ranks']
				for($j = 0; $j < count($factions[$i]['used_0'][0][1]); $j++){

					$perm = $this->formatPerm($factions[$i]['used_0'][0][1][$j]);
					$arr			= array();
					$arr['name']	= $factions[$i]['used_0'][0][2][$j];
					$arr['perm']	= array(
						'edit'				=> $perm[0],
						'kick'				=> $perm[1],
						'invite'			=> $perm[2],
						'permission-edit'	=> $perm[3]
					);

					array_push($data[$id]['ranks'], $arr);
				}

				//Populate $data[$id]['member']
				if(count($factions[$i]['mem'][0]) > 0){

					if(is_array($factions[$i]['mem'][0][0])){

						for($j = 0; $j < count($factions[$i]['mem'][0]); $j++){
							$name						= $factions[$i]['mem'][0][$j][0];
							$data[$id]['member'][$name]	= $factions[$i]['mem'][0][$j][1];
						}

					}
					else {
						$name						= $factions[$i]['mem'][0][0];
						$data[$id]['member'][$name]	= $factions[$i]['mem'][0][1];
					}

				}

				//Populate $data[$id]['pEnemies']
				for($j = 0; $j < count($factions[$i]['mem'][1]); $j++){
					$name						= $factions[$i]['mem'][1][$j];
					array_push($data[$id]['pEnemies'], $name);
				}

				$data[$id]['home'] = array(
					'uid'		=> $factions[$i]['home'],
					'sector'	=> $factions[$i][5]
				);

				$data[$id]['options']	= array(
					'public'			=> ($factions[$i][4] == 1) ? true : false,
					'warOnHostile'		=> ($factions[$i]['aw'] == 1) ? true : false,
					'NeutralEnemy'		=> ($factions[$i]['en'] == 1) ? true : false,
				);

				$data[$id]['timestamp']	= $factions[$i][3];

				//version 0.17+
				if(count($factions[$i]) > 14){
					$data[$id]['int_a']	= $factions[$i][6];
					$data[$id]['v3f_a']	= $factions[$i][7];
				}

				$data[$id]['news']			= array();
				foreach($news as $key2 => $val2){
					if($news[$key2]['fid'] == $id){

						$data[$id]['news'][$key2] = array(
							'author'	=> $news[$key2]['author'],
							'msg'		=> $news[$key2]['msg'],
							'perm'		=> $news[$key2]['perm'],
						);

					}
				}
			}

			return $data;
		}

		private function formatShop($ent){
			$sc = $ent['ShopSpaceStation2']['sc'];

			$data = array(
				'uniqueId'		=> $sc['uniqueId'],
				'type'			=> $this->type,
				'cs1'			=> htmlentities((string)$sc['cs1']),
				'realname'		=> ($sc['realname'] == 'undef') ? 'Shop' : $sc['realname'],
				'dim'			=> $this->formatDim($sc),
				'dock'			=> $this->formatDocking($sc),
				'transformable'	=> $this->formatTransformable($sc['transformable']),
				'dummy'			=> $sc['dummy'],
				'creatorId'		=> $this->formatCreator($sc),
				'inventory'		=> $this->formatInv($ent['ShopSpaceStation2']['inv']),
				'struct_c'		=> $ent['ShopSpaceStation2'][0]
			);

			return $data;
		}

		private function formatStation($ent){
			$sc			= $ent['SpaceStation']['sc'];

			//final array
			$data = array(
				'uniqueId'		=> $sc['uniqueId'],
				'type'			=> $this->type,
				'cs1'			=> htmlentities((string)$sc['cs1']),
				'realname'		=> ($sc['realname'] == 'undef') ? 'Asteroid' : $sc['realname'],
				'dim'			=> $this->formatDim($sc),
				'dock'			=> $this->formatDocking($sc),
				'transformable'	=> $this->formatTransformable($sc['transformable']),
				'container'		=> $this->formatContainer($sc['container']),
				'creatorId'		=> $this->formatCreator($sc)
			);

			return $data;
		}

		private function formatAst($ent){
			$sc = $ent['sc'];

			//final array
			return array(
				'uniqueId'		=> $sc['uniqueId'],
				'type'			=> $this->type,
				'cs1'			=> (string)$sc['cs1'],
				'realname'		=> ($sc['realname'] == 'undef') ? 'Asteroid' : $sc['realname'],
				'dim'			=> $this->formatDim($sc),
				'dock'			=> $this->formatDocking($sc),
				'transformable'	=> $this->formatTransformable($sc['transformable']),
				'dummy'			=> $sc['dummy'],
				'creatorId'		=> $this->formatCreator($sc)
			);
		}

		private function formatPlanCore($ent){
			$sc = $ent[0]['PlanetCore'];

			//final array
			return array(
				'uniqueId'			=> $sc[0],
				'float_a'			=> $sc[1],
				'struct_a'			=> $sc[2],
				'struct_b'			=> $sc[3],
				'struct_c'			=> $sc[4],
				'struct_d'			=> $sc[5],
				'struct_e'			=> $sc[6],
				'transformable'		=> $this->formatTransformable($sc['transformable']),
				'transformable2'	=> $this->formatTransformable($ent[0]['transformable']),
			);
		}

		private function formatPlan($ent){
			$sc = $ent['Planet']['sc'];

			//final array
			return array(
				'uniqueId'		=> $sc['uniqueId'],
				'core'			=> $ent['Planet'][1],
				'type'			=> $this->type,
				'part'			=> $ent['Planet'][0],
				'cs1'			=> htmlentities((string)$sc['cs1']),
				'realname'		=> ($sc['realname'] == 'undef') ? 'Planet' : $sc['realname'],
				'dim'			=> $this->formatDim($sc),
				'dock'			=> $this->formatDocking($sc),
				'transformable'	=> $this->formatTransformable($sc['transformable']),
				'container'		=> $this->formatContainer($sc['container']),
				'creatorId'		=> $this->formatCreator($sc)
			);
		}

		private function formatShip($ent){
			$sc			= $ent['sc'];

			//final array
			return array(
				'uniqueId'		=> $sc['uniqueId'],
				'type'			=> $this->type,
				'cs1'			=> (string)$sc['cs1'],
				'realname'		=> ($sc['realname'] == 'undef') ? 'Asteroid' : $sc['realname'],
				'dim'			=> $this->formatDim($sc),
				'dock'			=> $this->formatDocking($sc),
				'transformable'	=> $this->formatTransformable($sc['transformable']),
				'container'		=> $this->formatContainer($sc['container']),
				'creatorId'		=> $this->formatCreator($sc)
			);
		}

		private function formatChar($ent, $pseudo){
			$data = array();
			$sc = $ent['PlayerCharacter'];

			$data = array(
				'name'			=> $pseudo,
				'id'			=> $sc['id'],
				'speed'			=> $sc['speed'],
				'stepHeight'	=> $sc['stepHeight'],
				'transformable'	=> $this->formatTransformable($sc['transformable'])
			);

			return $data;
		}

		private function formatStats($ent, $pseudo){
			$sc		= $ent['PlayerState'];
			$hist	= array();
			$inv	= array();
			$invx	= array();
			$ships	= array();
			$AI		= array();

			for($i = 0; $i < count($sc['hist']); $i++){

				$hist[$i] = array(
					'timestamp'	=> $sc['hist'][$i][0],
					'ip'		=> $sc['hist'][$i][1],
					'string_c'	=> $sc['hist'][$i][2]
				);

			}

			for($i = 0; $i < count($sc[$pseudo]); $i++){

				$ships[$i] = array(
					'ship'		=> $sc[$pseudo][$i][0],
					'struct_a'	=> $sc[$pseudo][$i][1]
				);

			}

			for($i = 6; $i < 9; $i++){
				$invx['int_a']	= $sc[$i][0][0];
				$invx['inv']	= $this->formatInv($sc[$i]['inv']);

				array_push($inv, $invx);
			}

			for($i = 0; $i < count($sc[4][0]); $i++){
				array_push($AI, $sc[4][0][$i]);
			}

			$data = array(
				'name'			=> $pseudo,
				'credits'		=> $sc['credits'],
				'inventory'		=> $this->formatInv($sc['inv']),
				'spawn'			=> $sc['spawn'],
				'sector'		=> $sc['sector'],
				'lspawn'		=> $sc['lspawn'],
				'lsector'		=> $sc['lsector'],
				'fid'			=> $sc['pFac-v0'][0],
				'lastLogin'		=> $sc[0],
				'lastLogout'	=> $sc[1],
				'hist'			=> $hist,
				'ci0'			=> $sc['ci0'],
				'lastShip'		=> $sc[2],
				'ships'			=> $ships,
				'AI_Entity'		=> $AI,
				'int_b'			=> $sc[3],
				'byte_a'		=> $sc[5],
				'unk_invs'		=> $inv
			);

			return $data;
		}

		private function formatLogic($ent){
			$data = array();
			$data['int_a']			= $ent['int_a'];
			$data['controllers']	= array();

			for($i = 0; $i < count($ent['controllers']); $i++){
				$pos = $ent['controllers'][$i]['position']['x'] . "," . $ent['controllers'][$i]['position']['y'] . "," . $ent['controllers'][$i]['position']['z'];
				$data['controllers'][$pos] = array();

				foreach($ent['controllers'][$i]['group'] as $key => $val){
					if(count($val) > 0){
						if(!array_key_exists($key, $data['controllers'][$pos])){
							$data['controllers'][$pos][$key] = array();
						}

						foreach($ent['controllers'][$i]['group'][$key] as $subKey => $subVal){
							array_push($data['controllers'][$pos][$key], $subVal);
						}
					}
				}

			}

			return $data;
		}

		private function formatMeta($ent){
			$data = $ent;

			if(array_key_exists('container', $ent)){
				$data['container'] = $this->formatContainer($ent['container']);
			}
			return $data;
		}


		//============================= Sub Formater =============================//
		private function formatPerm($int){
			$perm	= str_pad(decbin($int), 16, '0', STR_PAD_LEFT);
			$perm	= str_split($perm, 1);
			$arr	= array();

			for($i = count($perm); $i--;){
				array_push($arr, ($perm[$i] == '1')? true : false);
			}

			return $arr;
		}

		private function vector3($x, $y, $z){
			return array(
				'x' => $x,
				'y' => $y,
				'z' => $z
			);
		}

		private function vector4($x, $y, $z, $w){
			return array(
				'x' => $x,
				'y' => $y,
				'z' => $z,
				'w' => $w
			);
		}

		private function colorRGBA($r, $g, $b, $a ){
			return array(
				'r' => $r,
				'g' => $g,
				'b' => $b,
				'a' => $a,
			);
		}

		private function formatDim($sc){
			return array(
				'maxPos' => $sc['maxPos'],
				'minPos' => $sc['minPos']
			);
		}

		private function formatDocking($arr){
			if(array_key_exists('dock', $arr)){
				//older version
				return array(
					'dockedTo'		=> $arr['dock']['dockedTo'],
					'dockedToPos'	=> $arr['dock']['dockedToPos'],
					'byte_a'		=> $arr['dock'][0],
					'byte_b'		=> $arr['dock'][1],
					's'				=> $arr['dock']['s']
				);
			}
			else{

				if(count($arr[0]) === 5){
					//version 0.107
					return array(
						'dockedTo'		=> $arr[0][0],
						'dockedToPos'	=> $arr[0][1],
						'byte_a'		=> $arr[0][2],
						'byte_b'		=> $arr[0][3],
						's'				=> $arr[0]['s']
					);
				}
				else {
					//version 0.17+
					return array(
						'dockedTo'		=> $arr[0][0],
						'dockedToPos'	=> $arr[0][1],
						'byte_a'		=> $arr[0][2],
						'byte_b'		=> $arr[0][3],
						'v3f'			=> $arr[0]['s'],
						'byte_c'		=> $arr[0][4],
						'rgba'			=> $arr[0][5]
					);
				}

			}
		}

		private function formatTransformable($arr){
			$transform	= $this->formatTransform($arr['transform']);
			$noAI		= array_key_exists('noAI', $arr);

			return array(
				'mass'			=> $arr['mass'],
				'transformX'	=> $transform[0],
				'transformY'	=> $transform[1],
				'transformZ'	=> $transform[2],
				'localPos'		=> $transform[3],
				'sPos'			=> $arr['sPos'],
				'AIConfig'		=> $noAI ? 'noAI' : $this->formatAIConfig($arr),
				'fid'			=> $arr['fid'],
				'own'			=> $arr['own']
			);
		}

		private function formatTransform($arr){
			$transX		= $this->vector4($arr[0], $arr[1], $arr[2], $arr[3]);
			$transY		= $this->vector4($arr[4], $arr[5], $arr[6], $arr[7]);
			$transZ		= $this->vector4($arr[8], $arr[9], $arr[10], $arr[11]);
			$localPos	= $this->vector4($arr[12], $arr[13], $arr[14], $arr[15]);

			return array($transX, $transY, $transZ, $localPos);
		}

		private function formatAIConfig($arr){
			$isAI0		= array_key_exists('AIConfig0', $arr);
			$AIConfig	= $isAI0 ? $arr['AIConfig0'] : $arr['AIConfig1']; //AIConfig0 < dev 0.107
			$data		= array();

			if($isAI0){
				$data = array(
					$AIConfig['AIElement0']['state'],
					$AIConfig['AIElement1']['state'],
					$AIConfig['AIElement2']['state']
				);
			}
			else {
				for($i = 0; $i < count($AIConfig); $i++){
					$data[$AIConfig[$i][0]]	= $AIConfig[$i][1];
				}
			}

			return $data;

		}

		private function formatCount($arr){
			$data	= array();

			for($i = 0; $i < count($arr); $i++){
				array_push($data, array(
					'id'	=> $arr[$i][0],
					'count'	=> $arr[$i][1],
				));
			}

			return $data;
		}

		private function formatInv($inv){
			$data = array();

			for($i = 0; $i < count($inv[0]); $i++){
				$arr	= array();
				$slot	= $inv[0][$i];
				$id		= $inv[1][$i];
				$tmp	= $inv[2][$i];
				$meta	= null;

				if(is_array($tmp)){
					$meta	= array(
						'id'		=> $tmp[1],
						'metaId'	=> $tmp[3],
						'meta'		=> $tmp[2],
						'int_a'		=> $tmp[0]
					);

					$data[$slot] = array(
						'id'	=> $id,
						'count'	=> 1,
						'meta'	=> $meta
					);
				}
				else {
					$data[$slot] = array(
						'id'	=> $id,
						'count'	=> $tmp
					);
				}
			}

			return $data;
		}

		private function formatContainer($container){
			$contStruct		= array();
			if(array_key_exists('inventory', $container['controllerStructure'])){
				$oriController	= $container['controllerStructure']['inventory'];

				for($i = 0; $i < count($oriController); $i++){
					$stash = array(
						'filters'	=> $this->formatCount($oriController[$i]['stash'][0][1]),
						'inv'		=> $this->formatInv($oriController[$i]['stash']['inv'])
					);

					$arr	= array(
						'type'		=> $oriController[$i]['type'],
						'index'		=> $oriController[$i]['index'],
						'stash'		=> $stash
					);

					array_push($contStruct, $arr);
				}
			}

			$ex = null;
			if(array_key_exists('exS', $container)){
				$ex = 'exS';
			}
			else {
				$ex = 'ex';
			}

			return array(
				'controllerStructure'	=> $contStruct,
				'shipMan0'				=> $container['shipMan0'],
				'power'					=> $container['pw'],
				'shield'				=> $container['sh'],
				'ex'					=> $container[$ex],
				'a'						=> $container['a'],
				'screen'				=> $container[0],
				'device'				=> $this->formatCount($container[1]),
				'struct_c'				=> $container[3],
				'int_c'					=> $container[2]
			);
		}

		private function formatCreator($sc){
			$AI	= array();
			foreach($sc as $key => $value){
				if(strpos($key, '[') === 0){
					$str				= substr($key, 1, -1);
					$str				= explode(', ', $str);

					for($i = 0; $i < count($str); $i++){

						if(strpos($str[$i], 'AICharacter') === 0){

							$data	= array(
								'name'			=> $sc[$key][$i][1][3],
								'uid'			=> $sc[$key][$i][1][0],
								'speed'			=> $sc[$key][$i][1][1],
								'stepHeight'	=> $sc[$key][$i][1][2],
								'HP'			=> $sc[$key][$i][1][4][1],
								'transformable'	=> $this->formatTransformable($sc[$key][$i][1]['transformable']),
								'inventory'		=> $this->formatInv($sc[$key][$i][1][4]['inv'])
							);

							$AI[$str[$i]] = array(
								'short_a'	=> $sc[$key][$i][0],
								'data'		=> $data
							);
						}

					}

				}
			}

			$creatoreId = array(
				'creator'	=> ($sc[1] == '') ? '<system>' : $sc[1],
				'lastMod'	=> $sc[2],
				'seed'		=> $sc[3],
				'touched'	=> ($sc[4] == 1) ? true : false,
				'genId'		=> $sc['creatoreId'],
				'AI_Entity'	=> $AI,
				'byte_b'	=> $sc[5],
				'byte_c'	=> $sc[6]
			);

			if(array_key_exists('5', $sc)){
				$creatoreId['byte_a'] = $sc['5'];
			}
			else {
				$creatoreId['byte_a'] = -1;
			}

			return $creatoreId;
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

		private function readNextBytes($length){
			$pos = ftell($this->stream);
			$byte = $this->readBytes($length);
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

		private function readUInt8(){
			$byte = fread($this->stream, 1);
			return $this->binToUInt8($byte);
		}

		private function readUInt16(){
			$bytes = fread($this->stream, 2);
			return $this->binToUInt16($bytes);
		}

		private function readUInt32(){
			$bytes = fread($this->stream, 4);
			return $this->binToUInt32($bytes);
		}

		private function readUInt64(){
			$bytes = fread($this->stream, 8);
			return $this->binToUInt64($bytes);
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
			$length = $this->readUInt16();
			$string = '';
			if($length > 0){
				$string = fread($this->stream, $length);
			}
			return $string;
		}

		public function binToInt8($binStr){
			$bytes = null;
			if(strlen($binStr) == 1){

				for($i = 0; $i < strlen($binStr); $i++){
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

				return bindec($bytes);
			}
			else{
				die("Error: int8 type have 1 bytes.\n");
			}
		}

		public function binToInt16($binStr){
			$bytes = null;
			if(strlen($binStr) == 2){

				for($i = 0; $i < strlen($binStr); $i++){
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

				return bindec($bytes);
			}
			else{
				die("Error: int16 type have 2 bytes.\n");
			}
		}

		public function binToInt32($binStr){
			$bytes = null;
			if(strlen($binStr) == 4){

				for($i = 0; $i < strlen($binStr); $i++){
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

				return bindec($bytes);
			}
			else{
				die("Error: int32 type have 4 bytes.\n");
			}
		}

		public function binToInt64($binStr){
			$bytes = null;
			if(strlen($binStr) == 8){

				for($i = 0; $i < strlen($binStr); $i++){
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

				return bindec($bytes);
			}
			else{
				die("Error: int64 type have 8 bytes.\n");
			}
		}

		public function binToUInt8($binStr){
			if(!strlen($binStr) == 1){
				die("Error: uint8 type have 1 bytes.\n");
			}

			$byte = sprintf("%08b", ord($binStr));
			return bindec($byte);
		}

		public function binToUInt16($binStr){
			if(!strlen($binStr) == 2){
				die("Error: uint16 type have 2 bytes.\n");
			}

			$bytes = null;

			for($i = 0; $i < 2; $i++){
				$bytes .= sprintf("%08b", ord($binStr[$i]));
			}

			return bindec($bytes);
		}

		public function binToUInt32($binStr){
			if(!strlen($binStr) == 4){
				die("Error: uint32 type have 4 bytes.\n");
			}

			$bytes = null;

			for($i = 0; $i < 2; $i++){
				$bytes .= sprintf("%08b", ord($binStr[$i]));
			}

			return bindec($bytes);
		}

		public function binToUInt64($binStr){
			if(!strlen($binStr) == 8){
				die("Error: uint64 type have 8 bytes.\n");
			}

			$bytes = null;

			for($i = 0; $i < 2; $i++){
				$bytes .= sprintf("%08b", ord($binStr[$i]));
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
			$return	= "";
			$hexArr	= explode(" ", $hex);

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
			$return	= '';
			$hexArr	= explode(' ', $hex);

			foreach ($hexArr as $i) {

				if (!ctype_xdigit($i)){
					return false;
				}

				$tmp	= $hexVal[$i{0}] * 16 + $hexVal[$i{1}];
				$return	.= chr($tmp);
			}

			return $return;
		}

		public function bits($x, $start, $len){
			//Used to mask a portion of a bitfield.
			$x = $x >> $start;
			$x = $x & (pow(2, $len )-1);

			return $x;
		}

		public function convertArrayToUtf8(array $array){
			$convertedArray = array();

			foreach($array as $key => $value){

				if(!mb_check_encoding($key, 'UTF-8')){
					$key = utf8_encode($key);
				}

				if(is_array($value)){
					$value = $this->convertArrayToUtf8($value);
				}
				
				if(is_string($value)){
					$value = utf8_encode($value);
				}

				$convertedArray[$key] = $value;
			}

			return $convertedArray;
		}

		// function from saulius at php.net
		public function zipFileErrMsg($errno) {
			// using constant name as a string to make this function PHP4 compatible
			$zipFileFunctionsErrors = array(
				'ZIPARCHIVE::ER_MULTIDISK' => 'Multi-disk zip archives not supported.',
				'ZIPARCHIVE::ER_RENAME' => 'Renaming temporary file failed.',
				'ZIPARCHIVE::ER_CLOSE' => 'Closing zip archive failed',
				'ZIPARCHIVE::ER_SEEK' => 'Seek error',
				'ZIPARCHIVE::ER_READ' => 'Read error',
				'ZIPARCHIVE::ER_WRITE' => 'Write error',
				'ZIPARCHIVE::ER_CRC' => 'CRC error',
				'ZIPARCHIVE::ER_ZIPCLOSED' => 'Containing zip archive was closed',
				'ZIPARCHIVE::ER_NOENT' => 'No such file.',
				'ZIPARCHIVE::ER_EXISTS' => 'File already exists',
				'ZIPARCHIVE::ER_OPEN' => 'Can\'t open file',
				'ZIPARCHIVE::ER_TMPOPEN' => 'Failure to create temporary file.',
				'ZIPARCHIVE::ER_ZLIB' => 'Zlib error',
				'ZIPARCHIVE::ER_MEMORY' => 'Memory allocation failure',
				'ZIPARCHIVE::ER_CHANGED' => 'Entry has been changed',
				'ZIPARCHIVE::ER_COMPNOTSUPP' => 'Compression method not supported.',
				'ZIPARCHIVE::ER_EOF' => 'Premature EOF',
				'ZIPARCHIVE::ER_INVAL' => 'Invalid argument',
				'ZIPARCHIVE::ER_NOZIP' => 'Not a zip archive',
				'ZIPARCHIVE::ER_INTERNAL' => 'Internal error',
				'ZIPARCHIVE::ER_INCONS' => 'Zip archive inconsistent',
				'ZIPARCHIVE::ER_REMOVE' => 'Can\'t remove file',
				'ZIPARCHIVE::ER_DELETED' => 'Entry has been deleted',
			);
			$errmsg = 'unknown';
			foreach ($zipFileFunctionsErrors as $constName => $errorMessage) {
				if (defined($constName) and constant($constName) === $errno) {
					return 'Zip File Function error: '.$errorMessage;
				}
			}
			return 'Zip File Function error: unknown';
		}
	}
?>
