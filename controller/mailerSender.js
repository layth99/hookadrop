import { Resend }    from "resend";
import User         from "../models/User.js";
import otpGenerator from "otp-generator";

// ─────────────────────────────────────────────────────────────────────────────
//  Resend HTTPS API — delivers ALL transactional emails via port 443
//  Works on Render Free (no outbound SMTP restrictions apply).
//
//  Required environment variables:
//    EMAIL_API_KEY  — Resend API key  (re_xxxxxxxxxxxxxxxx)
//    EMAIL_FROM     — Verified sender address shown to recipients
//                     Must be verified in Resend dashboard → Domains or
//                     Sender Signatures.  Free plan: use onboarding@resend.dev
//                     to send to any address; or add hookadrop@gmail.com as a
//                     Sender Signature (one-click email confirmation).
//
//  Free tier: 3 000 emails/month, 100/day — sufficient for development.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
//  Generic low-level sender — used by every email function below
// ─────────────────────────────────────────────────────────────────────────────
export const mailSender = async (to, subject, html) => {
  const apiKey = process.env.EMAIL_API_KEY;
  if (!apiKey) {
    console.error("[mailSender] ❌ EMAIL_API_KEY is not set!");
    throw new Error("[mailSender] EMAIL_API_KEY is not set. Add it to .env and Render environment.");
  }

  const from = process.env.EMAIL_FROM || "HookaDrop <onboarding@resend.dev>";
  console.log(`[mailSender] Sending to ${to} via Resend (from: ${from})...`);

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to:      Array.isArray(to) ? to : [to],
    subject,
    html,
  });

  if (error) {
    console.error("[mailSender] Resend API error:", JSON.stringify(error));
    throw new Error(error.message || "Email delivery failed");
  }

  console.log(`[mailSender] ✅ Sent to ${to} — id: ${data?.id}`);
  return data;
};

// ─────────────────────────────────────────────────────────────────────────────
//  Signup verification email  → user's email
// ─────────────────────────────────────────────────────────────────────────────
export const sendVerificationEmail = async (email, name, code) => {
  const displayName = name?.trim() || "there";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:40px 20px;">
  <tr><td align="center">
    <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
      <tr><td align="center" style="background:#111;border-radius:16px 16px 0 0;padding:36px 40px 28px;border-bottom:2px solid #08B9F5;">
        <h1 style="color:#08B9F5;font-size:30px;font-weight:900;margin:0;">HookaDrop</h1>
        <p style="color:#666;font-size:12px;margin:6px 0 0;letter-spacing:2px;text-transform:uppercase;">Email Verification</p>
      </td></tr>
      <tr><td style="background:#111;padding:40px;">
        <p style="color:#ccc;font-size:16px;margin:0 0 8px;">Hello <strong style="color:#08B9F5;">${displayName}</strong>,</p>
        <p style="color:#999;font-size:14px;line-height:1.6;margin:0 0 32px;">
          Welcome to HookaDrop! Enter the code below to complete your registration.
        </p>
        <div style="background:#1A1A1A;border:2px solid #08B9F5;border-radius:16px;padding:28px;text-align:center;margin-bottom:28px;">
          <p style="color:#888;font-size:11px;text-transform:uppercase;letter-spacing:3px;margin:0 0 12px;">Your verification code</p>
          <p style="color:#08B9F5;font-size:48px;font-weight:900;letter-spacing:16px;margin:0;">${code}</p>
          <p style="color:#555;font-size:12px;margin:16px 0 0;">Expires in <strong style="color:#08B9F5;">10 minutes</strong></p>
        </div>
        <p style="color:#555;font-size:12px;">If you did not create a HookaDrop account, ignore this email.</p>
      </td></tr>
      <tr><td style="background:#0D0D0D;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;border-top:1px solid #1A1A1A;">
        <p style="color:#444;font-size:11px;margin:0;">© 2026 HookaDrop. All rights reserved.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

  await mailSender(email, "Verify your HookaDrop account 🔐", html);
  console.log(`[sendVerificationEmail] ✅ Code sent to ${email}`);
};

