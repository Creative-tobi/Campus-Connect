const User = require("../models/User.model");
const Club = require("../models/Club.model");
const Post = require("../models/Post.model");
const Notification = require("../models/Notification.model");
const cloudinary = require("../config/cloudinary");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// Configure Multer for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "campus_connect/profile_pictures",
    allowed_formats: ["jpg", "png", "jpeg"],
    transformation: [{ width: 500, height: 500, crop: "limit" }], // Optional resize
  },
});

const upload = multer({ storage });

const getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get joined clubs
    const joinedClubs = await Club.find({
      members: { $elemMatch: { user: userId } },
    }).select("name description category memberCount logo");

    res.render("dashboard/user/dashboard", {
      user,
      joinedClubs,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const joinClub = async (req, res) => {
  try {
    const { id: clubId } = req.params;
    const userId = req.user.id;

    const club = await Club.findById(clubId);
    if (!club) {
      return res.status(404).json({ error: "Club not found" });
    }

    // Check if user is already a member or has a pending request
    const existingMember = club.members.find(
      (m) => m.user.toString() === userId
    );
    if (existingMember) {
      return res
        .status(400)
        .json({ error: "You are already a member of this club" });
    }

    // Check if user has already sent a request (simplified logic, might need adjustment)
    // For now, assume request is sent and pending status is handled elsewhere
    // This endpoint might just redirect to request flow
    res.status(400).json({
      error: "Please send a join request first. Use /clubs/:id/join-request",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const sendJoinRequest = async (req, res) => {
  try {
    const { id: clubId } = req.params;
    const userId = req.user.id;

    const club = await Club.findById(clubId).populate(
      "owner",
      "firstName lastName email"
    );
    if (!club) {
      return res.status(404).json({ error: "Club not found" });
    }

    if (club.owner._id.toString() === userId) {
      return res.status(400).json({ error: "You are the owner of this club" });
    }

    // Check if already a member
    const existingMember = club.members.find(
      (m) => m.user.toString() === userId
    );
    if (existingMember) {
      return res
        .status(400)
        .json({ error: "You are already a member of this club" });
    }

    // In a more complex system, you might store requests separately.
    // For simplicity here, we'll add a pending member request directly to the club.
    // A better approach might be a separate "JoinRequest" model.
    // For this example, we'll simulate the request by notifying the owner.
    // The actual membership is pending until owner approves.

    // Create a notification for the club owner
    const notification = new Notification({
      recipient: club.owner._id,
      type: "JOIN_REQUEST",
      message: `${req.user.firstName} ${req.user.lastName} requested to join your club: ${club.name}`,
      relatedObjectId: userId, // Link to the requesting user
      relatedObjectType: "User",
    });
    await notification.save();

    // Optionally, store the request details in the club model temporarily
    // This requires modifying the club schema to hold requests
    // For now, just notify and assume request is handled via notifications/requests endpoint

    res.json({ message: "Join request sent successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const leaveClub = async (req, res) => {
  try {
    const { id: clubId } = req.params;
    const userId = req.user.id;

    const club = await Club.findById(clubId);
    if (!club) {
      return res.status(404).json({ error: "Club not found" });
    }

    const memberIndex = club.members.findIndex(
      (m) => m.user.toString() === userId
    );
    if (memberIndex === -1) {
      return res
        .status(400)
        .json({ error: "You are not a member of this club" });
    }

    club.members.splice(memberIndex, 1);
    await club.save();

    res.json({ message: "Successfully left the club" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getJoinedClubs = async (req, res) => {
  try {
    const userId = req.user.id;

    const clubs = await Club.find({
      members: { $elemMatch: { user: userId } },
    }).select("name description category memberCount logo");

    res.json({ clubs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getClubDetails = async (req, res) => {
  try {
    const { id: clubId } = req.params;

    const club = await Club.findById(clubId)
      .populate("owner", "firstName lastName email profilePicture")
      .populate("members.user", "firstName lastName profilePicture"); // Populate member details

    if (!club) {
      return res.status(404).json({ error: "Club not found" });
    }

    if (club.status !== "active") {
      return res.status(404).json({ error: "Club is not active" });
    }

    // Check if this is an API request (has Accept header for JSON or query param)
    if (
      (req.headers.accept && req.headers.accept.includes("application/json")) ||
      req.query.format === "json" ||
      req.xhr
    ) {
      // API request - return JSON data
      return res.json({ club });
    } else {
      // Page request - render the view
      if (req.user.role === "user") {
        res.render("dashboard/user/clubs", { club });
      } else {
        res.render("dashboard/club_owner/club/detail", { club });
      }
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const searchClubs = async (req, res) => {
  try {
    const { search, category, page = 1, limit = 10 } = req.query;

    let query = { status: "active" };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }
    if (category) {
      query.category = category;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Club.countDocuments(query);
    const clubs = await Club.find(query)
      .select("name description category memberCount logo banner")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      clubs,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, read } = req.query;

    let query = { recipient: userId };
    if (read === "true") {
      query.read = true;
    } else if (read === "false") {
      query.read = { $ne: true }; // Not read or undefined
    }
    // If read is not specified, get all

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Notification.countDocuments(query);
    const notifications = await Notification.find(query)
      .populate("relatedObjectId", "name title firstName lastName") // Populate depending on type
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      notifications,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const markNotificationAsRead = async (req, res) => {
  try {
    const { id: notificationId } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res
        .status(404)
        .json({ error: "Notification not found or not authorized" });
    }

    res.json({ message: "Notification marked as read", notification });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const uploadProfilePicture = async (req, res) => {
  // Multer middleware should handle the file upload to Cloudinary
  // This controller just updates the user's profile picture field
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const userId = req.user.id;
    const user = await User.findByIdAndUpdate(
      userId,
      { profilePicture: req.file.path }, // Cloudinary URL
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "Profile picture updated successfully", user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getUserPosts = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find clubs the user is a member of
    const joinedClubs = await Club.find({
      members: { $elemMatch: { user: userId } },
    }).select("_id");

    const clubIds = joinedClubs.map((club) => club._id);

    // Get posts from those clubs
    const posts = await Post.find({ club: { $in: clubIds } })
      .populate("author", "firstName lastName profilePicture")
      .populate("club", "name")
      .sort({ createdAt: -1 });

    res.json({ posts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, faculty, phone } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !faculty || !phone) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Check if phone is unique (excluding current user)
    const existingUser = await User.findOne({ phone, _id: { $ne: userId } });
    if (existingUser) {
      return res.status(400).json({ error: "Phone number already in use" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { firstName, lastName, faculty, phone, updatedAt: Date.now() },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "Profile updated successfully", user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get joined clubs count
    const joinedClubsCount = await Club.countDocuments({
      members: { $elemMatch: { user: userId } },
    });

    // Get user's posts count
    const userPostsCount = await Post.countDocuments({ author: userId });

    res.render("dashboard/user/profile", {
      user,
      joinedClubsCount,
      userPostsCount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Export the multer upload middleware for use in the route
module.exports = {
  getDashboard,
  getUserPosts,
  getUserProfile,
  updateUserProfile,
  // joinClub, // Note: This logic is simplified, see comments in function
  sendJoinRequest,
  leaveClub,
  getJoinedClubs,
  getClubDetails,
  searchClubs,
  getNotifications,
  markNotificationAsRead,
  uploadProfilePicture,
  uploadProfilePictureMiddleware: upload.single("profilePicture"), // Export middleware
};
