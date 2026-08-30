const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({
      error: "Method not allowed."
    });
  }

  const {
    name,
    email,
    message,
    website,
    type,
    telemetry
  } = request.body || {};

  const reportToEmail =
    process.env.REPORT_TO_EMAIL ||
    process.env.RESPONSE_EMAIL;

  const reportFromEmail =
    process.env.REPORT_FROM_EMAIL ||
    process.env.RESEND_FROM;

  // Verification monitoring
  if (type === "verification-monitoring") {
    return sendVerificationReport(
      request,
      response,
      telemetry,
      reportToEmail,
      reportFromEmail
    );
  }

  // Normal contact form
  if (
    website ||
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof message !== "string"
  ) {
    return response.status(400).json({
      error: "Please complete all fields."
    });
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
    return response.status(400).json({
      error: "Please enter a valid name, email, and message."
    });
  }

  if (
    !process.env.RESEND_API_KEY ||
    !reportToEmail ||
    !reportFromEmail
  ) {
    return response.status(500).json({
      error: "Email service is not configured."
    });
  }

  try {
    const resendResponse = await fetch(
      "https://api.resend.com/emails",
      {
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
          text: [
            `Name: ${cleanName}`,
            `Email: ${cleanEmail}`,
            "",
            cleanMessage
          ].join("\n")
        })
      }
    );

    if (!resendResponse.ok) {
      return response.status(502).json({
        error: "Email provider rejected the message."
      });
    }

    return response.status(200).json({
      ok: true
    });
  } catch {
    return response.status(502).json({
      error: "Unable to reach the email provider."
    });
  }
}


