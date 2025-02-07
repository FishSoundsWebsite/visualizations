/* REQUIRED EXTERNAL LIBRARIES
	<script src="https://d3js.org/d3.v7.min.js" charset="utf-8"></script>
*/

/* CORE FUNCTION
buildDendrogram(data,options);
*/

/* FILE DATA TEMPLATE
data = {
	"id":"",						// a unique ID within the dataset
	"name":"",						// the display name of the node, shown on the SVG
	"trueDepth":#,					// a numerical representation of the level of the data point within the dataset; the outermost level should be 0; allows accounting for hierarchies where some branches have more levels than other (where one branch might have levels 0, 1, 2, and 3, but another branch might have only 0, 1, and 3)
	"key":boolean,					// a key referenced when calling updateNodeColors("key") or filterNodes("key",displayBoolean) (see utility functions below) and a boolean that determines how to color or whether to filter the node; as many key/boolean pairs as needed can be included
	"children":[					// array containing nested objects in the same pattern described above
		{"id":"",
		"name":"",
		"trueDepth":#,
		"key":boolean,
		"children":[
			// repeat nested pattern as needed to form hierarchy
		]},{},{}
	]}
}
*/

/* OPTIONS TEMPLATE 
options = {
	width: #,						// width of the SVG canvas containing the dendrogram; defaults to 500
	height: #,						// height of the SVG canvas containing the dendrogram; defaults to 500
	margin: #,						// size of all margins; defaults to 10
	marginTop: #,					// size of top margin; overwrites margin value
	marginBottom: #,				// size of bottom margin; overwrites margin value
	marginLeft: #,					// size of left margin; overwrites margin value
	marginRight: #,					// size of right margin; overwrites margin value
	leafPacking: #,					// defines the distance between nodes at the outermost level; higher numbers mean closer spacing; defaults to 3
	branchDistance: #,				// defines the distance between each level of the dendrogram; higher numbers mean more spacing; defaults to 75
	duration: #,					// length of time for the animation of updating the dendrogram; defaults to 350; note that filterNodes function uses an animation 100ms shorter than the provided duration value (but never less than 25ms)
	center: "",						// ID (as listed in the dataset) of the node to be rendered as root at the center of the dendrogram; defaults to the outermost element in the dataset
	branchColor: "#000000",			// hexadecimal reference for the color of branch (non-terminal) nodes; defaults to "#FFD966"; can be changed when calling updateDendrogramOptions()
	leafColor: "#000000",			// hexadecimal reference for the color of leaf (terminal) nodes; defaults to "#FD9500"; can be changed when calling updateDendrogramOptions()
	nodeSize: decimal,				// size for the circles plotted for each node; defaults to 6.5
	symbols: boolean,				// whether to include +/- symbols on the nodes to indicate they are expandable/collapsible; defaults to true
	events: {
		click: function,			// function to call when a node is clicked; defaults to the included clickNode function that expands/collapses any children on the node
			// provided functions should include calling clickNode(nodeId) to replicate the existing expand/collapse functionality
		dblclick: function,			// function to call when a node is double clicked; no default provided
		mouseover: function,		// function to call when the mouse enters a node; no default provided
		mouseout: function			// function to call when the mouse leaves a node; no default provided
	}
}
*/

/* UTILITY FUNCTIONS
	resizeSVG(width,height);			// change the dimensions of the SVG to provided values and re-render the dendrogram
	panSVG(x,y);						// move the viewport of the SVG to center on the provided position
	updateNodeColors(colorFlag);		// recolor the branch and leaf nodes based on whether the provided parameter from the dataset is true (branchColor/leafColor as set in options) or false ("#E1E1E1")
	filterNodes(filterFlag,display);	// hides (display = false) or shows (display = true) nodes where the provided parameter from the dataset is true
	clickNode(node || "nodeId");		// default click functionality that expands/collapses the indicated node
	jumpToNode("nodeId");				// expands the tree to display the indicated nodes and pans the SVG to place it in the middle of the viewport
*/			

