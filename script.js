/* load and display initial data and selection menu */
window.onload = function() {
    fetch("data.json")
    .then(response => {
        if (!response.ok) {
            throw new Error("error loading data");
        }
        return response.json(); // parse json data as a JS object
    })
    .then(data => {
        allExperiments = Object.keys(data);
        currFilteredIDs = allExperiments;
        loadFilterMenu(data);
        displayExperiments(data, allExperiments);
        loadCompareMenu(data, allExperiments);
        updateBarCharts(data, allExperiments);
    })
    .catch(error => console.error("error while fetching data or displaying initial screen:", error));
}

/* map input types to their subtypes */
const inputTypesDict = {
    "Polymer" : ["1", "2", "3", "4"],
    "Carbon Black": ["High Grade", "Low Grade"],
    "Silica Filler": ["1", "2"],
    "Plasticizer": ["1", "2", "3"],
    "Antioxidant": [],
    "Coloring Pigment": [],
    "Co-Agent": ["1", "2", "3"],
    "Curing": ["Agent 1", "Agent 2"],
    "Oven Temperature": []
};

/* global color scheme */
const colorScheme = {
    "primary" : "#4ea6fb", 
    "secondary" : "#ed5186", 
    "accent" : "#027bff", 
    "lines" : "#b2b2b2"
};

var allExperiments; // for quick access, a list of all the experiments
var currFilteredIDs; // store the current filtered experiment ids globally, updated when apply filters is run

/* load the filter selection menu, checkboxes and range inputs */
function loadFilterMenu(data) {
    loadInputFilters();
    loadOutputFilters(Object.keys(Object.values(data)[0].outputs));
    const applyFiltersBtn = document.getElementById("apply-filters-btn");
    applyFiltersBtn.style.backgroundColor = colorScheme["accent"];
    applyFiltersBtn.addEventListener("click", () => {
        applyFilters(data);
    });
}
/* loads the input filter selection menu with special formatting for readability */
function loadInputFilters() {
    const filterDiv = document.getElementById("input-filters");
    Object.entries(inputTypesDict).forEach(([type, valueArr]) => {
        const typeLine = document.createElement("div"); // create a type header for this input type
        if (valueArr.length == 0) { // if this type only has one subtype, then it's a type header AND option
            createFilterBox(type, type, typeLine, true);
            typeLine.classList.add("filter-option");
        } else {
            const inputType = document.createElement("p");
            inputType.textContent = type;
            typeLine.append(inputType);
        }
        typeLine.classList.add("filter-type");
        filterDiv.append(typeLine);
        valueArr.forEach(typeValue => { // each subtype is an option - create filterbox
            const optionLine = document.createElement("div");
            optionLine.classList.add("filter-option");
            optionLine.classList.add("filter-subtype");
            const fullName = type + " " + typeValue;
            createFilterBox(typeValue, fullName, optionLine, true);
            filterDiv.append(optionLine);
        });
    });
}
/* loads the output selection menu */
function loadOutputFilters(outputTypes) {
    const filterDiv = document.getElementById("output-filters");
    outputTypes.forEach(type => { // each output type is an type header and option - create filterbox
        const typeLine = document.createElement("div");
        createFilterBox(type, type, typeLine, false);
        typeLine.classList.add("filter-option");
        typeLine.classList.add("filter-type");
        filterDiv.append(typeLine);
    })
}
/* creates a filter box element for the given property, which is an input if input, else output */
function createFilterBox(displayName, fullName, container, input) {
    /* create and add checkbox, label, range container, and min/max inputs */
    const labelCheckbox = document.createElement("div");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = fullName;
    checkbox.classList.add(input ? "input-checkbox" : "output-checkbox", "filter-checkbox");
    const label = document.createElement("label");
    label.textContent = displayName;
    label.classList.add("filter-label");
    const rangeContainer = document.createElement("div");
    rangeContainer.classList.add("range-container");
    rangeContainer.style.display = "none";
    const minInput = document.createElement("input");
    minInput.type = "number";
    minInput.placeholder = "Min";
    minInput.classList.add("min-input");
    const maxInput = document.createElement("input");
    maxInput.type = "number";
    maxInput.placeholder = "Max";
    maxInput.classList.add("max-input");
    rangeContainer.appendChild(minInput);
    rangeContainer.appendChild(maxInput);
    labelCheckbox.appendChild(checkbox);
    labelCheckbox.appendChild(label);
    container.appendChild(labelCheckbox);
    container.appendChild(rangeContainer);

    checkbox.addEventListener("change", () => { // hide range inputs when checkbox is not checked
        rangeContainer.style.display = checkbox.checked ? "flex" : "none";
    });
}
/* filters experiments based on given selections, then updates experiment list and bar charts */
function applyFilters(data) {
    /* retrieve all checked checkbox values - selected filters to be applied */
    const checkedInputBoxes = document.querySelectorAll(".input-checkbox:checked");
    const checkedOutputBoxes = document.querySelectorAll(".output-checkbox:checked");
    const selectedInputs = Array.from(checkedInputBoxes).map(cb => cb.value);
    const selectedOutputs = Array.from(checkedOutputBoxes).map(cb => cb.value);
    const selectedProperties = selectedInputs.concat(selectedOutputs);
    if (selectedProperties.length === 0) { // if no filter selections, then default to displaying all experiments
        currFilteredIDs = allExperiments;
        displayExperiments(data, allExperiments);
        updateBarCharts(data, allExperiments);
        return;
    }
    const filters = {}; // store specified range for each filter
    selectedProperties.forEach(property => {
        const container = document.querySelector(`input.filter-checkbox[value="${property}"]`).parentElement.parentElement; // retrieve corresp. option element
        /* set max and min if given, else default values */
        var min = parseFloat(container.querySelector(".min-input").value); 
        var max = parseFloat(container.querySelector(".max-input").value); 
        if (isNaN(min)) {
            min = 0;
        }
        if (isNaN(max)) {
            max = Number.MAX_VALUE;
        }
        filters[property] = { min, max };
    });
    const filteredExperimentIDs = Object.entries(data) // collect matching experimentIDs
        .filter(([experimentID, experimentData]) => {
            /* filter function - returns true if experiment data matches all ranges */
            const inputsMatch = selectedInputs.every(input => {
                const inputVal = experimentData.inputs[input];
                const { min, max } = filters[input];
                return inputVal >= min && inputVal <= max;
            });
            const outputsMatch = selectedOutputs.every(output => {
                const outputVal = experimentData.outputs[output];
                const { min, max } = filters[output];
                return outputVal >= min && outputVal <= max;
            });
            return inputsMatch && outputsMatch;
        })
        .map(([experimentID]) => experimentID); // only collect IDs, not data

    /* update experiment list and bar chart displays */
    currFilteredIDs = filteredExperimentIDs;
    displayExperiments(data, filteredExperimentIDs);
    updateBarCharts(data, filteredExperimentIDs);
}

