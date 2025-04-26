const GameSession = require('../models/GameSession');
const GamePlayer = require('../models/GamePlayer');
const User = require('../models/User');

// Constants
const MAX_POSITION = 100;
const POINTS_PENALTY = -5;

// Create a new game session
exports.createGameSession = async (req, res) => {
    try {
        const { mode, userId } = req.body;

        if (!mode || !userId) {
            return res.status(400).json({ message: 'Mode and userId are required' });
        }

        const gameSession = new GameSession({
            mode,
            createdBy: userId,
            status: 'ONGOING'
        });

        await gameSession.save();

        return res.status(201).json({
            message: 'Game session created successfully',
            gameSession
        });
    } catch (error) {
        console.error('Error creating game session:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Add a player to a game session
exports.addPlayerToGame = async (req, res) => {
    try {
        const { gameId, userId } = req.body;

        if (!gameId || !userId) {
            return res.status(400).json({ message: 'GameId and userId are required' });
        }

        // Find the game session
        const gameSession = await GameSession.findById(gameId);

        if (!gameSession) {
            return res.status(404).json({ message: 'Game session not found' });
        }

        if (gameSession.status !== 'ONGOING') {
            return res.status(400).json({ message: 'Cannot join a game that is not ongoing' });
        }

        // Check if player already exists in this game
        const existingPlayer = await GamePlayer.findOne({
            game: gameId,
            user: userId
        });

        if (existingPlayer) {
            return res.status(400).json({ message: 'Player already in this game' });
        }

        // Create a new game player
        const gamePlayer = new GamePlayer({
            user: userId,
            game: gameId,
            points: 0,
            position: 0
        });

        await gamePlayer.save();

        // Add player to game session
        gameSession.players.push(gamePlayer._id);
        await gameSession.save();

        return res.status(201).json({
            message: 'Player added to game successfully',
            gamePlayer
        });
    } catch (error) {
        console.error('Error adding player to game:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// End a game session
exports.endGameSession = async (req, res) => {
    try {
        const { gameId, winnerId, duration } = req.body;

        if (!gameId) {
            return res.status(400).json({ message: 'GameId is required' });
        }

        // Find the game session
        const gameSession = await GameSession.findById(gameId);

        if (!gameSession) {
            return res.status(404).json({ message: 'Game session not found' });
        }

        // Update game session
        gameSession.status = 'COMPLETED';
        gameSession.endedAt = new Date();
        gameSession.duration = duration ||
            Math.floor((new Date() - gameSession.startedAt) / 1000);

        await gameSession.save();

        // Update player results
        if (winnerId) {
            // Update winner
            await GamePlayer.findOneAndUpdate(
                { game: gameId, user: winnerId },
                { result: 'WIN' }
            );

            // Update other players as losers
            await GamePlayer.updateMany(
                { game: gameId, user: { $ne: winnerId } },
                { result: 'LOSS' }
            );
        } else {
            // If no winner, mark all as DRAW
            await GamePlayer.updateMany(
                { game: gameId },
                { result: 'DRAW' }
            );
        }

        return res.status(200).json({
            message: 'Game session ended successfully',
            gameSession
        });
    } catch (error) {
        console.error('Error ending game session:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Get game history for a user
exports.getUserGameHistory = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ message: 'UserId is required' });
        }

        // Find all game players for this user
        const gamePlayers = await GamePlayer.find({ user: userId })
            .populate('game')
            .sort({ 'game.startedAt': -1 });

        // Format the response
        const gameHistory = gamePlayers.map(player => ({
            gameId: player.game._id,
            mode: player.game.mode,
            startedAt: player.game.startedAt,
            endedAt: player.game.endedAt,
            duration: player.game.duration,
            status: player.game.status,
            playerResult: player.result,
            playerPoints: player.points,
            playerPosition: player.position
        }));

        return res.status(200).json({
            message: 'Game history retrieved successfully',
            gameHistory
        });
    } catch (error) {
        console.error('Error retrieving game history:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Get leaderboard
exports.getLeaderboard = async (req, res) => {
    try {
        // Aggregate to find top players by wins
        const leaderboard = await GamePlayer.aggregate([
            { $match: { result: 'WIN' } },
            {
                $group: {
                    _id: '$user',
                    wins: { $sum: 1 },
                    gamesPlayed: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'userDetails'
                }
            },
            { $unwind: '$userDetails' },
            {
                $project: {
                    _id: 1,
                    username: '$userDetails.username',
                    wins: 1,
                    gamesPlayed: 1
                }
            },
            { $sort: { wins: -1 } },
            { $limit: 20 }
        ]);

        return res.status(200).json({
            message: 'Leaderboard retrieved successfully',
            leaderboard
        });
    } catch (error) {
        console.error('Error retrieving leaderboard:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}; 