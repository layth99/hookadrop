import { sendSupportEmail } from "../controller/mailerSender.js";

export const submitSupportRequest = async (req, res) => {
  try {
    const { subject, category, description, orderNumber } = req.body;

    // Validate required fields
    if (!subject || !subject.trim()) {
      return res.status(400).json({ error: "Subject is required." });
    }
    if (!description || description.trim().length < 10) {
      return res.status(400).json({ error: "Please provide more detail in your description." });
    }

    const userName  = req.user?.name  || "Unknown";
    const userEmail = req.user?.email || "unknown@email.com";

    const fullMessage =
      `Category: ${category || "Not specified"}\n\n` +
      `${description.trim()}` +
      (orderNumber ? `\n\nOrder Number: ${orderNumber}` : "");

    await sendSupportEmail(subject.trim(), fullMessage, userEmail, userName);

    // Send confirmation back to user (fire-and-forget)
    import("../controller/mailerSender.js").then(({ mailSender }) => {
      const confirmHtml = `
        <div style="max-width:480px;margin:40px auto;background:#111;border:1px solid #222;border-radius:16px;overflow:hidden;font-family:Arial,sans-serif;">
          <div style="background:#111;padding:28px 32px;border-bottom:2px solid #08B9F5;text-align:center;">
            <h1 style="color:#08B9F5;font-size:24px;font-weight:900;margin:0;">HookaDrop</h1>
          </div>
          <div style="padding:32px;">
            <p style="color:#ccc;font-size:15px;margin:0 0 12px;">Hello <strong style="color:#08B9F5;">${userName}</strong>,</p>
            <p style="color:#999;font-size:14px;line-height:1.6;margin:0 0 20px;">
              We have received your support request about <strong style="color:#fff;">"${subject.trim()}"</strong>.
            </p>
            <p style="color:#999;font-size:14px;line-height:1.6;margin:0 0 20px;">
              Our team will get back to you within <strong style="color:#08B9F5;">24 hours</strong>.
            </p>
            <p style="color:#08B9F5;font-size:14px;font-weight:600;margin:0;">— The HookaDrop Team</p>
          </div>
          <div style="background:#0D0D0D;padding:16px 32px;border-top:1px solid #1A1A1A;text-align:center;">
            <p style="color:#444;font-size:11px;margin:0;">© 2026 HookaDrop. All rights reserved.</p>
          </div>
        </div>`;
      mailSender(userEmail, "We received your request — HookaDrop Support", confirmHtml)
        .catch(err => console.error("[support] Confirmation email failed:", err.message));
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: "Support request received. We'll get back to you within 24 hours.",
    });
  } catch (error) {
    console.error("[support] Error:", error.message);
    return res.status(500).json({ error: "Failed to send support email. Please try again." });
  }
};
