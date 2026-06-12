import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as THREE from 'three';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';

function App() {
  const [view, setView] = useState('globe'); // 'globe' or 'map'
  const [enhancementCount, setEnhancementCount] = useState(0);
  const [systemOnline, setSystemOnline] = useState(false);
  const globeRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const earthRef = useRef(null);

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
    alert('Navigating to Processing page...\n\nIn the final application, this will take you to the image enhancement processing interface.');
  };

  return (
    <div className="app-container">
      {/* Top Navigation */}
      <div className="header">
        <div className="logo">
          <span>CAIsat</span>
        </div>
        <div className="nav">
          <div className="nav-item active">Earth View</div>
          <div className="nav-item">Processing</div>
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
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
