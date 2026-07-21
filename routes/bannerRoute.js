const express = require('express');
const router = express.Router();
const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/auth');
const { 
    getAllBanners, 
    getAdminBanners, 
    getBannerDetails,
    createBanner, 
    updateBanner, 
    deleteBanner 
} = require('../controllers/bannerController');
const upload = require('../middlewares/multer');

// Public Routes
router.route('/banners').get(getAllBanners);
router.route('/banner/:id').get(getBannerDetails);

// Admin Routes
router.route('/admin/banners').get(isAuthenticatedUser, authorizeRoles("admin"), getAdminBanners);

// Use bannerFiles middleware for banners
router.route('/admin/banner/new').post(
    isAuthenticatedUser, 
    authorizeRoles("admin"), 
    upload.bannerFiles, // Use the specific banner middleware
    createBanner
);

router.route('/admin/banner/:id')
    .put(
        isAuthenticatedUser, 
        authorizeRoles("admin"), 
        upload.bannerFiles,
        updateBanner
    )
    .delete(isAuthenticatedUser, authorizeRoles("admin"), deleteBanner);

module.exports = router;