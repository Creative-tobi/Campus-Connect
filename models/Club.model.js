const mongoose = require('mongoose');

const clubSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Club name is required'],
        unique: true,
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: ['academic', 'sports', 'tech', 'arts', 'cultural', 'political', 'other']
    },
    logo: {
        type: String, // Cloudinary URL
        default: null
    },
    banner: {
        type: String, // Cloudinary URL
        default: null
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        },
        role: {
            type: String,
            enum: ['member', 'moderator'], // Add more roles if needed
            default: 'member'
        }
    }],
    status: {
        type: String,
        enum: ['pending', 'active', 'rejected'],
        default: 'pending' // Requires admin approval
    },
    memberCount: {
        type: Number,
        default: 0 // Will be updated via middleware or manually
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update member count before saving
clubSchema.pre('save', function(next) {
    this.memberCount = this.members.length;
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Club', clubSchema);