let svg,
	hierarchy,
	tree,
	root,
	diagonal,
	gNode,
	gLink,
	fullData,
	dataset,
	width,
	height,
	marginTop,
	marginBottom,
	marginLeft,
	marginRight,
	panX,
	panY,
	leafPacking,
	branchDistance,
	duration,
	nodeEvents,
	center,
	colorFlag,
	filter,
	nodeSize,
	symbols,
	branchColor,
	leafColor;

// set parameters to provided options
// parse provided data into an array and select a subset of data if required
// calculate a tree structure and radial angles
// 
function buildDendrogram(data,options){
	// assign or calculate parameter values based on provided options or defaults
	leafPacking = options.leafPacking ? options.leafPacking : 3;
	branchDistance = options.branchDistance ? options.branchDistance : 75;
	duration = options.duration ? options.duration : 350;
	width = options.width ? options.width : 500;
	height = options.height ? options.height : 500;
	marginTop = options.marginTop ? options.marginTop : options.margin ? options.margin : 10;
	marginBottom = options.marginBottom ? options.marginBottom : options.margin ? options.margin : 10;
	marginLeft = options.marginLeft ? options.marginLeft : options.margin ? options.margin : 10;
	marginRight = options.marginRight ? options.marginRight : options.margin ? options.margin : 10;
	panX = width/2;
	panY = height/2;
	nodeSize = options.nodeSize ? options.nodeSize : 6.5;
	symbols = options.symbols === false || options.symbols === 0 ? false : true;
	branchColor = options.branchColor ? options.branchColor : "#FFD966";
	leafColor = options.leafColor ? options.leafColor : "#FD9500";
	if(options.center){ center = options.center; }
	if(options.colorFlag){ colorFlag = options.colorFlag; }
	if(options.events && Object.keys(options.events).length > 0){ nodeEvents = options.events; }
	
	// parse data and select subset
	fullData = JSON.parse(data);
	if(options.center){
		dataset = getDataset(options.center,[fullData]);
	}else{
		dataset = fullData;
	}

	// define the tree layout
	tree = d3.cluster()
		.size([360, Math.min(width, height) / 2 - 40])
		.separation((a, b) => (a.parent == b.parent ? 1 : leafPacking) / a.depth);
	
	// calculates angles of rotation based on x,y coordinates; used to angle links and text
	diagonal = d3.linkRadial().angle(d => (d.x + 90) / 180 * Math.PI).radius(d => d.data ? d.data.trueDepth * branchDistance : d.depth * branchDistance);

	// create the SVG, main content group, and groups for the links and the nodes
	svg = d3.create("svg")
			.attr("width", width)
			.attr("height", height)
			.attr("viewBox", [-marginLeft, -marginTop, width, height])
			.attr("style", "max-width: 100%; height: auto; font: 10px sans-serif; user-select: none; position: relative;")
			.call(d3.zoom().on("zoom", (e) => svgContents.attr("transform", "translate(" + (e.transform.x + panX) + "," + (e.transform.y + panY) + ") scale(" + e.transform.k + ")")));
			
	svgContents = svg.append("g")
			.attr("transform", "translate(" + panX + "," + panY + ")");
			
	gLink = svgContents.append("g")
			.attr("fill", "none")
			.attr("stroke", "#555")
			.attr("stroke-opacity", 0.4)
			.attr("stroke-width", 1.5);		

	gNode = svgContents.append("g")
			.attr("cursor", "pointer")
			.attr("pointer-events", "all");
	
	// create a hierarchy from the dataset and collapse all but the first layer of children
	root = d3.hierarchy(dataset);
	root.x0 = 0;
	root.y0 = 0;
	root.descendants().forEach((d, i) => {
		d._children = d.children;
		if(d.depth && d.depth >= root.depth + 1){ d.children = null; }
	});
	
	// plot the dendrogram on the SVG and return the SVG for inclusion in the DOM
	updateDendrogram(root);
	return svg.node();
}

