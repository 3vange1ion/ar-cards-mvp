// src/utils/GameRegistry.js - Updated to work with base classes
import { terminal } from 'virtual:terminal';

class GameRegistry {
  constructor() {
    terminal.log('[GameRegistry] Constructor called');
    
    this.games = new Map();
    this.selectedGameId = null;
    this.activeGame = null; // Current game instance
    
    terminal.log('[GameRegistry] Initializing game registry...');
    this.initializeGames();
  }

  initializeGames() {
    terminal.log('[GameRegistry] Registering available games...');
    
    // Register Simple AR Test Game (using new base classes)
    this.registerGame({
      id: 'simple-ar',
      name: 'Simple AR Test',
      description: 'Place and interact with 3D objects in AR space',
      isPlayable: true,
      players: '1',
      difficulty: 'Easy',
      estimatedTime: '5-10 min',
      category: 'Demo',
      // Factory function to create game instances
      createGame: async () => {
        try {
          terminal.log('[GameRegistry] Loading SimpleARGame module...');
          const { createSimpleARGame } = await import('../games/SimpleARGame.js');
          terminal.log('[GameRegistry] SimpleARGame module loaded successfully');
          return createSimpleARGame();
        } catch (error) {
          terminal.log('[GameRegistry] Failed to load SimpleARGame:', error.message);
          console.error('SimpleARGame import error:', error);
          return null;
        }
      }
    });

    // Register UNO AR (placeholder for future implementation)
    this.registerGame({
      id: 'uno-ar',
      name: 'UNO AR',
      description: 'Classic UNO card game in augmented reality',
      isPlayable: false,
      players: '2-4',
      difficulty: 'Medium',
      estimatedTime: '15-30 min',
      category: 'Card Game',
      createGame: null // Will be implemented later
    });

    // Register Poker AR (placeholder for future implementation)
    this.registerGame({
      id: 'poker-ar',
      name: 'Poker AR',
      description: 'Texas Hold\'em poker in AR environment',
      isPlayable: false,
      players: '2-8',
      difficulty: 'Hard',
      estimatedTime: '30-60 min',
      category: 'Card Game',
      createGame: null // Will be implemented later
    });

    terminal.log('[GameRegistry] Game registration complete. Available games:', this.games.size);
  }

  registerGame(gameConfig) {
    if (!gameConfig.id || !gameConfig.name) {
      throw new Error('Game registration requires id and name');
    }

    const game = {
      id: gameConfig.id,
      name: gameConfig.name,
      description: gameConfig.description || 'No description available',
      isPlayable: gameConfig.isPlayable || false,
      players: gameConfig.players || '1',
      difficulty: gameConfig.difficulty || 'Unknown',
      estimatedTime: gameConfig.estimatedTime || 'Unknown',
      category: gameConfig.category || 'General',
      createGame: gameConfig.createGame || null,
      registeredAt: Date.now()
    };

    this.games.set(gameConfig.id, game);
    terminal.log('[GameRegistry] Game registered:', gameConfig.id, '-', gameConfig.name);
    
    return true;
  }

  getAvailableGames() {
    const gamesList = Array.from(this.games.values());
    terminal.log('[GameRegistry] Returning', gamesList.length, 'available games');
    return gamesList;
  }

  getGame(gameId) {
    const game = this.games.get(gameId);
    if (game) {
      terminal.log('[GameRegistry] Game found:', gameId, '-', game.name);
    } else {
      terminal.log('[GameRegistry] Game not found:', gameId);
    }
    return game || null;
  }

  selectGame(gameId) {
    const game = this.games.get(gameId);
    if (!game) {
      terminal.log('[GameRegistry] Cannot select unknown game:', gameId);
      return false;
    }

    const previousSelection = this.selectedGameId;
    this.selectedGameId = gameId;
    
    terminal.log('[GameRegistry] Game selected:', gameId, '(was:', previousSelection, ')');
    
    // Dispatch selection event
    window.dispatchEvent(new CustomEvent('gameSelected', {
      detail: { 
        gameId,
        game,
        previousGameId: previousSelection
      }
    }));

    return true;
  }

  getSelectedGame() {
    if (!this.selectedGameId) {
      return null;
    }
    
    return this.games.get(this.selectedGameId) || null;
  }

