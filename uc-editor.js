const defaults = {
    "os-types": {
        "windows": {
            "friendly-name": "Windows",
            "version": "11"
        },
        "mac": {
            "friendly-name": "MacOS",
            "version": "14"
        },
        "ios": {
            "friendly-name": "iOS",
            "version": "16"
        },
        "android": {
            "friendly-name": "Android",
            "version": "15"
        },
        "appletvos": {
            "friendly-name": "AppleTV",
            "version": "16"
        }
    },
    "at-types": {
        "nvda": {
            "friendly-name": "NVDA",
            "version": "2024",
            "os-types": ["windows"]
        },
        "jaws": {
            "friendly-name": "JAWS",
            "version": "2024",
            "os-types": ["windows"]
        },
        "voiceover": {
            "friendly-name": "VoiceOver",
            "version": "same as OS version",
            "os-types": ["mac", "ios", "ipados", "applewatchos", "appletvos"]
        },
        "talkback": {
            "friendly-name": "Android",
            "version": "15",
            "os-types": ["android"],
        },
        "zoomtext": {
            "friendly-name": "ZoomText",
            "version": "2024",
            "os-types": ["windows"]
        },
        "zoom": {
            "friendly-name": "Zoom",
            "version": "Same as OS version",
            "os-types": ["mac", "ios", "ipados", "applewatchos", "appletvos"]
        },
        "dragon-ns": {
            "friendly-name": "Dragon NaturallySpeaking",
            "version": "18",
            "os-types": ["windows"]
        }
    },
    "scores": ["Not Rated", "Fail - Severe Accessibility Issues", "Fail - Major Accessibility Issues", "Pass - Minor Accessibility Issues", "Pass - Optimizations Suggested", "Pass - No Accessibility Issues"],
};

const fileopts = {
    types: [{
        description: "JSON file",
        accept: { "application/json": [".json"] }
    }]
};

var ucNumber = 0;
var evaluation = {
    "evalUCs": [],
    "score": 0
};
let fileHandle;
let currentStep = 0;
let currentIssue = 0;

class Issue {

    constructor(description = "", score = -1, findingURL = "") {
        this.description = description;
        this.score = score;
        this.findingURL = findingURL;
    }

}

class UseCase {

    constructor(args) {
        this.steps = args.steps || [];
        this.oses = args.oses || [];
        this.ats = args.ats || [];
        this.startlocation = args.startlocation || "";
        this.goal = args.goal || "";
        this.score = args.score || -1;
        this.tester = args.tester || "";
    }

}

class Evaluation {

    constructor(useCases, score) {
        this.useCases = useCases;
        this.score = score;
    }

}

function fillListbox(jobj, listboxid) {
    let lbx = document.getElementById(listboxid);
    let elem = null;

    if (Array.isArray(jobj)) {
        for (let i = 0; i < jobj.length; i++) {
            elem = document.createElement('option');
            elem.value = i;
            elem.textContent = jobj[i];
            lbx.appendChild(elem);
        }
    } else {
        for (let key in jobj) {
            elem = document.createElement('option');
            elem.name = key;
            elem.value = key;
            elem.textContent = jobj[key]["friendly-name"];
            lbx.appendChild(elem);
        }
    }
}

function editUseCaseButtonClicked(e) {
    let form = document.getElementById('uc-editor-form');
    form.classList.remove('inactive');
    let addStepButton = document.getElementById("uc-add-step");
    addStepButton.classList.remove("inactive");
    const selectUC = document.getElementById("select-uc");
    ucNumber = selectUC.value;
    populateEditor();
}

function newUseCaseButtonClicked(e) {
    let form = document.getElementById('uc-editor-form');
    form.classList.remove('inactive');
    let addStepButton = document.getElementById("uc-add-step");
    addStepButton.classList.remove("inactive");
    document.getElementById("uc-edit-name").focus();
}

async function loadFile() {
    const [filePicker] = await window.showOpenFilePicker(fileopts);
    const fp = await filePicker.getFile();
    const jobjtext = await fp.text();
    return JSON.parse(jobjtext);
}

