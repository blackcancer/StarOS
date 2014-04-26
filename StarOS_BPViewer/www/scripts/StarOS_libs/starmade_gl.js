/*
	Product: Starmade gl
	Description: This script add starmade's block shape for Three.js
	License: http://creativecommons.org/licenses/by/3.0/legalcode

	FileVersion: 0.1-rev00001					Date: 2014-04-07
	By Blackcancer

	website: http://initsysrev.net
	support: blackcancer@initsysrev.net
*/

(function(){
	window.StarOS = window.StarOS || {};

	var _socket		= new StarOS.COM.Socket(StarOS.config.StarOS_serv.host, StarOS.config.StarOS_serv.port),
		_blocks		= [],
		_blocksType	= {},

		_texture = StarOS.config.video.texturePack,
		_size = StarOS.config.video.textureSize,

		_loadedTexture = {
		't000': {
			texture:	new THREE.ImageUtils.loadTexture('res/img/textures/' + _texture + "/" + _size + '/t000.png'),
			normal:		new THREE.ImageUtils.loadTexture('res/img/textures/' + _texture + "/" + _size + '/t000_NRM.png')
		},
		't001': {
			texture:	new THREE.ImageUtils.loadTexture('res/img/textures/' + _texture + "/" + _size + '/t001.png'),
			normal:		new THREE.ImageUtils.loadTexture('res/img/textures/' + _texture + "/" + _size + '/t001_NRM.png')
		},
		't002': {
			texture:	new THREE.ImageUtils.loadTexture('res/img/textures/' + _texture + "/" + _size + '/t002.png'),
			normal:		new THREE.ImageUtils.loadTexture('res/img/textures/' + _texture + "/" + _size + '/t002_NRM.png')
		}
	};


	//--------------------------------------------
	// getBlock
	//--------------------------------------------
	var getBlock = function(id, orient, isActive, hp, version){
		var bid;

		if(!id){
			throw "No block id given.";
		}
		else if(typeof id == 'number'){
			if(!_blocks[id]){
				throw "Error: block id " + id + " does not exist.";
			}

			bid = id;
		}
		else if(typeof id == 'string'){
			if(!_blocksType[id]){
				throw "Error: block type " + id + " does not exist.";
			}

			bid = _blocksType[id];
		}
		else {
			throw "Id must be an integer or a String (see BlockTypes.properties)";
		}

		if(version > 0){
			// Cube.prototype.setOrientation = CubeOrientationV1;
			Wedge.prototype.setOrientation = WedgeOrientationV1;
			Corner.prototype.setOrientation = CornerOrientationV1;
		}
		else {
			Wedge.prototype.setOrientation = WedgeOrientationV0;
			Corner.prototype.setOrientation = CornerOrientationV0;
		}

		switch(_blocks[bid].properties.blockStyle){
			case 0:
				return new Cube(id, orient, isActive, hp);
			break;

			case 1:
				return new Wedge(id, orient, isActive, hp);
			break;

			case 2:
				return new Corner(id, orient, isActive, hp);
			break;

			case 3:
				return new Cross(id, orient, isActive, hp);
			break;

			case 4:
				return new Tetra(id, orient, isActive, hp);
			break;

			case 5:
				return new Penta(id, orient, isActive, hp);
			break;
		}

	};

	//--------------------------------------------
	// Cube Class (base class)
	//--------------------------------------------
	var Cube = function(id, orient, isActive, hp){
		if(!id){
			throw "No block id given.";
		}
		else if(typeof id == 'string'){
			id = _blocksType[type];
		}
		else if(typeof id != 'number'){
			console.log(typeof id)
			throw "Id must be an integer or a String (see BlockTypes.properties)";
		}

		this.id			= id;
		this.orient		= orient	|| 0;
		this.isActive	= isActive	|| 0;
		this.currentHp	= hp		|| _blocks[id].properties.hitpoints;

		this.geometry	= new THREE.Geometry();
		this.uvs		= [];
		this.textures	= {};
		this.material	= null;
		this.mesh		= null;
		this.light		= false;

		this.initGeom();
		this.geometry.computeVertexNormals();
		this.initUvs();
		this.initMesh();
		this.setOrientation(this.orient, this.isActive);

		if(_blocks[this.id].properties.lightSource && StarOS.config.video.useNormal){
			this.initLight();
		}

		/*if(_blocks[this.id].properties.animated){
			// TO DO
		}*/
	};

	Cube.prototype.initGeom = function(){

		//Create all vertices of geometry
		this.geometry.vertices.push(new THREE.Vector3(-0.5, -0.5,  0.5));	//0
		this.geometry.vertices.push(new THREE.Vector3( 0.5, -0.5,  0.5));	//1
		this.geometry.vertices.push(new THREE.Vector3(-0.5,  0.5,  0.5));	//2
		this.geometry.vertices.push(new THREE.Vector3( 0.5,  0.5,  0.5));	//3
		this.geometry.vertices.push(new THREE.Vector3(-0.5, -0.5, -0.5));	//4
		this.geometry.vertices.push(new THREE.Vector3( 0.5, -0.5, -0.5));	//5
		this.geometry.vertices.push(new THREE.Vector3(-0.5,  0.5, -0.5));	//6
		this.geometry.vertices.push(new THREE.Vector3( 0.5,  0.5, -0.5));	//7
		
		//Create all faces
		//front side
		this.geometry.faces.push(new THREE.Face3(0, 1, 2));
		this.geometry.faces.push(new THREE.Face3(3, 2, 1));
		
		//Create all faces
		//back side
		this.geometry.faces.push(new THREE.Face3(4, 6, 5));
		this.geometry.faces.push(new THREE.Face3(7, 5, 6));

		//bottom side
		this.geometry.faces.push(new THREE.Face3(0, 4, 1));
		this.geometry.faces.push(new THREE.Face3(5, 1, 4));

		//top side
		this.geometry.faces.push(new THREE.Face3(2, 3, 6));
		this.geometry.faces.push(new THREE.Face3(7, 6, 3));

		//right side
		this.geometry.faces.push(new THREE.Face3(1, 5, 3));
		this.geometry.faces.push(new THREE.Face3(7, 3, 5));

		//left side
		this.geometry.faces.push(new THREE.Face3(0, 2, 4));
		this.geometry.faces.push(new THREE.Face3(6, 4, 2));

	};

	Cube.prototype.initUvs = function(){
		var y = Math.floor(_blocks[this.id].textureId / 16),
			x = _blocks[this.id].textureId - 16 * y,
			id = Math.floor(y / 16);

		y = y - 16 * (id);

		try {
			this.textures = _loadedTexture['t00' + id];
		}
		catch(cErr){
			throw "Cannot get texture file t00" + id + ".";
		}

		switch(_blocks[this.id].properties.individualSides){
			case 1:
				/*
				points representation:
					0-----1
					|	  |
					|	  |
					3-----2
				*/
				this.uvs = [];
				this.uvs.push(new THREE.Vector2(x		/ 16, (16 - y)			/ 16));	//0
				this.uvs.push(new THREE.Vector2((x + 1)	/ 16, (16 - y)			/ 16));	//1
				this.uvs.push(new THREE.Vector2((x + 1)	/ 16, (16 - (y + 1))	/ 16));	//2
				this.uvs.push(new THREE.Vector2(x		/ 16, (16 - (y + 1))	/ 16));	//3

				//Texture front side
				this.geometry.faceVertexUvs[0].push([this.uvs[1], this.uvs[2], this.uvs[0]]);
				this.geometry.faceVertexUvs[0].push([this.uvs[3], this.uvs[0], this.uvs[2]]);

				//Texture back side
				this.geometry.faceVertexUvs[0].push([this.uvs[3], this.uvs[0], this.uvs[2]]);
				this.geometry.faceVertexUvs[0].push([this.uvs[1], this.uvs[2], this.uvs[0]]);

				//Texture bottom side
				this.geometry.faceVertexUvs[0].push([this.uvs[3], this.uvs[2], this.uvs[0]]);
				this.geometry.faceVertexUvs[0].push([this.uvs[1], this.uvs[0], this.uvs[2]]);

				//Texture top side
				this.geometry.faceVertexUvs[0].push([this.uvs[3], this.uvs[0], this.uvs[2]]);
				this.geometry.faceVertexUvs[0].push([this.uvs[1], this.uvs[2], this.uvs[0]]);

				//Texture right side
				this.geometry.faceVertexUvs[0].push([this.uvs[1], this.uvs[2], this.uvs[0]]);
				this.geometry.faceVertexUvs[0].push([this.uvs[3], this.uvs[0], this.uvs[2]]);

				//Texture left side
				this.geometry.faceVertexUvs[0].push([this.uvs[1], this.uvs[0], this.uvs[2]]);
				this.geometry.faceVertexUvs[0].push([this.uvs[3], this.uvs[2], this.uvs[0]]);
			break;

			case 3:
				/*
				points representation:
					0-----1-----4-----6
					|	  |		|	  |
					|	  |		|	  |
					3-----2-----5-----7
				*/
				this.uvs = [];
				this.uvs.push(new THREE.Vector2(x		/ 16, (16 - y)			/ 16));	//0
				this.uvs.push(new THREE.Vector2((x + 1)	/ 16, (16 - y)			/ 16));	//1
				this.uvs.push(new THREE.Vector2((x + 1)	/ 16, (16 - (y + 1))	/ 16));	//2
				this.uvs.push(new THREE.Vector2(x		/ 16, (16 - (y + 1))	/ 16));	//3

				this.uvs.push(new THREE.Vector2((x + 2)	/ 16, (16 - y)			/ 16));	//4
				this.uvs.push(new THREE.Vector2((x + 2)	/ 16, (16 - (y + 1))	/ 16));	//5

				this.uvs.push(new THREE.Vector2((x + 3)	/ 16, (16 - y)			/ 16));	//6
				this.uvs.push(new THREE.Vector2((x + 3)	/ 16, (16 - (y + 1))	/ 16));	//7

				//Texture front side
				this.geometry.faceVertexUvs[0].push([this.uvs[5], this.uvs[7], this.uvs[4]]);
				this.geometry.faceVertexUvs[0].push([this.uvs[6], this.uvs[4], this.uvs[7]]);

				//Texture back side
				this.geometry.faceVertexUvs[0].push([this.uvs[5], this.uvs[4], this.uvs[7]]);
				this.geometry.faceVertexUvs[0].push([this.uvs[6], this.uvs[7], this.uvs[4]]);

				//Texture bottom side
				this.geometry.faceVertexUvs[0].push([this.uvs[2], this.uvs[1], this.uvs[3]]);
				this.geometry.faceVertexUvs[0].push([this.uvs[0], this.uvs[3], this.uvs[1]]);

				//Texture top side
				this.geometry.faceVertexUvs[0].push([this.uvs[5], this.uvs[2], this.uvs[4]]);
				this.geometry.faceVertexUvs[0].push([this.uvs[1], this.uvs[4], this.uvs[2]]);

				//Texture right side
				this.geometry.faceVertexUvs[0].push([this.uvs[5], this.uvs[7], this.uvs[4]]);
				this.geometry.faceVertexUvs[0].push([this.uvs[6], this.uvs[4], this.uvs[7]]);

				//Texture left side
				this.geometry.faceVertexUvs[0].push([this.uvs[5], this.uvs[4], this.uvs[7]]);
				this.geometry.faceVertexUvs[0].push([this.uvs[6], this.uvs[7], this.uvs[4]]);
			break;

			case 6:
				/*
				points representation:
					0-----1-----4-----6-----8-----10----12
					|	  |		|	  |		|	  |		|
					|	  |		|	  |		|	  |		|
					3-----2-----5-----7-----9-----11----13
				*/
				this.uvs = [];
				this.uvs.push(new THREE.Vector2(x		/ 16, (16 - y)			/ 16));	//0
				this.uvs.push(new THREE.Vector2((x + 1)	/ 16, (16 - y)			/ 16));	//1
				this.uvs.push(new THREE.Vector2((x + 1)	/ 16, (16 - (y + 1))	/ 16));	//2
				this.uvs.push(new THREE.Vector2(x		/ 16, (16 - (y + 1))	/ 16));	//3

				this.uvs.push(new THREE.Vector2((x + 2)	/ 16, (16 - y)			/ 16));	//4
				this.uvs.push(new THREE.Vector2((x + 2)	/ 16, (16 - (y + 1))	/ 16));	//5

				this.uvs.push(new THREE.Vector2((x + 3)	/ 16, (16 - y)			/ 16));	//6
				this.uvs.push(new THREE.Vector2((x + 3)	/ 16, (16 - (y + 1))	/ 16));	//7

				this.uvs.push(new THREE.Vector2((x + 4)	/ 16, (16 - y)			/ 16));	//8
				this.uvs.push(new THREE.Vector2((x + 4)	/ 16, (16 - (y + 1))	/ 16));	//9

				this.uvs.push(new THREE.Vector2((x + 5)	/ 16, (16 - y)			/ 16));	//10
				this.uvs.push(new THREE.Vector2((x + 5)	/ 16, (16 - (y + 1))	/ 16));	//11

				this.uvs.push(new THREE.Vector2((x + 6)	/ 16, (16 - y)			/ 16));	//12
				this.uvs.push(new THREE.Vector2((x + 6)	/ 16, (16 - (y + 1))	/ 16));	//13

				//Texture front side
				this.geometry.faceVertexUvs[0].push([this.uvs[3], this.uvs[2], this.uvs[0]]);
				this.geometry.faceVertexUvs[0].push([this.uvs[1], this.uvs[0], this.uvs[2]]);

				//Texture back side
				this.geometry.faceVertexUvs[0].push([this.uvs[1], this.uvs[2], this.uvs[4]]);
				this.geometry.faceVertexUvs[0].push([this.uvs[5], this.uvs[4], this.uvs[2]]);

				//Texture bottom side
				this.geometry.faceVertexUvs[0].push([this.uvs[4], this.uvs[5], this.uvs[6]]);
				this.geometry.faceVertexUvs[0].push([this.uvs[7], this.uvs[6], this.uvs[5]]);

				//Texture top side
				this.geometry.faceVertexUvs[0].push([this.uvs[6], this.uvs[8], this.uvs[7]]);
				this.geometry.faceVertexUvs[0].push([this.uvs[9], this.uvs[7], this.uvs[8]]);

				//Texture right side
				this.geometry.faceVertexUvs[0].push([this.uvs[11], this.uvs[9], this.uvs[10]]);
				this.geometry.faceVertexUvs[0].push([this.uvs[8], this.uvs[10], this.uvs[9]]);

				//Texture left side
				this.geometry.faceVertexUvs[0].push([this.uvs[13], this.uvs[12], this.uvs[11]]);
				this.geometry.faceVertexUvs[0].push([this.uvs[10], this.uvs[11], this.uvs[12]]);
			break;

			default:
				throw "IndividualSides " + _blocks[this.id].properties.individualSides + " does not exist or have no renderer.";
			break;
		}
	};

	Cube.prototype.initMesh = function(){
		if(StarOS.config.video.useNormal){
			this.material = new THREE.MeshPhongMaterial({
				map:			this.textures.texture,
				normalMap:		this.textures.normal,
				transparent:	true
			});
		}
		else {
			this.material = new THREE.MeshBasicMaterial({
				map:			this.textures.texture,
				transparent:	true
			});
		}

		this.mesh = new THREE.Mesh(this.geometry, this.material);
		this.mesh.bid = this.id;
	};

	Cube.prototype.setOrientation = function(orient, activ){
		if(typeof orient !== 'number'){
			if(orient === null){
				orient = 0;
			}
			else {
				throw "Orientation must be a integer.";
			}
		}
		if(typeof activ !== 'number'){
			if(activ === null){
				activ = 0;
			}
			else {
				throw "isActive must be a integer.";
			}
		}

		var o = orient * 2 + activ,
			q = new THREE.Quaternion(),
			q2 = new THREE.Quaternion(),
			q3 = new THREE.Quaternion(),
			v,v2;

		this.orient		= orient;
		this.isActive	= activ;

		switch(o){
			case 0:
				v = new THREE.Vector3(0, 1, 0).normalize();
				q.setFromAxisAngle(v, Math.PI * 0 / 180);
			break;

			case 1:
				v = new THREE.Vector3(0, 1, 0).normalize();
				q.setFromAxisAngle(v, Math.PI * 180 / 180);
			break;

			case 2:
				v = new THREE.Vector3(0, 0, 1).normalize();
				v2 = new THREE.Vector3(1, 0, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 90 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 90 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 3:
				v = new THREE.Vector3(0, 0, 1).normalize();
				v2 = new THREE.Vector3(1, 0, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 270 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 270 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 4:
				v = new THREE.Vector3(0, 1, 0).normalize();
				q.setFromAxisAngle(v, Math.PI * -90 / 180);
			break;

			case 5:
				v = new THREE.Vector3(0, 1, 0).normalize();
				q.setFromAxisAngle(v, Math.PI * -270 / 180);
			break;
		}

		this.mesh.quaternion = q;
	};

	Cube.prototype.initLight = function(){
		var c = _blocks[this.id].properties.lightSourceColor;
		this.light = new THREE.PointLight( 0xffffff, 10, 5 );
		this.light.color.setHSL( c[0], c[1], c[2]);
	};

	CubeOrientationV1 = function(orient, activ){
		if(typeof orient !== 'number'){
			if(orient === null){
				orient = 0;
			}
			else {
				throw "Orientation must be a integer.";
			}
		}
		if(typeof activ !== 'number'){
			if(activ === null){
				activ = 0;
			}
			else {
				throw "isActive must be a integer.";
			}
		}

		var o = orient * 2 + activ,
			q = new THREE.Quaternion(),
			q2 = new THREE.Quaternion(),
			q3 = new THREE.Quaternion(),
			v,v2;

		this.orient		= orient;
		this.isActive	= activ;

		switch(o){
			case 0:
				v = new THREE.Vector3(0, 1, 0).normalize();
				q.setFromAxisAngle(v, Math.PI * 0 / 180);
			break;

			case 1:
				v = new THREE.Vector3(0, 1, 0).normalize();
				q.setFromAxisAngle(v, Math.PI * 180 / 180);
			break;

			case 2:
				v = new THREE.Vector3(0, 0, 1).normalize();
				v2 = new THREE.Vector3(1, 0, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 90 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 90 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 3:
				v = new THREE.Vector3(0, 0, 1).normalize();
				v2 = new THREE.Vector3(1, 0, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 270 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 270 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 4:
				v = new THREE.Vector3(0, 1, 0).normalize();
				q.setFromAxisAngle(v, Math.PI * -90 / 180);
			break;

			case 5:
				v = new THREE.Vector3(0, 1, 0).normalize();
				q.setFromAxisAngle(v, Math.PI * -270 / 180);
			break;
		}

		this.mesh.quaternion = q;
	};

	//--------------------------------------------
	// Wedge Class (Cube sub class)
	//--------------------------------------------
	var Wedge = function(/* see Cube function */){
		Cube.apply(this, arguments);
	};

	Wedge.prototype = Object.create(Cube.prototype);

	Wedge.prototype.initGeom = function(){

		//Create all vertices of geometry
		this.geometry.vertices.push(new THREE.Vector3(-0.5, -0.5,  0.5));	//0
		this.geometry.vertices.push(new THREE.Vector3( 0.5, -0.5,  0.5));	//1
		this.geometry.vertices.push(new THREE.Vector3(-0.5,  0.5,  0.5));	//2
		this.geometry.vertices.push(new THREE.Vector3( 0.5,  0.5,  0.5));	//3
		this.geometry.vertices.push(new THREE.Vector3(-0.5, -0.5, -0.5));	//4
		this.geometry.vertices.push(new THREE.Vector3( 0.5, -0.5, -0.5));	//5

		//Create all faces
		//front side
		this.geometry.faces.push(new THREE.Face3(0, 1, 2));
		this.geometry.faces.push(new THREE.Face3(3, 2, 1));

		//bottom side
		this.geometry.faces.push(new THREE.Face3(0, 4, 1));
		this.geometry.faces.push(new THREE.Face3(5, 1, 4));

		//top side
		this.geometry.faces.push(new THREE.Face3(2, 3, 4));
		this.geometry.faces.push(new THREE.Face3(5, 4, 3));

		//right side
		this.geometry.faces.push(new THREE.Face3(1, 5, 3));

		//left side
		this.geometry.faces.push(new THREE.Face3(0, 2, 4));

	};

	Wedge.prototype.setOrientation = function(orient, activ){
		if(typeof orient !== 'number'){
			if(orient === null){
				orient = 0;
			}
			else {
				throw "Orientation must be a integer.";
			}
		}
		if(typeof activ !== 'number'){
			if(activ === null){
				activ = 0;
			}
			else {
				throw "isActive must be a integer.";
			}
		}

		var o = orient * 2 + activ,
			q = new THREE.Quaternion(),
			q2 = new THREE.Quaternion(),
			q3 = new THREE.Quaternion(),
			v,v2;

		this.orient		= orient;
		this.isActive	= activ;

		switch(o){
			case 0:
				v = new THREE.Vector3(0, 1, 0).normalize();
				q.setFromAxisAngle(v, Math.PI * 0 / 180);
			break;

			case 1:
				v = new THREE.Vector3(0, 1, 0).normalize();
				q.setFromAxisAngle(v, Math.PI * 90 / 180);
			break;

			case 2:
				v = new THREE.Vector3(0, 1, 0).normalize();
				q.setFromAxisAngle(v, Math.PI * 180 / 180);
			break;

			case 3:
				v = new THREE.Vector3(0, 1, 0).normalize();
				q.setFromAxisAngle(v, Math.PI * 270 / 180);
			break;

			case 4:
				v = new THREE.Vector3(0, 0, 1).normalize();
				q.setFromAxisAngle(v, Math.PI * 180 / 180);
			break;

			case 5:
				v = new THREE.Vector3(0, 0, 1).normalize();
				v2 = new THREE.Vector3(0, 1, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 180 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 90 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 6:
				v = new THREE.Vector3(0, 0, 1).normalize();
				v2 = new THREE.Vector3(0, 1, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 180 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 180 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 7:
				v = new THREE.Vector3(0, 0, 1).normalize();
				v2 = new THREE.Vector3(0, 1, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 180 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 270 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 8:
				v = new THREE.Vector3(0, 0, 1).normalize();
				v2 = new THREE.Vector3(1, 0, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 90 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 270 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 9:
				v = new THREE.Vector3(0, 0, 1).normalize();
				v2 = new THREE.Vector3(1, 0, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 90 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 180 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 10:
				v = new THREE.Vector3(0, 0, 1).normalize();
				v2 = new THREE.Vector3(1, 0, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 90 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 0 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 11:
				v = new THREE.Vector3(0, 0, 1).normalize();
				v2 = new THREE.Vector3(1, 0, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 90 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 90 / 180);
				q.multiplyQuaternions(q2, q3);
			break;
		}

		this.mesh.quaternion = q;
	};


	//--------------------------------------------
	// Corner Class (Cube sub class)
	//--------------------------------------------
	var Corner = function(/* see Cube function */){
		Cube.apply(this, arguments);
	};

	Corner.prototype = Object.create(Cube.prototype);

	Corner.prototype.initGeom = function(){

		this.geometry.vertices.push(new THREE.Vector3(-0.5, -0.5,  0.5));
		this.geometry.vertices.push(new THREE.Vector3( 0.5, -0.5,  0.5));
		this.geometry.vertices.push(new THREE.Vector3(-0.5,  0.5,  0.5));
		this.geometry.vertices.push(new THREE.Vector3(-0.5, -0.5, -0.5));
		this.geometry.vertices.push(new THREE.Vector3( 0.5, -0.5, -0.5));

		//Create all faces
		//front side
		this.geometry.faces.push(new THREE.Face3(0, 1, 2));

		//back side
		this.geometry.faces.push(new THREE.Face3(3, 2, 4));

		//bottom side
		this.geometry.faces.push(new THREE.Face3(0, 3, 1));
		this.geometry.faces.push(new THREE.Face3(4, 1, 3));

		//right side
		this.geometry.faces.push(new THREE.Face3(1, 4, 2));

		//left side
		this.geometry.faces.push(new THREE.Face3(0, 2, 3));

	};

	Corner.prototype.setOrientation = function(orient, activ){
		if(typeof orient !== 'number'){
			if(orient === null){
				orient = 0;
			}
			else {
				throw "Orientation must be a integer.";
			}
		}
		if(typeof activ !== 'number'){
			if(activ === null){
				activ = 0;
			}
			else {
				throw "isActive must be a integer.";
			}
		}

		var o = orient * 2 + activ,
			q = new THREE.Quaternion(),
			q2 = new THREE.Quaternion(),
			q3 = new THREE.Quaternion(),
			v,v2;

		this.orient		= orient;
		this.isActive	= activ;

		switch(o){
			case 0:
				if(Math.floor(this.currentHp / 256) == 0){
					v = new THREE.Vector3(0, 0, 1).normalize();
					v2 = new THREE.Vector3(0, 1, 0).normalize();
					q2.setFromAxisAngle(v, Math.PI * 0 / 180);
					q3.setFromAxisAngle(v2, Math.PI * 0 / 180);
					q.multiplyQuaternions(q2, q3);
				}
				else {
					v = new THREE.Vector3(0, 0, 1).normalize();
					v2 = new THREE.Vector3(0, 1, 0).normalize();
					q2.setFromAxisAngle(v, Math.PI * 270 / 180);
					q3.setFromAxisAngle(v2, Math.PI * 180 / 180);
					q.multiplyQuaternions(q2, q3);
				}
			break;

			case 1:
				if(Math.floor(this.currentHp / 256) == 0){
				v = new THREE.Vector3(0, 0, 1).normalize();
				v2 = new THREE.Vector3(0, 1, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 0 / 180);
				q3.setFromAxisAngle(v2, Math.PI * -90 / 180);
				q.multiplyQuaternions(q2, q3);
				}
				else {
					v = new THREE.Vector3(0, 0, 1).normalize();
					v2 = new THREE.Vector3(0, 1, 0).normalize();
					q2.setFromAxisAngle(v, Math.PI * 270 / 180);
					q3.setFromAxisAngle(v2, Math.PI * 270 / 180);
					q.multiplyQuaternions(q2, q3);
				}
			break;

			case 2:
				if(Math.floor(this.currentHp / 256) == 0){
					v = new THREE.Vector3(0, 0, 1).normalize();
					v2 = new THREE.Vector3(0, 1, 0).normalize();
					q2.setFromAxisAngle(v, Math.PI * 0 / 180);
					q3.setFromAxisAngle(v2, Math.PI * -180 / 180);
					q.multiplyQuaternions(q2, q3);
				}
				else {
					v = new THREE.Vector3(0, 0, 1).normalize();
					v2 = new THREE.Vector3(0, 1, 0).normalize();
					q2.setFromAxisAngle(v, Math.PI * 270 / 180);
					q3.setFromAxisAngle(v2, Math.PI * 0 / 180);
					q.multiplyQuaternions(q2, q3);
				}
			break;

			case 3:
				if(Math.floor(this.currentHp / 256) == 0){
					v = new THREE.Vector3(0, 0, 1).normalize();
					v2 = new THREE.Vector3(0, 1, 0).normalize();
					q2.setFromAxisAngle(v, Math.PI * 0 / 180);
					q3.setFromAxisAngle(v2, Math.PI * -270 / 180);
					q.multiplyQuaternions(q2, q3);
				}
				else {
					v = new THREE.Vector3(0, 0, 1).normalize();
					v2 = new THREE.Vector3(0, 1, 0).normalize();
					q2.setFromAxisAngle(v, Math.PI * 270 / 180);
					q3.setFromAxisAngle(v2, Math.PI * 90 / 180);
					q.multiplyQuaternions(q2, q3);
				}
			break;

			case 4:
				if(Math.floor(this.currentHp / 256) == 0){
					v = new THREE.Vector3(0, 0, 1).normalize();
					v2 = new THREE.Vector3(0, 1, 0).normalize();
					q2.setFromAxisAngle(v, Math.PI * 180 / 180);
					q3.setFromAxisAngle(v2, Math.PI * 90 / 180);
					q.multiplyQuaternions(q2, q3);
				}
				else {
					v = new THREE.Vector3(0, 0, 1).normalize();
					v2 = new THREE.Vector3(0, 1, 0).normalize();
					q2.setFromAxisAngle(v, Math.PI * 90 / 180);
					q3.setFromAxisAngle(v2, Math.PI * 270 / 180);
					q.multiplyQuaternions(q2, q3);
				}
			break;

			case 5:
				if(Math.floor(this.currentHp / 256) == 0){
					v = new THREE.Vector3(0, 0, 1).normalize();
					v2 = new THREE.Vector3(0, 1, 0).normalize();
					q2.setFromAxisAngle(v, Math.PI * 180 / 180);
					q3.setFromAxisAngle(v2, Math.PI * 180 / 180);
					q.multiplyQuaternions(q2, q3);
				}
				else {
					v = new THREE.Vector3(0, 0, 1).normalize();
					v2 = new THREE.Vector3(0, 1, 0).normalize();
					q2.setFromAxisAngle(v, Math.PI * 90 / 180);
					q3.setFromAxisAngle(v2, Math.PI * 180 / 180);
					q.multiplyQuaternions(q2, q3);
				}
			break;

			case 6:
				if(Math.floor(this.currentHp / 256) == 0){
					v = new THREE.Vector3(0, 0, 1).normalize();
					v2 = new THREE.Vector3(0, 1, 0).normalize();
					q2.setFromAxisAngle(v, Math.PI * 180 / 180);
					q3.setFromAxisAngle(v2, Math.PI * 270 / 180);
					q.multiplyQuaternions(q2, q3);
				}
				else {
					v = new THREE.Vector3(0, 0, 1).normalize();
					v2 = new THREE.Vector3(0, 1, 0).normalize();
					q2.setFromAxisAngle(v, Math.PI * 90 / 180);
					q3.setFromAxisAngle(v2, Math.PI * 90 / 180);
					q.multiplyQuaternions(q2, q3);
				}
			break;

			case 7:
				if(Math.floor(this.currentHp / 256) == 0){
					v = new THREE.Vector3(0, 0, 1).normalize();
					v2 = new THREE.Vector3(0, 1, 0).normalize();
					q2.setFromAxisAngle(v, Math.PI * 180 / 180);
					q3.setFromAxisAngle(v2, Math.PI * 0 / 180);
					q.multiplyQuaternions(q2, q3);
				}
				else {
					v = new THREE.Vector3(0, 0, 1).normalize();
					v2 = new THREE.Vector3(0, 1, 0).normalize();
					q2.setFromAxisAngle(v, Math.PI * 90 / 180);
					q3.setFromAxisAngle(v2, Math.PI * 0 / 180);
					q.multiplyQuaternions(q2, q3);
				}
			break;

			case 8:
				v = new THREE.Vector3(1, 0, 0).normalize();
				v2 = new THREE.Vector3(0, 1, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 90 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 270 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 9:
				v = new THREE.Vector3(1, 0, 0).normalize();
				v2 = new THREE.Vector3(0, 1, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 90 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 180 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 10:
				v = new THREE.Vector3(1, 0, 0).normalize();
				v2 = new THREE.Vector3(0, 1, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 90 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 90 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 11:
				v = new THREE.Vector3(1, 0, 0).normalize();
				v2 = new THREE.Vector3(0, 1, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 90 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 0 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 12:
				v = new THREE.Vector3(1, 0, 0).normalize();
				v2 = new THREE.Vector3(0, 1, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 270 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 270 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 13:
				v = new THREE.Vector3(1, 0, 0).normalize();
				v2 = new THREE.Vector3(0, 1, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 270 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 0 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 14:
				v = new THREE.Vector3(1, 0, 0).normalize();
				v2 = new THREE.Vector3(0, 1, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 270 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 90 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 15:
				v = new THREE.Vector3(1, 0, 0).normalize();
				v2 = new THREE.Vector3(0, 1, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 270 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 180 / 180);
				q.multiplyQuaternions(q2, q3);
			break;
		}

		this.mesh.quaternion = q;
	};


	WedgeOrientationV1 = function(orient, activ){
		if(typeof orient !== 'number'){
			if(orient === null){
				orient = 0;
			}
			else {
				throw "Orientation must be a integer.";
			}
		}
		if(typeof activ !== 'number'){
			if(activ === null){
				activ = 0;
			}
			else {
				throw "isActive must be a integer.";
			}
		}

		var o = orient * 2 + activ,
			q = new THREE.Quaternion(),
			q2 = new THREE.Quaternion(),
			q3 = new THREE.Quaternion(),
			v,v2;

		this.orient		= orient;
		this.isActive	= activ;

		switch(o){
			case 0:
				v = new THREE.Vector3(0, 1, 0).normalize();
				q.setFromAxisAngle(v, Math.PI * 0 / 180);
			break;

			case 1:
				v = new THREE.Vector3(0, 1, 0).normalize();
				q.setFromAxisAngle(v, Math.PI * 90 / 180);
			break;

			case 2:
				v = new THREE.Vector3(0, 1, 0).normalize();
				q.setFromAxisAngle(v, Math.PI * 180 / 180);
			break;

			case 3:
				v = new THREE.Vector3(0, 1, 0).normalize();
				q.setFromAxisAngle(v, Math.PI * 270 / 180);
			break;

			case 4:
				v = new THREE.Vector3(0, 0, 1).normalize();
				q.setFromAxisAngle(v, Math.PI * 180 / 180);
			break;

			case 5:
				v = new THREE.Vector3(0, 0, 1).normalize();
				v2 = new THREE.Vector3(0, 1, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 180 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 90 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 6:
				v = new THREE.Vector3(0, 0, 1).normalize();
				v2 = new THREE.Vector3(0, 1, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 180 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 180 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 7:
				v = new THREE.Vector3(0, 0, 1).normalize();
				v2 = new THREE.Vector3(0, 1, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 180 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 270 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 8:
				v = new THREE.Vector3(0, 0, 1).normalize();
				v2 = new THREE.Vector3(1, 0, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 90 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 270 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 9:
				v = new THREE.Vector3(0, 0, 1).normalize();
				v2 = new THREE.Vector3(1, 0, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 90 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 180 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 10:
				v = new THREE.Vector3(0, 0, 1).normalize();
				v2 = new THREE.Vector3(1, 0, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 90 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 0 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 11:
				v = new THREE.Vector3(0, 0, 1).normalize();
				v2 = new THREE.Vector3(1, 0, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 90 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 90 / 180);
				q.multiplyQuaternions(q2, q3);
			break;
		}

		this.mesh.quaternion = q;
	};

	CornerOrientationV1 = function(orient, activ){
		if(typeof orient !== 'number'){
			if(orient === null){
				orient = 0;
			}
			else {
				throw "Orientation must be a integer.";
			}
		}
		if(typeof activ !== 'number'){
			if(activ === null){
				activ = 0;
			}
			else {
				throw "isActive must be a integer.";
			}
		}

		var o = orient * 2 + activ,
			q = new THREE.Quaternion(),
			q2 = new THREE.Quaternion(),
			q3 = new THREE.Quaternion(),
			v,v2;

		this.orient		= orient;
		this.isActive	= activ;

		switch(o){
			case 0:
				if(Math.floor(this.currentHp / 256) == 0){
					v = new THREE.Vector3(0, 0, 1).normalize();
					v2 = new THREE.Vector3(0, 1, 0).normalize();
					q2.setFromAxisAngle(v, Math.PI * 0 / 180);
					q3.setFromAxisAngle(v2, Math.PI * 0 / 180);
					q.multiplyQuaternions(q2, q3);
				}
				else {
					v = new THREE.Vector3(0, 0, 1).normalize();
					v2 = new THREE.Vector3(0, 1, 0).normalize();
					q2.setFromAxisAngle(v, Math.PI * 270 / 180);
					q3.setFromAxisAngle(v2, Math.PI * 180 / 180);
					q.multiplyQuaternions(q2, q3);
				}
			break;

			case 1:
				if(Math.floor(this.currentHp / 256) == 0){
				v = new THREE.Vector3(0, 0, 1).normalize();
				v2 = new THREE.Vector3(0, 1, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 0 / 180);
				q3.setFromAxisAngle(v2, Math.PI * -90 / 180);
				q.multiplyQuaternions(q2, q3);
				}
				else {
					v = new THREE.Vector3(0, 0, 1).normalize();
					v2 = new THREE.Vector3(0, 1, 0).normalize();
					q2.setFromAxisAngle(v, Math.PI * 270 / 180);
					q3.setFromAxisAngle(v2, Math.PI * 270 / 180);
					q.multiplyQuaternions(q2, q3);
				}
			break;

			case 2:
				if(Math.floor(this.currentHp / 256) == 0){
					v = new THREE.Vector3(0, 0, 1).normalize();
					v2 = new THREE.Vector3(0, 1, 0).normalize();
					q2.setFromAxisAngle(v, Math.PI * 0 / 180);
					q3.setFromAxisAngle(v2, Math.PI * -180 / 180);
					q.multiplyQuaternions(q2, q3);
				}
				else {
					v = new THREE.Vector3(0, 0, 1).normalize();
					v2 = new THREE.Vector3(0, 1, 0).normalize();
					q2.setFromAxisAngle(v, Math.PI * 270 / 180);
					q3.setFromAxisAngle(v2, Math.PI * 0 / 180);
					q.multiplyQuaternions(q2, q3);
				}
			break;

			case 3:
				if(Math.floor(this.currentHp / 256) == 0){
					v = new THREE.Vector3(0, 0, 1).normalize();
					v2 = new THREE.Vector3(0, 1, 0).normalize();
					q2.setFromAxisAngle(v, Math.PI * 0 / 180);
					q3.setFromAxisAngle(v2, Math.PI * -270 / 180);
					q.multiplyQuaternions(q2, q3);
				}
				else {
					v = new THREE.Vector3(0, 0, 1).normalize();
					v2 = new THREE.Vector3(0, 1, 0).normalize();
					q2.setFromAxisAngle(v, Math.PI * 270 / 180);
					q3.setFromAxisAngle(v2, Math.PI * 90 / 180);
					q.multiplyQuaternions(q2, q3);
				}
			break;

			case 4:
				if(Math.floor(this.currentHp / 256) == 0){
					v = new THREE.Vector3(0, 0, 1).normalize();
					v2 = new THREE.Vector3(0, 1, 0).normalize();
					q2.setFromAxisAngle(v, Math.PI * 180 / 180);
					q3.setFromAxisAngle(v2, Math.PI * 90 / 180);
					q.multiplyQuaternions(q2, q3);
				}
				else {
					v = new THREE.Vector3(0, 0, 1).normalize();
					v2 = new THREE.Vector3(0, 1, 0).normalize();
					q2.setFromAxisAngle(v, Math.PI * 90 / 180);
					q3.setFromAxisAngle(v2, Math.PI * 270 / 180);
					q.multiplyQuaternions(q2, q3);
				}
			break;

			case 5:
				if(Math.floor(this.currentHp / 256) == 0){
					v = new THREE.Vector3(0, 0, 1).normalize();
					v2 = new THREE.Vector3(0, 1, 0).normalize();
					q2.setFromAxisAngle(v, Math.PI * 180 / 180);
					q3.setFromAxisAngle(v2, Math.PI * 180 / 180);
					q.multiplyQuaternions(q2, q3);
				}
				else {
					v = new THREE.Vector3(0, 0, 1).normalize();
					v2 = new THREE.Vector3(0, 1, 0).normalize();
					q2.setFromAxisAngle(v, Math.PI * 90 / 180);
					q3.setFromAxisAngle(v2, Math.PI * 180 / 180);
					q.multiplyQuaternions(q2, q3);
				}
			break;

			case 6:
				if(Math.floor(this.currentHp / 256) == 0){
					v = new THREE.Vector3(0, 0, 1).normalize();
					v2 = new THREE.Vector3(0, 1, 0).normalize();
					q2.setFromAxisAngle(v, Math.PI * 180 / 180);
					q3.setFromAxisAngle(v2, Math.PI * 270 / 180);
					q.multiplyQuaternions(q2, q3);
				}
				else {
					v = new THREE.Vector3(0, 0, 1).normalize();
					v2 = new THREE.Vector3(0, 1, 0).normalize();
					q2.setFromAxisAngle(v, Math.PI * 90 / 180);
					q3.setFromAxisAngle(v2, Math.PI * 90 / 180);
					q.multiplyQuaternions(q2, q3);
				}
			break;

			case 7:
				if(Math.floor(this.currentHp / 256) == 0){
					v = new THREE.Vector3(0, 0, 1).normalize();
					v2 = new THREE.Vector3(0, 1, 0).normalize();
					q2.setFromAxisAngle(v, Math.PI * 180 / 180);
					q3.setFromAxisAngle(v2, Math.PI * 0 / 180);
					q.multiplyQuaternions(q2, q3);
				}
				else {
					v = new THREE.Vector3(0, 0, 1).normalize();
					v2 = new THREE.Vector3(0, 1, 0).normalize();
					q2.setFromAxisAngle(v, Math.PI * 90 / 180);
					q3.setFromAxisAngle(v2, Math.PI * 0 / 180);
					q.multiplyQuaternions(q2, q3);
				}
			break;

			case 8:
				v = new THREE.Vector3(1, 0, 0).normalize();
				v2 = new THREE.Vector3(0, 1, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 90 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 270 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 9:
				v = new THREE.Vector3(1, 0, 0).normalize();
				v2 = new THREE.Vector3(0, 1, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 90 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 180 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 10:
				v = new THREE.Vector3(1, 0, 0).normalize();
				v2 = new THREE.Vector3(0, 1, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 90 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 90 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 11:
				v = new THREE.Vector3(1, 0, 0).normalize();
				v2 = new THREE.Vector3(0, 1, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 90 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 0 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 12:
				v = new THREE.Vector3(1, 0, 0).normalize();
				v2 = new THREE.Vector3(0, 1, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 270 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 270 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 13:
				v = new THREE.Vector3(1, 0, 0).normalize();
				v2 = new THREE.Vector3(0, 1, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 270 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 0 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 14:
				v = new THREE.Vector3(1, 0, 0).normalize();
				v2 = new THREE.Vector3(0, 1, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 270 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 90 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 15:
				v = new THREE.Vector3(1, 0, 0).normalize();
				v2 = new THREE.Vector3(0, 1, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 270 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 180 / 180);
				q.multiplyQuaternions(q2, q3);
			break;
		}

		this.mesh.quaternion = q;
	};


	WedgeOrientationV0 = function(orient, activ){
		if(typeof orient !== 'number'){
			if(orient === null){
				orient = 0;
			}
			else {
				throw "Orientation must be a integer.";
			}
		}
		if(typeof activ !== 'number'){
			if(activ === null){
				activ = 0;
			}
			else {
				throw "isActive must be a integer.";
			}
		}

		var o = orient * 2 + activ,
			q = new THREE.Quaternion(),
			q2 = new THREE.Quaternion(),
			q3 = new THREE.Quaternion(),
			v,v2;

		this.orient		= orient;
		this.isActive	= activ;

		switch(o){
			case 0:
				v = new THREE.Vector3(0, 1, 0).normalize();
				q.setFromAxisAngle(v, Math.PI * 0 / 180);
			break;

			case 1:
				v = new THREE.Vector3(0, 0, 1).normalize();
				v2 = new THREE.Vector3(1, 0, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 90 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 270 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 2:
				v = new THREE.Vector3(0, 1, 0).normalize();
				q.setFromAxisAngle(v, Math.PI * 90 / 180);
			break;

			case 4:
				v = new THREE.Vector3(0, 1, 0).normalize();
				q.setFromAxisAngle(v, Math.PI * 180 / 180);
			break;

			case 5:
				v = new THREE.Vector3(0, 0, 1).normalize();
				v2 = new THREE.Vector3(1, 0, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 90 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 0 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 6:
				v = new THREE.Vector3(0, 1, 0).normalize();
				q.setFromAxisAngle(v, Math.PI * 270 / 180);
			break;

			case 8:
				v = new THREE.Vector3(0, 0, 1).normalize();
				q.setFromAxisAngle(v, Math.PI * 180 / 180);
			break;

			case 10:
				v = new THREE.Vector3(0, 0, 1).normalize();
				v2 = new THREE.Vector3(0, 1, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 180 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 90 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 11:
				v = new THREE.Vector3(0, 0, 1).normalize();
				v2 = new THREE.Vector3(1, 0, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 90 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 180 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 12:
				v = new THREE.Vector3(0, 0, 1).normalize();
				v2 = new THREE.Vector3(0, 1, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 180 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 180 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 14:
				v = new THREE.Vector3(0, 0, 1).normalize();
				v2 = new THREE.Vector3(0, 1, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 180 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 270 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 15:
				v = new THREE.Vector3(0, 0, 1).normalize();
				v2 = new THREE.Vector3(1, 0, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 90 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 90 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 3:
				v = new THREE.Vector3(0, 0, 1).normalize();
				v2 = new THREE.Vector3(1, 0, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 90 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 180 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 7:
				v = new THREE.Vector3(0, 0, 1).normalize();
				v2 = new THREE.Vector3(1, 0, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 90 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 90 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 9:
				v = new THREE.Vector3(0, 0, 1).normalize();
				v2 = new THREE.Vector3(1, 0, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 90 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 270 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 13:
				v = new THREE.Vector3(0, 0, 1).normalize();
				v2 = new THREE.Vector3(1, 0, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 90 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 0 / 180);
				q.multiplyQuaternions(q2, q3);
			break;
		}

		this.mesh.quaternion = q;
	};

	CornerOrientationV0 = function(orient, activ){
		if(typeof orient !== 'number'){
			if(orient === null){
				orient = 0;
			}
			else {
				throw "Orientation must be a integer.";
			}
		}
		if(typeof activ !== 'number'){
			if(activ === null){
				activ = 0;
			}
			else {
				throw "isActive must be a integer.";
			}
		}

		var o = orient * 2 + activ,
			q = new THREE.Quaternion(),
			q2 = new THREE.Quaternion(),
			q3 = new THREE.Quaternion(),
			v,v2;

		this.orient		= orient;
		this.isActive	= activ;

		switch(o){
			case 0:
				v = new THREE.Vector3(0, 1, 0).normalize();
				q.setFromAxisAngle(v, Math.PI * 0 / 180);
			break;

			case 1:
				v = new THREE.Vector3(0, 0, 1).normalize();
				v2 = new THREE.Vector3(1, 0, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 90 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 270 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 2:
				v = new THREE.Vector3(0, 1, 0).normalize();
				q.setFromAxisAngle(v, Math.PI * 270 / 180);
			break;

			case 4:
				v = new THREE.Vector3(0, 1, 0).normalize();
				q.setFromAxisAngle(v, Math.PI * 180 / 180);
			break;

			case 5:
				v = new THREE.Vector3(0, 0, 1).normalize();
				v2 = new THREE.Vector3(1, 0, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 90 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 0 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 6:
				v = new THREE.Vector3(0, 1, 0).normalize();
				q.setFromAxisAngle(v, Math.PI * 0 / 180);
			break;

			case 8:
				v = new THREE.Vector3(0, 0, 1).normalize();
				q.setFromAxisAngle(v, Math.PI * 180 / 180);
			break;

			case 10:
				v = new THREE.Vector3(0, 0, 1).normalize();
				v2 = new THREE.Vector3(0, 1, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 180 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 90 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 11:
				v = new THREE.Vector3(0, 0, 1).normalize();
				v2 = new THREE.Vector3(1, 0, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 90 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 180 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 12:
				v = new THREE.Vector3(0, 0, 1).normalize();
				v2 = new THREE.Vector3(0, 1, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 180 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 180 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 14:
				v = new THREE.Vector3(0, 0, 1).normalize();
				v2 = new THREE.Vector3(0, 1, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 180 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 270 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 15:
				v = new THREE.Vector3(0, 0, 1).normalize();
				v2 = new THREE.Vector3(1, 0, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 90 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 90 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 3:
				v = new THREE.Vector3(0, 0, 1).normalize();
				v2 = new THREE.Vector3(1, 0, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 90 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 180 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 7:
				v = new THREE.Vector3(0, 0, 1).normalize();
				v2 = new THREE.Vector3(1, 0, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 90 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 90 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 9:
				v = new THREE.Vector3(0, 0, 1).normalize();
				v2 = new THREE.Vector3(1, 0, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 90 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 270 / 180);
				q.multiplyQuaternions(q2, q3);
			break;

			case 13:
				v = new THREE.Vector3(0, 0, 1).normalize();
				v2 = new THREE.Vector3(1, 0, 0).normalize();
				q2.setFromAxisAngle(v, Math.PI * 90 / 180);
				q3.setFromAxisAngle(v2, Math.PI * 0 / 180);
				q.multiplyQuaternions(q2, q3);
			break;
		}

		this.mesh.quaternion = q;
	};


	//--------------------------------------------
	// Cross Class (Cube sub class)
	//--------------------------------------------
	var Cross = function(/* see Cube function */){
		Cube.apply(this, arguments);
	};

	Cross.prototype = Object.create(Cube.prototype);

	Cross.prototype.initGeom = function(){

		//Create all vertices of geometry
		//first plane
		this.geometry.vertices.push(new THREE.Vector3(-0.5, -0.5, 0));
		this.geometry.vertices.push(new THREE.Vector3( 0.5, -0.5, 0));
		this.geometry.vertices.push(new THREE.Vector3(-0.5,  0.5, 0));
		this.geometry.vertices.push(new THREE.Vector3( 0.5,  0.5, 0));

		//second plane
		this.geometry.vertices.push(new THREE.Vector3(0, -0.5, -0.5));
		this.geometry.vertices.push(new THREE.Vector3(0, -0.5,  0.5));
		this.geometry.vertices.push(new THREE.Vector3(0,  0.5, -0.5));
		this.geometry.vertices.push(new THREE.Vector3(0,  0.5,  0.5));

		//right side
		this.geometry.faces.push(new THREE.Face3(3, 1, 2));
		this.geometry.faces.push(new THREE.Face3(0, 2, 1));

		//front side
		this.geometry.faces.push(new THREE.Face3(4, 6, 5));
		this.geometry.faces.push(new THREE.Face3(7, 6, 5));

	};

	Cross.prototype.initMesh = function(){
		this.material = new THREE.MeshPhongMaterial({
			map:			this.textures.texture,
			normalMap:		this.textures.normal,
			side:			THREE.DoubleSide,
			transparent:	true
		});

		this.mesh = new THREE.Mesh(this.geometry, this.material);
		this.bid = this.id;
	};


	//--------------------------------------------
	// Tetra Class (Corner sub class)
	//--------------------------------------------
	var Tetra = function(/* see Cube function */){
		Corner.apply(this, arguments);
	};

	Tetra.prototype = Object.create(Corner.prototype);

	Tetra.prototype.initGeom = function(){

		//Create all vertices of geometry
		this.geometry.vertices.push(new THREE.Vector3(-0.5, -0.5,  0.5));
		this.geometry.vertices.push(new THREE.Vector3( 0.5, -0.5,  0.5));
		this.geometry.vertices.push(new THREE.Vector3(-0.5,  0.5,  0.5));
		this.geometry.vertices.push(new THREE.Vector3(-0.5, -0.5, -0.5));

		//Create all faces
		//front side
		this.geometry.faces.push(new THREE.Face3(0, 1, 2));

		//bottom side
		this.geometry.faces.push(new THREE.Face3(0, 3, 1));

		//top side
		this.geometry.faces.push(new THREE.Face3(2, 1, 3));

		//left side
		this.geometry.faces.push(new THREE.Face3(0, 2, 3));

	};


	//--------------------------------------------
	// Penta Class (Corner sub class)
	//--------------------------------------------
	var Penta = function(/* see Cube function */){
		Corner.apply(this, arguments);
	};

	Penta.prototype = Object.create(Corner.prototype);

	Penta.prototype.initGeom = function(){

		//Create all vertices of geometry
		this.geometry.vertices.push(new THREE.Vector3(-0.5, -0.5,  0.5));	//0
		this.geometry.vertices.push(new THREE.Vector3( 0.5, -0.5,  0.5));	//1
		this.geometry.vertices.push(new THREE.Vector3(-0.5,  0.5,  0.5));	//2
		this.geometry.vertices.push(new THREE.Vector3( 0.5,  0.5,  0.5));	//3
		this.geometry.vertices.push(new THREE.Vector3(-0.5, -0.5, -0.5));	//4
		this.geometry.vertices.push(new THREE.Vector3( 0.5, -0.5, -0.5));	//5
		this.geometry.vertices.push(new THREE.Vector3(-0.5,  0.5, -0.5));	//6

		//Create all faces
		//front side
		this.geometry.faces.push(new THREE.Face3(0, 1, 2));
		this.geometry.faces.push(new THREE.Face3(3, 2, 1));

		//back side
		this.geometry.faces.push(new THREE.Face3(4, 6, 5));

		//bottom side
		this.geometry.faces.push(new THREE.Face3(0, 4, 1));
		this.geometry.faces.push(new THREE.Face3(5, 1, 4));

		//top side
		this.geometry.faces.push(new THREE.Face3(2, 3, 6));
		this.geometry.faces.push(new THREE.Face3(5, 6, 3));

		//right side
		this.geometry.faces.push(new THREE.Face3(1, 5, 3));

		//left side
		this.geometry.faces.push(new THREE.Face3(0, 2, 4));
		this.geometry.faces.push(new THREE.Face3(6, 4, 2));

	};


	//--------------------------------------------
	// Init this lib
	//--------------------------------------------
	_blocksType = StarOS.SM.getSyncBlockType();
	if(!_blocksType){
		throw "Cannot get BlockTypes.properties"
	}
	else {
		var xml = StarOS.SM.getSyncBlockDef();
		var blocks = xml.getElementsByTagName("Block");

		for(var i = 0; i < blocks.length; i++){
			var type	= blocks[i].attributes.getNamedItem("type").nodeValue,
				recipe	= blocks[i].getElementsByTagName("CubatomRecipe"),
				comp	= blocks[i].getElementsByTagName("CubatomCompound")[0].getElementsByTagName("Cubatom"),
				color	= blocks[i].getElementsByTagName("LightSourceColor")[0].innerHTML;

			color = color.split(",");
			for(var j = 0; j < color.length; j++){
				color[j] = parseFloat(color[j]);
			}

			var block = {
				name:		blocks[i].attributes.getNamedItem("name").nodeValue,
				icon:		parseInt(blocks[i].attributes.getNamedItem("icon").nodeValue),
				textureId:	parseInt(blocks[i].attributes.getNamedItem("textureId").nodeValue),
				type:		type,
				properties:	{
					individualSides:	parseInt(blocks[i].getElementsByTagName("IndividualSides")[0].innerHTML),
					price:				parseInt(blocks[i].getElementsByTagName("Price")[0].innerHTML),
					cubatomRecipe:		{
						mass:		recipe[0].getElementsByTagName("mass")[0].text,
						spinning:	recipe[0].getElementsByTagName("spinning")[0].text
					},
					cubatomCompound:	{
						"0": {
							mass:			comp[0].getElementsByTagName("mass")[0].innerHTML,
							spinning:		comp[0].getElementsByTagName("spinning")[0].innerHTML,
							thermal:		comp[0].getElementsByTagName("thermal")[0].innerHTML,
							conductivity:	comp[0].getElementsByTagName("conductivity")[0].innerHTML
						},
						"1": {
							mass:			comp[1].getElementsByTagName("mass")[0].innerHTML,
							spinning:		comp[1].getElementsByTagName("spinning")[0].innerHTML,
							thermal:		comp[1].getElementsByTagName("thermal")[0].innerHTML,
							conductivity:	comp[1].getElementsByTagName("conductivity")[0].innerHTML
						}
					},
					projectionTo:		parseInt(blocks[i].getElementsByTagName("ProjectionTo")[0].innerHTML),
					animated:			parseBool(blocks[i].getElementsByTagName("Animated")[0].innerHTML),
					armour:				parseInt(blocks[i].getElementsByTagName("Armour")[0].innerHTML),
					transparency:		parseBool(blocks[i].getElementsByTagName("Transparency")[0].innerHTML),
					inShop:				parseBool(blocks[i].getElementsByTagName("InShop")[0].innerHTML),
					orientation:			parseBool(blocks[i].getElementsByTagName("Orientation")[0].innerHTML),
					entrable:			parseBool(blocks[i].getElementsByTagName("Enterable")[0].innerHTML),
					lightSource:		parseBool(blocks[i].getElementsByTagName("LightSource")[0].innerHTML),
					hitpoints:			parseInt(blocks[i].getElementsByTagName("Hitpoints")[0].innerHTML),
					placable:			parseBool(blocks[i].getElementsByTagName("Placable")[0].innerHTML),
					inRecipe:			parseBool(blocks[i].getElementsByTagName("InRecipe")[0].innerHTML),
					canActivate:		parseBool(blocks[i].getElementsByTagName("CanActivate")[0].innerHTML),
					physical:			parseBool(blocks[i].getElementsByTagName("Physical")[0].innerHTML),
					blockStyle:			parseInt(blocks[i].getElementsByTagName("BlockStyle")[0].innerHTML),
					lightSourceColor:	color
				}
			};

			_blocks[_blocksType[type]] = block;
		}
	}


	//--------------------------------------------
	// Exporting Class and Functions
	//--------------------------------------------

	StarOS.SMgl				= StarOS.SMgl			|| {};

	//Functions
	StarOS.SMgl.getBlock	= StarOS.SMgl.getBlock	|| getBlock;

	//Class
	StarOS.SMgl.Cube		= StarOS.SMgl.Cube		|| Cube;
	StarOS.SMgl.Wedge		= StarOS.SMgl.Wedge		|| Wedge;
	StarOS.SMgl.Corner		= StarOS.SMgl.Corner	|| Corner;
	StarOS.SMgl.Cross		= StarOS.SMgl.Cross		|| Cross;
	StarOS.SMgl.Tetra		= StarOS.SMgl.Tetra		|| Tetra;
	StarOS.SMgl.Penta		= StarOS.SMgl.Penta		|| Penta;

	StarOS.SMgl.blocksDef		= StarOS.SMgl.blocksDef		|| _blocks;
	StarOS.SMgl.blocksType		= StarOS.SMgl.blocksType	|| _blocksType;

})();