const User = require("../models/User.model");
const Club = require("../models/Club.model");
const Post = require("../models/Post.model");
const Notification = require("../models/Notification.model");
const { sendEmail } = require("../services/nodemailer");
const cloudinary = require("../config/cloudinary");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// Configure Multer for Cloudinary (for club logo/banner)
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "campus_connect/clubs",
    allowed_formats: ["jpg", "png", "jpeg"],
    transformation: [{ width: 800, height: 400, crop: "fill" }], // Example for banner
  },
});

const upload = multer({ storage });

const createClub = async (req, res) => {
  try {
    const { name, description, category } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!name || !description || !category) {
      return res
        .status(400)
        .json({ error: "Name, description, and category are required" });
    }

    // Check if club name already exists
    const existingClub = await Club.findOne({ name: name.trim() });
    if (existingClub) {
      return res
        .status(400)
        .json({ error: "A club with this name already exists" });
    }

    // Create the club
    const newClub = new Club({
      name: name.trim(),
      description: description.trim(),
      category: category,
      owner: userId,
      members: [{ user: userId, role: "member" }], // Owner is also a member initially
      status: "pending", // Requires admin approval
    });

    // Add logo/banner if uploaded via multer
    if (req.file) {
      if (req.file.fieldname === "logo") {
        newClub.logo = req.file.path;
      } else if (req.file.fieldname === "banner") {
        newClub.banner = req.file.path;
      }
    }

    await newClub.save();

    // Find the admin user to notify
    const adminUser = await User.findOne({ role: "admin" });
    if (adminUser) {
      // Create notification for admin
      const notification = new Notification({
        recipient: adminUser._id,
        type: "CLUB_APPROVAL",
        message: `New club "${newClub.name}" created by ${req.user.firstName} ${req.user.lastName}. Awaiting approval.`,
        relatedObjectId: newClub._id,
        relatedObjectType: "Club",
      });
      await notification.save();

      // Send email notification to admin
      const emailSubject = `New Club Awaiting Approval: ${newClub.name}`;
      const emailText = `Hello Admin,

A new club "${newClub.name}" has been created by ${req.user.firstName} ${req.user.lastName} (${req.user.email}).
Description: ${newClub.description}
Category: ${newClub.category}

Please review and approve or reject the club.

Best regards,
Campus Connect Team`;

      await sendEmail(adminUser.email, emailSubject, emailText);
    }

    // Switch user role to club_owner
    const user = await User.findById(userId);
    if (user) {
      user.role = "club_owner";
      await user.save();
    }

    res.status(201).json({
      message:
        "Club created successfully and awaiting admin approval. Your role has been updated to club owner.",
      club: newClub,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getMyClubs = async (req, res) => {
  try {
    const userId = req.user.id;

    const clubs = await Club.find({ owner: userId }).select(
      "name description category status memberCount logo banner createdAt"
    );
    res.render("dashboard/club_owner/dashboard", { clubs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateClub = async (req, res) => {
  try {
    const { id: clubId } = req.params;
    const { name, description, category } = req.body;
    const userId = req.user.id;

    const club = await Club.findOne({ _id: clubId, owner: userId });
    if (!club) {
      return res
        .status(404)
        .json({ error: "Club not found or you are not the owner" });
    }

    // Prevent updating name if it conflicts with another club (except itself)
    if (name && name.trim() !== club.name) {
      const existingClub = await Club.findOne({
        name: name.trim(),
        _id: { $ne: clubId },
      });
      if (existingClub) {
        return res
          .status(400)
          .json({ error: "A club with this name already exists" });
      }
      club.name = name.trim();
    }

    if (description) club.description = description.trim();
    if (category) club.category = category;

    // Update logo/banner if uploaded
    if (req.file) {
      if (req.file.fieldname === "logo") {
        club.logo = req.file.path;
      } else if (req.file.fieldname === "banner") {
        club.banner = req.file.path;
      }
    }

    await club.save();

    res.json({ message: "Club updated successfully", club });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteClub = async (req, res) => {
  try {
    const { id: clubId } = req.params;
    const userId = req.user.id;

    const club = await Club.findOne({ _id: clubId, owner: userId });
    if (!club) {
      return res
        .status(404)
        .json({ error: "Club not found or you are not the owner" });
    }

    await Club.findByIdAndDelete(clubId);

    // Optionally, switch role back to 'user' if this was the only club owned
    // For now, we'll assume the user remains a club_owner if they own other clubs
    // This logic might need refinement based on requirements

    res.json({ message: "Club deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getClubById = async (req, res) => {
  try {
    const { id: clubId } = req.params;

    const club = await Club.findById(clubId)
      .populate("owner", "firstName lastName email profilePicture")
      .populate("members.user", "firstName lastName profilePicture"); // Populate member details

    if (!club) {
      return res.status(404).json({ error: "Club not found" });
    }

    // Check if this is a public route (no authentication required for active clubs)
    const isPublicRoute = req.route.path === "/public/:id";

    if (isPublicRoute) {
      // For public route, only show active clubs
      if (club.status !== "active") {
        return res.status(404).json({ error: "Club not found" });
      }
      // Return JSON for public access
      return res.json({ club });
    } else {
      // For authenticated route, check permissions
      if (
        club.status !== "active" &&
        club.owner._id.toString() !== req.user.id &&
        req.user.role !== "admin"
      ) {
        return res.status(404).json({ error: "Club is not active" });
      }

      // Check if this is an API request (has Accept header for JSON or query param)
      if (
        (req.headers.accept &&
          req.headers.accept.includes("application/json")) ||
        req.query.format === "json" ||
        req.xhr
      ) {
        // API request - return JSON data
        return res.json({ club });
      } else {
        // Page request - render the view
        res.render("dashboard/club_owner/club/detail", { club });
      }
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getActiveClubs = async (req, res) => {
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

const getJoinRequests = async (req, res) => {
  try {
    const clubId = req.params.id;
    const userId = req.user.id;

    // Find club and check if user is the owner
    const club = await Club.findById(clubId).populate(
      "members.user",
      "firstName lastName email profilePicture"
    );
    if (!club || club.owner.toString() !== userId) {
      return res
        .status(403)
        .json({ error: "Access denied. You are not the club owner." });
    }

    // In this simplified model, requests are handled via notifications.
    // We can find users who are not members but might have sent requests implicitly.
    // A more robust system would have a separate JoinRequest model.
    // For now, we'll just return the current members as an example structure.
    // This part needs more complex logic depending on how requests are stored.
    // Let's assume requests are implicitly linked via notifications of type JOIN_REQUEST.

    const joinRequests = await Notification.find({
      relatedObjectId: { $in: club.members.map((m) => m.user) }, // This is not correct for requests
      type: "JOIN_REQUEST",
      relatedObjectType: "User",
    }).populate("recipient", "firstName lastName email"); // recipient is club owner

    // A better approach: Find users who sent join requests (requires a separate request model or flag in club/members)
    // For now, return an empty array or a placeholder.
    // This requires a significant design decision on how to track requests.
    // Placeholder:
    const requests = []; // Implement based on your request storage strategy

    res.json({ requests });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const respondToJoinRequest = async (req, res) => {
  try {
    const { id: clubId, requestId: userIdToRespond } = req.params; // requestId might be the user ID requesting
    const { action } = req.body; // 'approve' or 'decline'
    const ownerId = req.user.id;

    const club = await Club.findOne({ _id: clubId, owner: ownerId });
    if (!club) {
      return res
        .status(404)
        .json({ error: "Club not found or you are not the owner" });
    }

    const userToRespond = await User.findById(userIdToRespond);
    if (!userToRespond) {
      return res.status(404).json({ error: "User not found" });
    }

    if (action === "approve") {
      // Check if already a member
      const isMember = club.members.some(
        (m) => m.user.toString() === userIdToRespond
      );
      if (isMember) {
        return res.status(400).json({ error: "User is already a member" });
      }

      // Add user to members
      club.members.push({ user: userIdToRespond });
      await club.save();

      // Create notification for the user
      const notification = new Notification({
        recipient: userIdToRespond,
        type: "JOIN_APPROVED",
        message: `Your request to join the club "${club.name}" has been approved.`,
        relatedObjectId: club._id,
        relatedObjectType: "Club",
      });
      await notification.save();

      // Send email notification
      const emailSubject = `Join Request Approved for ${club.name}`;
      const emailText = `Dear ${userToRespond.firstName} ${userToRespond.lastName},

Your request to join the club "${club.name}" has been approved by the club owner.
You are now a member of the club.

Best regards,
Campus Connect Team`;

      await sendEmail(userToRespond.email, emailSubject, emailText);
    } else if (action === "decline") {
      // Create notification for the user
      const notification = new Notification({
        recipient: userIdToRespond,
        type: "JOIN_DECLINED",
        message: `Your request to join the club "${club.name}" has been declined.`,
        relatedObjectId: club._id,
        relatedObjectType: "Club",
      });
      await notification.save();

      // Send email notification
      const emailSubject = `Join Request Declined for ${club.name}`;
      const emailText = `Dear ${userToRespond.firstName} ${userToRespond.lastName},

Your request to join the club "${club.name}" has been declined by the club owner.

Best regards,
Campus Connect Team`;

      await sendEmail(userToRespond.email, emailSubject, emailText);
    } else {
      return res
        .status(400)
        .json({ error: 'Invalid action. Use "approve" or "decline".' });
    }

    res.json({
      message: `Join request ${
        action === "approve" ? "approved" : "declined"
      } successfully`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getClubMembers = async (req, res) => {
  try {
    const { id: clubId } = req.params;

    const club = await Club.findById(clubId).populate(
      "members.user",
      "firstName lastName email profilePicture"
    );

    if (!club) {
      return res.status(404).json({ error: "Club not found" });
    }

    res.json({ members: club.members });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createPost = async (req, res) => {
  try {
    const { id: clubId } = req.params;
    const { title, content } = req.body;
    const userId = req.user.id;

    const club = await Club.findOne({ _id: clubId, owner: userId }); // Only owner can post
    if (!club) {
      return res
        .status(404)
        .json({ error: "Club not found or you are not the owner" });
    }

    const newPost = new Post({
      title: title.trim(),
      content: content.trim(),
      author: userId,
      club: clubId,
    });

    // Add media if uploaded
    if (req.file) {
      newPost.media = req.file.path;
    }

    await newPost.save();

    // Notify members about the new post
    for (const memberObj of club.members) {
      if (memberObj.user.toString() !== userId) {
        // Don't notify the author
        const notification = new Notification({
          recipient: memberObj.user,
          type: "NEW_POST",
          message: `New post "${newPost.title}" published in club "${club.name}".`,
          relatedObjectId: newPost._id,
          relatedObjectType: "Post",
        });
        await notification.save();
      }
    }

    res
      .status(201)
      .json({ message: "Post created successfully", post: newPost });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getClubPosts = async (req, res) => {
  try {
    const { id: clubId } = req.params;

    const posts = await Post.find({ club: clubId })
      .populate("author", "firstName lastName profilePicture")
      .sort({ createdAt: -1 });

    res.json({ posts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    // Find post and check if user is the author and club owner
    const post = await Post.findById(postId).populate("club");
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Check if user is the author AND the owner of the club the post belongs to
    if (
      post.author.toString() !== userId ||
      post.club.owner.toString() !== userId
    ) {
      return res.status(403).json({
        error: "Access denied. You are not authorized to delete this post.",
      });
    }

    await Post.findByIdAndDelete(postId);

    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Export the multer upload middleware for use in the route
module.exports = {
  createClub,
  getMyClubs,
  updateClub,
  deleteClub,
  getClubById,
  getActiveClubs,
  getJoinRequests, // Note: Logic needs refinement
  respondToJoinRequest,
  getClubMembers,
  createPost,
  getClubPosts,
  deletePost,
  uploadClubImageMiddleware: upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "banner", maxCount: 1 },
    { name: "postMedia", maxCount: 1 },
  ]), // Export middleware
};