async function loadEvalButtonClicked(e) {
    e.preventDefault();
    console.log("Calling loadFile...");
    const evalObj = await loadFile();
    console.log("File loaded");
    const ucNames = evalObj.evalUCs.map((uc) => uc.name);
    fillListbox(ucNames, "select-uc");
    evaluation = evalObj;
}

async function populateEditor() {
    let elem = null;
    let oslist, atlist;
    let uc = getCurrentUC();
    document.getElementById("uc-edit-startlocation").value = uc.startlocation;
    document.getElementById("uc-edit-name").focus();

    document.getElementById("uc-edit-name").value = uc.name;
    document.getElementById("uc-edit-goal").value = uc.goal;

    var osOptions = document.getElementById("uc-edit-oses");
    for (var i = 0; i < uc.oses.length; i++) {
        for (var j = 0; j < osOptions.length; j++) {
            if (uc.oses[i] == osOptions[j].textContent) {
                osOptions[j].selected = true;
            }
        }
    }
    var atOptions = document.getElementById("uc-edit-ats");
    for (var i = 0; i < uc.ats.length; i++) {
        for (var j = 0; j < atOptions.length; j++) {
            if (uc.ats[i] == atOptions[j].textContent) {
                atOptions[j].selected = true;
            }
        }
    }
    let form = document.getElementById("uc-editor-form");
    var stepDivs = form.querySelectorAll('div[id^="uc-step-div"]');
    console.log(`populateEditor stepDivs[0].id: ${stepDivs[0].id}`);
    console.log(`stepDivs.length: ${stepDivs.length}`);
    for (let i = 1; i < stepDivs.length; i++) {
        console.log(`populateEditor stepDivs[i].id: ${stepDivs[i].id}`);
        console.log(`uc.steps.length: ${uc.steps.length}`);
        stepDivs[i].remove();
    }
    for (let i = 0; i < uc.steps.length; i++) {
        if (i === 0) {
            document.getElementById("uc-step-contents[0]").textContent = uc.steps[i].instructions;
        } else {
            addStepToEditor(i);
        }
    }
}

function getCurrentUC() {
    return evaluation.evalUCs[ucNumber];
}

function performButtonClick(e) {
    populatePerform();
}

function populatePerform() {
    let uc = getCurrentUC();
    const performDialog = document.getElementById("perform-dialog");
    var stepDivs = performDialog .querySelectorAll('div[id^="uc-step-div"]');
    console.log(`populatePerform stepDivs[0].id: ${stepDivs[0].id}`);
    console.log(`stepDivs.length: ${stepDivs.length}`);
    for (let i = 1; i < stepDivs.length; i++) {
        console.log(`populatePerform stepDivs[i].id: ${stepDivs[i].id}`);
        console.log(`uc.steps.length: ${uc.steps.length}`);
        stepDivs[i].remove();
    }

    const performDialogClose = document.getElementById("perform-dialog-close");
    performDialog.showModal();
    performDialogClose.addEventListener("click", (e) => {
        e.preventDefault();
        performDialog.close();
    });
    let performForm = document.getElementById("uc-perform-dialog");
    performForm.reset();
    fillListbox(uc.oses, "uc-perform-oses");
    fillListbox(uc.ats, "uc-perform-ats");
    fillListbox(defaults["scores"], "uc-perform-score");
    document.getElementById("uc-perform-name").innerHTML = uc.name;
    document.getElementById("uc-perform-goal").innerHTML = uc.goal;
    var a = document.createElement('a');
    a.href = uc.startlocation;
    a.textContent = uc.startlocation;
    a.target = "_blank";
    var span = document.getElementById("uc-perform-startlocation");
    span.appendChild(a);
    document.getElementById("uc-perform-tester").addEventListener("blur", blurFormField);

    for (let i = 0; i < uc.steps.length; i++) {
        if (i === 0) {
            document.getElementById("uc-perform-step-contents[0]").textContent = uc.steps[i].instructions;
        } else {
            addStepToPerform(uc, i);
        }
    }
    let saveResultsButton = document.getElementById("uc-results-save");
    saveResultsButton.addEventListener("click", saveFileButtonClick);
    let viewResults = document.getElementById("uc-view-results");
    viewResults.addEventListener('click', createResultsTable);
    document.getElementById("uc-add-issue[0]").addEventListener('click', addIssueButtonClick);
    document.getElementById("uc-perform-tester").addEventListener('blur', blurFormField);
    populateIssuesList();
    updateAddIssueButtons();
}

