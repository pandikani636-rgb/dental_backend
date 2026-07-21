const HomeOffer = require('../models/homeOfferModel');
const asyncErrorHandler = require('../middlewares/asyncErrorHandler');
const ErrorHandler = require('../utils/errorHandler');
const cloudinary = require('cloudinary').v2;

// Get All Home Offers (Public)
exports.getAllHomeOffers = asyncErrorHandler(async (req, res, next) => {
    const homeOffers = await HomeOffer.find().sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        homeOffers
    });
});

// Get Active Home Offer (Public)
exports.getActiveHomeOffer = asyncErrorHandler(async (req, res, next) => {
    const homeOffer = await HomeOffer.findOne({ isActive: true });

    res.status(200).json({
        success: true,
        homeOffer
    });
});

// Get Single Home Offer ---ADMIN
exports.getHomeOfferDetails = asyncErrorHandler(async (req, res, next) => {
    const homeOffer = await HomeOffer.findById(req.params.id);

    if (!homeOffer) {
        return next(new ErrorHandler("Home Offer Not Found", 404));
    }

    res.status(200).json({
        success: true,
        homeOffer
    });
});

// Create Home Offer ---ADMIN
exports.createHomeOffer = asyncErrorHandler(async (req, res, next) => {
    const { name, isActive } = req.body;

    if (!name) {
        return next(new ErrorHandler("Name is required", 400));
    }

    if (!req.file) {
        return next(new ErrorHandler("Image is required", 400));
    }

    // Upload image to cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'home-offers'
    });

    // If isActive is true, deactivate all other offers
    if (isActive === 'true' || isActive === true) {
        await HomeOffer.updateMany({}, { isActive: false });
    }

    const homeOffer = await HomeOffer.create({
        name,
        image: {
            public_id: result.public_id,
            url: result.secure_url
        },
        isActive: isActive === 'true' || isActive === true
    });

    res.status(201).json({
        success: true,
        homeOffer
    });
});

// Update Home Offer ---ADMIN
exports.updateHomeOffer = asyncErrorHandler(async (req, res, next) => {
    let homeOffer = await HomeOffer.findById(req.params.id);
    
    if (!homeOffer) {
        return next(new ErrorHandler("Home Offer Not Found", 404));
    }

    const { name, isActive } = req.body;

    const updatedData = {
        name: name || homeOffer.name,
        isActive: isActive === 'true' || isActive === true
    };

    // If new image is uploaded
    if (req.file) {
        // Delete old image from cloudinary
        await cloudinary.uploader.destroy(homeOffer.image.public_id);

        // Upload new image
        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'home-offers'
        });

        updatedData.image = {
            public_id: result.public_id,
            url: result.secure_url
        };
    }

    // If isActive is true, deactivate all other offers
    if (updatedData.isActive) {
        await HomeOffer.updateMany({ _id: { $ne: req.params.id } }, { isActive: false });
    }

    homeOffer = await HomeOffer.findByIdAndUpdate(
        req.params.id, 
        updatedData, 
        {
            new: true,
            runValidators: true
        }
    );

    res.status(200).json({
        success: true,
        homeOffer
    });
});

// Delete Home Offer ---ADMIN
exports.deleteHomeOffer = asyncErrorHandler(async (req, res, next) => {
    const homeOffer = await HomeOffer.findById(req.params.id);

    if (!homeOffer) {
        return next(new ErrorHandler("Home Offer Not Found", 404));
    }

    // Delete image from cloudinary
    await cloudinary.uploader.destroy(homeOffer.image.public_id);

    await HomeOffer.deleteOne({ _id: req.params.id });

    res.status(200).json({
        success: true,
        message: "Home Offer deleted successfully"
    });
});
