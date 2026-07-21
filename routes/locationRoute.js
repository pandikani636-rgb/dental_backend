const express = require('express');
const { getStates, getDistricts, getCitiesByDistrict, getPincodeByCity, getLocationByPincode } = require('../controllers/locationController');

const router = express.Router();

router.route('/location/states').get(getStates);
router.route('/location/districts/:stateId').get(getDistricts);
router.route('/location/cities/:districtName').get(getCitiesByDistrict);
router.route('/location/pincode/:cityName').get(getPincodeByCity);
router.route('/location/bypincode/:pincode').get(getLocationByPincode);

module.exports = router;
