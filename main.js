// src/main.js - Simplified AR with proper terminal logging
import { terminal } from 'virtual:terminal';
import * as THREE from 'three';

// Make THREE available globally
window.THREE = THREE;
terminal.log('[Main] THREE.js import completed, version:', THREE.REVISION);

class SimpleARApp {
  constructor() {
    terminal.log('[SimpleARApp] Constructor called');
    
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.session = null;
    this.referenceSpace = null;
    this.hitTestSource = null;
    this.reticle = null;
    this.placedObjects = [];
    
    terminal.log('[SimpleARApp] Starting initialization...');
    this.init();
  }

  async init() {
    terminal.log('[SimpleARApp] init() called');
    this.updateStatus("Initializing...");
    
    // Wait for Variant Launch
    terminal.log('[SimpleARApp] Waiting for Variant Launch...');
    if (typeof VariantLaunch !== 'undefined') {
      terminal.log('[SimpleARApp] Variant Launch detected, waiting...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Check WebXR support
    terminal.log('[SimpleARApp] Checking WebXR support...');
    if (!navigator.xr) {
      terminal.log('[SimpleARApp] WebXR not available');
      this.updateStatus("WebXR not supported");
      return;
    }
    
    terminal.log('[SimpleARApp] navigator.xr available:', !!navigator.xr);
    
    const supported = await navigator.xr.isSessionSupported('immersive-ar');
    terminal.log('[SimpleARApp] AR session supported:', supported);
    
    if (!supported) {
      this.updateStatus("AR not supported");
      return;
    }
    
    terminal.log('[SimpleARApp] Setting up scene...');
    this.setupScene();
    
    terminal.log('[SimpleARApp] Setting up event listeners...');
    this.setupEventListeners();
    
    terminal.log('[SimpleARApp] Initialization complete');
    this.updateStatus("Ready - Tap Start AR to begin");
  }

  setupScene() {
    terminal.log('[SimpleARApp] setupScene() called');
    
    // Scene
    this.scene = new THREE.Scene();
    terminal.log('[SimpleARApp] Scene created');
    
    // Camera
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
    terminal.log('[SimpleARApp] Camera created');
    
    // Renderer - Configure for WebXR before enabling
    const canvas = document.getElementById('canvas');
    terminal.log('[SimpleARApp] Canvas element found:', !!canvas);
    
    this.renderer = new THREE.WebGLRenderer({ 
      canvas: canvas,
      antialias: true,
      alpha: true 
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    
    // Configure XR settings before enabling
    this.renderer.xr.enabled = true;
    this.renderer.xr.setReferenceSpaceType('local');
    terminal.log('[SimpleARApp] Renderer created and configured');
    
    // Create reticle (hit test indicator)
    terminal.log('[SimpleARApp] Creating reticle...');
    this.createReticle();
    
    // Create floating card
    terminal.log('[SimpleARApp] Creating floating card...');
    this.createFloatingCard();
    
    // Lighting
    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    this.scene.add(light);
    terminal.log('[SimpleARApp] Lighting added');
    
    terminal.log('[SimpleARApp] Scene setup complete, objects in scene:', this.scene.children.length);
  }

  createReticle() {
    terminal.log('[SimpleARApp] createReticle() called');
    const geometry = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.reticle = new THREE.Mesh(geometry, material);
    this.reticle.matrixAutoUpdate = false;
    this.reticle.visible = false;
    this.scene.add(this.reticle);
    terminal.log('[SimpleARApp] Reticle created and added to scene');
  }

  createFloatingCard() {
    terminal.log('[SimpleARApp] createFloatingCard() called');
    
    // Card geometry
    const cardGeometry = new THREE.PlaneGeometry(0.3, 0.4);
    const cardMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff6b6b, 
      side: THREE.DoubleSide 
    });
    const card = new THREE.Mesh(cardGeometry, cardMaterial);
    
    // Position card in front of camera
    card.position.set(0, 0, -1);
    this.scene.add(card);
    terminal.log('[SimpleARApp] Card created at position:', card.position);
    
    // Animate the card
    const animate = () => {
      card.rotation.y += 0.01;
      requestAnimationFrame(animate);
    };
    animate();
    terminal.log('[SimpleARApp] Card animation started');
  }

  setupEventListeners() {
    document.getElementById('startButton').addEventListener('click', () => this.startAR());
    document.getElementById('endButton').addEventListener('click', () => this.endAR());
  }

  async startAR() {
    try {
      terminal.log('[SimpleARApp] startAR() called');
      this.updateStatus("Starting AR session...");
      
      terminal.log('[SimpleARApp] Requesting immersive-ar session...');
      this.session = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['local'],
        optionalFeatures: ['hit-test', 'dom-overlay'],
        domOverlay: { root: document.getElementById('overlay') }
      });
      terminal.log('[SimpleARApp] Session created successfully');

      this.session.addEventListener('end', () => this.onSessionEnded());
      this.session.addEventListener('select', (event) => this.onSelect(event));
      terminal.log('[SimpleARApp] Event listeners added');

      // Get reference space first
      terminal.log('[SimpleARApp] Requesting reference space...');
      this.referenceSpace = await this.session.requestReferenceSpace('local');
      terminal.log('[SimpleARApp] Reference space created');
      
      // Make renderer XR compatible with proper reference space
      terminal.log('[SimpleARApp] Setting XR session on renderer...');
      try {
        this.renderer.xr.setReferenceSpaceType('local');
        await this.renderer.xr.setSession(this.session);
        terminal.log('[SimpleARApp] Renderer XR session set successfully');
      } catch (rendererError) {
        terminal.log('[SimpleARApp] Renderer setSession failed, trying alternative approach:', rendererError.message);
        // Alternative: Set session without reference space type
        await this.renderer.xr.setSession(this.session);
        terminal.log('[SimpleARApp] Alternative renderer setup successful');
      }
      
      // Setup hit testing
      terminal.log('[SimpleARApp] Setting up hit testing...');
      if (this.session.requestHitTestSource) {
        const viewerSpace = await this.session.requestReferenceSpace('viewer');
        this.hitTestSource = await this.session.requestHitTestSource({ space: viewerSpace });
        terminal.log('[SimpleARApp] Hit test source created');
      }
      
      // Start render loop
      terminal.log('[SimpleARApp] Starting render loop...');
      this.renderer.setAnimationLoop((time, frame) => this.render(time, frame));
      
      this.updateStatus("AR Active - Look around!");
      document.getElementById('startButton').style.display = 'none';
      document.getElementById('endButton').style.display = 'block';
      
      terminal.log('[SimpleARApp] AR session fully initialized!');
      
    } catch (error) {
      terminal.log('[SimpleARApp] Failed to start AR:', error.message);
      console.error('Failed to start AR:', error);
      this.updateStatus('Failed to start AR: ' + error.message);
    }
  }

