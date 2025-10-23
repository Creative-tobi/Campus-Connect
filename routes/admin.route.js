const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
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
} = require('../controllers/admin.controller');

// Protected admin routes
router.get('/dashboard', authenticate, authorize('admin'), getAdminDashboard);
router.get('/users', authenticate, authorize('admin'), getAllUsers);
router.get('/clubs', authenticate, authorize('admin'), getAllClubs);
router.get('/posts', authenticate, authorize('admin'), getAllPosts);
router.put('/clubs/:id/approve', authenticate, authorize('admin'), approveClub);
router.put('/clubs/:id/reject', authenticate, authorize('admin'), rejectClub);
router.put('/users/:id/toggle-status', authenticate, authorize('admin'), toggleUserStatus);
router.delete('/users/:id', authenticate, authorize('admin'), deleteUser);
router.delete('/clubs/:id', authenticate, authorize('admin'), deleteClub);
router.get('/notifications', authenticate, authorize('admin'), getNotifications);
router.put('/notifications/:id/read', authenticate, authorize('admin'), markNotificationAsRead);

module.exports = router;