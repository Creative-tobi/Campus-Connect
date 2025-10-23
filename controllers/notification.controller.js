const Notification = require('../models/Notification.model');

const getUserNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const { read = 'false', limit = 10 } = req.query; // Get unread by default

        let query = { recipient: userId };
        if (read === 'true') {
            query.read = true;
        } else if (read === 'false') {
            query.read = { $ne: true }; // Not read or undefined
        }
        // If read is not specified, get all

        const notifications = await Notification.find(query)
            .populate('relatedObjectId', 'name title firstName lastName') // Populate depending on type
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        res.json({ notifications });

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
            return res.status(404).json({ error: 'Notification not found or not authorized' });
        }

        res.json({ message: 'Notification marked as read', notification });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const markAllNotificationsAsRead = async (req, res) => {
    try {
        const userId = req.user.id;

        await Notification.updateMany(
            { recipient: userId, read: { $ne: true } }, // Update only unread ones
            { read: true }
        );

        res.json({ message: 'All notifications marked as read' });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getUserNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead
};