const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { ref } = require('process');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Please Enter Your Name"],
        trim: true,
        maxLength: [50, "Name cannot exceed 50 characters"]
    },
    email: {
        type: String,
        required: [true, "Please Enter Your Email"],
        unique: true,
        validate: [validator.isEmail, "Please enter a valid email"],
        lowercase: true,
        trim: true
    },
    phone: {
        type: String,
        required: [true, "Please Enter Phone Number"],
        validate: {
            validator: function(v) {
                return /^\d{10}$/.test(v);
            },
            message: "Please enter a valid 10-digit phone number"
        }
    },
    address: {
        type: String,
        required: [true, "Please Enter Address"],
        trim: true,
        maxLength: [200, "Address cannot exceed 200 characters"]
    },
    gender: {
        type: String,
        enum: ["male", "female", "others", "transgender", "other"],
        required: [true, "Please Enter Gender"]
    },
    password: {
        type: String,
        required: [true, "Please Enter Your Password"],
        minLength: [8, "Password should have atleast 8 characters"],
        select: false,
    },
    role: {
        type: String,
        required: [true, "Please Enter Role"],
        default: "student"
    },

    // Doctor extra fields
    clinicname: {
        type: String,
        required: function () { return this.role === "DOCTOR"; },
        trim: true,
        default: ""
    },
    clinicid: {
        type: String,
        required: function () { return this.role === "DOCTOR"; },
        trim: true,
        default: ""
    },
    qualification: {
        type: String,
        required: function () { return this.role === "DOCTOR"; },
        trim: true,
        default: ""
    },
    specialization: {
        type: String,
        required: function () { return this.role === "DOCTOR"; },
        trim: true,
        default: ""
    },
    registrationNumber: {
        type: String,
        required: function () { return this.role === "DOCTOR"; },
        trim: true,
        default: ""
    },
    medicalCouncilName: {
        type: String,
        required: function () { return this.role === "DOCTOR"; },
        trim: true,
        default: ""
    },
    yearsOfExperience: {
        type: Number,
        required: function () { return this.role === "DOCTOR"; },
        min: [0, "Experience cannot be negative"],
        max: [60, "Experience cannot exceed 60 years"],
        default: 0
    },

    // Student extra fields
    collegeName: {
        type: String,
        required: function () { return this.role === "STUDENT"; },
        trim: true,
        default: ""
    },
    collegeId: {
        type: String,
        required: function () { return this.role === "STUDENT"; },
        trim: true,
        default: ""
    },

    // Password reset fields
    resetPasswordOtp: {
        type: String,
        select: false
    },
    resetPasswordOtpExpire: {
        type: Date,
        select: false
    },
    
    // Old reset password fields (for backward compatibility)
    resetPasswordToken: String,
    resetPasswordExpire: Date,

    // Account status
    isActive: {
        type: Boolean,
        default: true
    },
    
    // Last login
    lastLogin: {
        type: Date
    },

    avatar: {
        public_id: {
            type: String
        },
        url: {
            type: String
        }
    },

    createdAt: {
        type: Date,
        default: Date.now,
    },
    
    updatedAt: {
        type: Date,
        default: Date.now,
    }
});

// Update updatedAt on save
userSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// HASH PASSWORD
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// JWT TOKEN
userSchema.methods.getJWTToken = function () {
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET || "FLIPKART", {
        expiresIn: process.env.JWT_EXPIRE || "3d"
    });
};

// COMPARE PASSWORD
userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// GENERATE PASSWORD RESET OTP
userSchema.methods.generatePasswordResetOtp = function() {
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    this.resetPasswordOtp = otp;
    this.resetPasswordOtpExpire = Date.now() + 15 * 60 * 1000; // 15 minutes
    
    return otp;
};

// VERIFY PASSWORD RESET OTP
userSchema.methods.verifyPasswordResetOtp = function(otp) {
    console.log('Verifying OTP in model:', {
        storedOtp: this.resetPasswordOtp,
        receivedOtp: otp,
        storedOtpType: typeof this.resetPasswordOtp,
        receivedOtpType: typeof otp,
        expiry: this.resetPasswordOtpExpire,
        now: Date.now()
    });
    
    if (!this.resetPasswordOtp || !this.resetPasswordOtpExpire) {
        console.log('OTP or expiry not found');
        return false;
    }
    
    // Check if OTP matches and is not expired
    const isOtpValid = this.resetPasswordOtp === String(otp);
    const isOtpExpired = Date.now() > this.resetPasswordOtpExpire;
    
    console.log('OTP Validation Result:', { isOtpValid, isOtpExpired });
    
    return isOtpValid && !isOtpExpired;
};

// CLEAR PASSWORD RESET OTP
userSchema.methods.clearPasswordResetOtp = function() {
    this.resetPasswordOtp = undefined;
    this.resetPasswordOtpExpire = undefined;
    return this;
};

// OLD METHOD: RESET PASSWORD TOKEN (Keep for backward compatibility)
userSchema.methods.getResetPasswordToken = function () {
    const resetToken = crypto.randomBytes(20).toString("hex");

    this.resetPasswordToken = crypto.createHash("sha256")
        .update(resetToken)
        .digest("hex");

    this.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

    return resetToken;
};

// Indexes for better query performance
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });

module.exports = mongoose.model("User", userSchema);