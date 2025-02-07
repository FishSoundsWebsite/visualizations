/* REQUIRED EXTERNAL LIBRARIES
	<script src="https://d3js.org/d3.v7.min.js" charset="utf-8"></script>
	<script src="https://cdn.jsdelivr.net/gh/holtzy/D3-graph-gallery@master/LIB/d3.layout.cloud.js"></script>
*/

/* CORE FUNCTION
buildChart(chartData,params);
*/

/*
chartData = [{},{},{}]		// an array of data objects with keys referenced in the params (primaryKey, secondaryKey, colorKey, sortKey) and values suitable for rendering on a chart (i.e. the same values appear in multiple objects resulting in categories with various counts)
							// fields not referenced in any of the params keys will be ignored
Examples:
primaryKey = "country" -- [{country: "Canada"}, {country: "United States"}, {country: "Canada"}, {country: "Mexico"}]
primaryKey = "class"; secondaryKey = "subclass" -- [{class: "A", subclass: "i"}, {class: "A", subclass:"ii"}, {class: "B", subclass: "i"}, {class: "A", subclass: "i"}], {class: "B", subclass: "ii"}
primaryKey = "region"; colorKey = "country" -- [{country: "Canada", region: "Alberta"}, {country: "United States", region: "Michigan"}, {country: "Canada", region: "Nova Scotia"}, {country: "Mexico", region: "Yucatan"}, {country: "Canada", region: "Alberta"}]

params = {
*** Core Options ***
	chartType: "pie"|"circle"|"bubble"|"cloud"|"column"|"grouped"|"histogram"	-- kind of chart to render; defaults to "column"; "circle" and "bubble" are synonymous
	primaryKey: "chartDataField"												-- (required) key in chartData objects to use for main categorization
	stacked: boolean															-- used only for "column" and "histogram" chart types; whether to segment columns by a secondary variable; defaults to false
	secondaryKey: "chartDataField"												-- required for "grouped" chart type or if stacked option is true; key in chartData objects to use for stack segmentation

*** Labelling Options ***
	title: ""					-- (optional) label appearing at top of chart
	xAxisLabel:	""				-- required for "column", "grouped" and "histogram" chart types; label for x-axis
	yAxisLabel:	""				-- required for "column", "grouped" and "histogram" chart types; label for y-axis

*** SVG Styling Options ***
	width = #					-- width of viewport and svg; defaults to 1000
	height = #					-- height of viewport and svg; defaults to 500
	marginTop = #				-- space on top of svg; defaults to 20
	marginRight = #				-- space on right of svg; defaults to 20
	marginBottom = #			-- space on bottom of svg; defaults to 20
	marginLeft = #				-- space on left of svg; defaults to 20
	
*** Chart Styling Options ***	
	sortKey: "chartDataField"						-- used only for "column" and "grouped" chart types; key in chartData objects to use for sorting the columns
	colorKey: "chartDataField"						-- used only for "circle" and (non-stacked) "column" chart types; key in chartData objects to use for determining color of chart sections from color scale; for "pie" chart type, coloration is based on the primaryKey value; for "grouped" chart type and "column" or "histogram" chart types where stacked is true, coloration is based on the secondaryKey value
	colorScale: "BYR"|"multi"|"greys"|"viridis"		-- which color scale to use; defaults to BYR (blue-yellow-red)
	maxWords: #										-- used only for "cloud" chart type; maximum number of words to render
	threshold: #									-- used only for "histogram" chart type; maximum number of categories to split the data across

*** Legend Styling Options ***
	legendType = "internal"|"external"							-- whether the legend should appear in the chart ("internal"; default) or in another svg space ("external")
	legendPosition = "left"|"center"|"right" OR "targetId"		-- for "internal" legend type, where on the chart it is placed (default is "right"); for "external" legend type, the ID of the DOM element where an SVG containing the legend should be placed
	legendWidth = #												-- width of legend; defaults to 100
	legendHeight = #											-- height of legend; defaults to 250
	legendTitle = ""											-- title to appear at the top of the legend; will be prefaced by "Legend - "
	altLabels = {"chartDataValue": "displayValue"}				-- an object listing alternative label(s) to be used for a data field in the legend (e.g. {"dataType-1": "First Category","dataType-2": "Second Category"})
 }
*/

