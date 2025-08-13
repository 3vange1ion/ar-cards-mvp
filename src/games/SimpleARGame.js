// src/games/SimpleARGame.js - Example implementation using base classes
import { terminal } from 'virtual:terminal';
import * as THREE from 'three';
import { GameEngine } from '../utils/GameEngine.js';
import { ARGameInterface } from '../utils/ARGameInterface.js';

/**
 * Simple AR Game Engine - handles basic object placement logic
 */
export class SimpleARGameEngine extends GameEngine {
  constructor() {
    super('simple-ar');
    
    this.placedObjects = [];
    this.maxObjects = 10;
    
    terminal.log('[SimpleARGameEngine] Engine created');
  }

  initializeGame(config = {}) {
    terminal.log('[SimpleARGameEngine] Initializing game with config:', config);
    
    this.maxObjects = config.maxObjects || 10;
    this.placedObjects = [];
    
    this.setState('playing');
    return true;
  }

  processAction(playerId, action, data) {
    terminal.log('[SimpleARGameEngine] Processing action:', action, 'from player:', playerId);
    
    if (!this.validateState(['playing'])) {
      terminal.log('[SimpleARGameEngine] Invalid state for action:', this.gameState);
      return false;
    }

    switch (action) {
      case 'placeObject':
        return this.handlePlaceObject(playerId, data);
      
      case 'removeObject':
        return this.handleRemoveObject(playerId, data);
        
      default:
        terminal.log('[SimpleARGameEngine] Unknown action:', action);
        return false;
    }
  }

  handlePlaceObject(playerId, data) {
    if (this.placedObjects.length >= this.maxObjects) {
      terminal.log('[SimpleARGameEngine] Maximum objects reached');
      return false;
    }

    const objectId = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const placedObject = {
      id: objectId,
      playerId,
      position: data.position || { x: 0, y: 0, z: 0 },
      type: data.type || 'cube',
      color: data.color || Math.random() * 0xffffff,
      createdAt: Date.now()
    };

    this.placedObjects.push(placedObject);
    
    this.notifyObservers('objectPlaced', { 
      object: placedObject,
      totalObjects: this.placedObjects.length
    });

    terminal.log('[SimpleARGameEngine] Object placed:', objectId, 'Total objects:', this.placedObjects.length);
    return true;
  }

  handleRemoveObject(playerId, data) {
    const objectIndex = this.placedObjects.findIndex(obj => obj.id === data.objectId);
    if (objectIndex === -1) {
      terminal.log('[SimpleARGameEngine] Object not found:', data.objectId);
      return false;
    }

    const removedObject = this.placedObjects.splice(objectIndex, 1)[0];
    
    this.notifyObservers('objectRemoved', {
      object: removedObject,
      totalObjects: this.placedObjects.length
    });

    terminal.log('[SimpleARGameEngine] Object removed:', data.objectId, 'Remaining:', this.placedObjects.length);
    return true;
  }

  checkGameEnd() {
    // Simple game doesn't end
    return null;
  }

  getValidActions(playerId) {
    if (!this.validateState(['playing'])) {
      return [];
    }

    const actions = ['placeObject'];
    if (this.placedObjects.length > 0) {
      actions.push('removeObject');
    }

    return actions;
  }

  serializeState() {
    return {
      gameId: this.gameId,
      gameState: this.gameState,
      players: this.players,
      placedObjects: this.placedObjects,
      maxObjects: this.maxObjects
    };
  }

  deserializeState(serializedState) {
    this.gameState = serializedState.gameState;
    this.players = serializedState.players || [];
    this.placedObjects = serializedState.placedObjects || [];
    this.maxObjects = serializedState.maxObjects || 10;
    
    this.notifyObservers('stateRestored', { serializedState });
  }
}

/**
 * Simple AR Game Interface - handles AR visualization
 */
export class SimpleARGameInterface extends ARGameInterface {
  constructor(gameEngine) {
    super('simple-ar', gameEngine);
    
    this.reticle = null;
    this.objectMeshes = new Map();
    
    terminal.log('[SimpleARGameInterface] Interface created');
  }

  createGameObjects() {
    terminal.log('[SimpleARGameInterface] Creating game objects');
    
    // Create reticle for hit testing
    this.createReticle();
    
    // Restore any existing objects from game state
    const gameState = this.gameEngine.getGameState();
    gameState.gameData.placedObjects?.forEach(obj => {
      this.createObjectMesh(obj);
    });
    
    terminal.log('[SimpleARGameInterface] Game objects created');
  }

