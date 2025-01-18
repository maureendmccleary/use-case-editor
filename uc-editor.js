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

var uc = { "steps": [], "stepCount": 1 };
var evaluation = { "uc": [], "score": 0};
let fileHandle;
let currentStep = 0;
let currentIssue = 0;
var allIssues = issuesMap();

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

async function loadFileButtonClick(e) {
    e.preventDefault();
    let fileHandle;
    let elem = null;
    let oslist, atlist;

    [fileHandle] = await window.showOpenFilePicker(fileopts);
    const fp = await fileHandle.getFile();
    const jobjtext = await fp.text();
    let jobj = JSON.parse(jobjtext);
    if (e.target.form.id == "uc-editor-form") {
        var idPrefix = "uc-edit-";
        uc.startlocation = (jobj.startlocation) ? jobj.startlocation : "";
        document.getElementById(idPrefix + "startlocation").value = uc.startlocation;
        document.getElementById("uc-edit-name").focus();
    }
    else {
        var idPrefix = "uc-perform-";
        uc.tester = (jobj.tester) ? jobj.tester : "";
        document.getElementById(idPrefix + "tester").value = uc.tester;
        document.getElementById("uc-perform-tester").focus();
    }

    uc.name = (jobj.name) ? jobj.name : "";
    uc.goal = (jobj.goal) ? jobj.goal : "";
    uc.oses = (jobj.oses) ? jobj.oses : [];
    uc.ats = (jobj.ats) ? jobj.ats : [];
    uc.steps = (jobj.steps) ? jobj.steps : [];
    uc.stepCount = (jobj.stepCount) ? jobj.stepCount : "";
    document.getElementById(idPrefix + "name").value = uc.name;
    document.getElementById(idPrefix + "goal").value = uc.goal;

    var osOptions = document.getElementById(idPrefix + "oses");
    for (var i = 0; i < uc.oses.length; i++) {
        for (var j = 0; j < osOptions.length; j++) {
            if (uc.oses[i] == osOptions[j].textContent) {
                osOptions[j].selected = true;
            }
        }
    }
    var atOptions = document.getElementById(idPrefix + "ats");
    for (var i = 0; i < uc.ats.length; i++) {
        for (var j = 0; j < atOptions.length; j++) {
            if (uc.ats[i] == atOptions[j].textContent) {
                atOptions[j].selected = true;
            }
        }
    }
    if (idPrefix == "uc-edit-") {
        for (let i = 0; i < uc.stepCount; i++) {
            if (i === 0) {
                document.getElementById("uc-step-contents[0]").textContent = uc.steps[i].instructions;
            } else {
                addStep2Perform(uc, i, "ucEditor");
            }
        }
    }
    else {
        populateForm();
    }
}

function performButtonClick(e) {
    e.preventDefault();
    const performDialog = document.getElementById("perform-dialog");
    const performDialogClose = document.getElementById("perform-dialog-close");
    performDialog.showModal();
    performDialogClose.addEventListener("click", (e) => {
        e.preventDefault();
        performDialog.close();
    });
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
            addStep2Perform(uc, i, "ucPerformDialog");
        }
    }

    var loadButton = document.getElementById("uc-results-load");
    loadButton.addEventListener('click', loadFileButtonClick);
    var generateSummaryButton = document.getElementById("uc-perform-generate-summary");
    generateSummaryButton.addEventListener('click', generateSummary);
    var viewResults = document.getElementById("uc-view-results");
    viewResults.addEventListener('click', createResultsTable);
    document.getElementById("uc-add-issue[0]").addEventListener('click', addIssueButtonClick);
    document.getElementById("uc-perform-tester").addEventListener('blur', blurFormField);
}

