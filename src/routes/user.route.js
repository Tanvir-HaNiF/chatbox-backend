import express from 'express';
import { protectRoute } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.js';

import { 
  acceptFriendRequest, 
  getFriendRequests,
  getMyFriends,
  getOutgoingFriendReqs,
  getRecommendedUsers,
  sendFriendRequest,
  uploadProfilePicture,
  generateRandomAvatar
} from '../controller/user.controller.js';

const router = express.Router();

// All routes require authentication
router.use(protectRoute);

// User routes
router.get("/", getRecommendedUsers);
router.get("/friends", getMyFriends);

// Friend request routes
router.post("/friend-request/:id", sendFriendRequest);
router.put("/friend-request/:id/accept", acceptFriendRequest);
router.get("/friend-requests", getFriendRequests);
router.get("/outgoing-friend-request", getOutgoingFriendReqs);

// Profile picture routes
router.post("/upload-avatar", upload.single("avatar"), uploadProfilePicture);
router.post("/random-avatar", generateRandomAvatar);

export default router;