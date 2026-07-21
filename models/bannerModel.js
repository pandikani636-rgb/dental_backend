const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, "Please enter banner title"],
        trim: true,
        maxLength: [100, "Title cannot exceed 100 characters"]
    },
    description: {
        type: String,
        trim: true,
        maxLength: [500, "Description cannot exceed 500 characters"]
    },
    // New field: Specifies whether it's an image or video banner
    bannerType: {
        type: String,
        required: [true, "Please specify banner type"],
        enum: {
            values: ['image', 'video'],
            message: 'Please select either image or video banner type'
        },
        default: 'image'
    },
    media: {
        public_id: {
            type: String
        },
        url: {
            type: String
        },
        type: {
            type: String,
            enum: ['image', 'video']
        },
        filename: {
            type: String
        },
        originalname: {
            type: String
        },
        mimetype: {
            type: String
        },
        size: {
            type: Number
        }
    },
    // Video URL for video banners (instead of file upload)
    videoUrl: {
        type: String,
        validate: {
            validator: function(v) {
                // Only validate if bannerType is video and videoUrl is provided
                if (this.bannerType === 'video' && v) {
                    try {
                        new URL(v);
                        return true;
                    } catch (err) {
                        return false;
                    }
                }
                return true;
            },
            message: 'Please provide a valid video URL'
        }
    },
    // Thumbnail for video banners (optional)
    thumbnail: {
        url: {
            type: String
        },
        public_id: {
            type: String
        }
    },
    link: {
        type: String,
        default: '',
        validate: {
            validator: function(v) {
                // Allow empty string
                if (v === '') return true;
                // Allow relative URLs starting with /
                if (v.startsWith('/')) return true;
                // Allow full URLs
                try {
                    new URL(v);
                    return true;
                } catch (err) {
                    return false;
                }
            },
            message: props => `${props.value} is not a valid URL!`
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    order: {
        type: Number,
        default: 0,
        min: [0, "Order cannot be negative"]
    },
    // Duration for video banners (in seconds)
    duration: {
        type: Number,
        min: [0, "Duration cannot be negative"]
    },
    // For tracking which user created/updated the banner
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // SEO fields
    altText: {
        type: String,
        maxLength: [125, "Alt text cannot exceed 125 characters"]
    },
    metaDescription: {
        type: String,
        maxLength: [160, "Meta description cannot exceed 160 characters"]
    },
    // For statistics
    clicks: {
        type: Number,
        default: 0
    },
    impressions: {
        type: Number,
        default: 0
    },
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt field before saving
bannerSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Update the updatedAt field before updating
bannerSchema.pre('findOneAndUpdate', function(next) {
    this.set({ updatedAt: Date.now() });
    next();
});

// Virtual field for full media URL
bannerSchema.virtual('media.fullUrl').get(function() {
    if (!this.media || !this.media.url) return null;
    
    // If URL already has http(s), return as is
    if (this.media.url.startsWith('http')) {
        return this.media.url;
    }
    
    // Otherwise, prepend with base URL (you can configure this)
    const baseUrl = process.env.BASE_URL || 'http://localhost:4000';
    return `${baseUrl}/${this.media.url.replace(/^\/+/, '')}`;
});

// Virtual field to check if banner is an image
bannerSchema.virtual('isImage').get(function() {
    return this.bannerType === 'image' || this.media.type === 'image';
});

// Virtual field to check if banner is a video
bannerSchema.virtual('isVideo').get(function() {
    return this.bannerType === 'video' || this.media.type === 'video';
});

// Method to get banner status
bannerSchema.methods.getStatus = function() {
    if (!this.isActive) return 'Inactive';
    const now = new Date();
    if (this.createdAt > now) return 'Scheduled';
    return 'Active';
};

// Method to increment clicks
bannerSchema.methods.incrementClicks = function() {
    this.clicks += 1;
    return this.save();
};

// Method to increment impressions
bannerSchema.methods.incrementImpressions = function() {
    this.impressions += 1;
    return this.save();
};

// Static method to get active banners sorted by order
bannerSchema.statics.getActiveBanners = function() {
    return this.find({ isActive: true })
        .sort({ order: 1, createdAt: -1 })
        .select('-__v -createdBy -updatedBy');
};

// Static method to get all banners with pagination
bannerSchema.statics.getAllBanners = function(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    return this.find()
        .sort({ order: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-__v');
};

// Indexes for better query performance
bannerSchema.index({ isActive: 1, order: 1 });
bannerSchema.index({ bannerType: 1 });
bannerSchema.index({ createdAt: -1 });
bannerSchema.index({ title: 'text', description: 'text' });

// Set toJSON options to include virtuals
bannerSchema.set('toJSON', { 
    virtuals: true,
    transform: function(doc, ret) {
        // Remove sensitive/internal fields
        delete ret.__v;
        delete ret._id;
        return ret;
    }
});

// Set toObject options to include virtuals
bannerSchema.set('toObject', { 
    virtuals: true,
    transform: function(doc, ret) {
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model("Banner", bannerSchema);