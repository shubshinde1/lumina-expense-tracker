import nodemailer from "nodemailer";

export const sendOtpEmail = async (email: string, otp: string, type: "register" | "reset") => {
  // Use Ethereal fake SMTP to log out the URL for dev debugging if real credentials aren't set
  // This ensures the tracker runs without setup friction, but can easily take REAL smtp details:
  const isProd = process.env.NODE_ENV === "production";
  let transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  } else {
    // Development Mock Mail (Ethereal)
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
  }

  const subject = type === "register" ? "Lumina: Verify Your Registration" : "Lumina: Reset Your Password";
  const html = `
    <div style="font-family: sans-serif; text-align: center; padding: 40px; background: #000; color: #fff; border-radius: 12px;">
      <h2 style="color: #6bfe9c; letter-spacing: 2px;">LUMINA SECURITY</h2>
      <p style="color: #a1a1aa;">Your one-time passcode is:</p>
      <div style="font-size: 32px; font-weight: bold; background: #18181b; padding: 20px; border-radius: 12px; margin: 20px auto; width: fit-content; letter-spacing: 4px;">
        ${otp}
      </div>
      <p style="color: #ef4444; font-size: 12px; font-weight: bold; text-transform: uppercase;">Expires in 2 minutes</p>
    </div>
  `;

  const info = await transporter.sendMail({
    from: `"Lumina Authenticator" <${process.env.SMTP_USER || 'noreply@luminatracker.com'}>`,
    to: email,
    subject,
    html,
  });

  console.log(`\n============== OTP GENERATED ==============`);
  console.log(`✉️  Sent To: ${email} [${type.toUpperCase()}]`);
  console.log(`🔑 OTP Code: ${otp}`);
  if (!process.env.SMTP_HOST) {
    console.log(`🌐 Inbox Preview: ${nodemailer.getTestMessageUrl(info)}`);
  }
  console.log(`===========================================\n`);
  
  return info;
};
