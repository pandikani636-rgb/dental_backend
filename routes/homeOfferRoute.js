const express = require('express');
const router = express.Router();
const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/auth');
const { 
    getAllHomeOffers, 
    getActiveHomeOffer,
    getHomeOfferDetails,
    createHomeOffer, 
    updateHomeOffer, 
    deleteHomeOffer 
} = require('../controllers/homeOfferController');
const upload = require('../middlewares/multer');

// Public Routes
router.route('/homeoffers').get(getAllHomeOffers);
router.route('/homeoffers/active').get(getActiveHomeOffer);

// Admin Routes
router.route('/admin/homeoffer/:id').get(isAuthenticatedUser, authorizeRoles("admin"), getHomeOfferDetails);

router.route('/admin/homeoffer').post(
    isAuthenticatedUser, 
    authorizeRoles("admin"), 
    upload.single('image'),
    createHomeOffer
);

router.route('/admin/homeoffer/:id')
    .put(
        isAuthenticatedUser, 
        authorizeRoles("admin"), 
        upload.single('image'),
        updateHomeOffer
    )
    .delete(isAuthenticatedUser, authorizeRoles("admin"), deleteHomeOffer);

module.exports = router;
