const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Please enter product name"],
        trim: true
    },

    description: {
        type: String,
        required: [true, "Please enter product description"]
    },

    price: {
        type: Number,
        required: [true, "Please enter product price"]
    },

    gst: {
        type: Number,
        default: 0
    },

    discount: {
        type: Number,
        default: 0
    },

    delivery_charge: {
        type: Number,
        default: 0
    },

    images: [
        {
            public_id: {
                type: String,
                required: true
            },
            url: {
                type: String,
                required: true
            }
        }
    ],

    video_url: {
        type: String,
        default: null
    },

    media_type: {
        type: String,
        enum: ["images", "videoUrl", "videoFile", "both"],
        default: "images"
    },

    video: {
        public_id: {
            type: String,
            default: null
        },
        url: {
            type: String,
            default: null
        }
    },

    category: {
        type: String,
        required: [true, "Please enter product category"]
    },

    subCategory: {
        type: String,
        default: ""
    },

    stock: {
        type: Number,
        required: [true, "Please enter product stock"],
        maxlength: [4, "Stock cannot exceed limit"],
        default: 1
    },

    status: {
        type: String,
        enum: ["Active", "Inactive"],
        default: "Active"
    },

    return_policy: {
        type: String,
        enum: ["Yes", "No"],
        default: "No"
    },

    return_duration: {
        type: String,
        default: ""
    },

    warranty: {
        type: String,
        enum: ["Yes", "No"],
        default: "No"
    },

    warranty_duration: {
        type: String,
        default: ""
    },

    user: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
        required: true
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Product', productSchema);