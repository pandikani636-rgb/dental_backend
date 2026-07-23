
const User = require('../models/userModel');
const asyncErrorHandler = require('../middlewares/asyncErrorHandler');
const sendToken = require('../utils/sendToken');
const ErrorHandler = require('../utils/errorHandler');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');

// Register User
exports.registerUser = asyncErrorHandler(async (req, res, next) => {
    const {
        name,
        email,
        phone,
        address,
        gender,
        password,
        role,
        clinicname,
        clinicid,
        qualification,
        specialization,
        registrationNumber,
        medicalCouncilName,
        yearsOfExperience,
        collegeName,
        collegeId
    } = req.body;

    const existingUser = await User.findOne({ phone });
    if (existingUser) {
        return next(new ErrorHandler("Phone Number already registered", 400));
    }

    const user = await User.create({
        name,
        email,
        phone,
        address,
        gender,
        password,
        role,
        clinicname,
        clinicid,
        qualification,
        specialization,
        registrationNumber,
        medicalCouncilName,
        yearsOfExperience,
        collegeName,
        collegeId
    });

    sendToken(user, 201, res);
});

// Login User
exports.loginUser = asyncErrorHandler(async (req, res, next) => {
    let { email, password } = req.body;

    if (!email || !password) {
        return next(new ErrorHandler("Please Enter Email/Phone and Password", 400));
    }

    // Trim whitespace from identifier (email or phone)
    email = email.trim();

    const user = await User.findOne({
        $or: [{ email: email }, { phone: email }]
    }).select("+password");

    if (!user) {
        return next(new ErrorHandler("Invalid Email/Phone or Password", 401));
    }

    const isPasswordMatched = await user.comparePassword(password);

    if (!isPasswordMatched) {
        return next(new ErrorHandler("Invalid Email/Phone or Password", 401));
    }

    sendToken(user, 201, res);
});

// Logout User
exports.logoutUser = asyncErrorHandler(async (req, res, next) => {
    res.cookie("token", null, {
        expires: new Date(Date.now()),
        httpOnly: true,
        secure: true,
        sameSite: 'none'
    });

    res.status(200).json({
        success: true,
        message: "Logged Out",
    });
});

// Get User Details
exports.getUserDetails = asyncErrorHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id);

    // Convert avatar path to full URL if exists and is local
    if (user.avatar && user.avatar.url && !user.avatar.url.startsWith('http')) {
        user.avatar.url = `${req.protocol}://${req.get('host')}/${user.avatar.url.replace(/\\/g, '/')}`;
    }

    res.status(200).json({
        success: true,
        user,
    });
});

// Forgot Password - Send OTP
exports.forgotPassword = asyncErrorHandler(async (req, res, next) => {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
        return next(new ErrorHandler("User not found", 404));
    }

    // Generate OTP
    const otp = user.generatePasswordResetOtp();
    await user.save({ validateBeforeSave: false });

    // Send OTP email
    const message = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #10b981, #3b82f6); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                .otp-code { font-size: 32px; font-weight: bold; color: #059669; text-align: center; letter-spacing: 5px; margin: 20px 0; }
                .note { color: #6b7280; font-size: 14px; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Password Reset OTP</h1>
                </div>
                <div class="content">
                    <h2>Hello ${user.name},</h2>
                    <p>You requested to reset your password. Use the OTP below to verify your identity:</p>
                    
                    <div class="otp-code">${otp}</div>
                    
                    <p>This OTP is valid for 15 minutes.</p>
                    <p>If you didn't request this, please ignore this email.</p>
                    
                    <div class="note">
                        <p>Best regards,<br>MedStore Team</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;

    try {
        await sendEmail({
            email: user.email,
            subject: 'MedStore - Password Reset OTP',
            html: message
        });

        res.status(200).json({
            success: true,
            message: `OTP sent to ${user.email}`
        });

    } catch (error) {
        user.resetPasswordOtp = undefined;
        user.resetPasswordOtpExpire = undefined;
        await user.save({ validateBeforeSave: false });

        return next(new ErrorHandler(error.message, 500));
    }
});

