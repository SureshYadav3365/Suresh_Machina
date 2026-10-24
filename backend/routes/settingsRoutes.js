const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');

router.get('/', settingsController.getSettings);
router.put('/', settingsController.updateSettings);
router.post('/seed-demo', settingsController.seedDemoData);
router.post('/clear-data', settingsController.clearAllData);

module.exports = router;
