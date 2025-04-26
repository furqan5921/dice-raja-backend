require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const gameRoutes = require('./routes/gameRoutes');

// Initialize Express
const app = express();
const server = http.createServer(app);

// Define allowed origins based on environment variables
const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:5173',
];

// Add production URL if available
if (process.env.FRONTEND_PROD_URL) {
    allowedOrigins.push(process.env.FRONTEND_PROD_URL);
}

console.log('Allowed CORS origins:', allowedOrigins);

// CORS configuration
const corsOptions = {
    origin: allowedOrigins, // Dynamic origins from env
    credentials: true, // Allow credentials
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

// Socket.IO setup with CORS
const io = socketIO(server, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// Configure Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/games', gameRoutes);

// Room Schema (optional - for persisting room data)
const roomSchema = new mongoose.Schema({
    roomId: { type: String, required: true, unique: true },
    gameType: { type: String, enum: ['tictactoe', 'snakeladder'], required: true },
    players: [{ socketId: String, username: String, isReady: Boolean }],
    gameState: { type: Object, default: {} },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Room = mongoose.model('Room', roomSchema);

// Game rooms tracking (in-memory)
const rooms = {};

// Socket.IO event handlers
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Create a new game room
    socket.on('createRoom', async ({ gameType, username }) => {
        try {
            // Generate a random 4-digit room code
            const roomId = Math.floor(1000 + Math.random() * 9000).toString();

            // Create room in memory
            rooms[roomId] = {
                roomId,
                gameType,
                players: [{ socketId: socket.id, username, isReady: true }],
                gameState: {},
                isActive: true,
                createdAt: new Date()
            };

            // Join the room
            socket.join(roomId);

            // Save to MongoDB if needed
            await new Room({
                roomId,
                gameType,
                players: [{ socketId: socket.id, username, isReady: true }],
                gameState: {}
            }).save();

            // Notify client of successful room creation
            socket.emit('roomCreated', {
                roomId,
                gameType,
                player: { socketId: socket.id, username, isReady: true }
            });

            console.log(`Room created: ${roomId}, Game type: ${gameType}, Creator: ${username}`);
        } catch (error) {
            console.error('Error creating room:', error);
            socket.emit('error', { message: 'Error creating room' });
        }
    });

    // Join an existing game room
    socket.on('joinRoom', async ({ roomId, username }) => {
        try {
            // Check if room exists
            const room = rooms[roomId];

            if (!room) {
                return socket.emit('error', { message: 'Room not found' });
            }

            // Check if room is full (only 2 players allowed)
            if (room.players.length >= 2) {
                return socket.emit('error', { message: 'Room is full' });
            }

            // Add player to room
            room.players.push({ socketId: socket.id, username, isReady: true });

            // Join the socket room
            socket.join(roomId);

            // Update MongoDB if needed
            await Room.findOneAndUpdate(
                { roomId },
                { $push: { players: { socketId: socket.id, username, isReady: true } } }
            );

            // Notify all clients in the room
            io.to(roomId).emit('playerJoined', {
                roomId,
                players: room.players,
                gameType: room.gameType
            });

            // If 2 players, start the game
            if (room.players.length === 2) {
                // Initialize game state based on game type
                if (room.gameType === 'tictactoe') {
                    room.gameState = {
                        currentPlayer: 0, // Index of the first player
                        board: Array(9).fill(null),
                        winner: null
                    };
                } else if (room.gameType === 'snakeladder') {
                    room.gameState = {
                        currentPlayer: 0, // Index of the first player
                        players: [
                            { position: 0, hasStarted: false },
                            { position: 0, hasStarted: false }
                        ],
                        diceValue: null,
                        winner: null
                    };
                }

                // Update MongoDB if needed
                await Room.findOneAndUpdate(
                    { roomId },
                    { gameState: room.gameState, updatedAt: new Date() }
                );

                // Emit game start event
                io.to(roomId).emit('gameStart', {
                    roomId,
                    players: room.players,
                    gameState: room.gameState,
                    gameType: room.gameType
                });
            }

            console.log(`Player ${username} joined room ${roomId}`);
        } catch (error) {
            console.error('Error joining room:', error);
            socket.emit('error', { message: 'Error joining room' });
        }
    });

    // TicTacToe events
    socket.on('ticTacToeMove', async ({ roomId, cellIndex }) => {
        try {
            const room = rooms[roomId];

            if (!room || room.gameType !== 'tictactoe') {
                return socket.emit('error', { message: 'Invalid room or game type' });
            }

            // Get player index
            const playerIndex = room.players.findIndex(p => p.socketId === socket.id);

            if (playerIndex === -1) {
                return socket.emit('error', { message: 'Player not found in room' });
            }

            // Check if it's this player's turn
            if (playerIndex !== room.gameState.currentPlayer) {
                return socket.emit('error', { message: 'Not your turn' });
            }

            // Check if the cell is already occupied
            if (room.gameState.board[cellIndex] !== null) {
                return socket.emit('error', { message: 'Cell already occupied' });
            }

            // Update the board
            room.gameState.board[cellIndex] = playerIndex;

            // Check for winner
            const winner = checkTicTacToeWinner(room.gameState.board);
            if (winner !== null) {
                room.gameState.winner = winner;

                // Emit game over event
                io.to(roomId).emit('gameOver', {
                    roomId,
                    winner: winner === 'draw' ? 'draw' : room.players[winner].username,
                    gameState: room.gameState
                });
            } else {
                // Switch to next player
                room.gameState.currentPlayer = (room.gameState.currentPlayer + 1) % 2;

                // Emit move event
                io.to(roomId).emit('gameUpdated', {
                    roomId,
                    gameState: room.gameState
                });
            }

            // Update MongoDB if needed
            await Room.findOneAndUpdate(
                { roomId },
                { gameState: room.gameState, updatedAt: new Date() }
            );
        } catch (error) {
            console.error('Error processing TicTacToe move:', error);
            socket.emit('error', { message: 'Error processing move' });
        }
    });

    // Snake and Ladder events
    socket.on('rollDice', async ({ roomId }) => {
        try {
            const room = rooms[roomId];

            if (!room || room.gameType !== 'snakeladder') {
                console.log(`Invalid dice roll - Room not found or wrong game type: ${roomId}, ${room?.gameType}`);
                return socket.emit('error', { message: 'Invalid room or game type' });
            }

            // Get player index
            const playerIndex = room.players.findIndex(p => p.socketId === socket.id);

            if (playerIndex === -1) {
                console.log(`Player not found in room: ${socket.id} in room ${roomId}`);
                return socket.emit('error', { message: 'Player not found in room' });
            }

            // Check if it's this player's turn
            if (playerIndex !== room.gameState.currentPlayer) {
                console.log(`Not player's turn - Player: ${playerIndex}, Current player: ${room.gameState.currentPlayer}`);
                return socket.emit('error', { message: 'Not your turn' });
            }

            // Roll dice (1-6)
            const diceValue = Math.floor(Math.random() * 6) + 1;
            room.gameState.diceValue = diceValue;

            console.log(`Player ${playerIndex} (${room.players[playerIndex].username}) rolled a ${diceValue} in room ${roomId}`);

            // Emit dice roll result to all players
            io.to(roomId).emit('diceRolled', {
                roomId,
                playerIndex,
                diceValue,
                player: room.players[playerIndex].username
            });

            // Update player position if they've started or rolled a 6
            const playerState = room.gameState.players[playerIndex];

            if (playerState.hasStarted || diceValue === 6) {
                // If player hasn't started yet and rolled a 6, mark as started
                if (!playerState.hasStarted && diceValue === 6) {
                    playerState.hasStarted = true;
                    playerState.position = 1;
                    console.log(`Player ${playerIndex} started with a 6`);
                } else if (playerState.hasStarted) {
                    // Calculate new position
                    const newPosition = Math.min(playerState.position + diceValue, 100);
                    playerState.position = newPosition;
                    console.log(`Player ${playerIndex} moved from ${playerState.position} to ${newPosition}`);

                    // Check for snakes and ladders (to be implemented by client)
                    // For simplicity, we'll just update the position here

                    // Check for win condition
                    if (newPosition === 100) {
                        room.gameState.winner = playerIndex;
                        console.log(`Player ${playerIndex} won by reaching position 100!`);

                        // Emit game over event
                        io.to(roomId).emit('gameOver', {
                            roomId,
                            winner: room.players[playerIndex].username,
                            gameState: room.gameState
                        });
                    }
                }

                // Emit player moved event
                io.to(roomId).emit('playerMoved', {
                    roomId,
                    playerIndex,
                    position: playerState.position,
                    hasStarted: playerState.hasStarted,
                    gameState: room.gameState
                });
            }

            // If not a 6 or game not over, switch turns
            if (diceValue !== 6 && room.gameState.winner === null) {
                room.gameState.currentPlayer = (room.gameState.currentPlayer + 1) % 2;
                console.log(`Turn changed to player ${room.gameState.currentPlayer}`);

                // Emit turn changed event
                io.to(roomId).emit('turnChanged', {
                    roomId,
                    currentPlayer: room.gameState.currentPlayer,
                    nextPlayer: room.players[room.gameState.currentPlayer].username
                });
            } else if (diceValue === 6) {
                console.log(`Player ${playerIndex} gets another turn after rolling a 6`);
            }

            // Update MongoDB if needed
            await Room.findOneAndUpdate(
                { roomId },
                { gameState: room.gameState, updatedAt: new Date() }
            );
        } catch (error) {
            console.error('Error processing dice roll:', error);
            socket.emit('error', { message: 'Error processing dice roll' });
        }
    });

    // Handle disconnections
    socket.on('disconnect', async () => {
        // Find all rooms the player is in
        for (const roomId in rooms) {
            const room = rooms[roomId];
            const playerIndex = room.players.findIndex(p => p.socketId === socket.id);

            if (playerIndex !== -1) {
                // Notify other players
                socket.to(roomId).emit('opponentDisconnected', {
                    roomId,
                    player: room.players[playerIndex].username
                });

                // Mark room as inactive
                room.isActive = false;

                // Update MongoDB if needed
                await Room.findOneAndUpdate(
                    { roomId },
                    { isActive: false, updatedAt: new Date() }
                );

                console.log(`Player ${room.players[playerIndex].username} disconnected from room ${roomId}`);
            }
        }

        console.log(`User disconnected: ${socket.id}`);
    });
});

// Helper function: Check for TicTacToe winner
function checkTicTacToeWinner(board) {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
        [0, 4, 8], [2, 4, 6]             // diagonals
    ];

    // Check for player wins
    for (const pattern of winPatterns) {
        const [a, b, c] = pattern;
        if (board[a] !== null && board[a] === board[b] && board[a] === board[c]) {
            return board[a]; // Return winning player index
        }
    }

    // Check for draw
    if (!board.includes(null)) {
        return 'draw';
    }

    // No winner yet
    return null;
}

// Routes
app.get('/', (req, res) => {
    res.send('Dice Raja Server is running');
});

// Start server
const PORT = process.env.SOCKET_PORT || 8030;
server.listen(PORT, () => {
    console.log(`Game Socket Server running on port ${PORT}`);
    console.log(`Socket URL: http://localhost:${PORT}`);
}); 