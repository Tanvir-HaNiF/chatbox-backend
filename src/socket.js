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

    // ============ GROUP CALL INVITATION ============
    // User initiates a group call
    // socket.on("start_group_call", ({ groupId, callerId, callerName }) => {
    //   console.log(`📞 ${callerName} started a group call in group: ${groupId}`);
      
    //   // Notify ALL members in the group room about the incoming call
    //   socket.to(`group:${groupId}`).emit("incoming_group_call", {
    //     groupId,
    //     callerId,
    //     callerName,
    //     callType: "group"
    //   });
      
    //   // Also join the caller to the call room
    //   socket.join(`call:${groupId}`);
    // });


// Add to backend/socket.js inside io.on("connection", (socket) => { ... })

// Group call started notification
socket.on("group_call_started", ({ groupId, callLink, callerName }) => {
  console.log(`📞 ${callerName} started a group call in ${groupId}`);
  socket.to(`group:${groupId}`).emit("new_group_message", {
    _id: Date.now(),
    text: `🔴 **Group Call Started!** \n\nJoin here: ${callLink}`,
    sender: { _id: socket.user._id, fullName: callerName },
    createdAt: new Date()
  });
});

// Join group call
socket.on("join_group_call", ({ groupId, userId, name }) => {
  console.log(`🎥 ${name} joined call: ${groupId}`);
  socket.join(`call:${groupId}`);
  socket.to(`call:${groupId}`).emit("participant_joined", { userId, name });
});

// Leave group call
socket.on("leave_group_call", ({ groupId, userId }) => {
  console.log(`🎥 User left call: ${groupId}`);
  socket.leave(`call:${groupId}`);
  socket.to(`call:${groupId}`).emit("participant_left", userId);
});


    // // User joins the group call
    // socket.on("join_group_call", ({ groupId, userId, name }) => {
    //   console.log(`🎥 ${name} joined group call: ${groupId}`);
    //   socket.join(`call:${groupId}`);
      
    //   socket.callGroupId = groupId;
    //   socket.callUserId = userId;
    //   socket.callName = name;
      
    //   // Get all existing participants in the call
    //   const room = io.sockets.adapter.rooms.get(`call:${groupId}`);
    //   const existingParticipants = [];
      
    //   if (room) {
    //     for (const socketId of room) {
    //       const participantSocket = io.sockets.sockets.get(socketId);
    //       if (participantSocket && participantSocket.callUserId !== userId) {
    //         existingParticipants.push({
    //           userId: participantSocket.callUserId,
    //           name: participantSocket.callName,
    //           socketId: socketId
    //         });
    //       }
    //     }
    //   }
      
    //   // Notify others about new participant
    //   socket.to(`call:${groupId}`).emit("participant_joined", { userId, name });
      
    //   // Send existing participants to the new joiner
    //   if (existingParticipants.length > 0) {
    //     socket.emit("existing_participants", existingParticipants);
    //   }
    // });

    socket.on("leave_group_call", ({ groupId, userId }) => {
      console.log(`🎥 User ${userId} left group call: ${groupId}`);
      socket.leave(`call:${groupId}`);
      socket.to(`call:${groupId}`).emit("participant_left", userId);
      delete socket.callGroupId;
      delete socket.callUserId;
      delete socket.callName;
    });

    // WebRTC signaling
    socket.on("offer", ({ to, offer }) => {
      const targetSocketId = userSocketMap.get(to);
      if (targetSocketId) {
        io.to(targetSocketId).emit("offer", { 
          from: socket.user._id, 
          fromName: socket.user.fullName,
          offer 
        });
      }
    });

    socket.on("answer", ({ to, answer }) => {
      const targetSocketId = userSocketMap.get(to);
      if (targetSocketId) {
        io.to(targetSocketId).emit("answer", { 
          from: socket.user._id, 
          answer 
        });
      }
    });

    socket.on("ice_candidate_group", ({ to, candidate }) => {
      const targetSocketId = userSocketMap.get(to);
      if (targetSocketId) {
        io.to(targetSocketId).emit("ice_candidate_group", { 
          from: socket.user._id, 
          candidate 
        });
      }
    });

    socket.on("disconnect", () => {
      userSocketMap.delete(userId);
      socket.broadcast.emit("user_offline", userId);
      console.log(`🔴 User disconnected: ${userName} (${userId})`);
    });
  });

  return io;
};