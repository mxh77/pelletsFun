// controllers/rechargeController.js
const Recharge = require('../models/Recharge');
const Delivery = require('../models/Delivery');

exports.createRecharge = async (req, res) => {
  try {
    const { date, quantity } = req.body;
    console.log('Received recharge request:', req.body); // Log des données reçues

    let remainingQuantity = quantity;
    let totalAmount = 0;
    const deliveries = await Delivery.find().sort({ date: 1 });

    // Recalculer le stock disponible et calculer le montant total
    for (const delivery of deliveries) {
      if (remainingQuantity <= 0) break;
      if (delivery.remainingQuantity > 0) {
        const usedQuantity = Math.min(delivery.remainingQuantity, remainingQuantity);
        const pricePerSac = delivery.price / delivery.quantity;
        totalAmount += usedQuantity * pricePerSac;
        remainingQuantity -= usedQuantity;
      }
    }

    if (remainingQuantity > 0) {
      console.log('Not enough stock to fulfill the recharge'); // Log en cas de stock insuffisant
      return res.status(400).json({ error: 'Not enough stock to fulfill the recharge' });
    }

    // Réinitialiser remainingQuantity pour procéder à la mise à jour réelle
    remainingQuantity = quantity;
    for (const delivery of deliveries) {
      if (remainingQuantity <= 0) break;
      if (delivery.remainingQuantity > 0) {
        const usedQuantity = Math.min(delivery.remainingQuantity, remainingQuantity);
        delivery.remainingQuantity -= usedQuantity;
        remainingQuantity -= usedQuantity;
        await delivery.save();
      }
    }

    const recharge = new Recharge({ date, quantity, totalAmount });
    await recharge.save();
    res.status(201).json(recharge);
  } catch (err) {
    console.error('Error creating recharge:', err.message); // Log de l'erreur
    res.status(400).json({ error: err.message });
  }
};

exports.getRecharges = async (req, res) => {
  try {
    const recharges = await Recharge.find().sort({ date: -1 }); // Trier par date décroissante
    res.status(200).json(recharges);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Méthode pour obtenir un chargement spécifique par ID
exports.getRechargeById = async (req, res) => {
  try {
    const recharge = await Recharge.findById(req.params.id);
    if (!recharge) {
      return res.status(404).json({ error: 'Recharge not found' });
    }
    res.status(200).json(recharge);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Méthode pour mettre à jour un chargement spécifique par ID
exports.updateRechargeById = async (req, res) => {
  try {
    const { date, quantity } = req.body;
    const recharge = await Recharge.findByIdAndUpdate(
      req.params.id,
      { date, quantity },
      { new: true, runValidators: true }
    );
    if (!recharge) {
      return res.status(404).json({ error: 'Recharge not found' });
    }
    res.status(200).json(recharge);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteRecharge = async (req, res) => {
  try {
    const recharge = await Recharge.findByIdAndDelete(req.params.id);
    if (!recharge) {
      return res.status(404).json({ error: 'Recharge not found' });
    }
    res.status(200).json({ message: 'Recharge deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.recalculateRechargeAmounts = async (req, res) => {
  try {
    const recharges = await Recharge.find().sort({ date: 1 });
    const deliveries = await Delivery.find().sort({ date: 1 });

    console.log('Recalculating recharge amounts...');
    console.log('Deliveries:', deliveries);
    console.log('Recharges:', recharges);

    // Réinitialiser remainingQuantity pour toutes les livraisons
    for (const delivery of deliveries) {
      delivery.remainingQuantity = delivery.quantity;
      await delivery.save();
    }

    for (const recharge of recharges) {
      let remainingQuantity = recharge.quantity;
      let totalAmount = 0;
      let details = [];

      console.log(`Processing recharge: ${recharge._id}, quantity: ${recharge.quantity}`);

      for (const delivery of deliveries) {
        const pricePerSac = delivery.price / delivery.quantity;
        console.log(`Checking delivery: ${delivery._id}, remainingQuantity: ${delivery.remainingQuantity}, price per sac: ${pricePerSac}`);
        if (remainingQuantity <= 0) break;
        if (delivery.remainingQuantity > 0) {
          const usedQuantity = Math.min(delivery.remainingQuantity, remainingQuantity);
          totalAmount += usedQuantity * pricePerSac;
          remainingQuantity -= usedQuantity;
          delivery.remainingQuantity -= usedQuantity;

          details.push(`${usedQuantity} sacs à ${pricePerSac.toFixed(2)}€`);

          console.log(`Using ${usedQuantity} from delivery: ${delivery._id}, price per sac: ${pricePerSac}`);
          console.log(`Remaining quantity to fulfill: ${remainingQuantity}`);
          console.log(`Current total amount: ${totalAmount}`);
        }
      }

      recharge.totalAmount = totalAmount;
      recharge.details = details.join(' / ');
      await recharge.save();

      console.log(`Recharge ${recharge._id} updated with total amount: ${totalAmount} and details: ${recharge.details}`);
    }

    res.status(200).json({ message: 'Recharge amounts recalculated successfully' });
  } catch (err) {
    console.error('Error recalculating recharge amounts:', err.message);
    res.status(400).json({ error: err.message });
  }
};