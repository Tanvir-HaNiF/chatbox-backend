import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { chatWithMentor } from "../controller/ai.controller.js";

const router = express.Router();
router.post("/mentor", protectRoute, chatWithMentor);

export default router;