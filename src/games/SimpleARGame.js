// src/games/SimpleARGame.js - Simple AR test game with proper modular structure
import { terminal } from 'virtual:terminal';
import { GameEngine } from '../utils/GameEngine.js';
import { ARGameInterface } from '../utils/ARGameInterface.js';

/**
 * Simple AR Game Engine - extends the base GameEngine
 */
export class SimpleGameEngine extends GameEngine {
  constructor(gameId = 'simple-ar') {
    super(gameId);
    terminal.log('[SimpleARGameEngine] Engine created');
    
    // Game-specific configuration
    this.config = {
      maxObjects: 15,
      spawnRadius: 2,
      objectTypes: ['cube', 'sphere', 'cylinder']
    };
    
    // Game-specific state
    this.objects = new Map();
    this.spawnCount = 0;
  }

  /**
   * Initialize the game with specific configuration
   */
  initializeGame(config = {}) {
    this.config = { ...this.config, ...config };
    terminal.log('[SimpleARGameEngine] Initializing game with config:', this.config);
    
    // Add a local player
    this.addPlayer('local-player');
    
    // Set initial game state
    this.setState('playing');
    
    return true;
  }

  /**
   * Spawn a 3D object in AR space
   */
  spawnObject(type = 'cube', position = { x: 0, y: 0, z: -2 }) {
    if (this.objects.size >= this.config.maxObjects) {
      terminal.log('[SimpleARGameEngine] Max objects reached, cannot spawn more');
      return null;
    }

    const objectId = `object-${++this.spawnCount}`;
    const gameObject = {
      id: objectId,
      type: type,
      position: position,
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      color: this.getRandomColor(),
      createdAt: Date.now()
    };

    this.objects.set(objectId, gameObject);
    
    // Notify observers
    this.notifyObservers('objectSpawned', { object: gameObject });
    
    terminal.log('[SimpleARGameEngine] Object spawned:', objectId, type);
    return gameObject;
  }

  /**
   * Remove an object from the game
   */
  removeObject(objectId) {
    const object = this.objects.get(objectId);
    if (!object) {
      terminal.log('[SimpleARGameEngine] Object not found for removal:', objectId);
      return false;
    }

    this.objects.delete(objectId);
    this.notifyObservers('objectRemoved', { objectId, object });
    
    terminal.log('[SimpleARGameEngine] Object removed:', objectId);
    return true;
  }

  /**
   * Get all current objects
   */
  getObjects() {
    return Array.from(this.objects.values());
  }

  /**
   * Handle player input/interaction
   */
  handleInput(inputType, data = {}) {
    terminal.log('[SimpleARGameEngine] Handling input:', inputType, data);
    
    switch (inputType) {
      case 'tap':
        this.handleTap(data);
        break;
      case 'spawn':
        this.handleSpawn(data);
        break;
      case 'clear':
        this.handleClear();
        break;
      default:
        terminal.log('[SimpleARGameEngine] Unknown input type:', inputType);
    }
  }

  handleTap(data) {
    // Spawn object at tap location
    const position = data.position || { x: 0, y: 0, z: -2 };
    const type = data.type || this.getRandomObjectType();
    this.spawnObject(type, position);
  }

  handleSpawn(data) {
    const type = data.type || this.getRandomObjectType();
    const position = data.position || this.getRandomPosition();
    this.spawnObject(type, position);
  }

  handleClear() {
    const objectIds = Array.from(this.objects.keys());
    objectIds.forEach(id => this.removeObject(id));
    terminal.log('[SimpleARGameEngine] All objects cleared');
  }

  /**
   * Update game state (called each frame)
   */
  update(deltaTime) {
    // Simple rotation animation for objects
    for (const object of this.objects.values()) {
      object.rotation.y += deltaTime * 0.001;
      if (object.rotation.y > Math.PI * 2) {
        object.rotation.y -= Math.PI * 2;
      }
    }
    
    // Notify observers of updates
    this.notifyObservers('objectsUpdated', { 
      objects: this.getObjects(),
      deltaTime 
    });
  }

