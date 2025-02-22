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
        displayExperiments(data);
        loadFilters(data);
        document.getElementById("apply-filters").addEventListener("click", () => {
            applyFilters(data);
        });
    })
    .catch(error => console.error("error while fetching data or displaying initial screen:", error));
}

// FIXME: figure out how to not hard code this
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
        const min = parseFloat(container.querySelector(".min-input").value); 
        const max = parseFloat(container.querySelector(".max-input").value); 

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

    displayExperiments(data, true, filteredExperimentIDs); // re-display filtered experiments
    // loadScatterplot(filteredExperiments, selectedProperties);
}

/* function to visually display the experiment data */
function displayExperiments(data, filter = false, displayList = []) {
    // FIXME: add "number of matching experiments"
    const listDiv = document.getElementById("experiments-list");
    listDiv.innerHTML = ""; // clear previous display

    // show data for each experiment
    Object.keys(data).forEach(experiment => {
        // only show experiment if it matches filters or if no filters were given
        if (!filter || displayList.includes(experiment)) {
            const experimentDiv = document.createElement("div");
            experimentDiv.classList.add("experiment");

            const experimentTitle = document.createElement("h3");
            experimentTitle.textContent = experimentIdToName(experiment);
            experimentDiv.appendChild(experimentTitle);

            const outputsContainer = createOutputList(data[experiment].outputs);
            // outputsContainer.classList.add("experiment-outputs");
            experimentDiv.append(outputsContainer);

            const displayInputsBtn = document.createElement("p");
            displayInputsBtn.classList.add("display-inputs-btn");
            displayInputsBtn.textContent = "Display Inputs";
            experimentDiv.append(displayInputsBtn);

            const inputsContainer = createInputList(data[experiment].inputs);
            inputsContainer.classList.add("experiment-inputs");
            experimentDiv.append(inputsContainer);

            // click event listener to show the experiment data bar charts
            experimentDiv.addEventListener("click", () => {
                displayBarCharts(data, [experiment]);
            });

            displayInputsBtn.addEventListener("click", () => {
                // show inputs
                if (displayInputsBtn.textContent == "Hide Inputs") {
                    displayInputsBtn.textContent = "Display Inputs";
                    inputsContainer.classList.remove("show");
                } else {
                    displayInputsBtn.textContent = "Hide Inputs";
                    inputsContainer.classList.add("show");
                }
            });

            listDiv.appendChild(experimentDiv);
        }
    })
    if (!filter) {
        displayBarCharts(data, Object.keys(data));
    } else {
        displayBarCharts(data, displayList);
    }
}

function createOutputList(outputData) {
    // FIXME: handle malformed data here
    const outputsContainer = document.createElement("div");

    Object.entries(outputData).forEach(([key, value]) => {
        const outputEntry = document.createElement("div");
        outputEntry.classList.add("property-entry");
        
        const outputType = document.createElement("h4");
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
        const typeEntry = document.createElement("div");

        const inputType = document.createElement("h4");
        inputType.textContent = type;
        typeEntry.append(inputType);

        if (valueArr.length == 0) {
            const inputValue = document.createElement("p");
            inputValue.textContent = inputData[type];
            typeEntry.classList.add("property-entry");
            typeEntry.append(inputValue);
        }

        inputsContainer.append(typeEntry);

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

/* create input/output experiment bar charts */
function displayBarCharts(data, experimentIDs) {
    const experimentData = experimentIDs.map(id => data[id]);

    // retrieve and separate the input and output data averages
    const averageInputData = {};
    const averageOutputData = {};
    Object.keys(experimentData[0].inputs).forEach(inputKey => {
        averageInputData[inputKey] = d3.mean(experimentData, d => d.inputs[inputKey]);
    });
    Object.keys(experimentData[0].outputs).forEach(outputKey=> {
        averageOutputData[outputKey] = d3.mean(experimentData, d => d.outputs[outputKey]);
    });

    createBarChart("input-chart", averageInputData, "Inputs");
    createBarChart("output-chart", averageOutputData, "Outputs");
}

/* create a bar chart within containerID displaying data, titled title */
function createBarChart(containerID, data, title) {
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

/* converts the experiment ID to a more readable string */
function experimentIdToName(experimentID) {
    const Year = experimentID.substring(0, 4);
    const Month = experimentID.substring(4, 6);
    const Day = experimentID.substring(6, 8);
    const Number = experimentID.substring(13, 15);
    return `Experiment ${Number} (${Month}/${Day}/${Year})`;;
}


// /* create scatterplot based on output filters */
// function loadScatterplot(filteredExperiments, selectedOutputs) {
//     if (filteredExperiments.length == 0) {
//         alert("no matching experiments");
//         return;
//     }
//     d3.select("#scatterplot").html(""); // clear previous chart
//     const width = 600;
//     const height = 400;
//     const margin = { top: 20, right: 30, bottom: 50, left: 50 };

//     // create SVG container in the given container element
//     const svg = d3.select("#scatterplot")
//         .attr("width", width + margin.left + margin.right)
//         .attr("height", height + margin.top + margin.bottom);

//     // declare the x and y scales
//     const x = d3.scaleLinear()
//         .domain([0, filteredExperiments.length])
//         .range([margin.left, width - margin.right]);
//     const y = d3.scaleLinear()
//         .domain([
//             d3.min(filteredExperiments, d => Math.min(...selectedOutputs.map(o => d[1].outputs[o]))),
//             d3.max(filteredExperiments, d => Math.max(...selectedOutputs.map(o => d[1].outputs[o])))
//         ]) // set min and max height based on the filtered data
//         .range([height - margin.bottom, margin.top]);

//     // draw x and y axes
//     svg.append("g")
//         .attr("transform", `translate(0,${height - margin.bottom})`) // set x axis to bottom
//         .call(d3.axisBottom(x).tickFormat((d, i) => filteredExperiments[i][0])) // draw axis
//         .selectAll("text")
//         .attr("transform", "rotate(-30)") // rotate labels to prevent overlap
//         .style("text-anchor", "end"); // align text under x axis
//     svg.append("g")
//         .attr("transform", `translate(${margin.left},0)`) // set y axis to left
//         .call(d3.axisLeft(y));

//     const colorScale = d3.scaleOrdinal(d3.schemePastel1)
//         .domain(selectedOutputs); // scheme to assign each output type a diff color

//     // draw points for each filtered experiment value
//     selectedOutputs.forEach(output => {
//         svg.selectAll(`.dot-${output}`)
//             .data(filteredExperiments)
//             .enter()
//             .append("circle")
//             .attr("cx", (_, i) => x(i))
//             .attr("cy", d => y(d[1].outputs[output]))
//             .attr("r", 5)
//             .attr("fill", colorScale(output))
//             .attr("opacity", 0.9)
//             .on("mouseover", function(event, d) {
//                 const experimentName = experimentIdToName(d[0]);
//                 // on hover, add experiment name over the hovered dot
//                 svg.append("text")
//                     .attr("class", "dot-label")
//                     .attr("x", x(filteredExperiments.indexOf(d)))
//                     .attr("y", y(d[1].outputs[output]) - 10)
//                     .attr("font-size", "12px")
//                     .attr("fill", "black")
//                     .text(experimentName);  // Set text to the experiment name
//             })
//             .on("mouseout", function() {
//                 // on mouseout, remove all dot-labels
//                 svg.selectAll(".dot-label").remove();
//             })
//             .append("title")
//             .text(d => `${output}: ${d[1].outputs[output]}`);
//     });
// }