function populateIssuesList() {
    let uc = getCurrentUC();
    uc.steps.forEach((step, index) => {
        const resultId = `uc-perform-step-results[${index}]`;
        let issueAggregateUl = document.getElementById(resultId);
        while (issueAggregateUl.firstChild) {
            issueAggregateUl.removeChild(issueAggregateUl.firstChild);
        }
        if (step.issues.length > 0) {
            step.issues.forEach((issue, i) => {
                let issueDescLi = document.createElement("LI");
                issueDescLi.innerHTML = issue.description;
                issueAggregateUl.appendChild(issueDescLi);
            });
        }
        else {
            let issueDescLi = document.createElement("LI");
            issueDescLi.innerHTML = "No issues";
            issueAggregateUl.appendChild(issueDescLi);
        }
    });
}

function updateAddIssueButtons() {
    let uc = getCurrentUC();
    const dialog = document.getElementById('perform-dialog');
    const addIssueButtons = dialog.querySelectorAll('button[id^="uc-add-issue"]');
    addIssueButtons.forEach((button, index) => {
        if (uc.steps[index].issues && uc.steps[index].issues.length == 1) {
            var issueStr = " Issue";
            button.innerHTML = "View " + uc.steps[index].issues.length + issueStr;
        }
        else if (uc.steps[index].issues && uc.steps[index].issues.length > 1) {
            var issueStr = " Issues";
            button.innerHTML = "View " + uc.steps[index].issues.length + issueStr;
        }
    });
}

function addIssueButtonClick(e) {
    e.preventDefault();
    const addIssueDialog = document.getElementById("add-issue-dialog");
    const addIssueClose = document.getElementById("add-issue-dialog-close");
    addIssueDialog.showModal();
    addIssueDialog.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            toggleAddIssue(e, addIssueDialog);
        }
    });

    addIssueClose.addEventListener("click", toggleAddIssue);
    var heading = document.getElementById("add-issue-dialog-title");
    currentStep = getStepNumber(e.target.id);
    let uc = getCurrentUC();
    if (uc.steps[currentStep].issues.length == 0) {
        heading.innerHTML = "Add Issue Step " + (currentStep + 1);
    }
    else {
        heading.innerHTML = "View Issue Step " + (currentStep + 1);
    }
    document.getElementById("add-issue-step-label").innerHTML = "Step " + String(currentStep + 1);
    document.getElementById("add-issue-step").innerHTML = uc.steps[currentStep].instructions;
    currentIssue = 0;
    updateIssueTable();
    let newIssue = document.getElementById("add-issue-dialog-new-issue");
    newIssue.addEventListener("click", newIssueButtonClick);
    if (uc.steps[currentStep].issues.length == 0) {
        newIssueButtonClick();
    }
}

function toggleAddIssue(e) {
    e.preventDefault();
    let issueStr = "";
    let uc = getCurrentUC();
    if (uc.steps[currentStep].issues && uc.steps[currentStep].issues.length == 1) {
        let addIssueId = "uc-add-issue[" + currentStep + "]";
        issueStr = " Issue ";
        document.getElementById(addIssueId).innerHTML = "View " + uc.steps[currentStep].issues.length + issueStr;
    }
    else if (uc.steps[currentStep].issues && uc.steps[currentStep].issues.length > 1) {
        let addIssueId = "uc-add-issue[" + currentStep + "]";
        issueStr = " Issues ";
        document.getElementById(addIssueId).innerHTML = "View " + uc.steps[currentStep].issues.length + issueStr;
    }
    let issueAggregate;
    uc.steps.forEach((step, index) => {
        const resultId = "uc-perform-step-results[" + index + "]";
        if (step.issues.length > 0) {
            issueAggregate = "";
            step.issues.forEach((issue, i) => {
                issueAggregate += issue.description + "\n\n";
            });
        }
        else {
            issueAggregate = "No issues";
        }
        document.getElementById(resultId).value = issueAggregate;
    });

    const dialog = document.getElementById("add-issue-dialog");
    dialog.close();
}

