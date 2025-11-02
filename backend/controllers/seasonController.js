const Season = require('../models/Season');

// Récupérer toutes les saisons
exports.getAllSeasons = async (req, res) => {
  try {
    const seasons = await Season.find().sort({ startDate: -1 });
    res.json(seasons);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Récupérer une saison par ID
exports.getSeasonById = async (req, res) => {
  try {
    const season = await Season.findById(req.params.id);
    if (!season) {
      return res.status(404).json({ message: 'Saison non trouvée' });
    }
    res.json(season);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Créer une nouvelle saison
exports.createSeason = async (req, res) => {
  const season = new Season({
    name: req.body.name,
    startDate: req.body.startDate,
    endDate: req.body.endDate,
    isActive: req.body.isActive || false,
    notes: req.body.notes || ''
  });

  try {
    // Si cette saison est active, désactiver les autres
    if (season.isActive) {
      await Season.updateMany({}, { isActive: false });
    }
    
    const newSeason = await season.save();
    res.status(201).json(newSeason);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Mettre à jour une saison
exports.updateSeason = async (req, res) => {
  try {
    const season = await Season.findById(req.params.id);
    if (!season) {
      return res.status(404).json({ message: 'Saison non trouvée' });
    }

    if (req.body.name != null) {
      season.name = req.body.name;
    }
    if (req.body.startDate != null) {
      season.startDate = req.body.startDate;
    }
    if (req.body.endDate != null) {
      season.endDate = req.body.endDate;
    }
    if (req.body.isActive != null) {
      // Si on active cette saison, désactiver les autres
      if (req.body.isActive) {
        await Season.updateMany({ _id: { $ne: req.params.id } }, { isActive: false });
      }
      season.isActive = req.body.isActive;
    }
    if (req.body.notes != null) {
      season.notes = req.body.notes;
    }

    const updatedSeason = await season.save();
    res.json(updatedSeason);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Supprimer une saison
exports.deleteSeason = async (req, res) => {
  try {
    const season = await Season.findById(req.params.id);
    if (!season) {
      return res.status(404).json({ message: 'Saison non trouvée' });
    }

    await season.deleteOne();
    res.json({ message: 'Saison supprimée' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obtenir la saison active
exports.getActiveSeason = async (req, res) => {
  try {
    const season = await Season.findOne({ isActive: true });
    res.json(season || {});
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obtenir les statistiques par saison
exports.getSeasonStats = async (req, res) => {
  try {
    const Recharge = require('../models/Recharge');
    const seasons = await Season.find().sort({ startDate: -1 });
    
    const seasonsWithStats = await Promise.all(seasons.map(async (season) => {
      const recharges = await Recharge.find({
        date: {
          $gte: season.startDate,
          $lte: season.endDate
        }
      });

      const totalQuantity = recharges.reduce((sum, r) => sum + r.quantity, 0);
      const totalAmount = recharges.reduce((sum, r) => sum + r.totalAmount, 0);
      
      // Calculer la durée en jours
      const durationMs = new Date(season.endDate) - new Date(season.startDate);
      const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));
      
      return {
        ...season.toObject(),
        stats: {
          totalQuantity,
          totalAmount,
          durationDays,
          averagePerDay: durationDays > 0 ? (totalQuantity / durationDays).toFixed(2) : 0,
          rechargesCount: recharges.length
        }
      };
    }));

    res.json(seasonsWithStats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
