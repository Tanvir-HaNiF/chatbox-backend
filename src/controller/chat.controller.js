// backend/controller/chat.controller.js
import { StreamChat } from "stream-chat";

const serverClient = StreamChat.getInstance(
  process.env.STREAM_API_KEY,
  process.env.STREAM_API_SECRET
);

export const getStreamToken = async (req, res) => {
  try {
    const token = serverClient.createToken(req.user._id.toString());
    res.status(200).json({ token });
  } catch (error) {
    console.log("Error in getStreamToken", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};