function updateIssueTable() {
    let issueTable = document.getElementById("add-issue-table");
    let rows = issueTable.rows;
    let uc = getCurrentUC();
    if (uc.steps[currentStep].issues.length === 0
        && rows.length === 1) {
        return;
    }
    else
        if (uc.steps[currentStep].issues.length === 0) {
            deleteIssueTable(issueTable);
            return;
        }
        else if ((uc.steps[currentStep].issues.length + 1) !== rows.length) {
            copyIssues2Table(issueTable);
            return;
        }

    for (let i = 0; i < rows.length; i++) {
        var row = rows[i + 1];
        var cells = row.cells;
        if (uc.steps[currentStep].issues[i].description !== cells[1].innerHTML
            || uc.steps[currentStep].issues[i].findingURL !== cells[2].innerHTML
            || uc.steps[currentStep].issues[i].score !== cells[3].innerHTML) {
            copyIssues2Table(issueTable);
        }
    }
}

function deleteIssueTable(issueTable) {
    var rows = issueTable.rows;

    for (let i = rows.length - 1; i > 0; i--) {
        issueTable.deleteRow(i);
    }
    return;
}

function newIssueButtonClick() {
    showAddIssueControls();
    let saveIssueButton = document.getElementById("add-issue-dialog-save");
    saveIssueButton.removeEventListener("click", editSaveIssueButtonClick);
    saveIssueButton.addEventListener("click", saveIssueButtonClick);
}

function showAddIssueControls() {
    let addIssueDiv = document.getElementById("add-issue-controls");
    addIssueDiv.classList.remove('inactive');
    fillListbox(defaults["scores"], "add-issue-score");
    document.getElementById("add-issue-dialog-new-issue").setAttribute("disabled", "true");
    document.getElementById("add-issue-dialog-save").classList.remove("inactive");
    document.getElementById("add-issue-description").value = "";
    document.getElementById("add-issue-findingURL").value = "";
    document.getElementById("add-issue-score").value = "";
    document.getElementById("add-issue-description").focus();
}

function hideAddIssueControls() {
    document.getElementById("add-issue-controls").classList.add("inactive");
    document.getElementById("add-issue-dialog-save").classList.add("inactive");
    document.getElementById("add-issue-dialog-new-issue").removeAttribute("disabled");
}

function saveIssueButtonClick(e) {
    e.preventDefault();
    let newIssue = {};
    let uc = getCurrentUC();
    newIssue.description = document.getElementById("add-issue-description").value;
    newIssue.findingURL = document.getElementById("add-issue-findingURL").value;
    newIssue.score = document.getElementById("add-issue-score").value;
    insertIssueTable(newIssue);
    uc.steps[currentStep].issues.push(newIssue);
    updateIssueList();
    document.getElementById("add-issue-msg").innerHTML = "";
    document.getElementById("add-issue-msg").innerHTML = "Issue successfully saved!";
    hideAddIssueControls();
    currentIssue = uc.steps[currentStep].issues.length;
}

function updateIssueList() {
    let uc = getCurrentUC();
    let issueList = document.getElementById(`uc-perform-step-results[${currentStep}]`);

    while (issueList.firstChild) {
        issueList.removeChild(issueList.firstChild);
    }
    if (uc.steps[currentStep].issues.length == 0) {
        let issueLI = document.createElement("LI");
        issueLI.innerHTML = "No issues";
        issueList.appendChild(issueLI);

    }
    else {
        for (let i = 0; i < uc.steps[currentStep].issues.length; i++) {
            let issueLI = document.createElement("LI");
            issueLI.innerHTML = uc.steps[currentStep].issues[i].description;
            issueList.appendChild(issueLI);
        }
    }
}

