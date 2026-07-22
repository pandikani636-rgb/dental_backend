const asyncErrorHandler = require('../middlewares/asyncErrorHandler');
const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const User = require('../models/userModel');
const Cart = require('../models/CartModel');
const ErrorHandler = require('../utils/errorHandler');
const sendEmail = require('../utils/sendEmail');

// Create New Order
exports.newOrder = asyncErrorHandler(async (req, res, next) => {

    console.log(req.body);
    
    const {
        shippingInfo,
        orderItems,
        paymentInfo,
        totalPrice,
        shippingPrice,
    } = req.body;

    const orderExist = await Order.findOne({ paymentInfo });

    if (orderExist) {
        return next(new ErrorHandler("Order Already Placed", 400));
    }

    // Check stock availability and fix image URLs
    for (const item of orderItems) {
        const product = await Product.findById(item.product);
        if (!product) {
            return next(new ErrorHandler(`Product not found: ${item.name}`, 404));
        }
        if (product.stock < item.quantity) {
            return next(new ErrorHandler(`Insufficient stock for ${product.name}. Available: ${product.stock}`, 400));
        }
        // Fix image URL: remove backslashes and /admin/product/ path
        if (item.image) {
            const backendUrl = process.env.BACKEND_URL || 'https://dental-backend-ten.vercel.app';
            item.image = item.image.replace(/\\/g, '/').replace('http://localhost:4000/admin/product/', `${backendUrl}/`).replace('https://dental-backend-ten.vercel.app/admin/product/', `${backendUrl}/`);
        }
    }

    const order = await Order.create({
        shippingInfo: {
            ...shippingInfo,
            landmark: shippingInfo.landmark || ""
        },
        orderItems,
        paymentInfo,
        totalPrice,
        shippingPrice: shippingPrice || 0,
        paidAt: Date.now(),
        user: req.user._id,
    });

    // Decrease stock after order creation and check for low/out of stock
    const lowStockProducts = [];
    const outOfStockProducts = [];

    for (const item of orderItems) {
        const product = await Product.findById(item.product);
        product.stock -= item.quantity;
        await product.save({ validateBeforeSave: false });

        if (product.stock === 0) {
            outOfStockProducts.push(product);
        } else if (product.stock > 0 && product.stock <= 5) {
            lowStockProducts.push(product);
        }
    }

    // Send stock alerts to admins (non-blocking)
    if (lowStockProducts.length > 0 || outOfStockProducts.length > 0) {
        setImmediate(async () => {
            try {
                const admins = await User.find({ role: { $in: ['ADMIN', 'admin'] } });
                
                for (const admin of admins) {
                    let stockAlertHtml = '';

                    if (outOfStockProducts.length > 0) {
                        const outOfStockHtml = outOfStockProducts.map(p => `
                            <div style="background-color: #ffebee; padding: 15px; margin: 10px 0; border-left: 4px solid #d32f2f; border-radius: 4px;">
                                <table style="width: 100%; font-size: 14px;">
                                    <tr>
                                        <td style="padding: 4px 0; color: #666;"><strong>Product Name:</strong></td>
                                        <td style="padding: 4px 0; color: #d32f2f; font-weight: bold; font-size: 16px;">${p.name}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 4px 0; color: #666;"><strong>Product ID:</strong></td>
                                        <td style="padding: 4px 0; color: #333;">${p._id}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 4px 0; color: #666;"><strong>Category:</strong></td>
                                        <td style="padding: 4px 0; color: #333;">${p.category || 'N/A'}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 4px 0; color: #666;"><strong>Price:</strong></td>
                                        <td style="padding: 4px 0; color: #333;">₹${p.price || 'N/A'}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 4px 0; color: #666;"><strong>Current Stock:</strong></td>
                                        <td style="padding: 4px 0; color: #d32f2f; font-weight: bold; font-size: 16px;">0 (OUT OF STOCK)</td>
                                    </tr>
                                </table>
                            </div>
                        `).join('');
                        stockAlertHtml += `
                            <div style="background-color: #ffebee; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                <h3 style="margin: 0 0 15px 0; color: #d32f2f;">⚠️ Critical: Out of Stock Products</h3>
                                ${outOfStockHtml}
                            </div>
                        `;
                    }

                    if (lowStockProducts.length > 0) {
                        const lowStockHtml = lowStockProducts.map(p => `
                            <div style="background-color: #fff3e0; padding: 15px; margin: 10px 0; border-left: 4px solid #ff9800; border-radius: 4px;">
                                <table style="width: 100%; font-size: 14px;">
                                    <tr>
                                        <td style="padding: 4px 0; color: #666;"><strong>Product Name:</strong></td>
                                        <td style="padding: 4px 0; color: #e65100; font-weight: bold; font-size: 16px;">${p.name}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 4px 0; color: #666;"><strong>Product ID:</strong></td>
                                        <td style="padding: 4px 0; color: #333;">${p._id}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 4px 0; color: #666;"><strong>Category:</strong></td>
                                        <td style="padding: 4px 0; color: #333;">${p.category || 'N/A'}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 4px 0; color: #666;"><strong>Price:</strong></td>
                                        <td style="padding: 4px 0; color: #333;">₹${p.price || 'N/A'}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 4px 0; color: #666;"><strong>Current Stock:</strong></td>
                                        <td style="padding: 4px 0; color: #ff9800; font-weight: bold; font-size: 16px;">${p.stock} (LOW STOCK)</td>
                                    </tr>
                                </table>
                            </div>
                        `).join('');
                        stockAlertHtml += `
                            <div style="background-color: #fff3e0; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                <h3 style="margin: 0 0 15px 0; color: #ff9800;">⚠️ Warning: Low Stock Products (≤5)</h3>
                                ${lowStockHtml}
                            </div>
                        `;
                    }

                    await sendEmail({
                        email: admin.email,
                        subject: 'Sri Chakra Dental - Stock Alert: Immediate Action Required',
                        html: `
                        <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
                            <div style="background-color: #1976d2; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                                <h1 style="margin: 0; font-size: 24px;">Dental CFWO</h1>
                                <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Inventory Management System</p>
                            </div>
                            
                            <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px;">
                                <h2 style="color: #333; margin-top: 0;">Stock Alert Notification</h2>
                                <p style="color: #666; font-size: 16px;">Dear Admin,</p>
                                <p style="color: #666;">The following products require immediate attention and restocking:</p>
                                
                                ${stockAlertHtml}
                                
                                <div style="background-color: #e3f2fd; padding: 15px; border-radius: 6px; margin-top: 20px;">
                                    <p style="margin: 0; color: #1565c0; font-weight: bold;">📦 Action Required:</p>
                                    <p style="margin: 5px 0 0 0; color: #666;">Please restock these items immediately to avoid order fulfillment delays.</p>
                                </div>
                                
                                <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                                <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">This is an automated notification from Dental CFWO Inventory System</p>
                            </div>
                        </div>
                        `
                    });
                }
            } catch (error) {
                console.error('Stock alert email error:', error);
            }
        });
    }

    const getImageUrl = (images) => {
        if (images && images.length > 0 && images[0]) {
            const image = images[0];
            if (image.url && (image.url.startsWith('http') || image.url.startsWith('/'))) {
                return image.url;
            }
            if (image.url && image.url.includes('uploads')) {
                return `/${image.url.replace(/\\/g, '/')}`;
            }
            if (image.public_id) {
                return `/${image.public_id}`;
            }
        }
        return '/default.png';
    };

    const productDetailsHtml = order.orderItems.map((item) => {
        const imageUrl = item.image || getImageUrl(item.image) || `${process.env.BACKEND_URL || 'https://dental-backend-ten.vercel.app'}/images/placeholder.jpg`;
        const priceWithGst = item.price + (item.price * (item.gst || 0) / 100);
        const total = priceWithGst * item.quantity;
        
        return `
        <tr>
            <td style="padding:12px;border-bottom:1px solid #e0e0e0;text-align:center">
                <img src="${item.image}" alt="${item.name}" style="width:70px;height:70px;object-fit:cover;border-radius:8px;border:1px solid #f0f0f0">
            </td>
            <td style="padding:12px;border-bottom:1px solid #e0e0e0">
                <div style="font-weight:600;font-size:15px;color:#212121;margin-bottom:4px">${item.name}</div>
            </td>
            <td style="padding:12px;border-bottom:1px solid #e0e0e0;text-align:center;font-weight:600;color:#424242">${item.quantity}</td>
            <td style="padding:12px;border-bottom:1px solid #e0e0e0;text-align:center;color:#4caf50;font-size:14px">${item.discount || 0}%</td>
            <td style="padding:12px;border-bottom:1px solid #e0e0e0;text-align:center;color:#666;font-size:14px">₹${item.delivery_charge || 0}</td>
            <td style="padding:12px;border-bottom:1px solid #e0e0e0;text-align:right;font-weight:600;color:#1976d2;font-size:15px">₹${total.toFixed(2)}</td>
        </tr>`;
    }).join('');

    try {
        await sendEmail({
            email: req.user.email,
            subject: '🎉 Order Confirmed - Sri Chakra Dental',
            html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width,initial-scale=1.0">
            </head>
            <body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f5f5f5">
                <div style="max-width:650px;margin:20px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
                    <div style="background:linear-gradient(135deg,#1976d2 0%,#1565c0 100%);padding:32px 24px;text-align:center">
                        <div style="font-size:48px;margin-bottom:8px">✓</div>
                        <h1 style="margin:0;color:#fff;font-size:28px;font-weight:600">Order Confirmed!</h1>
                        <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:15px">Thank you for your purchase</p>
                    </div>
                    
                    <div style="padding:32px 24px">
                        <p style="font-size:16px;color:#212121;margin:0 0 8px">Hi <strong>${req.user.name}</strong>,</p>
                        <p style="color:#616161;font-size:14px;line-height:1.6;margin:0 0 24px">Your order has been successfully placed and is being processed. We'll notify you once it ships.</p>

                        <h2 style="font-size:18px;color:#212121;margin:0 0 16px;font-weight:600">Order Items</h2>
                        <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
                            <thead>
                                <tr style="background:#fafafa">
                                    <th style="padding:12px;text-align:left;font-size:13px;color:#757575;font-weight:600">Product</th>
                                    <th style="padding:12px;text-align:left;font-size:13px;color:#757575;font-weight:600">Product Name</th>
                                    <th style="padding:12px;text-align:center;font-size:13px;color:#757575;font-weight:600">Qty</th>
                                    <th style="padding:12px;text-align:center;font-size:13px;color:#757575;font-weight:600">Discount</th>
                                    <th style="padding:12px;text-align:center;font-size:13px;color:#757575;font-weight:600">Delivery</th>
                                    <th style="padding:12px;text-align:right;font-size:13px;color:#757575;font-weight:600">Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${productDetailsHtml}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colspan="5" style="padding:16px 12px;text-align:right;font-size:16px;font-weight:600;color:#212121;border-top:2px solid #e0e0e0">Total Amount</td>
                                    <td style="padding:16px 12px;text-align:right;font-size:18px;font-weight:700;color:#1976d2;border-top:2px solid #e0e0e0">₹${totalPrice}</td>
                                </tr>
                            </tfoot>
                        </table>

                        <h3 style="font-size:16px;color:#212121;margin:0 0 12px;font-weight:600">📍 Shipping Address</h3>
                        <div style="background:#f8f9fa;border-left:4px solid #1976d2;padding:16px;border-radius:4px;margin-bottom:24px">
                            <p style="margin:0;color:#424242;font-size:14px;line-height:1.6">
                                ${shippingInfo.address}<br>
                                ${shippingInfo.city}, ${shippingInfo.state} - ${shippingInfo.pincode}<br>
                                📞 ${shippingInfo.phoneNo}
                                ${shippingInfo.landmark ? `<br>Landmark: ${shippingInfo.landmark}` : ''}
                            </p>
                        </div>

                        <div style="background:#e3f2fd;border-radius:8px;padding:16px;text-align:center;margin-bottom:24px">
                            <p style="margin:0;color:#1565c0;font-size:14px;font-weight:500">📦 We'll send you tracking details once your order ships</p>
                        </div>

                        <p style="color:#757575;font-size:13px;text-align:center;margin:24px 0 0;padding-top:24px;border-top:1px solid #e0e0e0">Need help? Contact us at support@srichakradental.com</p>
                    </div>
                    
                    <div style="background:#fafafa;padding:20px;text-align:center">
                        <p style="margin:0;color:#9e9e9e;font-size:12px">© ${new Date().getFullYear()} Sri Chakra Dental. All rights reserved.</p>
                        <p style="margin:8px 0 0;color:#bdbdbd;font-size:11px">This is an automated email. Please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>
            `
        });
        console.log('Order confirmation email sent');
    } catch (emailError) {
        console.error('Email error:', emailError);
    }

    // Clear only ordered items from cart
    const orderedProductIds = orderItems.map(item => item.product.toString());
    await Cart.deleteMany({ 
        user: req.user._id,
        product: { $in: orderedProductIds }
    });

    res.status(201).json({
        success: true,
        order,
    });
});

// Get Single Order Details
exports.getSingleOrderDetails = asyncErrorHandler(async (req, res, next) => {

    const order = await Order.findById(req.params.id).populate("user", "name email");

    if (!order) {
        return next(new ErrorHandler("Order Not Found", 404));
    }

    res.status(200).json({
        success: true,
        order,
    });
});

// Get Logged In User Orders
exports.myOrders = asyncErrorHandler(async (req, res, next) => {

    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });

    if (!orders) {
        return next(new ErrorHandler("Order Not Found", 404));
    }

    res.status(200).json({
        success: true,
        orders,
    });
});

// Get All Orders ---ADMIN
exports.getAllOrders = asyncErrorHandler(async (req, res, next) => {

    const orders = await Order.find().sort({ createdAt: -1 });

    if (!orders) {
        return next(new ErrorHandler("Order Not Found", 404));
    }

    let totalAmount = 0;
    orders.forEach((order) => {
        totalAmount += order.totalPrice;
    });

    res.status(200).json({
        success: true,
        orders,
        totalAmount,
    });
});

// Update Order Status ---ADMIN
exports.updateOrder = asyncErrorHandler(async (req, res, next) => {

    const order = await Order.findById(req.params.id).populate("user", "name email");

    if (!order) {
        return next(new ErrorHandler("Order Not Found", 404));
    }

    if (order.orderStatus === "Delivered") {
        return next(new ErrorHandler("Already Delivered", 400));
    }

    if (req.body.status === "Shipped") {
        order.shippedAt = Date.now();
    }

    if (req.body.landmark !== undefined) {
        order.shippingInfo.landmark = req.body.landmark;
    }

    const previousStatus = order.orderStatus;
    order.orderStatus = req.body.status;
    
    if (req.body.status === "Delivered") {
        order.deliveredAt = Date.now();
    }

    await order.save({ validateBeforeSave: false });

    // Send status update email if status changed to Shipped or Delivered
    if (previousStatus !== req.body.status && (req.body.status === "Shipped" || req.body.status === "Delivered")) {
        const productDetailsHtml = order.orderItems.map(item => `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">
                    <img src="${item.image}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px;">
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.name}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">₹${item.price}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">₹${item.price * item.quantity}</td>
            </tr>
        `).join('');

        const statusMessage = req.body.status === "Shipped" 
            ? "Your order has been shipped and is on its way!" 
            : "Your order has been successfully delivered. We hope you enjoy your purchase!";
        
        const statusIcon = req.body.status === "Shipped" ? "🚚" : "✅";
        const statusColor = req.body.status === "Shipped" ? "#1976d2" : "#4CAF50";

        try {
            await sendEmail({
                email: order.user.email,
                subject: `Order Update - Your Order has been ${req.body.status}`,
                html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                    <div style="background-color: ${statusColor}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                        <h1 style="margin: 0;">${statusIcon} Order ${req.body.status}!</h1>
                    </div>
                    
                    <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px;">
                        <p style="font-size: 16px; color: #333;">Dear <strong>${order.user.name}</strong>,</p>
                        <p style="color: #666;">${statusMessage}</p>
                        
                        <div style="background-color: #f0f0f0; padding: 15px; border-radius: 6px; margin: 20px 0;">
                            <p style="margin: 5px 0; color: #333;"><strong>Order ID:</strong> ${order._id}</p>
                            <p style="margin: 5px 0; color: #333;"><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${req.body.status}</span></p>
                            <p style="margin: 5px 0; color: #333;"><strong>Update Date:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
                        </div>
    
                        <h2 style="color: #333; border-bottom: 2px solid ${statusColor}; padding-bottom: 10px;">Order Summary</h2>
                        
                        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                            <thead>
                                <tr style="background-color: #f5f5f5;">
                                    <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Image</th>
                                    <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Product</th>
                                    <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Qty</th>
                                    <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
                                    <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${productDetailsHtml}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colspan="4" style="padding: 15px 10px; text-align: right; font-size: 18px; font-weight: bold; border-top: 2px solid #333;">Total Amount:</td>
                                    <td style="padding: 15px 10px; text-align: right; font-size: 18px; font-weight: bold; color: ${statusColor}; border-top: 2px solid #333;">₹${order.totalPrice}</td>
                                </tr>
                            </tfoot>
                        </table>
    
                        <h3 style="color: #333; margin-top: 30px;">Shipping Address</h3>
                        <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid ${statusColor}; margin: 10px 0;">
                            <p style="margin: 5px 0; color: #333;">${order.shippingInfo.address}</p>
                            <p style="margin: 5px 0; color: #333;">${order.shippingInfo.city}, ${order.shippingInfo.state} - ${order.shippingInfo.pincode}</p>
                            <p style="margin: 5px 0; color: #333;">Phone: ${order.shippingInfo.phoneNo}</p>
                            ${order.shippingInfo.landmark ? `<p style="margin: 5px 0; color: #666;">Landmark: ${order.shippingInfo.landmark}</p>` : ''}
                        </div>
    
                        <p style="color: #666; margin-top: 30px;">If you have any questions, please don't hesitate to contact us.</p>
                        <p style="color: #666;">Thank you for shopping with Sri Chakra Dental!</p>
                        
                        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                        <p style="color: #999; font-size: 12px; text-align: center;">This is an automated email. Please do not reply to this message.</p>
                    </div>
                </div>
                `
            });
        } catch (emailError) {
            console.error('Order status update email error:', emailError);
        }
    }

    res.status(200).json({
        success: true
    });
});

