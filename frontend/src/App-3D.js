import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Viewer, Entity, Scene, Globe, Camera } from 'resium';
import { Cartesian3, Color, Math as CesiumMath, Ion, IonImageryProvider } from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import './App-3D.css';

// Set Cesium Ion access token
Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlYWE1OWUxNy1mMWZiLTQzYjYtYTQ0OS1kMWFjYmFkNjc5YzciLCJpZCI6NTc3MzMsImlhdCI6MTYyNzg0NTE4Mn0.XcKpgANiY19MC4bdFUXMVEBToBmqS8kuYpUlxJHYZxk';

function App() {
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [systemOnline, setSystemOnline] = useState(false);
  const [recentImages, setRecentImages] = useState([
    { id: 1, name: 'San Francisco Bay', lat: 37.7749, lng: -122.4194, status: 'NEW' },
    { id: 2, name: 'Amazon Rainforest', lat: -3.4653, lng: -62.2159, status: '2×' },
    { id: 3, name: 'Sahara Desert', lat: 23.4162, lng: 25.6628, status: '2×' },
    { id: 4, name: 'Great Barrier Reef', lat: -18.2871, lng: 147.6992, status: '2×' }
  ]);
  const [satellites] = useState([
    { id: 'iss', name: 'ISS', description: 'Int. Space Station', status: 'LIVE' },
    { id: 'sentinel2a', name: 'Sentinel-2A', description: 'Earth Observation', status: 'EOS' },
    { id: 'landsat8', name: 'Landsat 8', description: 'Imaging Satellite', status: 'IMG' }
  ]);
  const [enhancedImage, setEnhancedImage] = useState(null);
  const [originalCrop, setOriginalCrop] = useState(null);
  const viewerRef = useRef(null);
  const fileInputRef = useRef(null);

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

  const handleRegionClick = (region) => {
    setSelectedRegion(region);

    // Fly to location
    if (viewerRef.current && viewerRef.current.cesiumElement) {
      const viewer = viewerRef.current.cesiumElement;
      viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(region.lng, region.lat, 1000000),
        duration: 2
      });
    }
  };

  const handleGlobeClick = (movement, viewer) => {
    const cartesian = viewer.camera.pickEllipsoid(movement.position, viewer.scene.globe.ellipsoid);
    if (cartesian) {
      const cartographic = viewer.scene.globe.ellipsoid.cartesianToCartographic(cartesian);
      const longitude = CesiumMath.toDegrees(cartographic.longitude);
      const latitude = CesiumMath.toDegrees(cartographic.latitude);

      const newRegion = {
        id: Date.now(),
        name: 'Custom Location',
        lat: parseFloat(latitude.toFixed(4)),
        lng: parseFloat(longitude.toFixed(4)),
        status: 'NEW'
      };

      setSelectedRegion(newRegion);
    }
  };

  const handleEnhance = async () => {
    if (!selectedRegion) return;

    setProcessing(true);
    try {
      // In real implementation, capture satellite imagery at this location
      // For now, just simulate processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // TODO: Implement actual image capture and enhancement
      alert(`Enhancing region: ${selectedRegion.name} at ${selectedRegion.lat}, ${selectedRegion.lng}`);

    } catch (err) {
      console.error('Enhancement failed:', err);
    } finally {
      setProcessing(false);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        // TODO: Process uploaded image
        console.log('Image uploaded:', file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSatelliteClick = (satelliteId) => {
    if (viewerRef.current && viewerRef.current.cesiumElement) {
      const viewer = viewerRef.current.cesiumElement;

      // Altitude for each satellite (in meters)
      const altitudes = {
        iss: 420000,
        sentinel2a: 786000,
        landsat8: 705000
      };

      const altitude = altitudes[satelliteId] || 500000;

      viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(0, 0, altitude * 2),
        duration: 2
      });
    }
  };

  return (
    <div className="app-container">
      {/* Top Navigation */}
      <div className="top-nav">
        <div className="logo">
          <div className="logo-icon">🛰</div>
          <div className="logo-text">CAI<span>sat</span></div>
        </div>
        <div className="nav-links">
          <a className="nav-link">Dashboard</a>
          <a className="nav-link active">Earth View</a>
          <a className="nav-link">Processing</a>
          <a className="nav-link">Archive</a>
          <a className="nav-link">Documentation</a>
        </div>
        <div className="nav-actions">
          <div className="status-badge">
            <div className={`status-dot ${systemOnline ? 'online' : ''}`}></div>
            <span>{systemOnline ? 'Live' : 'Offline'}</span>
          </div>
          <button className="btn-support">Support</button>
        </div>
      </div>

      {/* Main Container */}
      <div className="main-container">
        {/* Left Sidebar */}
        <div className="left-sidebar">
          <div className="sidebar-section">
            <div className="section-header">
              <div className="section-dot"></div>
              <div>
                <div className="section-title">Enhancement Queue</div>
                <div className="section-subtitle">Recent</div>
                <div className="section-count">{recentImages.length} <span className="section-label">images</span></div>
              </div>
            </div>

            {recentImages.map((region, index) => (
              <div
                key={region.id}
                className={`list-item ${selectedRegion?.id === region.id ? 'active' : ''}`}
                onClick={() => handleRegionClick(region)}
              >
                <div className="item-info">
                  <div className="item-name">{region.name}</div>
                  <div className="item-meta">{region.lat}°N, {region.lng}°W</div>
                </div>
                <div className="item-badge">{region.status}</div>
              </div>
            ))}
          </div>

          <div className="divider"></div>

          <div className="sidebar-section">
            <div className="section-header">
              <div>
                <div className="section-title">Satellites In Orbit</div>
                <div className="section-count">{satellites.length} <span className="section-label">tracked</span></div>
              </div>
            </div>

            {satellites.map((sat) => (
              <div
                key={sat.id}
                className="list-item"
                onClick={() => handleSatelliteClick(sat.id)}
              >
                <div className="item-info">
                  <div className="item-name">{sat.name}</div>
                  <div className="item-meta">{sat.description}</div>
                </div>
                <div className="item-badge">{sat.status}</div>
              </div>
            ))}
          </div>

          <div className="divider"></div>

          <div className="sidebar-section">
            <div className="section-header">
              <div>
                <div className="section-title">Active Model</div>
              </div>
            </div>
            <div className="list-item active">
              <div className="item-info">
                <div className="item-name">SwinIR Transformer</div>
                <div className="item-meta">ONNX • MLServer</div>
              </div>
              <div className="item-badge">v1.0</div>
            </div>
          </div>

          <div className="divider"></div>

          <div className="sidebar-section">
            <div className="section-header">
              <div>
                <div className="section-title">Statistics</div>
              </div>
            </div>
            <div style={{ padding: '0 20px' }}>
              <div className="data-item" style={{ marginBottom: '12px' }}>
                <div className="data-label">Uptime</div>
                <div className="data-value">99.8%</div>
              </div>
              <div className="data-item">
                <div className="data-label">Processing Time</div>
                <div className="data-value">45s avg</div>
              </div>
            </div>
          </div>
        </div>

        {/* Globe Container */}
        <div className="globe-container">
          <Viewer
            ref={viewerRef}
            full
            baseLayerPicker={false}
            geocoder={false}
            homeButton={false}
            sceneModePicker={false}
            navigationHelpButton={false}
            animation={false}
            timeline={false}
            fullscreenButton={false}
            vrButton={false}
            infoBox={false}
            selectionIndicator={false}
            scene3DOnly={true}
            onClick={handleGlobeClick}
          >
            <Scene backgroundColor={Color.BLACK} />
            <Globe
              baseColor={Color.BLACK}
              enableLighting={true}
              showGroundAtmosphere={true}
            />
            <Camera
              position={Cartesian3.fromDegrees(-122.4194, 37.7749, 15000000)}
            />
          </Viewer>

          {/* Welcome Screen (show when no region selected) */}
          {!selectedRegion && (
            <div className="welcome-screen">
              <div className="welcome-icon">🌍</div>
              <div className="welcome-title">Welcome to CAIsat</div>
              <div className="welcome-subtitle">Rotate and zoom the Earth to select a region</div>
              <div className="welcome-hint">← Select from recent captures or click anywhere on Earth</div>
            </div>
          )}

          {/* Upload Zone */}
          <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
            <div className="upload-icon">📤</div>
            <div className="upload-text">Upload Satellite Image</div>
            <div className="upload-subtext">Or drag and drop here</div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              style={{ display: 'none' }}
            />
          </div>

          {/* Info Overlay */}
          {selectedRegion && (
            <div className="info-overlay active">
              <div className="overlay-header">
                <div className="overlay-title-section">
                  <div className="overlay-label">Selected Region</div>
                  <div className="overlay-title">{selectedRegion.name}</div>
                  <div className="overlay-subtitle">Coordinates: {selectedRegion.lat}°, {selectedRegion.lng}°</div>
                </div>
                <button className="close-btn" onClick={() => setSelectedRegion(null)}>×</button>
              </div>
              <div className="overlay-content">
                <div className="data-grid">
                  <div className="data-item">
                    <div className="data-label">Latitude</div>
                    <div className="data-value">{selectedRegion.lat}°</div>
                  </div>
                  <div className="data-item">
                    <div className="data-label">Longitude</div>
                    <div className="data-value">{selectedRegion.lng}°</div>
                  </div>
                  <div className="data-item">
                    <div className="data-label">Resolution</div>
                    <div className="data-value">256×256</div>
                  </div>
                  <div className="data-item">
                    <div className="data-label">Enhancement</div>
                    <div className="data-value">2× upscale</div>
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <span className="status-chip">
                    <span style={{ width: '6px', height: '6px', background: '#6496ff', borderRadius: '50%', display: 'inline-block' }}></span>
                    High Resolution Available
                  </span>
                </div>

                <div className="description-text">
                  AI-powered super-resolution enhancement using SwinIR transformer model. Upscales captured region from 256×256 to 512×512 resolution with improved detail recovery.
                </div>

                <div className="action-buttons">
                  <button
                    className="btn btn-primary"
                    onClick={handleEnhance}
                    disabled={processing}
                  >
                    {processing ? 'Processing...' : 'Capture & Enhance'}
                  </button>
                  <button className="btn btn-secondary">Preview</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
