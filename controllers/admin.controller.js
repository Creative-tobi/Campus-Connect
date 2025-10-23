const User = require('../models/User.model');
const Club = require('../models/Club.model');
const Post = require('../models/Post.model');
const Notification = require('../models/Notification.model');
const { sendEmail } = require('../services/nodemailer');

const getAdminDashboard = async (req, res) => {
    try {
        const [
            totalUsers,
            totalClubs,
            totalPosts,
            pendingClubs,
            totalNotifications
        ] = await Promise.all([
            User.countDocuments(),
            Club.countDocuments(),
            Post.countDocuments(),
            Club.countDocuments({ status: 'pending' }),
            Notification.countDocuments()
        ]);

        res.json({
            stats: {
                totalUsers,
                totalClubs,
                totalPosts,
                pendingClubs,
                totalNotifications
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, role } = req.query;

        let query = {};
        if (search) {
            query.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        if (role) {
            query.role = role;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await User.countDocuments(query);
        const users = await User.find(query)
            .select('firstName lastName email role isVerified isActive createdAt')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        res.json({
            users,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(total / parseInt(limit)),
                total,
                limit: parseInt(limit)
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getAllClubs = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, status, category } = req.query;

        let query = {};
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        if (status) {
            query.status = status;
        }
        if (category) {
            query.category = category;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await Club.countDocuments(query);
        const clubs = await Club.find(query)
            .populate('owner', 'firstName lastName email') // Populate club owner details
            .select('name description category status memberCount logo banner owner createdAt')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        res.json({
            clubs,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(total / parseInt(limit)),
                total,
                limit: parseInt(limit)
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getAllPosts = async (req, res) => {
    try {
        const { page = 1, limit = 10, search } = req.query;

        let query = {};
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await Post.countDocuments(query);
        const posts = await Post.find(query)
            .populate('author', 'firstName lastName')
            .populate('club', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        res.json({
            posts,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(total / parseInt(limit)),
                total,
                limit: parseInt(limit)
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const approveClub = async (req, res) => {
    try {
        const { id: clubId } = req.params;

        const club = await Club.findById(clubId);
        if (!club) {
            return res.status(404).json({ error: 'Club not found' });
        }

        if (club.status !== 'pending') {
            return res.status(400).json({ error: 'Club is not pending approval' });
        }

        club.status = 'active';
        await club.save();

        // Notify the club owner
        const owner = await User.findById(club.owner);
        if (owner) {
            const notification = new Notification({
                recipient: owner._id,
                type: 'CLUB_APPROVED',
                message: `Your club "${club.name}" has been approved by the admin.`,
                relatedObjectId: club._id,
                relatedObjectType: 'Club'
            });
            await notification.save();

            const emailSubject = `Club Approved: ${club.name}`;
            const emailText = `Dear ${owner.firstName} ${owner.lastName},

Your club "${club.name}" has been approved by the admin.
Your club is now active and visible to users.

Best regards,
Campus Connect Team`;

            await sendEmail(owner.email, emailSubject, emailText);
        }

        res.json({ message: 'Club approved successfully', club });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const rejectClub = async (req, res) => {
    try {
        const { id: clubId } = req.params;

        const club = await Club.findById(clubId);
        if (!club) {
            return res.status(404).json({ error: 'Club not found' });
        }

        if (club.status !== 'pending') {
            return res.status(400).json({ error: 'Club is not pending approval' });
        }

        // Find the owner to notify before deletion
        const owner = await User.findById(club.owner);

        // Delete the club (as per requirement)
        await Club.findByIdAndDelete(clubId);

        // Notify the club owner
        if (owner) {
            const notification = new Notification({
                recipient: owner._id,
                type: 'CLUB_REJECTED',
                message: `Your club "${club.name}" has been rejected by the admin and deleted.`,
                relatedObjectId: club._id, // Might be null after deletion, but was stored before
                relatedObjectType: 'Club'
            });
            await notification.save();

            const emailSubject = `Club Rejected and Deleted: ${club.name}`;
            const emailText = `Dear ${owner.firstName} ${owner.lastName},

Unfortunately, your club "${club.name}" has been rejected by the admin and has been deleted from the platform.

Best regards,
Campus Connect Team`;

            await sendEmail(owner.email, emailSubject, emailText);
        }

        res.json({ message: 'Club rejected and deleted successfully' });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const toggleUserStatus = async (req, res) => {
    try {
        const { id: userId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.isActive = !user.isActive;
        await user.save();

        res.json({
            message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
            user: { id: user._id, isActive: user.isActive }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { id: userId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if user is admin (prevent deleting the main admin)
        if (user.role === 'admin' && user.email === 'kunlexlatest@gmail.com') {
             return res.status(400).json({ error: 'Cannot delete the main admin account' });
        }

        await User.findByIdAndDelete(userId);

        res.json({ message: 'User deleted successfully' });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const deleteClub = async (req, res) => {
    try {
        const { id: clubId } = req.params;

        const club = await Club.findById(clubId);
        if (!club) {
            return res.status(404).json({ error: 'Club not found' });
        }

        // Find the owner to notify before deletion
        const owner = await User.findById(club.owner);

        await Club.findByIdAndDelete(clubId);

        // Notify the club owner
        if (owner) {
            const notification = new Notification({
                recipient: owner._id,
                type: 'CLUB_DELETED',
                message: `Your club "${club.name}" has been deleted by the admin.`,
                relatedObjectId: club._id,
                relatedObjectType: 'Club'
            });
            await notification.save();

            const emailSubject = `Club Deleted: ${club.name}`;
            const emailText = `Dear ${owner.firstName} ${owner.lastName},

Your club "${club.name}" has been deleted by the admin.

Best regards,
Campus Connect Team`;

            await sendEmail(owner.email, emailSubject, emailText);
        }

        res.json({ message: 'Club deleted successfully' });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getNotifications = async (req, res) => {
    try {
        const { page = 1, limit = 10, type, read } = req.query;

        let query = {};
        if (type) query.type = type;
        if (read === 'true') query.read = true;
        else if (read === 'false') query.read = { $ne: true };

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await Notification.countDocuments(query);
        const notifications = await Notification.find(query)
            .populate('recipient', 'firstName lastName email')
            .populate('relatedObjectId', 'name title firstName lastName') // Populate depending on type
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        res.json({
            notifications,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(total / parseInt(limit)),
                total,
                limit: parseInt(limit)
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const markNotificationAsRead = async (req, res) => {
    try {
        const { id: notificationId } = req.params;

        const notification = await Notification.findByIdAndUpdate(
            notificationId,
            { read: true },
            { new: true }
        ).populate('recipient', 'firstName lastName email');

        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json({ message: 'Notification marked as read', notification });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getAdminDashboard,
    getAllUsers,
    getAllClubs,
    getAllPosts,
    approveClub,
    rejectClub,
    toggleUserStatus,
    deleteUser,
    deleteClub,
    getNotifications,
    markNotificationAsRead
};