async function sendVerificationReport(
  request,
  response,
  telemetry,
  reportToEmail,
  reportFromEmail
) {
  if (
    !telemetry ||
    typeof telemetry !== "object" ||
    Array.isArray(telemetry)
  ) {
    return response.status(400).json({
      error: "Invalid monitoring data."
    });
  }

  if (
    !process.env.RESEND_API_KEY ||
    !reportToEmail ||
    !reportFromEmail
  ) {
    return response.status(500).json({
      error: "Email service is not configured."
    });
  }

  /*
   * ================================
   * SERVER-SIDE DATA
   * ================================
   */

  const forwardedFor =
    request.headers["x-forwarded-for"];

  const ipAddress =
    typeof forwardedFor === "string"
      ? forwardedFor.split(",")[0].trim()
      : request.socket?.remoteAddress ||
        "Unavailable";

  const location = [
    request.headers["x-vercel-ip-city"],
    request.headers["x-vercel-ip-country"],
    request.headers["x-vercel-ip-country-region"]
  ]
    .filter(Boolean)
    .join(", ") || "Unavailable";


  const serverData = {
    ip: ipAddress,

    location,

    userAgent:
      request.headers["user-agent"] ||
      "Unavailable",

    acceptLanguage:
      request.headers["accept-language"] ||
      "Unavailable",

    referer:
      request.headers["referer"] ||
      request.headers["referrer"] ||
      "Direct",

    host:
      request.headers["host"] ||
      "Unavailable",

    protocol:
      request.headers["x-forwarded-proto"] ||
      "Unavailable",

    method:
      request.method,

    timestamp:
      new Date().toISOString()
  };


  /*
   * ================================
   * CLIENT TELEMETRY
   * ================================
   *
   * These values must have been
   * collected by the frontend.
   */

  const safeTelemetry = {
    timestamp:
      typeof telemetry.timestamp === "string"
        ? telemetry.timestamp
        : new Date().toISOString(),

    device: sanitizeObject(
      telemetry.device,
      {
        type: 40,
        platform: 100,
        platformVersion: 100,
        architecture: 50,
        bitness: 20,
        model: 100,
        wow64: 20,
        userAgent: 500
      }
    ),

    browser: sanitizeObject(
      telemetry.browser,
      {
        userAgent: 500,
        vendor: 200,
        language: 40,
        timezone: 100,
        fullVersion: 100
      }
    ),

    display: sanitizeObject(
      telemetry.display
    ),

    network: sanitizeObject(
      telemetry.network
    ),

    capabilities: sanitizeObject(
      telemetry.capabilities
    ),

    session: sanitizeObject(
      telemetry.session,
      {
        url: 2000,
        referrer: 2000,
        origin: 500,
        title: 500,
        visibility: 40,
        characterSet: 50,
        contentType: 100,
        baseURI: 2000
      }
    ),

    cookies: sanitizeCookieInfo(
      telemetry.cookies
    ),

    storage: sanitizeStorage(
      telemetry.storage
    )
  };


  /*
   * ================================
   * FORMAT REPORT
   * ================================
   */

  const reportText = [
    "VERIFICATION MONITORING REPORT",
    "================================",
    "",

    "SERVER INFORMATION",
    "-------------------",
    `Timestamp: ${serverData.timestamp}`,
    `IP address: ${serverData.ip}`,
    `Approximate location: ${serverData.location}`,
    `User-Agent: ${serverData.userAgent}`,
    `Accept-Language: ${serverData.acceptLanguage}`,
    `Referer: ${serverData.referer}`,
    `Host: ${serverData.host}`,
    `Protocol: ${serverData.protocol}`,
    `Method: ${serverData.method}`,
    "",

    "DEVICE",
    "------",
    formatObject(safeTelemetry.device),
    "",

    "BROWSER",
    "-------",
    formatObject(safeTelemetry.browser),
    "",

    "DISPLAY",
    "-------",
    formatObject(safeTelemetry.display),
    "",

    "NETWORK",
    "-------",
    formatObject(safeTelemetry.network),
    "",

    "CAPABILITIES",
    "------------",
    formatObject(safeTelemetry.capabilities),
    "",

    "SESSION",
    "-------",
    formatObject(safeTelemetry.session),
    "",

    "COOKIES",
    "-------",
    "Cookie values are not collected.",
    formatObject(safeTelemetry.cookies),
    "",

    "LOCAL STORAGE",
    "-------------",
    formatObject(safeTelemetry.storage)
  ].join("\n");


  /*
   * ================================
   * SEND EMAIL
   * ================================
   */

  try {
    const resendResponse = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${process.env.RESEND_API_KEY}`,

          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          from: reportFromEmail,
          to: [reportToEmail],

          subject:
            "Verification monitoring event",

          text: reportText
        })
      }
    );

    if (!resendResponse.ok) {
      return response.status(502).json({
        error:
          "Email provider rejected the report."
      });
    }

    return response.status(200).json({
      ok: true
    });

  } catch {
    return response.status(502).json({
      error:
        "Unable to reach the email provider."
    });
  }
}


/*
 * =====================================
 * COOKIE METADATA
 * =====================================
 *
 * We don't transmit actual cookie
 * values.
 */

function sanitizeCookieInfo(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  const names =
    Array.isArray(value.names)
      ? value.names
          .filter(
            name => typeof name === "string"
          )
          .map(
            name => name.slice(0, 100)
          )
          .slice(0, 50)
      : [];

  return {
    enabled: Boolean(value.enabled),

    count:
      typeof value.count === "number"
        ? Math.max(
            0,
            Math.min(value.count, 1000)
          )
        : names.length,

    names
  };
}


/*
 * =====================================
 * LOCAL STORAGE SANITIZATION
 * =====================================
 */

const sensitiveStoragePattern =
  /(?:auth|token|password|passwd|secret|credential|session|csrf|jwt|bearer|api[_-]?key|private[_-]?key|payment|card|cvv|cvc|ssn)/i;

const sensitiveValuePattern =
  /^(?:bearer\s+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/i;


function sanitizeStorage(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(entry => {
      if (
        !entry ||
        typeof entry !== "object" ||
        Array.isArray(entry)
      ) {
        return null;
      }

      const key =
        typeof entry.key === "string"
          ? entry.key
          : "";

      const storageValue =
        typeof entry.value === "string"
          ? entry.value
          : "";

      if (
        !key ||
        !isSafeStorageEntry(
          key,
          storageValue
        )
      ) {
        return null;
      }

      return {
        key: key.slice(0, 100),
        value: storageValue.slice(0, 1000)
      };
    })
    .filter(Boolean)
    .slice(0, 50);
}


function isSafeStorageEntry(
  key,
  value
) {
  return (
    !sensitiveStoragePattern.test(key) &&
    !sensitiveValuePattern.test(value)
  );
}


/*
 * =====================================
 * GENERAL TELEMETRY SANITIZER
 * =====================================
 */

function sanitizeObject(
  value,
  stringLimits = {}
) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .slice(0, 30)
      .map(([key, entry]) => {
        const safeKey =
          key.slice(0, 50);

        if (typeof entry === "string") {
          return [
            safeKey,
            entry.slice(
              0,
              stringLimits[key] || 500
            )
          ];
        }

        if (Array.isArray(entry)) {
          return [
            safeKey,
            entry.slice(0, 20)
          ];
        }

        if (
          entry &&
          typeof entry === "object"
        ) {
          return [
            safeKey,
            sanitizeObject(entry)
          ];
        }

        return [
          safeKey,
          entry
        ];
      })
  );
}


/*
 * =====================================
 * PRETTY REPORT FORMATTER
 * =====================================
 */

function formatObject(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "Unavailable";
  }

  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(
    value,
    null,
    2
  );
}