  render(time, frame) {
    if (frame && this.hitTestSource) {
      const hitTestResults = frame.getHitTestResults(this.hitTestSource);
      
      if (hitTestResults.length > 0) {
        const hit = hitTestResults[0];
        this.reticle.visible = true;
        this.reticle.matrix.fromArray(hit.getPose(this.referenceSpace).transform.matrix);
      } else {
        this.reticle.visible = false;
      }
    }
    
    this.renderer.render(this.scene, this.camera);
    
    // Log every 60 frames to track render loop
    if (frame && frame.session.requestId % 60 === 0) {
      terminal.log('[SimpleARApp] Render loop active, frame:', frame.session.requestId);
    }
  }

  onSelect(event) {
    terminal.log('[SimpleARApp] onSelect() called, reticle visible:', this.reticle.visible);
    
    if (this.reticle.visible) {
      // Create a cube at the reticle position
      const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
      const material = new THREE.MeshBasicMaterial({ color: Math.random() * 0xffffff });
      const cube = new THREE.Mesh(geometry, material);
      
      // Copy reticle transform to cube
      cube.position.setFromMatrixPosition(this.reticle.matrix);
      cube.quaternion.setFromRotationMatrix(this.reticle.matrix);
      
      this.scene.add(cube);
      this.placedObjects.push(cube);
      
      terminal.log('[SimpleARApp] Cube placed at:', cube.position, 'Total objects:', this.placedObjects.length);
      this.updateStatus(`Placed ${this.placedObjects.length} objects`);
    }
  }

  endAR() {
    terminal.log('[SimpleARApp] endAR() called');
    if (this.session) {
      this.session.end();
    }
  }

  onSessionEnded() {
    terminal.log('[SimpleARApp] onSessionEnded() called');
    this.session = null;
    this.hitTestSource = null;
    this.renderer.setAnimationLoop(null);
    this.updateStatus("AR session ended");
    document.getElementById('startButton').style.display = 'block';
    document.getElementById('endButton').style.display = 'none';
  }

  updateStatus(message) {
    terminal.log('[SimpleARApp Status]', message);
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.textContent = message;
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  terminal.log('[Main] DOM loaded, starting Simple AR App...');
  terminal.log('[Main] THREE.js available:', !!window.THREE);
  if (window.THREE) {
    terminal.log('[Main] THREE.js version:', window.THREE.REVISION);
  }
  terminal.log('[Main] Creating SimpleARApp instance...');
  window.arApp = new SimpleARApp();
});