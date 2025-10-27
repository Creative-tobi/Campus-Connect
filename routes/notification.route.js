const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
    getUserNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead
} = require('../controllers/notification.controller');

// Protected routes for notifications
router.get('/', authenticate, authorize('user', 'club_owner', 'admin'), getUserNotifications);
router.put('/:id/read', authenticate, authorize('user', 'club_owner', 'admin'), markNotificationAsRead);
router.put('/read-all', authenticate, authorize('user', 'club_owner', 'admin'), markAllNotificationsAsRead);

module.exports = router;
