const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

router.get('/dashboard', reportController.getDashboardData);
router.get('/analytics', reportController.getAnalyticsReport);

module.exports = router;
