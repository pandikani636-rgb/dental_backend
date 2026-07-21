const Product = require('../models/productModel');
const asyncErrorHandler = require('../middlewares/asyncErrorHandler');
const SearchFeatures = require('../utils/searchFeatures');
const ErrorHandler = require('../utils/errorHandler');
const cloudinary = require('cloudinary');
const fs = require('fs');
const path = require('path');

// Get All Products
exports.getAllProducts = asyncErrorHandler(async (req, res, next) => {
    const resultPerPage = 12;
    const productsCount = await Product.countDocuments();

    const searchFeature = new SearchFeatures(Product.find(), req.query)
        .search()
        .filter();

    let products = await searchFeature.query;
    let filteredProductsCount = products.length;

    searchFeature.pagination(resultPerPage);

    products = await searchFeature.query.clone();

    res.status(200).json({
        success: true,
        products,
        productsCount,
        resultPerPage,
        filteredProductsCount,
    });
});

// Get All Products ---Product Sliders
exports.getProducts = asyncErrorHandler(async (req, res, next) => {
    const products = await Product.find();

    res.status(200).json({
        success: true,
        products,
    });
});

// Get Product Details
exports.getProductDetails = asyncErrorHandler(async (req, res, next) => {
    const product = await Product.findById(req.params.id);

    if (!product) {
        return next(new ErrorHandler("Product Not Found", 404));
    }

    res.status(200).json({
        success: true,
        product,
    });
});

// Get All Products ---ADMIN
exports.getAdminProducts = asyncErrorHandler(async (req, res, next) => {
    const products = await Product.find();

    res.status(200).json({
        success: true,
        products,
    });
});

// Create Product ---ADMIN
exports.createProduct = async (req, res, next) => {
    try {
        console.log("BODY:", req.body);
        console.log("FILES:", req.files);

        const images = [];
        let video_url = null;
        let video = null;
        let media_type = req.body.media_type || "images";

        // Handle uploaded images (up to 4)
        if (req.files && req.files.images) {
            const imageFiles = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
            imageFiles.forEach(file => {
                images.push({
                    url: file.path,
                    public_id: file.filename
                });
            });
        }

        // Handle uploaded video file
        if (req.files && req.files.video) {
            video = {
                url: req.files.video[0].path,
                public_id: req.files.video[0].filename
            };
            media_type = "videoFile";
        }

        // Handle video URL
        if (req.body.video_url && req.body.video_url.trim() !== "") {
            video_url = req.body.video_url.trim();
        }

        // Determine media_type based on what's actually present
        if (images.length > 0 && video_url) {
            media_type = "both";
        } else if (images.length > 0) {
            media_type = "images";
        } else if (video_url) {
            media_type = "videoUrl";
        } else if (video) {
            media_type = "videoFile";
        }

        // Validation
        if (images.length === 0) {
            return next(new ErrorHandler("Please upload at least one image", 400));
        }
        if (images.length > 4) {
            return next(new ErrorHandler("Maximum 4 images allowed", 400));
        }

        const productData = {
            name: req.body.name,
            description: req.body.description,
            price: req.body.price,
            gst: req.body.gst || 0,
            cuttedPrice: req.body.cuttedPrice || 0,
            discount: req.body.discount || 0,
            delivery_charge: req.body.delivery_charge || 0,
            stock: req.body.stock,
            category: req.body.category,
            subCategory: req.body.subCategory || "",
            status: req.body.status || "Active",
            return_policy: req.body.return_policy || "No",
            return_duration: req.body.return_duration || "",
            warranty: req.body.warranty || "No",
            warranty_duration: req.body.warranty_duration || "",
            images,
            media_type,
            user: req.user._id
        };

        // Add video data based on media type
        if (video_url) {
            productData.video_url = video_url;
        }
        if (video) {
            productData.video = video;
        }

        // Log final product data for debugging
        console.log("Product Data to Save:", productData);

        const product = await Product.create(productData);

        res.status(201).json({
            success: true,
            product
        });

    } catch (error) {
        console.log("Error creating product:", error);
        return next(new ErrorHandler(error.message, 500));
    }
};

