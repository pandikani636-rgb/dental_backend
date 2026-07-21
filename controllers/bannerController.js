const Banner = require('../models/bannerModel');
const asyncErrorHandler = require('../middlewares/asyncErrorHandler');
const ErrorHandler = require('../utils/errorHandler');

// Get All Active Banners (Public)
exports.getAllBanners = asyncErrorHandler(async (req, res, next) => {
    const banners = await Banner.find({ isActive: true }).sort({ order: 1 });

    res.status(200).json({
        success: true,
        banners
    });
});

// Get All Banners ---ADMIN
exports.getAdminBanners = asyncErrorHandler(async (req, res, next) => {
    const banners = await Banner.find().sort({ order: 1 });

    res.status(200).json({
        success: true,
        banners
    });
});

// Get Single Banner
exports.getBannerDetails = asyncErrorHandler(async (req, res, next) => {
    const banner = await Banner.findById(req.params.id);

    if (!banner) {
        return next(new ErrorHandler("Banner Not Found", 404));
    }

    res.status(200).json({
        success: true,
        banner
    });
});

// Create Banner ---ADMIN
exports.createBanner = asyncErrorHandler(async (req, res, next) => {
    const { title, description, link, isActive, order, bannerType, videoUrl } = req.body;

    // Validate required fields
    if (!title) {
        return next(new ErrorHandler("Title is required", 400));
    }

    if (!bannerType || (bannerType !== 'image' && bannerType !== 'video')) {
        return next(new ErrorHandler("Banner type must be either 'image' or 'video'", 400));
    }

    const bannerData = {
        title,
        description,
        link: link || "/products",
        isActive: isActive !== undefined ? isActive : true,
        order: order || 0,
        bannerType
    };

    // Handle image upload
    if (bannerType === 'image') {
        if (req.files && req.files.image) {
            const imageFile = req.files.image[0];
            bannerData.media = {
                public_id: imageFile.filename,
                url: imageFile.path.replace(/\\/g, '/'),
                type: 'image'
            };
        } else {
            return next(new ErrorHandler("Image file is required for image banners", 400));
        }
    }
    // Handle video URL
    else if (bannerType === 'video') {
        if (videoUrl && videoUrl.trim()) {
            bannerData.videoUrl = videoUrl.trim();
        } else {
            return next(new ErrorHandler("Video URL is required for video banners", 400));
        }
    }

    const banner = await Banner.create(bannerData);

    res.status(201).json({
        success: true,
        banner
    });
});

// Update Banner ---ADMIN
exports.updateBanner = asyncErrorHandler(async (req, res, next) => {
    let banner = await Banner.findById(req.params.id);
    
    if (!banner) {
        return next(new ErrorHandler("Banner Not Found", 404));
    }

    const { title, description, link, isActive, order, bannerType, videoUrl, keepExistingImage } = req.body;

    // Prepare update data
    const updatedData = {
        title: title || banner.title,
        description: description || banner.description,
        link: link || banner.link,
        isActive: isActive !== undefined ? isActive : banner.isActive,
        order: order !== undefined ? order : banner.order,
        bannerType: bannerType || banner.bannerType
    };

    // Handle new image upload
    if (req.files && req.files.image) {
        // Delete old media file if exists on Cloudinary
        if (banner.media && banner.media.url && banner.media.url.startsWith('http')) {
            const cloudinary = require('cloudinary').v2;
            try {
                await cloudinary.uploader.destroy(banner.media.public_id);
            } catch (err) {
                console.error("Failed to delete banner media from Cloudinary:", err);
            }
        }

        const imageFile = req.files.image[0];
        updatedData.media = {
            public_id: imageFile.filename,
            url: imageFile.path.replace(/\\/g, '/'),
            type: 'image'
        };
        updatedData.bannerType = 'image';
        // Clear video URL if switching to image
        updatedData.videoUrl = undefined;
    }
    // Handle video URL update
    else if (bannerType === 'video' && videoUrl !== undefined) {
        if (videoUrl && videoUrl.trim()) {
            updatedData.videoUrl = videoUrl.trim();
            // Clear media if switching to video
            if (banner.media && banner.media.url && banner.media.url.startsWith('http')) {
                const cloudinary = require('cloudinary').v2;
                try {
                    await cloudinary.uploader.destroy(banner.media.public_id);
                } catch (err) {
                    console.error("Failed to delete banner media from Cloudinary:", err);
                }
            }
            updatedData.media = undefined;
        } else {
            return next(new ErrorHandler("Video URL is required for video banners", 400));
        }
    }
    // Keep existing image if specified
    else if (bannerType === 'image' && keepExistingImage === 'true') {
        // Keep existing media, clear video URL
        updatedData.videoUrl = undefined;
    }
    // If banner type changed but no new content provided
    else if (bannerType && bannerType !== banner.bannerType) {
        if (bannerType === 'image') {
            return next(new ErrorHandler("Please upload an image file", 400));
        } else if (bannerType === 'video') {
            return next(new ErrorHandler("Please provide a video URL", 400));
        }
    }

    banner = await Banner.findByIdAndUpdate(
        req.params.id, 
        updatedData, 
        {
            new: true,
            runValidators: true
        }
    );

    res.status(200).json({
        success: true,
        banner
    });
});

// Delete Banner ---ADMIN
exports.deleteBanner = asyncErrorHandler(async (req, res, next) => {
    const banner = await Banner.findById(req.params.id);

    if (!banner) {
        return next(new ErrorHandler("Banner Not Found", 404));
    }

    // Delete media from Cloudinary if exists
    if (banner.media && banner.media.url && banner.media.url.startsWith('http')) {
        const cloudinary = require('cloudinary').v2;
        try {
            await cloudinary.uploader.destroy(banner.media.public_id);
        } catch (err) {
            console.error("Failed to delete banner media from Cloudinary:", err);
        }
    }

    await Banner.deleteOne({ _id: req.params.id });

    res.status(200).json({
        success: true,
        message: "Banner deleted successfully"
    });
});