  // Helper methods
  getRandomColor() {
    const colors = [
      0xff4444, // Red
      0x44ff44, // Green  
      0x4444ff, // Blue
      0xffff44, // Yellow
      0xff44ff, // Magenta
      0x44ffff, // Cyan
      0xff8844, // Orange
      0x8844ff  // Purple
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  getRandomObjectType() {
    return this.config.objectTypes[
      Math.floor(Math.random() * this.config.objectTypes.length)
    ];
  }

  getRandomPosition() {
    const radius = this.config.spawnRadius;
    return {
      x: (Math.random() - 0.5) * radius,
      y: Math.random() * 2,
      z: -2 - Math.random() * radius
    };
  }

  /**
   * Clean up resources
   */
  cleanup() {
    terminal.log('[SimpleARGameEngine] Cleaning up engine');
    this.objects.clear();
    super.cleanup();
  }

  /**
   * Get debug information
   */
  getDebugInfo() {
    return {
      ...super.getDebugInfo(),
      objectCount: this.objects.size,
      maxObjects: this.config.maxObjects,
      spawnCount: this.spawnCount,
      config: this.config
    };
  }
}

/**
 * Simple AR Game Interface - extends the base ARGameInterface
 */
export class SimpleGameInterface extends ARGameInterface {
  constructor(gameEngine, gameId = 'simple-ar') {
    // Ensure gameId is a string, not an object
    const actualGameId = typeof gameId === 'string' ? gameId : 'simple-ar';
    super(gameEngine, actualGameId);
    terminal.log('[SimpleARGameInterface] Interface created');
    
    // UI elements for this specific game
    this.uiControls = null;
    this.objectMeshes = new Map(); // Track THREE.js meshes
  }

  /**
   * Initialize the AR interface with game-specific setup
   */
  async initialize() {
    terminal.log('[SimpleARGameInterface] Initializing Simple AR interface');
    
    // Call parent initialization
    const success = await super.initialize();
    if (!success) {
      return false;
    }

    // Set up game-specific scene elements
    this.setupGameScene();
    this.createUIControls();
    
    terminal.log('[SimpleARGameInterface] Simple AR interface initialized');
    return true;
  }

  setupGameScene() {
    terminal.log('[SimpleARGameInterface] Setting up game scene');
    
    // Add some basic lighting for 3D objects
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 0.5);
    this.scene.add(directionalLight);
  }

  createUIControls() {
    terminal.log('[SimpleARGameInterface] Creating UI controls');
    
    // Create overlay UI for game controls
    this.uiControls = document.createElement('div');
    this.uiControls.id = 'simple-ar-controls';
    this.uiControls.style.cssText = `
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 10px;
      z-index: 150;
      pointer-events: auto;
    `;

    // Spawn buttons
    const spawnCubeBtn = this.createButton('Spawn Cube', () => {
      this.gameEngine.handleInput('spawn', { type: 'cube' });
    });

    const spawnSphereBtn = this.createButton('Spawn Sphere', () => {
      this.gameEngine.handleInput('spawn', { type: 'sphere' });
    });

    const clearBtn = this.createButton('Clear All', () => {
      this.gameEngine.handleInput('clear');
    }, '#f44336');

    this.uiControls.appendChild(spawnCubeBtn);
    this.uiControls.appendChild(spawnSphereBtn);
    this.uiControls.appendChild(clearBtn);

    // Add to overlay
    const overlay = document.getElementById('overlay');
    if (overlay) {
      overlay.appendChild(this.uiControls);
    }
  }

  createButton(text, onClick, color = '#4CAF50') {
    const button = document.createElement('button');
    button.textContent = text;
    button.style.cssText = `
      padding: 10px 15px;
      background: ${color};
      color: white;
      border: none;
      border-radius: 5px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
    `;
    button.addEventListener('click', onClick);
    return button;
  }

  /**
   * Handle game engine events
   */
  updateVisualization(event, data) {
    terminal.log('[SimpleARGameInterface] Updating visualization for event:', event);
    
    switch (event) {
      case 'objectSpawned':
        this.addObjectMesh(data.object);
        break;
      case 'objectRemoved':
        this.removeObjectMesh(data.objectId);
        break;
      case 'objectsUpdated':
        this.updateObjectMeshes(data.objects);
        break;
      case 'stateChanged':
        this.handleStateChange(data);
        break;
      default:
        super.updateVisualization(event, data);
    }
  }

  addObjectMesh(gameObject) {
    let geometry;
    
    switch (gameObject.type) {
      case 'cube':
        geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        break;
      case 'sphere':
        geometry = new THREE.SphereGeometry(0.1, 16, 12);
        break;
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(0.08, 0.08, 0.2, 12);
        break;
      default:
        geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    }

    const material = new THREE.MeshLambertMaterial({ 
      color: gameObject.color,
      transparent: true,
      opacity: 0.9
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      gameObject.position.x,
      gameObject.position.y,
      gameObject.position.z
    );
    
    this.scene.add(mesh);
    this.objectMeshes.set(gameObject.id, mesh);
    
    terminal.log('[SimpleARGameInterface] Object mesh added:', gameObject.id);
  }

  removeObjectMesh(objectId) {
    const mesh = this.objectMeshes.get(objectId);
    if (mesh) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
      this.objectMeshes.delete(objectId);
      terminal.log('[SimpleARGameInterface] Object mesh removed:', objectId);
    }
  }

  updateObjectMeshes(objects) {
    objects.forEach(gameObject => {
      const mesh = this.objectMeshes.get(gameObject.id);
      if (mesh) {
        mesh.rotation.y = gameObject.rotation.y;
      }
    });
  }

  handleStateChange(data) {
    terminal.log('[SimpleARGameInterface] Game state changed:', data);
  }

  /**
   * Handle AR session end
   */
  endSession() {
    terminal.log('[SimpleARGameInterface] Ending Simple AR session');
    
    // Remove UI controls
    if (this.uiControls && this.uiControls.parentNode) {
      this.uiControls.parentNode.removeChild(this.uiControls);
      this.uiControls = null;
    }
    
    // Clean up object meshes
    for (const mesh of this.objectMeshes.values()) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    this.objectMeshes.clear();
    
    // Call parent cleanup
    super.endSession();
  }

  /**
   * Get debug information
   */
  getDebugInfo() {
    return {
      ...super.getDebugInfo(),
      objectMeshCount: this.objectMeshes.size,
      hasUIControls: !!this.uiControls
    };
  }
}

/**
 * Factory function to create a complete Simple AR game instance
 * This is what the GameRegistry will call
 */
export function createSimpleARGame() {
  terminal.log('[SimpleARGame] Creating Simple AR game instance');
  
  try {
    // Create the game engine
    const engine = new SimpleGameEngine('simple-ar');
    
    // Create the AR interface
    const gameInterface = new SimpleGameInterface(engine, 'simple-ar');
    
    // Initialize the game
    engine.initializeGame();
    
    const gameInstance = {
      engine: engine,
      interface: gameInterface
    };
    
    terminal.log('[SimpleARGame] Game instance created successfully');
    terminal.log('[SimpleARGame] Engine type:', typeof engine);
    terminal.log('[SimpleARGame] Interface type:', typeof gameInterface);
    terminal.log('[SimpleARGame] Has engine:', !!gameInstance.engine);
    terminal.log('[SimpleARGame] Has interface:', !!gameInstance.interface);
    
    return gameInstance;
    
  } catch (error) {
    terminal.log('[SimpleARGame] Error creating game instance:', error.message);
    console.error('SimpleARGame creation error:', error);
    return null;
  }
}

// Default export for convenience
export default {
  SimpleGameEngine,
  SimpleGameInterface,
  createSimpleARGame
};