const User = require('../models/User.model');
const { sendEmail } = require('../services/nodemailer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

dotenv.config();

const generateOTP = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
};

const registerUser = async (req, res) => {
    try {
        const { firstName, lastName, email, password, phone, faculty } = req.body;

        // Validation (add more as needed)
        if (!firstName || !lastName || !email || !password || !phone || !faculty) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists with this email' });
        }

        const existingPhone = await User.findOne({ phone });
        if (existingPhone) {
            return res.status(400).json({ error: 'User already exists with this phone number' });
        }

        // Create user
        const rounds = parseInt(process.env.BCRYPT_ROUNDS || "12", 10);
        const hashedPassword = await bcrypt.hash(password, rounds);

        const newUser = new User({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            phone: phone.trim(),
            faculty: faculty.trim() // Add faculty
        });

        // Generate OTP
        const otp = generateOTP();
        newUser.otp = otp;
        newUser.otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

        await newUser.save();

        // Send welcome email with OTP
        const welcomeSubject = "Welcome to Campus Connect - Verify Your Account";
        const welcomeMessage = `Dear ${newUser.firstName} ${newUser.lastName},

Welcome to Campus Connect! Your account has been successfully created.
Account Details:
- Name: ${newUser.firstName} ${newUser.lastName}
- Email: ${newUser.email}
- Faculty: ${newUser.faculty}
- Phone: ${newUser.phone}

Your OTP for account verification is: ${otp}
This OTP will expire in 10 minutes. Please verify your account to start using the platform.

Best regards,
Campus Connect Team`;

        await sendEmail(newUser.email, welcomeSubject, welcomeMessage);

        res.status(201).json({
            message: 'User registered successfully. Please check your email for OTP to verify your account.',
            userId: newUser._id
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: error.message });
    }
};

const verifyOtpController = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ error: 'Email and OTP are required' });
        }

        const user = await User.findOne({
            email: email.toLowerCase(),
            otp,
            otpExpiry: { $gt: Date.now() } // Check if OTP is not expired
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }

        // Verify user and clear OTP
        user.isVerified = true;
        user.otp = undefined;
        user.otpExpiry = undefined;
        await user.save();

        // Generate JWT token
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE }
        );

        // Return token and user info (excluding password)
        const safeUser = {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            role: user.role,
            faculty: user.faculty,
            isVerified: user.isVerified,
            profilePicture: user.profilePicture
        };

        res.json({
            message: 'Account verified successfully',
            token,
            user: safeUser
        });

    } catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({ error: error.message });
    }
};

const regenerateOtpController = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.isVerified) {
            return res.status(400).json({ error: 'Account is already verified' });
        }

        const newOtp = generateOTP();
        user.otp = newOtp;
        user.otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
        await user.save();

        const subject = "New OTP for Campus Connect Account Verification";
        const message = `Dear ${user.firstName} ${user.lastName},

Your new OTP for verifying your Campus Connect account is: ${newOtp}
This OTP will expire in 10 minutes.

Best regards,
Campus Connect Team`;

        await sendEmail(user.email, subject, message);

        res.json({ message: 'New OTP sent to your email' });

    } catch (error) {
        console.error('Regenerate OTP error:', error);
        res.status(500).json({ error: error.message });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        if (!user.isVerified) {
            return res.status(403).json({ error: "Account not verified. Please verify your email with OTP." });
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE }
        );

        const safeUser = {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            role: user.role,
            faculty: user.faculty,
            isVerified: user.isVerified,
            profilePicture: user.profilePicture
        };

        res.json({
            message: "Login successful",
            token,
            user: safeUser
        });

    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "Server error during login" });
    }
};

const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ user });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

const updateProfile = async (req, res) => {
    try {
        const { firstName, lastName, phone, faculty, profilePicture } = req.body;
        const updates = {};

        if (firstName) updates.firstName = firstName.trim();
        if (lastName) updates.lastName = lastName.trim();
        if (phone) updates.phone = phone.trim();
        if (faculty) updates.faculty = faculty.trim(); // Add faculty update
        if (profilePicture !== undefined) updates.profilePicture = profilePicture; // Allow setting to null

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { ...updates, updatedAt: Date.now() },
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'Profile updated successfully', user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters long' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        user.password = newPassword; // Setter in schema will hash it
        await user.save();

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    registerUser,
    loginUser,
    verifyOtpController,
    regenerateOtpController,
    getProfile,
    updateProfile,
    changePassword
};