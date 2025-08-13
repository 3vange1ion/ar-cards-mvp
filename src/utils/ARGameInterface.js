// src/utils/ARGameInterface.js - Base AR Game Interface
import { terminal } from 'virtual:terminal';
import * as THREE from 'three';

/**
 * Abstract base class for all AR game interfaces
 * Handles WebXR session management and provides template for game-specific implementations
 */
export class ARGameInterface {
  constructor(gameId, gameEngine = null) {
    terminal.log(`[ARGameInterface:${gameId}] Constructor called`);
    
    this.gameId = gameId;
    this.gameEngine = gameEngine;
    
    // WebXR session management
    this.session = null;
    this.referenceSpace = null;
    this.hitTestSource = null;
    
    // THREE.js scene management
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    
    // Interface state
    this.isActive = false;
    this.exitButton = null;
    
    // Input management
    this.controller1 = null;
    this.controller2 = null;
    
    terminal.log(`[ARGameInterface:${gameId}] Interface initialized`);
    
    // Set up observer for game engine if provided
    if (this.gameEngine) {
      this.gameEngine.addObserver(this.onGameStateChange.bind(this));
      terminal.log(`[ARGameInterface:${gameId}] Observer attached to game engine`);
    }
  }

  // ==================== ABSTRACT METHODS (Must be implemented by subclasses) ====================

  /**
   * Create game-specific 3D objects and add them to the scene
   */
  createGameObjects() {
    throw new Error('ARGameInterface.createGameObjects() must be implemented by subclass');
  }

  /**
   * Handle game-specific user interactions
   * @param {string} interactionType - Type of interaction (tap, drag, select, etc.)
   * @param {Object} data - Interaction data (position, target, etc.)
   */
  handleGameInteraction(interactionType, data) {
    throw new Error('ARGameInterface.handleGameInteraction() must be implemented by subclass');
  }

  /**
   * Update game-specific visualizations based on state changes
   * @param {Object} gameEvent - Game state change event data
   */
  updateGameVisualization(gameEvent) {
    throw new Error('ARGameInterface.updateGameVisualization() must be implemented by subclass');
  }

  // ==================== CONCRETE METHODS (Session Management) ====================

  /**
   * Initialize the AR session and scene
   * @param {Object} sessionConfig - WebXR session configuration
   */
  async initialize(sessionConfig = {}) {
    try {
      terminal.log(`[ARGameInterface:${this.gameId}] Initialize called`);
      
      // Check WebXR support
      if (!navigator.xr) {
        throw new Error('WebXR not supported');
      }
      
      const isSupported = await navigator.xr.isSessionSupported('immersive-ar');
      if (!isSupported) {
        throw new Error('AR not supported on this device');
      }
      
      terminal.log(`[ARGameInterface:${this.gameId}] Starting AR session...`);
      
      // Create WebXR session
      const defaultConfig = {
        requiredFeatures: ['local'],
        optionalFeatures: ['hit-test', 'dom-overlay'],
        domOverlay: { root: document.getElementById('overlay') }
      };
      
      const config = { ...defaultConfig, ...sessionConfig };
      this.session = await navigator.xr.requestSession('immersive-ar', config);
      
      terminal.log(`[ARGameInterface:${this.gameId}] AR session created`);
      
      // Set up session event listeners
      this.session.addEventListener('end', this.onSessionEnded.bind(this));
      this.session.addEventListener('select', this.onSelect.bind(this));
      
      // Get reference space
      this.referenceSpace = await this.session.requestReferenceSpace('local');
      
      // Set up scene
      this.setupScene();
      
      // Set up hit testing
      await this.setupHitTesting();
      
      // Set up controllers
      this.setupControllers();
      
      // Create exit button
      this.createExitButton();
      
      // Create game-specific objects
      this.createGameObjects();
      
      // Configure renderer for WebXR
      this.renderer.xr.enabled = true;
      this.renderer.xr.setReferenceSpaceType('local');
      await this.renderer.xr.setSession(this.session);
      
      // Start render loop
      this.renderer.setAnimationLoop(this.render.bind(this));
      
      this.isActive = true;
      terminal.log(`[ARGameInterface:${this.gameId}] AR session fully initialized`);
      
      // Hide game picker interface
      if (window.arGamePickerManager) {
        window.arGamePickerManager.hideInterface();
      }
      
      return true;
      
    } catch (error) {
      terminal.log(`[ARGameInterface:${this.gameId}] Initialization failed:`, error.message);
      console.error('AR initialization failed:', error);
      throw error;
    }
  }