// moves the center of the display on SVG to provided coordinates
function panSVG(x,y){
	d3.select("svg g")
		.attr("transform", "translate(" + (-(x) + panX) + "," + (-(y) + panY) + ")");
}

// adjusts the size and position of the SVG
// used to account for changing screen size or allocated space on screen
function resizeSVG(width,height){
	d3.select("svg")
		.attr("width",width)
		.attr("height",height);
	
	panX = width/2;
	panY = height/2;
	
	d3.select("svg g")
		.attr("transform", "translate(" + panX + "," + panY + ")");
}

// Toggle whether children of the indicated node are visible
// accepts a node or a string matching a node ID
function clickNode(d){
	if(typeof d === 'string' || d instanceof String){ d = getNode(d); }
	if(d && d.children){
		d.children = null;
	}else if(d){
		d.children = d._children;
	}

	updateDendrogram(root);
}

// change color of nodes based on provided flag; overwrite colorFlag value provided in options during initiation so coloration remains consistent during other changes
function updateNodeColors(newColorFlag){
	colorFlag = newColorFlag;
	
	var node = svg.selectAll("g.node");
	var nodeUpdate = node.transition()
			.duration(duration)
			.select("circle")
			.style("fill", d => colorFlag && d.data[colorFlag] ? d._children ? branchColor : leafColor : "#E1E1E1");
}

// show or hide nodes and links where the indicated filter flag in the dataset is false
function filterNodes(filter,display){
	var style = display ? "inline" : "none";
	var shortenedDuration = (duration - 100) > 0 ? duration - 100 : 25;
	var removableNodes = svg.selectAll("g.node")
						.filter(function(d){ return !d.data[filter]; })
						.transition()
						.duration(shortenedDuration)
						.style("display", style);
	
	var removableLinks = svg.selectAll(".link")
					.filter(function(d){ return !d.target.data[filter]; })
					.transition()
					.duration(shortenedDuration)
					.style("display", style);			
}

// identify the desired node by ID
// expand tree so node is visible
// pan SVG to center on node
function jumpToNode(id){
	var nodes = d3.hierarchy(fullData);

	nodes.descendants().forEach((d, i) => {
		if(d.data.id == id){
			var path = d.ancestors();
			for(var i = path.length - 1; i > 0; i--){
				var node = root.find(d => d.data.id == path[i].data.id);
				node.children = node._children;
			}
		}
	});
	
	updateDendrogram(root);
	setTimeout(function(){
		var node = svg.select("#" + id).attr("transform");
		var nodeCoordinates = node.match(/translate\((.+?)\)/)[1].split(",");
	  	panSVG(nodeCoordinates[0],nodeCoordinates[1]);
	},duration + 100);
}

