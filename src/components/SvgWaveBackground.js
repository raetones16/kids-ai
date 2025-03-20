import React, { useEffect, useRef, useState } from 'react';

/**
 * A component that applies a gentle wave distortion effect to the background SVG image
 * Optimized for different device types - disabled on mobile, simplified on tablets
 * 
 * @param {Object} props
 * @param {string} props.imageUrl - URL to the SVG background image
 * @param {string} props.className - Additional CSS classes for positioning
 */
const SvgWaveBackground = ({ imageUrl, className = "" }) => {
  const containerRef = useRef(null);
  const animationRef = useRef(null);
  
  // Detect device type for appropriate animation level
  const [deviceType, setDeviceType] = useState('desktop');
  
  useEffect(() => {
    // Determine device type based on screen width
    const detectDeviceType = () => {
      const width = window.innerWidth;
      if (width < 768) {
        return 'mobile';
      } else if (width < 1024) {
        return 'tablet';
      } else {
        return 'desktop';
      }
    };
    
    // Set initial device type
    setDeviceType(detectDeviceType());
    
    // Update on resize
    const handleResize = () => {
      setDeviceType(detectDeviceType());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined' || !containerRef.current) return;
    
    // For mobile devices, just display the static background without effects
    if (deviceType === 'mobile') {
      const img = document.createElement('div');
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.backgroundImage = `url("${imageUrl}")`;
      img.style.backgroundSize = "cover";
      img.style.backgroundPosition = "center";
      
      // Add static image to the container
      containerRef.current.appendChild(img);
      
      // Cleanup on unmount
      return () => {
        if (containerRef.current && img.parentNode === containerRef.current) {
          containerRef.current.removeChild(img);
        }
      };
    }
    
    // Canvas for turbulence animation
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const svgNS = "http://www.w3.org/2000/svg";
    
    // SVG filter for displacement map
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.style.position = "absolute";
    svg.style.visibility = "hidden";
    
    // Create a filter with turbulence and displacement map - reduced complexity for tablets
    const defs = document.createElementNS(svgNS, "defs");
    const filter = document.createElementNS(svgNS, "filter");
    filter.setAttribute("id", "wave-displacement");
    
    // Turbulence filter that creates the wave pattern
    const turbulence = document.createElementNS(svgNS, "feTurbulence");
    turbulence.setAttribute("id", "turbulence");
    turbulence.setAttribute("type", "fractalNoise");
    
    // Different configurations based on device type
    if (deviceType === 'tablet') {
      // Reduced complexity for tablets
      turbulence.setAttribute("baseFrequency", "0.008 0.008"); // Higher frequency = less detail
      turbulence.setAttribute("numOctaves", "1"); // Fewer octaves = less detail
    } else {
      // Full quality for desktop
      turbulence.setAttribute("baseFrequency", "0.006 0.006");
      turbulence.setAttribute("numOctaves", "2");
    }
    
    turbulence.setAttribute("seed", "3");
    turbulence.setAttribute("result", "turbulence");
    
    const displacementMap = document.createElementNS(svgNS, "feDisplacementMap");
    displacementMap.setAttribute("in", "SourceGraphic");
    displacementMap.setAttribute("in2", "turbulence");
    
    // Adjust displacement scale based on device type
    if (deviceType === 'tablet') {
      displacementMap.setAttribute("scale", "10"); // Less displacement for tablets
    } else {
      displacementMap.setAttribute("scale", "15"); // Normal displacement for desktop
    }
    
    displacementMap.setAttribute("xChannelSelector", "R");
    displacementMap.setAttribute("yChannelSelector", "G");
    
    // Assemble the filter
    filter.appendChild(turbulence);
    filter.appendChild(displacementMap);
    defs.appendChild(filter);
    svg.appendChild(defs);
    
    // Add the SVG to the document
    document.body.appendChild(svg);
    
    // Create the image element
    const img = document.createElement('div');
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.backgroundImage = `url("${imageUrl}")`;
    img.style.backgroundSize = "cover";
    img.style.backgroundPosition = "center";
    img.style.filter = "url(#wave-displacement)";
    
    // Add image to the container
    containerRef.current.appendChild(img);
    
    // Animate the turbulence over time - optimized for device type
    let phase = 0;
    const animate = () => {
      // Use slower animation speed on tablets for better performance
      const speedFactor = deviceType === 'tablet' ? 0.002 : 0.003;
      phase += speedFactor; // Adjust animation speed based on device
      
      // Update turbulence parameters to create a smooth wave effect
      const baseFreqX = deviceType === 'tablet' ? 0.008 : 0.006;
      const baseFreqY = deviceType === 'tablet' ? 0.008 : 0.006;
      const amplitudeFactor = deviceType === 'tablet' ? 0.003 : 0.004; // Smaller waves on tablet
      
      const waveX = baseFreqX + Math.sin(phase) * amplitudeFactor;
      const waveY = baseFreqY + Math.cos(phase * 0.5) * amplitudeFactor;
      
      turbulence.setAttribute("baseFrequency", `${waveX} ${waveY}`);
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    // Start the animation
    animate();
    
    // Cleanup on unmount
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (svg.parentNode) {
        svg.parentNode.removeChild(svg);
      }
      if (containerRef.current && img.parentNode === containerRef.current) {
        containerRef.current.removeChild(img);
      }
    };
  }, [imageUrl]);
  
  return (
    <div 
      ref={containerRef} 
      className={`svg-wave-background ${className}`}
      aria-hidden="true"
    />
  );
};

export default SvgWaveBackground;
