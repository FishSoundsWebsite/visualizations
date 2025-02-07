/* REQUIRED EXTERNAL LIBRARIES
	<script src="https://d3js.org/d3.v7.min.js" charset="utf-8"></script>
*/

/* CORE FUNCTION
buildMap(filedata,options);
*/

/* FILE DATA TEMPLATE
filedata = [
	{
		"filepath":"",			// path to topo-json map file (pre-downloaded by user)
		"name":"",				// computer-safe reference name for map piece (no spaces, alphanumeric only)
		"label":"",				// human-readable name for map piece (spaces and any characters (escape quotes))
		"mrgid":"",				// numeric code used to connect map geometry to metadata
			// check GeoJSON file metadata! ALL features for a given area need *the same* mrgid (matching that provided here), or mismatched feature segments will not render
		"color":"#000000",		// OPTIONAL: hexadecimal reference for fill of map piece; defaults to "#FFFFFF" (white); ignored if a color scale is used (if options.useColorScale = true)
		"stroke":"#000000",		// OPTIONAL: hexadecimal reference for stroke (outline) of map piece; defaults to "#000000" (black)
		"link":"",				// OPTIONAL: URL of destination if map area is clicked; can be absolute or relative
		"adjustCenter":{		// OPTIONAL: declaration of how 'center' should be adjusted for the purposes of placing a handle on the map piece (use value of 0 for natural centroid placement)
			"rotate-{integer}":[cx,cy]	// adjustment values for a map centered on {integer} degrees longitude; used only when the options.rotate value matches the {integer}
		},
			// cx and cy are decimal values between -100 and 100
			// these are a numeric expression of 'percent of canvas size', i.e. (90,-4.3) = move 90% of canvas width right; move 4.3% of canvas height up
			// allows adjustment to account for different map sizes, rather than needing to be instance-specific
			// no checks prevent adjustments that move handle outside of viewport; reduce value if handle seems to not render	
		"scaleValues":[{		// OPTIONAL: array of objects used to color map area according to a color scale; each object represents a different count or statistic
			key: "",					// any computer-safe string (no spaces, alphanumeric only); must match the value provided in options.scaleValue
			value: #,					// an integer or decimal to be applied to a color scale to determine the fill of the map area
			label: ""					// human-readable name for the count/statistic used in the color scale; appears on the legend
		}]
	},{},{}
]
*/

/* OPTIONS TEMPLATE 
options = {
	target: ""					// ID of the DOM element where the map SVG should be placed
	width: integer				// OPTIONAL: width of the SVG canvas to be rendered (not necessarily of the contents on the SVG); default = 500
	height: integer				// OPTIONAL: height of the canvas to be rendered (not necessarily of the contents of the SVG); default = 1/2 width (250 if width is also default)
	handles: boolean 			// OPTIONAL: whether to render circular 'handle' points on each map piece (see adjustCenter notes in file object description); default = false
	rotate: integer (0-180)		// OPTIONAL: how many degrees longitude to rotate the map; default = 0
	addClass: ""				// OPTIONAL: class to add to each path and handle for additional styling options
	useColorScale: boolean		// OPTIONAL: whether to color the map using provided color values [false; default] (see color field in filedata above), or to apply a color scale based on a provided value [true] (see scaleValue option below)
	scaleName: ""				// name of the d3 color scale to use when rendering scale (e.g. "interpolatePurples"); required if options.useColorScale = true
	scaleValue: ""				// key from the scaleValues object in each file's metadata (see above) to use when calculating color scale; required if options.useColorScale = true
	unknownColor: "#000000"		// OPTIONAL: hexadecimal reference for the fill color to use if the value cannot be converted by the color scale; defaults to "#E1E1E1"
	legendHolder: ""			// ID of the DOM element where a legend should be placed; required if options.useColorScale = true, ignored if options.useColorScale = false
	selectFunction: function	// OPTIONAL: function to call on click event for a map path or handle; defaults to selectMapPiece(area)
		// selectMapPiece("areaClassName") should be called in provided function to retain built-in map piece selection functionality
	mouseoverFunction: function	// OPTIONAL: function to call on mouseover event for a map path or handle; defaults to highlightMapPiece(area,true)
		// highlightMapPiece("areaClassName",true) should be called in provided function to retain built-in map piece highlighting
	mouseoutFunction: function	// OPTIONAL: function to call on mouseout event for a map path or handle; defaults to highlightMapPiece(area,false)
		// highlightMapPiece("areaClassName",false) should be called in provided function to retain built-in map piece de-highlighting
	callback: function			// OPTIONAL: function that should be called once the map has rendered
}
*/
		
