const Cart = require('../models/CartModel');
const asyncErrorHandler = require('../middlewares/asyncErrorHandler');
const ErrorHandler = require('../utils/errorHandler');

// Add to cart
exports.addToCart = asyncErrorHandler(async (req, res, next) => {
    const { product, name, seller, price, cuttedPrice, image, stock, quantity, discount, delivery_charge } = req.body;

    const existingItem = await Cart.findOne({ user: req.user.id, product });

    if (existingItem) {
        existingItem.quantity = quantity;
        await existingItem.save();
    } else {
        await Cart.create({
            user: req.user.id,
            product,
            name,
            seller,
            price,
            cuttedPrice,
            image,
            stock,
            quantity,
            discount,
            delivery_charge
        });
    }

    res.status(200).json({
        success: true,
        message: 'Item added to cart'
    });
});

// Get cart items
exports.getCartItems = asyncErrorHandler(async (req, res, next) => {
    const cartItems = await Cart.find({ user: req.user.id });

    res.status(200).json({
        success: true,
        cartItems
    });
});

// Remove from cart
exports.removeFromCart = asyncErrorHandler(async (req, res, next) => {
    const cartItem = await Cart.findOneAndDelete({ 
        user: req.user.id, 
        product: req.params.id 
    });

    if (!cartItem) {
        return next(new ErrorHandler('Cart item not found', 404));
    }

    res.status(200).json({
        success: true,
        message: 'Item removed from cart'
    });
});

// Empty cart
exports.emptyCart = asyncErrorHandler(async (req, res, next) => {
    await Cart.deleteMany({ user: req.user.id });

    res.status(200).json({
        success: true,
        message: 'Cart emptied'
    });
});