/* displays the experiment list */
function displayExperiments(data, experimentIDs) {
    const listDiv = document.getElementById("experiments-list");
    listDiv.innerHTML = ""; // clear previous display
    const expCount = document.getElementById("experiments-count");
    expCount.textContent = `${experimentIDs.length} matching experiments:`;
    if (experimentIDs.length == 0) {
        alert("no matching experiments found.");
        return;
    }
    /* for each experiment, create an experiment element and add to list */
    experimentIDs.forEach(experiment => {
        const experimentDiv = document.createElement("div");
        experimentDiv.classList.add("experiment");
        const experimentTitle = document.createElement("h4");
        experimentTitle.textContent = experimentIdToName(experiment);
        experimentTitle.classList.add('experiment-title');
        experimentDiv.appendChild(experimentTitle);
        addDropdown(experimentDiv, "Inputs", createInputList(data[experiment].inputs));
        addDropdown(experimentDiv, "Outputs", createOutputList(data[experiment].outputs));
        listDiv.appendChild(experimentDiv);
    });
}
/* creates dropdown option with title (input/output) and content and adds to experimentDiv */
function addDropdown(experimentDiv, title, content) {
    const dropdownBtn = document.createElement("p");
    dropdownBtn.classList.add("dropdown-btn");
    dropdownBtn.textContent = title;
    experimentDiv.append(dropdownBtn);
    content.classList.add("dropdown-content");
    experimentDiv.append(content);
    dropdownBtn.addEventListener("click", () => { // dynamically adjust dropdown content height on click
        if (content.style.height) {
            content.style.height = null;
            dropdownBtn.classList.remove("expanded");
        } else {
            content.style.height = content.scrollHeight + "px";
            dropdownBtn.classList.add("expanded");
        }
    });
}
/* creates the formatted inputs list for each experiment element, to be shown on dropdown */
function createInputList(inputData) {
    if (!inputData || typeof inputData != "object") { // error if inputData is invalid
        console.error("createInputList failed: Invalid or missing inputData", inputData);
        return document.createElement("div");
    }
    inputsContainer = document.createElement("div");
    Object.entries(inputTypesDict).forEach(([type, valueArr]) => {
        const typeEntry = document.createElement("div"); // create a type header for this input type
        if (valueArr.length == 0) { // if this type only has one subtype, then it's a type header AND has a value
            const inputType = document.createElement("p");
            const inputValue = document.createElement("p");
            inputType.textContent = type;
            inputValue.textContent = inputData[type];
            typeEntry.classList.add("value-entry");
            typeEntry.append(inputType);
            typeEntry.append(inputValue);
        } else {
            typeEntry.textContent = type;
        }
        typeEntry.classList.add("type-entry");
        inputsContainer.append(typeEntry);
        valueArr.forEach(subType => { // each subtype has a value - create/add entry
            const subtypeEntry = document.createElement("div");
            subtypeEntry.classList.add("value-entry");
            subtypeEntry.classList.add("subtype-value-entry");
            const subTypeName = document.createElement("p");
            subTypeName.textContent = subType;
            subtypeEntry.append(subTypeName);
            const fullName = `${type} ${subType}`; // reconstruct full name to retreve data
            const inputValue = document.createElement("p");
            inputValue.textContent = inputData[fullName];
            subtypeEntry.append(inputValue);
            inputsContainer.append(subtypeEntry);
        });
    });
    return inputsContainer;
}
function createOutputList(outputData) {
    if (!outputData || typeof outputData != "object") { // error if outputData is invalid
        console.error("createOutputList failed: Invalid or missing outputData", outputData);
        return document.createElement("div");
    }
    const outputsContainer = document.createElement("div");
    Object.entries(outputData).forEach(([key, value]) => { // each output is a type header AND has a value - create/add entry
        const outputEntry = document.createElement("div");
        outputEntry.classList.add("value-entry");
        const outputType = document.createElement("p");
        outputType.textContent = key;
        outputEntry.append(outputType);
        const outputValue = document.createElement("p");
        outputValue.textContent = value;
        outputEntry.append(outputValue);
        outputsContainer.append(outputEntry);
    });
    return outputsContainer;
}