buildMap = function(filedata,options){
	//clear existing svg
	d3.select("#" + options.target).select("svg").remove();
	
	//set default values for options if not provided
	if(!options.width){ options.width = 500; }
	if(!options.height){ options.height = 1/2 * options.width; }
	if(!options.rotate){ options.rotate = 0; }
	if(!options.selectFunction){ options.selectFunction = function(){
		var area = d3.select(this).attr("area").split("-")[1];
		selectMapPiece(area);
	} }
	if(!options.mouseoverFunction){ options.mouseoverFunction = function(){
		var area = d3.select(this).attr("area").split("-")[1];
		highlightMapPiece(area,true);
	} }
	if(!options.mouseoutFunction){ options.mouseoutFunction = function(){
		var area = d3.select(this).attr("area").split("-")[1];
		highlightMapPiece(area,false);
	} }
	
	//build and attach svg canvas of declared size
	var svg = d3.select("#" + options.target).append("svg").attr("class","mapCanvas").attr("width",options.width).attr("height",options.height);
	
	//parse map data from files
	//iterate entire data set to determine key parameters (max value => color scale, map extent => projection)
	//create group for map paths, and for handles if required
	//create color scale if required
	//attach map paths
	//attach handles if required
	buildCollection(filedata).then(function(collection){
			var maxValue = 0;
			for(var i = 0; i < filedata.length; i++){
				if(options.useColorScale){
					var scale = filedata[i].scaleValues.find(el => el.name == options.scaleValue);
					if(scale.value > maxValue){ maxValue = scale.value; }
				}
				
			}
			
			var pg = svg.append("g");
			if(options.handles){ var hg = svg.append("g"); }
			
			if(options.useColorScale){
				options.colorScale = d3.scaleSequential([0, maxValue], d3[options.scaleName]);
				
				d3.select("#" + options.legendHolder).select("svg").remove();
				var legendHolder = d3.select("#" + options.legendHolder).append("svg");
				legend({
					color: options.colorScale,
					title: scale.label,
					target: options.legendHolder
				});
			}
			
			var featureCollection = {type:"FeatureCollection","features":[]}
			for(var i = 0; i < collection.length; i++){
				for(var j = 0; j < collection[i].features.length; j++){
					featureCollection.features.push(collection[i].features[j]);
				}
			}
			var projection = d3.geoEquirectangular().fitSize([options.width,options.height],featureCollection);
			projection.rotate([options.rotate,0,0]);
			var path = d3.geoPath().projection(projection);
			
			Promise.all([attachPaths(pg,path,options,filedata,featureCollection)]).then(function(){
				if(options.handles){ attachHandles(hg,pg.selectAll("path"),path,options,filedata); }
				if(options.callback){ options.callback(); }
			});
		});
}

// parse provided filedata into needed format using promise structure to ensure data is available before rendering map
buildCollection = function(filedata){
	var promises = [];
	var allMapData = [];

	filedata.forEach(function(file) {
		promises.push(d3.json(file.filepath))
	});

	return Promise.all(promises).then(function(mapData){
		for(var i = 0; i < mapData.length; i++){
			allMapData.push(mapData[i]);
		}
		
		return allMapData;
	});
}

