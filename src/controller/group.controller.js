// backend/controller/group.controller.js
import Group from "../models/Group.js";
import GroupMessage from "../models/GroupMessage.js";

// CREATE GROUP
export const createGroup = async (req, res) => {
  try {
    const { name, description = "", memberIds = [] } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Group name required" });
    }

    const members = Array.isArray(memberIds)
      ? [...new Set([req.user._id.toString(), ...memberIds])]
      : [req.user._id.toString()];

    const group = await Group.create({
      name,
      description,
      createdBy: req.user._id,
      members,
    });

    // Populate members before sending response
    const populatedGroup = await Group.findById(group._id).populate("members", "fullName profilePicture");

    res.status(201).json({ success: true, group: populatedGroup });
  } catch (error) {
    console.error("Create group error:", error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
};

// GET GROUPS
export const getUserGroups = async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id }).populate(
      "members",
      "fullName profilePicture"
    );

    res.status(200).json(groups);
  } catch (error) {
    console.error("Get groups error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// GET MESSAGES
export const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;

    const messages = await GroupMessage.find({ group: groupId })
      .populate("sender", "fullName profilePicture")
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error("Get group messages error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ADD MEMBERS
export const addMembers = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { memberIds = [] } = req.body;

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    memberIds.forEach((id) => {
      if (!group.members.includes(id)) {
        group.members.push(id);
      }
    });

    await group.save();
    await group.populate("members", "fullName profilePicture");

    res.status(200).json({ success: true, group });
  } catch (error) {
    console.error("Add members error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// SEND GROUP MESSAGE
export const sendGroupMessage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ message: "Message text required" });
    }
    
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }
    
    if (!group.members.includes(req.user._id)) {
      return res.status(403).json({ message: "Not a member of this group" });
    }
    
    const message = await GroupMessage.create({
      group: groupId,
      sender: req.user._id,
      text,
    });
    
    const populatedMsg = await message.populate("sender", "fullName profilePicture");
    res.status(201).json(populatedMsg);
  } catch (error) {
    console.error("Send group message error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};