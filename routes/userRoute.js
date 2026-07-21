const express = require('express');
const { 
    registerUser, 
    loginUser, 
    logoutUser, 
    getUserDetails, 
    forgotPassword, 
    resetPassword,
    verifyOtp, 
    updatePassword, 
    updateProfile, 
    getAllUsers, 
    getSingleUser, 
    updateUserRole, 
    deleteUser 
} = require('../controllers/userController');
const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/auth');
const uploadMedia = require('../middlewares/multerMedia');

const router = express.Router();

router.route('/register').post(registerUser);
router.route('/login').post(loginUser);
router.route('/logout').get(logoutUser);

router.route('/me').get(isAuthenticatedUser, getUserDetails);

// Forgot/Reset Password Routes
router.route('/password/forgot').post(forgotPassword);
router.route('/verify-otp').post(verifyOtp);
router.route('/password/reset').put(resetPassword);

router.route('/password/update').put(isAuthenticatedUser, updatePassword);

router.route('/me/update').put(isAuthenticatedUser, uploadMedia.single('avatar'), updateProfile);

router.route("/admin/users").get(isAuthenticatedUser, authorizeRoles("admin"), getAllUsers);

router.route("/admin/user/:id")
    .get(isAuthenticatedUser, authorizeRoles("admin"), getSingleUser)
    .put(isAuthenticatedUser, authorizeRoles("admin"), updateUserRole)
    .delete(isAuthenticatedUser, authorizeRoles("admin"), deleteUser);

module.exports = router;