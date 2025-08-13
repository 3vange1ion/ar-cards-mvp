// src/utils/GameEngine.js - Base Game Engine Interface
import { terminal } from 'virtual:terminal';

/**
 * Abstract base class for all game engines
 * Handles pure game logic without any AR/visual dependencies
 * Should be text-based and work in a terminal environment
 */
export class GameEngine {
  constructor(gameId) {
    terminal.log(`[GameEngine:${gameId}] Constructor called`);
    
    this.gameId = gameId;
    this.gameState = 'initialized';
    this.observers = new Set();
    this.players = [];
    this.currentPlayer = null;
    this.gameData = {};
    
    terminal.log(`[GameEngine:${gameId}] Engine initialized with state:`, this.gameState);
  }

  // ==================== ABSTRACT METHODS (Must be implemented by subclasses) ====================
  
  /**
   * Initialize the game with specific settings
   * @param {Object} config - Game-specific configuration
   */
  initializeGame(config = {}) {
    throw new Error('GameEngine.initializeGame() must be implemented by subclass');
  }

  /**
   * Process a game action from a player
   * @param {string} playerId - ID of the player making the action
   * @param {string} action - The action type
   * @param {Object} data - Action-specific data
   * @returns {boolean} - Whether the action was valid and processed
   */
  processAction(playerId, action, data) {
    throw new Error('GameEngine.processAction() must be implemented by subclass');
  }

  /**
   * Check if the game has ended and return winner info
   * @returns {Object|null} - Winner information or null if game continues
   */
  checkGameEnd() {
    throw new Error('GameEngine.checkGameEnd() must be implemented by subclass');
  }

  /**
   * Get the current valid actions for a player
   * @param {string} playerId - ID of the player
   * @returns {Array} - Array of valid actions
   */
  getValidActions(playerId) {
    throw new Error('GameEngine.getValidActions() must be implemented by subclass');
  }

  /**
   * Serialize the current game state for saving/transmission
   * @returns {Object} - Serializable game state
   */
  serializeState() {
    throw new Error('GameEngine.serializeState() must be implemented by subclass');
  }

  /**
   * Restore game state from serialized data
   * @param {Object} serializedState - Previously serialized state
   */
  deserializeState(serializedState) {
    throw new Error('GameEngine.deserializeState() must be implemented by subclass');
  }

  // ==================== CONCRETE METHODS (Available to all subclasses) ====================

  /**
   * Add a player to the game
   * @param {string} playerId - Unique player identifier
   * @param {Object} playerData - Player information
   */
  addPlayer(playerId, playerData = {}) {
    terminal.log(`[GameEngine:${this.gameId}] Adding player:`, playerId);
    
    if (this.players.find(p => p.id === playerId)) {
      terminal.log(`[GameEngine:${this.gameId}] Player ${playerId} already exists`);
      return false;
    }

    const player = {
      id: playerId,
      ...playerData,
      joinedAt: Date.now()
    };

    this.players.push(player);
    this.notifyObservers('playerAdded', { playerId, player });
    
    terminal.log(`[GameEngine:${this.gameId}] Player added. Total players:`, this.players.length);
    return true;
  }

  /**
   * Remove a player from the game
   * @param {string} playerId - Player to remove
   */
  removePlayer(playerId) {
    terminal.log(`[GameEngine:${this.gameId}] Removing player:`, playerId);
    
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) {
      terminal.log(`[GameEngine:${this.gameId}] Player ${playerId} not found`);
      return false;
    }

    const player = this.players.splice(playerIndex, 1)[0];
    this.notifyObservers('playerRemoved', { playerId, player });
    
    terminal.log(`[GameEngine:${this.gameId}] Player removed. Remaining players:`, this.players.length);
    return true;
  }

  /**
   * Get current game state information
   * @returns {Object} - Current state information
   */
  getGameState() {
    return {
      gameId: this.gameId,
      state: this.gameState,
      players: this.players,
      currentPlayer: this.currentPlayer,
      gameData: this.gameData
    };
  }

  /**
   * Set the current game state
   * @param {string} newState - New state to set
   * @param {Object} additionalData - Additional state data
   */
  setState(newState, additionalData = {}) {
    const previousState = this.gameState;
    this.gameState = newState;
    
    terminal.log(`[GameEngine:${this.gameId}] State changed: ${previousState} -> ${newState}`);
    
    this.notifyObservers('stateChanged', { 
      previousState, 
      newState, 
      ...additionalData 
    });
  }

  // ==================== OBSERVER PATTERN IMPLEMENTATION ====================

  /**
   * Add an observer to receive game state updates
   * @param {Function} observer - Function to call on state changes
   */
  addObserver(observer) {
    if (typeof observer !== 'function') {
      throw new Error('Observer must be a function');
    }
    
    this.observers.add(observer);
    terminal.log(`[GameEngine:${this.gameId}] Observer added. Total observers:`, this.observers.size);
  }

  /**
   * Remove an observer
   * @param {Function} observer - Observer function to remove
   */
  removeObserver(observer) {
    this.observers.delete(observer);
    terminal.log(`[GameEngine:${this.gameId}] Observer removed. Total observers:`, this.observers.size);
  }

  /**
   * Notify all observers of a state change
   * @param {string} eventType - Type of event that occurred
   * @param {Object} data - Event data
   */
  notifyObservers(eventType, data = {}) {
    const eventData = {
      gameId: this.gameId,
      eventType,
      timestamp: Date.now(),
      gameState: this.gameState,
      ...data
    };

    terminal.log(`[GameEngine:${this.gameId}] Notifying ${this.observers.size} observers of event:`, eventType);

    this.observers.forEach(observer => {
      try {
        observer(eventData);
      } catch (error) {
        terminal.log(`[GameEngine:${this.gameId}] Observer error:`, error.message);
        console.error('Observer error:', error);
      }
    });
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Validate that the game is in a specific state
   * @param {string|Array} expectedStates - Expected state(s)
   * @returns {boolean} - Whether game is in expected state
   */
  validateState(expectedStates) {
    const states = Array.isArray(expectedStates) ? expectedStates : [expectedStates];
    return states.includes(this.gameState);
  }

  /**
   * Get a player by ID
   * @param {string} playerId - Player ID to find
   * @returns {Object|null} - Player object or null if not found
   */
  getPlayer(playerId) {
    return this.players.find(p => p.id === playerId) || null;
  }

  /**
   * Check if a player exists in the game
   * @param {string} playerId - Player ID to check
   * @returns {boolean} - Whether player exists
   */
  hasPlayer(playerId) {
    return this.players.some(p => p.id === playerId);
  }

  /**
   * Get the next player in turn order
   * @param {string} currentPlayerId - Current player ID
   * @returns {Object|null} - Next player or null if not found
   */
  getNextPlayer(currentPlayerId) {
    const currentIndex = this.players.findIndex(p => p.id === currentPlayerId);
    if (currentIndex === -1) return null;
    
    const nextIndex = (currentIndex + 1) % this.players.length;
    return this.players[nextIndex];
  }

  /**
   * Clean up the game engine
   */
  cleanup() {
    terminal.log(`[GameEngine:${this.gameId}] Cleanup called`);
    
    this.observers.clear();
    this.players = [];
    this.currentPlayer = null;
    this.gameData = {};
    this.setState('cleanup');
    
    terminal.log(`[GameEngine:${this.gameId}] Cleanup completed`);
  }
}

export default GameEngine;