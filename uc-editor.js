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

// the use case object loaded to or saved from the file. Contains all use case data.
var uc = { "steps": [], "stepCount": 1 };
let fileHandle;
let currentStep = 0;
let currentIssue = 0;
// fills a listbox with various types of use case-centric objects: scores, operating systems, assistive technologies
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
    uc.name = (jobj.name) ? jobj.name : "";
    uc.goal = (jobj.goal) ? jobj.goal : "";
    uc.startlocation = (jobj.startlocation) ? jobj.startlocation : "";
    uc.oses = (jobj.oses) ? jobj.oses : [];
    uc.ats = (jobj.ats) ? jobj.ats : [];
    uc.steps = (jobj.steps) ? jobj.steps : [];
    uc.stepCount = (jobj.stepCount) ? jobj.stepCount : "";
    document.getElementById("uc-edit-name").value = uc.name;
    document.getElementById("uc-edit-goal").value = uc.goal;
    document.getElementById("uc-edit-startlocation").value = uc.startlocation;
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
    for (let i = 0; i < uc.stepCount; i++) {
        if (i === 0) {
            document.getElementById("uc-step-contents[0]").textContent = uc.steps[i].instructions;
        } else {
            addStep2Perform(uc, i, "ucEditor");
        }
    }
    document.getElementById("uc-edit-name").focus();
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
    fillListbox(defaults["scores"], "uc-step-score");
    document.getElementById("uc-perform-name").innerHTML = uc.name;
    document.getElementById("uc-perform-goal").innerHTML = uc.goal;
    var a = document.createElement('a');
    a.href = uc.startlocation;
    a.textContent = uc.startlocation;
    a.target = "_blank";
    var span = document.getElementById("uc-perform-url");
    span.appendChild(a);
    for (let i = 0; i < uc.steps.length; i++) {
        if (i === 0) {
            document.getElementById("uc-perform-step-contents[0]").textContent = uc.steps[i].instructions;
            document.getElementById("uc-perform-step-results[0]").addEventListener("blur", blurFormField);
        } else {
            addStep2Perform(uc, i, "ucPerformDialog");
        }
    }
    var submitButton = document.getElementById("uc-perform-submit");
    submitButton.addEventListener('click', copyToClipboard);
    document.getElementById("uc-add-issue[0]").addEventListener('click', addIssueButtonClick);
    document.getElementById("uc-perform-tester").addEventListener('blur', blurFormField);
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
    heading.innerHTML = document.getElementById(e.target.id).textContent + " Step " + (currentStep + 1);
    document.getElementById("add-issue-step-label").innerHTML = "Step " + String(currentStep + 1);
    document.getElementById("add-issue-step").innerHTML = uc.steps[currentStep].instructions;
    currentIssue = 0;
    updateIssueTable();
    fillListbox(defaults["scores"], "add-issue-score");
    let previous = document.getElementById("add-issue-dialog-previous");
    previous.addEventListener("click", previousIssueButtonClick);
    let save = document.getElementById("add-issue-dialog-save");
    save.addEventListener("click", saveIssueButtonClick);
    let next = document.getElementById("add-issue-dialog-next");
    next.addEventListener("click", nextIssueButtonClick);
    document.getElementById("add-issue-description").focus();
}

function toggleAddIssue(e) {
    e.preventDefault();
    if (uc.steps[currentStep].issues && uc.steps[currentStep].issues.length > 0) {
        let addIssueId = "uc-add-issue[" + currentStep + "]";
        document.getElementById(addIssueId).innerHTML = "View Issue";
    }
    const dialog = document.getElementById("add-issue-dialog");
    dialog.close();
}

function updateIssueTable() {
    var issueTable = document.getElementById("add-issue-table");
    var rows = issueTable.rows;
    if (uc.steps[currentStep].issues.length === 0
        && rows.length === 1) {
        console.log("No issues and empty table");
        return;
    }
    else
        if (uc.steps[currentStep].issues.length === 0) {
            deleteIssueTable(issueTable);
            console.log("No issues and deleted previous issues from table");
            return;
        }
        else if ((uc.steps[currentStep].issues.length + 1) !== rows.length) {
            copyIssues2Table(issueTable);
            console.log("UpdateIssueTable: Number of issues != table rows");
            console.log(`# issues: ${uc.steps[currentStep].issues.length} != table rows ${rows.length}`);
            return;
        }

    for (let i = 0; i < rows.length; i++) {
        var row = rows[i + 1];
        var cells = row.cells;
        if (uc.steps[currentStep].issues[i].description !== cells[1].innerHTML
            || uc.steps[currentStep].issues[i].findingURL !== cells[2].innerHTML
            || uc.steps[currentStep].issues[i].score !== cells[3].innerHTML) {
            console.log("issue != table row");
            console.log(`${cells[0].innerHTML} ${cells[1].innerHTML} ${cells[2].innerHTML} ${cells[3].innerHTML}`);
            copyIssues2Table(issueTable);
        }
    }
}

function deleteIssueTable(issueTable) {
    var rows = issueTable.rows;

    for (let i = 1; i < rows.length; i++) {
        issueTable.deleteRow(i);
    }
    document.getElementById("add-issue-description").value = "";
    document.getElementById("add-issue-findingURL").value = "";
    document.getElementById("add-issue-score").value = 0;
    return;
}

