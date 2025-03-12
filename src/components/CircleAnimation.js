import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import './CircleAnimation.css';

const CircleAnimation = ({ state = 'idle', audioData = null }) => {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const circleRef = useRef(null);
  const animationRef = useRef(null);
  const ripplesRef = useRef([]);
  const satellitesRef = useRef([]);
  const wavesRef = useRef([]);

  // Clear all animations
  const clearAnimations = useCallback(() => {
    if (!sceneRef.current) return;
    
    // Remove ripples
    if (ripplesRef.current.length > 0) {
      ripplesRef.current.forEach(ripple => {
        sceneRef.current.remove(ripple);
      });
      ripplesRef.current = [];
    }

    // Remove satellites
    if (satellitesRef.current.length > 0) {
      satellitesRef.current.forEach(satellite => {
        sceneRef.current.remove(satellite);
      });
      satellitesRef.current = [];
    }

    // Remove waves
    if (wavesRef.current.length > 0) {
      wavesRef.current.forEach(wave => {
        sceneRef.current.remove(wave);
      });
      wavesRef.current = [];
    }
  }, []);

  // Create listening animation (blue ripples)
  const createListeningAnimation = useCallback(() => {
    if (!sceneRef.current) return;
    
    const createRipple = (radius, delay) => {
      const rippleGeometry = new THREE.RingGeometry(radius, radius + 0.05, 64);
      const rippleMaterial = new THREE.MeshBasicMaterial({
        color: 0x4285F4,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
      });
      const ripple = new THREE.Mesh(rippleGeometry, rippleMaterial);
      sceneRef.current.add(ripple);
      ripplesRef.current.push(ripple);

      // Animate ripple
      let scale = 1.0;
      let opacity = 0.3;
      let time = 0;

      const animateRipple = () => {
        time += 0.01;
        if (time > delay) {
          scale += 0.01;
          opacity -= 0.005;

          ripple.scale.set(scale, scale, 1);
          rippleMaterial.opacity = opacity;

          if (opacity <= 0) {
            // Reset animation
            scale = 1.0;
            opacity = 0.3;
            time = 0;
          }
        }

        if (state === 'listening') {
          requestAnimationFrame(animateRipple);
        }
      };

      requestAnimationFrame(animateRipple);
    };

    // Create 3 ripples with different delays
    createRipple(2.1, 0);
    createRipple(2.1, 0.7);
    createRipple(2.1, 1.4);
  }, [state]);

  // Create thinking animation (orbiting satellites)
  const createThinkingAnimation = useCallback(() => {
    if (!sceneRef.current) return;
    
    const orbitRadius = 2.5;
    const totalSatellites = 3;

    // Create orbit ring
    const orbitGeometry = new THREE.RingGeometry(orbitRadius - 0.02, orbitRadius, 64);
    const orbitMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFA000,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide
    });
    const orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
    sceneRef.current.add(orbit);
    satellitesRef.current.push(orbit);

    // Create satellites
    for (let i = 0; i < totalSatellites; i++) {
      const satelliteGeometry = new THREE.CircleGeometry(0.2, 32);
      const satelliteMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFA000,
        side: THREE.DoubleSide
      });
      const satellite = new THREE.Mesh(satelliteGeometry, satelliteMaterial);
      
      // Position satellites evenly around the orbit
      const angle = (i / totalSatellites) * Math.PI * 2;
      satellite.position.x = Math.cos(angle) * orbitRadius;
      satellite.position.y = Math.sin(angle) * orbitRadius;
      
      sceneRef.current.add(satellite);
      satellitesRef.current.push(satellite);
    }

    // Animate orbit rotation
    let rotationAngle = 0;

    const animateThinking = () => {
      rotationAngle += 0.01;
      
      // Rotate orbit ring
      orbit.rotation.z = rotationAngle * 0.2;
      
      // Update satellite positions
      for (let i = 1; i < satellitesRef.current.length; i++) {
        const satellite = satellitesRef.current[i];
        const angle = ((i - 1) / (totalSatellites)) * Math.PI * 2 + rotationAngle;
        
        satellite.position.x = Math.cos(angle) * orbitRadius;
        satellite.position.y = Math.sin(angle) * orbitRadius;
      }

      if (state === 'thinking') {
        requestAnimationFrame(animateThinking);
      }
    };

    requestAnimationFrame(animateThinking);
  }, [state]);

  // Create speaking animation (waves)
  const createSpeakingAnimation = useCallback(() => {
    if (!sceneRef.current) return;
    
    const totalWaves = 3;
    const waveRadius = 2.2;
    
    // Create waves
    for (let i = 0; i < totalWaves; i++) {
      const segments = 32;
      const points = [];
      
      for (let j = 0; j <= segments; j++) {
        const angle = (j / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(
          Math.cos(angle) * waveRadius,
          Math.sin(angle) * waveRadius,
          0
        ));
      }
      
      const waveGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const waveMaterial = new THREE.LineBasicMaterial({
        color: 0xDB4437,
        transparent: true,
        opacity: 0.5 - (i * 0.1)
      });
      
      const wave = new THREE.Line(waveGeometry, waveMaterial);
      sceneRef.current.add(wave);
      wavesRef.current.push(wave);
    }
    
    // Animate waves
    let time = 0;
    
    const animateSpeaking = () => {
      time += 0.05;
      
      // Update wave points
      wavesRef.current.forEach((wave, waveIndex) => {
        const positions = wave.geometry.attributes.position;
        const segments = positions.count - 1;
        const offset = time + waveIndex * 0.7; // Different phase for each wave
        
        for (let i = 0; i <= segments; i++) {
          const angle = (i / segments) * Math.PI * 2;
          
          // Use audio data for amplitude if available
          let amplitude;
          if (audioData && audioData.length > 0) {
            // Map the angle to an index in the audio data array
            const dataIndex = Math.floor((i / segments) * (audioData.length - 1));
            // Scale the amplitude based on audio data (0-255 range from analyzer)
            amplitude = 0.05 + (audioData[dataIndex] / 255) * 0.2;
          } else {
            // Fallback to animated amplitude if no audio data
            amplitude = 0.1 + Math.sin(time * 2) * 0.05;
          }
          
          const radiusVariation = Math.sin(angle * 3 + offset) * amplitude;
          
          const radius = waveRadius + radiusVariation;
          positions.setXY(
            i,
            Math.cos(angle) * radius,
            Math.sin(angle) * radius
          );
        }
        
        positions.needsUpdate = true;
      });
      
      if (state === 'speaking') {
        requestAnimationFrame(animateSpeaking);
      }
    };
    
    requestAnimationFrame(animateSpeaking);
  }, [state, audioData]);

  // Create searching animation (simple purple ripples)
  const createSearchingAnimation = useCallback(() => {
    if (!sceneRef.current) return;
    
    // Create 3 ripples with different delays - similar to listening but purple
    const createRipple = (radius, delay) => {
      const rippleGeometry = new THREE.RingGeometry(radius, radius + 0.05, 64);
      const rippleMaterial = new THREE.MeshBasicMaterial({
        color: 0x8E24AA, // Purple color
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
      });
      const ripple = new THREE.Mesh(rippleGeometry, rippleMaterial);
      sceneRef.current.add(ripple);
      ripplesRef.current.push(ripple);

      // Animate ripple
      let scale = 1.0;
      let opacity = 0.3;
      let time = 0;

      const animateRipple = () => {
        time += 0.01;
        if (time > delay) {
          scale += 0.01;
          opacity -= 0.005;

          ripple.scale.set(scale, scale, 1);
          rippleMaterial.opacity = opacity;

          if (opacity <= 0) {
            // Reset animation
            scale = 1.0;
            opacity = 0.3;
            time = 0;
          }
        }

        if (state === 'searching') {
          requestAnimationFrame(animateRipple);
        }
      };

      requestAnimationFrame(animateRipple);
    };

    // Create ripples with different delays
    createRipple(1.6, 0);
    createRipple(1.6, 0.6);
    createRipple(1.6, 1.2);
    
  }, [state]);

  // Set up Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    // Store the container element reference
    const container = containerRef.current;

    // Create scene, camera, and renderer
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 5;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0xF1F1F1, 0); // Transparent background
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create main circle
    const geometry = new THREE.CircleGeometry(2, 64);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0xFFFFFF,
      side: THREE.DoubleSide
    });
    const circle = new THREE.Mesh(geometry, material);
    scene.add(circle);
    circleRef.current = circle;

    // Add border to main circle
    const borderGeometry = new THREE.RingGeometry(1.98, 2, 64);
    const borderMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xE0E0E0, // Lighter border
      side: THREE.DoubleSide
    });
    const border = new THREE.Mesh(borderGeometry, borderMaterial);
    scene.add(border);

    // Animation loop
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!container) return;
      
      const width = container.clientWidth;
      const height = container.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    // Initial resize
    handleResize();

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationRef.current);
      if (rendererRef.current && container) {
        container.removeChild(rendererRef.current.domElement);
      }
    };
  }, []);

  // Handle state changes
  useEffect(() => {
    if (!sceneRef.current || !circleRef.current) return;

    // Clear previous animations
    clearAnimations();

    // Update circle color and animations based on state
    switch (state) {
      case 'listening':
        // Blue color for listening state
        circleRef.current.material.color.set(0x4285F4);
        createListeningAnimation();
        break;
      case 'thinking':
        // Amber color for thinking state
        circleRef.current.material.color.set(0xFFA000);
        createThinkingAnimation();
        break;
      case 'speaking':
        // Red/orange color for speaking state
        circleRef.current.material.color.set(0xDB4437);
        createSpeakingAnimation();
        break;
      case 'searching':
        // Purple color for searching state
        circleRef.current.material.color.set(0x8E24AA);
        createSearchingAnimation();
        break;
      default:
        // White color for idle state
        circleRef.current.material.color.set(0xFFFFFF);
        break;
    }
  }, [state, audioData, clearAnimations, createListeningAnimation, createThinkingAnimation, createSpeakingAnimation, createSearchingAnimation]);

  return (
    <div ref={containerRef} className="circle-animation" />
  );
};

export default CircleAnimation;
