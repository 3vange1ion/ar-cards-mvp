// src/main.js - Improved main application with better component loading
import { terminal } from 'virtual:terminal';
import * as THREE from 'three';

// Make THREE available globally
window.THREE = THREE;
terminal.log('[Main] THREE.js import completed, version:', THREE.REVISION);

/**
 * Main AR Application - Now with improved component loading
 */
class ARApp {
  constructor() {
    terminal.log('[ARApp] Constructor called');
    
    this.isARActive = false;
    this.currentGameInstance = null;
    this.gameRegistry = null;
    this.arGamePickerManager = null;
    
    terminal.log('[ARApp] Starting initialization...');
    this.init();
  }

  async init() {
    terminal.log('[ARApp] init() called');
    this.updateStatus("Initializing...");
    
    // Wait for Variant Launch if present
    if (typeof VariantLaunch !== 'undefined') {
      terminal.log('[ARApp] Waiting for Variant Launch...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Check WebXR support
    terminal.log('[ARApp] Checking WebXR support...');
    if (!navigator.xr) {
      terminal.log('[ARApp] WebXR not available');
      this.updateStatus("WebXR not supported");
      this.setupFallbackMode();
      return;
    }
    
    try {
      const supported = await navigator.xr.isSessionSupported('immersive-ar');
      terminal.log('[ARApp] AR session supported:', supported);
      
      if (!supported) {
        this.updateStatus("AR not supported");
        this.setupFallbackMode();
        return;
      }
    } catch (error) {
      terminal.log('[ARApp] Error checking AR support:', error.message);
      this.updateStatus("Error checking AR support");
      this.setupFallbackMode();
      return;
    }
    
    // Wait for components to be available
    await this.waitForComponents();
    
    // Set up event listeners
    this.setupEventListeners();
    
    terminal.log('[ARApp] Initialization complete');
    this.updateStatus("Ready - Select a game to begin");
  }

  setupFallbackMode() {
    terminal.log('[ARApp] Setting up fallback mode');
    // Still wait for components and set up UI even without AR support
    this.waitForComponents().then(() => {
      this.setupEventListeners();
      terminal.log('[ARApp] Fallback mode initialization complete');
    });
  }

  async waitForComponents() {
    terminal.log('[ARApp] Waiting for components to be available...');
    
    // Wait for GameRegistry to be available
    let attempts = 0;
    const maxAttempts = 100; // 10 seconds max wait
    
    while (!window.gameRegistry && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
      if (attempts % 10 === 0) {
        terminal.log(`[ARApp] Still waiting for GameRegistry (${attempts * 100}ms)`);
      }
    }
    
    if (window.gameRegistry) {
      this.gameRegistry = window.gameRegistry;
      terminal.log('[ARApp] GameRegistry available');
    } else {
      terminal.log('[ARApp] GameRegistry not available after waiting');
    }
    
    // Wait for ARGamePickerManager to be available
    attempts = 0;
    while (!window.arGamePickerManager && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
      if (attempts % 10 === 0) {
        terminal.log(`[ARApp] Still waiting for ARGamePickerManager (${attempts * 100}ms)`);
      }
    }
    
    if (window.arGamePickerManager) {
      this.arGamePickerManager = window.arGamePickerManager;
      terminal.log('[ARApp] ARGamePickerManager available');
      
      // Ensure it's initialized
      if (!this.arGamePickerManager.isInitialized) {
        terminal.log('[ARApp] ARGamePickerManager not initialized, attempting initialization');
        const success = this.arGamePickerManager.init();
        if (success) {
          // Refresh the game list
          setTimeout(() => {
            this.arGamePickerManager.refresh();
          }, 100);
        }
      }
    } else {
      terminal.log('[ARApp] ARGamePickerManager not available after waiting');
    }
  }

  setupEventListeners() {
    terminal.log('[ARApp] Setting up event listeners');
    
    // Button event listeners
    const startButton = document.getElementById('startButton');
    const endButton = document.getElementById('endButton');
    
    if (startButton) {
      startButton.addEventListener('click', () => this.startAR());
    } else {
      terminal.log('[ARApp] Start button not found');
    }
    
    if (endButton) {
      endButton.addEventListener('click', () => this.endAR());
    } else {
      terminal.log('[ARApp] End button not found');
    }
    
    // Game registry event listeners
    window.addEventListener('gameSelected', (event) => this.onGameSelected(event));
    window.addEventListener('gameInstanceCreated', (event) => this.onGameInstanceCreated(event));
    window.addEventListener('gameSessionStarted', (event) => this.onGameSessionStarted(event));
    window.addEventListener('gameSessionEnded', (event) => this.onGameSessionEnded(event));
    
    terminal.log('[ARApp] Event listeners set up');
  }

  onGameSelected(event) {
    terminal.log('[ARApp] Game selected:', event.detail.gameId);
    
    const { game } = event.detail;
    const startButton = document.getElementById('startButton');
    
    if (startButton) {
      if (game.isPlayable) {
        startButton.disabled = false;
        startButton.textContent = `Start AR - ${game.name}`;
        startButton.style.background = '#4CAF50';
        this.updateStatus(`Ready to start ${game.name}`);
      } else {
        startButton.disabled = true;
        startButton.textContent = `${game.name} - Coming Soon`;
        startButton.style.background = '#ff9800';
        this.updateStatus(`${game.name} is coming soon`);
      }
    }
  }

  onGameInstanceCreated(event) {
    terminal.log('[ARApp] Game instance created:', event.detail.gameId);
    this.currentGameInstance = event.detail.instance;
  }

  onGameSessionStarted(event) {
    terminal.log('[ARApp] Game session started:', event.detail.gameId);
    
    this.isARActive = true;
    this.updateStatus(`AR Active - ${event.detail.game.name}`);
    
    // Update UI for AR session
    const startButton = document.getElementById('startButton');
    const endButton = document.getElementById('endButton');
    
    if (startButton) startButton.style.display = 'none';
    if (endButton) endButton.style.display = 'block';
    
    document.body.classList.add('ar-active');
  }

  onGameSessionEnded(event) {
    terminal.log('[ARApp] Game session ended:', event.detail.gameId);
    
    this.isARActive = false;
    this.currentGameInstance = null;
    
    // Reset UI
    const startButton = document.getElementById('startButton');
    const endButton = document.getElementById('endButton');
    
    if (startButton) startButton.style.display = 'block';
    if (endButton) endButton.style.display = 'none';
    
    document.body.classList.remove('ar-active');
    
    // Update start button based on current selection
    const selectedGame = this.gameRegistry ? this.gameRegistry.getSelectedGame() : null;
    if (selectedGame && startButton) {
      if (selectedGame.isPlayable) {
        startButton.disabled = false;
        startButton.textContent = `Start AR - ${selectedGame.name}`;
        startButton.style.background = '#4CAF50';
        this.updateStatus(`Ready to restart ${selectedGame.name}`);
      } else {
        startButton.disabled = true;
        startButton.textContent = `${selectedGame.name} - Coming Soon`;
        startButton.style.background = '#ff9800';
      }
    } else if (startButton) {
      startButton.disabled = true;
      startButton.textContent = 'Start AR (Select a game first)';
      startButton.style.background = '#666';
      this.updateStatus("Select a game to continue");
    }
  }

  async startAR() {
    try {
      terminal.log('[ARApp] startAR() called');
      
      if (!this.gameRegistry) {
        terminal.log('[ARApp] Game registry not available');
        this.updateStatus("Game registry not available");
        return;
      }
      
      const selectedGame = this.gameRegistry.getSelectedGame();
      if (!selectedGame) {
        terminal.log('[ARApp] No game selected');
        this.updateStatus("Please select a game first");
        return;
      }

      if (!selectedGame.isPlayable) {
        terminal.log('[ARApp] Selected game is not playable:', selectedGame.id);
        this.updateStatus("Selected game is not available yet");
        return;
      }

      this.updateStatus("Creating game instance...");
      terminal.log('[ARApp] Creating game instance for:', selectedGame.id);
      
      // Create game instance through registry
      const gameInstance = await this.gameRegistry.createGameInstance();
      if (!gameInstance) {
        throw new Error('Failed to create game instance');
      }

      this.updateStatus("Starting AR session...");
      terminal.log('[ARApp] Starting AR session...');
      
      // Start AR session through registry
      const sessionStarted = await this.gameRegistry.startActiveGameSession();
      if (!sessionStarted) {
        throw new Error('Failed to start AR session');
      }

      terminal.log('[ARApp] AR session started successfully');
      
    } catch (error) {
      terminal.log('[ARApp] Failed to start AR:', error.message);
      console.error('Failed to start AR:', error);
      this.updateStatus('Failed to start AR: ' + error.message);
      
      // Reset button state
      const startButton = document.getElementById('startButton');
      if (startButton) {
        startButton.disabled = false;
      }
    }
  }

  async endAR() {
    terminal.log('[ARApp] endAR() called');
    
    try {
      if (this.gameRegistry) {
        // End session through registry
        await this.gameRegistry.endActiveGameSession();
        terminal.log('[ARApp] AR session ended through registry');
      } else {
        terminal.log('[ARApp] Game registry not available for ending session');
      }
      
    } catch (error) {
      terminal.log('[ARApp] Error ending AR session:', error.message);
      console.error('Error ending AR session:', error);
    }
  }

  updateStatus(message) {
    terminal.log('[ARApp Status]', message);
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.textContent = message;
    }
  }

  // Debug methods
  getDebugInfo() {
    return {
      isARActive: this.isARActive,
      currentGameInstance: this.currentGameInstance ? {
        gameId: this.currentGameInstance.gameId,
        hasEngine: !!this.currentGameInstance.engine,
        hasInterface: !!this.currentGameInstance.interface,
        isSessionActive: this.currentGameInstance.interface?.isActive
      } : null,
      registryDebug: this.gameRegistry ? this.gameRegistry.getDebugInfo() : null,
      pickerDebug: this.arGamePickerManager ? this.arGamePickerManager.getDebugInfo() : null,
      componentsAvailable: {
        gameRegistry: !!this.gameRegistry,
        arGamePickerManager: !!this.arGamePickerManager
      }
    };
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  terminal.log('[Main] DOM loaded, starting AR App...');
  terminal.log('[Main] THREE.js available:', !!window.THREE);
  if (window.THREE) {
    terminal.log('[Main] THREE.js version:', window.THREE.REVISION);
  }
  terminal.log('[Main] Creating ARApp instance...');
  
  window.arApp = new ARApp();
  
  // Make debug info available globally
  window.getARAppDebug = () => window.arApp.getDebugInfo();
  
  terminal.log('[Main] ARApp initialization started');
});

// Also initialize on window load as backup
window.addEventListener('load', () => {
  if (!window.arApp) {
    terminal.log('[Main] Window loaded, creating backup ARApp instance...');
    window.arApp = new ARApp();
    window.getARAppDebug = () => window.arApp.getDebugInfo();
  }
});