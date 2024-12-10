// routes/recharges.js
const express = require('express');
const router = express.Router();
const rechargeController = require('../controllers/rechargeController');

router.post('/', rechargeController.createRecharge);
router.get('/', rechargeController.getRecharges);
router.get('/:id', rechargeController.getRechargeById);
router.put('/:id', rechargeController.updateRechargeById);
router.delete('/:id', rechargeController.deleteRecharge);
router.post('/recalculate-amounts', rechargeController.recalculateRechargeAmounts); // Nouvelle route

module.exports = router;