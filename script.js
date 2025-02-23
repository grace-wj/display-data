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
        displayExperiments(data, Object.keys(data));
        updateBarCharts(data, Object.keys(data));
        loadFilters(data);
        loadCompareMenu(data, Object.keys(data));
        document.getElementById("apply-filters").addEventListener("click", () => {
            applyFilters(data);
        });
    })
    .catch(error => console.error("error while fetching data or displaying initial screen:", error));
}

// FIXME: figure out how to not hardcode this
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

function loadCompareMenu(data, experimentIDs) {
    let choice1 = document.getElementById("compare-choice-1");
    let choice2 = document.getElementById("compare-choice-2");

    let avgOption1 = document.createElement("option");
    avgOption1.text = "Filtered Average";
    avgOption1.value = "Filtered Average";
    choice1.appendChild(avgOption1);
    experimentIDs.forEach(experiment => {
        let option = document.createElement("option");
        option.text = experimentIdToName(experiment);
        option.value = experiment;
        choice1.appendChild(option);
    });
    choice1.addEventListener("change", () => {
        updateBarCharts(data, experimentIDs);
    });

    let avgOption2 = document.createElement("option");
    avgOption2.text = "Filtered Average";
    avgOption2.value = "Filtered Average";
    choice2.appendChild(avgOption2);
    experimentIDs.forEach(experiment => {
        let option = document.createElement("option");
        option.text = experimentIdToName(experiment);
        option.value = experiment;
        choice2.appendChild(option);
    });
    choice2.addEventListener("change", () => {
        updateBarCharts(data, experimentIDs);
    });
}

/* load the filter selection menu, checkboxes and range inputs */
function loadFilters(data) {
    const outputs = Object.keys(Object.values(data)[0].outputs);
    const inputs = Object.keys(Object.values(data)[0].inputs);
    
    const inputFilterDiv = document.getElementById("input-filters");
    const inputFilterLabel = document.createElement("h4");
    inputFilterLabel.textContent = "Inputs";
    inputFilterDiv.appendChild(inputFilterLabel)
    inputs.forEach(input => {createFilterBox(input, true)});

    const outputFilterDiv = document.getElementById("output-filters");
    const outputFilterLabel = document.createElement("h4");
    outputFilterLabel.textContent = "Outputs";
    outputFilterDiv.appendChild(outputFilterLabel)
    outputs.forEach(output => {createFilterBox(output, false)});
}

/* creates a filter box element for the given property, which is an input if input, else output */
function createFilterBox(property, input) {
    const filterDiv = document.getElementById(`${input ? "input-filters" : "output-filters"}`);
    const propertyDiv = document.createElement("div");
    propertyDiv.classList.add("filter-item");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = property;
    checkbox.classList.add(input ? "input-checkbox" : "output-checkbox", "filter-checkbox");

    const label = document.createElement("label");
    label.textContent = property;
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

    propertyDiv.appendChild(checkbox);
    propertyDiv.appendChild(label);
    propertyDiv.appendChild(rangeContainer);
    filterDiv.appendChild(propertyDiv);

    checkbox.addEventListener("change", () => {
        rangeContainer.style.display = checkbox.checked ? "block" : "none";
    });
}

