import { Resend } from "resend";
import nodemailer  from "nodemailer";
import User        from "../models/User.js";
import otpGenerator from "otp-generator";

// ─────────────────────────────────────────────────────────────────────────────
//  TRANSPORT 1 — Resend (used only for Help & Support → hookadrop@gmail.com)
// ─────────────────────────────────────────────────────────────────────────────
const getResend = () => new Resend(process.env.RESEND_API_KEY);
const RESEND_FROM = `${process.env.EMAIL_FROM_NAME || "HookaDrop"} <${process.env.EMAIL_FROM || "onboarding@resend.dev"}>`;

// ─────────────────────────────────────────────────────────────────────────────
//  TRANSPORT 2 — Gmail SMTP via Nodemailer (used for OTP verification emails)
//  Sends FROM hookadrop@gmail.com TO the user's email
// ─────────────────────────────────────────────────────────────────────────────
const createGmailTransporter = () =>
  nodemailer.createTransport({
    host:   "smtp.gmail.com",
    port:   587,
    secure: false,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

const GMAIL_FROM = `HookaDrop <${process.env.GMAIL_USER || "hookadrop@gmail.com"}>`;

// ─────────────────────────────────────────────────────────────────────────────
//  Low-level Gmail sender (for OTPs — sends to user email)
// ─────────────────────────────────────────────────────────────────────────────
const gmailSend = async (to, subject, html) => {
  const transporter = createGmailTransporter();
  const info = await transporter.sendMail({
    from:    GMAIL_FROM,
    to,
    subject,
    html,
  });
  console.log(`[gmailSend] ✅ Sent to ${to} — messageId: ${info.messageId}`);
  return info;
};

// ─────────────────────────────────────────────────────────────────────────────
//  Low-level Resend sender (for Help & Support only)
// ─────────────────────────────────────────────────────────────────────────────
export const mailSender = async (email, subject, html) => {
  try {
    const resend = getResend();
    const { data, error } = await resend.emails.send({
      from:    RESEND_FROM,
      to:      [email],
      subject,
      html,
    });
    if (error) {
      console.error("[mailSender] Resend error:", error);
      throw new Error(error.message || "Resend failed");
    }
    return data;
  } catch (error) {
    console.error("[mailSender] Failed to send email:", error.message);
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  Verification email — uses Gmail SMTP (FROM hookadrop@gmail.com TO user)
// ─────────────────────────────────────────────────────────────────────────────
export const sendVerificationEmail = async (email, name, code) => {
  const displayName = name?.trim() || "there";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:40px 20px;">
  <tr><td align="center">
    <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
      <tr><td align="center" style="background:#111111;border-radius:16px 16px 0 0;padding:36px 40px 28px;border-bottom:2px solid #08B9F5;">
        <h1 style="color:#08B9F5;font-size:30px;font-weight:900;letter-spacing:-0.5px;margin:0;">HookaDrop</h1>
        <p style="color:#666;font-size:12px;margin:6px 0 0;letter-spacing:2px;text-transform:uppercase;">Email Verification</p>
      </td></tr>
      <tr><td style="background:#111111;padding:40px;">
        <p style="color:#CCCCCC;font-size:16px;margin:0 0 8px;">Hello <strong style="color:#08B9F5;">${displayName}</strong>,</p>
        <p style="color:#999;font-size:14px;line-height:1.6;margin:0 0 32px;">
          Welcome to HookaDrop! Enter the verification code below to complete your registration.
        </p>
        <div style="background:#1A1A1A;border:2px solid #08B9F5;border-radius:16px;padding:28px;text-align:center;margin-bottom:28px;">
          <p style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:3px;margin:0 0 12px;">Your verification code</p>
          <p style="color:#08B9F5;font-size:48px;font-weight:900;letter-spacing:16px;margin:0;">${code}</p>
          <p style="color:#555;font-size:12px;margin:16px 0 0;">Expires in <strong style="color:#08B9F5;">10 minutes</strong></p>
        </div>
        <p style="color:#555;font-size:13px;line-height:1.6;margin:0;">
          If you did not create a HookaDrop account, you can safely ignore this email.
        </p>
      </td></tr>
      <tr><td style="background:#0D0D0D;border-radius:0 0 16px 16px;padding:20px 40px;border-top:1px solid #1A1A1A;text-align:center;">
        <p style="color:#444;font-size:11px;margin:0;">© 2026 HookaDrop. All rights reserved.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

  await gmailSend(email, "Verify your HookaDrop account 🔐", html);
  console.log(`[sendVerificationEmail] ✅ Code sent via Gmail to ${email}`);
};

// ─────────────────────────────────────────────────────────────────────────────
//  Welcome email — sent ONLY after successful email verification
// ─────────────────────────────────────────────────────────────────────────────
export const sendWelcomeEmail = async (userId, name, email) => {
  const displayName = name?.trim() || "there";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Welcome to HookaDrop</title>
</head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td align="center" style="background:linear-gradient(135deg,#111111 0%,#1a1200 100%);border-radius:16px 16px 0 0;padding:40px 40px 30px;border-bottom:2px solid #FFD000;">
              <h1 style="color:#FFD000;font-size:32px;font-weight:900;letter-spacing:-0.5px;margin:0;">
                HookaDrop
              </h1>
              <p style="color:#666;font-size:13px;margin:6px 0 0;letter-spacing:2px;text-transform:uppercase;">
                Premium Hookah Experience
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#111111;padding:40px;">

              <!-- Greeting -->
              <h2 style="color:#FFFFFF;font-size:24px;font-weight:700;margin:0 0 8px;">
                Welcome to HookaDrop! 🎉
              </h2>
              <p style="color:#999;font-size:16px;margin:0 0 28px;">
                Hi <strong style="color:#FFD000;">${displayName}</strong>,
              </p>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #222;margin:0 0 28px;"/>

              <!-- Main message -->
              <p style="color:#CCCCCC;font-size:15px;line-height:1.7;margin:0 0 20px;">
                Your account has been <strong style="color:#FFFFFF;">successfully created</strong>.
                We're thrilled to have you as part of the HookaDrop community.
              </p>
              <p style="color:#CCCCCC;font-size:15px;line-height:1.7;margin:0 0 28px;">
                You can now explore our full catalog, add products to your favorites,
                manage your cart, and place orders directly from the HookaDrop app.
              </p>

              <!-- Feature cards -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td width="30%" style="padding:0 6px 12px 0;">
                    <div style="background:#1A1A1A;border:1px solid #2A2A2A;border-radius:12px;padding:16px;text-align:center;">
                      <div style="font-size:24px;margin-bottom:6px;">🪝</div>
                      <p style="color:#FFD000;font-size:12px;font-weight:700;margin:0;text-transform:uppercase;letter-spacing:0.5px;">Shop</p>
                      <p style="color:#666;font-size:11px;margin:4px 0 0;">Browse catalog</p>
                    </div>
                  </td>
                  <td width="30%" style="padding:0 6px 12px;">
                    <div style="background:#1A1A1A;border:1px solid #2A2A2A;border-radius:12px;padding:16px;text-align:center;">
                      <div style="font-size:24px;margin-bottom:6px;">❤️</div>
                      <p style="color:#FFD000;font-size:12px;font-weight:700;margin:0;text-transform:uppercase;letter-spacing:0.5px;">Favorites</p>
                      <p style="color:#666;font-size:11px;margin:4px 0 0;">Save products</p>
                    </div>
                  </td>
                  <td width="30%" style="padding:0 0 12px 6px;">
                    <div style="background:#1A1A1A;border:1px solid #2A2A2A;border-radius:12px;padding:16px;text-align:center;">
                      <div style="font-size:24px;margin-bottom:6px;">📦</div>
                      <p style="color:#FFD000;font-size:12px;font-weight:700;margin:0;text-transform:uppercase;letter-spacing:0.5px;">Orders</p>
                      <p style="color:#666;font-size:11px;margin:4px 0 0;">Track & manage</p>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td align="center">
                    <a href="#"
                      style="display:inline-block;background:linear-gradient(135deg,#FFD000,#C9A227);color:#000000;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:50px;letter-spacing:0.3px;">
                      Open HookaDrop App →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #222;margin:0 0 24px;"/>

              <!-- Sign-off -->
              <p style="color:#888;font-size:14px;line-height:1.6;margin:0 0 4px;">
                Thank you for joining HookaDrop. Enjoy your experience!
              </p>
              <p style="color:#FFD000;font-size:14px;font-weight:600;margin:0;">
                — The HookaDrop Team
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0D0D0D;border-radius:0 0 16px 16px;padding:24px 40px;border-top:1px solid #1A1A1A;">
              <p style="color:#444;font-size:12px;margin:0;text-align:center;line-height:1.6;">
                You received this email because you created an account on HookaDrop.<br/>
                If you did not sign up, you can safely ignore this email.<br/>
                <span style="color:#333;">© 2026 HookaDrop. All rights reserved.</span>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    await mailSender(email, "Welcome to HookaDrop 🎉", html);

    // Update emailStatus to 'sent' in DB (non-blocking: fire-and-forget)
    User.findByIdAndUpdate(userId, { emailStatus: "sent" }).catch((err) =>
      console.error("[sendWelcomeEmail] Failed to update emailStatus:", err.message)
    );

    console.log(`[sendWelcomeEmail] ✅ Welcome email sent to ${email}`);
  } catch (error) {
    console.error(`[sendWelcomeEmail] ❌ Failed for ${email}:`, error.message);

    // Update emailStatus to 'failed' — does NOT affect registration
    User.findByIdAndUpdate(userId, { emailStatus: "failed" }).catch((err) =>
      console.error("[sendWelcomeEmail] Failed to update emailStatus:", err.message)
    );
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  Password reset OTP — uses Gmail SMTP (FROM hookadrop@gmail.com TO user)
// ─────────────────────────────────────────────────────────────────────────────
export const sendMail = async (email) => {
  const otp = otpGenerator.generate(6, {
    upperCaseAlphabets: false,
    lowerCaseAlphabets: false,
    specialChars: false,
  });

  const user = await User.findOne({ email });
  if (!user) throw new Error("User not found");

  user.resetOtp   = otp;
  user.otpExpires = Date.now() + 3600000; // 1 hour
  await user.save();

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#0A0A0A;padding:40px 20px;">
  <div style="max-width:480px;margin:0 auto;background:#111;border:1px solid #222;border-radius:16px;overflow:hidden;">
    <div style="background:#111111;padding:32px 32px 24px;border-bottom:2px solid #08B9F5;text-align:center;">
      <h1 style="color:#08B9F5;font-size:28px;font-weight:900;margin:0;">HookaDrop</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#fff;font-size:20px;margin:0 0 12px;">Password Reset</h2>
      <p style="color:#999;font-size:14px;line-height:1.6;margin:0 0 24px;">
        We received a request to reset your HookaDrop password.<br/>
        Use the code below — it expires in <strong style="color:#08B9F5;">1 hour</strong>.
      </p>
      <div style="background:#1A1A1A;border:1px solid #08B9F5;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
        <p style="color:#999;font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px;">Your reset code</p>
        <p style="color:#08B9F5;font-size:36px;font-weight:900;letter-spacing:10px;margin:0;">${otp}</p>
      </div>
      <p style="color:#555;font-size:12px;margin:0;line-height:1.6;">
        If you didn't request this, you can safely ignore this email.<br/>
        Your password will not change.
      </p>
    </div>
    <div style="background:#0D0D0D;padding:16px 32px;border-top:1px solid #1A1A1A;text-align:center;">
      <p style="color:#444;font-size:11px;margin:0;">© 2026 HookaDrop. All rights reserved.</p>
    </div>
  </div>
</div>`;

  const response = await gmailSend(email, "HookaDrop — Password Reset Code", html);
  console.log(`[sendMail] ✅ Password reset OTP sent via Gmail to ${email}`);
  return response;
};
