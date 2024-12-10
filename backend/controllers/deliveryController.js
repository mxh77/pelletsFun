// controllers/deliveryController.js
const Delivery = require('../models/Delivery');
const Recharge = require('../models/Recharge');

exports.createDelivery = async (req, res) => {
  try {
    const { date, quantity, price } = req.body;
    const delivery = new Delivery({ date, quantity, remainingQuantity: quantity, price });
    await delivery.save();
    res.status(201).json(delivery);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getDeliveries = async (req, res) => {
  try {
    const deliveries = await Delivery.find().sort({ date: -1 });
    res.status(200).json(deliveries);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Méthode pour obtenir une livraison spécifique par ID
exports.getDeliveryById = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    res.status(200).json(delivery);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Méthode pour mettre à jour une livraison spécifique par ID
exports.updateDeliveryById = async (req, res) => {
  try {
    const { date, quantity, price } = req.body;
    const delivery = await Delivery.findByIdAndUpdate(
      req.params.id,
      { date, quantity, price },
      { new: true, runValidators: true }
    );
    if (!delivery) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    res.status(200).json(delivery);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteDelivery = async (req, res) => {
  try {
    const delivery = await Delivery.findByIdAndDelete(req.params.id);
    if (!delivery) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    res.status(200).json({ message: 'Delivery deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.recalculateStock = async (req, res) => {
  try {
    const deliveries = await Delivery.find().sort({ date: 1 });
    const recharges = await Recharge.find().sort({ date: 1 });

    // Reset remainingQuantity to the original quantity
    for (const delivery of deliveries) {
      delivery.remainingQuantity = delivery.quantity;
      await delivery.save();
    }

    // Recalculate remainingQuantity based on recharges
    for (const recharge of recharges) {
      let remainingQuantity = recharge.quantity;
      for (const delivery of deliveries) {
        if (remainingQuantity <= 0) break;
        if (delivery.remainingQuantity > 0) {
          const usedQuantity = Math.min(delivery.remainingQuantity, remainingQuantity);
          delivery.remainingQuantity -= usedQuantity;
          remainingQuantity -= usedQuantity;
          await delivery.save();
        }
      }
    }

    res.status(200).json({ message: 'Stock recalculé avec succès' });
  } catch (err) {
    console.error('Error recalculating stock:', err.message);
    res.status(400).json({ error: err.message });
  }
};