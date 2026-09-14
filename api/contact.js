// Vercel Serverless Function. Benötigte Environment-Variablen (im Vercel-Dashboard setzen):
//   RESEND_API_KEY     – API-Key aus dem Resend-Dashboard
//   CONTACT_TO_EMAIL    – Empfänger-Adresse, z.B. hallo@fynnpetersen.dev
//   CONTACT_FROM_EMAIL  – Absender auf verifizierter Domain, z.B. "Kontaktformular <kontakt@fynnpetersen.dev>"
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
