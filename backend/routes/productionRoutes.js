const express = require('express');
const router = express.Router();
const productionController = require('../controllers/productionController');

// Production History endpoint
router.get('/history', productionController.getProductionHistory);

// Delete all records for an entire day
router.delete('/day/:date', productionController.deleteDayProduction);

// Standard daily production routes
router.get('/', productionController.getProduction);
router.post('/', productionController.createOrUpdateProduction);
router.put('/:id', productionController.updateProduction);
router.delete('/:id', productionController.deleteProduction);

module.exports = router;
