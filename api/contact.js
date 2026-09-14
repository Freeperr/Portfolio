// Vercel Serverless Function. Benötigte Environment-Variablen (im Vercel-Dashboard setzen):
//   RESEND_API_KEY     – API-Key aus dem Resend-Dashboard
//   CONTACT_TO_EMAIL    – Empfänger-Adresse, z.B. hallo@fynnpetersen.dev
//   CONTACT_FROM_EMAIL  – Absender auf verifizierter Domain, z.B. "Kontaktformular <kontakt@fynnpetersen.dev>"
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildEmailHtml({ name, email, message }) {
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br />");

  return `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="margin:0; padding:0; background:#f4f4f4; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px; background:#ffffff; border:1px solid #e6e6e6; border-radius:10px; overflow:hidden;">
            <tr>
              <td style="padding:28px 32px; border-bottom:1px solid #e6e6e6;">
                <span style="font-size:13px; font-weight:600; letter-spacing:0.02em; color:#171717;">Fynn Petersen</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 20px; font-size:22px; line-height:1.3; color:#171717;">Neue Nachricht über dein Kontaktformular</h1>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                  <tr>
                    <td style="padding:4px 0; font-size:13px; color:#8a8a8a; width:80px;">Name</td>
                    <td style="padding:4px 0; font-size:15px; color:#171717;">${safeName}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0; font-size:13px; color:#8a8a8a;">E-Mail</td>
                    <td style="padding:4px 0; font-size:15px; color:#171717;">
                      <a href="mailto:${safeEmail}" style="color:#b8420f; text-decoration:none;">${safeEmail}</a>
                    </td>
                  </tr>
                </table>

                <div style="background:#fafafa; border:1px solid #e6e6e6; border-radius:8px; padding:18px 20px; font-size:15px; line-height:1.6; color:#171717; white-space:normal;">
                  ${safeMessage}
                </div>

                <a href="mailto:${safeEmail}" style="display:inline-block; margin-top:28px; padding:11px 22px; background:#171717; color:#ffffff; font-size:14px; font-weight:500; text-decoration:none; border-radius:6px;">Direkt antworten</a>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 32px; border-top:1px solid #e6e6e6; font-size:12px; color:#8a8a8a;">
                Gesendet über das Kontaktformular auf fynnpetersen.dev
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, email, message, company } = req.body || {};

  // Honeypot-Feld: unsichtbar für Menschen, wird nur von Bots ausgefüllt
  if (company) {
    return res.status(200).json({ ok: true });
  }

  if (!name || !email || !message) {
    return res.status(400).json({ error: "Bitte alle Felder ausfüllen." });
  }
  if (!EMAIL_PATTERN.test(email)) {
    return res.status(400).json({ error: "Bitte eine gültige E-Mail-Adresse angeben." });
  }
  if (String(message).length > 5000) {
    return res.status(400).json({ error: "Nachricht ist zu lang." });
  }

  try {
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM_EMAIL,
        to: process.env.CONTACT_TO_EMAIL,
        reply_to: email,
        subject: `Neue Nachricht von ${name}`,
        text: `Von: ${name} (${email})\n\n${message}`,
        html: buildEmailHtml({ name, email, message }),
      }),
    });

    if (!resendRes.ok) {
      const errorBody = await resendRes.text();
      console.error("Resend error:", errorBody);
      return res.status(502).json({ error: "Nachricht konnte nicht gesendet werden." });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Contact form error:", err);
    return res.status(500).json({ error: "Serverfehler. Bitte später erneut versuchen." });
  }
};
