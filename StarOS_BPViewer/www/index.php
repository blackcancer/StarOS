<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN"
"http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
	<head>
		<?php
			session_start();
		?>

		<title>StarOS BPViewer</title>

		<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
		<meta http-equiv="Content-Language" content="fr"/>
		<meta http-equiv="X-UA-Compatible" content="IE=edge"/>
		<meta name="Author" content="Blackcancer"/>
		<meta name="Description" content="A 3D Blueprint viewer for StarMade"/>
		<meta name="Keywords" content="blueprint, viewer, StarMade, StarOS, BPViewer"/>

		<link type="image/x-icon"	rel="shortcut icon"	href="favicon.ico" />
		<link type="image/x-icon"	rel="icon"			href="favicon.ico" />
		<link type="text/css"		rel="stylesheet"	href="css/_blank.css" media="all" id="StarOSTheme"/>

		<!--### Loading Librairy ### -->
		<script type="text/javascript" src="scripts/lib/socket.io.js"></script>
		<script type="text/javascript" src="scripts/lib/mrdoobThree.min.js"></script>
		<script type="text/javascript" src="scripts/lib/THREEx.FullScreen.js"></script>
		<script type="text/javascript" src="scripts/lib/THREEx.KeyboardState.js"></script>
		<script type="text/javascript" src="scripts/lib/OrbitControls.js"></script>
		<script type="text/javascript" src="scripts/lib/Stats.js"></script>

		<!--### Loading StarOS Config ### -->
		<script type="text/javascript">
			window.StarOS = window.StarOS || {};
			var tmpConf;

			if((('localStorage'    in window) && window['localStorage'] !== null)){
				tmpConf = localStorage.getItem("StarOS_Cfg");
			}

			StarOS.config = tmpConf ? JSON.parse(tmpConf) : StarOS.config;
		</script>

		<script type="text/javascript" src="scripts/StarOS_cfg.js"></script>

		<!--### Loading StarOS Librairy ### -->
		<script type="text/javascript" src="scripts/StarOS_libs/com_utils.js"></script>
		<script type="text/javascript" src="scripts/StarOS_libs/gui_utils.js"></script>
		<script type="text/javascript" src="scripts/StarOS_libs/gl_utils.js"></script>
		<script type="text/javascript" src="scripts/StarOS_libs/extend_utils.js"></script>
		<script type="text/javascript" src="scripts/StarOS_libs/starmade_utils.js"></script>
		<script type="text/javascript" src="scripts/StarOS_libs/starmade_gl.js"></script>

		<!--### Loading StarOS Apps ### -->
		<script type="text/javascript" src="scripts/StarOS_BPViewer/index.js"></script>

	</head>

	<body>
		<script type="text/javascript">
			var mainWindow = new StarOS.WIN.Window({
				name: "BPViewer_Window",
				size: {
					width:	'1280px',
					height:	'768px'
				}
			});

			mainWindow.dom.content.id = "BPViewer";
		</script>
		<script type="text/javascript" src="scripts/StarOS_BPViewer/main.js"></script>
	</body>
</html>