// Reset Password with OTP
exports.resetPassword = asyncErrorHandler(async (req, res, next) => {
    const { email, otp, newPassword } = req.body;

    console.log('Reset Password Request:', { email, otp, hasNewPassword: !!newPassword });

    const user = await User.findOne({ email }).select('+resetPasswordOtp +resetPasswordOtpExpire +password');

    if (!user) {
        return next(new ErrorHandler("User not found", 404));
    }

    // Verify OTP
    const isOtpValid = user.verifyPasswordResetOtp(otp);

    if (!isOtpValid) {
        return next(new ErrorHandler("Invalid OTP or OTP has expired", 400));
    }

    console.log('OTP verified, updating password for:', email);

    // Update password
    user.password = newPassword;
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpire = undefined;

    await user.save();

    console.log('Password updated successfully for:', email);

    // Send confirmation email
    const message = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #10b981, #3b82f6); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                .success-icon { text-align: center; font-size: 48px; margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Password Reset Successful</h1>
                </div>
                <div class="content">
                    <div class="success-icon">✅</div>
                    <h2>Hello ${user.name},</h2>
                    <p>Your password has been successfully reset.</p>
                    <p>If you did not make this change, please contact our support team immediately.</p>
                    
                    <div style="margin-top: 30px; padding: 15px; background: #dcfce7; border-radius: 8px;">
                        <p style="margin: 0; color: #065f46;">
                            <strong>Security Tip:</strong> Use a strong, unique password and never share it with anyone.
                        </p>
                    </div>
                    
                    <p style="margin-top: 20px;">You can now login with your new password.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    try {
        await sendEmail({
            email: user.email,
            subject: 'MedStore - Password Reset Successful',
            html: message
        });

        res.status(200).json({
            success: true,
            message: 'Password reset successfully'
        });

    } catch (error) {
        res.status(200).json({
            success: true,
            message: 'Password reset successfully'
        });
    }
});

// Verify OTP
exports.verifyOtp = asyncErrorHandler(async (req, res, next) => {
    const { email, otp } = req.body;

    console.log('Verify OTP Request:', { email, otp, otpType: typeof otp, otpLength: otp?.length });

    const user = await User.findOne({ email }).select('+resetPasswordOtp +resetPasswordOtpExpire');

    if (!user) {
        return next(new ErrorHandler("User not found", 404));
    }

    console.log('User OTP Data:', {
        storedOtp: user.resetPasswordOtp,
        storedOtpType: typeof user.resetPasswordOtp,
        receivedOtp: otp,
        receivedOtpType: typeof otp,
        match: user.resetPasswordOtp === otp,
        expiry: user.resetPasswordOtpExpire,
        now: Date.now(),
        expired: Date.now() > user.resetPasswordOtpExpire
    });

    const isOtpValid = user.verifyPasswordResetOtp(otp);

    if (!isOtpValid) {
        return next(new ErrorHandler("Invalid OTP or OTP has expired", 400));
    }

    res.status(200).json({
        success: true,
        message: "OTP verified successfully"
    });
});

// Update Password
exports.updatePassword = asyncErrorHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id).select("+password");

    const isPasswordMatched = await user.comparePassword(req.body.oldPassword);

    if (!isPasswordMatched) {
        return next(new ErrorHandler("Old Password is Invalid", 400));
    }

    user.password = req.body.newPassword;
    await user.save();
    sendToken(user, 201, res);
});

