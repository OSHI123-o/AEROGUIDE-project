import { useEffect, useRef } from "react";
import createGlobe from "cobe";

export default function GlobeComponent() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let phi = 0;
    
    if (!canvasRef.current) return;

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: 1000,
      height: 1000,
      phi: 0,
      theta: 0.1,
      dark: 1, // Dark theme
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.05, 0.1, 0.2], // Navy blue base
      markerColor: [0.2, 0.8, 1], // Light blue markers
      glowColor: [0.05, 0.2, 0.4], // Subtle blue glow
      markers: [
        // longitude latitude
        { location: [37.7595, -122.4367], size: 0.05 }, // San Francisco
        { location: [40.7128, -74.006], size: 0.05 },   // New York
        { location: [51.5072, -0.1276], size: 0.05 },   // London
        { location: [25.2048, 55.2708], size: 0.05 },   // Dubai
        { location: [7.1802, 79.8848], size: 0.12 },    // CMB Airport (Sri Lanka) - Larger marker
        { location: [1.3521, 103.8198], size: 0.05 },   // Singapore
        { location: [-33.8688, 151.2093], size: 0.05 }  // Sydney
      ],
      // @ts-ignore
      onRender: (state: Record<string, any>) => {
        // Called on every animation frame.
        state.phi = phi;
        phi += 0.003; // Rotation speed
      },
    });

    return () => {
      globe.destroy();
    };
  }, []);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "auto",
          maxWidth: "100%",
          aspectRatio: "1/1",
          cursor: "grab",
        }}
      />
    </div>
  );
}
