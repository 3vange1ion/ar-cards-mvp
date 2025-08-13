// src/utils/ARGamePickerManager.js - Fixed version
import { terminal } from 'virtual:terminal';

class ARGamePickerManager {
  constructor() {
    terminal.log('[ARGamePickerManager] Constructor called');
    
    this.gameListElement = null;
    this.startButton = null;
    this.gameSelectionPanel = null;
    this.selectedGameId = null;
    this.isInitialized = false;
    
    // Bind methods to preserve 'this' context
    this.handleGameSelection = this.handleGameSelection.bind(this);
    this.init = this.init.bind(this);
  }

  init() {
    if (this.isInitialized) {
      terminal.log('[ARGamePickerManager] Already initialized, skipping');
      return true;
    }
    
    terminal.log('[ARGamePickerManager] init() called');
    
    // Find DOM elements
    this.gameListElement = document.getElementById('gameList');
    this.startButton = document.getElementById('startButton');
    this.gameSelectionPanel = document.getElementById('gameSelectionPanel');
    
    if (!this.gameListElement || !this.startButton || !this.gameSelectionPanel) {
      terminal.log('[ARGamePickerManager] Required DOM elements not found, deferring initialization');
      terminal.log('[ARGamePickerManager] Elements found:', {
        gameList: !!this.gameListElement,
        startButton: !!this.startButton,
        gameSelectionPanel: !!this.gameSelectionPanel
      });
      return false;
    }
    
    terminal.log('[ARGamePickerManager] DOM elements found');
    
    this.setupEventListeners();
    this.populateGameList();
    
    this.isInitialized = true;
    terminal.log('[ARGamePickerManager] Initialization complete');
    return true;
  }

  setupEventListeners() {
    terminal.log('[ARGamePickerManager] Setting up event listeners...');
    
    // Listen for game selection events from registry
    window.addEventListener('gameSelected', this.handleGameSelection);
    
    terminal.log('[ARGamePickerManager] Event listeners setup complete');
  }

  populateGameList() {
    terminal.log('[ARGamePickerManager] Populating game list...');
    
    if (!this.gameListElement) {
      terminal.log('[ARGamePickerManager] Game list element not available');
      return;
    }
    
    // Get games from registry - wait for it to be available
    let games = [];
    if (window.gameRegistry) {
      games = window.gameRegistry.getAvailableGames();
      terminal.log(`[ARGamePickerManager] Found ${games.length} games from registry`);
    } else {
      terminal.log('[ARGamePickerManager] Game registry not available yet');
      // Retry in a moment
      setTimeout(() => {
        if (!this.isInitialized) return;
        this.populateGameList();
      }, 500);
      return;
    }
    
    // Clear existing content
    this.gameListElement.innerHTML = '';
    
    if (games.length === 0) {
      terminal.log('[ARGamePickerManager] No games available to display');
      this.gameListElement.innerHTML = '<div style="text-align: center; color: #999;">No games available</div>';
      return;
    }

    games.forEach(game => {
      terminal.log(`[ARGamePickerManager] Creating element for game: ${game.name} (playable: ${game.isPlayable})`);
      const gameElement = this.createGameElement(game);
      this.gameListElement.appendChild(gameElement);
    });
    
    terminal.log('[ARGamePickerManager] Game list populated with', games.length, 'games');
  }

  createGameElement(game) {
    const gameDiv = document.createElement('div');
    gameDiv.className = `game-option ${!game.isPlayable ? 'disabled' : ''}`;
    gameDiv.dataset.gameId = game.id;
    
    // Add click handler for playable games
    if (game.isPlayable) {
      gameDiv.addEventListener('click', () => {
        terminal.log(`[ARGamePickerManager] Game clicked: ${game.id}`);
        this.selectGame(game.id);
      });
    } else {
      terminal.log(`[ARGamePickerManager] Game ${game.id} is not playable, no click handler added`);
    }
    
    gameDiv.innerHTML = `
      <div class="game-icon ${!game.isPlayable ? 'disabled' : ''}">
        ${this.getGameIcon(game.category)}
      </div>
      <div class="game-info">
        <h3>${game.name}</h3>
        <p>${game.description}</p>
        ${!game.isPlayable ? '<p class="coming-soon">COMING SOON</p>' : ''}
      </div>
      <div class="game-meta">
        <div>${game.players} players</div>
        <div>${game.difficulty}</div>
        <div>${game.estimatedTime}</div>
      </div>
    `;
    
    return gameDiv;
  }

