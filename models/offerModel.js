const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Please Enter Offer Name"],
        trim: true
    },
    description: {
        type: String,
        required: [true, "Please Enter Description"],
        trim: true
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
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Offer", offerSchema);
