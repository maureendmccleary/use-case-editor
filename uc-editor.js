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
            document.getElementById("uc-step-contents[0]").value = uc.steps[i].text;
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
            document.getElementById("uc-perform-step-contents[0]").value = uc.steps[i].text;
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
    addIssueClose.addEventListener("click", (e) => {
        e.preventDefault();
        if (uc.steps[0].issues && uc.steps[0].issues.length > 0) {
            console.log("Changing add issue button to view issue");
            document.getElementById("uc-add-issue[0]").innerHTML = "View Issue";
        }
        addIssueDialog.close();
    });
    var stepNumbers = Array.from({ length: uc.stepCount }, (_, i) => i + 1);
    fillListbox(stepNumbers, "add-issue-step");
    stepNumbers = document.getElementById("add-issue-step");
    var targetStep = getStepNumber(e.target.id); 
    targetStep++;
    for (var i = 0; i < stepNumbers.length; i++) {
        console.log("targetStep = " + targetStep + " getStepNumber() = " + getStepNumber(e.target.id) + " stepNumbers[i].textContent = " + stepNumbers[i].textContent);
        if (targetStep == stepNumbers[i].textContent) {
            stepNumbers[i].selected = true;
            console.log("selecting step");
        }
    }
    fillListbox(defaults["scores"], "add-issue-score");
    let save = document.getElementById("add-issue-dialog-save");
    save.addEventListener("click", saveIssueButtonClick);
    let next = document.getElementById("add-issue-dialog-next");
    next.addEventListener("click", saveIssueButtonClick);
}

function saveIssueButtonClick(e) {
    e.preventDefault();
    let newIssue = {};
    newIssue.description = document.getElementById("add-issue-description").value;
    newIssue.findingURL = document.getElementById("add-issue-findingURL").value;
    newIssue.score = document.getElementById("add-issue-score").value;
    console.log(newIssue);
    uc.steps[0].issues.push(newIssue);
    console.log(uc.steps[0].issues);
}

function addStepButtonClick(e) {
    e.preventDefault();
    var form = document.forms["ucEditor"];
    var br = document.createElement('BR');
    form.appendChild(br);
    form.appendChild(br);
    var newStepLabel = document.createElement('LABEL');
    uc.stepCount++;
    newStepLabel.innerHTML = "Step " + uc.stepCount + " ";
    var newStep = document.createElement('INPUT');
    var stepId = makeStepId("ucEditor");
    newStep.setAttribute("id", stepId);
    newStep.setAttribute("name", "steps");
    newStep.addEventListener('blur', blurFormField);
    newStepLabel.setAttribute("for", stepId);
    var ucDiv = document.createElement('DIV');
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
    var newStepLabel = document.createElement('LABEL');
    let stepNumber = i;
    newStepLabel.textContent = "Step " + ++stepNumber + " ";
    var newStep = document.createElement('INPUT');
    if (formName === "ucEditor") {
        var stepId = "uc-step-contents[" + i + "]";
    } else {
        var stepId = "uc-perform-step-contents[" + i + "]";
    }
    newStep.setAttribute("id", stepId);
    newStep.setAttribute("name", "steps");
    newStep.value = uc.steps[i].text;
    newStep.addEventListener('blur', blurFormField);
    newStepLabel.setAttribute("for", newStep.id);
    ucDiv.appendChild(newStepLabel);
    ucDiv.appendChild(newStep);
    if (formName === "ucPerformDialog") {
        var stepResultsLabel = document.createElement('LABEL');
        stepResultsLabel.textContent = "Step " + stepNumber + " results";
        var stepResults = document.createElement('TEXTAREA');
        var stepResultsId = "uc-perform-step-results[" + i + "]";
        stepResults.setAttribute("id", stepResultsId);
        stepResultsLabel.setAttribute("for", stepResultsId);
        stepResults.setAttribute("name", "results");
        stepResults.addEventListener('blur', blurFormField);
        ucDiv.appendChild(stepResultsLabel);
        ucDiv.appendChild(stepResults);
        var addIssueButton = document.createElement('BUTTON');
        addIssueButton.innerText = "Add Issue";
        addIssueButton.addEventListener('click', addIssueButtonClick);
        addIssueButton.setAttribute("id", "uc-add-issue[" + i + "]");
        ucDiv.appendChild(addIssueButton);
    }
    form.appendChild(ucDiv);
    form.appendChild(br);
    form.appendChild(br);
}

function makeStepId(formName) {
    let len = uc.steps.length;
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
    if (e.target.name === "steps") {
        uc["steps"][getStepNumber(e.target.id)].text = e.target.value;
    } else if (e.target.name === "results") {
        uc.steps[getStepNumber(e.target.id)].results = e.target.value;
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
