// src/utils/ARGamePickerManager.js - Fixed version without circular dependencies
import { terminal } from 'virtual:terminal';

class ARGamePickerManager {
  constructor() {
    terminal.log('[ARGamePickerManager] Constructor called');
    
    this.gameListElement = null;
    this.startButton = null;
    this.gameSelectionPanel = null;
    this.selectedGameId = null;
    this.isInitialized = false;
    
    // Don't initialize immediately - wait for DOM
  }

  init() {
    if (this.isInitialized) {
      terminal.log('[ARGamePickerManager] Already initialized, skipping');
      return;
    }
    
    terminal.log('[ARGamePickerManager] init() called');
    
    // Find DOM elements
    this.gameListElement = document.getElementById('gameList');
    this.startButton = document.getElementById('startButton');
    this.gameSelectionPanel = document.getElementById('gameSelectionPanel');
    
    if (!this.gameListElement || !this.startButton || !this.gameSelectionPanel) {
      terminal.log('[ARGamePickerManager] Required DOM elements not found, deferring initialization');
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
    window.addEventListener('gameSelected', (event) => {
      this.handleGameSelection(event.detail);
    });
    
    terminal.log('[ARGamePickerManager] Event listeners setup complete');
  }

  populateGameList() {
    terminal.log('[ARGamePickerManager] Populating game list...');
    
    if (!this.gameListElement) {
      terminal.log('[ARGamePickerManager] Game list element not available');
      return;
    }
    
    // Get games from registry - use global reference to avoid circular import
    const games = window.gameRegistry ? window.gameRegistry.getAvailableGames() : [];
    
    terminal.log(`[ARGamePickerManager] Found ${games.length} games to display`);
    
    // Clear existing content
    this.gameListElement.innerHTML = '';
    
    games.forEach(game => {
      terminal.log(`[ARGamePickerManager] Creating element for game: ${game.name}`);
      const gameElement = this.createGameElement(game);
      this.gameListElement.appendChild(gameElement);
    });
    
    terminal.log('[ARGamePickerManager] Game list populated');
  }

  createGameElement(game) {
    const gameDiv = document.createElement('div');
    gameDiv.className = `game-option ${!game.isPlayable ? 'disabled' : ''}`;
    gameDiv.dataset.gameId = game.id;
    
    // Add click handler for playable games
    if (game.isPlayable) {
      gameDiv.addEventListener('click', () => {
        this.selectGame(game.id);
      });
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
    
    // Update visual selection
    this.updateGameSelection(gameId);
    
    // Update registry selection - use global reference
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
    // Remove previous selection
    const previouslySelected = this.gameListElement.querySelector('.game-option.selected');
    if (previouslySelected) {
      previouslySelected.classList.remove('selected');
    }
    
    // Add selection to new game
    const gameElement = this.gameListElement.querySelector(`[data-game-id="${gameId}"]`);
    if (gameElement && !gameElement.classList.contains('disabled')) {
      gameElement.classList.add('selected');
      terminal.log(`[ARGamePickerManager] Visual selection updated: ${gameId}`);
    }
  }

  handleGameSelection(selectionData) {
    terminal.log('[ARGamePickerManager] Handling game selection event:', selectionData.gameId);
    
    const { gameId, game } = selectionData;
    
    // Update start button state
    if (this.startButton) {
      if (game.isPlayable) {
        this.startButton.disabled = false;
        this.startButton.textContent = `Start AR - ${game.name}`;
        this.startButton.style.background = '#4CAF50';
      } else {
        this.startButton.disabled = true;
        this.startButton.textContent = `${game.name} - Coming Soon`;
        this.startButton.style.background = '#ff9800';
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
}

// Create singleton instance but don't initialize yet
export const arGamePickerManager = new ARGamePickerManager();

// Make available globally for debugging
window.arGamePickerManager = arGamePickerManager;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  terminal.log('[ARGamePickerManager] DOM loaded, attempting initialization');
  
  // Try to initialize, retry if needed
  const tryInit = () => {
    const success = arGamePickerManager.init();
    if (!success) {
      terminal.log('[ARGamePickerManager] Initialization failed, retrying in 100ms');
      setTimeout(tryInit, 100);
    }
  };
  
  tryInit();
});

terminal.log('[ARGamePickerManager] Module loaded and singleton created');

export default arGamePickerManager;