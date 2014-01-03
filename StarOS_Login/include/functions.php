<?php
	/*
		Product: Starmade login
		Description: Intergrate Starmade login within your own projects.
		License: http://creativecommons.org/licenses/by/3.0/legalcode

		FileVersion: 0.1-rev00001						Date: 2014-01-03
		By Blackcancer
		
		website: http://initsysrev.net
		support: blackcancer@initsysrev.net
	*/

	header('Content-Type: text/html; charset=UTF-8');
	
	function starmadeLogin($params){
		$url = 'http://star-made.org/api/user/login.xml';
		$response = processRequest($url, $params);
		$xml = new SimpleXMLElement($response);
		$_SESSION = parseXml($xml);
	}

	function processRequest($url, $params){
		if(is_array($params) && count($params) == 2){
			$post_params = "";
			
			foreach($params as $key => $val){
				$post_params .= $post_params?"&":"";
				$post_params .= $key."=".$val;
			}
			
			$request = curl_init($url);
			curl_setopt($request, CURLOPT_POST, 1); 
			curl_setopt($request, CURLOPT_RETURNTRANSFER, 1); 
			curl_setopt($request, CURLOPT_POSTFIELDS, $post_params);
			
			ob_start();
			$data = curl_exec($request); 
			ob_end_clean();
			
			if(curl_errno($request)){
				print curl_error($request);
				return false;
			}
			curl_close($request); 
		}
		else{
			return false;
		}
		return $data;
	}
	
	function parseXml($node){
		$data = array();
		
		foreach($node->children() as $child) {
			
			if (count($child->children()) == 0){
				
				if(is_numeric((string)$child)){
					$data[$child->getName()] = (int)$child;
				} else {
					$data[$child->getName()] = (string)$child;
				}
				
			}
			else{
				$data[$child->getName()] = parseXml($child);
			}
		}
		
		return $data;
	}
?>