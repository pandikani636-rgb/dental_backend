const express = require('express');
const { createOffer, getAllOffers, deleteOffer } = require('../controllers/offerController');
const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/auth');
const uploadMedia = require('../middlewares/multerMedia');

const router = express.Router();

router.route('/admin/offers/new').post(isAuthenticatedUser, authorizeRoles("admin"), uploadMedia.single('image'), createOffer);
router.route('/admin/offers').get(isAuthenticatedUser, authorizeRoles("admin"), getAllOffers);
router.route('/admin/offers/:id').delete(isAuthenticatedUser, authorizeRoles("admin"), deleteOffer);

module.exports = router;
