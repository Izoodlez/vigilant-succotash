/**
 * DicePoker Game Controller
 * Manages game state and turn progression for multiplayer Dice Poker
 */

class DicePokerController {
    constructor() {
        // Game config
        this.MAX_ROUNDS = 1;
        
        // Current game state
        this.currentRound = 1;
        this.currentTurnId = null;
        this.gameOver = false;
        this.finalScores = {}; // { playerId: score }
        this.turnOrder = [];
        this.playerRoundsCompleted = {}; // { playerId: roundsCompleted }
        this.playerScores = {}; // { playerId: score }
        
        // Per-turn state
        this.dice = [1, 1, 1, 1, 1];
        this.held = [false, false, false, false, false];
        this.credits = {}; // { playerId: credits }
    }

    /**
     * Initialize game with player list
     */
    initializeGame(turnOrder, players, startingCredits = 1000) {
        this.turnOrder = turnOrder;
        this.currentTurnId = turnOrder[0];
        
        // Initialize tracking for all players
        turnOrder.forEach(playerId => {
            this.playerRoundsCompleted[playerId] = 0;
            this.playerScores[playerId] = 0;
            this.credits[playerId] = startingCredits;
        });
        
        return {
            gameOver: false,
            currentTurn: this.currentTurnId,
            turnOrder: this.turnOrder,
            round: this.currentRound,
            playerScores: this.playerScores,
            credits: this.credits
        };
    }

    /**
     * Called when a player ends their turn
     */
    processTurnEnd(playerId, finalScore, creditChange = 0) {
        if (playerId !== this.currentTurnId) {
            return { canAdvance: false, error: 'Not your turn' };
        }

        // Record score and credits
        this.playerScores[playerId] = finalScore;
        this.credits[playerId] = Math.max(0, this.credits[playerId] + creditChange);
        this.playerRoundsCompleted[playerId]++;

        // Check if all real players have completed their rounds
        const allPlayersCompleted = this.playerRoundsCompleted[playerId] >= this.MAX_ROUNDS;
        
        if (allPlayersCompleted) {
            // Game over
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
     * End the game
     */
    endGame() {
        this.gameOver = true;
        this.finalScores = { ...this.playerScores };
    }

    /**
     * Get winner (player with highest score)
     */
    getWinner() {
        if (!this.gameOver || Object.keys(this.finalScores).length === 0) {
            return null;
        }

        let winner = null;
        let highestScore = -Infinity;

        Object.entries(this.finalScores).forEach(([playerId, score]) => {
            if (score > highestScore) {
                highestScore = score;
                winner = playerId;
            }
        });

        return winner;
    }

    /**
     * Get rankings sorted by score (descending for poker)
     */
    getRankings() {
        const rankings = Object.entries(this.finalScores)
            .map(([playerId, score]) => ({ playerId, score }))
            .sort((a, b) => b.score - a.score);
        
        return rankings.map((entry, index) => ({
            rank: index + 1,
            playerId: entry.playerId,
            score: entry.score
        }));
    }

    /**
     * Reset per-turn state
     */
    resetTurnState() {
        this.dice = [1, 1, 1, 1, 1];
        this.held = [false, false, false, false, false];
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
            credits: this.credits,
            finalScores: this.finalScores,
            winner: this.getWinner(),
            rankings: this.gameOver ? this.getRankings() : []
        };
    }
}
