// routes/deliveries.js
const express = require('express');
const router = express.Router();
const deliveryController = require('../controllers/deliveryController');

router.post('/', deliveryController.createDelivery);
router.get('/', deliveryController.getDeliveries);
router.get('/:id', deliveryController.getDeliveryById);
router.delete('/:id', deliveryController.deleteDelivery);
router.put('/:id', deliveryController.updateDeliveryById);
router.post('/recalculate-stock', deliveryController.recalculateStock); // Nouvelle route

module.exports = router;