  /**
   * Set up the THREE.js scene
   */
  setupScene() {
    terminal.log(`[ARGameInterface:${this.gameId}] Setting up scene`);
    
    // Create fresh scene
    this.scene = new THREE.Scene();
    
    // Create camera
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
    
    // Get existing renderer or create new one
    const canvas = document.getElementById('canvas');
    if (!this.renderer) {
      this.renderer = new THREE.WebGLRenderer({ 
        canvas: canvas,
        antialias: true,
        alpha: true 
      });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(window.devicePixelRatio);
    }
    
    // Add basic lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);
    
    terminal.log(`[ARGameInterface:${this.gameId}] Scene setup complete`);
  }

  /**
   * Set up hit testing for AR interactions
   */
  async setupHitTesting() {
    terminal.log(`[ARGameInterface:${this.gameId}] Setting up hit testing`);
    
    if (this.session.requestHitTestSource) {
      try {
        const viewerSpace = await this.session.requestReferenceSpace('viewer');
        this.hitTestSource = await this.session.requestHitTestSource({ space: viewerSpace });
        terminal.log(`[ARGameInterface:${this.gameId}] Hit test source created`);
      } catch (error) {
        terminal.log(`[ARGameInterface:${this.gameId}] Hit testing setup failed:`, error.message);
      }
    }
  }

  /**
   * Set up WebXR controllers
   */
  setupControllers() {
    terminal.log(`[ARGameInterface:${this.gameId}] Setting up controllers`);
    
    this.controller1 = this.renderer.xr.getController(0);
    this.controller1.addEventListener('select', this.onSelect.bind(this));
    this.scene.add(this.controller1);
    
    this.controller2 = this.renderer.xr.getController(1);
    this.controller2.addEventListener('select', this.onSelect.bind(this));
    this.scene.add(this.controller2);
    
    terminal.log(`[ARGameInterface:${this.gameId}] Controllers setup complete`);
  }

  /**
   * Create the exit button UI element
   */
  createExitButton() {
    terminal.log(`[ARGameInterface:${this.gameId}] Creating exit button`);
    
    // Create exit button in 3D space
    const buttonGeometry = new THREE.PlaneGeometry(0.1, 0.1);
    const buttonMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff4444,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    
    this.exitButton = new THREE.Mesh(buttonGeometry, buttonMaterial);
    this.exitButton.position.set(0.8, 0.8, -1); // Top right relative to user
    this.exitButton.userData = { isExitButton: true };
    
    // Add X text
    const loader = new THREE.FontLoader();
    // For simplicity, we'll use a simple geometry instead of text
    const xGeometry = new THREE.RingGeometry(0.02, 0.03, 8);
    const xMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const xMesh = new THREE.Mesh(xGeometry, xMaterial);
    xMesh.position.z = 0.001;
    this.exitButton.add(xMesh);
    
    this.scene.add(this.exitButton);
    
    terminal.log(`[ARGameInterface:${this.gameId}] Exit button created`);
  }

  /**
   * Main render loop
   * @param {number} time - Current time
   * @param {XRFrame} frame - WebXR frame
   */
  render(time, frame) {
    if (!this.isActive) return;
    
    // Update hit testing
    this.updateHitTesting(frame);
    
    // Call game-specific render updates
    this.onRender(time, frame);
    
    // Render the scene
    this.renderer.render(this.scene, this.camera);
    
    // Log every 120 frames to track render loop
    if (frame && frame.session.requestId % 120 === 0) {
      terminal.log(`[ARGameInterface:${this.gameId}] Render loop active, frame:`, frame.session.requestId);
    }
  }

