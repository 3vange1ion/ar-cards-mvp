// src/utils/GameEngine.js - Base Game Engine Class
import { terminal } from 'virtual:terminal';

/**
 * Base Game Engine class - provides core game functionality
 */
export class GameEngine {
  constructor(gameId) {
    terminal.log(`[GameEngine:${gameId}] Constructor called`);
    
    this.gameId = gameId;
    this.state = 'initialized';
    this.players = new Map();
    this.observers = [];
    this.lastUpdateTime = 0;
    this.isRunning = false;
    
    terminal.log(`[GameEngine:${gameId}] Engine initialized with state:`, this.state);
  }

  /**
   * Add an observer to listen for game events
   * @param {Function} observer - Function to call when events occur
   */
  addObserver(observer) {
    if (typeof observer !== 'function') {
      terminal.log(`[GameEngine:${this.gameId}] Invalid observer - must be a function`);
      return false;
    }
    
    this.observers.push(observer);
    terminal.log(`[GameEngine:${this.gameId}] Observer added. Total observers:`, this.observers.length);
    return true;
  }

  /**
   * Remove an observer
   * @param {Function} observer - Observer function to remove
   */
  removeObserver(observer) {
    const index = this.observers.indexOf(observer);
    if (index > -1) {
      this.observers.splice(index, 1);
      terminal.log(`[GameEngine:${this.gameId}] Observer removed. Total observers:`, this.observers.length);
      return true;
    }
    return false;
  }

  /**
   * Notify all observers of an event
   * @param {string} event - Event type
   * @param {Object} data - Event data
   */
  notifyObservers(event, data = {}) {
    terminal.log(`[GameEngine:${this.gameId}] Notifying ${this.observers.length} observers of event:`, event);
    
    this.observers.forEach(observer => {
      try {
        observer(event, { ...data, gameId: this.gameId });
      } catch (error) {
        terminal.log(`[GameEngine:${this.gameId}] Observer error:`, error.message);
        console.error('Observer error:', error);
      }
    });
  }

  /**
   * Add a player to the game
   * @param {string} playerId - Unique player identifier
   * @param {Object} playerData - Player data
   */
  addPlayer(playerId, playerData = {}) {
    const player = {
      id: playerId,
      joinedAt: Date.now(),
      ...playerData
    };
    
    this.players.set(playerId, player);
    terminal.log(`[GameEngine:${this.gameId}] Player added. Total players:`, this.players.size);
    
    this.notifyObservers('playerAdded', { playerId, player });
    return player;
  }

  /**
   * Remove a player from the game
   * @param {string} playerId - Player identifier
   */
  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (!player) {
      terminal.log(`[GameEngine:${this.gameId}] Player not found for removal:`, playerId);
      return false;
    }
    
    this.players.delete(playerId);
    terminal.log(`[GameEngine:${this.gameId}] Player removed. Total players:`, this.players.size);
    
    this.notifyObservers('playerRemoved', { playerId, player });
    return true;
  }

  /**
   * Get a player by ID
   * @param {string} playerId - Player identifier
   */
  getPlayer(playerId) {
    return this.players.get(playerId) || null;
  }

  /**
   * Get all players
   */
  getPlayers() {
    return Array.from(this.players.values());
  }

  /**
   * Set the game state
   * @param {string} newState - New state
   */
  setState(newState) {
    const oldState = this.state;
    this.state = newState;
    
    terminal.log(`[GameEngine:${this.gameId}] State changed: ${oldState} -> ${newState}`);
    this.notifyObservers('stateChanged', { oldState, newState, state: newState });
  }

  /**
   * Get the current game state
   */
  getState() {
    return this.state;
  }

  /**
   * Start the game loop
   */
  start() {
    if (this.isRunning) {
      terminal.log(`[GameEngine:${this.gameId}] Game is already running`);
      return;
    }
    
    this.isRunning = true;
    this.lastUpdateTime = performance.now();
    this.setState('running');
    
    terminal.log(`[GameEngine:${this.gameId}] Game started`);
    this.notifyObservers('gameStarted', {});
    
    // Start the update loop
    this.gameLoop();
  }

  /**
   * Stop the game
   */
  stop() {
    if (!this.isRunning) {
      terminal.log(`[GameEngine:${this.gameId}] Game is not running`);
      return;
    }
    
    this.isRunning = false;
    this.setState('stopped');
    
    terminal.log(`[GameEngine:${this.gameId}] Game stopped`);
    this.notifyObservers('gameStopped', {});
  }

  /**
   * Game loop - calls update at regular intervals
   */
  gameLoop() {
    if (!this.isRunning) return;
    
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastUpdateTime;
    this.lastUpdateTime = currentTime;
    
    // Call the update method
    this.update(deltaTime);
    
    // Schedule next frame
    requestAnimationFrame(() => this.gameLoop());
  }

  /**
   * Update game state - override in subclasses
   * @param {number} deltaTime - Time since last update in milliseconds
   */
  update(deltaTime) {
    // Default implementation - override in subclasses
  }

  /**
   * Handle input - override in subclasses
   * @param {string} inputType - Type of input
   * @param {Object} data - Input data
   */
  handleInput(inputType, data = {}) {
    terminal.log(`[GameEngine:${this.gameId}] Input received:`, inputType, data);
    // Override in subclasses
  }

  /**
   * Clean up resources
   */
  cleanup() {
    terminal.log(`[GameEngine:${this.gameId}] Cleaning up engine`);
    
    this.stop();
    this.observers = [];
    this.players.clear();
    
    this.notifyObservers('cleanup', {});
  }

  /**
   * Get debug information about the engine
   */
  getDebugInfo() {
    return {
      gameId: this.gameId,
      state: this.state,
      isRunning: this.isRunning,
      playerCount: this.players.size,
      observerCount: this.observers.length,
      players: Array.from(this.players.keys())
    };
  }
}

// Make available globally for debugging
window.GameEngine = GameEngine;

export default GameEngine;