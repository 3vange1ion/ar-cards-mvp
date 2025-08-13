// src/utils/ARGameInterface.js - Base AR Game Interface Class
import { terminal } from 'virtual:terminal';
import * as THREE from 'three';

/**
 * Base AR Game Interface class - handles WebXR and THREE.js integration
 */
export class ARGameInterface {
  constructor(gameEngine, gameId) {
    terminal.log(`[ARGameInterface:${gameId}] Constructor called`);
    
    this.gameEngine = gameEngine;
    this.gameId = gameId;
    this.isActive = false;
    
    // WebXR components
    this.xrSession = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    
    // Input handling
    this.controller = null;
    this.reticle = null;
    
    // Bind the observer method to preserve 'this' context
    this.onGameStateChange = this.onGameStateChange.bind(this);
    
    // Connect to game engine
    if (this.gameEngine && this.gameEngine.addObserver) {
      this.gameEngine.addObserver(this.onGameStateChange);
      terminal.log(`[ARGameInterface:${gameId}] Observer attached to game engine`);
    } else {
      terminal.log(`[ARGameInterface:${gameId}] Warning: Game engine does not support observers`);
    }
    
    terminal.log(`[ARGameInterface:${gameId}] Interface initialized`);
  }

  /**
   * Initialize the AR interface and start WebXR session
   */
  async initialize() {
    terminal.log(`[ARGameInterface:${this.gameId}] Initializing AR interface`);
    
    try {
      // Check WebXR support
      if (!navigator.xr) {
        throw new Error('WebXR not supported');
      }

      const supported = await navigator.xr.isSessionSupported('immersive-ar');
      if (!supported) {
        throw new Error('AR not supported');
      }

      // Create THREE.js components
      this.setupRenderer();
      this.setupScene();
      this.setupCamera();

      // Request AR session
      terminal.log(`[ARGameInterface:${this.gameId}] Requesting AR session`);
      this.xrSession = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay'],
        domOverlay: { root: document.body }
      });

      // Configure session
      await this.setupXRSession();
      
      this.isActive = true;
      terminal.log(`[ARGameInterface:${this.gameId}] AR session initialized successfully`);
      