/* converts the experiment ID to a more readable string */
function experimentIdToName(experimentID) {
    if (experimentID == "Filtered Average") {
        return experimentID;
    }
    const Year = experimentID.substring(0, 4);
    const Month = experimentID.substring(4, 6);
    const Day = experimentID.substring(6, 8);
    const Number = experimentID.substring(13, 15);
    return `Experiment ${Number} (${Month}/${Day}/${Year})`;;
}

/* load the selection options for comparing two experiments */
function loadCompareMenu(data, experimentIDs) {
    let choice1 = document.getElementById("compare-choice-1");
    let choice2 = document.getElementById("compare-choice-2");
    createSelectionDropdown(choice1, data, experimentIDs);
    createSelectionDropdown(choice2, data, experimentIDs);
}
/* create a selection dropdown within container using options from experimentIDs */
function createSelectionDropdown(container, data, experimentIDs) {
    const avgOption = document.createElement("option");
    avgOption.text = "Filtered Average";
    avgOption.value = "Filtered Average";
    container.appendChild(avgOption); // filtered average option is available as default
    experimentIDs.forEach(experiment => {
        let option = document.createElement("option");
        option.text = experimentIdToName(experiment);
        option.value = experiment;
        container.appendChild(option);
    });
    container.addEventListener("change", () => {
        if (container.value) {
            container.style.color = "black";
        } else {
            container.style.color = colorScheme["lines"];
        }
        updateBarCharts(data, currFilteredIDs); // when an option is selected, bar charts are updated
    });
}
/* returns the average rounded data of a list of experiments */
function getAverageData(data, experimentIDs) {
    const experimentData = experimentIDs.map(id => data[id]);
    const averageInputData = {};
    const averageOutputData = {};
    Object.keys(experimentData[0].inputs).forEach(inputKey => {
        averageInputData[inputKey] = Math.round(d3.mean(experimentData, d => d.inputs[inputKey]) * 1000) / 1000;
    });
    Object.keys(experimentData[0].outputs).forEach(outputKey=> {
        averageOutputData[outputKey] = Math.round(d3.mean(experimentData, d => d.outputs[outputKey]) * 1000) / 1000;
    });
    return { 
        inputs: averageInputData, 
        outputs: averageOutputData 
    };
}
/* re-generates bar charts based on current comparison selections and filters */
function updateBarCharts(data, experimentIDs) {
    if (experimentIDs.length == 0) {
        console.log("no matching experiments, chart will not be updated.");
        return;
    }
    const experiment1 = document.getElementById("compare-choice-1").value;
    const experiment2 = document.getElementById("compare-choice-2").value;
    /* conditional logic for all possible user selections (unselected, average, experiment) */
    var data1 = null;
    var data2 = null;
    if (experiment1) {
        data1 = (experiment1 == "Filtered Average") ? getAverageData(data, experimentIDs) : data[experiment1];
    }
    if (experiment2) {
        data2 = (experiment2 == "Filtered Average") ? getAverageData(data, experimentIDs) : data[experiment2];
    }
    if ((data1 && data2) && (experiment1 != experiment2)) { // if both are selected, display a comparison chart
        createBarChart("input-chart", "Compared Inputs", "primary", data1.inputs, data2.inputs);
        createBarChart("output-chart", "Compared Outputs", "primary", data1.outputs, data2.outputs);
    } else {
        let singleData = null;
        let title = "";
        let color = "primary";
        if (data1) { // if exactly one is selected, display sole data
            singleData = data1;
            title = `${experimentIdToName(experiment1)} `;
        } else if (data2) {
            singleData = data2;
            title = `${experimentIdToName(experiment2)} `;
            color = "secondary";
        } else { // if both are unselected, default to display filtered average
            singleData = getAverageData(data, experimentIDs);
            title = "Average ";
        }
        createBarChart("input-chart", title + "Inputs", color, singleData.inputs);
        createBarChart("output-chart", title + "Outputs", color, singleData.outputs);
    }
}
/* creates bar charts for data within containerID for given data */
function createBarChart(containerID, title, color, data, data2 = null) {
    const width = 650;
    const height = 200;
    const mainMargins = { top: 40, right: 30, bottom: 80, left: 25 };
    const outlierMargins = { top: 40, right: 50, bottom: 80, left: 35 };
    var outlierKey = containerID == "input-chart" ? "Oven Temperature" : "Viscosity"; // filter outliers for separate chart
    if (data2) { // if two datasets given, create concatenated data
        let mainData = Object.keys(data).map(key => ({
            key: key,
            value1: data[key],
            value2: data2[key]
        })).filter(d => d.key !== outlierKey);
        let outlierData = Object.keys(data).map(key => ({
            key: key,
            value1: data[key],
            value2: data2[key]
        })).filter(d => d.key == outlierKey);
        graphDoubleChart(`${containerID}-main`, title, mainData, height, width * 0.9, mainMargins);
        graphDoubleChart(`${containerID}-outlier`, "", outlierData, height, width * 0.1, outlierMargins);
    } else {
        let d3Data = Object.entries(data);
        let mainData = d3Data.filter(([key]) => key != outlierKey);
        let outlierData = d3Data.filter(([key]) => key == outlierKey);
        graphSingleChart(`${containerID}-main`, title, color, mainData, height, width * 0.9, mainMargins);
        graphSingleChart(`${containerID}-outlier`, "", color, outlierData, height, width * 0.1, outlierMargins);   
    }
}

