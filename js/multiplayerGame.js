// Multiplayer Game Utilities
// Common utilities for integrating Firebase multiplayer into games

class MultiplayerGame {
    constructor(gameName) {
        this.gameName = gameName;
        this.lobbyId = null;
        this.playerUUID = null;
        this.players = {};
        this.gameState = {};
        this.currentTurn = null;
        this.isMyTurn = false;
        this.lobbyRef = null;
        this.gameStateRef = null;
        this.callbacks = {
            onPlayersUpdate: null,
            onGameStateUpdate: null,
            onTurnChange: null,
            onGameEnd: null
        };
    }

    // Initialize multiplayer - call this when game loads
    async initialize() {
        try {
            // Get lobby ID from URL parameter
            const urlParams = new URLSearchParams(window.location.search);
            this.lobbyId = urlParams.get('lobbyId') || window.currentLobbyId;

            if (!this.lobbyId) {
                console.warn('No lobby ID found - running in single player mode');
                return false;
            }

            // Get player UUID
            this.playerUUID = sessionStorage.getItem('playerUUID') || getPlayerUUID();

            if (!this.playerUUID) {
                console.error('No player UUID found');
                return false;
            }

            console.log('Multiplayer initialized:', {
                lobby: this.lobbyId,
                player: this.playerUUID,
                game: this.gameName
            });

            // Set up Firebase listeners
            this.setupListeners();

            // Initialize game state if it doesn't exist
            await this.initializeGameState();

            return true;
        } catch (error) {
            console.error('Error initializing multiplayer:', error);
            return false;
        }
    }

