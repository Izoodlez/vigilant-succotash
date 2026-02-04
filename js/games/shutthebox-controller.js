/**
 * ShutTheBox Game Controller
 * Manages game state, turn progression, and scoring for multiplayer Shut the Box
 */

class ShutTheBoxController {
    constructor() {
        // Game config
        this.MAX_ROUNDS = 1; // Each player gets 1 turn to shut tiles
        this.tiles = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        
        // Current game state
        this.currentRound = 1;
        this.currentTurnId = null;
        this.gameOver = false;
        this.finalScores = {}; // { playerId: score }
        this.turnOrder = [];
        this.playerRoundsCompleted = {}; // { playerId: roundsCompleted }
        this.playerScores = {}; // { playerId: score }
        
        // Per-turn state
        this.shutTiles = [];
        this.diceSum = 0;
        this.selectedTiles = [];
    }

    /**
     * Initialize game with player list
     */
    initializeGame(turnOrder, players) {
        this.turnOrder = turnOrder;
        this.currentTurnId = turnOrder[0];
        
        // Initialize tracking for all players
        turnOrder.forEach(playerId => {
            this.playerRoundsCompleted[playerId] = 0;
            this.playerScores[playerId] = 0;
        });
        
        return {
            gameOver: false,
            currentTurn: this.currentTurnId,
            turnOrder: this.turnOrder,
            round: this.currentRound,
            playerScores: this.playerScores
        };
    }

    /**
     * Called when a player ends their turn
     * Returns: { canAdvance: bool, shouldEndGame: bool, winner: playerId or null }
     */
    processTurnEnd(playerId, finalScore) {
        if (playerId !== this.currentTurnId) {
            return { canAdvance: false, error: 'Not your turn' };
        }

        // Record score for this player's turn
        this.playerScores[playerId] = finalScore;
        this.playerRoundsCompleted[playerId]++;

        // Check if all real players have completed their rounds
        const allPlayersCompleted = this.playerRoundsCompleted[playerId] >= this.MAX_ROUNDS;
        
        if (allPlayersCompleted) {
            // Game over - calculate final results
            this.endGame();
            return {
                canAdvance: false,
                shouldEndGame: true,
                winner: this.getWinner(),
                finalScores: this.finalScores,
                rankings: this.getRankings()
            };
        }

        return { canAdvance: true, shouldEndGame: false };
    }

    /**
     * Advance to next player in turn order
     */
    getNextTurn() {
        if (this.gameOver) return null;
        
        const currentIdx = this.turnOrder.indexOf(this.currentTurnId);
        if (currentIdx === -1) return this.turnOrder[0];
        
        const nextIdx = (currentIdx + 1) % this.turnOrder.length;
        this.currentTurnId = this.turnOrder[nextIdx];
        
        return this.currentTurnId;
    }

    /**
     * End the game and calculate winner
     */
    endGame() {
        this.gameOver = true;
        this.finalScores = { ...this.playerScores };
    }

    /**
     * Get winner (player with lowest score)
     */
    getWinner() {
        if (!this.gameOver || Object.keys(this.finalScores).length === 0) {
            return null;
        }

        let winner = null;
        let lowestScore = Infinity;

        Object.entries(this.finalScores).forEach(([playerId, score]) => {
            if (score < lowestScore) {
                lowestScore = score;
                winner = playerId;
            }
        });

        return winner;
    }

    /**
     * Get rankings sorted by score (ascending)
     */
    getRankings() {
        const rankings = Object.entries(this.finalScores)
            .map(([playerId, score]) => ({ playerId, score }))
            .sort((a, b) => a.score - b.score);
        
        return rankings.map((entry, index) => ({
            rank: index + 1,
            playerId: entry.playerId,
            score: entry.score
        }));
    }

    /**
     * Calculate current score (sum of unshut tiles)
     */
    calculateScore(shutTiles) {
        let sum = 0;
        for (let i = 1; i <= 9; i++) {
            if (!shutTiles.includes(i)) {
                sum += i;
            }
        }
        return sum;
    }

    /**
     * Get available tiles for rolling
     */
    getAvailableTiles(shutTiles) {
        return this.tiles.filter(t => !shutTiles.includes(t));
    }

    /**
     * Find a valid tile combination that sums to target
     */
    findTileCombo(availableTiles, targetSum, startIndex = 0, combo = []) {
        if (targetSum === 0) return combo;
        if (startIndex >= availableTiles.length) return null;

        for (let i = startIndex; i < availableTiles.length; i++) {
            const tile = availableTiles[i];
            if (tile > targetSum) continue;

            const result = this.findTileCombo(
                availableTiles,
                targetSum - tile,
                i + 1,
                [...combo, tile]
            );
            if (result) return result;
        }

        return null;
    }

    /**
     * Generate a bot turn automatically
     * Returns: { d1, d2, sum, selectedTiles }
     */
    generateBotMove(shutTiles) {
        const available = this.getAvailableTiles(shutTiles);
        
        if (available.length === 0) {
            return { d1: 1, d2: 1, sum: 2, selectedTiles: [] };
        }

        // Roll dice
        const d1 = Math.floor(Math.random() * 6) + 1;
        const d2 = Math.floor(Math.random() * 6) + 1;
        const sum = d1 + d2;

        // Find valid combination
        const selectedTiles = this.findTileCombo(available, sum) || [];

        return { d1, d2, sum, selectedTiles };
    }

    /**
     * Reset per-turn game state
     */
    resetTurnState() {
        this.shutTiles = [];
        this.diceSum = 0;
        this.selectedTiles = [];
    }

    /**
     * Get current game state as JSON
     */
    getGameState() {
        return {
            gameOver: this.gameOver,
            currentRound: this.currentRound,
            currentTurn: this.currentTurnId,
            turnOrder: this.turnOrder,
            playerScores: this.playerScores,
            playerRoundsCompleted: this.playerRoundsCompleted,
            finalScores: this.finalScores,
            winner: this.getWinner(),
            rankings: this.gameOver ? this.getRankings() : []
        };
    }
}