// Update User Profile
exports.updateProfile = asyncErrorHandler(async (req, res, next) => {
    const newUserData = {
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        address: req.body.address,
        gender: req.body.gender,
        updatedAt: new Date()
    };

    // Handle avatar image if uploaded (frontend sends as 'avatar')
    if (req.file) {
        newUserData.avatar = {
            public_id: req.file.filename,
            url: req.file.path
        };
    }

    const user = await User.findByIdAndUpdate(req.user.id, newUserData, {
        new: true,
        runValidators: true,
        useFindAndModify: false,
    });

    if (!user) {
        return next(new ErrorHandler("User not found", 404));
    }

    res.status(200).json({
        success: true,
        user
    });
});

// ADMIN DASHBOARD

// Get All Users --ADMIN
exports.getAllUsers = asyncErrorHandler(async (req, res, next) => {
    const users = await User.find();

    res.status(200).json({
        success: true,
        users,
    });
});

// Get Single User Details --ADMIN
exports.getSingleUser = asyncErrorHandler(async (req, res, next) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        return next(new ErrorHandler(`User doesn't exist with id: ${req.params.id}`, 404));
    }

    // Convert avatar path to full URL if exists and is local
    if (user.avatar && user.avatar.url && !user.avatar.url.startsWith('http')) {
        user.avatar.url = `${req.protocol}://${req.get('host')}/${user.avatar.url.replace(/\\/g, '/')}`;
    }

    res.status(200).json({
        success: true,
        user,
    });
});

// Update User Role --ADMIN
exports.updateUserRole = asyncErrorHandler(async (req, res, next) => {
    console.log('Update user request received:', {
        userId: req.params.id,
        body: req.body
    });

    const {
        name,
        email,
        phone,
        address,
        gender,
        role,
        clinicname,
        clinicid,
        qualification,
        specialization,
        registrationNumber,
        medicalCouncilName,
        yearsOfExperience,
        collegeName,
        collegeId
    } = req.body;

    const newUserData = {
        name,
        email,
        phone,
        address,
        gender,
        role,
        updatedAt: new Date()
    };

    // Add role-specific fields based on role
    if (role === "DOCTOR") {
        newUserData.clinicname = clinicname || "";
        newUserData.clinicid = clinicid || "";
        newUserData.qualification = qualification || "";
        newUserData.specialization = specialization || "";
        newUserData.registrationNumber = registrationNumber || "";
        newUserData.medicalCouncilName = medicalCouncilName || "";
        newUserData.yearsOfExperience = yearsOfExperience || 0;
        // Clear student fields
        newUserData.collegeName = "";
        newUserData.collegeId = "";
    } else if (role === "STUDENT") {
        newUserData.collegeName = collegeName || "";
        newUserData.collegeId = collegeId || "";
        // Clear doctor fields
        newUserData.clinicname = "";
        newUserData.clinicid = "";
        newUserData.qualification = "";
        newUserData.specialization = "";
        newUserData.registrationNumber = "";
        newUserData.medicalCouncilName = "";
        newUserData.yearsOfExperience = 0;
    } else {
        // Clear both doctor and student fields for other roles
        newUserData.clinicname = "";
        newUserData.clinicid = "";
        newUserData.qualification = "";
        newUserData.specialization = "";
        newUserData.registrationNumber = "";
        newUserData.medicalCouncilName = "";
        newUserData.yearsOfExperience = 0;
        newUserData.collegeName = "";
        newUserData.collegeId = "";
    }

    console.log('Updating user with data:', newUserData);

    const user = await User.findByIdAndUpdate(req.params.id, newUserData, {
        new: true,
        runValidators: true,
        useFindAndModify: false,
    });

    if (!user) {
        return next(new ErrorHandler(`User doesn't exist with id: ${req.params.id}`, 404));
    }

    console.log('User updated successfully:', user._id);

    res.status(200).json({
        success: true,
        message: "User updated successfully",
        user
    });
});

// Delete User --ADMIN
exports.deleteUser = asyncErrorHandler(async (req, res, next) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        return next(new ErrorHandler(`User doesn't exist with id: ${req.params.id}`, 404));
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
        success: true,
        message: "User deleted successfully"
    });
});