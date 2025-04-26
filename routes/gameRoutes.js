const express = require('express');
const gameController = require('../controllers/gameController');
const { authenticateToken } = require('../middlewares/authMiddleware');

const router = express.Router();

// Game session routes
router.post('/sessions', authenticateToken, gameController.createGameSession);
router.post('/sessions/join', authenticateToken, gameController.addPlayerToGame);
router.patch('/sessions/end', authenticateToken, gameController.endGameSession);

// Game history and leaderboard
router.get('/history/:userId', authenticateToken, gameController.getUserGameHistory);
router.get('/leaderboard', gameController.getLeaderboard);

module.exports = router; 