// backend/routes/group.route.js
import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  createGroup,
  getUserGroups,
  getGroupMessages,
  addMembers,
  sendGroupMessage,
} from "../controller/group.controller.js";

const router = express.Router();

// Apply protectRoute to all routes
router.use(protectRoute);

// Group CRUD
router.post("/", createGroup);
router.get("/", getUserGroups);

// Group messages
router.get("/:groupId/messages", getGroupMessages);
router.post("/:groupId/messages", sendGroupMessage);

// Group members
router.post("/:groupId/members", addMembers);

export default router;