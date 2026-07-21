const CancelOrder = require('../models/cancelOrderModel');
const Product = require('../models/productModel');
const User = require('../models/userModel');
const asyncErrorHandler = require('../middlewares/asyncErrorHandler');
const ErrorHandler = require('../utils/errorHandler');
const Email = require('../utils/mail');

// Create Cancel Order Request
exports.createCancelOrder = asyncErrorHandler(async (req, res, next) => {
    const { orderId, productId, reason } = req.body;

    if (!orderId || !productId || !reason) {
        return next(new ErrorHandler("Please provide all required fields", 400));
    }

    // Get product details
    const product = await Product.findById(productId);
    if (!product) {
        return next(new ErrorHandler("Product not found", 404));
    }

    // Create cancel order record
    const cancelOrder = await CancelOrder.create({
        orderId,
        productId,
        userId: req.user._id,
        userName: req.user.name,
        productName: product.name,
        reason
    });

    // Get all admin users
    const adminUsers = await User.find({ role: 'admin' }).select('email');
    
    const message = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                .info-row { margin: 15px 0; padding: 10px; background: white; border-radius: 5px; }
                .label { font-weight: bold; color: #1f2937; }
                .value { color: #4b5563; margin-top: 5px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>🚫 Order Cancellation Request</h2>
                </div>
                <div class="content">
                    <p>A customer has requested to cancel an order.</p>
                    
                    <div class="info-row">
                        <div class="label">Customer Name:</div>
                        <div class="value">${req.user.name}</div>
                    </div>
                    
                    <div class="info-row">
                        <div class="label">Product Name:</div>
                        <div class="value">${product.name}</div>
                    </div>
                    
                    <div class="info-row">
                        <div class="label">Order ID:</div>
                        <div class="value">${orderId}</div>
                    </div>
                    
                    <div class="info-row">
                        <div class="label">Reason for Cancellation:</div>
                        <div class="value">${reason}</div>
                    </div>
                    
                    <div class="info-row">
                        <div class="label">Request Time:</div>
                        <div class="value">${new Date(cancelOrder.createdAt).toLocaleString()}</div>
                    </div>
                    
                    <div style="margin-top: 30px; text-align: center;">
                        <p style="color: #6b7280; font-size: 14px;">Sri Chakra India Dental & Medical Equipments</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;

    // Send email to all admins
    for (const admin of adminUsers) {
        await Email({
            email: admin.email,
            subject: `Order Cancellation Request - ${product.name}`,
            html: message
        });
    }

    res.status(201).json({
        success: true,
        message: "Cancel order request submitted successfully",
        cancelOrder
    });
});

// Get All Cancel Orders (Admin)
exports.getAllCancelOrders = asyncErrorHandler(async (req, res, next) => {
    const cancelOrders = await CancelOrder.find()
        .populate('userId', 'name email')
        .populate('productId', 'name')
        .sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        cancelOrders
    });
});
