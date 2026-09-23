import express from "express";
import protectRoute from "../middleware/protectRoute.js";
import requireRole from "../middleware/requireRole.js";
import {
  getAllUsers,
  updateUserRole,
  createUser,
  deleteUser,
} from "../controller/admin.js";

const router = express.Router();

// All admin routes require authentication + admin role
router.get("/users",        protectRoute, requireRole("admin", "viewer"), getAllUsers);
router.post("/users/create",protectRoute, requireRole("admin"),           createUser);
router.put("/users/:id",    protectRoute, requireRole("admin"),           updateUserRole);
router.delete("/users/:id", protectRoute, requireRole("admin"),           deleteUser);

export default router;
