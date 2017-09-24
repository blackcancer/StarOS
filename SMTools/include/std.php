<?php
	/*
		Product: Binary & StreamReader Class
		Description: Read data from UTF-8 stream and convert binary data to numbers
		License: http://creativecommons.org/licenses/by/3.0/legalcode

		FileVersion: 0.1-rev00003					Date: 2015-12-23
		By Blackcancer

		website: http://initsysrev.net
		support: blackcancer@initsysrev.net
		credit:	- http://phpjs.org
	*/

	header('Content-Type: text/html; charset=UTF-8');

	define("NULL32",		"00000000000000000000000000000000");
	define("NULL64",		"0000000000000000000000000000000000000000000000000000000000000000");
	define("NULLFLOAT",		(float)		0);
	define("NULLDOUBLE",	(double)	0);


	//--------------------------------------------
	// Binary Class
	//--------------------------------------------
	class Binary {
		/*
		 * int($bin, $isUint)
		 *
		 * @param string $bin a binary string to convert to int
		 * @param bool isUint if set to true, convert to unsigned int
		 * @return int value of $bin
		 */
		public function int($bin, $isUint = false){
			$number	= null;
			$length	= strlen($bin);
			$minLength = 8;
			$maxLength = 64;

			try {
				if($length < $minLength){
					throw new Exception("Binary length (". $length .") must be longer than ". $minLength ." in function ". __CLASS__ ."::". __FUNCTION__ ."()");
				}

				if($length > $maxLength){
					throw new Exception("Binary length (". $length .") must be shorter than ". $maxLength ." in function ". __CLASS__ ."::". __FUNCTION__ ."()");
				}

				if(($length % 8) != 0){
					throw new Exception("Binary length (". $length .") must be a multiple of 8 in function ". __CLASS__ ."::". __FUNCTION__ ."()");
				}

				if($bin[0] == '0' or $isUint == true){
					$number = bindec($bin);
				}
				else {
					$out = '';
					$mode = 'init';

					for($i = $length -1; $i >= 0; $i--){

						if($mode != 'init'){
							$out = ($bin[$i] == '0' ? '1' : '0') . $out;
						}
						else {

							if($bin[$i] == '1'){
								$out = '1' . $out;
								$mode = 'invert';
							}
							else {
								$out = '0' . $out;
							}

						}

					}

					$number = bindec($out) * (-1);
				}

			}
			catch(Exception $e){
				throw new Exception('Error loading \''. $e->getFile() .'\' at line '. $e->getLine() .': '. $e->getMessage());
			}

			return $number;
		}

		/*
		 * float($bin)
		 *
		 * @param string $bin a binary string to convert to float
		 * @return float value of $bin
		 */
		public function float($bin){
			$number = null;
			$length	= strlen($bin);
			$maxLength = 32;

			try {
				if($length != $maxLength){
					throw new Exception("Binary length (". $length .") must be equal ". $maxLength ." in function ". __CLASS__ ."::". __FUNCTION__ ."()");
				}

				if($bin === NULL32){
					$number = NULLFLOAT;
				}
				else {
					$hex = base_convert($bin, 2, 16);
					$toAdd	= 8 - strlen($hex);
					
					for($i = 0; $i < $toAdd; $i++){
						$hex = '0' . $hex;
					}

					
					$hex = chunk_split($hex, 2, " ");
					$hex = substr($hex, 0, -1);
					$hex = $this->hexReverse($hex);
					$hex = $this->hexify($hex);

					if($hex === false){
						throw new Exception("Invalide hex for float in function ". __CLASS__ ."::". __FUNCTION__ ."()");
					}

					$dec = unpack("f", $hex);

					if($dec[1] == (-0)){
						$dec[1] = (float)0;
					}

					$number = $dec[1];
				}

			}
			catch(Exception $e){
				throw new Exception('Error loading \''. $e->getFile() .'\' at line '. $e->getLine() .': '. $e->getMessage());
			}

			return $number;
		}

		/*
		 * double($bin)
		 *
		 * @param string $bin a binary string to convert to double
		 * @return double value of $bin
		 */
		public function double($bin){
			$number = null;
			$length	= strlen($bin);
			$maxLength = 64;

			try {
				if($length != $maxLength){
					throw new Exception("Binary length (". $length .") must be equal ". $maxLength ." in function ". __CLASS__ ."::". __FUNCTION__ ."()");
				}

				if($bin === NULL64){
					$number = NULLDOUBLE;
				}
				else {
					$hex	= base_convert($bin, 2, 16);
					$toAdd	= 16 - strlen($hex);
					
					for($i = 0; $i < $toAdd; $i++){
						$hex = '0' . $hex;
					}

					$hex	= chunk_split($hex, 2, " ");
					$hex	= substr($hex, 0, -1);
					$hex	= $this->hexReverse($hex);
					$hex	= $this->hexify($hex);

					if($hex === false){
						throw new Exception("Invalide hex for double in function ". __CLASS__ ."::". __FUNCTION__ ."()");
					}

					$dec = unpack("d", $hex);
					$number = $dec[1];
				}
			}
			catch(Exception $e){
				throw new Exception('Error loading \''. $e->getFile() .'\' at line '. $e->getLine() .': '. $e->getMessage());
			}

			return $number;
		}

		/*
		 * bits($x, $start, $length)
		 *
		 * @param int $x
		 * @param int $start
		 * @param int $length
		 * @return 
		 */
		public function bits($x, $start, $length){
			//Used to mask a portion of a bitfield.
			$x = $x >> $start;
			$x = $x & (pow(2, $length )-1);

			return $x;
		}

		/*
		 * bytesToBin($bytes)
		 *
		 * @param string $bytes bytes string to convert to binary string
		 * @return binary string of $bytes
		 */
		public function bytesToBin($bytes){
			$bin = null;
			$length = strlen($bytes);

			try {
				if($bytes === null){
					throw new Exception("Null bytes in function ". __CLASS__ ."::". __FUNCTION__ ."()");
				}

				for($i = 0; $i < $length; $i++){
					$bin .= sprintf("%08b", ord($bytes[$i]));
				}
			}
			catch(Exception $e){
				throw new Exception('Error loading \''. $e->getFile() .'\' at line '. $e->getLine() .': '. $e->getMessage());
			}

			return $bin;
		}

		private function hexReverse($hex){
			$return	= "";
			$hexArr	= explode(" ", $hex);

			foreach ($hexArr as $i) {
				$return = $i . " " . $return;
			}

			$return = substr($return, 0, -1);
			return $return;
		}

		private function hexify($hex){
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
	}


	//--------------------------------------------
	// StreamReader Class
	//--------------------------------------------
	class StreamReader {
		protected $Stream;

		/*
		 * __construct($stream)
		 *
		 * @param stream $stream if set, set $this->stream = $stream
		 */
		public function __construct($stream = null){
			$this->Stream = $stream;
		}

		/*
		 * setStream($file)
		 *
		 * @param file or stream $file set $this->stream = stream of $file
		 */
		public function setStream($file){
			try {
				if(is_string($file)){
					$this->Stream = fopen($file, "rb");
				}
				else if(get_resource_type($file) == 'stream'){
					$this->Stream = $file;
				}
			}
			catch(Exception $e){
				throw new Exception('Error loading \''. $e->getFile() .'\' at line '. $e->getLine() .': '. $e->getMessage());
			}
		}

		/*
		 * getPos()
		 *
		 * @return current position of $this->stream
		 */
		public function getPos(){
			return ftell($this->Stream);
		}

		/*
		 * getPos()
		 *
		 * close $this->stream
		 */
		public function closeStream(){
			if(is_resource($this->Stream)){
				fclose($this->Stream);
			}
			else {
				$this->Stream = null;
			}
		}

		/*
		 * readBytes($length)
		 *
		 * @param int $length read $length bytes of $this->stream
		 * @return string read bytes
		 */
		public function readBytes($length){
			$bytes = null;

			try {
				$bytes = fread($this->Stream, $length);
			}
			catch(Exception $e){
				throw new Exception('Error loading \''. $e->getFile() .'\' at line '. $e->getLine() .': '. $e->getMessage());
			}

			return $bytes;
		}

		/*
		 * readNextBytes($length)
		 *
		 * @param int $length read next $length bytes of $this->stream
		 * @return string read bytes
		 */
		public function readNextBytes($length){
			$pos	= ftell($this->Stream);
			$bytes	= $this->readBytes($length);
			fseek($this->Stream, $pos);

			return $bytes;
		}

		/*
		 * readInt($size, $isUint)
		 *
		 * @param int $size bits to read
		 * @param int $isUint if set to true, return unsigned int
		 * @return int of $size bits
		 */
		public function readInt($size = 8, $isUint = false){
			$Binary = new Binary();
			$number = null;

			try {
				$bytes	= $this->readBytes($size/8);
				$bin	= $Binary->bytesToBin($bytes);
				$number	= $Binary->int($bin, $isUint);
			}
			catch(Exception $e){
				echo 'Error loading \''. $e->getFile() .'\' at line '. $e->getLine() .': <b>'. $e->getMessage() .'</b></br>';
			}

			return $number;
		}

		/*
		 * readFloat()
		 *
		 * @return float
		 */
		public function readFloat(){
			$Binary = new Binary();
			$number = null;

			try {
				$bytes	= $this->readBytes(4);
				$bin	= $Binary->bytesToBin($bytes);
				$number	= $Binary->float($bin);
			}
			catch(Exception $e){
				echo 'Error loading \''. $e->getFile() .'\' at line '. $e->getLine() .': <b>'. $e->getMessage() .'</b></br>';
			}

			return $number;
		}

		/*
		 * readDouble()
		 *
		 * @return double
		 */
		public function readDouble(){
			$Binary = new Binary();
			$number = null;

			try {
				$bytes	= $this->readBytes(8);
				$bin	= $Binary->bytesToBin($bytes);
				$number	= $Binary->double($bin);
			}
			catch(Exception $e){
				echo 'Error loading \''. $e->getFile() .'\' at line '. $e->getLine() .': <b>'. $e->getMessage() .'</b></br>';
			}

			return $number;
		}
	}

	/*
	 * zipFileErrMsg($errno)
	 *
	 * @param string zip error message
	 * @return string formated zip error message
	 */
	function zipFileErrMsg($errno){
		// using constant name as a string to make this function PHP4 compatible
		$zipFileFunctionsErrors = array(
			'ZIPARCHIVE::ER_MULTIDISK'		=> 'Multi-disk zip archives not supported.',
			'ZIPARCHIVE::ER_RENAME'			=> 'Renaming temporary file failed.',
			'ZIPARCHIVE::ER_CLOSE'			=> 'Closing zip archive failed',
			'ZIPARCHIVE::ER_SEEK'			=> 'Seek error',
			'ZIPARCHIVE::ER_READ'			=> 'Read error',
			'ZIPARCHIVE::ER_WRITE'			=> 'Write error',
			'ZIPARCHIVE::ER_CRC'			=> 'CRC error',
			'ZIPARCHIVE::ER_ZIPCLOSED'		=> 'Containing zip archive was closed',
			'ZIPARCHIVE::ER_NOENT'			=> 'No such file.',
			'ZIPARCHIVE::ER_EXISTS'			=> 'File already exists',
			'ZIPARCHIVE::ER_OPEN'			=> 'Can\'t open file',
			'ZIPARCHIVE::ER_TMPOPEN'		=> 'Failure to create temporary file.',
			'ZIPARCHIVE::ER_ZLIB'			=> 'Zlib error',
			'ZIPARCHIVE::ER_MEMORY'			=> 'Memory allocation failure',
			'ZIPARCHIVE::ER_CHANGED'		=> 'Entry has been changed',
			'ZIPARCHIVE::ER_COMPNOTSUPP'	=> 'Compression method not supported.',
			'ZIPARCHIVE::ER_EOF'			=> 'Premature EOF',
			'ZIPARCHIVE::ER_INVAL'			=> 'Invalid argument',
			'ZIPARCHIVE::ER_NOZIP'			=> 'Not a zip archive',
			'ZIPARCHIVE::ER_INTERNAL'		=> 'Internal error',
			'ZIPARCHIVE::ER_INCONS'			=> 'Zip archive inconsistent',
			'ZIPARCHIVE::ER_REMOVE'			=> 'Can\'t remove file',
			'ZIPARCHIVE::ER_DELETED'		=> 'Entry has been deleted',
		);

		$errmsg = 'unknown';

		foreach ($zipFileFunctionsErrors as $constName => $errorMessage) {
			if (defined($constName) and constant($constName) === $errno) {
				return 'Zip File Function error: '.$errorMessage;
			}
		}

		return 'Zip File Function error: unknown';
	}
?>