function buildChart(chartData,params = {}){
	// Set options according to provided params or default values
	var width = params.width ? params.width : 1000;
	var height = params.height ? params.height : 500;
	var marginTop = params.marginTop ? params.marginTop : 20;
	var marginRight = params.marginRight ? params.marginRight : 20;
	var marginBottom = params.marginBottom ? params.marginBottom : 20;
	var marginLeft = params.marginLeft ? params.marginLeft : 20;
	
	var legendType = params.legendType ? params.legendType : "internal";
	var legendPosition = params.legendPosition ? params.legendPosition : "right";
	var legendWidth = params.legendWidth ? params.legendWidth : 100;
	var legendHeight = params.legendHeight ? params.legendHeight : 250;
	var legendTitle = params.legendTitle ? "Legend - " + params.legendTitle : "";
	var altLabels = params.altLabels ? params.altLabels : {};
		
	// Build a color scale
	const colorScales = {
		"BYR":["#2a4969","#4575b4","#74add1","#abd9e9","#e0f3f8","#fee090","#fdae61","#f46d43","#d73027","#a50026"],
		"multi":["#1f77b4","#ff7f0e","#2ca02c","#d62728","#9467bd","#8c564b","#e377c2","#7f7f7f","#bcbd22","#17becf"],
		"greys":["#000000","#333333","#474747","#686868","#878787","#a7a7a7","#c6c6c6","#d3d3d3","#dfdfdf","#ededed"],
		"viridis":["#440154","#482878","#3e4989","#31688e","#26828e","#1f9e89","#35b779","#6ece58","#b5de2b","#fde725"]
	};
	const colorScale = params.colorScale ? colorScales[params.colorScale] : colorScales["BYR"];
	const color = d3.scaleOrdinal()
		.unknown("#ccc");
		
	// Create the SVG container.
	const svg = d3.create("svg")
		.attr("width", width)
		.attr("height", height)
		.attr("viewBox", [0, 0, width, height])
		.attr("style", "max-width: 100%; height: auto;");
	
	// Attach title to SVG if one was provided
	if(params.title){
		svg.append("g")
			.selectAll()
			.data([params.title])
			.join("text")
				.attr("fill", "currentColor")
				.attr("x", width / 2)
				.attr("y", 15)
				.attr("text-anchor", "middle")
				.attr("text-decoration","underline")
				.style("font-size", "16px")
				.text(d => d);
		
		marginTop += 20;
	}
	
	// Build and attach an legend to the chart or alternative location based on provided options
	function addLegend(keys){
		// Legend embedded in chart
		if(legendType == "internal"){
			switch(legendPosition){
				case "left":
					var translate = "translate(" + marginLeft + "," + marginTop + ")";
					break;
				case "center":
					var translate = "translate(" + (width - legendWidth)/2 + "," + marginTop + ")";
					break;
				case "right":
				default:
					var translate = "translate(" + (width - legendWidth) + "," + marginTop + ")";
					break;
			}
		
			var legendTitleHolder = svg.append("g")
							.attr("width",legendWidth)
							.attr("transform", translate)
							.selectAll(".legendTitle")
							.data([legendTitle])
							.join((enter) => {
								let g = enter;
							
								g.append("text")
									.attr("y", 10)
									.style("font-size", "1rem")
									.text(d => d);
							});

			var legend = svg.append("g")
							.attr("width",legendWidth)
							.attr("height",legendHeight)
							.attr("transform", translate)
							.selectAll()
							.data(keys)
							.join((enter) => {
								let g = enter;

								g.append("rect")
									.attr("fill", (d) => color(d))
									.attr("x", 5)
									.attr("width", 10)
									.attr("y", (d,i) => (i * 15) + 20)
									.attr("height", 10);
	
								g.append("text")
									.attr("x", 20)
									.attr("y", (d,i) => (i * 15) + 28)
									.style("font-size", "0.75rem")
									.text((d) => altLabels[d] ? altLabels[d] : d);
							});
		// Legend in own container
		}else{
			var legendHolder = document.getElementById(legendPosition);
			var legendSVG = d3.create("svg")
					.attr("width",legendWidth);
			
			legendSVG.append("g")
				.selectAll(".legendTitle")
				.data([legendTitle])
				.join((enter) => {
					let g = enter;
				
					g.append("text")
					.attr("y", 15)
					.style("font-size", "1rem")
					.text(d => d);
				});

			legendSVG.append("g")
				.selectAll()
				.data(keys)
				.join((enter) => {
					let g = enter;

					g.append("rect")
						.attr("fill", (d) => color(d))
						.attr("x", 5)
						.attr("width", 15)
						.attr("y", (d,i) => (i * 20) + 25)
						.attr("height", 15);

					g.append("text")
						.attr("x", 25)
						.attr("y", (d,i) => (i * 20) + 38)
						.style("font-size", "0.75rem")
						.text((d) => altLabels[d] ? altLabels[d] : d);
				});
		
			legendHolder.innerHTML = "";
			legendHolder.append(legendSVG.node());
			var legendContentWidth = legendSVG.node().getBBox().width;
			var legendContentHeight = legendSVG.node().getBBox().height;
			legendSVG.attr("height",legendContentHeight);
			legendSVG.selectAll("g").attr("transform","translate(" + (legendWidth - legendContentWidth)/2 + ",0)");
		}
	}
	
	// Display an info box with provided content at provided location on chart				
	function showDetails(translateX,translateY,content,targetElement){
		if(!Array.isArray(content)){ content = [content]; }
		if(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    		var backgroundColor = "black";
    		var textColor = "white";
    	}else{
    		var backgroundColor = "white";
    		var textColor = "black";
    	}
	
		var infoBox = d3.select(".infoBox");

		infoBox.selectAll()
			.data(content)
			.join("text")
				.attr("font-size", "10px")
				.attr("y",(d,i) => i * -10)
				.text((d) => d);
		
		let bbox = infoBox.node().getBBox();
		var rectWidth = bbox.width + 4;
		var rectHeight = bbox.height + 2;
		var rectX = bbox.x - (bbox.width/2) - 1;
		var rectY = bbox.y - 1;
				
		infoBox.selectAll()
			.data(content)
			.join("rect")
				.attr("fill", backgroundColor)
				.attr("width", rectWidth)
				.attr("height", rectHeight)
				.attr("x", rectX)
				.attr("y", rectY);
		
		infoBox.selectAll("text")
			.remove();	
		
		infoBox.selectAll()
			.data(content)
			.join("text")
				.style("fill", textColor)
				.attr("text-anchor", "middle")
				.attr("font-size", "10px")
				.attr("y",(d,i) => i * -10)
				.text((d) => d);
		
		if((translateX + rectX + rectWidth) > (width - marginRight)){ translateX = width - (rectWidth/2); }
		if(translateX < 0){ translateX = rectWidth/2; }
		if((translateY - rectHeight) < 0){ translateY = rectHeight; }
		
		infoBox.attr("transform", "translate(" + translateX + "," + translateY + ")");
		
		if(targetElement){		
			d3.selectAll(targetElement)
				.attr("stroke","currentColor")
				.attr("stroke-width",3);
		}
	}
	
	// Remove info box
	function hideDetails(targetElement){
		d3.select(".infoBox")
			.attr("width",0)
			.attr("height",0)
			.attr("transform", "translate(0,0)")
			.selectAll("text")
				.remove();
				
		d3.select(".infoBox")
			.selectAll("rect")
				.remove();
		
		if(targetElement){			
			d3.selectAll(targetElement)
				.attr("stroke","none")
				.attr("stroke-width",0);
		}
	}
	
	// Build chart based on provided type
	switch(params.chartType){
		case "pie":
			// Convert chartData into required format	
			var pieData = [];
			for(var i = 0; i < chartData.length; i++){
				var existingObject = pieData.find(({label}) => label === chartData[i][params.primaryKey]);
				if(existingObject){
					existingObject.count++;
				}else{
					var obj = {label:chartData[i][params.primaryKey],count:1};
					pieData.push(obj);
				}
			}

			// Create the pie layout and arc generator.
			const pie = d3.pie()
				.sort((a,b) => d3.descending(a.count,b.count) || d3.ascending(a.label,b.label))
				.value(d => d.count);

			const arc = d3.arc()
				.innerRadius(0)
				.outerRadius(Math.min(width - marginLeft - marginRight, height - marginTop - marginBottom) / 2 - 1);

			const labelRadius = arc.outerRadius()() * 0.8;

			// A separate arc generator for labels.
			const arcLabel = d3.arc()
				.innerRadius(labelRadius)
				.outerRadius(labelRadius);
			
			// Set colors of segments
			var colorKeys = Array.from(new Set(chartData.map(d => d[params.primaryKey])));
			colorKeys.sort((a,b) => d3.descending(pieData.find(d => d.label == a).count,pieData.find(d => d.label == b).count) || d3.ascending(a,b));
			var range = [];
			for(var i = 0; i < colorKeys.length; i++){
				range.push(colorScale[Math.floor((colorScale.length/colorKeys.length) * i)]);
			}
			color.range(range)
			color.domain(colorKeys);

			const arcs = pie(pieData);

			// Add a sector path for each value.
			var pieSegments = svg.append("g")
				.attr("transform", "translate(" + width/2 + "," + height/2 + ")")
				.selectAll()
				.data(arcs)
				.join("path")
					.attr("fill", d => color(d.data.label))
					.attr("id", (d,i) => "pieSegment-" + i)
					.attr("class", (d,i) => d.endAngle - d.startAngle < 0.03 ? "pieSegment-other" : "")
					.attr("d", arc);

			// Display label and value in segment if there is room
			svg.append("g")
				.attr("text-anchor", "middle")
				.selectAll()
				.data(arcs)
				.join("text")
					.attr("transform", d => "translate(" + (width/2 + arcLabel.centroid(d)[0]) + "," + (height/2 + arcLabel.centroid(d)[1]) + ")")
					.call(text => text.filter(d => (d.endAngle - d.startAngle) > 0.25).append("tspan")
						.attr("y", "-0.4em")
						.attr("font-weight", "bold")
						.attr("fill", "white")
						.text(d => d.data.label)
					)
					.call(text => text.filter(d => (d.endAngle - d.startAngle) > 0.25).append("tspan")
						.attr("x", 0)
						.attr("y", "0.7em")
						.attr("fill-opacity", 0.7)
						.attr("fill", "white")
						.text(d => d.data.count.toLocaleString("en-US"))
					);
			
			// Create collective 'other' popup for very small segments that appears if any are targeted
			var otherPopup = [];
			for(var i = 0; i < arcs.length; i++){
				if(arcs[i].endAngle - arcs[i].startAngle < 0.03){
					otherPopup.push(arcs[i].data.label + " - " + arcs[i].data.count);
				};
			}	
			
			// Trigger info popups when a segment is targeted
			pieSegments.on("mouseover", function(event,d){
						var popupInfo = d.endAngle - d.startAngle < 0.03 ? otherPopup : d.data.label + " - " + d.data.count;
						var targetSegment = d.endAngle - d.startAngle < 0.03 ? ".pieSegment-other" : "#" + event.target.id;
						showDetails(width/2,height/2,popupInfo,targetSegment)
					})
					.on("mouseout", function(event,d){
						var targetSegment = d.endAngle - d.startAngle < 0.03 ? ".pieSegment-other" : "#" + event.target.id;
						hideDetails(targetSegment);
					});
			
			// Add a legend
			addLegend(colorKeys);
			break;
		
		case "circle":
		case "bubble":
			// Convert chartData into required format
			var bubbleData = [];
			for(var i = 0; i < chartData.length; i++){
				var existingObject = bubbleData.find(({label}) => label === chartData[i][params.primaryKey]);
				if(existingObject){
					existingObject.count++;
				}else{
					var obj = {label:chartData[i][params.primaryKey],count:1};
					if(params.colorKey){ obj.color = chartData[i][params.colorKey] }
					bubbleData.push(obj);
				}
			}
			
			// Color bubbles if required
			if(params.colorKey){
				var colorKeys = Array.from(new Set(chartData.map(d => d[params.colorKey])));
				colorKeys.sort();
				var range = [];
				for(var i = 0; i < colorKeys.length; i++){
					range.push(colorScale[Math.floor((colorScale.length/colorKeys.length) * i)]);
				}
				color.range(range)
				color.domain(colorKeys);
			}
			
			// Define bubble pack for data
			const pack = d3.pack()
				.size([width - marginLeft - marginRight, height - marginTop - marginBottom])
				.padding(15);
				
			const root = pack(d3.hierarchy({children: bubbleData})
				.sum(d => d.count));
			
			// Style SVG to accommodate bubble labels	
			svg.attr("style", "max-width: 100%; height: auto; font: 12px sans-serif;")
				.attr("text-anchor", "middle");
				
			// Place each (leaf) node according to the layout’s x and y values
			const node = svg.append("g")
				.selectAll()
				.data(root.leaves())
				.join("g")
				.attr("transform", d => "translate(" + d.x + "," + (d.y + marginTop) + ")");

			// Add a popup title to each node
			node.append("title")
				.text(d => d.data.label + " - " + d.data.count);

			// Add a filled circle
			node.append("circle")
				.attr("fill-opacity", 0.7)
				.attr("fill", function(d){ return d.data.color ? color(d.data.color) : "#2a4969" })
				.attr("r", d => d.r + 5);

			// Add a text holder
			const text = node.append("text")
				.style("fill","white")
				.attr("clip-path", d => "circle(" + (d.r + 5) + ")");

			// Add a tspan for node's label
			text.selectAll()
				.data(d => d)
				.join("tspan")
				.attr("x", 0)
				.attr("y", 0)
				.text(d => d.data.label);

			// Add a tspan for the node’s value
			text.append("tspan")
				.attr("x", 0)
				.attr("y", "1em")
				.attr("fill-opacity", 0.7)
				.text(d => d.data.count);
			
			// Add a legend if colors were used	
			if(params.colorKey){
				addLegend(colorKeys);
			}
				
			break;
		
		case "cloud":
			// Convert chartData into required format
			var cloudData = [];
			for(var i = 0; i < chartData.length; i++){
				cloudData.push(chartData[i][params.primaryKey]);
			}
			
			// Set chart-specific parameters
			var maxWords = params.maxWords ? params.maxWords : 100;
			const size = group => group.length;
			const word = d => d;
			const padding = 4;
			const rotate = 0;
			const fontScale = 15;
			const fontFamily = "sans-serif";
			const fill = null;
			let invalidation;
			
			// Determine word sets and sizes
			const rollup = d3.rollups(cloudData, size, w => w);
			const data = rollup.sort(([, a], [, b]) => d3.descending(a, b))
				.slice(0, maxWords)
				.map(([key, size]) => ({text: word(key), size}));
				
			
			// Plot the word cloud onto the SVG via a group (adapted from https://d3-graph-gallery.com/graph/wordcloud_basic.html)
			const g = svg.append("g").attr("transform", "translate(" + ((width/2) + marginLeft) + "," + ((height/2) + marginTop + 15) + ")");

			const cloud = d3.layout.cloud()
				.size([width - marginLeft - marginRight, height - marginTop - marginBottom - 15])
				.words(data)
				.padding(padding)
				.rotate(rotate)
				.text(d => d.text)
				.font(fontFamily)
				.fontSize(d => Math.sqrt(d.size) * fontScale)
				.on("end", draw)
				.start();
				
			function draw(words) {
				var text = g.selectAll("text")
					.data(words)
					.enter().append("text")
					.style("font-size", function(d){ return d.size + "px" })		// d => d.size + "px")
					.attr("text-anchor", "middle")
					.attr("transform", d => "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")")
					.text(d => d.text)
					.on("mouseover", function(d){
						d3.select(event.currentTarget)
							.style("fill", "#2a4969");
					})
					.on("mouseout", function(d){
						d3.select(event.currentTarget)
							.style("fill", null);
					});
					
				text.append("title")
					.text(d => d.text + " - " + rollup.find((el) => el[0] == d.text)[1]);
			}
				
			invalidation && invalidation.then(() => cloud.stop());
			
			break;
			
		case "column":
			// Determine values that exist in chartData for the provided primaryKey field
			var keys = [];
			chartData.forEach(function(d){ if(!keys.includes(d[params.primaryKey])){keys.push(d[params.primaryKey])} });
			
			// Convert chartData into array of data objects for each value determined above	
			var bins = [];
			for(var i = 0; i < keys.length; i++){
				var obj = {contents:[]};
				obj[params.primaryKey] = keys[i];
				for(var j = 0; j < chartData.length; j++){
					if(chartData[j][params.primaryKey] == keys[i]){
						if(params.sortKey){ obj.sort = chartData[j][params.sortKey]; }
						if(params.colorKey){ obj.color = chartData[j][params.colorKey]; }
						obj.contents.push(chartData[j]);
					}
				}
				bins.push(obj);
			}
			
			// Sort the array of data based on provided sortKey or by count of values
			if(params.sortKey){
				bins.sort(function(a,b){ return a.sort > b.sort ? 1 : a.sort < b.sort ? -1 : a[params.primaryKey] > b[params.primaryKey] ? 1 : a[params.primaryKey] < b[params.primaryKey] ? -1 : 0 })
			}else{
				bins.sort(function(a,b){ return a.contents.length < b.contents.length ? 1 : a.contents.length > b.contents.length ? -1  : a[params.primaryKey] > b[params.primaryKey] ? 1 : a[params.primaryKey] < b[params.primaryKey] ? -1 : 0 })
			}
			
			// Update color scale based on the determined keys
			if(params.colorKey){
				var colorKeys = Array.from(new Set(bins.map(d => d.color)));
				var range = [];
				for(var i = 0; i < colorKeys.length; i++){
					range.push(colorScale[Math.floor((colorScale.length/colorKeys.length) * i)]);
				}
				color.range(range)
				color.domain(colorKeys);
			}

			// Declare the x (horizontal position) scale.
			var x = d3.scaleBand()
				.domain(bins.map((d) => d[params.primaryKey]))
				.range([marginLeft, width - marginRight])
				.padding(0.1);

			// Declare the y (vertical position) scale.
			var y = d3.scaleLinear()
				.domain([0, d3.max(bins, (d) => d.contents.length)])
				.range([height - marginBottom, marginTop]);

			// Add a rect for each bin.			
			var rects = svg.append("g")
				.selectAll()
				.data(bins)
				.join("rect")
					.attr("id",(d,i) => "rect-" + i)
					.attr("fill", function(d){ return d.color ? color(d.color) : "#2a4969" })
					.attr("x", (d) => x(d[params.primaryKey]))
					.attr("width", x.bandwidth())
					.attr("y", (d) => y(d.contents.length))
					.attr("height", (d) => y(0) - y(d.contents.length));
						
			// Add the x-axis and label.
			svg.append("g")
				.attr("transform", "translate(0," + (height - marginBottom) + ")")
				.call(d3.axisBottom(x).tickSizeOuter(0))
				.selectAll("text")  
				.style("text-anchor", function(d,i,arr){ return arr.length > 10 ? "end" : "middle" })
				.attr("dx", function(d,i,arr){ return arr.length > 10 ? "-.8em" : "" })
				.attr("dy", function(d,i,arr){ return arr.length > 10 ? ".15em" : ".65em" })
				.attr("transform", function(d,i,arr){ return arr.length > 10 ? "rotate(-65)" : "" });
			
			svg.call((g) => g.append("text")
				.attr("transform", "translate(0," + (height - marginBottom) + ")")
				.attr("x", width)
				.attr("y", marginBottom - 4)
				.attr("fill", "currentColor")
				.attr("font-size","10px")
				.attr("text-anchor", "end")
				.text(params.xAxisLabel)
			);

			// Add the y-axis and label, and remove the domain line.
			svg.append("g")
				.attr("transform", "translate(" + marginLeft + ",0)")
				.call(d3.axisLeft(y).ticks(height / 40))
				.call((g) => g.select(".domain").remove())
				.call((g) => g.append("text")
					.attr("x", -marginLeft)
					.attr("y", 10)
					.attr("fill", "currentColor")
					.attr("text-anchor", "start")
					.text(params.yAxisLabel)
				);
			
			// If stacked option selected, add additional rects over each column rect to segment by provided secondaryKey value	
			if(params.stacked){
				// Determine values that exist in chartData for the provided secondaryKey field
				var stackKeys = [];
				chartData.forEach(function(d){ if(!stackKeys.includes(d[params.secondaryKey])){stackKeys.push(d[params.secondaryKey])} });

				// Convert data bins (created above) into an array of objects for each secondaryKey
				// Track number of objects per secondaryKey category for sorting
				var stackData = [];
				var stackOrder = {};
				for(var bin in bins){
					var pushableObject = {};

					// set x values for stack segments based on bin position
					pushableObject.x0 = x(bins[bin][params.primaryKey]);
					pushableObject.binLabel = bins[bin][params.primaryKey];

					bins[bin].contents.forEach(function(d){
						// push each data row into correct stack bucket, making bucket first if needed
						if(!pushableObject[d[params.secondaryKey]]){
							pushableObject[d[params.secondaryKey]] = [d]
						}else{
							pushableObject[d[params.secondaryKey]].push(d);
						}
						// count total number of items in each stack bucket across all bins
						if(!stackOrder[d[params.secondaryKey]]){
							stackOrder[d[params.secondaryKey]] = 1;
						}else{
							stackOrder[d[params.secondaryKey]]++;
						}
					});
					// if any of the keys not present in bin, make empty bucket for the stack
					stackKeys.forEach(function(key){
						if(!pushableObject[key]){
							pushableObject[key] = [];
						}
					});

					stackData.push(pushableObject);
				}

				// Sort the stackKeys based on the stackOrder counts determined above (arranges stack segments from most common at bottom to least common at top)
				stackKeys.sort(function(a,b){ return stackOrder[a] < stackOrder[b] ? 1 : stackOrder[a] > stackOrder[b] ? -1 : a > b ? 1 : a < b ? -1 : 0; })
				
				// Update color scale based on stackKeys
				var range = [];
				for(var i = 0; i < stackKeys.length; i++){
					range.push(colorScale[Math.floor((colorScale.length/stackKeys.length) * i)]);
				}
				color.range(range)
				color.domain(stackKeys);
				
				// Add a rect for each stack piece
				for(var i = 0; i < stackKeys.length; i++){	
					var stackedRects = svg.append("g")
						.attr("fill", color(stackKeys[i]))
						.selectAll()
						.data(stackData)
						.join("rect")
							.attr("x", (d) => d.x0)
							.attr("width", x.bandwidth())
							.attr("y", function(d){
								var sum = 0;
								for(var j = 0; j < i; j++){
									sum += d[stackKeys[j]].length;
								}
								return y(d[stackKeys[i]].length + sum)
							})
							.attr("height", (d) => y(0) - y(d[stackKeys[i]].length));
				}
				
				// Add lanes for each column that trigger data detail popup
				var lanes = svg.append("g")
					.selectAll()
					.data(stackData)
					.join("rect")
						.attr("id",(d,i) => "section-" + i)
						.attr("fill","none")
						.attr("pointer-events","visible")
						.attr("x", (d) => x(d["binLabel"]))
						.attr("width", x.bandwidth())
						.attr("y", marginTop)
						.attr("height", height - marginTop - marginBottom)
						.on("mouseover", function(event,d){
							var total = 0;
							var dataSummary = [];
							for(var i = 0; i < stackKeys.length; i++){
								if(d[stackKeys[i]].length != 0){
									total += d[stackKeys[i]].length;
									dataSummary.push(stackKeys[i] + " - " + d[stackKeys[i]].length);
								}
							}
							dataSummary.push("Total - " + total);
							showDetails((x(d["binLabel"]) + (x.bandwidth()/2)),(y(total) - 5),dataSummary,"#rect-" + event.target.id.split("-")[1])
						})
						.on("mouseout", (event,d) => hideDetails("#rect-" + event.target.id.split("-")[1]));
				
				// Add legend based on stackKeys
				addLegend(stackKeys);
			}else{
			// Add lanes for each column that trigger data detail popup		
				var lanes = svg.append("g")
					.selectAll()
					.data(bins)
					.join("rect")
						.attr("id",(d,i) => "section-" + i)
						.attr("fill","none")
						.attr("pointer-events","visible")
						.attr("x", (d) => x(d[params.primaryKey]))
						.attr("width", x.bandwidth())
						.attr("y", marginTop)
						.attr("height", height - marginTop - marginBottom)
						.on("mouseover", (event,d) => showDetails((x(d[params.primaryKey]) + (x.bandwidth()/2)),(y(d.contents.length) - 5),d.contents.length,"#rect-" + event.target.id.split("-")[1]))
						.on("mouseout", (event,d) => hideDetails("#rect-" + event.target.id.split("-")[1]));
				
				// Add legend in colorKey was provided
				if(params.colorKey){
					addLegend(colorKeys);
				}
			}
			break;
			
		case "grouped":
			// Convert chartData into required format
			var groupedData = [];
			for(var i = 0; i < chartData.length; i++){
				var bucket = groupedData.find((d) => d[params.primaryKey] == chartData[i][params.primaryKey] && d[params.secondaryKey] == chartData[i][params.secondaryKey]);
				if(!bucket){
					var obj = {};
					obj[params.primaryKey] = chartData[i][params.primaryKey];
					obj[params.secondaryKey] = chartData[i][params.secondaryKey];
					obj["count"] = 1;
					if(params.sortKey){ obj.sort = chartData[i][params.sortKey]; }
					groupedData.push(obj);
				}else{
					bucket.count++;
				}
			}
			
			// Sort data array based on provided sortKey or primaryKey
			if(params.sortKey){
				groupedData.sort(function(a,b){ return a.sort > b.sort ? 1 : a.sort < b.sort ? -1 : a[params.primaryKey] > b[params.primaryKey] ? 1 : a[params.primaryKey] < b[params.primaryKey] ? -1 : 0 })
			}
			
			// Determine set of values from data for provided primaryKey
			const groupKeys = new Set(groupedData.map(d => d[params.primaryKey]));
			
			// Calculate spacing on chart for each group
			const fx = d3.scaleBand()
				.domain(groupKeys)
				.rangeRound([marginLeft, width - marginRight])
				.paddingInner(0.1);
			
			// Determine the set of columns (based on provided secondaryKey)	
			const columns = new Set(groupedData.sort(function(a,b){ return a.count < b.count ? 1 : -1 }).map(d => d[params.secondaryKey]));
			
			// Update color scale based on set of columns determined above
			var range = [];
			for(var i = 0; i < Array.from(columns).length; i++){
				range.push(colorScale[Math.floor((colorScale.length/Array.from(columns).length) * i)]);
			}
			color.range(range)
			color.domain(columns);

			
			// Calculate position of each column within each group
			var x = d3.scaleBand()
				.domain(columns)
				.rangeRound([0, fx.bandwidth()])
				.padding(0.05);

			// Calculate y-scale based on largest column
			var y = d3.scaleLinear()
				.domain([0, d3.max(groupedData, d => d.count)])
				.rangeRound([height - marginBottom, marginTop]);
			
			// Define groups and attach to SVG
			var groups = d3.group(groupedData, d => d[params.primaryKey]);
				
			var groupRects = svg.append("g")
				.selectAll()
				.data(groups)
				.join("g")
					.attr("id", (d,i) => "group-" + i)
					.attr("transform", ([gk]) => "translate(" + fx(gk) + ",0)");
			
			// Attach column rects to each group
			var rects = groupRects.selectAll()
				.data(([, d]) => d)
				.join("rect")
				.attr("x", d => x(d[params.secondaryKey]))
				.attr("y", d => y(d.count))
				.attr("width", x.bandwidth())
				.attr("height", d => y(0) - y(d.count))
				.attr("fill", d => color(d[params.secondaryKey]));

			// Append the horizontal axis and label
			svg.append("g")
				.attr("transform", "translate(0," + (height - marginBottom) + ")")
				.call(d3.axisBottom(fx).tickSizeOuter(0).tickSizeInner(0))
				.call(g => g.selectAll(".domain").remove())
				.selectAll("text")  
				.style("text-anchor", function(d,i,arr){ return arr.length > 10 ? "end" : "middle" })
				.attr("dx", function(d,i,arr){ return arr.length > 10 ? "-.8em" : "" })
				.attr("dy", function(d,i,arr){ return arr.length > 10 ? ".15em" : ".65em" })
				.attr("transform", function(d,i,arr){ return arr.length > 10 ? "rotate(-65)" : "" });
				
			svg.call((g) => g.append("text")
				.attr("transform", "translate(0," + (height - marginBottom) + ")")
				.attr("x", width)
				.attr("y", marginBottom - 4)
				.attr("fill", "currentColor")
				.attr("font-size","10px")
				.attr("text-anchor", "end")
				.text(params.xAxisLabel)
			);

			// Append the vertical axis and label
			svg.append("g")
				.attr("transform", `translate(${marginLeft},0)`)
				.call(d3.axisLeft(y))
				.call(g => g.selectAll(".domain").remove())
				.call((g) => g.append("text")
					.attr("x", -marginLeft)
					.attr("y", 10)
					.attr("fill", "currentColor")
					.attr("text-anchor", "start")
					.text(params.yAxisLabel)
				);
			
			// Add lanes for each group that trigger data detail popup	
			var groupLanes = svg.append("g")
				.selectAll()
				.data(groups)
				.join("rect")
					.attr("id",(d,i) => "section-" + i)
					.attr("fill","none")
					.attr("pointer-events","visible")
					.attr("x", ([gk]) => fx(gk))
					.attr("width", fx.bandwidth())
					.attr("y", marginTop)
					.attr("height", height - marginTop - marginBottom)
					.on("mouseover", function(event,d){
						var total = 0;
						var max = 0;
						var dataSummary = [];
						for(var i = 0; i < d[1].length; i++){
							total += d[1][i].count;
							if(d[1][i].count > max){ max = d[1][i].count; }
							dataSummary.push(d[1][i][params.secondaryKey] + " - " +d[1][i].count);
						}
						dataSummary.push("Total - " + total);

						showDetails((fx(d[0]) + (fx.bandwidth()/2)),(y(max) - 5),dataSummary,"#group-" + event.target.id.split("-")[1])
					})
					.on("mouseout", (event,d) => hideDetails("#group-" + event.target.id.split("-")[1]));

			// Add legend based on columns (secondaryKey)
			addLegend(columns);
			break;
		
		case "histogram":
			// Convert chartData to required format
			var bins = d3.bin()
				.thresholds(params.threshold)
				.value((d) => d[params.primaryKey])
			(chartData);
	
			// Declare the x (horizontal position) scale
			var x = d3.scaleLinear()
				.domain([bins[0].x0, bins[bins.length - 1].x1])
				.range([marginLeft, width - marginRight]);

			// Declare the y (vertical position) scale
			var y = d3.scaleLinear()
				.domain([0, d3.max(bins, (d) => d.length)])
				.range([height - marginBottom, marginTop]);


			// Add a rect for each data bin determined above
			var rects = svg.append("g")
			.selectAll()
			.data(bins)
			.join("rect")
				.attr("id",(d,i) => "rect-" + i)
				.attr("fill", "#2a4969")
				.attr("x", (d) => x(d.x0) + 1)
				.attr("width", (d) => x(d.x1) - x(d.x0) - 1)
				.attr("y", (d) => y(d.length))
				.attr("height", (d) => y(0) - y(d.length));

			// Add the x-axis and label
			svg.append("g")
				.attr("transform", "translate(0," + (height - marginBottom) + ")")
				.call(d3.axisBottom(x).ticks(width / 180,"f").tickSizeOuter(0).offset((x(bins[0].x1) - x(bins[0].x0))/2))
				.call((g) => g.append("text")
					.attr("x", width)
					.attr("y", marginBottom - 4)
					.attr("fill", "currentColor")
					.attr("text-anchor", "end")
					.text(params.xAxisLabel)
				);

			// Add the y-axis and label, and remove the domain line
			svg.append("g")
				.attr("transform", "translate(" + marginLeft + ",0)")
				.call(d3.axisLeft(y).ticks(height / 40))
				.call((g) => g.select(".domain").remove())
				.call((g) => g.append("text")
					.attr("x", -marginLeft)
					.attr("y", 10)
					.attr("fill", "currentColor")
					.attr("text-anchor", "start")
					.text(params.yAxisLabel)
				);
			
			// If stacked option selected, add additional rects over each column rect to segment by provided secondaryKey value	
			if(params.stacked){
				// Determine values that exist in chartData for the provided secondaryKey field
				var stackKeys = [];
				chartData.forEach(function(d){ if(!stackKeys.includes(d[params.secondaryKey])){stackKeys.push(d[params.secondaryKey])} });

				// Convert data bins (created above) into an array of objects for each secondaryKey
				// Track number of objects per secondaryKey category for sorting
				var stackData = [];
				var stackOrder = {};
				for(var bin in bins){
					var pushableObject = {};
			
					// set x values for stack segments based on bin position
					pushableObject.x0 = bins[bin].x0;
					pushableObject.x1 = bins[bin].x1;

					bins[bin].forEach(function(d){
						// push each data row into correct stack bucket, making bucket first if needed
						if(!pushableObject[d[params.secondaryKey]]){
							pushableObject[d[params.secondaryKey]] = [d]
						}else{
							pushableObject[d[params.secondaryKey]].push(d);
						}
						// count total number of items in each stack bucket across all bins
						if(!stackOrder[d[params.secondaryKey]]){
							stackOrder[d[params.secondaryKey]] = 1;
						}else{
							stackOrder[d[params.secondaryKey]]++;
						}
					});
					// if any of the keys not present in bin, make empty bucket for the stack
					stackKeys.forEach(function(key){
						if(!pushableObject[key]){
							pushableObject[key] = [];
						}
					});
					stackData.push(pushableObject);
				}
				
				// Sort the stackKeys based on the stackOrder counts determined above (arranges stack segments from most common at bottom to least common at top)
				stackKeys.sort(function(a,b){ return stackOrder[a] < stackOrder[b] ? 1 : stackOrder[a] > stackOrder[b] ? -1 : 0; })
				
				// Update color scale based on stackKeys
				var range = [];
				for(var i = 0; i < stackKeys.length; i++){
					range.push(colorScale[Math.floor((colorScale.length/stackKeys.length) * i)]);
				}
				color.range(range)
				color.domain(stackKeys);

				// Add a rect for each stack piece
				for(var i = 0; i < stackKeys.length; i++){	
					var stackedRects = svg.append("g")
						.attr("fill", color(stackKeys[i]))
					.selectAll()
					.data(stackData)
					.join("rect")
						.attr("x", (d) => x(d.x0) + 1)
						.attr("width", (d) => x(d.x1) - x(d.x0) - 1)
						.attr("y", function(d){
							var sum = 0;
							for(var j = 0; j < i; j++){
								sum += d[stackKeys[j]].length;
							}
							return y(d[stackKeys[i]].length + sum)
						})
						.attr("height", (d) => y(0) - y(d[stackKeys[i]].length)
					);
				}
				
				// Add lanes for each column that trigger data detail popup
				var lanes = svg.append("g")
					.selectAll()
					.data(stackData)
					.join("rect")
						.attr("id",(d,i) => "section-" + i)
						.attr("fill","none")
						.attr("pointer-events","visible")
						.attr("x", (d) => x(d.x0) + 1)
						.attr("width", (d) => x(d.x1) - x(d.x0) - 1)
						.attr("y", marginTop)
						.attr("height", height - marginTop - marginBottom)
						.on("mouseover", function(event,d){
							var total = 0;
							var dataSummary = [];
							for(var i = 0; i < stackKeys.length; i++){
								if(d[stackKeys[i]].length != 0){
									total += d[stackKeys[i]].length;
									dataSummary.push(stackKeys[i] + " - " + d[stackKeys[i]].length);
								}
							}
							dataSummary.push("Total - " + total);
							dataSummary.push(d.x0);
							showDetails(((x(d.x0) + 1) + ((x(d.x1) - x(d.x0) - 1)/2)),(y(total) - 5),dataSummary,"#rect-" + event.target.id.split("-")[1])
						})
						.on("mouseout", (event,d) => hideDetails("#rect-" + event.target.id.split("-")[1]));
				
				// Add legend based on stackKeys
				addLegend(stackKeys);
			}else{
				// Add lanes for each column that trigger data detail popup
				var lanes = svg.append("g")
					.selectAll()
					.data(bins)
					.join("rect")
						.attr("id",(d,i) => "section-" + i)
						.attr("fill","none")
						.attr("pointer-events","visible")
						.attr("x", (d) => x(d.x0) + 1)
						.attr("width", (d) => x(d.x1) - x(d.x0) - 1)
						.attr("y", marginTop)
						.attr("height", height - marginTop - marginBottom)
						.on("mouseover", (event,d) => showDetails((x(d.x0) + 1) + ((x(d.x1) - x(d.x0) - 1)/2),(y(d.length) - 5),d.x0 + " - " + d.length,"#rect-" + event.target.id.split("-")[1]))
						.on("mouseout", (event,d) => hideDetails("#rect-" + event.target.id.split("-")[1]));
				
				// Add legend if colorKeys was provided
				if(params.colorKey){
					addLegend(colorKeys);
				}
			}
			break;
	}
	
	// Attach empty infoBox group to hold popup data details when triggered			
	var infoBox = svg.append("g")
		.attr("class","infoBox")
		.attr("pointer-events","none");

	return svg.node();
}

