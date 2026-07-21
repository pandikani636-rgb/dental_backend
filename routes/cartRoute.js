const express = require('express');
const { addToCart, getCartItems, removeFromCart, emptyCart } = require('../controllers/cartController');
const { isAuthenticatedUser } = require('../middlewares/auth');

const router = express.Router();

router.route('/').post(isAuthenticatedUser, addToCart);
router.route('/').get(isAuthenticatedUser, getCartItems);
router.route('/:id').delete(isAuthenticatedUser, removeFromCart);
router.route('/empty').delete(isAuthenticatedUser, emptyCart);

module.exports = router;