// plots dendrogram on SVG created in buildDendrogram function
// calculates tree shape for dataset
// plots nodes and labels
// plots links between nodes
updateDendrogram = function(source){
	const nodes = source.descendants();
	const links = source.links();

	// Compute tree layout
	tree(source);

	const transition = svgContents.transition()
			.duration(duration)
			.attr("height", height)
			.attr("viewBox", [-marginLeft, -marginTop, width, height])
			.tween("resize", window.ResizeObserver ? null : () => () => svg.dispatch("toggle"));

	// Select nodes for creation/update
	const node = gNode.selectAll("g")
			.data(nodes, d => d.id);

	// Enter new nodes with required event functionality
	const nodeEnter = node.enter().append("g")
			.attr("class", "node")
			.attr("id", d => d.data.id)
			.attr("y", d => d.depth * branchDistance)
			.attr("fill-opacity", 0)
			.attr("stroke-opacity", 0)
			.on("click", function(el,d) { return nodeEvents.click ? nodeEvents.click(d.data) : clickNode(d.data); })
			.on("dblclick", function(el,d) { return nodeEvents.dblclick ? nodeEvents.dblclick(d.data) : null; })
			.on("mouseover", function(el,d) { return nodeEvents.mouseover ? nodeEvents.mouseover(d.data) : null; })
			.on("mouseout", function(el,d) { return nodeEvents.mouseout ? nodeEvents.mouseout(d.data) : null; });
	
	// Enter circles
	nodeEnter.append("circle")
			.attr("r", nodeSize)
			.attr("fill", d => colorFlag && d.data[colorFlag] ? d._children ? branchColor : leafColor : "#E1E1E1")
			.attr("stroke-width", 10);
	
	// If needed, enter +/- symbols over circles
	if(symbols){		
		nodeEnter.append("text")
				.attr("class", "symbol")
				.attr("text-anchor", "middle")
				.style("font-weight",700)
				.style("font-size", d => d._children ? "9pt" : "12pt")
				.attr("y", d => d.children ? 4.5 : 4)
				.text(d => d.children ? "-" : d._children ? "+" : "");
	}

	// Enter text labels near circles
	// Adjusts appearance, location, and orientation depending on:
		// existence of children nodes, 
		// visibility of children nodes,
		// angle of rotation in radial display
	nodeEnter.append("text")
			.attr("class", "label")
			.attr("x", d => d.children ? d.x <= 180 ? 0 : 20 : 10)
			.attr("y", d => d.children ? -10 : 3)
			.style("font-size", d => d.children ? "7pt" : "10pt")
			.style("fill", d => d.children ? "#A1A1A1" : "default")
			.attr("text-anchor", d => d.children ? "middle" : d.x > 90 && d.x < 270 ? "end" : "start")
			.attr("transform", d => d.x > 90 && d.x < 270 ? "rotate(180)translate(-20)" : "translate(0)")
			.text(d => d.data.name)
			.attr("stroke-linejoin", "round")
			.attr("stroke-width", 3);

	// Transition existing nodes to new position
	const nodeUpdate = node.merge(nodeEnter).transition(transition)
			.duration(duration)
			.attr("transform", d => "rotate(" + (d.x) + ") translate(" + (d.data.trueDepth * branchDistance) + ",0)")
			.attr("fill-opacity", 1)
			.attr("stroke-opacity", 1);

	// Transition exiting nodes to parent's new position and remove
	const nodeExit = node.exit().transition(transition)
			.duration(duration)
			.remove()
			.attr("transform", d => "translate(" + source.y + "," + source.x + ")")
			.attr("fill-opacity", 0)
			.attr("stroke-opacity", 0);

	// Select links for creation/update
	const link = gLink.selectAll("path")
		.data(links, d => d.target.id);

	// Enter new links at parent's previous position
	const linkEnter = link.enter().append("path")
			.attr("class", "link")
			.attr("d", d => {
				const o = {x: source.x0, y: source.y0};
				return diagonal({source: o, target: o});
			});

	// Transition existing links to new position
	link.merge(linkEnter).transition(transition)
			.duration(duration)
			.attr("d", diagonal);

	// Transition exiting nodes to the parent's new position.
	link.exit().transition(transition)
			.duration(duration)
			.remove()
			.attr("d", d => {
				const o = {x: source.x, y: source.data.trueDepth * branchDistance};
				return diagonal({source: o, target: o});
			});

	// Store updated positions for future transitions
	source.eachBefore(d => {
		d.x0 = d.x;
		d.y0 = d.y;
	});
}

//given an ID, returns the matching node with its descendents in a data array
getNode = function(id){
	node = svg.select("#" + id).data()[0];
	return node;
}

//given an ID, returns the matching JSON object from the originally provided dataset
getDataset = function(id,bucket){
  for(var node of bucket){
    if(node.id === id){ return node; }
    if (node.children) {
      var child = getDataset(id, node.children);
      if(child){ return child; }
    }
  }
}