// ─────────────────────────────────────────────────────────────────────────────
//  Welcome email  → user's email  (sent after successful verification)
// ─────────────────────────────────────────────────────────────────────────────
export const sendWelcomeEmail = async (userId, name, email) => {
  const displayName = name?.trim() || "there";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:40px 20px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
      <tr><td align="center" style="background:#111;border-radius:16px 16px 0 0;padding:40px 40px 30px;border-bottom:2px solid #08B9F5;">
        <h1 style="color:#08B9F5;font-size:32px;font-weight:900;margin:0;">HookaDrop</h1>
        <p style="color:#666;font-size:13px;margin:6px 0 0;letter-spacing:2px;text-transform:uppercase;">Premium Hookah Experience</p>
      </td></tr>
      <tr><td style="background:#111;padding:40px;">
        <h2 style="color:#fff;font-size:24px;font-weight:700;margin:0 0 8px;">Welcome to HookaDrop! 🎉</h2>
        <p style="color:#999;font-size:16px;margin:0 0 28px;">Hi <strong style="color:#08B9F5;">${displayName}</strong>,</p>
        <hr style="border:none;border-top:1px solid #222;margin:0 0 28px;"/>
        <p style="color:#ccc;font-size:15px;line-height:1.7;margin:0 0 20px;">
          Your account has been <strong style="color:#fff;">successfully verified</strong>.
          Welcome to the HookaDrop community!
        </p>
        <p style="color:#ccc;font-size:15px;line-height:1.7;margin:0 0 28px;">
          You can now browse our catalog, save favorites, manage your cart, and place orders.
        </p>
        <hr style="border:none;border-top:1px solid #222;margin:0 0 24px;"/>
        <p style="color:#888;font-size:14px;margin:0 0 4px;">Thank you for joining HookaDrop!</p>
        <p style="color:#08B9F5;font-size:14px;font-weight:600;margin:0;">— The HookaDrop Team</p>
      </td></tr>
      <tr><td style="background:#0D0D0D;border-radius:0 0 16px 16px;padding:24px 40px;border-top:1px solid #1A1A1A;text-align:center;">
        <p style="color:#444;font-size:12px;margin:0;">© 2026 HookaDrop. All rights reserved.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

  try {
    await mailSender(email, "Welcome to HookaDrop 🎉", html);
    User.findByIdAndUpdate(userId, { emailStatus: "sent" }).catch(() => {});
    console.log(`[sendWelcomeEmail] ✅ Sent to ${email}`);
  } catch (err) {
    console.error(`[sendWelcomeEmail] ❌ Failed for ${email}:`, err.message);
    User.findByIdAndUpdate(userId, { emailStatus: "failed" }).catch(() => {});
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  Password reset OTP  → user's email
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
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:Arial,sans-serif;">
<div style="max-width:480px;margin:40px auto;background:#111;border:1px solid #222;border-radius:16px;overflow:hidden;">
  <div style="background:#111;padding:32px;border-bottom:2px solid #08B9F5;text-align:center;">
    <h1 style="color:#08B9F5;font-size:28px;font-weight:900;margin:0;">HookaDrop</h1>
  </div>
  <div style="padding:32px;">
    <h2 style="color:#fff;font-size:20px;margin:0 0 12px;">Password Reset</h2>
    <p style="color:#999;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Use the code below to reset your password — expires in <strong style="color:#08B9F5;">1 hour</strong>.
    </p>
    <div style="background:#1A1A1A;border:2px solid #08B9F5;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
      <p style="color:#888;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px;">Your reset code</p>
      <p style="color:#08B9F5;font-size:40px;font-weight:900;letter-spacing:12px;margin:0;">${otp}</p>
    </div>
    <p style="color:#555;font-size:12px;line-height:1.6;">
      If you didn't request this, ignore this email — your password will not change.
    </p>
  </div>
  <div style="background:#0D0D0D;padding:16px 32px;border-top:1px solid #1A1A1A;text-align:center;">
    <p style="color:#444;font-size:11px;margin:0;">© 2026 HookaDrop. All rights reserved.</p>
  </div>
</div>
</body></html>`;

  await mailSender(email, "HookaDrop — Password Reset Code", html);
  console.log(`[sendMail] ✅ Password reset OTP sent to ${email}`);
  return { success: true };
};

// ─────────────────────────────────────────────────────────────────────────────
//  Help & Support email  → hookadrop@gmail.com
// ─────────────────────────────────────────────────────────────────────────────
export const sendSupportEmail = async (subject, message, userEmail, userName) => {
  const esc = (s) => String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:Arial,sans-serif;">
<div style="max-width:580px;margin:40px auto;background:#111;border:1px solid #222;border-radius:16px;overflow:hidden;">
  <div style="background:#111;padding:32px;border-bottom:2px solid #08B9F5;">
    <h1 style="color:#08B9F5;font-size:24px;font-weight:900;margin:0;">HookaDrop Support</h1>
    <p style="color:#666;font-size:12px;margin:6px 0 0;">New support request received</p>
  </div>
  <div style="padding:32px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #222;color:#888;font-size:13px;width:130px;">Subject</td>
        <td style="padding:10px 0 10px 16px;border-bottom:1px solid #222;color:#fff;font-size:14px;">${esc(subject)}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #222;color:#888;font-size:13px;">From</td>
        <td style="padding:10px 0 10px 16px;border-bottom:1px solid #222;color:#08B9F5;font-size:14px;">${esc(userName)} &lt;${esc(userEmail)}&gt;</td>
      </tr>
    </table>
    <h3 style="color:#08B9F5;font-size:14px;text-transform:uppercase;letter-spacing:1px;margin:24px 0 8px;">Message</h3>
    <div style="background:#0D0D0D;border:1px solid #222;border-radius:8px;padding:16px;color:#ccc;font-size:14px;line-height:1.7;">
      ${esc(message).replace(/\n/g, "<br/>")}
    </div>
  </div>
  <div style="background:#0D0D0D;padding:16px 32px;border-top:1px solid #1A1A1A;text-align:center;">
    <p style="color:#444;font-size:11px;margin:0;">© 2026 HookaDrop. All rights reserved.</p>
  </div>
</div>
</body></html>`;

  await mailSender(
    "hookadrop@gmail.com",
    `[HookaDrop Support] ${esc(subject)}`,
    html
  );
  console.log(`[sendSupportEmail] ✅ Support email sent — from ${userEmail}`);
};