  /**
   * Update hit testing (can be overridden by subclasses)
   * @param {XRFrame} frame - Current WebXR frame
   */
  updateHitTesting(frame) {
    // Default implementation - subclasses can override
    if (frame && this.hitTestSource) {
      const hitTestResults = frame.getHitTestResults(this.hitTestSource);
      // Store hit test results for game-specific use
      this.currentHitTestResults = hitTestResults;
    }
  }

  /**
   * Called on each render frame (can be overridden by subclasses)
   * @param {number} time - Current time
   * @param {XRFrame} frame - WebXR frame
   */
  onRender(time, frame) {
    // Default implementation - subclasses can override for custom render logic
  }

  /**
   * Handle select events (tap/click in AR)
   * @param {XRInputSourceEvent} event - WebXR select event
   */
  onSelect(event) {
    terminal.log(`[ARGameInterface:${this.gameId}] Select event received`);
    
    // Check if exit button was tapped
    if (this.checkExitButtonTap(event)) {
      this.endSession();
      return;
    }
    
    // Handle game-specific interactions
    this.handleGameInteraction('select', {
      event,
      hitTestResults: this.currentHitTestResults,
      session: this.session,
      referenceSpace: this.referenceSpace
    });
  }

  /**
   * Check if the exit button was tapped
   * @param {XRInputSourceEvent} event - Select event
   * @returns {boolean} - Whether exit button was tapped
   */
  checkExitButtonTap(event) {
    // Simple distance-based check for exit button tap
    // In a more sophisticated implementation, you'd use raycasting
    if (!this.exitButton) return false;
    
    // For now, we'll implement a simple check
    // This would need proper raycasting in a production implementation
    const inputSource = event.inputSource;
    if (inputSource && inputSource.gamepad) {
      // Simple implementation - assumes tap on exit button if in top-right area
      // Real implementation would use raycasting
      return false; // Placeholder
    }
    
    return false;
  }

  /**
   * Handle game state changes from the game engine
   * @param {Object} gameEvent - Game state change event
   */
  onGameStateChange(gameEvent) {
    terminal.log(`[ARGameInterface:${this.gameId}] Game state changed:`, gameEvent.eventType);
    
    // Update game-specific visualizations
    this.updateGameVisualization(gameEvent);
  }

  /**
   * End the AR session
   */
  endSession() {
    terminal.log(`[ARGameInterface:${this.gameId}] Ending AR session`);
    
    if (this.session) {
      this.session.end();
    }
  }

  /**
   * Handle session end
   */
  onSessionEnded() {
    terminal.log(`[ARGameInterface:${this.gameId}] Session ended`);
    
    this.isActive = false;
    this.session = null;
    this.hitTestSource = null;
    this.renderer.setAnimationLoop(null);
    
    // Clean up scene
    if (this.scene) {
      // Dispose of geometries and materials
      this.scene.traverse((object) => {
        if (object.geometry) {
          object.geometry.dispose();
        }
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
    }
    
    // Show game picker interface
    if (window.arGamePickerManager) {
      window.arGamePickerManager.showInterface();
    }
    
    terminal.log(`[ARGameInterface:${this.gameId}] Session cleanup complete`);
  }

  /**
   * Clean up the interface
   */
  cleanup() {
    terminal.log(`[ARGameInterface:${this.gameId}] Cleanup called`);
    
    if (this.isActive) {
      this.endSession();
    }
    
    // Remove observer from game engine
    if (this.gameEngine) {
      this.gameEngine.removeObserver(this.onGameStateChange.bind(this));
    }
    
    this.gameEngine = null;
    this.scene = null;
    this.camera = null;
    
    terminal.log(`[ARGameInterface:${this.gameId}] Cleanup complete`);
  }
}

export default ARGameInterface;