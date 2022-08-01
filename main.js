function generateUSFacultyMap(needTruncate, minSize=0, maxSize=188) {
    if (needTruncate) {
        if (minSize > maxSize) {
            let temp = minSize;
            minSize = maxSize;
            maxSize = temp;
        }
        document.getElementById("us_map").remove();
        d3.select("#main")
            .append("div")
            .attr("id", "us_map");
    }

    // Read US CS faculty data
    let files = [
        "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json", // US map json file
        "csv_generated/us_cs_faculty.csv" // US CS faculty csv file
    ];
    Promise.all(
        files.map(url => url.endsWith(".json") ? d3.json(url) : d3.csv(url))
    ).then(ready);

    // Generate US faculty map basic layout
    // Code reference:
    // https://www.youtube.com/watch?v=G-VggTK-Wlg
    let margin = {top: 0, bottom: 0, left: 0, right: 0},
        height = 400 - margin.top - margin.bottom,
        width = 600 - margin.left - margin.right;

    let svg = generateUSMapSvg(height, width, margin);
    let projection = getGeoProjection(width, height);
    let path = d3.geoPath().projection(projection);

    function ready(data) {
        let usMap = data[0];
        let usFaculty = data[1];

        // Truncate data based on selected range
        if (needTruncate) {
            usFaculty = getTruncatedData(usFaculty, minSize, maxSize);
        }

        let states = topojson.feature(usMap, usMap.objects.states).features;
        svg.selectAll(".state")
            .data(states)
            .enter().append("path")
            .attr("class", "state")
            .attr("d", path);

        generateUniversityDataPoints(
            usFaculty,
            projection,
            svg,
            getLargestFacultyNumber(usFaculty),
            getSmallestFacultyNumber(usFaculty)
        )
    }
}

function generateUniversityDataPoints(data, projection, svg, largestFacultyCount, smallestFacultyCount) {
    let highlight = d3.select("#highlight");
    svg.selectAll(".university")
        .data(data)
        .enter().append("circle")
        .attr("class", "university")
        .attr("r", 4)
        .attr("cx", function(d) {
            let coords = projection([d.Lon, d.Lat]);
            return coords[0];
        })
        .attr("cy", function(d) {
            let coords = projection([d.Lon, d.Lat]);
            return coords[1];
        })
        .style("fill",  function (d) {
            if (parseInt(d.Total) === largestFacultyCount) {
                return "red";
            } else if (parseInt(d.Total) === smallestFacultyCount){
                return "blue";
            } else {
                return "black";
            }
        })
        .style("opacity", function (d) {
            if (parseInt(d.Total) === largestFacultyCount ||
                parseInt(d.Total) === smallestFacultyCount) {
                return 1;
            } else {
                return 0.3;
            }
        })
        .on("mouseover", function(d) {
            let facultyData = d.path[0].__data__;
            generateFacultyBarChart(facultyData);
            if (parseInt(facultyData["Total"]) === largestFacultyCount) {
                highlight.style("opacity", 1)
                    .style("color", "red")
                    .html(facultyData["University"] + " has the largest CS faculty in the selected range! " + facultyData["Total"] + " in total.");
            } else if (parseInt(facultyData["Total"]) === smallestFacultyCount) {
                highlight.style("opacity", 1)
                    .style("color", "blue")
                    .html(facultyData["University"] + " has the smallest CS faculty in the selected range! " + facultyData["Total"] + " in total.");
            }
        })
        .on("mouseout", function() {
            document.getElementById("barchart").remove();
            highlight.style("opacity", 0);
        });
}

function generateFacultyBarChart(data) {
    // Code Reference:
    // https://www.tutorialsteacher.com/d3js/create-bar-chart-using-d3js
    let detail = [
        {"position": "Director", "num": data["Director"]},
        {"position": "Distinguished Professor", "num": data["Distinguished Professor"]},
        {"position": "Professor", "num": data["Professor"]},
        {"position": "AP", "num": data["Associate Professor"]},
        {"position": "Assistant Professor", "num": data["Assistant Professor"]},
        {"position": "Lecturer", "num": data["Lecturer"]},
        {"position": "Other", "num": data["Other"]}
    ];

    let tooltip = d3.select("#tooltip");
    tooltip
        .attr("height", 400)
        .append("svg")
        .attr("width", 800)
        .attr("height", 400)
        .attr("id", "barchart");

    let svg = d3.select("#barchart"),
        margin = 200,
        width = svg.attr("width") - margin,
        height = svg.attr("height") - margin;

    svg.append("text")
        .attr("transform", "translate(100, -10)")
        .attr("x", 40)
        .attr("y", 70)
        .attr("font-size", "12px")
        .text(data["University"] + " CS Faculty " + data["Total"] + " Members in Total")

    let xScale = d3.scaleBand().range([0, width]).padding(0.4),
        yScale = d3.scaleLinear().range([height, 0]);
    let g = svg.append("g")
        .attr("transform", "translate(" + 40 + "," + 100 + ")");

    xScale.domain(detail.map(function (d) { return d.position; }));
    yScale.domain([0, d3.max(detail, function(d) { return parseInt(d.num); })]);
    g.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(xScale))
        .append("text")
        .attr("y", height - 150)
        .attr("x", width - 300)
        .attr("text-anchor", "end")
        .attr("stroke", "black")
        .text("Positions");

    g.append("g")
        .call(d3.axisLeft(yScale).tickFormat(function(d){
            return d;
        }).ticks(10))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -30)
        .attr("text-anchor", "end")
        .attr("stroke", "black")
        .text("Member Count");

    g.selectAll(".bar")
        .data(detail)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", function(d) { return xScale(d.position); })
        .attr("y", function(d) { return yScale(d.num); })
        .attr("width", xScale.bandwidth())
        .attr("height", function(d) { return height - yScale(d.num); });
}

function generateRangeSlider() {
    let min = 0, max = 188;
    let minSize = d3.select("#min_num");
    minSize.on("change", function () {
        min = parseInt(this.value);
        generateUSFacultyMap(true, min, max);
    });

    let maxSize = d3.select("#max_num");
    maxSize.on("change", function () {
        max = parseInt(this.value);
        generateUSFacultyMap(true, min, max);
    });
}

function generateUSMapSvg(height, width, margin) {
    return d3.select("#us_map")
        .append("svg")
        .attr("height", height)
        .attr("width", width)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
}

function getGeoProjection(width, height) {
    return d3.geoAlbersUsa()
        .translate([width / 2, height / 2])
        .scale(700);
}

function getLargestFacultyNumber(data) {
    return d3.max(data, function(d) { return parseInt(d.Total); })
}

function getSmallestFacultyNumber(data) {
    return d3.min(data, function(d) { return parseInt(d.Total); })
}

function getTruncatedData(data, minSize, maxSize) {
    let truncatedData = [];
    for (let v of data) {
        if (parseInt(v["Total"]) >= minSize && parseInt(v["Total"]) <= maxSize) {
            truncatedData.push(v);
        }
    }
    return truncatedData;
}

generateUSFacultyMap(false);
generateRangeSlider();