  getGameIcon(category) {
    const icons = {
      'Demo': '🎮',
      'Card Game': '🃏',
      'General': '🎯'
    };
    return icons[category] || '🎮';
  }

  selectGame(gameId) {
    terminal.log(`[ARGamePickerManager] Selecting game: ${gameId}`);
    
    // Update visual selection first
    this.updateGameSelection(gameId);
    
    // Update registry selection
    if (window.gameRegistry) {
      const success = window.gameRegistry.selectGame(gameId);
      if (success) {
        this.selectedGameId = gameId;
        terminal.log(`[ARGamePickerManager] Game selection successful: ${gameId}`);
      } else {
        terminal.log(`[ARGamePickerManager] Game selection failed: ${gameId}`);
      }
    } else {
      terminal.log('[ARGamePickerManager] Game registry not available');
    }
  }

  updateGameSelection(gameId) {
    if (!this.gameListElement) return;
    
    // Remove previous selection
    const previouslySelected = this.gameListElement.querySelector('.game-option.selected');
    if (previouslySelected) {
      previouslySelected.classList.remove('selected');
      terminal.log('[ARGamePickerManager] Removed previous selection');
    }
    
    // Add selection to new game
    const gameElement = this.gameListElement.querySelector(`[data-game-id="${gameId}"]`);
    if (gameElement && !gameElement.classList.contains('disabled')) {
      gameElement.classList.add('selected');
      terminal.log(`[ARGamePickerManager] Visual selection updated: ${gameId}`);
    }
  }

  handleGameSelection(event) {
    terminal.log('[ARGamePickerManager] Handling game selection event:', event.detail.gameId);
    
    const { gameId, game } = event.detail;
    
    // Update start button state
    if (this.startButton) {
      if (game.isPlayable) {
        this.startButton.disabled = false;
        this.startButton.textContent = `Start AR - ${game.name}`;
        this.startButton.style.background = '#4CAF50';
        terminal.log(`[ARGamePickerManager] Start button enabled for: ${game.name}`);
      } else {
        this.startButton.disabled = true;
        this.startButton.textContent = `${game.name} - Coming Soon`;
        this.startButton.style.background = '#ff9800';
        terminal.log(`[ARGamePickerManager] Start button disabled for: ${game.name}`);
      }
    }
    
    // Update visual selection if it wasn't triggered by us
    if (this.selectedGameId !== gameId) {
      this.updateGameSelection(gameId);
      this.selectedGameId = gameId;
    }
  }

  hideInterface() {
    terminal.log('[ARGamePickerManager] Hiding interface');
    if (this.gameSelectionPanel) {
      this.gameSelectionPanel.style.display = 'none';
    }
  }

  showInterface() {
    terminal.log('[ARGamePickerManager] Showing interface');
    if (this.gameSelectionPanel) {
      this.gameSelectionPanel.style.display = 'block';
    }
  }

  refresh() {
    terminal.log('[ARGamePickerManager] Refreshing game list');
    this.populateGameList();
  }

  getSelectedGameId() {
    return this.selectedGameId;
  }

  // Debug method
  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      selectedGameId: this.selectedGameId,
      elementsFound: {
        gameListElement: !!this.gameListElement,
        startButton: !!this.startButton,
        gameSelectionPanel: !!this.gameSelectionPanel
      },
      gameRegistryAvailable: !!window.gameRegistry
    };
  }
}

// Create singleton instance
export const arGamePickerManager = new ARGamePickerManager();

// Make available globally for debugging
window.arGamePickerManager = arGamePickerManager;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  terminal.log('[ARGamePickerManager] DOM loaded, attempting initialization');
  
  // Try to initialize with retries
  const tryInit = () => {
    const success = arGamePickerManager.init();
    if (!success) {
      terminal.log('[ARGamePickerManager] Initialization failed, retrying in 250ms');
      setTimeout(tryInit, 250);
    } else {
      terminal.log('[ARGamePickerManager] Initialization successful');
      // Populate games after a short delay to ensure registry is ready
      setTimeout(() => {
        arGamePickerManager.refresh();
      }, 100);
    }
  };
  
  // Start initialization with a small delay to ensure other modules are loaded
  setTimeout(tryInit, 100);
});

// Also try to initialize when the window loads (backup)
window.addEventListener('load', () => {
  if (!arGamePickerManager.isInitialized) {
    terminal.log('[ARGamePickerManager] Window loaded, attempting backup initialization');
    arGamePickerManager.init();
    setTimeout(() => {
      arGamePickerManager.refresh();
    }, 100);
  }
});

terminal.log('[ARGamePickerManager] Module loaded and singleton created');

export default arGamePickerManager;