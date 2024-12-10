const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  date: { type: Date, required: true },
  quantity: { type: Number, required: true },
  remainingQuantity: { type: Number, required: true }, // Nouveau champ
  price: { type: Number, required: true }
});

module.exports = mongoose.model('Delivery', deliverySchema);