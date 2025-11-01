const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        required: true,
    enum: [
            'JOIN_REQUEST',
            'JOIN_APPROVED',
            'JOIN_DECLINED',
            'CLUB_APPROVAL',
            'CLUB_APPROVED',
            'CLUB_REJECTED',
            'NEW_POST',
            'OTHER'
        ]
    },
    message: {
        type: String,
        required: true
    },
    relatedObjectId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'relatedObjectType' // Dynamic reference based on type
    },
    relatedObjectType: {
        type: String,
        enum: ['Club', 'Post', 'User']
    },
    read: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Notification', notificationSchema);