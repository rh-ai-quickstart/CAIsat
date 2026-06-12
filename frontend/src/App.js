import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as THREE from 'three';
import { MapContainer, TileLayer, useMapEvents, Rectangle } from 'react-leaflet';
import leafletImage from 'leaflet-image';
import 'leaflet/dist/leaflet.css';
import './App.css';

function App() {
  const [view, setView] = useState('globe'); // 'globe', 'map', or 'processing'
  const [enhancementCount, setEnhancementCount] = useState(0);
  const [systemOnline, setSystemOnline] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [cropArea, setCropArea] = useState({ x: 50, y: 50, size: 256 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [croppedImage, setCroppedImage] = useState(null);
  const [enhancedImage, setEnhancedImage] = useState(null);
  const [processing, setProcessing] = useState(false);
  const globeRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const earthRef = useRef(null);
  const mapRef = useRef(null);

  // API endpoint
  const BACKEND_BASE = window.location.hostname.includes('localhost')
    ? 'http://localhost:8080'
    : `${window.location.protocol}//${window.location.hostname.replace('caisat', 'caisat-backend')}`;

  // Check system health
  useEffect(() => {
    const checkHealth = async () => {
      try {
        await axios.get(`${BACKEND_BASE}/health`, { timeout: 5000 });
        setSystemOnline(true);
      } catch (err) {
        setSystemOnline(false);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [BACKEND_BASE]);

  // Fetch enhancement stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${BACKEND_BASE}/api/stats`);
        setEnhancementCount(response.data.total_enhancements);
      } catch (error) {
        console.log('Stats not available');
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [BACKEND_BASE]);

  // Initialize Three.js globe
  useEffect(() => {
    if (!globeRef.current || view !== 'globe') return;

    const container = globeRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 100000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Earth
    const earthGeometry = new THREE.SphereGeometry(6371, 64, 64);
    const textureLoader = new THREE.TextureLoader();
    const earthMaterial = new THREE.MeshPhongMaterial({
      map: textureLoader.load('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg'),
      bumpMap: textureLoader.load('https://unpkg.com/three-globe/example/img/earth-topology.png'),
      bumpScale: 10
    });
    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    scene.add(earth);

    // Atmosphere
    const atmosphereGeometry = new THREE.SphereGeometry(6471, 64, 64);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.1,
      side: THREE.BackSide
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    scene.add(atmosphere);

    // Lights
    const sunLight = new THREE.DirectionalLight(0xffffff, 1);
    sunLight.position.set(5, 3, 5);
    scene.add(sunLight);
    scene.add(new THREE.AmbientLight(0x333333));

    camera.position.set(0, 0, 15000);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    earthRef.current = earth;

    // Animation loop
    function animate() {
      requestAnimationFrame(animate);
      earth.rotation.y += 0.0005; // West to East rotation
      renderer.render(scene, camera);
    }
    animate();

    // Cleanup
    return () => {
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [view]);

  const handleActivateSatelliteView = () => {
    setView('map');
  };

  const handleCaptureEnhance = () => {
    if (!mapRef.current) return;

    // Capture the map as a screenshot
    leafletImage(mapRef.current, (err, canvas) => {
      if (err) {
        console.error('Error capturing map:', err);
        alert('Error capturing map view');
        return;
      }

      // Convert canvas to data URL
      const imageUrl = canvas.toDataURL('image/png');
      setCapturedImage(imageUrl);
      setView('processing');

      // Reset crop area to center
      setCropArea({ x: canvas.width / 2 - 128, y: canvas.height / 2 - 128, size: 256 });
    });
  };

  const handleMouseDown = (e) => {
    if (e.shiftKey || e.button === 1) {
      // Shift + drag OR middle mouse = pan
      e.preventDefault();
      setPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    // Check if clicking inside crop box
    if (
      x >= cropArea.x &&
      x <= cropArea.x + cropArea.size &&
      y >= cropArea.y &&
      y <= cropArea.y + cropArea.size
    ) {
      setDragging(true);
      setDragStart({ x: x - cropArea.x, y: y - cropArea.y });
    }
  };

  const handleMouseMove = (e) => {
    if (panning) {
      e.preventDefault();
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    if (!dragging) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom - dragStart.x;
    const y = (e.clientY - rect.top - pan.y) / zoom - dragStart.y;

    // Get actual image dimensions
    const img = e.currentTarget.querySelector('.crop-base-image');
    if (!img) return;

    const maxX = img.naturalWidth - cropArea.size;
    const maxY = img.naturalHeight - cropArea.size;

    setCropArea({
      ...cropArea,
      x: Math.max(0, Math.min(x, maxX)),
      y: Math.max(0, Math.min(y, maxY))
    });
  };

  const handleMouseUp = () => {
    setDragging(false);
    setPanning(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();

    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calculate point in image coordinates before zoom
    const pointX = (mouseX - pan.x) / zoom;
    const pointY = (mouseY - pan.y) / zoom;

    // Calculate new zoom
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(1, Math.min(zoom * delta, 5));

    // Calculate new pan to keep the same point under the mouse
    const newPan = {
      x: mouseX - pointX * newZoom,
      y: mouseY - pointY * newZoom
    };

    setZoom(newZoom);
    setPan(newPan);
  };

  const handleEnhance = async () => {
    if (!capturedImage) return;

    setProcessing(true);
    setCroppedImage(null);
    setEnhancedImage(null);

    try {
      // Create a canvas to crop the image
      const img = new Image();
      img.src = capturedImage;

      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');

      // Draw cropped portion
      ctx.drawImage(
        img,
        cropArea.x, cropArea.y, cropArea.size, cropArea.size,
        0, 0, 256, 256
      );

      // Convert to blob
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

      // Save cropped image for display
      const croppedUrl = URL.createObjectURL(blob);
      setCroppedImage(croppedUrl);

      // Send to backend
      const formData = new FormData();
      formData.append('image', blob, 'crop.png');

      const response = await axios.post(`${BACKEND_BASE}/api/enhance`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'blob'
      });

      // Show enhanced result
      const enhancedUrl = URL.createObjectURL(response.data);
      setEnhancedImage(enhancedUrl);
      setProcessing(false);

    } catch (error) {
      console.error('Enhancement failed:', error);
      alert('Enhancement failed: ' + error.message);
      setProcessing(false);
    }
  };

  return (
    <div className="app-container">
      {/* Top Navigation */}
      <div className="header">
        <div className="logo">
          <span>CAIsat</span>
        </div>
        <div className="nav">
          <div
            className={`nav-item ${view === 'globe' || view === 'map' ? 'active' : ''}`}
            onClick={() => {
              setView('globe');
              setCapturedImage(null);
              setCroppedImage(null);
              setEnhancedImage(null);
            }}
          >
            Earth View
          </div>
          <div
            className={`nav-item ${view === 'processing' ? 'active' : ''}`}
            onClick={() => {
              if (capturedImage) {
                setView('processing');
              }
            }}
          >
            Processing
          </div>
        </div>
        <div className="status">
          <div className={`status-dot ${systemOnline ? 'online' : ''}`}></div>
          {systemOnline ? 'LIVE' : 'OFFLINE'}
        </div>
      </div>

      {/* Main Container */}
      <div className="container">
        {/* Left Sidebar */}
        <div className="sidebar">
          <div className="section-header">● ENHANCEMENTS</div>
          <div className="section-title">Total Processed</div>
          <div className="section-count">{enhancementCount}</div>

          <div className="divider"></div>

          <div className="section-header">IMAGING SATELLITES</div>

          <div className="list-item">
            <div>
              <div className="item-title">Clarity-1</div>
              <div className="item-subtitle">CAIsat · AI-Enhanced Imaging</div>
            </div>
            <div className="item-badge">LIVE</div>
          </div>

          <div className="list-item">
            <div>
              <div className="item-title">Sentinel-2A</div>
              <div className="item-subtitle">ESA · Earth Observation</div>
            </div>
            <div className="item-badge">EOS</div>
          </div>

          <div className="list-item">
            <div>
              <div className="item-title">Landsat 8</div>
              <div className="item-subtitle">NASA/USGS · Imaging</div>
            </div>
            <div className="item-badge">IMG</div>
          </div>

          <div className="divider"></div>

          <div className="section-header">GROUND STATIONS</div>

          <div className="list-item">
            <div>
              <div className="item-title">CAIstellar Observatory</div>
              <div className="item-subtitle">Space Telescope · Deep Field</div>
            </div>
            <div className="item-badge">OBS</div>
          </div>
        </div>

        {/* Globe/Map Container */}
        <div className="globe">
          <div id="earthContainer">
            {/* 3D Globe */}
            {view === 'globe' && (
              <>
                <div ref={globeRef} className="globe3d"></div>
                <button className="activate-btn" onClick={handleActivateSatelliteView}>
                  Satellite View
                </button>
              </>
            )}

            {/* Leaflet Map */}
            {view === 'map' && (
              <>
                <MapContainer
                  ref={mapRef}
                  center={[37.7749, -122.4194]}
                  zoom={3}
                  minZoom={2}
                  maxZoom={19}
                  style={{ width: '100%', height: '100%', background: '#000' }}
                  zoomControl={true}
                >
                  <TileLayer
                    attribution='Tiles &copy; Esri'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    maxZoom={19}
                  />
                </MapContainer>
                <button className="capture-btn" onClick={handleCaptureEnhance}>
                  Capture & Enhance
                </button>
              </>
            )}

            {/* Processing View */}
            {view === 'processing' && (
              <div className="processing-view">
                <div className="processing-header">
                  <h2>Image Enhancement</h2>
                  <button className="back-btn" onClick={() => { setView('map'); setCroppedImage(null); setEnhancedImage(null); }}>
                    ← Back to Map
                  </button>
                </div>

                {/* Step 1: Select area to enhance */}
                {!croppedImage && !enhancedImage && (
                  <div className="crop-section">
                    <h3>Select 256x256 Area to Enhance</h3>
                    <p className="instruction">
                      Scroll to zoom • Shift+Drag to pan • Drag red box to select area
                    </p>
                    <div className="zoom-controls">
                      <button onClick={() => setZoom(z => Math.min(z + 0.5, 5))}>+ Zoom In</button>
                      <span>{Math.round(zoom * 100)}%</span>
                      <button onClick={() => setZoom(z => Math.max(z - 0.5, 1))}>- Zoom Out</button>
                      <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>Reset</button>
                    </div>
                    <div className="crop-container">
                      <div
                        className="crop-image-wrapper"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onWheel={handleWheel}
                        onContextMenu={(e) => e.preventDefault()}
                        style={{
                          cursor: panning ? 'grabbing' : dragging ? 'move' : 'grab',
                          overflow: 'hidden',
                          border: '2px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '4px',
                          maxWidth: '90%',
                          maxHeight: '70vh',
                          position: 'relative',
                          userSelect: 'none'
                        }}
                      >
                        <div style={{
                          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                          transformOrigin: '0 0',
                          position: 'relative',
                          display: 'inline-block',
                          transition: panning || dragging ? 'none' : 'transform 0.1s ease-out'
                        }}>
                          <img
                            src={capturedImage}
                            alt="Captured map"
                            className="crop-base-image"
                            draggable="false"
                            style={{ pointerEvents: 'none' }}
                          />
                          <div
                            className="crop-box"
                            style={{
                              left: `${cropArea.x}px`,
                              top: `${cropArea.y}px`,
                              width: `${cropArea.size}px`,
                              height: `${cropArea.size}px`,
                              pointerEvents: 'none'
                            }}
                          >
                            <div className="crop-label">256×256</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <button className="enhance-btn" onClick={handleEnhance}>
                      Enhance Selected Area
                    </button>
                  </div>
                )}

                {/* Step 2: Processing */}
                {processing && (
                  <div className="processing-section">
                    <div className="spinner-container">
                      <div className="satellite-spinner">🛰️</div>
                      <p className="processing-text">Processing...</p>
                    </div>
                  </div>
                )}

                {/* Step 3: Results */}
                {!processing && croppedImage && enhancedImage && (
                  <div className="results-section">
                    <h3>Enhancement Complete</h3>
                    <div className="results-container">
                      <div className="result-panel">
                        <h4>Original (256×256)</h4>
                        <img src={croppedImage} alt="Original crop" />
                      </div>
                      <div className="result-arrow">→</div>
                      <div className="result-panel">
                        <h4>Enhanced (512×512)</h4>
                        <img src={enhancedImage} alt="Enhanced" />
                      </div>
                    </div>
                    <div className="result-actions">
                      <button className="back-btn" onClick={() => { setView('map'); setCroppedImage(null); setEnhancedImage(null); }}>
                        ← Back to Map
                      </button>
                      <a href={enhancedImage} download="enhanced.png" className="download-btn">
                        Download Enhanced Image
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