  /**
   * Create and initialize a game instance
   * @param {string} gameId - ID of the game to create
   * @returns {Object|null} - Game instance with engine and interface, or null if failed
   */
  async createGameInstance(gameId = null) {
    const targetGameId = gameId || this.selectedGameId;
    
    if (!targetGameId) {
      terminal.log('[GameRegistry] No game selected for instance creation');
      return null;
    }

    const game = this.games.get(targetGameId);
    if (!game) {
      terminal.log('[GameRegistry] Game not found for instance creation:', targetGameId);
      return null;
    }

    if (!game.isPlayable || !game.createGame) {
      terminal.log('[GameRegistry] Game is not playable or has no factory:', targetGameId);
      return null;
    }

    try {
      terminal.log('[GameRegistry] Creating game instance for:', targetGameId);
      
      // Clean up any existing active game
      if (this.activeGame) {
        await this.cleanupActiveGame();
      }

      // Create new game instance
      const gameInstance = await game.createGame();
      
      if (!gameInstance || !gameInstance.engine || !gameInstance.interface) {
        throw new Error('Invalid game instance created - missing engine or interface');
      }

      this.activeGame = {
        gameId: targetGameId,
        game: game,
        engine: gameInstance.engine,
        interface: gameInstance.interface,
        createdAt: Date.now()
      };

      terminal.log('[GameRegistry] Game instance created successfully:', targetGameId);
      
      // Dispatch game instance created event
      window.dispatchEvent(new CustomEvent('gameInstanceCreated', {
        detail: {
          gameId: targetGameId,
          game: game,
          instance: this.activeGame
        }
      }));

      return this.activeGame;
      
    } catch (error) {
      terminal.log('[GameRegistry] Failed to create game instance:', error.message);
      console.error('Game instance creation failed:', error);
      return null;
    }
  }

  /**
   * Get the currently active game instance
   * @returns {Object|null} - Active game instance or null
   */
  getActiveGame() {
    return this.activeGame;
  }

  /**
   * Start the AR session for the active game
   * @returns {boolean} - Whether the session started successfully
   */
  async startActiveGameSession() {
    if (!this.activeGame) {
      terminal.log('[GameRegistry] No active game to start session');
      return false;
    }

    try {
      terminal.log('[GameRegistry] Starting AR session for:', this.activeGame.gameId);
      
      const success = await this.activeGame.interface.initialize();
      
      if (success) {
        terminal.log('[GameRegistry] AR session started successfully');
        
        // Dispatch session started event
        window.dispatchEvent(new CustomEvent('gameSessionStarted', {
          detail: {
            gameId: this.activeGame.gameId,
            game: this.activeGame.game
          }
        }));
        
        return true;
      } else {
        terminal.log('[GameRegistry] AR session failed to start');
        return false;
      }
      
    } catch (error) {
      terminal.log('[GameRegistry] Error starting AR session:', error.message);
      console.error('AR session start error:', error);
      return false;
    }
  }

  /**
   * End the current AR session
   */
  async endActiveGameSession() {
    if (!this.activeGame || !this.activeGame.interface) {
      terminal.log('[GameRegistry] No active game session to end');
      return;
    }

    terminal.log('[GameRegistry] Ending AR session for:', this.activeGame.gameId);
    
    try {
      this.activeGame.interface.endSession();
      
      // Dispatch session ended event
      window.dispatchEvent(new CustomEvent('gameSessionEnded', {
        detail: {
          gameId: this.activeGame.gameId,
          game: this.activeGame.game
        }
      }));
      
      terminal.log('[GameRegistry] AR session ended');
      
    } catch (error) {
      terminal.log('[GameRegistry] Error ending AR session:', error.message);
      console.error('AR session end error:', error);
    }
  }

  /**
   * Clean up the currently active game
   */
  async cleanupActiveGame() {
    if (!this.activeGame) {
      return;
    }

    terminal.log('[GameRegistry] Cleaning up active game:', this.activeGame.gameId);
    
    try {
      // End AR session if active
      if (this.activeGame.interface && this.activeGame.interface.isActive) {
        this.activeGame.interface.endSession();
      }

      // Cleanup interface
      if (this.activeGame.interface && this.activeGame.interface.cleanup) {
        this.activeGame.interface.cleanup();
      }

      // Cleanup engine
      if (this.activeGame.engine && this.activeGame.engine.cleanup) {
        this.activeGame.engine.cleanup();
      }

      const cleanedGameId = this.activeGame.gameId;
      this.activeGame = null;

      // Dispatch cleanup event
      window.dispatchEvent(new CustomEvent('gameInstanceCleaned', {
        detail: { gameId: cleanedGameId }
      }));

      terminal.log('[GameRegistry] Active game cleanup complete');
      
    } catch (error) {
      terminal.log('[GameRegistry] Error during game cleanup:', error.message);
      console.error('Game cleanup error:', error);
    }
  }

  /**
   * Check if a game is currently playable
   * @param {string} gameId - ID of the game to check
   * @returns {boolean} - Whether the game is playable
   */
  isGamePlayable(gameId) {
    const game = this.games.get(gameId);
    return game ? game.isPlayable : false;
  }

  /**
   * Get debug information about the registry
   * @returns {Object} - Debug information
   */
  getDebugInfo() {
    return {
      totalGames: this.games.size,
      selectedGameId: this.selectedGameId,
      activeGame: this.activeGame ? {
        gameId: this.activeGame.gameId,
        createdAt: this.activeGame.createdAt,
        hasEngine: !!this.activeGame.engine,
        hasInterface: !!this.activeGame.interface,
        isSessionActive: this.activeGame.interface?.isActive || false
      } : null,
      availableGames: Array.from(this.games.keys())
    };
  }
}

// Create and export singleton instance
export const gameRegistry = new GameRegistry();

// Make available globally for debugging
window.gameRegistry = gameRegistry;

terminal.log('[GameRegistry] Module loaded and singleton created');

export default gameRegistry;