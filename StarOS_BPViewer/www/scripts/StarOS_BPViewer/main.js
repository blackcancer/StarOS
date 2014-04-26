(function(){
	var settings = {
		debug		: false,
		parentId	: "BPViewer",
		view		: {
			fov		: 45,
			near	: 0.1,
			far		: 4100000
		},
	};

	var pbViewer = new StarOS.BPViewer(settings);
})()