function editSaveIssueButtonClick(e) {
    e.preventDefault();
    let newIssue = {};
    let uc = getCurrentUC();
    newIssue.description = document.getElementById("add-issue-description").value;
    newIssue.findingURL = document.getElementById("add-issue-findingURL").value;
    newIssue.score = document.getElementById("add-issue-score").value;
    let issueTable = document.getElementById("add-issue-table");
    let row = issueTable.rows[currentIssue];
    console.log(`EditSaveIssueButtonClick row=${row.value}`);
    row.cells[1].innerText = newIssue.description;
    row.cells[2].innerText = newIssue.findingURL;
    row.cells[3].innerText = newIssue.score;
    uc.steps[currentStep].issues[currentIssue - 1] = newIssue;
    updateIssueList();
    document.getElementById("add-issue-msg").innerHTML = "";
    document.getElementById("add-issue-msg").innerHTML = "Issue successfully saved!";
    hideAddIssueControls();
    currentIssue = uc.steps[currentStep].issues.length;
}

function copyIssues2Table(issueTable) {
    deleteIssueTable(issueTable);
    let uc = getCurrentUC();
    let rows = issueTable.rows;
    for (let i = 0; i < uc.steps[currentStep].issues.length; i++) {
        insertIssueTable(uc.steps[currentStep].issues[i]);
    }
}

function insertIssueTable(newIssue) {
    var issueTable = document.getElementById("add-issue-table");
    var row = issueTable.insertRow(-1);
    var cell1 = row.insertCell(0);
    var cell2 = row.insertCell(1);
    var cell3 = row.insertCell(2);
    var cell4 = row.insertCell(3);
    var cell5 = row.insertCell(4);
    cell1.innerHTML = issueTable.rows.length - 1;
    cell2.innerHTML = newIssue.description;
    cell3.innerHTML = newIssue.findingURL;
    cell4.innerHTML = newIssue.score;
    const deleteIssueButton = document.createElement('button');
    deleteIssueButton.innerHTML = 'Delete';
    deleteIssueButton.type = "button";
    deleteIssueButton.addEventListener("click", deleteIssue);
    const editIssueButton = document.createElement('button');
    editIssueButton.innerHTML = 'Edit';
    editIssueButton.type = "button";
    editIssueButton.addEventListener("click", editIssue);
    cell5.appendChild(editIssueButton);
    cell5.appendChild(deleteIssueButton);
}

function editIssue(e) {
    const button = e.target;
    let row = button.parentNode.parentNode;
    let issueTable = row.parentNode.parentNode;
    currentIssue = row.rowIndex;
    row = issueTable.rows[currentIssue];
    showAddIssueControls();
    let saveIssueButton = document.getElementById("add-issue-dialog-save");
    saveIssueButton.removeEventListener("click", saveIssueButtonClick);
    saveIssueButton.addEventListener("click", editSaveIssueButtonClick);
    document.getElementById("add-issue-description").value = row.cells[1].innerText;
    document.getElementById("add-issue-findingURL").value = row.cells[2].innerText;
    document.getElementById("add-issue-score").value = row.cells[3].innerText;
    console.log(`EditIssue: rowIndex = ${rowIndex}`);
    document.getElementById("add-issue-msg").innerHTML = "";
    document.getElementById("add-issue-msg").innerHTML = "Editing issue " + (rowIndex);
    document.getElementById("add-issue-description").focus();
}

function deleteIssue(e) {
    const button = e.target;
    const row = button.parentNode.parentNode;
    let uc = getCurrentUC();
    let issueTable = row.parentNode.parentNode;
    const rowIndex = row.rowIndex;
    console.log(`Deleting row ${rowIndex}`);
    document.getElementById("add-issue-msg").innerHTML = "";
    document.getElementById("add-issue-msg").innerHTML = "Deleting issue " + rowIndex;
    issueTable.deleteRow(rowIndex);
    currentIssue = uc.steps[currentStep].issues.length;
    for (let i = 1; i < issueTable.rows.length; i++) {
        issueTable.rows[i].cells[0].innerHTML = i;
    }
    uc.steps[currentStep].issues.splice(rowIndex - 1, 1);
    updateIssueList();
    console.log(`issues length = ${uc.steps[currentStep].issues.length}`);
    console.log(`issueTable has ${issueTable.rows.length} rows`);
}

