const Offer = require('../models/offerModel');
const User = require('../models/userModel');
const asyncErrorHandler = require('../middlewares/asyncErrorHandler');
const ErrorHandler = require('../utils/errorHandler');
const cloudinary = require('cloudinary').v2;
const Email = require('../utils/mail');

// Create Offer
exports.createOffer = asyncErrorHandler(async (req, res, next) => {
    const { name, description } = req.body;

    if (!req.file) {
        return next(new ErrorHandler("Please upload an image", 400));
    }

    // Upload image to cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "offers"
    });

    const offer = await Offer.create({
        name,
        description,
        image: {
            public_id: result.public_id,
            url: result.secure_url
        }
    });

    // Get all users' emails
    const users = await User.find({}, 'email name');
    
    // Send email to all users
    const emailPromises = users.map(user => {
        const message = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #10b981, #3b82f6); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                    .offer-image { width: 100%; max-width: 350px; height: 300px; border-radius: 8px; margin: 10px 0; }
                    .offer-name { font-size: 16px; font-weight: bold; color: #1f2937; margin: 10px 0; }
                    .offer-product { font-size: 13px; font-weight: bold; color: #1f2937; margin: 10px 0; }
                    .offer-description { color: #4b5563; line-height: 1.6; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>🎉 Special Offer!</h2>
                    </div>
                    <div class="content">
                        <h3>Hello ${user.name},</h3>
                        <p>We have an exciting offer for you!</p>
                        
                        <span class="offer-product">Product Name : </span><div class="offer-name">${name}</div>
                        <span class="offer-product">Product Image : </span><br>
                        <img src="${result.secure_url}" alt="${name}" class="offer-image" /><br>
                        <span class="offer-product">Description : </span><div class="offer-description">${description}</div>
                        
                        <p style="margin-top: 30px;">Don't miss out on this amazing opportunity!</p>
                        
                        <div style="margin-top: 30px; text-align: center;">
                            <p style="color: #6b7280; font-size: 14px;">Best regards,<br>Sri Chakra India Dental & Medical Equipments</p><br>
                            <a href="https://dental.shashestudies.com/">Click to See</a>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;

        return Email({
            email: user.email,
            subject: `Special Offer: ${name}`,
            html: message
        }).catch(err => console.error(`Failed to send email to ${user.email}:`, err.message));
    });

    // Wait for all emails to be sent
    await Promise.all(emailPromises);

    res.status(201).json({
        success: true,
        message: "Offer created and emails sent successfully",
        offer
    });
});

// Get All Offers
exports.getAllOffers = asyncErrorHandler(async (req, res, next) => {
    const offers = await Offer.find().sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        offers
    });
});

// Delete Offer
exports.deleteOffer = asyncErrorHandler(async (req, res, next) => {
    const offer = await Offer.findById(req.params.id);

    if (!offer) {
        return next(new ErrorHandler("Offer not found", 404));
    }

    // Delete image from cloudinary
    await cloudinary.uploader.destroy(offer.image.public_id);

    await Offer.findByIdAndDelete(req.params.id);

    res.status(200).json({
        success: true,
        message: "Offer deleted successfully"
    });
});