// Product Sales Report ---ADMIN
exports.getProductSalesReport = asyncErrorHandler(async (req, res, next) => {
    const { type, fromDate, toDate } = req.query;

    const now = new Date();
    let startDate, endDate;

    if (fromDate && toDate) {
        startDate = new Date(fromDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
    } else if (type === 'day') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (type === 'week') {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay());
        startDate.setHours(0, 0, 0, 0);
        endDate = now;
    } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = now;
    }

    const orders = await Order.find({ createdAt: { $gte: startDate, $lte: endDate } });

    const productMap = {};
    orders.forEach(order => {
        order.orderItems.forEach(item => {
            const id = item.product.toString();
            if (!productMap[id]) {
                productMap[id] = {
                    productId: id,
                    name: item.name,
                    image: item.image,
                    totalQuantity: 0,
                    totalBaseAmount: 0,
                    totalGstAmount: 0,
                    totalDeliveryCharges: 0,
                    totalRevenue: 0,
                    gstPercentage: item.gst || 0, // Store the GST % for display
                };
            }
            const baseAmount = item.price * item.quantity;
            const gstAmount = (baseAmount * (item.gst || 0)) / 100;
            const deliveryCharges = (item.delivery_charge || 0) * item.quantity;
            
            productMap[id].totalQuantity += item.quantity;
            productMap[id].totalBaseAmount += baseAmount;
            productMap[id].totalGstAmount += gstAmount;
            productMap[id].totalDeliveryCharges += deliveryCharges;
            productMap[id].totalRevenue += (baseAmount + gstAmount + deliveryCharges);
        });
    });

    const report = Object.values(productMap).sort((a, b) => b.totalQuantity - a.totalQuantity);

    res.status(200).json({
        success: true,
        startDate,
        endDate,
        report,
    });
});

// Delete Order ---ADMIN
exports.deleteOrder = asyncErrorHandler(async (req, res, next) => {

    const order = await Order.findById(req.params.id);

    if (!order) {
        return next(new ErrorHandler("Order Not Found", 404));
    }

    await order.remove();

    res.status(200).json({
        success: true,
    });
});