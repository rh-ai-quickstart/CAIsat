import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as THREE from 'three';
import { MapContainer, TileLayer, useMapEvents, Rectangle } from 'react-leaflet';
import leafletImage from 'leaflet-image';
import 'leaflet/dist/leaflet.css';
import './App.css';
import MonitoredAreas from './MonitoredAreas';

function App() {
  const [view, setView] = useState('globe'); // 'globe', 'map', 'processing', or 'monitored'
  const [enhancementCount, setEnhancementCount] = useState(0);
  const [systemOnline, setSystemOnline] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [cropArea, setCropArea] = useState({ x: 50, y: 50, size: 256 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedImage, setCroppedImage] = useState(null);
  const [enhancedImage, setEnhancedImage] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detections, setDetections] = useState(null);
  const [detectedImage, setDetectedImage] = useState(null);
  const [showOriginal, setShowOriginal] = useState(true);
  const [showEnhanced, setShowEnhanced] = useState(true);
  const [showDetected, setShowDetected] = useState(true);
  const [popup, setPopup] = useState(null); // 'purpose', 'guide', 'disclaimer', or null

  // Detection classes
  const DETECTION_CLASSES = [
    'plane', 'ship', 'storage-tank', 'baseball-diamond', 'tennis-court',
    'basketball-court', 'ground-track-field', 'harbor', 'bridge',
    'large-vehicle', 'small-vehicle', 'helicopter', 'roundabout',
    'soccer-ball-field', 'swimming-pool'
  ];
  const globeRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const earthRef = useRef(null);
  const mapRef = useRef(null);

  // API endpoints
  const BACKEND_BASE = window.location.hostname.includes('localhost')
    ? 'http://localhost:8080'
    : `${window.location.protocol}//${window.location.hostname.replace('caisat', 'caisat-backend')}`;

  const DETECTION_BASE = window.location.hostname.includes('localhost')
    ? 'http://localhost:8081'
    : `${window.location.protocol}//${window.location.hostname.replace('caisat', 'caisat-detection-backend')}`;

  const CHANGEDETECTION_BASE = window.location.hostname.includes('localhost')
    ? 'http://localhost:8082'
    : `${window.location.protocol}//${window.location.hostname.replace('caisat', 'caisat-backend-changedetection')}`;

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
    const rect = e.currentTarget.getBoundingClientRect();
    const img = e.currentTarget.querySelector('.crop-base-image');
    if (!img) return;

    // Calculate position relative to the scaled image
    const imgRect = img.getBoundingClientRect();
    const x = (e.clientX - imgRect.left) / zoom;
    const y = (e.clientY - imgRect.top) / zoom;

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
    if (!dragging) return;

    const img = document.querySelector('.crop-base-image');
    if (!img) return;

    const imgRect = img.getBoundingClientRect();
    const x = (e.clientX - imgRect.left) / zoom - dragStart.x;
    const y = (e.clientY - imgRect.top) / zoom - dragStart.y;

    // Get actual image dimensions
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
  };

  const handleWheel = (e) => {
    e.preventDefault();

    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();

    // Mouse position relative to container
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Current scroll position
    const scrollLeft = container.scrollLeft;
    const scrollTop = container.scrollTop;

    // Point in image that's under the mouse (before zoom)
    const pointX = (scrollLeft + mouseX) / zoom;
    const pointY = (scrollTop + mouseY) / zoom;

    // Calculate new zoom
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(1, Math.min(zoom * delta, 5));

    // Set new zoom
    setZoom(newZoom);

    // After zoom is set, adjust scroll to keep point under mouse
    // We need to do this after the DOM updates, so use setTimeout
    setTimeout(() => {
      container.scrollLeft = pointX * newZoom - mouseX;
      container.scrollTop = pointY * newZoom - mouseY;
    }, 0);
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

  const handleDetect = async () => {
    if (!enhancedImage) return;

    setDetecting(true);
    setDetections(null);
    setDetectedImage(null);

    try {
      // Convert enhanced image URL to blob
      const response = await fetch(enhancedImage);
      const blob = await response.blob();

      // Send to detection backend
      const formData = new FormData();
      formData.append('image', blob, 'enhanced.png');

      const detectResponse = await axios.post(`${DETECTION_BASE}/api/detect`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const detectionData = detectResponse.data;
      setDetections(detectionData);

      // Draw bounding boxes on the enhanced image
      const img = new Image();
      img.src = enhancedImage;

      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Draw bounding boxes
      detectionData.detections.forEach((detection, index) => {
        const [x1, y1, x2, y2] = detection.box;

        // Generate color based on class
        const hue = (index * 137.5) % 360;
        const color = `hsl(${hue}, 70%, 50%)`;

        // Draw box
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

        // Draw label background
        const label = `${detection.class}: ${(detection.confidence * 100).toFixed(1)}%`;
        ctx.font = '14px Roboto';
        const textWidth = ctx.measureText(label).width;

        ctx.fillStyle = color;
        ctx.fillRect(x1, y1 - 22, textWidth + 10, 22);

        // Draw label text
        ctx.fillStyle = '#fff';
        ctx.fillText(label, x1 + 5, y1 - 6);
      });

      // Convert canvas to blob URL
      const detectedUrl = canvas.toDataURL('image/png');
      setDetectedImage(detectedUrl);
      setDetecting(false);

    } catch (error) {
      console.error('Detection failed:', error);
      alert('Detection failed: ' + error.message);
      setDetecting(false);
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
          <div
            className={`nav-item ${view === 'monitored' ? 'active' : ''}`}
            onClick={() => setView('monitored')}
          >
            Monitored Areas
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

          <div className="divider"></div>

          <div className="section-header">ABOUT</div>

          <div className="list-item" onClick={() => setPopup('purpose')}>
            <div>
              <div className="item-title">Purpose</div>
              <div className="item-subtitle">About this demo</div>
            </div>
          </div>

          <div className="list-item" onClick={() => setPopup('guide')}>
            <div>
              <div className="item-title">User Guide</div>
              <div className="item-subtitle">How to use CAIsat</div>
            </div>
          </div>

          <div className="list-item" onClick={() => setPopup('disclaimer')}>
            <div>
              <div className="item-title">Disclaimer</div>
              <div className="item-subtitle">Important information</div>
            </div>
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
                      Scroll to zoom • Drag red box to select area
                    </p>
                    <div className="zoom-controls">
                      <button onClick={() => setZoom(z => Math.min(z + 0.5, 5))}>+ Zoom In</button>
                      <span>{Math.round(zoom * 100)}%</span>
                      <button onClick={() => setZoom(z => Math.max(z - 0.5, 1))}>- Zoom Out</button>
                      <button onClick={() => setZoom(1)}>Reset Zoom</button>
                    </div>
                    <div className="crop-container">
                      <div
                        className="crop-image-wrapper"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onWheel={handleWheel}
                        style={{
                          cursor: dragging ? 'move' : 'crosshair',
                          overflow: 'auto',
                          border: '2px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '4px',
                          maxWidth: '90%',
                          maxHeight: '70vh',
                          display: 'inline-block',
                          position: 'relative',
                          userSelect: 'none'
                        }}
                      >
                        <div style={{
                          transform: `scale(${zoom})`,
                          transformOrigin: 'top left',
                          position: 'relative',
                          display: 'inline-block'
                        }}>
                          <img
                            src={capturedImage}
                            alt="Captured map"
                            className="crop-base-image"
                            draggable="false"
                            style={{ display: 'block' }}
                            ref={(img) => {
                              if (img) {
                                // Calculate scale factor from natural to display dimensions
                                const scale = img.getBoundingClientRect().width / img.naturalWidth;
                                // Store it for the crop box positioning
                                img.dataset.displayScale = scale;
                              }
                            }}
                          />
                          <div
                            className="crop-box"
                            style={{
                              left: `${cropArea.x * (document.querySelector('.crop-base-image')?.dataset.displayScale || 1)}px`,
                              top: `${cropArea.y * (document.querySelector('.crop-base-image')?.dataset.displayScale || 1)}px`,
                              width: `${cropArea.size * (document.querySelector('.crop-base-image')?.dataset.displayScale || 1)}px`,
                              height: `${cropArea.size * (document.querySelector('.crop-base-image')?.dataset.displayScale || 1)}px`
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

                    {/* Collapsible Results Container */}
                    <div className="results-container">
                      {showOriginal && (
                        <div className="result-panel">
                          <h4 onClick={() => setShowOriginal(!showOriginal)} style={{cursor: 'pointer'}}>
                            Original (256×256) {showOriginal ? '▼' : '▶'}
                          </h4>
                          <img src={croppedImage} alt="Original crop" />
                        </div>
                      )}
                      {!showOriginal && (
                        <div className="result-panel-collapsed" onClick={() => setShowOriginal(true)}>
                          <h4>Original ▶</h4>
                        </div>
                      )}

                      {(showOriginal || showEnhanced || showDetected) && <div className="result-arrow">→</div>}

                      {showEnhanced && (
                        <div className="result-panel">
                          <h4 onClick={() => setShowEnhanced(!showEnhanced)} style={{cursor: 'pointer'}}>
                            Enhanced (512×512) {showEnhanced ? '▼' : '▶'}
                          </h4>
                          <img src={enhancedImage} alt="Enhanced" />
                        </div>
                      )}
                      {!showEnhanced && (
                        <div className="result-panel-collapsed" onClick={() => setShowEnhanced(true)}>
                          <h4>Enhanced ▶</h4>
                        </div>
                      )}

                      {detectedImage && (
                        <>
                          {(showEnhanced || showDetected) && <div className="result-arrow">→</div>}
                          {showDetected && (
                            <div className="result-panel">
                              <h4 onClick={() => setShowDetected(!showDetected)} style={{cursor: 'pointer'}}>
                                Detected Objects ({detections?.count || 0}) {showDetected ? '▼' : '▶'}
                              </h4>
                              <img src={detectedImage} alt="Detected" />
                            </div>
                          )}
                          {!showDetected && (
                            <div className="result-panel-collapsed" onClick={() => setShowDetected(true)}>
                              <h4>Detected ({detections?.count || 0}) ▶</h4>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Detection section */}
                    {!detecting && !detectedImage && (
                      <div className="detection-section">
                        <button className="detect-btn" onClick={handleDetect}>
                          Detect Objects
                        </button>
                        <p className="detection-hint">Analyze enhanced image for planes, ships, vehicles, and more</p>
                      </div>
                    )}

                    {detecting && (
                      <div className="processing-section">
                        <div className="spinner-container">
                          <div className="satellite-spinner">🛰️</div>
                          <p className="processing-text">Detecting objects...</p>
                        </div>
                      </div>
                    )}

                    {/* Detection Results */}
                    {detections && detectedImage && (
                      <>
                        {detections.count > 0 ? (
                          <div className="detections-list">
                            <h4>Detected Objects:</h4>
                            <div className="detections-grid">
                              {detections.detections.slice(0, 10).map((det, idx) => (
                                <div key={idx} className="detection-item">
                                  <span className="detection-class">{det.class}</span>
                                  <span className="detection-confidence">{(det.confidence * 100).toFixed(1)}%</span>
                                </div>
                              ))}
                            </div>

                            {/* Rerun Detection Button */}
                            <div style={{marginTop: '20px', textAlign: 'center'}}>
                              <button className="rerun-detect-btn" onClick={() => {
                                setDetectedImage(null);
                                setDetections(null);
                                handleDetect();
                              }}>
                                ↻ Rerun Detection
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="no-detections">
                            <p>No detections flagged</p>
                            <button className="rerun-detect-btn" onClick={() => {
                              setDetectedImage(null);
                              setDetections(null);
                              handleDetect();
                            }}>
                              ↻ Rerun Detection
                            </button>
                          </div>
                        )}

                        {/* Detectable Classes Info */}
                        <div className="detection-info">
                          <h4>Detectable Classes:</h4>
                          <div className="classes-grid">
                            {DETECTION_CLASSES.map((cls, idx) => (
                              <span key={idx} className="class-badge">{cls}</span>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    <div className="result-actions">
                      <button className="back-btn" onClick={() => {
                        setView('map');
                        setCroppedImage(null);
                        setEnhancedImage(null);
                        setDetectedImage(null);
                        setDetections(null);
                        setShowOriginal(true);
                        setShowEnhanced(true);
                        setShowDetected(true);
                      }}>
                        ← Back to Map
                      </button>
                      {detectedImage ? (
                        <a href={detectedImage} download="detected.png" className="download-btn">
                          Download Detected Image
                        </a>
                      ) : (
                        <a href={enhancedImage} download="enhanced.png" className="download-btn">
                          Download Enhanced Image
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Monitored Areas View */}
            {view === 'monitored' && (
              <MonitoredAreas backendUrl={CHANGEDETECTION_BASE} />
            )}
          </div>
        </div>
      </div>

      {/* Popup Modal */}
      {popup && (
        <div className="popup-overlay" onClick={() => setPopup(null)}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <button className="popup-close" onClick={() => setPopup(null)}>×</button>

            {popup === 'purpose' && (
              <>
                <h2>Purpose of This Demo</h2>
                <p>
                  CAIsat is a demonstration of AI-powered satellite imagery enhancement running on
                  Red Hat OpenShift AI. This quickstart showcases how to deploy machine learning
                  models for real-time image super-resolution using KServe and MLServer.
                </p>
                <p>
                  The application uses a SwinIR (Swin Transformer for Image Restoration) model to
                  enhance low-resolution satellite imagery, demonstrating practical AI/ML workflows
                  in a cloud-native environment.
                </p>
                <h3>Key Features:</h3>
                <ul>
                  <li>Real-time satellite imagery capture from interactive maps</li>
                  <li>AI-powered 2x super-resolution enhancement</li>
                  <li>Deployed on OpenShift AI with KServe inference serving</li>
                  <li>Scalable, production-ready architecture</li>
                </ul>
              </>
            )}

            {popup === 'guide' && (
              <>
                <h2>User Guide</h2>
                <h3>Getting Started:</h3>
                <ol>
                  <li><strong>View the Globe:</strong> Start with the rotating 3D Earth visualization</li>
                  <li><strong>Activate Satellite View:</strong> Click "Satellite View" to access the interactive map</li>
                  <li><strong>Navigate:</strong> Pan and zoom to find an area of interest</li>
                  <li><strong>Capture:</strong> Click "Capture & Enhance" to take a screenshot</li>
                </ol>

                <h3>Enhancement Process:</h3>
                <ol>
                  <li><strong>Select Area:</strong> Use scroll to zoom, then drag the red 256×256 box to your desired area</li>
                  <li><strong>Enhance:</strong> Click "Enhance Selected Area" to process with AI</li>
                  <li><strong>Review Results:</strong> Compare the original and AI-enhanced images side-by-side</li>
                  <li><strong>Download:</strong> Save the enhanced image for your use</li>
                </ol>

                <h3>Tips:</h3>
                <ul>
                  <li>Zoom in on the map before capturing for better detail</li>
                  <li>The enhancement works best on areas with visible features</li>
                  <li>Processing typically takes 5-10 seconds</li>
                </ul>
              </>
            )}

            {popup === 'disclaimer' && (
              <>
                <h2>Disclaimer</h2>
                <p>
                  <strong>Educational and Demonstration Purpose Only:</strong> This application is
                  provided as a technical demonstration and quickstart template for deploying AI/ML
                  workloads on Red Hat OpenShift AI. It is not intended for production use without
                  proper testing and validation.
                </p>

                <h3>Satellite Imagery:</h3>
                <p>
                  Satellite imagery is sourced from Esri World Imagery service. All imagery rights
                  belong to their respective owners (Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping,
                  Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community).
                </p>

                <h3>AI Model Limitations:</h3>
                <ul>
                  <li>Enhancement quality varies based on input image characteristics</li>
                  <li>The model may introduce artifacts in certain scenarios</li>
                  <li>Results should not be used for critical decision-making without validation</li>
                  <li>Enhanced images are AI-generated interpretations, not actual high-resolution captures</li>
                </ul>

                <h3>Data Privacy:</h3>
                <p>
                  Captured images are processed in-memory and not stored permanently. However, users
                  should avoid capturing sensitive or classified information.
                </p>

                <p className="disclaimer-footer">
                  <strong>No Warranty:</strong> This software is provided "as is" without warranty of any kind.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
