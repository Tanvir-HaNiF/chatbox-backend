// backend/socket.js
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "./models/User.js";
import GroupMessage from "./models/GroupMessage.js";

const userSocketMap = new Map(); // userId -> socketId

export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: ["http://localhost:5173", "http://localhost:4173"],
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error("No token provided"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
      const userId = decoded.id || decoded._id || decoded.userId;
      
      const user = await User.findById(userId).select("-password");
      if (!user) return next(new Error("User not found"));

      socket.user = user;
      next();
    } catch (err) {
      console.error("Socket Auth Error:", err.message);
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user._id.toString();
    const userName = socket.user.fullName;
    userSocketMap.set(userId, socket.id);
    console.log(`✅ User connected: ${userName} (${userId})`);
    
    socket.broadcast.emit("user_online", userId);

    // ============ GROUP CHAT ============
    socket.on("join_group", (groupId) => {
      socket.join(`group:${groupId}`);
      socket.currentGroupId = groupId;
      console.log(`📌 ${userName} joined group: ${groupId}`);
    });

    socket.on("leave_group", (groupId) => {
      socket.leave(`group:${groupId}`);
      console.log(`🚪 ${userName} left group: ${groupId}`);
    });

    socket.on("group_message", async (data, callback) => {
      try {
        const { groupId, text } = data;
        const message = await GroupMessage.create({
          group: groupId,
          sender: socket.user._id,
          text,
        });

        const populatedMsg = await message.populate("sender", "fullName profilePicture");
        io.to(`group:${groupId}`).emit("new_group_message", populatedMsg);
        
        if (callback) callback({ status: "sent" });
      } catch (err) {
        console.error("Msg Error:", err);
      }
    });

    // ============ GROUP CALL (8-PERSON SUPPORT) ============
    
    socket.on("join_group_call", ({ groupId, userId, name }) => {
      console.log(`🎥 ${name} JOINED call: ${groupId}`);
      socket.join(`call:${groupId}`);
      socket.callData = { groupId, userId, name };
      
      // Get ALL existing participants
      const room = io.sockets.adapter.rooms.get(`call:${groupId}`);
      const existingParticipants = [];
      
      if (room) {
        for (const socketId of room) {
          const participantSocket = io.sockets.sockets.get(socketId);
          if (participantSocket && participantSocket.callData && participantSocket.callData.userId !== userId) {
            existingParticipants.push({
              userId: participantSocket.callData.userId,
              name: participantSocket.callData.name
            });
          }
        }
      }
      
      // Send existing participants to new user
      if (existingParticipants.length > 0) {
        socket.emit("existing_participants", existingParticipants);
        console.log(`📋 Sent ${existingParticipants.length} existing participants to ${name}`);
      }
      
      // Notify others about new user
      socket.to(`call:${groupId}`).emit("user_joined", { userId, name });
      
      // Update participant count
      const updatedRoom = io.sockets.adapter.rooms.get(`call:${groupId}`);
      const participantCount = updatedRoom ? updatedRoom.size : 1;
      io.to(`call:${groupId}`).emit("participant_count", participantCount);
      
      console.log(`📊 Call ${groupId} now has ${participantCount} participants`);
    });

    socket.on("leave_group_call", ({ groupId, userId }) => {
      console.log(`🎥 User ${userId} LEFT call: ${groupId}`);
      socket.leave(`call:${groupId}`);
      socket.to(`call:${groupId}`).emit("user_left", userId);
      
      const room = io.sockets.adapter.rooms.get(`call:${groupId}`);
      const participantCount = room ? room.size : 0;
      io.to(`call:${groupId}`).emit("participant_count", participantCount);
      
      delete socket.callData;
    });

    // WebRTC Signaling
    socket.on("offer", ({ to, offer }) => {
      const targetSocketId = userSocketMap.get(to);
      if (targetSocketId) {
        io.to(targetSocketId).emit("offer", { 
          from: socket.callData?.userId || socket.user._id,
          fromName: socket.callData?.name || socket.user.fullName,
          offer 
        });
      }
    });

    socket.on("answer", ({ to, answer }) => {
      const targetSocketId = userSocketMap.get(to);
      if (targetSocketId) {
        io.to(targetSocketId).emit("answer", { 
          from: socket.callData?.userId || socket.user._id,
          answer 
        });
      }
    });

    socket.on("ice-candidate", ({ to, candidate }) => {
      const targetSocketId = userSocketMap.get(to);
      if (targetSocketId) {
        io.to(targetSocketId).emit("ice-candidate", { 
          from: socket.callData?.userId || socket.user._id,
          candidate 
        });
      }
    });

    socket.on("disconnect", () => {
      if (socket.callData) {
        socket.to(`call:${socket.callData.groupId}`).emit("user_left", socket.callData.userId);
      }
      userSocketMap.delete(userId);
      socket.broadcast.emit("user_offline", userId);
      console.log(`🔴 User disconnected: ${userName} (${userId})`);
    });
  });

  return io;
};