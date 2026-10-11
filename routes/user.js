import express from "express";
import {
  Login,
  Register,
  VerifyEmail,
  ResendVerification,
  UpdateUser,
  getProfile,
  getMe,
  SendOtp,
  resetPassword,
  verifyOtp,
  changePassword
} from "../controller/user.js";
import protectRoute from "../middleware/protectRoute.js";

const router = express.Router();

router.post("/users",                      Register);
router.post("/users/verify-email",         VerifyEmail);
router.post("/users/resend-verification",  ResendVerification);
router.post("/auth/login",                 Login);
router.get("/profile/me",                  protectRoute, getMe);
router.put("/profile/update",              protectRoute, UpdateUser);
router.get("/profile/:id",                 protectRoute, getProfile);
router.post("/auth/send-otp",              SendOtp);
router.put("/auth/reset-password",         resetPassword);
router.post("/auth/verify-otp",            verifyOtp);
router.put("/auth/change-password",        protectRoute, changePassword);

export default router;