/* filter experiments based on given selections, then load scatterplot */
function applyFilters(data) {
    // retrieve all checked output types - filter requirements
    const checkedInputBoxes = document.querySelectorAll(".input-checkbox:checked");
    const checkedOutputBoxes = document.querySelectorAll(".output-checkbox:checked");
    const selectedInputs = Array.from(checkedInputBoxes).map(cb => cb.value);
    const selectedOutputs = Array.from(checkedOutputBoxes).map(cb => cb.value);
    const selectedProperties = selectedInputs.concat(selectedOutputs);
    if (selectedProperties.length === 0) {
        alert("No filters were specified.");
        return;
    }
    const filters = {};
    selectedProperties.forEach(property => {
         // only consider checked boxes
        const container = document.querySelector(`input.filter-checkbox[value="${property}"]`).parentElement;
        
        // set max and min if given, else default values
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

    // collect all experimentIDs that match the filters
    const filteredExperimentIDs = Object.entries(data)
        .filter(([experimentID, experimentData]) => {
            // Filter function to return whether experiment data matches all specified ranges
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
        .map(([experimentID]) => experimentID);

    displayExperiments(data, filteredExperimentIDs); // re-display filtered experiments
    updateBarCharts(data, filteredExperimentIDs); // re-chart average of filtered experiments
    // loadScatterplot(filteredExperiments, selectedProperties);
}

/* function to visually display the experiment data */
function displayExperiments(data, experimentIDs) {
    // FIXME: add "number of matching experiments"
    const listDiv = document.getElementById("experiments-list");
    listDiv.innerHTML = ""; // clear previous display

    if (experimentIDs.length == 0) {
        alert("no matching experiments found.");
        return;
    }
    const expCount = document.getElementById("experiments-count");
    expCount.textContent = `${experimentIDs.length} matching experiments:`;

    experimentIDs.forEach(experiment => {
        const experimentDiv = document.createElement("div");
        experimentDiv.classList.add("experiment");

        const experimentTitle = document.createElement("h4");
        experimentTitle.textContent = experimentIdToName(experiment);
        experimentDiv.appendChild(experimentTitle);

        addDropdown(experimentDiv, "Inputs", createInputList(data[experiment].inputs));
        addDropdown(experimentDiv, "Outputs", createOutputList(data[experiment].outputs));

        // // click event listener to show the experiment data bar charts
        // experimentDiv.addEventListener("click", () => {
        //     displayBarCharts(data, [experiment]);
        // });

        listDiv.appendChild(experimentDiv);
    });
    // displayBarCharts(data, experimentIDs);
}

/* create dropdown option with title/content and add to experiment */
function addDropdown(experimentDiv, title, content) {
    // FIXME: add dropdown arrow
    const dropdownBtn = document.createElement("p");
    dropdownBtn.classList.add("dropdown-btn");
    dropdownBtn.textContent = title;
    experimentDiv.append(dropdownBtn);
    content.classList.add("dropdown-content");
    experimentDiv.append(content);

    // dynamically adjust dropdown content height on click
    dropdownBtn.addEventListener("click", () => {
        if (content.style.height) {
            content.style.height = null;
        } else {
            content.style.height = content.scrollHeight + "px";
        }
    });
}

function createOutputList(outputData) {
    // FIXME: handle malformed data here
    const outputsContainer = document.createElement("div");

    // for each output type/value pair, create and add entry to list
    Object.entries(outputData).forEach(([key, value]) => {
        const outputEntry = document.createElement("div");
        outputEntry.classList.add("property-entry");
        
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
function createInputList(inputData) {
    // FIXME: handle malformed data here
    inputsContainer = document.createElement("div");

    Object.entries(inputTypesDict).forEach(([type, valueArr]) => {
        // create header entry to specify following input type
        const typeEntry = document.createElement("div");
        const inputType = document.createElement("p");
        inputType.textContent = type;
        typeEntry.append(inputType);

        // if this type only has one subtype, then use type name to find the sole value
        if (valueArr.length == 0) {
            const inputValue = document.createElement("p");
            inputValue.textContent = inputData[type];
            typeEntry.classList.add("property-entry");
            typeEntry.classList.add("type-entry"); // these entries have both property and type class
            typeEntry.append(inputValue);
        }
        typeEntry.classList.add("type-entry");
        inputsContainer.append(typeEntry);

        // for each subtype of this type, reconstruct full type name to find value, then add entry
        valueArr.forEach(typeValue => {
            const inputEntry = document.createElement("div");
            inputEntry.classList.add("property-entry");
            inputEntry.classList.add("subproperty-entry");

            const typeValueName = document.createElement("p");
            typeValueName.textContent = typeValue;
            inputEntry.append(typeValueName);

            const fullName = type + " " + typeValue;
            const inputValue = document.createElement("p");
            inputValue.textContent = inputData[fullName];
            inputEntry.append(inputValue);

            inputsContainer.append(inputEntry);
        });
    });
    return inputsContainer;
}

/* get the average data of a list of experiments */
function getAverageData(data, experimentIDs) {
    const experimentData = experimentIDs.map(id => data[id]);
    if (experimentIDs.length == 0) {
        console.log("no matching experiments were found, chart will not be changed.");
        return;
    }
    // retrieve and separate the input and output data averages
    const averageInputData = {};
    const averageOutputData = {};
    Object.keys(experimentData[0].inputs).forEach(inputKey => {
        averageInputData[inputKey] = d3.mean(experimentData, d => d.inputs[inputKey]);
    });
    Object.keys(experimentData[0].outputs).forEach(outputKey=> {
        averageOutputData[outputKey] = d3.mean(experimentData, d => d.outputs[outputKey]);
    });
    return { 
        inputs: averageInputData, 
        outputs: averageOutputData 
    };
}

/* create a bar chart within containerID displaying data, titled title */
function createBarChart(containerID, title, data) {
    console.log("create bar chart called with data:", data);
    var d3Data = Object.entries(data);
    if (title == "Inputs") {
        // don't display temperature on input chart (outlier scale)
        d3Data = d3Data.filter(([key]) => key != "Oven Temperature");
    } else {
        // don't display viscosity on output chart (outlier scale)
        d3Data = d3Data.filter(([key]) => key != "Viscosity");
    }
    // FIXME: display outlier values separately

    d3.select(`#${containerID}`).html(""); // clear previous chart
    // FIXME: dynamically set chart size 
    const width = 600;
    const height = 200;
    const margin = { top: 50, right: 25, bottom: 100, left: 25 };

    // FIXME: display the exact value of each bar on hover
    // create SVG container in the given container element
    const svg = d3.select(`#${containerID}`)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`); // format g element

    // declare the x and y scales
    const x = d3.scaleBand() // scaleband for categorical data
        .domain(d3Data.map(d => d[0])) // map category names along x axis
        .range([0, width]) // bars span chart width
        .padding(0.2); // padding betwen bars
    const y = d3.scaleLinear() // scalelinear for quantitative data
        .domain([0, d3.max(d3Data, d => d[1])]) // set scale from 0 to max value
        .range([height, 0]); // set range with 0 at bottom and max at top

    // draw x and y axes
    svg.append("g")
        .attr("transform", `translate(0,${height})`) // set axis to bottom
        .call(d3.axisBottom(x)) // draw axis
        .selectAll("text")
        .attr("transform", "rotate(-40)") // rotate labels to prevent overlap
        .style("text-anchor", "end"); // align text under x axis
    svg.append("g").call(d3.axisLeft(y));

    // draw bars
    svg.selectAll(".bar")
        .data(d3Data) // reference data to create bars
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d[0])) // set x positioning
        .attr("y", d => y(d[1])) // set y positioning
        .attr("width", x.bandwidth()) // auto scale bar width
        .attr("height", d => height - y(d[1])) // calculate bar height
        .attr("fill", "lightpink");

    // display title above graph
    svg.append("text")
        .attr("x", width / 2) // set horizontal position
        .attr("y", -15) // set vertical position
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .text(title);
}

function createComparisonBarChart(containerID, title, data1, data2) {
    var d3Data = Object.keys(data1).map(key => ({
        key: key,
        value1: data1[key],
        value2: data2[key]
    }));

    // Filter out outliers
    d3Data = d3Data.filter(d => d.key !== "Oven Temperature" && d.key !== "Viscosity");

    d3.select(`#${containerID}`).html(""); // Clear previous chart

    const width = 600;
    const height = 200;
    const margin = { top: 50, right: 25, bottom: 100, left: 50 };

    // Create SVG container
    const svg = d3.select(`#${containerID}`)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // X scale: categories
    const x = d3.scaleBand()
        .domain(d3Data.map(d => d.key))
        .range([0, width])
        .padding(0.2);

    // X sub-group scale (for side-by-side bars)
    const xSubgroup = d3.scaleBand()
        .domain(["value1", "value2"]) // Two bars per category
        .range([0, x.bandwidth()])
        .padding(0.05);

    // Y scale
    const y = d3.scaleLinear()
        .domain([0, d3.max(d3Data, d => Math.max(d.value1, d.value2))])
        .range([height, 0]);

    // Draw X and Y axes
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-40)")
        .style("text-anchor", "end");

    svg.append("g").call(d3.axisLeft(y));

    // Colors for the two experiments
    const color = d3.scaleOrdinal()
        .domain(["value1", "value2"])
        .range(["lightpink", "lightblue"]);

    // Draw bars for both experiments
    svg.selectAll("g.bar-group")
        .data(d3Data)
        .enter()
        .append("g")
        .attr("class", "bar-group")
        .attr("transform", d => `translate(${x(d.key)},0)`)
        .selectAll("rect")
        .data(d => [
            { key: "value1", value: d.value1 },
            { key: "value2", value: d.value2 }
        ])
        .enter()
        .append("rect")
        .attr("x", d => xSubgroup(d.key))
        .attr("y", d => y(d.value))
        .attr("width", xSubgroup.bandwidth())
        .attr("height", d => height - y(d.value))
        .attr("fill", d => color(d.key));

    // Add title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -15)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .text(title);
}


function updateBarCharts(data, experimentIDs) {
    const experiment1 = document.getElementById("compare-choice-1").value;
    const experiment2 = document.getElementById("compare-choice-2").value;

    // logic to update comparisons based on combos of user choices: unselected, average, or experiment
    var data1 = null;
    var data2 = null;
    if (experiment1) {
        data1 = (experiment1 == "Filtered Average") ? getAverageData(data, experimentIDs) : data[experiment1];
    }
    if (experiment2) {
        data2 = (experiment2 == "Filtered Average") ? getAverageData(data, experimentIDs) : data[experiment2];
    }
    if ((data1 && data2) && (experiment1 != experiment2)) {
        createComparisonBarChart("input-chart", "Inputs", data1.inputs, data2.inputs);
        createComparisonBarChart("output-chart", "Outputs", data1.outputs, data2.outputs);
    } else if (data1) {
        createBarChart("input-chart", "Inputs", data1.inputs);
        createBarChart("output-chart", "Outputs", data1.outputs);
    } else if (data2) {
        createBarChart("input-chart", "Inputs", data2.inputs);
        createBarChart("output-chart", "Outputs", data2.outputs);
    } else {
        const avgData = getAverageData(data, experimentIDs);
        createBarChart("input-chart", "Inputs", avgData.inputs);
        createBarChart("output-chart", "Outputs", avgData.outputs);
    }
}
/* converts the experiment ID to a more readable string */
function experimentIdToName(experimentID) {
    const Year = experimentID.substring(0, 4);
    const Month = experimentID.substring(4, 6);
    const Day = experimentID.substring(6, 8);
    const Number = experimentID.substring(13, 15);
    return `Experiment ${Number} (${Month}/${Day}/${Year})`;;
}