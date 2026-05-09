const CONTACT_EMAIL = "support@skyblue-ventures.com";

// Cloudflare Turnstile test secret. Always passes — pairs with the test site
// key 1x00000000000000000000AA in contact.html. Override with a real secret
// from https://dash.cloudflare.com/?to=/:account/turnstile by setting the
// TURNSTILE_SECRET_KEY env var in Vercel for production spam protection.
const TURNSTILE_TEST_SECRET = "1x0000000000000000000000000000000AA";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sanitize(value, maxLen) {
  return String(value || "").trim().slice(0, maxLen);
}

async function verifyTurnstile(token, ip) {
  const secret = process.env.TURNSTILE_SECRET_KEY || TURNSTILE_TEST_SECRET;
  if (!process.env.TURNSTILE_SECRET_KEY) {
    console.warn(
      "TURNSTILE_SECRET_KEY env var not set — using Cloudflare test secret. " +
        "This means CAPTCHA always passes; configure a real Turnstile widget " +
        "for production spam protection."
    );
  }

  const body = new URLSearchParams({
    secret,
    response: token,
    remoteip: ip || "",
  });

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new Error("CAPTCHA verification failed.");
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error("Invalid CAPTCHA token.");
  }
}

async function sendEmail({ name, email, subject, message }) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.CONTACT_FROM_EMAIL;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }
  if (!fromEmail) {
    throw new Error("CONTACT_FROM_EMAIL is not configured.");
  }

  const html = `
    <h2>New Contact Form Message</h2>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Subject:</strong> ${subject}</p>
    <p><strong>Message:</strong></p>
    <p>${message.replace(/\n/g, "<br>")}</p>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [CONTACT_EMAIL],
      reply_to: email,
      subject: `[PlanBoards Contact] ${subject}`,
      html,
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Email provider rejected the request.");
  }
}

module.exports = async (req, res) => {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const name = sanitize(req.body?.name, 120);
    const email = sanitize(req.body?.email, 150);
    const subject = sanitize(req.body?.subject, 160);
    const message = sanitize(req.body?.message, 2000);
    const captchaToken = sanitize(req.body?.captchaToken, 2048);

    if (!name || !email || !subject || !message || !captchaToken) {
      return res.status(400).json({ error: "Please fill in all fields and CAPTCHA." });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return res.status(400).json({ error: "Please provide a valid email address." });
    }

    const clientIp =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      "";

    await verifyTurnstile(captchaToken, clientIp);
    await sendEmail({ name, email, subject, message });

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Unexpected server error." });
  }
};
