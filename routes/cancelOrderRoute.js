const express = require('express');
const { createCancelOrder, getAllCancelOrders } = require('../controllers/cancelOrderController');
const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/auth');

const router = express.Router();

router.route('/order/cancel').post(isAuthenticatedUser, createCancelOrder);
router.route('/admin/cancelorders').get(isAuthenticatedUser, authorizeRoles("admin"), getAllCancelOrders);

module.exports = router;
