import nodemailer from "nodemailer";

export const sendOtpEmail = async (email: string, otp: string, type: "register" | "reset") => {
  const isProd = process.env.NODE_ENV === "production";
  let transporter;

  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpPort = Number(process.env.SMTP_PORT) || 587;

  // Use real credentials if provided, otherwise fallback to Ethereal (Development Mock)
  if (smtpHost && smtpUser) {
    console.log(`📡 SMTP: Attempting to connect to ${smtpHost}:${smtpPort}...`);
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // Use SSL for 465, STARTTLS for 587
      auth: { 
        user: smtpUser, 
        pass: smtpPass 
      },
      // Timeouts are critical for cloud hosting like Render to prevent hanging requests
      connectionTimeout: 15000, // 15 seconds to connect
      greetingTimeout: 15000,   // 15 seconds to wait for greeting
      socketTimeout: 20000,     // 20 seconds of inactivity
      // Some providers/hosting services (like Render/DigitalOcean) have issues with STARTTLS/Certificates
      tls: {
        rejectUnauthorized: false, // Helps with some self-signed certificate issues or older SMTP relays
        minVersion: 'TLSv1.2'      // Zoho requires at least TLS v1.2
      }
    });

    // Verification check to catch config errors early in production logs
    try {
      await (transporter as any).verify();
      console.log("✅ SMTP Connection Verified successfully.");
    } catch (vError: any) {
      console.error("❌ SMTP Verification Failed - Check your Render Env Vars! Error:", vError.message);
      // We don't throw here yet to allow the sendMail attempt which might provide more detail
    }

  } else {
    // Development Mock Mail (Ethereal)
    console.log("🛠️  SMTP_HOST not found. Using Ethereal Mock Mailer...");
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
  }

  const subject = type === "register" ? "Lumina: Verify Your Registration" : "Lumina: Reset Your Password";
  
  // High-end premium template focused on the Lumina Brand
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; padding: 40px; background: #09090b; color: #ffffff; border-radius: 16px; border: 1px solid #27272a; max-width: 500px; margin: 0 auto;">
      <h2 style="color: #6bfe9c; letter-spacing: 3px; font-weight: 800; text-shadow: 0 0 20px rgba(107, 254, 156, 0.2);">LUMINA</h2>
      <div style="height: 1px; background: linear-gradient(90deg, transparent, #27272a, transparent); margin: 20px 0;"></div>
      <p style="color: #a1a1aa; font-size: 16px;">${type === 'register' ? 'To finalize your registration, use the code below:' : 'A password reset was requested. If this was not you, ignore this email.'}</p>
      
      <div style="font-size: 38px; font-weight: 900; background: #18181b; color: #6bfe9c; padding: 24px; border-radius: 12px; margin: 30px auto; width: fit-content; letter-spacing: 8px; border: 1px solid #3f3f46; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
        ${otp}
      </div>
      
      <p style="color: #ef4444; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Expiring in 2 minutes</p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #27272a; color: #71717a; font-size: 12px;">
        Secure transaction management by Lumina.
      </div>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"Lumina Security" <${smtpUser || 'noreply@luminatracker.com'}>`,
      to: email,
      subject,
      html,
    });

    console.log(`\n============== OTP GENERATED ==============`);
    console.log(`✉️  Sent To: ${email} [${type.toUpperCase()}]`);
    console.log(`🔑 OTP Code: ${otp}`);
    if (!smtpHost) {
      console.log(`🌐 Inbox Preview: ${nodemailer.getTestMessageUrl(info)}`);
    }
    console.log(`===========================================\n`);
    
    return info;
  } catch (err: any) {
    console.error("🔴 Fatal Error sending OTP Email:", err.message);
    throw new Error(`Failed to send email: ${err.message}`);
  }
};