// style and append paths to group
attachPaths = async function(g,path,options,filedata,fc){
	for(var i = 0; i < fc.features.length; i++){
		var metadata = filedata.find(el => el.mrgid == fc.features[i].properties.mrgid);
		var stroke = metadata.stroke ? metadata.stroke : "#000000";
		if(options.useColorScale){
			var scale = metadata.scaleValues.find(el => el.name == options.scaleValue);
			var color = isNaN(scale.value) ? options.unknownColor ? options.unknownColor : "#E1E1E1" : options.colorScale(scale.value);
			var stroke = "#000000";
		}else{
			var color = metadata.color ? metadata.color : "#FFFFFF";
		}
		
		g.append("path")
			.datum(fc.features[i])
			.attr("d",path)
			.attr("class",function(d){
				var classes = "mapPath area" + metadata.mrgid;
				if(metadata.selected == 1){ classes += " selected"; }
				if(options.addClass){ classes += " " + options.addClass; }
				return classes;
			})
			.attr("title",function(d){
				if(options.useColorScale){ return scale.value; }else{ return ""; }
			})
			.attr("area","path-area" + metadata.mrgid)
			.attr("label",metadata.label)
			.attr("center",function(d){
				return path.centroid(d);
			})
			.attr("fill",color)
			.attr("stroke",stroke)
			.on("mouseover",options.mouseoverFunction)
			.on("click", options.selectFunction)
			.on("mouseout", options.mouseoutFunction);
	}
}

// style and append handles to group
attachHandles = function(g,pathGroup,path,options,filedata){
	g.selectAll("circle")
		.data(filedata)
		.enter()
		.append("circle")
		.attr("area",function(d){
			return "handle-area" + d.mrgid;
		})
		.attr("class",function(d){
			var classes = "mapHandle handle-area" + d.mrgid;
			if(d.selected == 1){ classes += " selected"; }
			if(options.addClass){ classes += " " + options.addClass; }
			return classes;
		})
		.attr("r",8)
		.attr("cx", function(d){
			for(var j = 0; j < pathGroup.data().length; j++){
				var p = pathGroup.data()[j];
				if (p.properties.mrgid == d.mrgid){
					var t = path.centroid(p);
					d.x = t[0];
					d.y = t[1];
					var adjust = d.adjustCenter.find(el => el.rotation == options.rotate);
					d.x += adjust.cx * options.width/100;
					d.y += adjust.cy * options.height/100;

					return d.x;
				}
			}
		})
		.attr("cy", function(d){
			return d.y;
		})
		.on("mouseover",options.mouseoverFunction)
		.on("click", options.selectFunction)
		.on("mouseout", options.mouseoutFunction);	
}

// add or remove 'highlighted' class to specified map area
highlightMapPiece = function(area,toggle){
	d3.selectAll("." + area)
		.classed('highlighted', toggle);
	d3.select(".handle-" + area)
		.classed('highlighted', toggle);
}

// pop specified map area(s) to front of path group (by re-appending) to ensure clear borders
// add 'selected' class to specified map area and associated handle
selectMapPiece = function(area){
	deselectMapPieces();
	
	d3.selectAll("." + area)
		.each(function(){ this.parentNode.appendChild(this); })
		.classed("selected",true);
	d3.select(".handle-" + area)
		.classed("selected",true);
}

// remove 'selected' class from specified map area and associated handle
deselectMapPieces = function(){
	d3.selectAll("path")
		.classed("selected",false);
	d3.selectAll("circle")
		.classed("selected",false);
}

