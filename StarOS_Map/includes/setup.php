<?php
	/*
		Based on: StarOS Map
		Description: this file is used only for setup and update the starmap
		License: http://creativecommons.org/licenses/by/3.0/legalcode

		FileVersion: 0.1-rev00011					Date: 2013-12-28
		By Blackcancer

		website: http://initsysrev.net
		support: blackcancer@initsysrev.net
	*/

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
	
	echo "Now loading entity and player files...\n";
	createEntityDatabase($serverDatabase, $SMD);
	
	echo "Now loading faction information...\n";
	createFactionDatabase($serverDatabase, $SMD);
	
	echo "Now loading catalog information...\n";
	createCatalogDatabase($serverDatabase, $SMD);
	
	echo "Now loading blueprint files...\n";
	createBlueprintDatabase($blueprintsDir, $SMD);

	function createEntityDatabase($dir, $SMD) {
		$entityFiles = glob($dir . "ENTITY_*", GLOB_NOSORT); // Find all of the playerstate files
		$jsonDir = "../scripts/StarOS_json/";
		$players = array();
		$systems = array();
		$sectors = array();
		$entities = array();
		$entList = array();

		foreach ($entityFiles as $entity) {
			$ext = pathinfo($entity, PATHINFO_EXTENSION);
			
			if (!($ext == "ent")) {
				continue;
			}

			if (!(strpos($entity, 'ENTITY_PLAYER') === false) && !(strpos($entity, 'ENTITY_PLAYERSTATE_') === false) ) {
				$ent = $SMD->decodeSMFile($entity, true);
				$fileName = "Stats_".$ent['name'].".json";
				file_put_contents("../scripts/StarOS_json/Players/".$fileName, json_encode($ent));
				
				array_push($players, $ent['name']);
				continue;
			}

			if (!(strpos($entity, 'ENTITY_PLAYER') === false) && !(strpos($entity, 'ENTITY_PLAYERCHARACTER_') === false) ) {
				$ent = $SMD->decodeSMFile($entity, true);
				$fileName = "Character_".$ent['name'].".json";
				file_put_contents("../scripts/StarOS_json/Players/".$fileName, json_encode($ent));
				continue;
			}

			$ent = $SMD->decodeSMFile($entity, true);
			$key = array_keys($ent);
			$sPos = $ent[$key[0]]['transformable']['sPos'];
			$fid = $ent[$key[0]]['transformable']['fid'];
			$sector = $sPos['x'] . "_" . $sPos['y'] . "_" . $sPos['z'];
			
			$sys = array();
			
			foreach($sPos as $coord => $val){
				if($val < 0){
					$sys[$coord] = (($val + 1) / 16) % 16;
					$sys[$coord]--;
				}
				else{
					$sys[$coord] = ($val / 16) % 16;
				}
			}
			
			$system = $sys['x'] . "_" . $sys['y'] . "_" . $sys['z'];
			
			$folder = $jsonDir. "Entities/". $system . "/" . $sector;
			
			if(!array_key_exists($system, $entities)){
				$entities[$system] = array();
			}
			
			if(!array_key_exists($sector, $entities[$system])){
				$entities[$system][$sector] = array();
			}
			
			if(!array_key_exists($fid, $entities[$system][$sector])){
				$entities[$system][$sector][$fid] = array();
			}
			
			array_push($entities[$system][$sector][$fid], $key[0].".json");

			if (!file_exists($folder)) {
				mkdir($folder, 0777, true);
			}
			
			file_put_contents($folder."/".$key[0].".json", json_encode($ent, JSON_FORCE_OBJECT));
		}
		
		foreach($entities as $key1 => $val){
			array_push($systems, $key1);
			$sectors = array();
			
			foreach($entities[$key1] as $key2 => $val){
				array_push($sectors, $key2);
				$entList = array();
				
				foreach($entities[$key1][$key2] as $key3 => $val){
					if(!array_key_exists($key3, $entList)){
						$entList[$key3] = array();
					}
					for($i = 0; $i < count($entities[$key1][$key2][$key3]); $i++){
						$file = $entities[$key1][$key2][$key3][$i];
						array_push($entList[$key3], $file);
					}
				}
				
				file_put_contents($jsonDir."Entities/". $key1 . "/". $key2. "/entities.json", json_encode($entList, JSON_FORCE_OBJECT));
			}
			
			file_put_contents($jsonDir."Entities/". $key1 ."/sectors.json", json_encode($sectors, JSON_FORCE_OBJECT));
		}
		
		file_put_contents($jsonDir."Entities/systems.json", json_encode($systems, JSON_FORCE_OBJECT));
		file_put_contents($jsonDir."Players/playersList.json", json_encode($players));

	}

	function createFactionDatabase($dir, $SMD) {
		
		$ent = $SMD->decodeSMFile($dir . "FACTIONS.fac", true);
		file_put_contents("../scripts/StarOS_json/factions.json", json_encode($ent, JSON_FORCE_OBJECT));

	}


	function createCatalogDatabase($dir, $SMD) {
		$ent = $SMD->decodeSMFile($dir . "CATALOG.cat", true);
		file_put_contents("../scripts/StarOS_json/catalog.json", json_encode($ent, JSON_FORCE_OBJECT));
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
				mkdir($jsonPath . $dirName, 0777, true);
				mkdir($jsonPath . $dirName . "/DATA", 0777, true);
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