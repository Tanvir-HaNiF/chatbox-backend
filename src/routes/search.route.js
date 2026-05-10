import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { searchUsers } from "../controller/search.controller.js";

const router = express.Router();
router.get("/users", protectRoute, searchUsers);

export default router;