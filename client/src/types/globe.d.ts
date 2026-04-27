declare module 'globe.gl' {
  import type { Object3D, Scene, WebGLRenderer } from 'three';

  interface GlobeInstance {
    (element: HTMLElement): GlobeInstance;
    
    // Globe image
    globeImageUrl(url: string): GlobeInstance;
    bumpImageUrl(url: string): GlobeInstance;
    backgroundImageUrl(url: string): GlobeInstance;
    showGlobe(show: boolean): GlobeInstance;
    showAtmosphere(show: boolean): GlobeInstance;
    atmosphereColor(color: string): GlobeInstance;
    atmosphereAltitude(alt: number): GlobeInstance;
    
    // Points
    pointsData(data: any[]): GlobeInstance;
    pointColor(accessor: string | ((d: any) => string)): GlobeInstance;
    pointAltitude(accessor: string | number | ((d: any) => number)): GlobeInstance;
    pointRadius(accessor: string | number | ((d: any) => number)): GlobeInstance;
    
    // Arcs
    arcsData(data: any[]): GlobeInstance;
    arcColor(accessor: string | ((d: any) => string)): GlobeInstance;
    arcStroke(accessor: string | number | ((d: any) => number) | null): GlobeInstance;
    arcDashLength(val: number | ((d: any) => number)): GlobeInstance;
    arcDashGap(val: number | ((d: any) => number)): GlobeInstance;
    arcDashAnimateTime(val: number | ((d: any) => number)): GlobeInstance;
    arcAltitude(accessor: string | number | ((d: any) => number) | null): GlobeInstance;
    arcAltitudeAutoScale(val: number): GlobeInstance;
    
    // Rings
    ringsData(data: any[]): GlobeInstance;
    ringColor(accessor: string | ((d: any) => string)): GlobeInstance;
    ringMaxRadius(val: number): GlobeInstance;
    ringPropagationSpeed(val: number): GlobeInstance;
    ringRepeatPeriod(val: number): GlobeInstance;
    
    // Labels
    labelsData(data: any[]): GlobeInstance;
    labelText(accessor: string | ((d: any) => string)): GlobeInstance;
    labelSize(accessor: string | number | ((d: any) => number)): GlobeInstance;
    labelColor(accessor: string | ((d: any) => string)): GlobeInstance;
    labelDotRadius(val: number): GlobeInstance;
    labelDotOrientation(accessor: string | ((d: any) => string)): GlobeInstance;
    labelAltitude(val: number): GlobeInstance;
    labelResolution(val: number): GlobeInstance;
    
    // Hex bins
    hexBinPointsData(data: any[]): GlobeInstance;
    
    // Camera
    pointOfView(pov: { lat?: number; lng?: number; altitude?: number }, transitionMs?: number): GlobeInstance;
    
    // Controls
    controls(): any;
    
    // Renderer
    renderer(): WebGLRenderer;
    scene(): Scene;
    camera(): any;
    
    // Dimensions
    width(w: number): GlobeInstance;
    width(): number;
    height(h: number): GlobeInstance;
    height(): number;
    
    // Destructor
    _destructor?(): void;
    
    [key: string]: any;
  }

  function Globe(): GlobeInstance;
  export default Globe;
  export type { GlobeInstance };
}

declare module '3d-force-graph' {
  interface ForceGraphInstance {
    (element: HTMLElement): ForceGraphInstance;
    graphData(data: { nodes: any[]; links: any[] }): ForceGraphInstance;
    nodeColor(accessor: string | ((node: any) => string)): ForceGraphInstance;
    nodeVal(accessor: string | number | ((node: any) => number)): ForceGraphInstance;
    nodeLabel(accessor: string | ((node: any) => string)): ForceGraphInstance;
    nodeOpacity(val: number): ForceGraphInstance;
    nodeResolution(val: number): ForceGraphInstance;
    linkColor(accessor: string | ((link: any) => string)): ForceGraphInstance;
    linkWidth(accessor: string | number | ((link: any) => number)): ForceGraphInstance;
    linkOpacity(val: number): ForceGraphInstance;
    linkDirectionalParticles(val: number | ((link: any) => number)): ForceGraphInstance;
    linkDirectionalParticleSpeed(val: number | ((link: any) => number)): ForceGraphInstance;
    linkDirectionalParticleWidth(val: number): ForceGraphInstance;
    linkDirectionalParticleColor(accessor: string | ((link: any) => string)): ForceGraphInstance;
    linkCurvature(val: number | ((link: any) => number)): ForceGraphInstance;
    backgroundColor(color: string): ForceGraphInstance;
    width(w: number): ForceGraphInstance;
    width(): number;
    height(h: number): ForceGraphInstance;
    height(): number;
    d3Force(forceName: string, force?: any): ForceGraphInstance | any;
    cameraPosition(pos: { x?: number; y?: number; z?: number }, lookAt?: { x: number; y: number; z: number }, transitionMs?: number): ForceGraphInstance;
    controls(): any;
    scene(): any;
    renderer(): any;
    _destructor?(): void;
    [key: string]: any;
  }

  function ForceGraph3D(): ForceGraphInstance;
  export default ForceGraph3D;
  export type { ForceGraphInstance };
}
