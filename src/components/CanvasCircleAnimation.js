import React, { useRef, useEffect } from "react";
import "./CircleAnimation.css"; // Reuse same CSS file

const CanvasCircleAnimation = ({
  state = "idle",
  audioData = null,
  audioStream = null,
}) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const pulseTimeRef = useRef(0);
  const lastPulseTimeRef = useRef(0);

  // Track if we're actually speaking (voice is playing)
  useEffect(() => {
    if (state === "speaking") {
      // Add a small delay before considering actually speaking
      // This helps prevent the full animation from showing before voice starts
      const timer = setTimeout(() => {
        isSpeakingRef.current = true;
      }, 300);

      return () => {
        clearTimeout(timer);
        isSpeakingRef.current = false;
      };
    } else {
      isSpeakingRef.current = false;
    }
  }, [state]);

  // Main animation effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Ensure canvas is fully initialized in layout before setting dimensions
    const setupCanvas = () => {
      // Set up high-DPI canvas for sharper rendering
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      
      // Only proceed if canvas has actual dimensions
      if (rect.width === 0 || rect.height === 0) {
        // Try again in a moment
        return false;
      }
      
      // Set canvas dimensions once, maintaining aspect ratio
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      const ctx = canvas.getContext("2d");
      ctx.scale(dpr, dpr); // Scale all drawing operations by devicePixelRatio
      
      return true;
    };
    
    // Try to setup canvas, if it fails (dimensions not ready), retry after a short delay
    if (!setupCanvas()) {
      const retryTimer = setTimeout(() => {
        setupCanvas();
      }, 50);
      return () => clearTimeout(retryTimer);
    }
    
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const radius = Math.min(centerX, centerY) * 0.7; // Main circle radius

    // Clear any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    // Get circle color based on state from CSS variables
    const getStateColor = (stateName) => {
      // Get the CSS variable value
      const cssVar = getComputedStyle(document.documentElement)
        .getPropertyValue(`--state-${stateName}`)
        .trim();

      // Check if it's referencing another variable (starts with "var")
      if (cssVar.startsWith("var(--")) {
        // Extract the referenced variable name
        const referencedVar = cssVar.match(/var\(--([^)]+)\)/)[1];
        // Get the actual value from the referenced variable
        const actualValue = getComputedStyle(document.documentElement)
          .getPropertyValue(`--${referencedVar}`)
          .trim();
        return `hsl(${actualValue})`;
      }

      return `hsl(${cssVar})`;
    };

    // Set circle color based on state
    let circleColor;
    switch (state) {
      case "listening":
        circleColor = getStateColor("listening");
        break;
      case "thinking":
        circleColor = getStateColor("thinking");
        break;
      case "speaking":
        circleColor = getStateColor("speaking");
        break;
      case "searching":
        circleColor = getStateColor("searching");
        break;
      default:
        circleColor = getStateColor("idle");
    }

    // Draw main circle with anti-aliasing and shadow
    const drawMainCircle = (scale = 1) => {
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Get border color from CSS variables
      const getBorderColor = () => {
        const cssVar = getComputedStyle(document.documentElement)
          .getPropertyValue("--border")
          .trim();

        // Check if it's referencing another variable
        if (cssVar.startsWith("var(--")) {
          const referencedVar = cssVar.match(/var\(--([^)]+)\)/)[1];
          const actualValue = getComputedStyle(document.documentElement)
            .getPropertyValue(`--${referencedVar}`)
            .trim();
          return `hsl(${actualValue})`;
        }

        return `hsl(${cssVar})`;
      };

      // Get shadow values from CSS variables - use simple pre-defined values for now
      const isDarkMode = document.documentElement.classList.contains("dark");

      // Use hardcoded shadows to ensure the circle is visible
      // Top shadow (light)
      ctx.shadowColor = isDarkMode
        ? "rgba(255, 255, 255, 0.10)"
        : "rgba(255, 255, 255, 0.10)";
      ctx.shadowBlur = 52;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = -44;

      // Draw with top shadow
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * scale, 0, Math.PI * 2);
      ctx.fillStyle = circleColor;
      ctx.fill();

      // Bottom shadow (dark)
      ctx.shadowColor = isDarkMode
        ? "rgba(0, 0, 0, 0.3)"
        : "rgba(44, 55, 58, 0.30)";
      ctx.shadowBlur = 68;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 36;

      // Draw with bottom shadow
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * scale, 0, Math.PI * 2);
      ctx.fillStyle = circleColor;
      ctx.fill();

      // Reset shadow for border
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // Draw border
      ctx.strokeStyle = getBorderColor();
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    // Idle animation (more noticeable pulsing with occasional ripples)
    const animateIdle = (timestamp) => {
      const time = timestamp * 0.001;
      pulseTimeRef.current = time;

      // More noticeable scale pulsing (between 0.97 and 1.03)
      const pulseScale = 1 + 0.03 * Math.sin(time * 0.8);

      drawMainCircle(pulseScale);

      // Add occasional ripple effect (every 4 seconds)
      const timeSinceLastPulse = time - lastPulseTimeRef.current;
      if (timeSinceLastPulse > 4) {
        // Trigger a new pulse every 4 seconds
        lastPulseTimeRef.current = time;
      }

      // Draw ripples if they're active
      if (timeSinceLastPulse < 2) {
        // Ripple lasts for 2 seconds
        const rippleProgress = timeSinceLastPulse / 2; // 0 to 1 over 2 seconds
        const rippleRadius = radius * (1 + rippleProgress * 0.5); // Expand to 50% larger
        const rippleOpacity = 0.4 * (1 - rippleProgress); // Fade out as it expands

        // Get ripple color based on grey-60
        const getRippleColor = (opacity) => {
          const cssVar = getComputedStyle(document.documentElement)
            .getPropertyValue("--grey-60")
            .trim();

          // Check if it's referencing another variable
          if (cssVar.startsWith("var(--")) {
            const referencedVar = cssVar.match(/var\(--([^)]+)\)/)[1];
            const actualValue = getComputedStyle(document.documentElement)
              .getPropertyValue(`--${referencedVar}`)
              .trim();
            return `hsla(${actualValue}, ${opacity})`;
          }

          return `hsla(${cssVar}, ${opacity})`;
        };

        ctx.beginPath();
        ctx.arc(centerX, centerY, rippleRadius, 0, Math.PI * 2);
        ctx.strokeStyle = getRippleColor(rippleOpacity);
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      if (state === "idle") {
        animationRef.current = requestAnimationFrame(animateIdle);
      }
    };

    // Listening animation (blue ripples)
    const animateListening = (timestamp) => {
      drawMainCircle();

      // Create 3 ripples with different phases
      const ripples = 3;
      for (let i = 0; i < ripples; i++) {
        const timeOffset = timestamp * 0.001 + i * 0.7;
        const ripplePhase = timeOffset % 2; // 2-second cycle

        if (ripplePhase < 0.1) continue; // Small delay before ripple starts

        const rippleRadius = radius + ripplePhase * radius * 0.6;
        const alpha = Math.max(0, 0.5 - ripplePhase * 0.25);

        ctx.beginPath();
        ctx.arc(centerX, centerY, rippleRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(66, 133, 244, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      if (state === "listening") {
        animationRef.current = requestAnimationFrame(animateListening);
      }
    };

    // Smooth, wave-like thinking animation
    const animateThinking = (timestamp) => {
      const time = timestamp * 0.001;
      drawMainCircle();

      // Draw multiple smooth wavy circles
      const numWaves = 3;

      for (let waveIndex = 0; waveIndex < numWaves; waveIndex++) {
        // Different radius for each wave
        const baseRadius = radius * (1.1 + waveIndex * 0.1);
        const waveAmplitude = radius * 0.06 * (1 - waveIndex * 0.2); // Decreasing amplitude for outer waves
        const segments = 60; // Higher for smoother curves

        // Draw a complete wavy circle
        ctx.beginPath();

        for (let i = 0; i <= segments; i++) {
          const angle = (i / segments) * Math.PI * 2;

          // Create smooth wave effect with multiple frequencies
          const waveOffset =
            Math.sin(angle * 3 + time * 1.0 + waveIndex * 0.7) * 0.4 +
            Math.sin(angle * 5 + time * 1.3 + waveIndex * 0.5) * 0.3 +
            Math.sin(angle * 8 + time * 0.7 + waveIndex * 0.3) * 0.3;

          const waveRadius = baseRadius + waveAmplitude * waveOffset;
          const x = centerX + Math.cos(angle) * waveRadius;
          const y = centerY + Math.sin(angle) * waveRadius;

          // First point uses moveTo, others use lineTo
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        // Close the path
        ctx.closePath();

        // Set line style
        ctx.strokeStyle = `rgba(255, 160, 0, ${0.6 - waveIndex * 0.15})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Create rotating glow effect
      const glowTime = time * 0.7;
      const glowX = centerX + Math.cos(glowTime) * radius * 0.7;
      const glowY = centerY + Math.sin(glowTime) * radius * 0.7;

      // Subtle radial gradient
      const gradient = ctx.createRadialGradient(
        glowX,
        glowY,
        0,
        glowX,
        glowY,
        radius * 0.8
      );
      gradient.addColorStop(0, "rgba(255, 180, 50, 0.3)");
      gradient.addColorStop(0.6, "rgba(255, 160, 0, 0.05)");
      gradient.addColorStop(1, "rgba(255, 160, 0, 0)");

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.9, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      if (state === "thinking") {
        animationRef.current = requestAnimationFrame(animateThinking);
      }
    };

    // Speaking animation with dramatically more movement
    const animateSpeaking = () => {
      drawMainCircle();

      // Prepare audio data
      let audioFrequencyData;
      if (audioData && audioData.length > 0) {
        audioFrequencyData = audioData;
      } else {
        // Generate fake audio data with more dramatic variations
        audioFrequencyData = new Uint8Array(64);
        const time = Date.now() * 0.001;

        for (let i = 0; i < audioFrequencyData.length; i++) {
          const position = i / audioFrequencyData.length;
          audioFrequencyData[i] = Math.floor(
            // More dynamic wave pattern with higher amplitudes
            125 + // higher base level
              Math.sin(time * 2.5 + position * 5) * 60 + // bigger slow wave
              Math.sin(time * 4.3 + position * 10) * 40 + // bigger medium wave
              Math.sin(time * 1.2 + position * 15) * 30 + // bigger fast wave
              Math.random() * 25 // more randomness
          );

          // Ensure values stay within range
          audioFrequencyData[i] = Math.max(
            0,
            Math.min(255, audioFrequencyData[i])
          );
        }
      }

      // Create a more energetic spike-based visualization
      const numSpikes = 60; // Number of spikes around the circle
      const baseRadius = radius * 1.02; // Slightly outside the main circle

      // Draw the spikes around the circle
      ctx.beginPath();

      for (let i = 0; i < numSpikes; i++) {
        const angle = (i / numSpikes) * Math.PI * 2;

        // Map to audio data efficiently
        const dataIndex =
          Math.floor((i / numSpikes) * audioFrequencyData.length) %
          audioFrequencyData.length;

        // Get normalized amplitude (0-1)
        let amplitude;
        if (isSpeakingRef.current) {
          // Much higher amplitude during active speech
          amplitude = (audioFrequencyData[dataIndex] / 255) * 0.6; // Up to 60% of radius
        } else {
          // Still visible movement before speech starts
          const time = Date.now() * 0.001;
          amplitude = 0.1 + 0.05 * Math.sin(time * 2 + i * 0.3); // 10-15% movement
        }

        // Calculate outer point with amplitude
        const outerRadius = baseRadius + radius * amplitude;
        const x = centerX + Math.cos(angle) * outerRadius;
        const y = centerY + Math.sin(angle) * outerRadius;

        // First point connects to center, others connect to previous point
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      // Close the path
      ctx.closePath();

      // Add a vibrant gradient fill
      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        radius,
        centerX,
        centerY,
        radius * 1.6
      );
      gradient.addColorStop(0, "rgba(219, 68, 55, 0.8)"); // Red core (more opaque)
      gradient.addColorStop(0.6, "rgba(255, 100, 80, 0.4)"); // Lighter red middle
      gradient.addColorStop(1, "rgba(255, 150, 120, 0.1)"); // Faded outer edge

      // Apply the fill and stroke
      ctx.fillStyle = gradient;
      ctx.strokeStyle = "rgba(219, 68, 55, 0.5)";
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();

      // Add pulsing circles for extra movement
      const numCircles = 3;
      const time = Date.now() * 0.002; // Speed up time for more movement

      for (let i = 0; i < numCircles; i++) {
        // Create pulsing effect
        const pulseFactor = 0.8 + 0.2 * Math.sin(time * 3 + i * 2);
        const circleRadius = radius * (1.1 + i * 0.15) * pulseFactor;

        ctx.beginPath();
        ctx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(219, 68, 55, ${0.3 - i * 0.08})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      if (state === "speaking") {
        animationRef.current = requestAnimationFrame(animateSpeaking);
      }
    };

    // Simplified searching animation (subtle wavy circles)
    const animateSearching = (timestamp) => {
      const time = timestamp * 0.001;
      drawMainCircle();

      // Draw 2 gentle wavy circles
      const numWaves = 2;

      for (let waveIndex = 0; waveIndex < numWaves; waveIndex++) {
        // Different radius for each wave
        const baseRadius = radius * (1.1 + waveIndex * 0.12);
        const waveAmplitude = radius * 0.04; // Small, subtle waves
        const segments = 60; // Higher for smoother curves

        // Draw a complete wavy circle
        ctx.beginPath();

        for (let i = 0; i <= segments; i++) {
          const angle = (i / segments) * Math.PI * 2;

          // Create subtle wave effect with just one or two frequencies
          const waveOffset =
            Math.sin(angle * 4 + time * 0.7 + waveIndex * 1.2) * 0.6 +
            Math.sin(angle * 8 + time * 0.5 + waveIndex * 0.8) * 0.4;

          const waveRadius = baseRadius + waveAmplitude * waveOffset;
          const x = centerX + Math.cos(angle) * waveRadius;
          const y = centerY + Math.sin(angle) * waveRadius;

          // First point uses moveTo, others use lineTo
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        // Close the path
        ctx.closePath();

        // Set line style
        ctx.strokeStyle = `rgba(142, 36, 170, ${0.5 - waveIndex * 0.15})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Add a subtle rotating scan line
      const scanAngle = (time * 0.5) % (Math.PI * 2); // Slow rotation
      const scanRadius = radius * 1.15; // Slightly outside the wavy circles

      // Draw scan line
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(scanAngle) * scanRadius,
        centerY + Math.sin(scanAngle) * scanRadius
      );
      ctx.strokeStyle = "rgba(142, 36, 170, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Draw small dot at the end of scan line
      const dotRadius = radius * 0.03;
      const dotX = centerX + Math.cos(scanAngle) * scanRadius;
      const dotY = centerY + Math.sin(scanAngle) * scanRadius;

      ctx.beginPath();
      ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(142, 36, 170, 0.6)";
      ctx.fill();

      if (state === "searching") {
        animationRef.current = requestAnimationFrame(animateSearching);
      }
    };

    // Start animation based on state
    switch (state) {
      case "listening":
        animationRef.current = requestAnimationFrame(animateListening);
        break;
      case "thinking":
        animationRef.current = requestAnimationFrame(animateThinking);
        break;
      case "speaking":
        animationRef.current = requestAnimationFrame(animateSpeaking);
        break;
      case "searching":
        animationRef.current = requestAnimationFrame(animateSearching);
        break;
      default:
        // Animate idle state with more noticeable pulsing and occasional ripples
        animationRef.current = requestAnimationFrame(animateIdle);
    }

    // Handle window resize with debouncing
    let resizeTimer = null;
    const handleResize = () => {
      // Cancel any pending resize
      if (resizeTimer) {
        clearTimeout(resizeTimer);
      }
      
      // Schedule a resize with a delay to avoid rapid repeated resizes
      resizeTimer = setTimeout(() => {
        // Only resize if canvas is still in the document
        if (canvas && canvas.isConnected) {
          const dpr = window.devicePixelRatio || 1;
          const rect = canvas.getBoundingClientRect();
          
          // Only resize if dimensions actually changed
          if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
            // Save current transformation
            const prevWidth = canvas.width;
            const prevHeight = canvas.height;
            
            // Set new dimensions
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            
            // Apply scale
            ctx.scale(dpr, dpr);
          }
        }
      }, 150); // Debounce resize for smoother UI
    };

    window.addEventListener("resize", handleResize);

    // Cleanup function
    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (resizeTimer) {
        clearTimeout(resizeTimer);
      }
    };
  }, [state, audioData, audioStream]);

  return (
    <div className="circle-animation">
      <canvas
        ref={canvasRef}
        className="animation-canvas"
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
        }}
      />
    </div>
  );
};

export default CanvasCircleAnimation;