  createReticle() {
    const geometry = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0xffffff,
      transparent: true,
      opacity: 0.7
    });
    
    this.reticle = new THREE.Mesh(geometry, material);
    this.reticle.matrixAutoUpdate = false;
    this.reticle.visible = false;
    this.scene.add(this.reticle);
    
    terminal.log('[SimpleARGameInterface] Reticle created');
  }

  updateHitTesting(frame) {
    if (frame && this.hitTestSource && this.reticle) {
      const hitTestResults = frame.getHitTestResults(this.hitTestSource);
      
      if (hitTestResults.length > 0) {
        const hit = hitTestResults[0];
        this.reticle.visible = true;
        this.reticle.matrix.fromArray(hit.getPose(this.referenceSpace).transform.matrix);
        this.currentHitTestResults = hitTestResults;
      } else {
        this.reticle.visible = false;
        this.currentHitTestResults = [];
      }
    }
  }

  handleGameInteraction(interactionType, data) {
    terminal.log('[SimpleARGameInterface] Handling interaction:', interactionType);
    
    if (interactionType === 'select') {
      this.handleSelectInteraction(data);
    }
  }

  handleSelectInteraction(data) {
    if (!this.reticle || !this.reticle.visible) {
      terminal.log('[SimpleARGameInterface] No valid hit target for selection');
      return;
    }

    // Get position from reticle
    const position = new THREE.Vector3();
    position.setFromMatrixPosition(this.reticle.matrix);
    
    // Send place object action to game engine
    const success = this.gameEngine.processAction('local-player', 'placeObject', {
      position: { x: position.x, y: position.y, z: position.z },
      type: 'cube',
      color: Math.random() * 0xffffff
    });

    if (success) {
      terminal.log('[SimpleARGameInterface] Object placement successful');
    } else {
      terminal.log('[SimpleARGameInterface] Object placement failed');
    }
  }

  updateGameVisualization(gameEvent) {
    terminal.log('[SimpleARGameInterface] Updating visualization for event:', gameEvent.eventType);
    
    switch (gameEvent.eventType) {
      case 'objectPlaced':
        this.createObjectMesh(gameEvent.object);
        break;
        
      case 'objectRemoved':
        this.removeObjectMesh(gameEvent.object.id);
        break;
        
      case 'stateRestored':
        this.restoreAllObjects(gameEvent.serializedState.placedObjects);
        break;
    }
  }

  createObjectMesh(objectData) {
    terminal.log('[SimpleARGameInterface] Creating mesh for object:', objectData.id);
    
    // Create geometry based on object type
    let geometry;
    switch (objectData.type) {
      case 'sphere':
        geometry = new THREE.SphereGeometry(0.05, 16, 16);
        break;
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(0.05, 0.05, 0.1, 16);
        break;
      default: // cube
        geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    }
    
    const material = new THREE.MeshLambertMaterial({ 
      color: objectData.color 
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      objectData.position.x,
      objectData.position.y,
      objectData.position.z
    );
    
    // Store reference for later removal
    mesh.userData = { 
      objectId: objectData.id,
      playerId: objectData.playerId
    };
    
    this.scene.add(mesh);
    this.objectMeshes.set(objectData.id, mesh);
    
    terminal.log('[SimpleARGameInterface] Object mesh created and added to scene');
  }

  removeObjectMesh(objectId) {
    terminal.log('[SimpleARGameInterface] Removing mesh for object:', objectId);
    
    const mesh = this.objectMeshes.get(objectId);
    if (mesh) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
      this.objectMeshes.delete(objectId);
      terminal.log('[SimpleARGameInterface] Object mesh removed and disposed');
    }
  }

  restoreAllObjects(placedObjects) {
    terminal.log('[SimpleARGameInterface] Restoring all objects:', placedObjects.length);
    
    // Clear existing meshes
    this.objectMeshes.forEach((mesh, objectId) => {
      this.removeObjectMesh(objectId);
    });
    
    // Create meshes for all objects
    placedObjects.forEach(obj => {
      this.createObjectMesh(obj);
    });
  }

  onRender(time, frame) {
    // Add any custom render logic here
    // For example, animate objects or update UI elements
    
    // Simple animation: rotate all placed objects
    this.objectMeshes.forEach(mesh => {
      mesh.rotation.y += 0.01;
    });
  }

  cleanup() {
    terminal.log('[SimpleARGameInterface] Cleanup called');
    
    // Clean up object meshes
    this.objectMeshes.forEach((mesh, objectId) => {
      this.removeObjectMesh(objectId);
    });
    
    this.objectMeshes.clear();
    this.reticle = null;
    
    // Call parent cleanup
    super.cleanup();
    
    terminal.log('[SimpleARGameInterface] Cleanup complete');
  }
}

// Factory function to create a complete Simple AR game
export function createSimpleARGame() {
  const engine = new SimpleARGameEngine();
  const ar_interface = new SimpleARGameInterface(engine);
  
  // Initialize the game
  engine.addPlayer('local-player', { name: 'Local Player' });
  engine.initializeGame({ maxObjects: 15 });
  
  return { engine, ar_interface };
}