function populateForm() {
    uc.steps.forEach((step, index) => {
        const resultId = "uc-perform-step-results[" + index + "]";
        var issueAggregateUl = document.getElementById(resultId);
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
}

function toggleAddIssue(e) {
    e.preventDefault();
    let issueStr = "";
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
    var issueTable = document.getElementById("add-issue-table");
    var rows = issueTable.rows;
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
    console.log("Entering function newIssueButtonClick");
    createAddIssueControls();
    let saveIssueButton = document.createElement("button");
    saveIssueButton.innerHTML = "Save Issue";
    saveIssueButton.setAttribute("id", "add-issue-dialog-save");
    saveIssueButton.addEventListener("click", saveIssueButtonClick);
    let addIssueForm = document.getElementById("uc-add-issue-dialog-form");
    addIssueForm.appendChild(saveIssueButton);
}

function createAddIssueControls() {
    let addIssueDiv = document.getElementById("add-issue-controls");
    let issueDescriptionLabel = document.createElement("LABEL");
    issueDescriptionLabel.innerHTML = "Description";
    issueDescriptionLabel.setAttribute("id", "add-issue-description-label");
    let issueDescription = document.createElement("TEXTAREA");
    issueDescription.setAttribute("id", "add-issue-description");
    issueDescriptionLabel.setAttribute("for", "add-issue-description");
    addIssueDiv.appendChild(issueDescriptionLabel);
    addIssueDiv.appendChild(issueDescription);
    addIssueDiv.appendChild(document.createElement("br"));
    addIssueDiv.appendChild(document.createElement("br"));
    let issueFindingURLLabel = document.createElement("LABEL");
    issueFindingURLLabel.setAttribute("id", "add-issue-findingURL-label");
    issueFindingURLLabel.innerHTML = "Finding URL";
    let issueFindingURL = document.createElement("INPUT");
    issueFindingURL.setAttribute("id", "add-issue-findingURL");
    issueFindingURLLabel.setAttribute("for", "add-issue-findingURL");
    addIssueDiv.appendChild(issueFindingURLLabel);
    addIssueDiv.appendChild(issueFindingURL);
    addIssueDiv.appendChild(document.createElement("br"));
    addIssueDiv.appendChild(document.createElement("br"));
    let issueScoreLabel = document.createElement("LABEL");
    issueScoreLabel.setAttribute("id", "add-issue-score-label");
    issueScoreLabel.innerHTML = "Score";
    let issueScore = document.createElement("SELECT");
    issueScore.setAttribute("id", "add-issue-score");
    issueScoreLabel.setAttribute("for", "add-issue-score");
    addIssueDiv.appendChild(issueScoreLabel);
    addIssueDiv.appendChild(issueScore);
    fillListbox(defaults["scores"], "add-issue-score");
    addIssueDiv.appendChild(document.createElement("br"));
    addIssueDiv.appendChild(document.createElement("br"));
    document.getElementById("add-issue-description").focus();
}

function saveIssueButtonClick(e) {
    e.preventDefault();
    let newIssue = {};
    newIssue.description = document.getElementById("add-issue-description").value;
    newIssue.findingURL = document.getElementById("add-issue-findingURL").value;
    newIssue.score = document.getElementById("add-issue-score").value;
    insertIssueTable(newIssue);
    uc.steps[currentStep].issues.push(newIssue);
    document.getElementById("add-issue-msg").innerHTML = "";
    document.getElementById("add-issue-msg").innerHTML = "Issue successfully saved!";
    document.getElementById("add-issue-description-label").remove();
    document.getElementById("add-issue-description").remove();
    document.getElementById("add-issue-findingURL-label").remove();
    document.getElementById("add-issue-findingURL").remove();
    document.getElementById("add-issue-score-label").remove();
    document.getElementById("add-issue-score").remove();
    document.getElementById("add-issue-dialog-save").remove();
    currentIssue = uc.steps[currentStep].issues.length;
}

function editSaveIssueButtonClick(e) {
    e.preventDefault();
    let newIssue = {};
    newIssue.description = document.getElementById("add-issue-description").value;
    newIssue.findingURL = document.getElementById("add-issue-findingURL").value;
    newIssue.score = document.getElementById("add-issue-score").value;
    var issueTable = document.getElementById("add-issue-table");
    var row = issueTable.rows[currentIssue];
    console.log(`EditSaveIssueButtonClick row=${row.value}`);
    var cell1 = row.insertCell(0);
    var cell2 = row.insertCell(1);
    var cell3 = row.insertCell(2);
    var cell4 = row.insertCell(3);
    var cell5 = row.insertCell(4);
    cell1.innerHTML = currentIssue;
    cell2.innerHTML = newIssue.description;
    cell3.innerHTML = newIssue.findingURL;
    cell4.innerHTML = newIssue.score;
    uc.steps[currentStep].issues[currentIssue] = newIssue;
    document.getElementById("add-issue-msg").innerHTML = "";
    document.getElementById("add-issue-msg").innerHTML = "Issue successfully saved!";
    document.getElementById("add-issue-description-label").remove();
    document.getElementById("add-issue-description").remove();
    document.getElementById("add-issue-findingURL-label").remove();
    document.getElementById("add-issue-findingURL").remove();
    document.getElementById("add-issue-score-label").remove();
    document.getElementById("add-issue-score").remove();
    document.getElementById("add-issue-dialog-save-edit").remove();
    currentIssue = uc.steps[currentStep].issues.length;
}

function copyIssues2Table(issueTable) {
    deleteIssueTable(issueTable);
    var rows = issueTable.rows;
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
    const rowIndex = row.rowIndex;
    currentIssue = rowIndex;
    row = issueTable.rows[rowIndex];
    createAddIssueControls();
    let saveEditIssueButton = document.createElement("button");
    saveEditIssueButton.innerHTML = "Save Issue";
    saveEditIssueButton.setAttribute("id", "add-issue-dialog-save-edit");
    saveEditIssueButton.addEventListener("click", editSaveIssueButtonClick);
    let addIssueForm = document.getElementById("uc-add-issue-dialog-form");
    addIssueForm.appendChild(saveEditIssueButton);

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
    console.log(`issues length = ${uc.steps[currentStep].issues.length}`);
    console.log(`issueTable has ${issueTable.rows.length} rows`);
}

function addStepButtonClick(e) {
    e.preventDefault();
    var form = document.forms["ucEditor"];
    var br = document.createElement('BR');
    var ucDiv = document.createElement('DIV');
    ucDiv.appendChild(br);
    ucDiv.appendChild(br);
    var newStepLabel = document.createElement('LABEL');
    uc.stepCount++;
    newStepLabel.innerHTML = "Step " + uc.stepCount + " ";
    newStepLabel.setAttribute("style", "vertical-align:top");
    var newStep = document.createElement('TEXTAREA');
    var stepId = makeStepId("ucEditor");
    newStep.setAttribute("class", "step-contents");
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

function addStep2Perform(uc, i, formName) {
    var form = document.forms[formName];
    var br = document.createElement("br");
    var ucDiv = document.createElement("DIV");
    form.appendChild(br);
    form.appendChild(br);
    let stepNumber = i;
    if (formName === "ucEditor") {
        var newStepLabel = document.createElement('LABEL');
        newStepLabel.setAttribute("style", "vertical-align:top");
        newStepLabel.textContent = "Step " + ++stepNumber + " ";
        var newStep = document.createElement('TEXTAREA');
        var stepId = "uc-step-contents[" + i + "]";
        newStep.setAttribute("id", stepId);
        newStepLabel.setAttribute('for', stepId);
        newStep.value = uc.steps[i].instructions;
        newStep.addEventListener('blur', blurFormField);
        ucDiv.appendChild(newStepLabel);
        ucDiv.appendChild(newStep);
    } else {
        var newStepLabel = document.createElement('H3');
        newStepLabel.textContent = "Step " + ++stepNumber;
        var stepLabelId = "uc-step-label[" + i + "]";
        newStepLabel.setAttribute("id", stepLabelId);
        var newStep = document.createElement('P');
        var stepId = "uc-perform-step-contents[" + i + "]";
        newStep.setAttribute("id", stepId);
        newStep.textContent = uc.steps[i].instructions;
        var issueListH4 = document.createElement('H4');
        issueListH4.innerHTML = "Issues"
        var stepResults = document.createElement('UL');
        var stepResultsId = "uc-perform-step-results[" + i + "]";
        stepResults.setAttribute("id", stepResultsId);
        stepResults.setAttribute("name", "results");
        ucDiv.appendChild(newStepLabel);
        ucDiv.appendChild(newStep);
        ucDiv.appendChild(issueListH4);
        ucDiv.appendChild(stepResults);
        ucDiv.appendChild(br);
        ucDiv.appendChild(br);
        var addIssueButton = document.createElement('BUTTON');
        addIssueButton.innerText = "Add Issue";
        addIssueButton.addEventListener('click', addIssueButtonClick);
        addIssueButton.setAttribute("id", "uc-add-issue[" + i + "]");
        addIssueButton.setAttribute("aria-labelledby", addIssueButton.id + " " + newStepLabel.id);
        ucDiv.appendChild(addIssueButton);
    }
    form.appendChild(ucDiv);
    form.appendChild(br);
    form.appendChild(br);
}

function makeStepId(formName) {
    var len = uc.stepCount - 1;
    if (formName === "ucEditor") {
        return "uc-step-contents[" + len + "]";
    } else {
        return "uc-perform-step-contents[" + len + "]";
    }
}

function getStepNumber(stepId) {
    let begin = stepId.indexOf('[') + 1;
    let end = stepId.indexOf(']');
    let indexStr = stepId.slice(begin, end);
    return parseInt(indexStr);
}

function blurFormField(e) {
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
    await fp.write(JSON.stringify(uc));
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
    uc.score = 5;
    uc.steps.forEach((step, index) => {
        if (step.issues)
            step.issues.forEach((issue, index) => {
                if (issue.score < uc.score) {
                    uc.score = issue.score;
                }
                insertIssue(allIssues, issue);
            });
    });

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
    document.getElementById("uc-perform-score").value = uc.score;
    document.getElementById("uc-perform-general-comments").focus();
}

function issuesMap() {
    allIssues = new Map();
    for (let i = 1; i < 5; i++) {
        allIssues.set(i, new Set());
    }
    return allIssues;
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
    document.getElementById("view-uc-ats-overall").textContent = uc.ats;
    document.getElementById("view-uc-score").textContent = uc.score;
    addTopIssues();
    document.getElementById("results-uc-name").innerHTML = uc.name;
    document.getElementById("results-uc-ats").innerHTML = uc.ats;
    document.getElementById("results-uc-goal").innerHTML = uc.goal;
    document.getElementById("results-uc-tester").innerHTML = uc.tester;
    document.getElementById("results-uc-startlocation").innerHTML = uc.startlocation;
    document.getElementById("results-uc-oses").innerHTML = uc.oses;

    var resultsTable = document.getElementById("view-results-table");
    var issueCell = "";
    var banner = ["Stopper: ", "Major: ", "Minor: ", "Advisory: "];
    uc.steps.forEach((step, index) => {
        var row = resultsTable.insertRow(-1);
        var cell1 = row.insertCell(0);
        var cell2 = row.insertCell(1);
        var cell3 = row.insertCell(2);

        cell1.innerHTML = index + 1;
        cell2.innerHTML = step.instructions;
        if (!step.issues || step.issues.length == 0) {
            issueCell = "No issues";
        }
        step.issues.forEach((issue, index) => {
            issueCell += banner[issue.score - 1];
            issueCell += issue.description + "<br>";
        });
        cell3.innerHTML = issueCell;
        issueCell = "";
    });
}

function addTopIssues() {
    var topIssues = document.getElementById("view-uc-top-issues");
    let count = 0;
    const sortedIssues = [...allIssues.entries()].sort((a, b) => a[0] - b[0])
        .flatMap((entry) => [...entry[1]]);

    if (!sortedIssues && sortedIssues.length == 0) {
        var topIssue = document.createElement("li");
        topIssue.innerHTML = "No issues";
        topIssues.appendChild(topIssue);
        return;
    }
    while (count < 3) {
        var topIssue = document.createElement("li");
        topIssue.innerHTML = sortedIssues[count];
        topIssues.appendChild(topIssue);
        count++;
    }
}

function initialize() {
    fillListbox(defaults["os-types"], "uc-edit-oses");
    fillListbox(defaults["at-types"], "uc-edit-ats");
    addFormEvents();
    document.getElementById("uc-file-save").addEventListener('click', saveFileButtonClick);
    document.getElementById("uc-file-load").addEventListener('click', loadFileButtonClick);
    document.getElementById("uc-file-save").removeAttribute("disabled");
    document.getElementById("uc-perform").addEventListener('click', performButtonClick);
    document.getElementById("uc-add-step").addEventListener('click', addStepButtonClick);
}

initialize();