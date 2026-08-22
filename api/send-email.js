const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed." });
  }

  const { name, email, message, website } = request.body || {};
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

  if (!process.env.RESEND_API_KEY || !process.env.REPORT_TO_EMAIL || !process.env.REPORT_FROM_EMAIL) {
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
        from: process.env.REPORT_FROM_EMAIL,
        to: [process.env.REPORT_TO_EMAIL],
        reply_to: cleanEmail,
        subject: `New contact message from ${cleanName}`,
        text: `Name: ${cleanName}\nEmail: ${cleanEmail}\n\n${cleanMessage}`
      })
    });

    if (!resendResponse.ok) {
      return response.status(502).json({ error: "Email provider rejected the message." });
    }

    return response.status(200).json({ ok: true });
  } catch {
    return response.status(502).json({ error: "Unable to reach the email provider." });
  }
}