// backend/middleware/auth.middleware.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protectRoute = async (req, res, next) => {
  try {
    // Get token from cookie or Authorization header
    let token = req.cookies?.jwt;
    
    if (!token && req.headers.authorization) {
      token = req.headers.authorization.split(" ")[1];
    }
    
    if (!token) {
      return res.status(401).json({ message: "Unauthorized - no token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    
    // Get userId from different possible locations in token
    const userId = decoded.userId || decoded._id || decoded.id;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized - invalid token payload" });
    }

    const user = await User.findById(userId).select("-password");
    
    if (!user) {
      return res.status(401).json({ message: "Unauthorized - user not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Error in protectRoute middleware:", error);
    
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Unauthorized - invalid token" });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Unauthorized - token expired" });
    }
    
    res.status(500).json({ message: "Internal server error" });
  }
};