const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');

router.get('/', expenseController.getExpenses);
router.post('/', expenseController.createExpense);
router.put('/:id', expenseController.updateExpense);
router.delete('/:id', expenseController.deleteExpense);

// Actual sales revenue endpoints (for profit = revenue - expenses)
router.get('/revenue', expenseController.getSalesRevenue);
router.post('/revenue', expenseController.saveSalesRevenue);

module.exports = router;