function previousIssueButtonClick(e) {
    e.preventDefault();
    currentIssue--;
    document.getElementById("add-issue-msg").innerHTML = "Editing Issue " + (currentIssue + 1);
    document.getElementById("add-issue-description").focus();
    if (currentIssue === 0) {
        document.getElementById("add-issue-dialog-previous").setAttribute("disabled", true);
    }
    document.getElementById("add-issue-dialog-previous").removeAttribute("disabled");
    document.getElementById("add-issue-description").value = uc.steps[currentStep].issues[currentIssue].description;
    document.getElementById("add-issue-findingURL").value = uc.steps[currentStep].issues[currentIssue].findingURL;
    document.getElementById("add-issue-score").value = uc.steps[currentStep].issues[currentIssue].score;
}

function saveIssueButtonClick(e) {
    e.preventDefault();
    let newIssue = {};
    newIssue.description = document.getElementById("add-issue-description").value;
    newIssue.findingURL = document.getElementById("add-issue-findingURL").value;
    newIssue.score = document.getElementById("add-issue-score").value;
    if (currentIssue === uc.steps[currentStep].issues.length) {
        insertIssueTable(newIssue);
    } else {
        var issueTable = document.getElementById("add-issue-table");
        var issueRow = issueTable.rows[currentIssue + 1];
        issueRow.cells[0].innerHTML = parseInt(currentIssue + 1);
        issueRow.cells[1].innerHTML = newIssue.description;
        issueRow.cells[2].innerHTML = newIssue.findingURL;
        issueRow.cells[3].innerHTML = newIssue.score;
    }
    const ucIssues = uc.steps[currentStep].issues;
    if (currentIssue >= ucIssues.length) {
        ucIssues.push(newIssue);
    } else {
        ucIssues[currentIssue] = newIssue;
    }
    document.getElementById("add-issue-msg").innerHTML = "Issue " + (currentIssue + 1) + " successfully saved!";
}

function copyIssues2Table(issueTable) {
    deleteIssueTable(issueTable);
    var rows = issueTable.rows;
    console.log("Entering copyIssues2Table");
    for (let i = 0; i < uc.steps[currentStep].issues.length; i++) {
        console.log("inserting issues into table");
        console.log(`${uc.steps[currentStep].issues[i]}`);
        insertIssueTable(uc.steps[currentStep].issues[i]);
    }
    document.getElementById("add-issue-description").value = uc.steps[currentStep].issues[0].description;
    document.getElementById("add-issue-findingURL").value = uc.steps[currentStep].issues[0].findingURL;
    document.getElementById("add-issue-score").value = uc.steps[currentStep].issues[0].score;
}

function insertIssueTable(newIssue) {
    var issueTable = document.getElementById("add-issue-table");
    var row = issueTable.insertRow(-1);
    var cell1 = row.insertCell(0);
    var cell2 = row.insertCell(1);
    var cell3 = row.insertCell(2);
    var cell4 = row.insertCell(3);
    console.log(`currentIssue: ${currentIssue}`);
    cell1.innerHTML = currentIssue + 1;
    cell2.innerHTML = newIssue.description;
    cell3.innerHTML = newIssue.findingURL;
    cell4.innerHTML = newIssue.score;
}

function nextIssueButtonClick(e) {
    e.preventDefault();
    document.getElementById("add-issue-description").focus();
    currentIssue++;
    if (uc.steps[currentStep].issues && currentIssue > uc.steps[currentStep].issues.length) {
        document.getElementById("add-issue-dialog-next").setAttribute("disabled", true);
        document.getElementById("add-issue-msg").innerHTML = "Enter new issue";
        document.getElementById("add-issue-description").value = "";
        document.getElementById("add-issue-findingURL").value = "";
        document.getElementById("add-issue-score").value = 0;
    }
    else {
        document.getElementById("add-issue-dialog-next").removeAttribute("disabled");
        document.getElementById("add-issue-msg").innerHTML = "Editing issue " + (currentIssue + 1);
        document.getElementById("add-issue-description").value = uc.steps[currentStep].issues[currentIssue].description;
        document.getElementById("add-issue-findingURL").value = uc.steps[currentStep].issues[currentIssue].findingURL;
        document.getElementById("add-issue-score").value = uc.steps[currentStep].issues[currentIssue].score;
    }
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
        newStepLabel.textContent = ++stepNumber;
        var stepLabelId = "uc-step-label[" + i + "]";
        newStepLabel.setAttribute("id", stepLabelId);
        var newStep = document.createElement('P');
        var stepId = "uc-perform-step-contents[" + i + "]";
        newStep.setAttribute("id", stepId);
        newStep.textContent = uc.steps[i].instructions;
        var stepResults = document.createElement('TEXTAREA');
        var stepResultsId = "uc-perform-step-results[" + i + "]";
        stepResults.setAttribute("id", stepResultsId);
        stepResults.setAttribute("name", "results");
        stepResults.setAttribute('aria-labelledby', stepLabelId + " " + stepId);
        stepResults.addEventListener('blur', blurFormField);
        ucDiv.appendChild(newStepLabel);
        ucDiv.appendChild(newStep);
        ucDiv.appendChild(stepResults);
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
        console.log('Text copied to clipboard');
    }).catch(err => {
        console.error('Error copying text: ', err);
    });
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