    // Set up Firebase listeners for real-time updates
    setupListeners() {
        if (!db || !this.lobbyId) return;

        // Listen to lobby updates (players joining/leaving)
        this.lobbyRef = db.ref(`lobbies/${this.lobbyId}`);
        this.lobbyRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                this.players = data.players || {};
                const playerEntries = Object.entries(this.players);
                const playerIds = playerEntries.map(([playerId]) => playerId);

                // Ensure gameState has turn order and playerStates for all players (bots included)
                if (this.gameState) {
                    const needsTurnOrder = !Array.isArray(this.gameState.turnOrder) || this.gameState.turnOrder.length === 0;
                    const playerStates = this.gameState.playerStates || {};
                    let updatedPlayerStates = null;

                    playerEntries.forEach(([playerId, player]) => {
                        if (!playerStates[playerId]) {
                            if (!updatedPlayerStates) {
                                updatedPlayerStates = { ...playerStates };
                            }
                            updatedPlayerStates[playerId] = { score: 0, ready: player.isBot ? true : false };
                        }
                    });

                    if (needsTurnOrder || updatedPlayerStates) {
                        const updates = {};
                        if (needsTurnOrder) {
                            updates.turnOrder = playerIds;
                            updates.currentTurn = playerIds[0] || null;
                        }
                        if (updatedPlayerStates) {
                            updates.playerStates = updatedPlayerStates;
                        }
                        this.updateGameState(updates);
                    }
                }

                if (this.callbacks.onPlayersUpdate) {
                    this.callbacks.onPlayersUpdate(this.players);
                }
            }
        });

        // Listen to game state updates
        this.gameStateRef = db.ref(`lobbies/${this.lobbyId}/gameState`);
        this.gameStateRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                this.gameState = data;
                this.currentTurn = data.currentTurn;
                this.isMyTurn = (this.currentTurn === this.playerUUID);

                if (this.callbacks.onGameStateUpdate) {
                    this.callbacks.onGameStateUpdate(data);
                }

                if (this.callbacks.onTurnChange && this.currentTurn) {
                    this.callbacks.onTurnChange(this.currentTurn, this.isMyTurn);
                }

                // Check for game end
                if (data.status === 'finished' && this.callbacks.onGameEnd) {
                    this.callbacks.onGameEnd(data.winner, data.finalScores);
                }
            }
        });
    }

    // Initialize game state structure
    async initializeGameState() {
        if (!db || !this.lobbyId) return;

        const snapshot = await db.ref(`lobbies/${this.lobbyId}/gameState`).once('value');
        
        if (!snapshot.exists()) {
            // Create initial game state (include bots in turn order)
            const playerEntries = Object.entries(this.players);
            const playerIds = playerEntries.map(([playerId]) => playerId);
            const initialState = {
                status: 'waiting',
                currentTurn: playerIds[0] || null,
                turnOrder: playerIds,
                round: 1,
                playerStates: {},
                createdAt: Date.now()
            };

            // Initialize player states
            playerEntries.forEach(([playerId, player]) => {
                initialState.playerStates[playerId] = {
                    score: 0,
                    ready: player.isBot ? true : false
                };
            });

            await db.ref(`lobbies/${this.lobbyId}/gameState`).set(initialState);
            this.gameState = initialState;
        } else {
            this.gameState = snapshot.val();
        }
    }

    // Update game state
    async updateGameState(updates) {
        if (!db || !this.lobbyId) return false;

        try {
            await db.ref(`lobbies/${this.lobbyId}/gameState`).update(updates);
            return true;
        } catch (error) {
            console.error('Error updating game state:', error);
            return false;
        }
    }

    // Update player's state
    async updatePlayerState(stateUpdates) {
        if (!db || !this.lobbyId || !this.playerUUID) return false;

        try {
            await db.ref(`lobbies/${this.lobbyId}/gameState/playerStates/${this.playerUUID}`).update(stateUpdates);
            return true;
        } catch (error) {
            console.error('Error updating player state:', error);
            return false;
        }
    }

    // End current turn and move to next player
    async endTurn() {
        if (!this.isMyTurn) {
            console.warn('Not your turn!');
            return false;
        }

        const turnOrder = this.gameState.turnOrder || [];
        const currentIndex = turnOrder.indexOf(this.currentTurn);
        const nextIndex = (currentIndex + 1) % turnOrder.length;
        const nextPlayer = turnOrder[nextIndex];

        await this.updateGameState({
            currentTurn: nextPlayer
        });

        return true;
    }

    // Broadcast a game move/action
    async broadcastMove(moveData) {
        if (!db || !this.lobbyId) return false;

        try {
            const moveRef = db.ref(`lobbies/${this.lobbyId}/gameState/lastMove`);
            await moveRef.set({
                playerId: this.playerUUID,
                data: moveData,
                timestamp: Date.now()
            });
            return true;
        } catch (error) {
            console.error('Error broadcasting move:', error);
            return false;
        }
    }

    // Update player score
    async updateScore(score) {
        return await this.updatePlayerState({ score: score });
    }

    // Mark player as ready
    async setReady(ready = true) {
        return await this.updatePlayerState({ ready: ready });
    }

    // Check if all players are ready
    allPlayersReady() {
        const playerStates = this.gameState.playerStates || {};
        const realPlayers = Object.entries(this.players)
            .filter(([_, player]) => !player.isBot)
            .map(([playerId]) => playerId);

        if (realPlayers.length === 0) return false;

        return realPlayers.every(playerId => {
            const state = playerStates[playerId];
            return state && state.ready;
        });
    }

    // Start the game
    async startGame() {
        return await this.updateGameState({
            status: 'playing',
            startedAt: Date.now()
        });
    }

    // End the game
    async endGame(winnerId, finalScores = {}) {
        return await this.updateGameState({
            status: 'finished',
            winner: winnerId,
            finalScores: finalScores,
            endedAt: Date.now()
        });
    }

    // Get player info by UUID
    getPlayer(playerId) {
        return this.players[playerId] || null;
    }

    // Get current player (me)
    getCurrentPlayer() {
        return this.players[this.playerUUID] || null;
    }

    // Get all player IDs in turn order
    getPlayerOrder() {
        return this.gameState.turnOrder || [];
    }

    // Check if it's a specific player's turn
    isPlayerTurn(playerId) {
        return this.currentTurn === playerId;
    }

    // Register callbacks for events
    on(event, callback) {
        if (this.callbacks[event] !== undefined) {
            this.callbacks[event] = callback;
        }
    }

    // Clean up listeners when leaving game
    cleanup() {
        if (this.lobbyRef) {
            this.lobbyRef.off();
        }
        if (this.gameStateRef) {
            this.gameStateRef.off();
        }
    }

    // Display player list in UI
    renderPlayerList(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const playerOrder = this.getPlayerOrder();
        container.innerHTML = '';

        playerOrder.forEach(playerId => {
            const player = this.players[playerId];
            const playerState = this.gameState.playerStates?.[playerId] || {};
            
            if (!player) return;

            const isCurrentTurn = this.currentTurn === playerId;
            const isMe = playerId === this.playerUUID;

            const playerCard = document.createElement('div');
            playerCard.className = `player-card ${isCurrentTurn ? 'active-turn' : ''} ${isMe ? 'current-player' : ''}`;
            playerCard.innerHTML = `
                <div class="player-avatar ${player.isBot ? 'bot' : ''}">${player.isBot ? '🤖' : '👤'}</div>
                <div class="player-info">
                    <div class="player-name">${player.name}${isMe ? ' (You)' : ''}</div>
                    <div class="player-score">Score: ${playerState.score || 0}</div>
                    ${playerState.ready ? '<div class="ready-badge">✓ Ready</div>' : ''}
                </div>
                ${isCurrentTurn ? '<div class="turn-indicator">▶</div>' : ''}
            `;

            container.appendChild(playerCard);
        });
    }

    // Show turn notification
    showTurnNotification() {
        if (this.isMyTurn) {
            this.showNotification("It's your turn!", 'info');
        } else {
            const currentPlayer = this.getPlayer(this.currentTurn);
            const playerName = currentPlayer ? currentPlayer.name : 'Unknown';
            this.showNotification(`${playerName}'s turn`, 'waiting');
        }
    }

    // Helper: Show notification
    showNotification(message, type = 'info') {
        // Try to find a notification element
        let notifEl = document.getElementById('game-notification');
        
        if (!notifEl) {
            // Create notification element if it doesn't exist
            notifEl = document.createElement('div');
            notifEl.id = 'game-notification';
            notifEl.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                padding: 15px 25px;
                background: rgba(0,0,0,0.9);
                border: 2px solid #ffbd2e;
                border-radius: 8px;
                color: white;
                font-size: 1rem;
                z-index: 1000;
                animation: slideIn 0.3s ease;
            `;
            document.body.appendChild(notifEl);
        }

        notifEl.textContent = message;
        notifEl.style.display = 'block';

        // Auto-hide after 3 seconds
        setTimeout(() => {
            if (notifEl) notifEl.style.display = 'none';
        }, 3000);
    }
}

// Export for use in games
if (typeof window !== 'undefined') {
    window.MultiplayerGame = MultiplayerGame;
}
