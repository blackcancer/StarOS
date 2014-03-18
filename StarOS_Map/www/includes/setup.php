<?php
	/*
		Based on: StarOS Map
		Description: this file is used only for setup and update the starmap
		License: http://creativecommons.org/licenses/by/3.0/legalcode

		FileVersion: 0.1-rev00013					Date: 2013-12-28
		By Blackcancer

		website: http://initsysrev.net
		support: blackcancer@initsysrev.net
	*/

	header('Content-Type: text/html; charset=UTF-8');
	include_once "SMDecoder.php";

	if(count($argv) < 2){
		echo "Enter the directory of your starmade install.\n";
		echo "The recomended example is: \"php " . implode(" ", $argv) . " /home/starmade/\".\n";
		die();
	}

	$SMD = new SMDecoder();

	$starmadeDirectory = $argv[1];
	$serverDatabase = $starmadeDirectory . "server-database/";
	$blueprintsDir = $starmadeDirectory . "blueprints/";

	echo "Loading entity and player files...\n";
	createEntityDatabase($serverDatabase, $SMD);

	echo "Loading faction information...\n";
	createFactionDatabase($serverDatabase, $SMD);

	echo "Loading catalog information...\n";
	createCatalogDatabase($serverDatabase, $SMD);

	echo "Loading blueprint files...\n";
	createBlueprintDatabase($blueprintsDir, $SMD);

	function createEntityDatabase($dir, $SMD) {
		$entityFiles	= glob($dir . "ENTITY_*", GLOB_NOSORT); // Find all of the playerstate files
		$jsonDir		= "../scripts/StarOS_json/";
		$players		= array();
		$database		= array();
		$entList		= array();

		foreach ($entityFiles as $entity) {
			$ext = pathinfo($entity, PATHINFO_EXTENSION);

			if (!($ext == "ent")) {
				continue;
			}

			if (!(strpos($entity, 'ENTITY_PLAYERSTATE_') === false) ) {
				$ent		= $SMD->decodeSMFile($entity, true);
				$fileName	= "PLAYERSTATE_". $ent['name'] .".json";

				if (!file_exists($jsonDir."Player/")) {
					mkdir($jsonDir."Player/", 0655, true);
				}

				file_put_contents($jsonDir."Player/".$fileName, json_encode($ent, JSON_FORCE_OBJECT));
				continue;
			}

			if (!(strpos($entity, 'ENTITY_PLAYERCHARACTER_') === false) ) {
				$ent		= $SMD->decodeSMFile($entity, true);

				preg_match('/(?:ENTITY_PLAYERCHARACTER_)(.*)(?:.ent)/', $entity, $matches);

				$fileName	= "PLAYERCHARACTER_".$matches[1].".json";

				if (!file_exists($jsonDir."Player/")) {
					mkdir($jsonDir."Player/", 0655, true);
				}

				file_put_contents($jsonDir."Player/".$fileName, json_encode($ent, JSON_FORCE_OBJECT));
				continue;
			}

			$ent	= $SMD->decodeSMFile($entity, true);
			$uid	= null;
			$type	= null;
			$sPos	= null;
			$sector	= null;
			$fid	= null;

			$uid	= $ent['uniqueId'];
			$sPos	= $ent['transformable']['sPos'];
			$fid	= $ent['transformable']['fid'];
			$name	= $ent['realname'];

			if(strpos($uid, 'SHOP') !== false){
				$type = 1;
			}
			else if(strpos($uid, 'SPACESTATION') !== false){
				$type = 2;
			}
			else if(strpos($uid, 'FLOATINGROCK') !== false){
				$type = 3;
			}
			else if(strpos($uid, 'PLANET') !== false){
				$type = 4;
			}
			else if(strpos($uid, 'SHIP') !== false){
				if($name == "Turret"){
					$type = 6;
					$ent['type'] = $type;
				}
				else {
					$type = 5;
				}
			}

			$sector = $sPos['x'] . "_" . $sPos['y'] . "_" . $sPos['z'];

			$entity = array(
				'type'		=> $type,
				'realname'	=> $name,
				'sPos'		=> $sPos,
				'fid'		=> $fid
			);

			$database[$uid] = $entity;

			if (!file_exists($jsonDir."Entities/")) {
				mkdir($jsonDir."Entities/", 0655, true);
			}

			file_put_contents($jsonDir."Entities/". $uid .".json", json_encode($ent, JSON_FORCE_OBJECT));
		}

		asort($database);
		file_put_contents($jsonDir."Entities/DATABASE.json", json_encode($database, JSON_FORCE_OBJECT));
	}

	function createFactionDatabase($dir, $SMD) {
		
		$ent = $SMD->decodeSMFile($dir . "FACTIONS.fac", true);
		file_put_contents("../scripts/StarOS_json/FACTIONS.json", json_encode($ent, JSON_FORCE_OBJECT));

	}

	function createCatalogDatabase($dir, $SMD) {
		$ent = $SMD->decodeSMFile($dir . "CATALOG.cat", true);
		file_put_contents("../scripts/StarOS_json/CATALOG.json", json_encode($ent, JSON_FORCE_OBJECT));
	}

	function createBlueprintDatabase($dir, $SMD){
		$dirs = array_filter(glob($dir . "*"), 'is_dir');
		$jsonPath = "../scripts/StarOS_json/Blueprint/";

		for($i = 0; $i < count($dirs); $i++){
			$header = $SMD->decodeSMFile($dirs[$i] . "/header.smbph");
			$logic = $SMD->decodeSMFile($dirs[$i] . "/logic.smbpl");
			$meta = $SMD->decodeSMFile($dirs[$i] . "/meta.smbpm");


			$dirName = explode("/", $dirs[$i]);
			$dirName = $dirName[count($dirName) - 1];

			$modeles = glob($dirs[$i] . "/DATA/*", GLOB_NOSORT);

			if (!file_exists($jsonPath . $dirName)) {
				mkdir($jsonPath . $dirName, 0655, true);
				mkdir($jsonPath . $dirName . "/DATA", 0655, true);
			}

			for($j = 0; $j < count($modeles); $j++){
				$smd2 = $SMD->decodeSMFile($modeles[$i]);
				
				$fileName = explode("/", $modeles[$i]);
				$fileName = $fileName[count($fileName) - 1];
				$fileName = substr($fileName,0 , -4) . "json";

				file_put_contents($jsonPath . $dirName . "/DATA/" . $fileName, json_encode($smd2, JSON_FORCE_OBJECT));
			}

			file_put_contents($jsonPath . $dirName . "/header.json", json_encode($header, JSON_FORCE_OBJECT));
			file_put_contents($jsonPath . $dirName . "/logic.json", json_encode($logic, JSON_FORCE_OBJECT));
			file_put_contents($jsonPath . $dirName . "/meta.json", json_encode($meta, JSON_FORCE_OBJECT));
		}
	}
?>
