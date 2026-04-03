import nodemailer from "nodemailer";

// Render blocks standard SMTP ports (465/587). 
// Using an API like Resend is the ONLY reliable way to send mail from Render.
export const sendOtpEmail = async (email: string, otp: string, type: "register" | "reset") => {
  const resendApiKey = process.env.RESEND_API_KEY;
  const smtpUser = process.env.SMTP_USER;
  
  const subject = type === "register" ? "Wealthy: Verify Your Registration" : "Wealthy: Reset Your Password";
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; padding: 40px; background: #09090b; color: #ffffff; border-radius: 16px; border: 1px solid #27272a; max-width: 500px; margin: 0 auto;">
      <h2 style="color: #6bfe9c; letter-spacing: 3px; font-weight: 800; text-shadow: 0 0 20px rgba(107, 254, 156, 0.2);">WEALTHY</h2>
      <div style="height: 1px; background: linear-gradient(90deg, transparent, #27272a, transparent); margin: 20px 0;"></div>
      <p style="color: #a1a1aa; font-size: 16px;">${type === 'register' ? 'To finalize your registration, use the code below:' : 'A password reset was requested. If this was not you, ignore this email.'}</p>
      
      <div style="font-size: 38px; font-weight: 900; background: #18181b; color: #6bfe9c; padding: 24px; border-radius: 12px; margin: 30px auto; width: fit-content; letter-spacing: 8px; border: 1px solid #3f3f46; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
        ${otp}
      </div>
      
      <p style="color: #ef4444; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Expiring in 2 minutes</p>
    </div>
  `;

  // METHOD 1: Resend API (Recommended for Render)
  if (resendApiKey) {
    console.log("🚀 Sending via Resend API...");
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: "Wealthy Security <onboarding@resend.dev>", // Shows as 'Wealthy' in inbox
          to: [email],
          subject,
          html,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Resend API Error");
      
      console.log("✅ Email sent successfully via Resend API");
      return data;
    } catch (err: any) {
      console.error("❌ Resend API Failed:", err.message);
      // Fallback to SMTP if Resend fails
    }
  }

  // METHOD 2: Standard SMTP (Works locally, usually fails on Render)
  const smtpHost = process.env.SMTP_HOST;
  const smtpPass = process.env.SMTP_PASS;
  const smtpPort = Number(process.env.SMTP_PORT) || 587;

  let transporter;
  if (smtpHost && smtpUser) {
    console.log(`📡 SMTP: Attempting to connect to ${smtpHost}:${smtpPort}...`);
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
      tls: { rejectUnauthorized: false, minVersion: 'TLSv1.2' }
    });
  } else {
    console.log("🛠️ Using Ethereal Mock Mailer...");
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
  }

  try {
    const info = await transporter.sendMail({
      from: `"Wealthy Security" <${smtpUser || 'noreply@wealthyapp.com'}>`,
      to: email,
      subject,
      html,
    });
    console.log(`✅ Email sent successfully via SMTP`);
    return info;
  } catch (err: any) {
    console.error("🔴 Fatal Error sending Email:", err.message);
    throw new Error(`Failed to send email: ${err.message}`);
  }
};
