<?php
	/*
		Based on: StarOS Map
		Description: this file is used only for setup and update the starmap
		License: http://creativecommons.org/licenses/by/3.0/legalcode

		FileVersion: 0.1-rev00004					Date: 2013-12-28
		By Blackcancer

		website: http://initsysrev.net
		support: blackcancer@initsysrev.net
	*/
	include_once "scripts/php/class/SMDecoder.php";

	if(count($argv) < 2){
		echo "Enter the directory of your starmade install.\n";
		echo "The recomended example is: \"php " . implode(" ", $argv) . " /home/starmade/\".\n";
		die();
	}

	$decoder = new SMDecoder();
	$starmadeDirectory = $argv[1];

	error_reporting(E_ERROR | E_PARSE); // Disable warnings to deal with SMDecoder

	$serverDatabase = $starmadeDirectory . "server-database/";
	echo "Now loading entity and player files\n";
	createEntityDatabase($serverDatabase, $decoder);
	echo "Now loading faction information\n";
	createFactionDatabase($serverDatabase, $decoder);
	echo "Now loading catalog information\n";
	createCatalogDatabase($serverDatabase, $decoder);

	function createEntityDatabase($dir, $decoder) {
		$entityFiles = glob($dir . "ENTITY_*", GLOB_NOSORT); // Find all of the playerstate files
		$entities = array();
		$players = array();

		foreach ($entityFiles as $entity) {
			$ext = pathinfo($entity, PATHINFO_EXTENSION);
			
			if (!($ext == "ent")) {
				continue;
			}

			if (!(strpos($entity, 'ENTITY_PLAYER') === false) && !(strpos($entity, 'ENTITY_PLAYERSTATE_') === false) ) {
				$ent = $decoder->decodeSMFile($entity);
				$players[$ent['name']] = $ent;
				continue;
			}

			$ent = $decoder->decodeSMFile($entity);
			$type = $ent['type'];

			if (in_array(intval($type), $excludedTypes)) {
				continue;
			}

			$entities[$ent["uid"]] = $ent;
		}

		file_put_contents("./scripts/StarOS_json/entities.json", json_encode($entities));
		file_put_contents("./scripts/StarOS_json/players.json", json_encode($players));

	}

	function createFactionDatabase($dir, $decoder) {
		
		$ent = $decoder->decodeSMFile($dir . "FACTIONS.fac");
		$factions = array();

		foreach ($ent as $faction) {
			$factions[$faction['uid']] = $faction;
		}

		file_put_contents("./scripts/StarOS_json/factions.json", json_encode($factions, JSON_FORCE_OBJECT));

	}


	function createCatalogDatabase($dir, $decoder) {
		$catalog = $decoder->decodeSMFile($dir . "CATALOG.cat");
		file_put_contents("./scripts/StarOS_json/catalog.json", json_encode($catalog, JSON_FORCE_OBJECT));
	}
?>