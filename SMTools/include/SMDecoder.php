<?php
	/*
		Product: SMDecoder Class
		Description: Intergrate Starmade files in your own projects.
		License: http://creativecommons.org/licenses/by/3.0/legalcode

		FileVersion: 0.7-rev00001					Date: 2015-12-23
		By Blackcancer

		website: http://initsysrev.net
		support: blackcancer@initsysrev.net
		credit: - http://phpjs.org
				- Megacrafter127
				- der_scheme
				- tambry
				- thecko 

		about format: Header, Logic, Meta and modeles are adapted from 
		"blueprint.py" by trambry. You can find structure specification
		at http://http://www.starmadewiki.com/wiki/File_format
	*/

	header('Content-Type: text/html; charset=UTF-8');

	include_once 'std.php';

	define("TAG_FINISH",		chr(0));
	define("TAG_STR_BYTE",		chr(1));
	define("TAG_STR_SHORT",		chr(2));
	define("TAG_STR_INT",		chr(3));
	define("TAG_STR_LONG",		chr(4));
	define("TAG_STR_FLOAT",		chr(5));
	define("TAG_STR_DOUBLE",	chr(6));
	define("TAG_STR_BYTEARRAY",	chr(7));
	define("TAG_STR_STRING",	chr(8));
	define("TAG_STR_FLOAT3",	chr(9));
	define("TAG_STR_INT3",		chr(10));
	define("TAG_STR_BYTE3",		chr(11));
	define("TAG_STR_LIST",		chr(12));
	define("TAG_STR_STRUCT",	chr(13));
	define("TAG_STR_SERIAL",	chr(14));
	define("TAG_STR_RGBA",		chr(15));

	define("TAG_FLOAT16",		chr(240));
	define("TAG_RGBA",			chr(241));
	define("TAG_SERIAL",		chr(242));
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


	//--------------------------------------------
	// SMDecoder Class
	//--------------------------------------------
	class SMDecoder {
		private $type;
		private $bin;
		private $stream;
		private $formater;

		public function __construct(){
			$this->bin		= new Binary();
			$this->stream	= new StreamReader();
			$this->formater	= new SMFormater();
		}

		/*
		 * decodeSMFile($file, $formated, $ext, $filesize)
		 *
		 * decode starmade file *.ent, *.cat, *.fac, *.smbph, *.smbpl, *.smbpm, *.smd2, *.sment, *.smskin
		 * @param string	$file		path to the file
		 * @param bool		$formated	if set to true, use StarOS return format
		 * @param string	$ext		if given, force decoder to use specifed file extention
		 * @param int		$filesize	if given, force decoder to use specifed file size
		 * @return array of decoded file
		 */
		public function decodeSMFile($file, $formated = false, $ext = null, $filesize = null){
			$data			= array();
			$fileSize		= (!$filesize)	? filesize($file) : $filesize;
			$ext			= (!$ext)		? pathinfo($file, PATHINFO_EXTENSION) : $ext;

			$this->stream->setStream($file);

			switch($ext){
				case 'cat':
					$data = $this->mainDecoder();

					if($formated){
						$data = $this->formater->catalog();
					}
					break;

				case 'ent':
					$data = $this->mainDecoder();

					if($formated){
						$data = $this->formater->entity();
					}
					break;

				case 'fac':
					$data = $this->mainDecoder();

					if($formated){
						$data = $this->formater->faction();
					}
					break;

				case 'smbph':
					$data = $this->decodeSMBPH();

					if($formated){
						$data = $this->formater->header();
					}
					break;

				case 'smbpl':
					$data = $this->decodeSMBPL($fileSize);

					if($formated){
						$data = $this->formater->logic();
					}
					break;

				case 'smbpm':
					$data = $this->decodeSMBPM();

					if($formated){
						$data = $this->formater->meta();
					}
					break;

				case 'smd2':
					$data = $this->decodeSMD2($fileSize);
					break;

				case 'sment':
					$data = $this->extractSMENT($file, $formated);
					break;

				case 'smskin':
					$data = $this->extractSMSKIN($file);
					break;

				case 'tag':
					$data = $this->mainDecoder();

					if($formated){
						$data = $this->formater->channels();
					}
					break;

				default:
					die("Unknown file format");
					break;

			}

			$this->stream->closeStream();
			return $data;
		}

		//=============================	  Main Decoder	=============================//
		private function mainDecoder(){
			$data			= array();

			try {
				$data['gzip']	= $this->stream->readInt(16);
				$tag			= $this->stream->readBytes(1);

				while($tag != null){
					$value = $this->parseTag($tag);

					if(isset($value['name'])){
						$data[$value['name']] = $value['data'];
					}
					else {
						array_push($data, $value);
					}
					$tag = $this->stream->readBytes(1);
				}
			}
			catch(Exception $e){
				echo 'Error loading \''. $e->getFile() .'\' at line '. $e->getLine() .': <b>'. $e->getMessage() .'</b></br>';
			}

			return $data;
		}

		private function parseTag($tag){
			$data = null;

			try {
				switch($tag){
					case TAG_STR_BYTE:
						$data['name'] = $this->readString();
						$data['data'] = $this->stream->readInt(8);
						break;

					case TAG_BYTE:
						$data = $this->stream->readInt(8);
						break;

					case TAG_STR_SHORT:
						$data['name'] = $this->readString();
						$data['data'] = $this->stream->readInt(16);
						break;

					case TAG_SHORT:
						$data = $this->stream->readInt(16);
						break;

					case TAG_STR_INT:
						$data['name'] = $this->readString();
						$data['data'] = $this->stream->readInt(32);
						break;

					case TAG_INT:
						$data = $this->stream->readInt(32);
						break;

					case TAG_STR_LONG:
						$data['name'] = $this->readString();
						$data['data'] = $this->stream->readInt(64);
						break;

					case TAG_LONG:
						$data = $this->stream->readInt(64);
						break;

					case TAG_STR_FLOAT:
						$data['name'] = $this->readString();
						$data['data'] = $this->stream->readFloat();
						break;

					case TAG_FLOAT:
						$data = $this->stream->readFloat();
						break;

					case TAG_STR_DOUBLE:
						$data['name'] = $this->readString();
						$data['data'] = $this->stream->readDouble();
						break;

					case TAG_DOUBLE:
						$data = $this->stream->readDouble();
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
						$length = $this->stream->readInt(32, true);

						for($i = 0; $i < $length; $i++){
							array_push($data['data'], $this->stream->readInt(8));
						}
						break;

					case TAG_BYTEARRAY:
						$data	= array();
						$length	= $this->stream->readInt(32, true);

						for($i = 0; $i < $length; $i++){
							array_push($data, $this->stream->readInt(8));
						}
						break;

					case TAG_STR_FLOAT3:
						$data['name'] = $this->readString();
						$data['data'] = $this->readV3f();
						break;

					case TAG_FLOAT3:
						$data = $this->readV3f();
						break;

					case TAG_STR_INT3:
						$data['name'] = $this->readString();
						$data['data'] = $this->readV3(32);
						break;

					case TAG_INT3:
						$data = $this->readV3(32);
						break;

					case TAG_STR_BYTE3:
						$data['name'] = $this->readString();
						$data['data'] = $this->readV3(8);
						break;

					case TAG_BYTE3:
						$data = $this->readV3(8);
						break;

					case TAG_STR_LIST:
						$data['name']	= $this->readString();
						$data['data']	= array();
						$nextTag		= $this->stream->readBytes(1);
						$length			= $this->stream->readInt(32);

						for($i = 0; $i < $length; $i++){
							array_push($data['data'], $this->parseList($nextTag));
						}
						break;

					case TAG_LIST:
						$data		= array();
						$nextTag	= $this->stream->readBytes(1);
						$length		= $this->stream->readInt(32);

						for($i = 0; $i < $length; $i++){
							array_push($data, $this->parseList($nextTag));
						}
						break;

					case TAG_STR_STRUCT:
						$data['name']	= $this->readString();
						$data['data']	= array();
						$nextTag		= $this->stream->readBytes(1);

						while($nextTag != TAG_FINISH){
							$value = $this->parseTag($nextTag);

							if(is_array($value) && isset($value['name'])){
								$k	= $value['name'];
								$v	= $value['data'];

								if(!array_key_exists($k, $data['data'])){
									$data['data'][$k] = $v;
								}
								else {

									if(!is_array($data['data'][$k])){
										$oldData			= $data['data'][$k];
										$data['data'][$k]	= array();

										array_push($data['data'][$k], $oldData);
									}
									else if(is_array($v) && count(array_diff_key($v, $data['data'][$k])) < 1){
										$oldData			= $data['data'][$k];
										$data['data'][$k]	= array();

										array_push($data['data'][$k], $oldData);
									}

									array_push($data['data'][$k], $v);
								}
							}
							else {
								array_push($data['data'], $value);
							}

							$nextTag = $this->stream->readBytes(1);
						}
						break;

					case TAG_STRUCT:
						$data		= array();
						$nextTag	= $this->stream->readBytes(1);

						while($nextTag != TAG_FINISH){
							$value = $this->parseTag($nextTag);

							if(is_array($value) && isset($value['name'])){
								$k	= $value['name'];
								$v	= $value['data'];

								if(!array_key_exists($k, $data)){
									$data[$k] = $v;
								}
								else {

									if(!is_array($data[$k])){
										$oldData	= $data[$k];
										$data[$k]	= array();

										array_push($data[$k], $oldData);
									}
									else if(is_array($v) && count(array_diff_key($v, $data[$k])) < 1){
										$oldData	= $data[$k];
										$data[$k]	= array();

										array_push($data[$k], $oldData);
									}

									array_push($data[$k], $v);
								}
							}
							else {
								array_push($data, $value);
							}
							$nextTag = $this->stream->readBytes(1);
						}

						break;

					case TAG_STR_SERIAL:
						$data['name']	= $this->readString();
						$data['data']	= null;
						$nextBytes		= null;

						while($nextBytes != chr(8) . chr(0) . chr(8) . 'realname'){
							$data['data']	.= $this->toHex($this->stream->readBytes(1)) . " ";
							$nextBytes		 = $this->stream->readNextBytes(11);
						}

						$data['data'] = substr($data['data'], 0, -1);
						break;

					case TAG_SERIAL:
						$nextBytes = null;

						while(!preg_match('/\xFF.\x00\x00\xF3/', $nextBytes)){
							$data		.= $this->toHex($this->stream->readBytes(1)) . " ";
							$nextBytes	 = $this->stream->readNextBytes(5);
						}

						$data = substr($data, 0, -1);
						break;

					case TAG_RGBA:
						$v = $this->readV4f();
						$data = $this->formater->colorRGBA($v['x'], $v['y'], $v['z'], $v['w']);
						break;

					case TAG_FLOAT16:
						for($i = 0; $i < 4; $i++){
							$data[$i] = $this->readV4f();
						}
						break;

					default:
						throw new Exception("Unrecognized tag type 0x". dechex(ord($tag)). chr(13).chr(10) ." in function ". __CLASS__ ."::". __FUNCTION__ ."()");
						break;
				}
			}
			catch(Exception $e){
				echo 'Error loading \''. $e->getFile() .'\' at line '. $e->getLine() .': <b>'. $e->getMessage() .'</b></br>';
			}

			return $data;
		}

		private function parseList($tag){
			$data = null;

			try {
				switch($tag){
					case TAG_STR_BYTE:
						$data = $this->stream->readInt(8);
						break;

					case TAG_STR_SHORT:
						$data = $this->stream->readInt(16);
						break;

					case TAG_STR_INT:
						$data = $this->stream->readInt(32);
						break;

					case TAG_STR_LONG:
						$data = $this->stream->readInt(64);
						break;

					case TAG_STR_FLOAT:
						$data = $this->stream->readFloat();
						break;

					case TAG_STR_DOUBLE:
						$data = $this->stream->readDouble();
						break;

					case TAG_STR_STRING:
						$data = $this->readString();
						break;

					case TAG_STR_BYTEARRAY:
						$data	= array();
						$length	= $this->stream->readInt(32, true);

						for($i = 0; $i < $length; $i++){
							array_push($data, $this->stream->readInt(8));
						}
						break;

					case TAG_STR_FLOAT3:
						$data = $this->readV3f();
						break;

					case TAG_STR_INT3:
						$data = $this->readV3(32);
						break;

					case TAG_STR_BYTE3:
						$data = $this->readV3(8);
						break;

					default:
						throw new Exception("Unrecognized tag type in ". dechex(ord($tag)). chr(13).chr(10) ." in function ". __CLASS__ ."::". __FUNCTION__ ."()");
						break;
				}
			}
			catch(Exception $e){
				echo 'Error loading \''. $e->getFile() .'\' at line '. $e->getLine() .': <b>'. $e->getMessage() .'</b></br>';
			}

			return $data;
		}

		//=============================	Header Decoder	=============================//
		private function decodeSMBPH(){
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

			$data = array();

			$data['int_a']			= $this->stream->readInt(32);
			$data['type']			= $this->stream->readInt(32);
			$data['bounds_n']		= $this->formater->vector3($this->stream->readFloat(), $this->stream->readFloat(), $this->stream->readFloat());
			$data['bounds_p']		= $this->formater->vector3($this->stream->readFloat(), $this->stream->readFloat(), $this->stream->readFloat());
			$data['blockTableLen']	= $this->stream->readInt(32, true);

			$data['blocks'] = array();
			for($i = 0; $i < $data['blockTableLen']; $i++){
				$data['blocks'][$this->stream->readInt(16)] = $this->stream->readInt(32, true);
			}

			return $data;
		}

		//=============================	 Logic Decoder	=============================//
		private function decodeSMBPL($fileSize){
			/*
				start	type
					0	int					unknown int
					4	int					numControllers (N)
					8	controllerEntry[N]

				controllerEntry is a variable length struct
					0	short[3]			Position of the controller block, for example the core is defined at (8, 8, 8)
					12	int					Number of groups of controlled blocks.  (M)
					16	groupEntry[M]

				groupEntry is a variable length struct
					0	short				Block ID for all blocks in this group
					2	int					Number of blocks in the group (I)
					6	short[3][I]			Array of blocks positions for each of the I blocks

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

			$data = array();

			while ($this->stream->getPos() < $fileSize){
				$data['int_a']			= $this->stream->readInt(32);
				$ctrLen					= $this->stream->readInt(32, true);
				$data['controllers']	= array();

				for($i = 0; $i < $ctrLen; $i++){
					$dict				= array();
					$dict['position']	= $this->formater->vector3($this->stream->readInt(16), $this->stream->readInt(16), $this->stream->readInt(16));
					$numGrp				= $this->stream->readInt(32, true);

					$dict['group'] = array();
					for($j = 0; $j < $numGrp; $j++){
						$tag		= $this->stream->readInt(16);
						$numBlocks	= $this->stream->readInt(32, true);

						$dict['group'][$tag] = array();
						for($x = 0; $x < $numBlocks; $x++){
							array_push($dict['group'][$tag], $this->formater->vector3($this->stream->readInt(16), $this->stream->readInt(16), $this->stream->readInt(16)));
						}
					}
					array_push($data['controllers'], $dict);
				}
			}
			return $data;
		}

		//=============================	 Meta Decoder	=============================//
		private function decodeSMBPM(){
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

			$data	= array();

			$data['int_a']	= $this->stream->readInt(32);
			$data['byte_a']	= $this->stream->readInt(8);
			$data['int_b']	= $this->stream->readInt(32);

			if($data['byte_a'] == 3){

				$numDouble = $this->stream->readInt(8);
				$data['doubleLst']	= array();
				for($i = 0; $i < $numDouble; $i++){
					array_push($data['doubleLSt'], $this->stream->readDouble());
				}

				$numDocked		= $this->stream->readInt(16, true);
				$data['docked']	= array();

				for($i = 0; $i < $numDocked; $i++){
					$name	= $this->stream->readString();
					$tag	= $this->stream->readBytes(1);

					$data['docked'][$name] = array();

					while($tag != null){
						$value = $this->parseTag($tag);

						if(isset($value['name'])){
							$data['docked'][$name][$value['name']] = $value['data'];
						}
						else{
							array_push($data['docked'][$name], $value);
						}

						$tag = $this->stream->readBytes(1);
					}
					fseek($this->Stream, $pos - 1);
				}

				$pos = $this->stream->getPos();

				$data['gzip']	= $this->stream->readInt(16);
				$tag			= $this->stream->readBytes(1);

				while($tag != null){

					$value = $this->parseTag($tag);

					if(isset($value['name'])){
						$data[$value['name']] = $value['data'];
					}
					else{
						array_push($data, $value);
					}

					$tag = $this->stream->readBytes(1);
				}
			}

			return $data;
		}

		//=============================	Modele Decoder	=============================//
		private function decodeSMD2($fileSize){
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
			$data['int_a']				= $this->stream->readInt(32);
			$data['chunkIndex']			= array();
			$data['chunkTimestamps']	= array();
			$numChunks = ($fileSize - 4 - 32768 - 32768) / 5120;


			//First 32KB area
			for($i = 0; $i < 4096; $i++){
				$chunkId	= $this->stream->readInt(32);
				$chunkLen	= $this->stream->readInt(32);

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
			for($i = 0; $i < 4096; $i++){
				$timestamp = $this->stream->readInt(64);

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
					$chunkDict['byte_a']	= $this->stream->readBytes(1);
					$compressed				= $compressed - 1;
				}

				$chunkDict['timestamp']	= $this->stream->readInt(64);
				$chunkDict['pos']		= $this->formater->vector3($this->stream->readInt(32), $this->stream->readInt(32), $this->stream->readInt(32));
				$chunkDict['type']		= $this->stream->readBytes(1);
				$chunkDict['blocks']	= array();

				$inLen		= $this->stream->readInt(32);
				$inData		= $this->stream->readBytes($compressed);
				$outData	= gzuncompress($inData);

				for($j = 0; $j < 4096; $j++){
					$id		= $j * 3;
					$str	= chr(0);

					for($k = 0; $k < 3; $k++){
						$str .= $outData[$id + $k];
					}

					// $blockData	= $this->binToInt32($str);
					$blockData	= $this->bin->int($this->bin->bytesToBin($str));
					$blockId	= $this->bin->bits($blockData, 0, 11);

					if($blockId != 0){
						$pos	= array($j % 16, ($j / 16) % 16, ($j / 256) % 16);
						$posStr	= ($pos[0] * 16) . ',' . ($pos[1] * 16) . ',' . ($pos[2] * 16);

						$chunkDict['blocks'][$posStr] = array(
							'id'		=> $blockId,
							'hp'		=> $this->bin->bits($blockData, 11, 9),
							'isActive'	=> $this->bin->bits($blockData, 20, 1),
							'orient'	=> $this->bin->bits($blockData, 21, 3)
						);
					}

				}

				array_push($data['chunks'], $chunkDict);
			}

			return $data;
		}

		//=============================	   Extractor	=============================//
		private function extractSMENT($file, $formated){
			$content = array();

			try {
				// open compressed
				$zip = zip_open($file);

				// look for error
				if(!is_resource($zip)){
					throw new Exception($this->zipFileErrMsg($zip) ." in function ". __CLASS__ ."::". __FUNCTION__ ."()");
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

							$content[$splited[1]][$splited[2]] = $this->decodeSMFile("data://text/plain;base64," . base64_encode($data), $formated, $ext, $size);

							zip_entry_close($zip_entry);
						}
						else if(count($splited) === 2){
							$ext = explode('.', $splited[1]);
							$ext = $ext[count($ext) - 1];
							$data = zip_entry_read($zip_entry, zip_entry_filesize($zip_entry));
							$size = zip_entry_filesize($zip_entry);

							$content[$splited[1]] = $this->decodeSMFile("data://text/plain;base64," . base64_encode($data), $formated, $ext, $size);

							zip_entry_close($zip_entry);
						}

					}
				}

				// close compressed
				zip_close($zip);
			}
			catch(Exception $e){
				echo 'Error loading \''. $e->getFile() .'\' at line '. $e->getLine() .': <b>'. $e->getMessage() .'</b></br>';
			}

			return $content;
		}

		private function extractSMSKIN($file){
			$content = array();

			try {
				// open compressed
				$zip = zip_open($file);

				// look for error
				if(!is_resource($zip)){
					throw new Exception($this->zipFileErrMsg($zip) ." in function ". __CLASS__ ."::". __FUNCTION__ ."()");
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
			}
			catch(Exception $e){
				echo 'Error loading \''. $e->getFile() .'\' at line '. $e->getLine() .': <b>'. $e->getMessage() .'</b></br>';
			}

			return $content;
		}

		//===========================================================================//
		private function readString(){
			$length = $this->stream->readInt(16, true); //read unsigned int16 (true)
			$string = '';

			if($length > 0){
				$string = $this->stream->readBytes($length);
			}

			return $string;
		}

		private function readV3($int){
			return $data = $this->formater->vector3($this->stream->readInt($int), $this->stream->readInt($int), $this->stream->readInt($int));
		}

		private function readV4($int){
			return $data = $this->formater->vector4($this->stream->readInt($int), $this->stream->readInt($int), $this->stream->readInt($int), $this->stream->readInt($int));
		}

		private function readV3f(){
			return $data = $this->formater->vector3($this->stream->readFloat(), $this->stream->readFloat(), $this->stream->readFloat());
		}

		private function readV4f(){
			return $this->formater->vector4($this->stream->readFloat(), $this->stream->readFloat(), $this->stream->readFloat(), $this->stream->readFloat());
		}

		private function toHex($chr){
			return "0x" . bin2hex($chr);
		}
	}


	//--------------------------------------------
	// SMFormater Class
	//--------------------------------------------
	class SMFormater {
		//=============================	 SMD Formater	=============================//
		/*
		 * catalog($data)
		 *
		 * @param array $data decoded CATALOG.cat
		 * @return array of StarOS formated CATALOG.cat
		 */
		public function catalog($data){
			$formated	= array();
			$shipLst	= $data['cv0']['pv0'];
			$rateLst	= $data['cv0']['r0'];

			for($i = 0; $i < count($shipLst); $i++){

				$name		= $shipLst[$i][0];
				$permArr	= $this->permission($shipLst[$i][2]);
				$perm		= array(
					'faction'	=> $permArr[0],
					'other'		=> $permArr[1],
					'homebase'	=> $permArr[2],
					'admin'		=> $permArr[3],
					'enemy'		=> $permArr[4]
				);

				$formated[$name] = array(
					'creator'		=> $shipLst[$i][1],
					'permissions'	=> $perm,
					'price'			=> $shipLst[$i][3],
					'description'	=> $shipLst[$i][4],
				);

				if(isset($rateLst[$name])){
					for($j = 0; $j < count($rateLst[$name]); $j++){
						$user = $rateLst[$name][$j][0];
						$formated[$name]['rate'][$user]	= $rateLst[$name][$j][1];
					}
				}

				//version 0.17+
				if(count($shipLst[$i]) > 5){
					$formated[$name]['created']	= $shipLst[$i][5];
					$formated[$name]['int_b']	= $shipLst[$i][6];
				}

				//version 0.18+
				if(count($shipLst[$i]) > 7){
					$formated[$name]['mass']	= $shipLst[$i][7];
					$formated[$name]['type']	= $shipLst[$i][8];
					$formated[$name]['struct']	= $shipLst[$i][9];
				}
			}

			return $formated;
		}

		/*
		 * entity($data)
		 *
		 * @param array $data decoded *.ent
		 * @return array of StarOS formated *.ent
		 */
		public function entity($data){
			
		}

		/*
		 * faction($data)
		 *
		 * @param array $data decoded FACTIONS.fac
		 * @return array of StarOS formated FACTIONS.fac
		 */
		public function faction($data){
			$formated	= array(
				'factions'		=> array(),
				'pendingInv'	=> array(),
				'diplomaties'	=> array(),
				'newsBoard'		=> array(),
				'lastTurn'		=> $data['factions-v0'][4],
				'0FN'			=> $data['factions-v0']['NStruct']['0FN'],
				3				=> $data['factions-v0'][3]
			);
			$ranks			= array();
			$members		= array();
			$enemys			= array();
			$factions		= $data['factions-v0'][0]['f0'];
			$invites		= $data['factions-v0'][1];
			$diplomaties	= $data['factions-v0'][2];
			$messages		= $data['factions-v0']['NStruct']['FN'];

			//formating faction
			for($i = 0; $i < count($factions); $i++){
				$fid						= $factions[$i]['id'];

				//ranks and permissions
				for($j = 0; $j < count($factions[$i][0][1][1]); $j){
					$perms		= $this->permission($factions[$i][0][1][1][$j]);

					$ranks[$j]['name'] = $factions[$i][0][1][2][$j];
					$ranks[$j]['perm'] = array(
						'edit'			=> $perms[0],
						'kick'			=> $perms[1],
						'invite'		=> $perms[2],
						'perms edit'	=> $perms[3]
					);
				}

				//members
				for($j = 0; $j < count($factions[$i]['mem'][0]); $j){
					$members[$j] = array(
						'name'			=> $factions[$i]['mem'][0][$j][0],
						'rankId'		=> $factions[$i]['mem'][0][$j][1],
						'lastLogin'		=> $factions[$i]['mem'][0][$j][2],
						'currentPos'	=> $factions[$i]['mem'][0][$j][3],
						'lastSeen'		=> $factions[$i]['mem'][0][$j][4],
					);
				}

				//enemys
				for($j = 0; $j < count($factions[$i]['mem'][1]); $j){
					$enemys[$j] = $factions[$i]['mem'][1][$j];
				}

				//factions permissions
				$fPerm = array(
					'public'		=> ($factions[$i][4]	== 1) ? true : false,
					'warOnHostile'	=> ($factions[$i]['aw'] == 1) ? true : false,
					'NeutralEnemy'	=> ($factions[$i]['en'] == 1) ? true : false,
				);

				//home base
				$home = array(
					'uid' 		=> $factions[$i]['home'],
					'sector'	=> $factions[$i][5],
				);

				//stats
				$stats = array(
					'points'			=> $factions[$i][9],
					'netIncome'			=> $factions[$i][11],
					'gainedOffline'		=> $factions[$i][12],
					'gainedOnline'		=> $factions[$i][13],
					'spentFlat'			=> $factions[$i][14],
					'spentDistances'	=> $factions[$i][16],
					'countDeath'		=> $factions[$i][17],
					'pointsDeath'		=> $factions[$i][18],
					'controlled'		=> $factions[$i][19],
				);

				//unknown data
				$unk = array(
					'fn'	=> $factions[$i]['fn'],
					3		=> $factions[$i][3],
					6		=> $factions[$i][6],
					7		=> $factions[$i][7],
					8		=> $factions[$i][8],
					15		=> $factions[$i][15],
				);

				$formated['factions'][$fid]	= array(
					'uid'			=> $factions[$i][0][0],
					'name'			=> $factions[$i][1],
					'description'	=> $factions[$i][2],
					'home'			=> $home,
					'members'		=> $members,
					'enemys'		=> $enemys,
					'permissions'	=> $fPerm,
					'ranks'			=> $ranks,
					'lastStats'		=> $stats,
					'unkData'		=> $unk
				);
			}

			//formating pending invitations
			for($i = 0; $i < count($invites); $i++){
				$formated['pendingInv'][$i]	= array(
					'from'		=> $invites[$i][0],
					'to'		=> $invites[$i][1],
					'fid'		=> $invites[$i][2],
					'emmited'	=> $invites[$i][3]
				);
			}

			//formating diplomaties
			for($i = 0; $i < count($diplomaties); $i++){
				$fid0 = $diplomaties[$i][0];
				$fid1 = $diplomaties[$i][1];

				//if there is no data for faction 1 make the array
				if(!array_key_exists($fid0, $formated['diplomaties'])){
					$formated['diplomaties'][$fid0] = array(
						'enemys'	=> array(),
						'allied'	=> array()
					);
				}

				//if there is no data for faction 2 make the array
				if(!array_key_exists($fid1, $formated['diplomaties'])){
					$formated['diplomaties'][$fid1] = array(
						'enemys'	=> array(),
						'allied'	=> array()
					);
				}

				//enemys value = 1, allied value = 2
				if($diplomaties[$i][2] == 1){
					array_push($formated['diplomaties'][$fid0]['enemys'], $fid1);
					array_push($formated['diplomaties'][$fid1]['enemys'], $fid0);
				}
				else {
					array_push($formated['diplomaties'][$fid0]['allied'], $fid1);
					array_push($formated['diplomaties'][$fid1]['allied'], $fid0);
				}
			}

			//formating newsBoard
			if(count($messages) > 0){
				if(array_key_exists('fp-v0', $messages)){
					$msg = $messages[$i]['fp-v0'];

					$formated['newsBoard'][0] = array(
						'fid'		=> $msg['id'],
						'author'	=> $msg['op'],
						'title'		=> $msg['top'],
						'msg'		=> $msg['msg'],
						'date'		=> $msg['dt'],
						'perm'		=> $msg['perm']
					);
				}
				else {
					for($i = 0; $i < count($messages); $i++){
						$msg = $messages[$i]['fp-v0'];

						$formated['newsBoard'][$i] = array(
							'fid'		=> $msg['id'],
							'author'	=> $msg['op'],
							'title'		=> $msg['top'],
							'msg'		=> $msg['msg'],
							'date'		=> $msg['dt'],
							'perm'		=> $msg['perm']
						);
					}
				}
			}

			return $formated;
		}

		/*
		 * header($data)
		 *
		 * @param array $data decoded header.smbph
		 * @return array of StarOS formated header.smbph
		 */
		public function header($data){
			
		}

		/*
		 * logic($data)
		 *
		 * @param array $data decoded logic.smbpl
		 * @return array of StarOS formated logic.smbpl
		 */
		public function logic($data){
			
		}

		/*
		 * meta($data)
		 *
		 * @param array $data decoded meta.smbpm
		 * @return array of StarOS formated meta.smbpm
		 */
		public function meta($data){
			
		}

		/*
		 * smd2($data)
		 *
		 * @param array $data decoded *.smd2
		 * @return array of StarOS formated *.smd2
		 */
		public function smd2($data){
			
		}

		//==========================   Entity Formater	=============================//
		private function shop($data){
			
		}

		private function station($data){
			
		}

		private function astseroid($data){
			
		}

		private function planetCore($data){
			
		}

		private function planet($data){
			
		}

		private function ship($data){
			
		}

		private function creature($data){
			
		}

		private function playerChar($data){
			
		}

		private function playerState($data){
			
		}

		//=============================	 Sub Formater	=============================//
		/*
		 * permission($int)
		 *
		 * @param int $int
		 * @return array of bool from int
		 */
		public function permission($int){
			$perm	= str_pad(decbin($int), 16, '0', STR_PAD_LEFT);
			$perm	= str_split($perm, 1);
			$arr	= array();

			for($i = count($perm); $i--;){
				array_push($arr, ($perm[$i] == '1')? true : false);
			}

			return $arr;
		}

		/*
		 * vector3($x, $y, $z)
		 *
		 * @param number $x x coordinate
		 * @param number $y y coordinate
		 * @param number $z z coordinate
		 * @return array of coordinate
		 */
		public function vector3($x, $y, $z){
			return array(
				'x' => $x,
				'y' => $y,
				'z' => $z
			);
		}

		/*
		 * vector4($data)
		 *
		 * @param number $x x coordinate
		 * @param number $y y coordinate
		 * @param number $z z coordinate
		 * @param number $w w coordinate
		 * @return array of coordinate
		 */
		public function vector4($x, $y, $z, $w){
			return array(
				'x' => $x,
				'y' => $y,
				'z' => $z,
				'w' => $w
			);
		}

		/*
		 * colorRGBA($r, $g, $b, $a)
		 *
		 * @param number $r color value for red
		 * @param number $g color value for green
		 * @param number $b color value for blue
		 * @param number $a alpha value
		 * @return array of RGBA color
		 */
		public function colorRGBA($r, $g, $b, $a){
			return array(
				'r' => $r,
				'g' => $g,
				'b' => $b,
				'a' => $a,
			);
		}
	}

?>