/* graphing logic to graph a bar chart for a single set of data */
function graphSingleChart(containerID, title, color, data, height, width, margin) {
    d3.select(`#${containerID}`).html(""); // clear previous chart

    /* create SVG container in the given container element */
    const svg = d3.select(`#${containerID}`)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    /* declare x and y scales */
    const x = d3.scaleBand().domain(data.map(d => d[0])).range([0, width]).padding(0.2);
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d[1])]).range([height, 0]);

    /* draw bars */
    svg.selectAll(".bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d[0]))
        .attr("y", d => y(d[1]))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d[1]))
        .attr("fill", colorScheme[color])
        .attr("rx", 5) // round bar edges
        .attr("ry", 5)
        /* handle tooltip visibility on hover */
        .on("mouseover", (event, d) => {
            tooltip.style("visibility", "visible").text(`${d[0]}: ${d[1]}`);
        })
        .on("mousemove", (event) => {
            /* make sure tooltip doesn't get cut off by the window */
            let tooltipWidth = tooltip.node().offsetWidth;
            let pageX = event.pageX;
            let pageY = event.pageY;
            let leftPos = pageX + 10;
            if (leftPos + tooltipWidth > window.innerWidth) {
                leftPos = pageX - tooltipWidth - 10; // if overflow, shift left
            }
            tooltip.style("top", `${pageY - 10}px`)
                .style("left", `${leftPos}px`);
        })
        .on("mouseout", () => {
            tooltip.style("visibility", "hidden");
        });

    /* create x and y axes */
    const xAxis = d3.create("svg:g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));
    const yAxis = d3.create("svg:g")
        .call(d3.axisLeft(y));

    /* set color and thickness of axes */
    const lineColor = colorScheme["lines"];
    xAxis.select("path")
        .style("stroke", lineColor);
    yAxis.select("path")
        .style("stroke", lineColor);
    xAxis.selectAll("line")
        .style("stroke", lineColor);
    yAxis.selectAll("line")
        .style("stroke", lineColor);
    xAxis.selectAll("text")
        .attr("transform", "rotate(-40)")
        .style("text-anchor", "end")
        .style("font-family", "jali-latin-variable")
        .style("color", lineColor);
    yAxis.selectAll("text")
        .style("font-family", "jali-latin-variable")
        .style("color", lineColor);
    svg.append(() => xAxis.node());
    svg.append(() => yAxis.node());

    /* create tooltip to display values on hover */
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background", "white")
        .style("border", `1px solid ${colorScheme["primary"]}`)
        .style("border-radius", "5px")
        .style("padding", "5px")
        .style("visibility", "hidden");
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -15)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .text(title);
}
/* graphing logic to graph a bar chart to compare two sets of data */
function graphDoubleChart(containerID, title, dataCombo, height, width, margin) {
    d3.select(`#${containerID}`).html(""); // clear previous chart

    /* create SVG container in the given container element */
    const svg = d3.select(`#${containerID}`)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    /* declare x and y scales */
    const x = d3.scaleBand().domain(dataCombo.map(d => d.key)).range([0, width]).padding(0.2);
    const xSubgroup = d3.scaleBand().domain(["value1", "value2"]).range([0, x.bandwidth()]).padding(0.05); // add x subgroup for side-by-side bars
    const y = d3.scaleLinear().domain([0, d3.max(dataCombo, d => Math.max(d.value1, d.value2))]).range([height, 0]);

    /* create x and y axes */
    const xAxis = d3.create("svg:g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));
    const yAxis = d3.create("svg:g")
        .call(d3.axisLeft(y));

    /* set color and thickness of axes */
    const lineColor = "#b2b2b2";
    xAxis.select("path")
        .style("stroke", lineColor);
    yAxis.select("path")
        .style("stroke", lineColor);
    xAxis.selectAll("line")
        .style("stroke", lineColor);
    yAxis.selectAll("line")
        .style("stroke", lineColor);
    xAxis.selectAll("text")
        .attr("transform", "rotate(-40)")
        .style("text-anchor", "end")
        .style("font-family", "jali-latin-variable")
        .style("color", lineColor);
    yAxis.selectAll("text")
        .style("font-family", "jali-latin-variable")
        .style("color", lineColor);
    svg.append(() => xAxis.node());
    svg.append(() => yAxis.node());

    const color = d3.scaleOrdinal().domain(["value1", "value2"]).range([colorScheme["primary"], colorScheme["secondary"]]); // set color scheme for datasets

    /* create tooltip to display values on hover */
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background", "white")
        .style("border-radius", "5px")
        .style("padding", "5px")
        .style("visibility", "hidden");

    /* draw bars */
    svg.selectAll("g.bar-group")
        .data(dataCombo)
        .enter()
        .append("g")
        .attr("class", "bar-group")
        .attr("transform", d => `translate(${x(d.key)},0)`)
        .selectAll("rect")
        .data(d => [
            { key: "value1", value: d.value1, label: d.key },
            { key: "value2", value: d.value2, label: d.key }
        ])
        .enter()
        .append("rect")
        .attr("x", d => xSubgroup(d.key))
        .attr("y", d => y(d.value))
        .attr("width", xSubgroup.bandwidth())
        .attr("height", d => height - y(d.value))
        .attr("fill", d => color(d.key))
        .attr("rx", 5) // round bar edges
        .attr("ry", 5)
        /* handle tooltip visibility on hover */
        .on("mouseover", (event, d) => {
            tooltip.style("visibility", "visible").text(`${d.label}: ${d.value}`);
            const barColor = d3.select(event.target).attr("fill");
            tooltip.style("visibility", "visible")
                .text(`${d.label}: ${d.value}`)
                .style("border", `1px solid ${barColor}`);
        })
        .on("mousemove", (event) => {
            /* make sure tooltip doesn't get cut off by the window */
            let tooltipWidth = tooltip.node().offsetWidth;
            let pageX = event.pageX;
            let pageY = event.pageY;
            let leftPos = pageX + 10;
            if (leftPos + tooltipWidth > window.innerWidth) {
                leftPos = pageX - tooltipWidth - 10; // if overflow, shift left
            }
            tooltip.style("top", `${pageY - 10}px`)
                .style("left", `${leftPos}px`)
        })
        .on("mouseout", () => {
            tooltip.style("visibility", "hidden");
        });
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -15)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .text(title);
}