function addStepButtonClick(e) {
    e.preventDefault();
    let uc = getCurrentUC();
    var form = document.forms["ucEditor"];
    var br = document.createElement('BR');
    var ucDiv = document.createElement('DIV');
    uc.stepCount++;
    ucDiv.id = `uc-step-div[${stepCount}]`;
    console.log(`addStepButtonClick ucDiv.id: ${ucDiv.id}`);
    ucDiv.appendChild(br);
    ucDiv.appendChild(br);
    var newStepLabel = document.createElement('LABEL');
    newStepLabel.innerHTML = "Step " + uc.stepCount + " ";
    newStepLabel.setAttribute("style", "vertical-align:top");
    var newStep = document.createElement('TEXTAREA');
    var stepId = `uc-step-contents[${uc.stepCount}]`;
    newStep.classList.add("textarea");
    newStep.setAttribute("id", stepId);
    newStep.setAttribute("name", "steps");
    newStep.addEventListener('blur', blurFormField);
    newStepLabel.setAttribute("for", stepId);
    ucDiv.appendChild(newStepLabel);
    ucDiv.appendChild(newStep);
    form.appendChild(ucDiv);
    form.appendChild(br);
    form.appendChild(br);
    document.getElementById(newStep.id).focus();
}

function getStepId(stepNumber) {
    return `uc-step-contents[${stepNumber}]`;
}

function createStepLabelForEditor(stepNumber) {
    var newStepLabel = document.createElement('LABEL');
    newStepLabel.setAttribute("style", "vertical-align:top");
    newStepLabel.textContent = "Step " + (stepNumber + 1) + " ";
    newStepLabel.setAttribute('for', getStepId(stepNumber));
    return newStepLabel;
}

function createStepForEditor(stepNumber) {
    //console.log(stepNumber);
    let uc = getCurrentUC();
    var newStep = document.createElement('TEXTAREA');
    newStep.setAttribute("id", getStepId(stepNumber));
    newStep.value = uc.steps[stepNumber].instructions;
    newStep.addEventListener('blur', blurFormField);
    return newStep;
}

function appendNewlines(form) {
    form.appendChild(document.createElement("br"));
    form.appendChild(document.createElement("br"));
}

function addStepToEditor(stepNumber) {
    let form = document.forms["ucEditor"];
    let ucDiv = document.createElement("DIV");
    ucDiv.setAttribute("id", `uc-step-div[${stepNumber}]`);
    console.log(`addStepToEditor ucDiv.id: ${ucDiv.id}`);
    let newStepLabel = createStepLabelForEditor(stepNumber);
    let newStep = createStepForEditor(stepNumber);

    appendNewlines(form);
    ucDiv.appendChild(newStepLabel);
    ucDiv.appendChild(newStep);
    form.appendChild(ucDiv);
    appendNewlines(form);
}

function createStepLabelForPerform(stepNumber) {
    let newStepLabel = document.createElement('H3');
    newStepLabel.textContent = `Step ${stepNumber + 1}`;
    newStepLabel.setAttribute("id", getStepLabelIdForPerform(stepNumber));
    return newStepLabel;
}

function createStepInstructionsForPerform(stepNumber) {
    let uc = getCurrentUC();
    let newStep = document.createElement('P');
    newStep.setAttribute("id", `uc-perform-step-contents[${stepNumber}]`);
    newStep.textContent = uc.steps[stepNumber].instructions;
    return newStep;
}

function createIssueListHeading() {
    let issueListH4 = document.createElement('H4');
    issueListH4.innerHTML = "Issues";
    return issueListH4;
}

function createStepResultsForPerform(stepNumber) {
    let stepResults = document.createElement('UL');
    stepResults.setAttribute("id", `uc-perform-step-results[${stepNumber}]`);
    stepResults.setAttribute("name", "results");
    return stepResults;
}

function getStepLabelIdForPerform(stepNumber) {
    return `uc-step-label[${stepNumber}]`;
}

function createAddIssueButtonForPerform(stepNumber) {
    let addIssueButton = document.createElement('BUTTON');
    let stepLabelId = getStepLabelIdForPerform(stepNumber);
    addIssueButton.innerText = "Add Issue";
    addIssueButton.addEventListener('click', addIssueButtonClick);
    addIssueButton.setAttribute("id", `uc-add-issue[${stepNumber}]`);
    addIssueButton.setAttribute("aria-labelledby",
        `${addIssueButton.id} ${stepLabelId}`);
    return addIssueButton;
}

