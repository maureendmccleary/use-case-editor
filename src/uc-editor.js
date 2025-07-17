import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

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
    }],
    excludeAcceptAllOption: true
};

var ucNumber = 0;
var evaluation = {
    "evalUCs": [],
    "score": 0
};
let fileHandle;
let currentStep = 0;
let currentIssue = 0;

/**
 * 
 * @returns an empty Use Case (UC) object
 * e.g. let uc = emptyUC();
 */
function emptyUC() {
    return {
        steps: [],
        comments: [],
        oses: [],
        ats: [],
        name: "",
        startlocation: "",
        goal: "",
        score: -1,
        tester: ""
    };
}

function fillCheckboxMenu(jobj, checkboxMenuId, name) {
    let checkBoxMenu = document.getElementById(checkboxMenuId);
    let checkBox = null;

    for (let key in jobj) {
        checkBox = document.createElement('input');
        checkBox.type = "checkbox";
        checkBox.name = name;
        checkBox.value = jobj[key]["friendly-name"];
        checkBox.id = `uc-edit-${key}-chk`;
        let checkLabel = document.createElement("label");
        checkLabel.textContent = jobj[key]["friendly-name"];
        checkLabel.htmlFor = checkBox.id;
        checkLabel.appendChild(checkBox);
        checkBoxMenu.appendChild(checkLabel);
        checkBoxMenu.appendChild(document.createElement("br"));
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

function renderEvalResults() {
    let overallCommentsDiv = document.getElementById("eval-view-significant-issues");
    overallCommentsDiv.innerHTML = "";
    const unorderedList = createUnorderedList(evaluation.comments);
    overallCommentsDiv.appendChild(unorderedList);
    let parentDiv = document.getElementById("eval-view-use-case-issues");
    parentDiv.innerHTML = "";

    evaluation.evalUCs.forEach(uc => {
        let resultsDiv = document.createElement("div");
        resultsDiv = createResultsTable(uc, resultsDiv);
        parentDiv.appendChild(resultsDiv);
    });
}

function evalViewResultsButtonClicked(e) {
    e.preventDefault();
    const evalViewResultsDialog = document.getElementById("eval-view-results-dialog");
    const evalViewResultsDialogClose = document.getElementById("eval-view-results-dialog-close");
    evalViewResultsDialog.showModal();
    evalViewResultsDialogClose.addEventListener("click", (e) => {
        e.preventDefault();
        evalViewResultsDialog.close();
    });
    renderEvalResults();
    let overallCommentsBtn = document.getElementById("view-overall-comments");
    overallCommentsBtn.addEventListener("click", overallCommentsClicked);
    const generatePDFBtn = document.getElementById("generate-pdf");
    generatePDFBtn.addEventListener("click", renderEvalResultsPDF);
}

function editUseCaseButtonClicked(e) {
    let form = document.getElementById('uc-editor-form');
    form.classList.remove('inactive');
    let newStepButton = document.getElementById("uc-new-step");
    newStepButton.classList.remove("inactive");
    const selectUC = document.getElementById("select-uc");
    ucNumber = selectUC.value;
    populateEditor();
}

function newUseCaseButtonClicked(e) {
    let form = document.getElementById('uc-editor-form');
    form.classList.remove('inactive');
    let newStepButton = document.getElementById("uc-new-step");
    newStepButton.classList.remove("inactive");
    ucNumber = evaluation.evalUCs.length;
    const newUC = emptyUC();
    evaluation.evalUCs[ucNumber] = newUC;
    populateEditor();
    document.getElementById("uc-edit-name").focus();
}

async function loadFile() {
    const pickerOpts = {
        types: [
            {
                description: "JSON Files",
                accept: {
                    "application/json": [".json"],
                },
            },
        ],
        excludeAcceptAllOption: true,
        multiple: false,
        startIn: "documents"
    };

    const [filePicker] = await window.showOpenFilePicker(pickerOpts);
    const fp = await filePicker.getFile();
    const jobjtext = await fp.text();
    return JSON.parse(jobjtext);
}

async function loadEvalButtonClicked(e) {
    e.preventDefault();
    console.log("Calling loadEvalButtonClicked");
    const evalObj = await loadFile();
    console.log("eval File loaded");
    const ucNames = evalObj.evalUCs.map((uc) => uc.name);
    fillListbox(ucNames, "select-uc");
    evaluation = evalObj;
    if (!Array.isArray(evaluation.comments)) evaluation.comments = [];
    document.getElementById("evaluation-msg").innerHTML = "";
    document.getElementById("evaluation-msg").innerHTML = "Evaluation data loaded!";
}

async function populateEditor() {
    let elem = null;
    let oslist, atlist;
    let uc = getCurrentUC();
    document.getElementById("uc-edit-startlocation").value = uc.startlocation;
    document.getElementById("uc-edit-name").focus();
    document.getElementById("uc-edit-name").value = uc.name;
    document.getElementById("uc-edit-goal").value = uc.goal;

    const osMenuBtn = document.getElementById('uc-edit-oses-btn');
    osMenuBtn.addEventListener("click", toggleMenu);
    var osMenu = document.getElementById("uc-edit-oses-menu");
    var osOptions = osMenu.querySelectorAll("label");

    for (var i = 0; i < uc.oses.length; i++) {
        for (var j = 0; j < osOptions.length; j++) {
            var checkbox = osOptions[j].querySelector("input[type='checkbox']");
            if (uc.oses[i] === osOptions[j].textContent.trim()) {
                checkbox.checked = true;
            }
        }
    }
    osMenu.addEventListener('keydown', (e) => {
        if (e.key === "Escape") {
            osMenuBtn.setAttribute("aria-expanded", "false");
            osMenu.hidden = true;
            osMenuBtn.focus(); // Return focus to button
        }
    });
    const atMenuBtn = document.getElementById('uc-edit-ats-btn');
    atMenuBtn.addEventListener("click", toggleMenu);
    var atMenu = document.getElementById("uc-edit-ats-menu");
    var atOptions = atMenu.querySelectorAll("label");

    for (var i = 0; i < uc.ats.length; i++) {
        for (var j = 0; j < atOptions.length; j++) {
            var checkbox = atOptions[j].querySelector("input[type='checkbox']");
            if (uc.ats[i] === atOptions[j].textContent.trim()) {
                checkbox.checked = true;
            }
        }
    }
    atMenu.addEventListener('keydown', (e) => {
        if (e.key === "Escape") {
            atMenuBtn.setAttribute("aria-expanded", "false");
            atMenu.hidden = true;
            atMenuBtn.focus(); // Return focus to button
        }
    });
    let stepParentDiv = document.getElementById("uc-step-parent-div");
    stepParentDiv.innerHTML = "";
    let populatedDiv = document.createElement("div");
    populatedDiv = renderSteps(uc);
    stepParentDiv.appendChild(populatedDiv);
    let summaryList = document.getElementById("summary-list");
    while (summaryList.firstChild) {
        summaryList.removeChild(summaryList.firstChild);
    }
    if (uc.comments && uc.comments.length > 0) {
        uc.comments.forEach((comment, i) => {
            let summaryLi = document.createElement("LI");
            summaryLi.innerHTML = comment;
            summaryList.appendChild(summaryLi);
        });
    }
    else {
        let summaryLi = document.createElement("LI");
        summaryLi.innerHTML = "No Issues";
        summaryList.appendChild(summaryLi);
    }
}

function toggleMenu(e) {
    const isExpanded = e.target.getAttribute('aria-expanded') === 'true';

    e.target.setAttribute('aria-expanded', !isExpanded);
    const controlsTargetId = e.target.getAttribute("aria-controls");
    const controlsTarget = document.getElementById(controlsTargetId);
    controlsTarget.hidden = isExpanded;
}

function renderSteps(uc) {
    let stepParentDiv = document.createElement("div");

    for (let i = 0; i < uc.steps.length; i++) {
        let stepDiv = document.createElement("div");
        stepDiv = addStepToEditor(i);
        stepParentDiv.appendChild(stepDiv);
    }
    return stepParentDiv;
}

function deleteStepButtonClicked(e) {
    let stepId = e.target.id;
    let uc = getCurrentUC();
    let i = getStepNumber(stepId);
    uc.steps.splice(i, 1);
    let stepParentDiv = document.getElementById("uc-step-parent-div");
    let newDiv = document.createElement("div");
    stepParentDiv.innerHTML = "";
    newDiv = renderSteps(uc);
    stepParentDiv.appendChild(newDiv);
    document.getElementById("uc-editor-msg").innerHTML = "";
    document.getElementById("uc-editor-msg").innerHTML = `Step ${(i + 1)} was successfully deleted!`;
    if (uc.steps.length <= i) {
        let lastStepId = getStepId(uc.steps.length - 1);
        document.getElementById(lastStepId).focus();
    }
    else {
        let nextStepId = getStepId(i);
        document.getElementById(nextStepId).focus();

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
    var stepDivs = performDialog.querySelectorAll('div[id^="uc-step-div"]');
    for (let i = 1; i < stepDivs.length; i++) {
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
    viewResults.addEventListener('click', viewResultsButtonClicked);
    let viewSummaryBtn = document.getElementById("view-summary");
    viewSummaryBtn.addEventListener('click', viewSummaryButtonClicked);

    document.getElementById("uc-add-issue[0]").addEventListener('click', addIssueButtonClick);
    document.getElementById("uc-perform-tester").addEventListener('blur', blurFormField);
    populateIssuesList();
    updateAddIssueButtons();
    let score = document.getElementById("uc-perform-score");
    score.value = minimumScore(issuesMap(uc));
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
    document.getElementById("add-issue-msg").innerHTML = "";
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
    let score = document.getElementById("uc-perform-score");
    score.value = minimumScore(issuesMap(uc));
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
            clearTable(issueTable);
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
    clearTable(issueTable);
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
    cell1.setAttribute("style", "text-align: center");
    cell1.innerHTML = issueTable.rows.length - 1;
    cell2.innerHTML = newIssue.description;
    cell3.innerHTML = newIssue.findingURL;
    cell4.innerHTML = newIssue.score;
    cell4.setAttribute("style", "text-align: center");
    const deleteIssueButton = document.createElement('button');
    deleteIssueButton.setAttribute("aria-label", "delete");
    const deleteIssueIcon = document.createElement("span");
    deleteIssueIcon.classList.add("fa", "fa-trash");
    deleteIssueButton.appendChild(deleteIssueIcon);
    deleteIssueButton.type = "button";
    deleteIssueButton.addEventListener("click", deleteIssue);
    const editIssueButton = document.createElement('button');
    editIssueButton.setAttribute("aria-label", "edit");
    const editIssueIcon = document.createElement("span");
    editIssueIcon.classList.add("fa", "fa-edit");
    editIssueButton.appendChild(editIssueIcon);
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
    document.getElementById("add-issue-msg").innerHTML = "";
    document.getElementById("add-issue-msg").innerHTML = "Deleting issue " + rowIndex;
    issueTable.deleteRow(rowIndex);
    currentIssue = uc.steps[currentStep].issues.length;
    for (let i = 1; i < issueTable.rows.length; i++) {
        issueTable.rows[i].cells[0].innerHTML = i;
    }
    uc.steps[currentStep].issues.splice(rowIndex - 1, 1);
    updateIssueList();
}

function newStepButtonClick(e) {
    e.preventDefault();
    let newStepDialog = document.getElementById("uc-new-step-dialog");
    let uc = getCurrentUC();
    const newStepCloseBtn = document.getElementById("new-step-dialog-close");
    newStepDialog.showModal();
    newStepCloseBtn.addEventListener("click", (e) => {
        e.preventDefault();
        newStepDialog.close();
    });
    let numbers = [];
    for (let i = 1; i <= uc.steps.length + 1; i++) {
        numbers.push(i);
    }
    document.getElementById("step-number").innerHTML = "";
    fillListbox(numbers, "step-number");
    let stepNumberCmb = document.getElementById("step-number");
    stepNumberCmb.selectedIndex = numbers.length - 1;

    let addStepBtn = document.getElementById("add-step");
    addStepBtn.addEventListener("click", addStepButtonClicked);
}

function addStepButtonClicked(e) {
    let newStepDialog = document.getElementById("uc-new-step-dialog");
    newStepDialog.close();
    let uc = getCurrentUC();
    let newStep = { instructions: "", issues: [] };
    let i = document.getElementById("step-number").value;
    uc.steps.splice(i, 0, newStep);
    let stepParentDiv = document.getElementById("uc-step-parent-div");
    stepParentDiv.innerHTML = "";
    let populatedDiv = document.createElement("div");
    populatedDiv = renderSteps(uc);
    stepParentDiv.appendChild(populatedDiv);

    let stepId = getStepId(i);
    document.getElementById(stepId).focus();
}

function getStepId(stepNumber) {
    return `uc-step-contents[${stepNumber}]`;
}

function createStepLabelForEditor(stepNumber) {
    var newStepLabel = document.createElement('LABEL');
    newStepLabel.setAttribute("style", "vertical-align:top");
    newStepLabel.textContent = "Step " + (stepNumber + 1) + " ";
    let newStepLabelId = `uc-step-label[${stepNumber}]`;
    newStepLabel.setAttribute("id", newStepLabelId);
    newStepLabel.setAttribute('for', getStepId(stepNumber));
    return newStepLabel;
}

function createStepForEditor(stepNumber) {
    let uc = getCurrentUC();
    var newStep = document.createElement('TEXTAREA');
    newStep.setAttribute("id", getStepId(stepNumber));
    newStep.setAttribute("class", "step-contents");
    newStep.value = uc.steps[stepNumber].instructions;
    newStep.setAttribute("name", "steps");
    newStep.addEventListener('blur', blurFormField);
    return newStep;
}

function appendNewlines(div) {
    div.appendChild(document.createElement("br"));
    div.appendChild(document.createElement("br"));
}

function addStepToEditor(stepNumber) {
    let stepDiv = document.createElement("DIV");
    stepDiv.setAttribute("id", `uc-step-div[${stepNumber}]`);
    let newStepLabel = createStepLabelForEditor(stepNumber);
    let newStep = createStepForEditor(stepNumber);
    let deleteBtn = document.createElement("button");
    deleteBtn.setAttribute("id", `uc-step-delete[${stepNumber}]`);
    deleteBtn.setAttribute("aria-label", "delete");
    let deleteIcon = document.createElement("span");
    deleteIcon.classList.add("fa", "fa-trash");
    deleteBtn.appendChild(deleteIcon);
    deleteBtn.addEventListener("click", deleteStepButtonClicked);
    deleteBtn.setAttribute("aria-labelledby", `${deleteBtn.id} ${newStepLabel.id}`);
    appendNewlines(stepDiv);
    stepDiv.appendChild(newStepLabel);
    stepDiv.appendChild(newStep);
    stepDiv.appendChild(deleteBtn);
    appendNewlines(stepDiv);
    return stepDiv;
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
    addIssueButton.setAttribute("aria-labelledby", `${addIssueButton.id} ${stepLabelId}`);
    return addIssueButton;
}

function addStepToPerform(uc, stepNumber) {
    let form = document.forms["ucPerformDialog"];
    let ucDiv = document.createElement("DIV");
    ucDiv.setAttribute("id", `uc-step-div[${stepNumber}`);
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
    let uc = evaluation.evalUCs[ucNumber];
    console.log(`e.target.name = ${e.target.name}`);
    console.log(`e.target.value = ${e.target.value}`);
    if
        (e.target.checked && !uc[e.target.name].includes(e.target.value)) {
        uc[e.target.name].push(e.target.value);
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
        if (element.tagName === "INPUT" && element.type !== "checkbox" || element.tagName == "TEXTAREA") {
            element.addEventListener('blur', blurFormField);
        } else if (element.tagName === "INPUT" && element.type === "checkbox") {
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

function viewSummaryButtonClicked(e) {
    e.preventDefault();
    const viewSummaryDialog = document.getElementById("view-summary-dialog");
    viewSummaryDialog.showModal();
    const viewSummaryDialogClose = document.getElementById("view-summary-dialog-close");
    viewSummaryDialogClose.addEventListener("click", (e) => {
        e.preventDefault();
        viewSummaryDialog.close();
    });

    let generateSummaryBtn = document.getElementById("generate-summary");
    generateSummaryBtn.addEventListener("click", generateSummaryClicked);
    let saveSummaryBtn = document.getElementById("general-comments-save");
    saveSummaryBtn.addEventListener("click", saveGeneralComments);
    let uc = getCurrentUC();
    if (uc.comments.length > 0) {
        document.getElementById("general-comments").value = uc.comments.join("\n\n");
    }
}

function generateSummaryClicked(e) {
    let uc = getCurrentUC();
    generateSummary(uc);
}

function overallCommentsSaveClicked(e) {
    e.preventDefault();
    const overallCommentsTextarea = document.getElementById("overall-comments");
    evaluation.comments = overallCommentsTextarea.value.split("\n\n")
        .map(comment => comment.trim())
        .filter(comment => comment !== "");

    renderEvalResults();
}

function overallCommentsClicked(e) {
    e.preventDefault();
    const overallCommentsDialog = document.getElementById("view-overall-comments-dialog");
    const overallCommentsDialogClose = document.getElementById("view-overall-comments-dialog-close");
    const generateOverallCommentsBtn = document.getElementById("generate-overall-comments");
    const overallCommentsSaveBtn = document.getElementById("overall-comments-save");
    generateOverallCommentsBtn.addEventListener("click", generateOverallComments);
    overallCommentsSaveBtn.addEventListener("click", overallCommentsSaveClicked);
    overallCommentsDialogClose.addEventListener("click", (e) => {
        e.preventDefault();
        overallCommentsDialog.close();
    });
    overallCommentsDialog.showModal();
    const overallCommentsTextarea = document.getElementById("overall-comments");
    let commentsText = "";
    if (evaluation.comments) {
        commentsText = evaluation.comments.join("\n\n");
    }
    else {
        commentsText = "";

        evaluation.evalUCs.forEach((uc, ucIndex) => {
            commentsText += `${ucIndex + 1}. ${uc.name}\n\n`;
            if (!Array.isArray(uc.comments) || uc.comments.length === 0) {
                commentsText += "No issues.";
            } else {
                commentsText += uc.comments.join("\n\n");
            }
            commentsText += "\n\n";
        });
    }
    overallCommentsTextarea.value = commentsText;
}

function generateOverallComments(e) {
    e.preventDefault();
    const overallCommentsTextarea = document.getElementById("overall-comments");
    let commentsText = "";
    evaluation.evalUCs.forEach((uc, ucIndex) => {
        commentsText += `${ucIndex + 1}. ${uc.name}\n\n`;
        if (!Array.isArray(uc.comments) || uc.comments.length === 0) {
            commentsText += "No issues.";
        } else {
            commentsText += uc.comments.join("\n\n");
        }
        commentsText += "\n\n";
    });

    overallCommentsTextarea.value = commentsText;
    overallCommentsTextarea.focus();
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
    document.getElementById("general-comments").value = summaryText;
    let uc = getCurrentUC();
    uc.score = minimumScore(allIssues);
    document.getElementById("uc-perform-score").value = uc.score;
    document.getElementById("general-comments").focus();
}

function saveGeneralComments(e) {
    e.preventDefault();
    let uc = getCurrentUC();
    let summaryList = document.getElementById("summary-list");
    while (summaryList.firstChild) {
        summaryList.removeChild(summaryList.firstChild);
    }
    let commentSummary = document.getElementById("general-comments").value.trim();
    if (commentSummary === "") {
        uc.comments.length = 0;
        let summaryLi = document.createElement("LI");
        summaryLi.innerHTML = "No Issues";
        summaryList.appendChild(summaryLi);
    }
    else {
        let commentsWithoutBanners = commentSummary.replace(/Stoppers|Major Issues|Minor Issues|Advisory/g, "").trim();
        let comments = commentsWithoutBanners.split("\n\n");
        uc.comments = comments;
        uc.comments.forEach((c, i) => {
            let summaryLi = document.createElement("LI");
            summaryLi.innerHTML = c;
            summaryList.appendChild(summaryLi);
        });
    }
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

function viewResultsButtonClicked(e) {
    e.preventDefault();
    const viewResultsDialog = document.getElementById("view-results-dialog");
    const viewResultsDialogClose = document.getElementById("view-results-dialog-close");
    viewResultsDialog.showModal();
    viewResultsDialogClose.addEventListener("click", (e) => {
        e.preventDefault();
        viewResultsDialog.close();
    });
    let parentDiv = document.getElementById("uc-view-significant-issues");
    parentDiv.innerHTML = "";
    let uc = getCurrentUC();
    let resultsDiv = document.createElement("div");
    createResultsTable(uc, resultsDiv);
    parentDiv.appendChild(resultsDiv);
}

function createUnorderedList(listItems, emptyText) {
    if (!Array.isArray(listItems) || listItems.length === 0) {
        const paragraphElem = document.createElement("p");
        paragraphElem.textContent = emptyText;
        return paragraphElem;
    }

    const list = document.createElement("ul");
    listItems.forEach(item => {
        const itemNode = document.createElement("li");
        itemNode.textContent = item;
        list.appendChild(itemNode);
    });

    return list;
}

function createResultsTable(uc, resultsDiv) {
    let ucName = document.createElement("h2");
    ucName.innerHTML = `Detailed Use Case Results: ${uc.name}`;
    resultsDiv.appendChild(ucName);
    let p2 = document.createElement("p");
    p2.innerHTML = `Assistive Technology: ${uc.ats}<br>`;
    p2.innerHTML += `Goal: ${uc.goal}<br>`;
    p2.innerHTML += `Operator: ${uc.tester}<br>`;
    p2.innerHTML += `Start Location: ${uc.startlocation}<br>`;
    p2.innerHTML += `Operating System: ${uc.oses}<br><br>`;
    resultsDiv.appendChild(p2);
    var resultsTable = document.createElement("table");
    var rowHeading = resultsTable.insertRow(-1);
    var stepNumberCol = document.createElement("th");
    stepNumberCol.setAttribute('scope', 'col');
    stepNumberCol.innerHTML = "#";
    rowHeading.appendChild(stepNumberCol);
    var stepCol = document.createElement("th");
    stepCol.setAttribute('scope', 'col');
    stepCol.innerHTML = "Main Success Case";
    rowHeading.appendChild(stepCol);
    var scoreCol = document.createElement("th");
    scoreCol.setAttribute('scope', 'col');
    scoreCol.innerHTML = "Score";
    rowHeading.appendChild(scoreCol);
    var issueCol = document.createElement("th");
    issueCol.setAttribute('scope', 'col');
    issueCol.innerHTML = "Issues Encountered";
    rowHeading.appendChild(issueCol);
    var descriptionCell = "";
    var scoreTotal = 0;
    uc.steps.forEach((step, index) => {
        var row = resultsTable.insertRow(-1);
        var cell1 = row.insertCell(0);
        var cell2 = row.insertCell(1);
        var cell3 = row.insertCell(2);
        var cell4 = row.insertCell(3);
        cell1.innerHTML = index + 1;
        cell2.innerHTML = step.instructions;
        cell2.setAttribute("style", "text-align: center");
        step.issues.forEach((issue, index) => {
            console.log(`scoreTotal = ${scoreTotal} issue.score = ${issue.score}`);
            scoreTotal += parseInt(issue.score);
            descriptionCell += "\u2022" + issue.description + "<br>";
        });
        if (!step.issues || step.issues.length === 0) {
            cell3.innerHTML = "5";
            descriptionCell = "\u2022No issues";
        }
        else {
            console.log(`scoreTotal = ${scoreTotal} / ${step.issues.length} = ${scoreTotal / step.issues.length}`);
            cell3.innerHTML = Math.floor(scoreTotal / step.issues.length);
        }
        cell4.innerHTML = descriptionCell;
        cell4.setAttribute("style", "text-align: center");
        scoreTotal = 0;
        descriptionCell = "";
    });
    resultsDiv.appendChild(resultsTable);
    let h2Heading = document.createElement("h2");
    h2Heading.textContent = "Problem Summary";
    resultsDiv.appendChild(h2Heading);
    let p1 = document.createElement("p");
    let score = minimumScore(issuesMap(uc));
    p1.innerHTML = `${uc.ats} Overall Rating: ${score}`;
    resultsDiv.appendChild(p1);
    let topIssues = document.createElement("ul");
    addTopIssues(topIssues, uc);
    resultsDiv.appendChild(topIssues);
    return resultsDiv;
}

function clearTable(table) {
    var rows = table.rows;

    for (let i = rows.length - 1; i > 0; i--) {
        table.deleteRow(i);
    }
    return;
}

function addTopIssues(topIssues, uc) {
    if (uc.comments && uc.comments.length > 0) {
        uc.comments.forEach(comment => {
            var topIssue = document.createElement("li");
            topIssue.innerHTML = comment;
            topIssues.appendChild(topIssue);
        });
        return;
    }

    let allIssues = issuesMap(uc);
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
    const evalViewResultsButton = document.getElementById("eval-view-results");
    evalViewResultsButton.addEventListener("click", evalViewResultsButtonClicked);
    let saveEvalButton = document.getElementById("eval-save-file");
    saveEvalButton.addEventListener("click", saveFileButtonClick);
    const editUseCaseButton = document.getElementById("edit-uc");
    editUseCaseButton.addEventListener("click", editUseCaseButtonClicked);
    const newUseCaseButton = document.getElementById("new-uc");
    newUseCaseButton.addEventListener("click", newUseCaseButtonClicked);
    fillCheckboxMenu(defaults["os-types"], "uc-edit-oses-menu", "oses");
    fillCheckboxMenu(defaults["at-types"], "uc-edit-ats-menu", "ats");
    addFormEvents();
    document.getElementById("uc-file-save").addEventListener('click', saveFileButtonClick);
    document.getElementById("uc-file-save").removeAttribute("disabled");
    document.getElementById("uc-perform").addEventListener('click', performButtonClick);
    document.getElementById("uc-new-step").addEventListener('click', newStepButtonClick);
}

function renderEvalResultsPDF() {
    const docDefinition = {
        content: [
            { text: 'Problem Summary', style: 'header' },
            renderUnorderedListForPDF(evaluation.comments, "No issues."),
            ...evaluation.evalUCs.map(renderUseCaseForPDF)
        ],
        styles: {
            header: { fontSize: 18, bold: true, margin: [0, 10, 0, 10] },
            subheader: { fontSize: 14, bold: true, margin: [0, 5, 0, 5] },
            tableHeader: { bold: true, fillColor: '#eeeeee' },
        },
        defaultStyle: {
            fontSize: 12
        }
    };

    pdfMake.createPdf(docDefinition).open();
}

function renderUnorderedListForPDF(listItems, emptyText) {
    if (!Array.isArray(listItems) || listItems.length === 0) {
        return { text: emptyText, style: 'subheader' };
    }
    return {
        ul: listItems.map(item => item)
    };
}

function renderUseCaseForPDF(uc) {
    return [
        { text: `Detailed Use Case Results: ${uc.name}`, style: 'subheader' },
        {
            text: `Assistive Technology: ${uc.ats}\nGoal: ${uc.goal}\nOperator: ${uc.tester}\nStart Location: ${uc.startlocation}\nOperating System: ${uc.oses}`,
            margin: [0, 5, 0, 5]
        },
        renderResultsTableForPDF(uc)
    ];
}

function renderResultsTableForPDF(uc) {
    return {
        table: {
            headerRows: 1,
            widths: ['auto', '*', 'auto', '*'],
            body: [
                [
                    { text: '#', style: 'tableHeader' },
                    { text: 'Main Success Case', style: 'tableHeader' },
                    { text: 'Score', style: 'tableHeader' },
                    { text: 'Issues Encountered', style: 'tableHeader' }
                ],
                ...uc.steps.map((step, index) => [
                    index + 1,
                    step.instructions,
                    step.issues.length > 0 ? step.issues.map(i => i.score).join(', ') : "5",
                    step.issues.length > 0 ? step.issues.map(i => `• ${i.description}`).join('\n') : "• No issues"
                ])
            ]
        },
        layout: {
            fillColor: (rowIndex) => rowIndex % 2 === 0 ? '#f9f9f9' : null
        }
    };
}

initialize();