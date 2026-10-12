import express from "express";
import protectRoute from "../middleware/protectRoute.js";
import { submitSupportRequest } from "../controller/supportController.js";

const router = express.Router();

router.post("/", protectRoute, submitSupportRequest);

export default router;