function addStepToPerform(uc, stepNumber) {
    let form = document.forms["ucPerformDialog"];
    let ucDiv = document.createElement("DIV");
    ucDiv.setAttribute("id", `uc-step-div[${stepNumber}`);
    console.log(`addStepToPerform ucDiv.id: ${ucDiv.id}`);
    let newStepLabel = createStepLabelForPerform(stepNumber);
    let newStep = createStepInstructionsForPerform(stepNumber);
    let issueListH4 = createIssueListHeading();
    let stepResults = createStepResultsForPerform(stepNumber);
    let addIssueButton = createAddIssueButtonForPerform(stepNumber);

    appendNewlines(form);
    ucDiv.appendChild(newStepLabel);
    ucDiv.appendChild(newStep);
    ucDiv.appendChild(issueListH4);
    ucDiv.appendChild(stepResults);
    appendNewlines(ucDiv);
    ucDiv.appendChild(addIssueButton);
    form.appendChild(ucDiv);
    appendNewlines(form);
}

function getStepNumber(stepId) {
    let begin = stepId.indexOf('[') + 1;
    let end = stepId.indexOf(']');
    let indexStr = stepId.slice(begin, end);
    return parseInt(indexStr);
}

function blurFormField(e) {
    let uc = evaluation.evalUCs[ucNumber];
    const stepNumber = getStepNumber(e.target.id);
    if (e.target.name === "steps") {
        uc.steps[stepNumber] = { instructions: e.target.value, issues: [] };
    } else if (e.target.name === "results") {
        uc.steps[stepNumber].results = e.target.value;
    } else {
        uc[e.target.name] = e.target.value;
    }
}

function changeFormField(e) {
    uc[e.target.name] = [];
    var selectedOptions = e.target.selectedOptions;
    for (var i = 0; i < selectedOptions.length; i++) {
        var optionText = selectedOptions[i].text;
        uc[e.target.name].push(optionText);
    }
}

async function saveFileButtonClick(e) {
    e.preventDefault();
    const fileHandle = await window.showSaveFilePicker(fileopts);
    const fp = await fileHandle.createWritable();
    await fp.write(JSON.stringify(evaluation));
    await fp.close();
}

function addFormEvents() {
    var form = document.forms["ucEditor"];
    form.addEventListener('submit', (e) => {
        e.preventDefault();
    });
    const formelements = form.elements;
    for (let element of formelements) {
        if (element.tagName == "INPUT" || element.tagName == "TEXTAREA") {
            element.addEventListener('blur', blurFormField);
        } else if (element.tagName == "SELECT") {
            element.addEventListener('change', changeFormField);
        }
    }
}

function copyToClipboard(e) {
    var ucText = JSON.stringify(uc);
    navigator.clipboard.writeText(ucText).then(() => {
        console.log('Use case data copied to clipboard');
    }).catch(err => {
        console.error('Error copying use case data: ', err);
    });
    localStorage.setItem("uc", ucText);
    document.getElementById("uc-perform-msg").innerHTML = "Use case data saved!";
}

function generateSummary() {
    let allIssues = issuesMap(getCurrentUC());

    let summaryText = "";
    let issueString = "";
    let banner = ["Stoppers:", "Major Issues:", "Minor Issues", "Advisory"];
    for (let score = 0; score < 4; score++) {
        issueString = issuesText(allIssues, score + 1);
        if (issueString != "") {
            summaryText += banner[score];
            summaryText += "\n";
            summaryText += issueString;
            summaryText += "\n\n";
        }
    }
    document.getElementById("uc-perform-general-comments").value = summaryText;
    uc.score = minimumScore(allIssues);
    document.getElementById("uc-perform-score").value = uc.score;
    document.getElementById("uc-perform-general-comments").focus();
}

function issuesMap(uc) {
    let allIssues = new Map();
    for (let i = 1; i < 5; i++) {
        allIssues.set(i, new Set());
    }
    for (let step of uc.steps) {
        for (let issue of step.issues) {
            insertIssue(allIssues, issue);
        }
    }
    return allIssues;
}

