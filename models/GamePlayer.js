const mongoose = require('mongoose');

const gamePlayerSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    game: { type: mongoose.Schema.Types.ObjectId, ref: 'GameSession' },
    points: { type: Number, default: 0 },
    position: { type: Number, default: 0 },
    result: { type: String, enum: ['WIN', 'LOSS', 'DRAW'] },
    joinedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('GamePlayer', gamePlayerSchema); 