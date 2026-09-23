import nodemailer from "nodemailer";
import User from "../models/User.js";
import otpGenerator from "otp-generator";
export const mailSender = async (email, title, body) => {
  try {
    // Create a Transporter to send emails
    var transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: "bibani.noussaier@gmail.com",
        pass: "wrah amde zuib avpq",
      },
    });
    // Send emails to users
    let info = await transporter.sendMail({
      from: "electroShop",
      to: email,
      subject: title,
      html: body,
    });

    return info;
  } catch (error) {
    console.log(error.message);
  }
};
export const sendMail = async (email) => {
  let otp = otpGenerator.generate(6, {
    upperCaseAlphabets: false,
    lowerCaseAlphabets: false,
    specialChars: false,
  });
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error("User not found");
  }
  user.resetOtp = otp;
  user.otpExpires = Date.now() + 3600000; // OTP expires in 1 hour
  await user.save();
  try {
    const mailResponse = await mailSender(
      email,
      "Reset Verification",
      `<div style="font-family: Arial, sans-serif; text-align: center;">
        <h1>Reset Verification</h1>
        <p style="font-size: 16px; font-weight: 500;">
          It seems you are trying to login to our website with an invalid password.
          Here is your verification code:
        </p>
        <p style="font-size: 28px; background-color: #f9f9f9; padding: 10px 30px; font-weight: 600; color: #020202; letter-spacing: 4px;">
          Code: ${otp}
        </p>
      </div>`
    );

    return mailResponse;
  } catch (error) {
    console.log("Error occurred while sending email: ", error);
    throw error;
  }
};