function minimumScore(allIssues) {
    let result = 5;
    for (let [score, issues] of allIssues) {
        if (issues.size > 0) {
            result = Math.min(result, score);
        }
    }
    return result;
}

function insertIssue(allIssues, issue) {
    allIssues.get(parseInt(issue.score)).add(issue.description);
}

function issuesText(allIssues, score) {
    return [...allIssues.get(parseInt(score))].join("\n\n");
}

function createResultsTable(e) {
    e.preventDefault();
    const viewResultsDialog = document.getElementById("view-results-dialog");
    const viewResultsDialogClose = document.getElementById("view-results-dialog-close");
    viewResultsDialog.showModal();
    viewResultsDialogClose.addEventListener("click", (e) => {
        e.preventDefault();
        viewResultsDialog.close();
    });
    let uc = getCurrentUC();
    document.getElementById("view-uc-ats-overall").textContent = uc.ats;
    uc.score = minimumScore(issuesMap(uc));
    document.getElementById("view-uc-score").textContent = uc.score;
    addTopIssues();
    document.getElementById("results-uc-name").innerHTML = uc.name;
    document.getElementById("results-uc-ats").innerHTML = uc.ats;
    document.getElementById("results-uc-goal").innerHTML = uc.goal;
    document.getElementById("results-uc-tester").innerHTML = uc.tester;
    document.getElementById("results-uc-startlocation").innerHTML = uc.startlocation;
    document.getElementById("results-uc-oses").innerHTML = uc.oses;

    var resultsTable = document.getElementById("view-results-table");
    var descriptionCell = "";
    var scoreCell = "";
    var banner = ["Stopper: ", "Major: ", "Minor: ", "Advisory: "];
    uc.steps.forEach((step, index) => {
        var row = resultsTable.insertRow(-1);
        var cell1 = row.insertCell(0);
        var cell2 = row.insertCell(1);
        var cell3 = row.insertCell(2);
        var cell4 = row.insertCell(3);
        cell1.innerHTML = index + 1;
        cell2.innerHTML = step.instructions;
        if (!step.issues || step.issues.length == 0) {
            scoreCell = "5";
            descriptionCell = "No issues";
        }
        step.issues.forEach((issue, index) => {
            scoreCell += issue.score + "<br>";
            descriptionCell += issue.description + "<br>";
        });
        cell3.innerHTML = scoreCell;
        cell4.innerHTML = descriptionCell;
        scoreCell = "";
        descriptionCell = "";
    });
}

function addTopIssues() {
    var topIssues = document.getElementById("view-uc-top-issues");
    let allIssues = issuesMap(getCurrentUC());
    const sortedIssues = [...allIssues.entries()].sort((a, b) => a[0] - b[0])
        .flatMap((entry) => [...entry[1]]);

    if (!sortedIssues || sortedIssues.length == 0) {
        var topIssue = document.createElement("li");
        topIssue.innerHTML = "No issues";
        topIssues.appendChild(topIssue);
        return;
    }
    for (let count = 0; count < 3 && count < sortedIssues.length; count++) {
        var topIssue = document.createElement("li");
        topIssue.innerHTML = sortedIssues[count];
        topIssues.appendChild(topIssue);
    }
}

function initialize() {
    const loadEvalButton = document.getElementById("eval-file-load");
    loadEvalButton.addEventListener("click", loadEvalButtonClicked);
    const editUseCaseButton = document.getElementById("edit-uc");
    editUseCaseButton.addEventListener("click", editUseCaseButtonClicked);
    const newUseCaseButton = document.getElementById("new-uc");
    newUseCaseButton.addEventListener("click", newUseCaseButtonClicked);
    fillListbox(defaults["os-types"], "uc-edit-oses");
    fillListbox(defaults["at-types"], "uc-edit-ats");
    addFormEvents();
    document.getElementById("uc-file-save").addEventListener('click', saveFileButtonClick);
    // document.getElementById("uc-file-load").addEventListener('click', loadFileButtonClick);
    document.getElementById("uc-file-save").removeAttribute("disabled");
    document.getElementById("uc-perform").addEventListener('click', performButtonClick);
    document.getElementById("uc-add-step").addEventListener('click', addStepButtonClick);
}

initialize();