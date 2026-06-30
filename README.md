<!--
Title: AI-Powered Satellite Imagery Enhancement
Description: Deploy AI-powered resolution enhancement for satellite imagery using OpenShift AI on Red Hat OpenShift.
Industry: Earth Observation, Agriculture, Urban Planning
Product: Red Hat OpenShift AI
Use case: Satellite Image Processing
-->

# AI-Powered Satellite Imagery Enhancement & Object Detection

Deploy AI-powered resolution enhancement, object detection, and change detection for satellite imagery using OpenShift AI on Red Hat OpenShift.

![CAIsat web interface showing 3D rotating Earth globe, interactive satellite map with live imagery, drag-and-drop selection box for 256×256 regions, zoom controls, and AI-enhanced satellite images with side-by-side comparison](docs/images/CAIsat.png)

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Requirements](#requirements)
- [Deploy](#deploy)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Validation](#validation)
  - [Deletion](#deletion)
- [How It Works](#how-it-works)
- [Use Cases](#use-cases)
- [References](#references)

---

## Overview

Welcome to CAIsat, where you can gaze upon Earth from space, enhance satellite imagery, detect objects, and track changes over time with the power of AI. This application lets users navigate live satellite maps, capture regions to enhance from 256×256 to 512×512 resolution using the SwinIR deep learning model, detect objects like planes, ships, vehicles, and infrastructure using YOLOv8-OBB, and monitor pre-analyzed locations with automated change detection using Sentinel2 — all running on Red Hat OpenShift AI.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Frontend (React)                                               │
│  • Three.js 3D rotating Earth                                   │
│  • Leaflet satellite map (Esri World Imagery)                   │
│  • Drag-and-drop selection box (256×256 region)                 │
│  • Mouse wheel zoom for detail inspection                       │
│  • Before/after/detected comparison view                        │
│  • Monitored Areas with timeline charts                         │
│  • Collapsible image panels                                     │
│  • Bounding box visualization                                   │
└──────┬──────────────────────────────────────────────────────────┘
       │ REST API
       ├─────────────────────────────────────┬───────────────────►
       ▼                                     ▼
┌────────────────────────────────┐  ┌────────────────────────────┐
│  Enhancement Backend           │  │  Detection Backend         │
│  (FastAPI + Python)            │  │  (FastAPI + Python)        │
│  • Crop 256×256 region         │  │  • Preprocess for YOLO     │
│  • Normalize to tensor         │  │  • NMS post-processing     │
│  • Track statistics            │  │  • Bounding box transform  │
└──────┬─────────────────────────┘  └──────┬─────────────────────┘
       │ KServe v2                          │ KServe v2
       ▼                                     ▼
┌────────────────────────────────┐  ┌────────────────────────────┐
│  SwinIR Model                  │  │  YOLOv8-OBB Model          │
│  (MLServer / ONNX)             │  │  (MLServer / ONNX)         │
│  • 2× resolution enhancement   │  │  • 15 object classes       │
│  • 256×256 → 512×512           │  │  • Bounding boxes          │
└────────────────────────────────┘  └────────────────────────────┘
```

The application consists of eight containerized components deployed on OpenShift:

1. **Frontend (React)**: 3D Earth globe, interactive satellite map, drag-and-drop selection box, zoom controls, monitored areas with timeline charts, and collapsible detection results
2. **Enhancement Backend (FastAPI)**: Image preprocessing, crop extraction, tensor conversion, and KServe communication for SwinIR
3. **Detection Backend (FastAPI)**: Image preprocessing, YOLO inference coordination, NMS post-processing, and bounding box visualization
4. **Change Detection Backend (FastAPI)**: Time series data retrieval, trend analysis, and change metrics from S3 storage
5. **SwinIR Model Server (OpenShift AI)**: ONNX model served via MLServer for 2× resolution enhancement
6. **YOLOv8-OBB Model Server (OpenShift AI)**: ONNX model served via MLServer for object detection in satellite imagery
7. **Sentinel2 Model Server (OpenShift AI)**: ONNX model served via MLServer for change detection analysis
8. **S4 Storage & Data Science Pipelines**: S3-compatible storage with automated change analysis pipeline

Activate satellite view to browse satellite imagery, capture a screenshot, select a 256×256 region of interest, enhance it to 512×512, then detect objects like planes, ships, and vehicles with bounding boxes.

---

## Requirements

### Hardware

- **CPU**: 7.5 cores minimum
  - Frontend: 50 millicores request, 200 millicores limit
  - Enhancement Backend: 100 millicores request, 500 millicores limit
  - Detection Backend: 250 millicores request, 1 core limit
  - SwinIR Model Server: 4 cores request, 4 cores limit
  - YOLOv8 Model Server: 2 cores request, 4 cores limit
- **Memory**: 13.5 GiB minimum
  - Frontend: 128 MiB request, 256 MiB limit
  - Backend: 256 MiB request, 512 MiB limit
  - Model Server: 6 GiB request, 8 GiB limit
- **GPU**: Not required (CPU-only inference supported, ~7-15 seconds per image)

### User Permissions

- Ability to create projects/namespaces
- Ability to deploy workloads (Deployments, Services, Routes)
- Ability to create InferenceService resources (for OpenShift AI model serving)
- Ability to create ServingRuntime resources

---

## Deploy

### Prerequisites

1. **Red Hat OpenShift 4.2x cluster** 
2. **OpenShift AI 3.x** 
3. **oc CLI** authenticated to your cluster
4. **Helm 3.10+** installed locally

### Installation

1. **Clone this repository**:
   ```bash
   git clone https://github.com/rh-ai-quickstart/caisat.git
   cd caisat
   ```

2. **Create a namespace**:
   ```bash
   oc new-project caisat
   ```

3. **Deploy the application using Helm**:
   ```bash
   helm install caisat ./chart --namespace caisat
   ```

   **What happens automatically:**
   - S4 storage deploys and seeds with 56 satellite images from NASA GIBS (4 locations × 14 days)
   - All three AI models deploy: SwinIR, YOLO, Sentinel2
   - Analysis pipeline runs automatically, generating change detection metrics
   - Results appear in the "Monitored Areas" tab

4. **Wait for deployment to complete** (this may take 8-10 minutes for full pipeline execution):
   ```bash
   oc get pods -n caisat -w
   ```

5. **Get the application URL**:
   ```bash
   oc get route caisat-frontend -n caisat -o jsonpath='{.spec.host}'
   ```

### Validation

1. **Check that all pods are running**:
   ```bash
   oc get pods -n caisat
   ```
   
   Expected output showing application pods:
   ```
   NAME                                          READY   STATUS    RESTARTS   AGE
   caisat-backend-xxxxxxxxx-xxxxx                1/1     Running   0          5m
   caisat-detection-backend-xxxxxxxxx-xxxxx      1/1     Running   0          5m
   caisat-backend-changedetection-xxx-xxxxx      1/1     Running   0          5m
   caisat-frontend-xxxxxxxxx-xxxxx               1/1     Running   0          5m
   swinir-predictor-xxxxxxxxx-xxxxx              2/2     Running   0          5m
   yolov8m-satelite-predictor-xxxxxxxxx-xxxxx    2/2     Running   0          5m
   sentinel2-predictor-xxxxxxxxx-xxxxx           2/2     Running   0          5m
   caisat-s4-xxxxxxxxx-xxxxx                     1/1     Running   0          5m
   ```

2. **Verify all model servers are ready**:
   ```bash
   oc get inferenceservice -n caisat
   ```
   
   All three InferenceServices should show `READY: True`.

3. **Access the application**:
   - Open the route URL from step 5 of Installation in your web browser
   - You should see the CAIsat interface with a rotating 3D Earth
   - Try the full workflow described in [How It Works](#how-it-works) to verify enhancement and detection are functioning

### Deletion

To completely remove the application:

```bash
helm uninstall caisat -n caisat
oc delete project caisat
```

---

## How It Works

1. **Activate**: Click "Satellite View" to switch to interactive Esri satellite imagery
2. **Navigate**: Pan and zoom to find your area of interest (cities, coastlines, forests, airports, harbors, etc.)
3. **Capture**: Click "Capture & Enhance" to take a screenshot of the current map view
4. **Select**: Drag the red 256×256 selection box over your target region
   - Use scroll wheel to zoom in for precision
   - Position the box exactly where you want enhancement
5. **Enhance**: Click "Enhance Selected Area"
   - Backend extracts the selected 256×256 region
   - Image is converted to a normalized tensor
   - SwinIR model processes it to 512×512 (2× upscaling)
6. **Detect**: Click "Detect Objects" on the enhanced image
   - Detection backend preprocesses the image for YOLOv8
   - YOLOv8-OBB model identifies 15 object classes
   - Non-maximum suppression filters overlapping detections
   - Bounding boxes are drawn with confidence scores
7. **Compare**: View original, enhanced, and detected images (collapsible panels)
8. **Review**: See detected objects with class names and confidence scores
9. **Monitor**: Click "Monitored Areas" to view pre-analyzed locations with change detection timelines
10. **Download**: Save the enhanced or detected image for your records

Processing time: ~10-15 seconds per enhancement, ~5-6 seconds per detection on CPU.

**Detectable Objects**: plane, ship, storage-tank, baseball-diamond, tennis-court, basketball-court, ground-track-field, harbor, bridge, large-vehicle, small-vehicle, helicopter, roundabout, soccer-ball-field, swimming-pool.
Processing time: ~7-15 seconds per image on CPU.

---

## Use Cases

### Change Detection & Monitoring
Track development and land use changes across multiple locations over time with automated Sentinel2 analysis. View pre-analyzed locations (Las Vegas, Dubai, Death Valley, Phoenix) with 14-day timeline charts showing change intensity and trends.

### Agriculture & Crop Monitoring
Enhance satellite imagery of agricultural fields to detect crop stress, improve field boundary detection, and analyze historical low-resolution archives. Detect vehicles, storage tanks, and infrastructure to monitor farm operations and equipment distribution.

### Urban Planning & Development
Improve resolution of building and infrastructure details for development zone analysis. Detect vehicles, bridges, roundabouts, and sports facilities to analyze urban infrastructure distribution and monitor city growth patterns.

### Maritime & Infrastructure Monitoring
Detect ships, harbors, bridges, and storage tanks for maritime traffic analysis, port activity monitoring, and coastal infrastructure assessment. Track vessel movements and monitor harbor capacity utilization.

### Aviation & Transportation
Detect planes, helicopters, and vehicles at airports and transportation hubs. Monitor aircraft parking positions, analyze airport capacity, and track vehicle movements in large facilities.

### Education & Demonstration
Demonstrate AI image processing techniques in Earth observation courses. Show students how deep learning models can be applied to satellite imagery and explore the capabilities and limitations of AI-based enhancement.

---

## References

- [SwinIR Model Paper](https://arxiv.org/abs/2108.10257) - Liang et al., 2021
- [YOLOv8 Documentation](https://docs.ultralytics.com/) - Ultralytics
- [DOTA Dataset](https://captain-whu.github.io/DOTA/) - Object Detection in Aerial Images
- [Esri World Imagery](https://www.esri.com/en-us/arcgis/products/arcgis-living-atlas/overview)
- [NASA GIBS](https://www.earthdata.nasa.gov/eosdis/science-system-description/eosdis-components/gibs) - Global Imagery Browse Services

---

## License

Apache 2.0 License - See [LICENSE](LICENSE) file

---

## Credits

- **Built by**: Red Hat CAI Team
- **Powered by**: Red Hat OpenShift AI
- **Models**: SwinIR by Jingyun Liang et al., YOLOv8-OBB by Ultralytics, Sentinel2 by SatlasPretrain
- **Satellite Imagery**: Esri World Imagery Service, NASA GIBS (Global Imagery Browse Services)
- **Base Images**: Red Hat Universal Base Image 9 (UBI9)
- **Maintained by**: Sara Banderby

---

**Happy exploring! 🌍🛰️**
