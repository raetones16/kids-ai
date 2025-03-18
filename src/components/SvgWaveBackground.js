import React, { useEffect, useRef } from 'react';

/**
 * A component that applies a gentle wave distortion effect to the background SVG image
 * 
 * @param {Object} props
 * @param {string} props.imageUrl - URL to the SVG background image
 * @param {string} props.className - Additional CSS classes for positioning
 */
const SvgWaveBackground = ({ imageUrl, className = "" }) => {
  const containerRef = useRef(null);
  const animationRef = useRef(null);
  
  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined' || !containerRef.current) return;
    
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
    
    // Create a filter with turbulence and displacement map
    const defs = document.createElementNS(svgNS, "defs");
    const filter = document.createElementNS(svgNS, "filter");
    filter.setAttribute("id", "wave-displacement");
    
    // Turbulence filter that creates the wave pattern
    const turbulence = document.createElementNS(svgNS, "feTurbulence");
    turbulence.setAttribute("id", "turbulence");
    turbulence.setAttribute("type", "fractalNoise");
    turbulence.setAttribute("baseFrequency", "0.006 0.006");
    turbulence.setAttribute("numOctaves", "2");
    turbulence.setAttribute("seed", "3");
    turbulence.setAttribute("result", "turbulence");
    
    // Displacement map filter that uses the turbulence to displace the image
    const displacementMap = document.createElementNS(svgNS, "feDisplacementMap");
    displacementMap.setAttribute("in", "SourceGraphic");
    displacementMap.setAttribute("in2", "turbulence");
    displacementMap.setAttribute("scale", "15"); // Controls distortion amount - higher is more visible
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
    
    // Animate the turbulence over time
    let phase = 0;
    const animate = () => {
      phase += 0.003; // Moderate animation speed for visible waves
      
      // Update turbulence parameters to create a smooth wave effect
      const baseFreqX = 0.006;
      const baseFreqY = 0.006;
      const waveX = baseFreqX + Math.sin(phase) * 0.004;
      const waveY = baseFreqY + Math.cos(phase * 0.5) * 0.004;
      
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