      return true;
      
    } catch (error) {
      terminal.log(`[ARGameInterface:${this.gameId}] Failed to initialize AR:`, error.message);
      console.error('AR initialization error:', error);
      return false;
    }
  }

  /**
   * Set up THREE.js renderer
   */
  setupRenderer() {
    const canvas = document.getElementById('canvas');
    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true
    });
    
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.xr.enabled = true;
    
    terminal.log(`[ARGameInterface:${this.gameId}] Renderer created`);
  }

  /**
   * Set up THREE.js scene
   */
  setupScene() {
    this.scene = new THREE.Scene();
    
    // Add basic lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);
    
    terminal.log(`[ARGameInterface:${this.gameId}] Scene created`);
  }

  /**
   * Set up THREE.js camera
   */
  setupCamera() {
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    
    terminal.log(`[ARGameInterface:${this.gameId}] Camera created`);
  }

  /**
   * Configure WebXR session
   */
  async setupXRSession() {
    terminal.log(`[ARGameInterface:${this.gameId}] Setting up XR session`);
    
    // Set up renderer for XR
    this.renderer.xr.setSession(this.xrSession);
    
    // Create reticle for hit testing
    this.createReticle();
    
    // Set up input controller
    this.setupController();
    
    // Handle session end
    this.xrSession.addEventListener('end', () => {
      terminal.log(`[ARGameInterface:${this.gameId}] XR session ended`);
      this.handleSessionEnd();
    });
    
    // Start render loop
    this.renderer.setAnimationLoop((timestamp, frame) => {
      this.onXRFrame(timestamp, frame);
    });
    
    terminal.log(`[ARGameInterface:${this.gameId}] XR session configured`);
  }

  /**
   * Create reticle for surface detection
   */
  createReticle() {
    const geometry = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    
    this.reticle = new THREE.Mesh(geometry, material);
    this.reticle.matrixAutoUpdate = false;
    this.reticle.visible = false;
    this.scene.add(this.reticle);
    
    terminal.log(`[ARGameInterface:${this.gameId}] Reticle created`);
  }

  /**
   * Set up XR input controller
   */
  setupController() {
    this.controller = this.renderer.xr.getController(0);
    this.controller.addEventListener('select', (event) => {
      this.onSelect(event);
    });
    this.scene.add(this.controller);
    
    terminal.log(`[ARGameInterface:${this.gameId}] Controller set up`);
  }

  /**
   * Handle XR frame updates
   */
  onXRFrame(timestamp, frame) {
    if (!this.xrSession) return;
    
    // Update game engine
    if (this.gameEngine && this.gameEngine.update) {
      const deltaTime = timestamp - (this.lastFrameTime || timestamp);
      this.gameEngine.update(deltaTime);
      this.lastFrameTime = timestamp;
    }
    
    // Handle hit testing for reticle
    const referenceSpace = this.renderer.xr.getReferenceSpace();
    const viewerSpace = this.renderer.xr.getSession().requestReferenceSpace('viewer');
    
    if (frame.getHitTestResults && this.hitTestSource) {
      const hitTestResults = frame.getHitTestResults(this.hitTestSource);
      
      if (hitTestResults.length > 0) {
        const hit = hitTestResults[0];
        this.reticle.visible = true;
        this.reticle.matrix.fromArray(hit.getPose(referenceSpace).transform.matrix);
      } else {
        this.reticle.visible = false;
      }
    }
  }

  /**
   * Handle controller select events (tap/click)
   */
  onSelect(event) {
    terminal.log(`[ARGameInterface:${this.gameId}] Select event triggered`);
    
    if (this.reticle.visible && this.gameEngine) {
      // Get position from reticle
      const position = new THREE.Vector3();
      position.setFromMatrixPosition(this.reticle.matrix);
      
      // Send tap input to game engine
      this.gameEngine.handleInput('tap', {
        position: {
          x: position.x,
          y: position.y,
          z: position.z
        }
      });
    }
  }

  /**
   * Handle game engine state changes
   */
  onGameStateChange(event, data) {
    terminal.log(`[ARGameInterface:${this.gameId}] Game state changed:`, event);
    
    // Call the visualization update method
    this.updateVisualization(event, data);
  }

  /**
   * Update visualization based on game events - override in subclasses
   */
  updateVisualization(event, data) {
    terminal.log(`[ARGameInterface:${this.gameId}] Updating visualization for event:`, event);
    // Override in subclasses for game-specific visualization
  }

  /**
   * End the AR session
   */
  endSession() {
    terminal.log(`[ARGameInterface:${this.gameId}] Ending AR session`);
    
    if (this.xrSession) {
      this.xrSession.end();
    } else {
      this.handleSessionEnd();
    }
  }

  /**
   * Handle session end cleanup
   */
  handleSessionEnd() {
    terminal.log(`[ARGameInterface:${this.gameId}] Handling session end`);
    
    this.isActive = false;
    this.xrSession = null;
    
    if (this.renderer) {
      this.renderer.setAnimationLoop(null);
      this.renderer.xr.setSession(null);
    }
    
    // Clean up scene objects
    if (this.reticle) {
      this.scene.remove(this.reticle);
      this.reticle = null;
    }
    
    if (this.controller) {
      this.scene.remove(this.controller);
      this.controller = null;
    }
    
    terminal.log(`[ARGameInterface:${this.gameId}] Session cleanup complete`);
  }

  /**
   * Clean up resources
   */
  cleanup() {
    terminal.log(`[ARGameInterface:${this.gameId}] Cleaning up interface`);
    
    this.endSession();
    
    // Remove observer from game engine
    if (this.gameEngine && this.gameEngine.removeObserver) {
      this.gameEngine.removeObserver(this.onGameStateChange);
    }
    
    // Clean up THREE.js resources
    if (this.scene) {
      this.scene.clear();
      this.scene = null;
    }
    
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    
    this.camera = null;
    
    terminal.log(`[ARGameInterface:${this.gameId}] Interface cleanup complete`);
  }

  /**
   * Get debug information about the interface
   */
  getDebugInfo() {
    return {
      gameId: this.gameId,
      isActive: this.isActive,
      hasSession: !!this.xrSession,
      hasRenderer: !!this.renderer,
      hasScene: !!this.scene,
      hasCamera: !!this.camera,
      hasGameEngine: !!this.gameEngine
    };
  }
}

// Make available globally for debugging
window.ARGameInterface = ARGameInterface;

export default ARGameInterface;