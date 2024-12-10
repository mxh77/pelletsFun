const mongoose = require('mongoose');

const rechargeSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  quantity: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  details: { type: String, required: false }

});

module.exports = mongoose.model('Recharge', rechargeSchema);