// Update Product ---ADMIN
exports.updateProduct = asyncErrorHandler(async (req, res, next) => {
    try {
        console.log("Update Product Body:", req.body);
        console.log("Update Product Files:", req.files);

        let product = await Product.findById(req.params.id);

        if (!product) {
            return next(new ErrorHandler("Product Not Found", 404));
        }

        let images = [];
        let video_url = req.body.video_url || null;
        let video = null;
        let media_type = req.body.media_type || "images";

        // Handle uploaded images
        if (req.files && req.files.images) {
            if (req.body.remove_existing_images === "true") {
                for (let img of product.images) {
                    await cloudinary.v2.uploader.destroy(img.public_id);
                }
                images = [];
            } else if (req.body.keep_existing_images === "true") {
                images = [...product.images];
            }

            // Handle multiple images (up to 4)
            const imageFiles = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
            imageFiles.forEach(file => {
                images.push({
                    url: file.path,
                    public_id: file.filename
                });
            });
        } else if (req.body.remove_existing_images === "true") {
            for (let img of product.images) {
                await cloudinary.v2.uploader.destroy(img.public_id);
            }
            images = [];
        } else {
            images = product.images;
        }

        // Handle uploaded video file
        if (req.files && req.files.video) {
            // Delete old video if exists
            if (product.video && product.video.public_id) {
                await cloudinary.v2.uploader.destroy(product.video.public_id);
            }
            video = {
                url: req.files.video[0].path,
                public_id: req.files.video[0].filename
            };
            media_type = "videoFile";
        } else if (media_type === "videoFile") {
            video = product.video;
        }

        // Handle media type changes
        if (req.body.video_url && req.body.video_url.trim() !== "") {
            video_url = req.body.video_url.trim();
        }

        // Determine media_type based on what's present
        if (images.length > 0 && video_url) {
            media_type = "both";
        } else if (images.length > 0) {
            media_type = "images";
        } else if (video_url) {
            media_type = "videoUrl";
        } else if (video) {
            media_type = "videoFile";
        }

        // Validation: At least one image is required
        if (images.length === 0) {
            return next(new ErrorHandler("At least one image is required", 400));
        }

        // Update product data
        const updateData = {
            name: req.body.name,
            description: req.body.description,
            price: req.body.price,
            gst: req.body.gst || 0,
            cuttedPrice: req.body.cuttedPrice || 0,
            discount: req.body.discount || 0,
            delivery_charge: req.body.delivery_charge || 0,
            stock: req.body.stock,
            category: req.body.category,
            subCategory: req.body.subCategory || "",
            status: req.body.status || "Active",
            return_policy: req.body.return_policy || "No",
            return_duration: req.body.return_duration || "",
            warranty: req.body.warranty || "No",
            warranty_duration: req.body.warranty_duration || "",
            images,
            media_type,
            video_url
        };

        // Add video file if exists
        if (video) {
            updateData.video = video;
        } else if (media_type !== "videoFile") {
            updateData.video = null;
        }

        // Log update data
        console.log("Update Data:", updateData);

        // Update product
        product = await Product.findByIdAndUpdate(
            req.params.id,
            updateData,
            {
                new: true,
                runValidators: true,
                useFindAndModify: false,
            }
        );

        res.status(200).json({
            success: true,
            product
        });

    } catch (error) {
        console.log("Error updating product:", error);
        return next(new ErrorHandler(error.message, 500));
    }
});

// Delete Product ---ADMIN
exports.deleteProduct = asyncErrorHandler(async (req, res, next) => {
    const product = await Product.findById(req.params.id);

    if (!product) {
        return next(new ErrorHandler("Product Not Found", 404));
    }

    // Delete images from cloudinary
    for (let img of product.images) {
        await cloudinary.v2.uploader.destroy(img.public_id);
    }

    // Delete video from cloudinary if exists
    if (product.video && product.video.public_id) {
        await cloudinary.v2.uploader.destroy(product.video.public_id);
    }

    await Product.deleteOne({ _id: req.params.id });

    res.status(200).json({
        success: true
    });
});

// Create OR Update Reviews
exports.createProductReview = asyncErrorHandler(async (req, res, next) => {
    const { rating, comment, productId } = req.body;

    const review = {
        user: req.user._id,
        name: req.user.name,
        rating: Number(rating),
        comment,
    }

    const product = await Product.findById(productId);

    if (!product) {
        return next(new ErrorHandler("Product Not Found", 404));
    }

    const isReviewed = product.reviews.find(review => review.user.toString() === req.user._id.toString());

    if (isReviewed) {
        product.reviews.forEach((rev) => { 
            if (rev.user.toString() === req.user._id.toString())
                (rev.rating = rating, rev.comment = comment);
        });
    } else {
        product.reviews.push(review);
        product.numOfReviews = product.reviews.length;
    }

    let avg = 0;

    product.reviews.forEach((rev) => {
        avg += rev.rating;
    });

    product.ratings = avg / product.reviews.length;

    await product.save({ validateBeforeSave: false });

    res.status(200).json({
        success: true
    });
});

// Get All Reviews of Product
exports.getProductReviews = asyncErrorHandler(async (req, res, next) => {
    const product = await Product.findById(req.query.id);

    if (!product) {
        return next(new ErrorHandler("Product Not Found", 404));
    }

    res.status(200).json({
        success: true,
        reviews: product.reviews
    });
});

// Delete Reviews
exports.deleteReview = asyncErrorHandler(async (req, res, next) => {
    const product = await Product.findById(req.query.productId);

    if (!product) {
        return next(new ErrorHandler("Product Not Found", 404));
    }

    const reviews = product.reviews.filter((rev) => rev._id.toString() !== req.query.id.toString());

    let avg = 0;

    reviews.forEach((rev) => {
        avg += rev.rating;
    });

    let ratings = 0;

    if (reviews.length === 0) {
        ratings = 0;
    } else {
        ratings = avg / reviews.length;
    }

    const numOfReviews = reviews.length;

    await Product.findByIdAndUpdate(req.query.productId, {
        reviews,
        ratings: Number(ratings),
        numOfReviews,
    }, {
        new: true,
        runValidators: true,
        useFindAndModify: false,
    });

    res.status(200).json({
        success: true,
    });
});