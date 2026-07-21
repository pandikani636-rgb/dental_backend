const mongoose = require('mongoose');

const homeOfferSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Please enter offer name"],
        trim: true,
        maxLength: [100, "Name cannot exceed 100 characters"]
    },
    image: {
        public_id: {
            type: String,
            required: true
        },
        url: {
            type: String,
            required: true
        }
    },
    isActive: {
        type: Boolean,
        default: false
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

homeOfferSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

homeOfferSchema.pre('findOneAndUpdate', function(next) {
    this.set({ updatedAt: Date.now() });
    next();
});

module.exports = mongoose.model("HomeOffer", homeOfferSchema);
