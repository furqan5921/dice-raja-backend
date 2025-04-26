const mongoose = require('mongoose');

const gameSessionSchema = new mongoose.Schema({
    mode: { type: String, enum: ['ONLINE', 'OFFLINE'], required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    startedAt: { type: Date, default: Date.now },
    endedAt: Date,
    duration: Number, // in seconds
    status: { type: String, enum: ['COMPLETED', 'ONGOING', 'ABANDONED'], default: 'ONGOING' },
    players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'GamePlayer' }]
});

module.exports = mongoose.model('GameSession', gameSessionSchema); 