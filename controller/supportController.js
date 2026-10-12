import { mailSender } from "../controller/mailerSender.js";

/** Minimal HTML-escape to prevent user input from injecting markup into emails. */
const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const submitSupportRequest = async (req, res) => {
  try {
    const { subject, category, description, orderNumber } = req.body;

    // Validate required fields
    if (!subject || !category || !description || description.length < 20) {
      return res.status(400).json({ error: "subject, category, and description are required." });
    }

    // req.user is populated by protectRoute middleware
    const userName  = req.user.name || "Unknown";
    const userEmail = req.user.email;

    // ── Admin notification email ──────────────────────────────────────────────
    const adminHtml = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:40px 20px;">
  <tr><td align="center">
    <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">
      <!-- Header -->
      <tr><td align="center" style="background:linear-gradient(135deg,#111111 0%,#1a1200 100%);border-radius:16px 16px 0 0;padding:36px 40px 28px;border-bottom:2px solid #FFD000;">
        <h1 style="color:#FFD000;font-size:28px;font-weight:900;letter-spacing:-0.5px;margin:0;">HookaDrop</h1>
        <p style="color:#666;font-size:12px;margin:6px 0 0;letter-spacing:2px;text-transform:uppercase;">New Support Request</p>
      </td></tr>
      <!-- Body -->
      <tr><td style="background:#111111;padding:36px 40px;">
        <p style="color:#CCCCCC;font-size:15px;margin:0 0 24px;line-height:1.6;">
          A user has submitted a new support request. Details are below.
        </p>

        <!-- Fields table -->
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #222;width:140px;color:#888;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Subject</td>
            <td style="padding:10px 0 10px 16px;border-bottom:1px solid #222;color:#FFFFFF;font-size:14px;">${esc(subject)}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #222;color:#888;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Category</td>
            <td style="padding:10px 0 10px 16px;border-bottom:1px solid #222;color:#FFFFFF;font-size:14px;">${esc(category)}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #222;color:#888;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Description</td>
            <td style="padding:10px 0 10px 16px;border-bottom:1px solid #222;color:#CCCCCC;font-size:14px;line-height:1.7;">${esc(description).replace(/\n/g, "<br/>")}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #222;color:#888;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Order #</td>
            <td style="padding:10px 0 10px 16px;border-bottom:1px solid #222;color:${orderNumber ? "#FFFFFF" : "#555"};font-size:14px;">${orderNumber ? esc(orderNumber) : "Not provided"}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#888;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Submitted By</td>
            <td style="padding:10px 0 10px 16px;color:#FFD000;font-size:14px;">${esc(userName)} &lt;${esc(userEmail)}&gt;</td>
          </tr>
        </table>
      </td></tr>
      <!-- Footer -->
      <tr><td style="background:#0D0D0D;border-radius:0 0 16px 16px;padding:20px 40px;border-top:1px solid #1A1A1A;text-align:center;">
        <p style="color:#444;font-size:11px;margin:0;">© 2026 HookaDrop. All rights reserved.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

    // ── User confirmation email ────────────────────────────────────────────────
    const confirmHtml = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:40px 20px;">
  <tr><td align="center">
    <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
      <!-- Header -->
      <tr><td align="center" style="background:linear-gradient(135deg,#111111 0%,#1a1200 100%);border-radius:16px 16px 0 0;padding:36px 40px 28px;border-bottom:2px solid #FFD000;">
        <h1 style="color:#FFD000;font-size:28px;font-weight:900;letter-spacing:-0.5px;margin:0;">HookaDrop</h1>
        <p style="color:#666;font-size:12px;margin:6px 0 0;letter-spacing:2px;text-transform:uppercase;">Support Confirmation</p>
      </td></tr>
      <!-- Body -->
      <tr><td style="background:#111111;padding:36px 40px;">
        <p style="color:#CCCCCC;font-size:16px;margin:0 0 8px;">Hello <strong style="color:#FFD000;">${esc(userName)}</strong>,</p>
        <p style="color:#999;font-size:14px;line-height:1.7;margin:0 0 24px;">
          We have received your support request and our team will review it shortly.
        </p>

        <!-- Confirmation card -->
        <div style="background:#1A1A1A;border:1px solid #2A2A2A;border-radius:12px;padding:24px;margin-bottom:28px;">
          <p style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 6px;">Your request subject</p>
          <p style="color:#FFFFFF;font-size:16px;font-weight:600;margin:0 0 16px;">${esc(subject)}</p>
          <p style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 4px;">Expected response time</p>
          <p style="color:#FFD000;font-size:14px;font-weight:700;margin:0;">Within 24 hours</p>
        </div>

        <p style="color:#555;font-size:13px;line-height:1.6;margin:0;">
          If you have additional information to add, simply reply to this email.<br/>
          Thank you for reaching out to HookaDrop Support.
        </p>
      </td></tr>
      <!-- Sign off -->
      <tr><td style="background:#0D0D0D;border-radius:0 0 16px 16px;padding:20px 40px;border-top:1px solid #1A1A1A;text-align:center;">
        <p style="color:#FFD000;font-size:13px;font-weight:600;margin:0 0 6px;">— The HookaDrop Team</p>
        <p style="color:#444;font-size:11px;margin:0;">© 2026 HookaDrop. All rights reserved.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

    // Send admin notification (awaited — must succeed)
    await mailSender("hookadrop@gmail.com", `New Support Request: ${esc(subject)}`, adminHtml);

    // Send user confirmation (fire-and-forget)
    mailSender(userEmail, "We received your request — HookaDrop Support", confirmHtml)
      .catch((err) => console.error("[support] Failed to send confirmation email:", err.message));

    return res.status(200).json({
      success: true,
      message: "Support request received. We'll get back to you within 24 hours.",
    });
  } catch (error) {
    console.error("[support] Error in submitSupportRequest:", error.message);
    return res.status(500).json({ error: "Failed to send support email. Please try again." });
  }
};
