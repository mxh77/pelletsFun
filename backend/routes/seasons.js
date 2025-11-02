const express = require('express');
const router = express.Router();
const seasonController = require('../controllers/seasonController');

router.get('/', seasonController.getAllSeasons);
router.get('/active', seasonController.getActiveSeason);
router.get('/stats', seasonController.getSeasonStats);
router.get('/:id', seasonController.getSeasonById);
router.post('/', seasonController.createSeason);
router.put('/:id', seasonController.updateSeason);
router.delete('/:id', seasonController.deleteSeason);

module.exports = router;
