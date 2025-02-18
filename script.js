/* event handler for show data button to fetch data */
document.getElementById("show-data-btn").addEventListener("click", () => {
    fetch("data.json")
        .then(response => response.json()) // parse json data as a JS object
        .then(data => {
            displayData(data);
        })
        .catch(error => console.error("error while fetching data:", error));
});

/* function to visually display the data, called on show data btn click */
function displayData(data) {
    const dataDiv = document.getElementById("data");
    dataDiv.innerHTML = ""; // clear current display
    dataDiv.classList.add("show");

    // show data for each experiment
    Object.keys(data).forEach(experiment => {
        const experimentDiv = document.createElement("div");
        const experimentTitle = document.createElement("h2");
        experimentTitle.textContent = experiment;
        experimentDiv.classList.add("experiment");


        const inputsList = listData("inputs:", data[experiment].inputs);
        const outputsList = listData("outputs:", data[experiment].outputs);

        experimentDiv.appendChild(experimentTitle);
        experimentDiv.appendChild(inputsList);
        experimentDiv.appendChild(outputsList);

        dataDiv.appendChild(experimentDiv);
    })   
}

/* data display function to create input/output lists */
function listData(datatype, obj) {
    const datatypeDiv = document.createElement("div");
    const dataTypeTitle = document.createElement("h3");
    dataTypeTitle.textContent = datatype;
    datatypeDiv.append(dataTypeTitle)

    const list = document.createElement("ul");
    Object.entries(obj).forEach(([key, value]) => {
        const listEntry = document.createElement("li");
        listEntry.textContent = `${key}: ${value}`;
        list.appendChild(listEntry);
    });
    datatypeDiv.appendChild(list)
    return datatypeDiv;
}