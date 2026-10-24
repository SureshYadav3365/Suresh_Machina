const express = require('express');
const router = express.Router();
const downtimeController = require('../controllers/downtimeController');

router.get('/', downtimeController.getDowntimeRecords);
router.post('/', downtimeController.createDowntimeRecord);
router.put('/:id', downtimeController.updateDowntimeRecord);
router.delete('/:id', downtimeController.deleteDowntimeRecord);

module.exports = router;