/*** Legend Code from https://observablehq.com/@d3/color-legend ***/
// modifications: added target parameter, used target size to determine width dynamically, increased default height
function legend({
  color,
  title,
  target,
  tickSize = 6,
  width = document.getElementById(target).offsetWidth,
  height = 94 + tickSize,
  marginTop = 18,
  marginRight = 0,
  marginBottom = 16 + tickSize,
  marginLeft = 0,
  ticks = width / 64,
  tickFormat,
  tickValues
} = {}) {
  const svg = d3.select("#" + target).select("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .style("overflow", "visible")
    .style("display", "block");

  let tickAdjust = g => g.selectAll(".tick line").attr("y1", marginTop + marginBottom - height);
  let x;

  // Continuous
  if (color.interpolate) {
    const n = Math.min(color.domain().length, color.range().length);

    x = color.copy().rangeRound(d3.quantize(d3.interpolate(marginLeft, width - marginRight), n));

    svg.append("image")
      .attr("x", marginLeft)
      .attr("y", marginTop)
      .attr("width", width - marginLeft - marginRight)
      .attr("height", height - marginTop - marginBottom)
      .attr("preserveAspectRatio", "none")
      .attr("xlink:href", ramp(color.copy().domain(d3.quantize(d3.interpolate(0, 1), n))).toDataURL());
  }

  // Sequential
  else if (color.interpolator) {
    x = Object.assign(color.copy()
      .interpolator(d3.interpolateRound(marginLeft, width - marginRight)), {
        range() {
          return [marginLeft, width - marginRight];
        }
      });

    svg.append("image")
      .attr("x", marginLeft)
      .attr("y", marginTop)
      .attr("width", width - marginLeft - marginRight)
      .attr("height", height - marginTop - marginBottom)
      .attr("preserveAspectRatio", "none")
      .attr("xlink:href", ramp(color.interpolator()).toDataURL());

    // scaleSequentialQuantile doesn’t implement ticks or tickFormat.
    if (!x.ticks) {
      if (tickValues === undefined) {
        const n = Math.round(ticks + 1);
        tickValues = d3.range(n).map(i => d3.quantile(color.domain(), i / (n - 1)));
      }
      if (typeof tickFormat !== "function") {
        tickFormat = d3.format(tickFormat === undefined ? ",f" : tickFormat);
      }
    }
  }

  // Threshold
  else if (color.invertExtent) {
    const thresholds = color.thresholds ? color.thresholds() // scaleQuantize
      :
      color.quantiles ? color.quantiles() // scaleQuantile
      :
      color.domain(); // scaleThreshold

    const thresholdFormat = tickFormat === undefined ? d => d :
      typeof tickFormat === "string" ? d3.format(tickFormat) :
      tickFormat;

    x = d3.scaleLinear()
      .domain([-1, color.range().length - 1])
      .rangeRound([marginLeft, width - marginRight]);

    svg.append("g")
      .selectAll("rect")
      .data(color.range())
      .join("rect")
      .attr("x", (d, i) => x(i - 1))
      .attr("y", marginTop)
      .attr("width", (d, i) => x(i) - x(i - 1))
      .attr("height", height - marginTop - marginBottom)
      .attr("fill", d => d);

    tickValues = d3.range(thresholds.length);
    tickFormat = i => thresholdFormat(thresholds[i], i);
  }

  // Ordinal
  else {
    x = d3.scaleBand()
      .domain(color.domain())
      .rangeRound([marginLeft, width - marginRight]);

    svg.append("g")
      .selectAll("rect")
      .data(color.domain())
      .join("rect")
      .attr("x", x)
      .attr("y", marginTop)
      .attr("width", Math.max(0, x.bandwidth() - 1))
      .attr("height", height - marginTop - marginBottom)
      .attr("fill", color);

    tickAdjust = () => {};
  }

  svg.append("g")
    .attr("transform", `translate(0,${height - marginBottom})`)
    .call(d3.axisBottom(x)
      .ticks(ticks, typeof tickFormat === "string" ? tickFormat : undefined)
      .tickFormat(typeof tickFormat === "function" ? tickFormat : undefined)
      .tickSize(tickSize)
      .tickValues(tickValues)
    )
    .call(tickAdjust)
    .call(g => g.select(".domain").remove())
    .call(g => g.append("text")
      .attr("x", marginLeft)
      .attr("y", marginTop + marginBottom - height - 6)
      .attr("fill", "currentColor")
      .attr("text-anchor", "start")
      .attr("font-weight", "bold")
      .text(title)
    );

  return svg.node();
}

function ramp(color, n = 256) {
  var canvas = document.createElement('canvas');
  canvas.width = n;
  canvas.height = 1;
  const context = canvas.getContext("2d");
  for (let i = 0; i < n; ++i) {
    context.fillStyle = color(i / (n - 1));
    context.fillRect(i, 0, 1, 1);
  }
  return canvas;
}
