# AI-Powered Satellite Imagery Enhancement

Enhance satellite imagery resolution using AI super-resolution models on Red Hat OpenShift AI for agriculture, urban planning, and environmental monitoring.

## Table of Contents

- [Overview](#overview)
- [Detailed description](#detailed-description)
  - [Architecture diagrams](#architecture-diagrams)
- [Requirements](#requirements)
  - [Minimum hardware requirements](#minimum-hardware-requirements)
  - [Minimum software requirements](#minimum-software-requirements)
  - [Required user permissions](#required-user-permissions)
- [Deploy](#deploy)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Validating the deployment](#validating-the-deployment)
  - [Delete](#delete)
- [Repository structure](#repository-structure)
- [References](#references)
- [Technical details](#technical-details)
- [Tags](#tags)

## Overview

Satellite imagery provides invaluable insights into our changing planet, but resolution constraints often limit what we can see and analyze. This quickstart demonstrates how AI-powered super-resolution models can enhance satellite images, recovering fine details that would otherwise remain obscured by pixelation and atmospheric effects. Users can upload satellite imagery, select a region of interest, and watch as AI upscales 256×256 pixel selections to 512×512 resolution with improved clarity and detail.

## Detailed description

Earth observation data plays a critical role in agriculture, urban planning, disaster response, and environmental research. However, high-resolution satellite imagery is often expensive, infrequently updated, or unavailable for historical archives. This creates a gap between the data available and the level of detail needed for effective decision-making.

This quickstart bridges that gap by deploying an AI-powered image enhancement platform that uses SwinIR (Swin Transformer for Image Restoration) models to perform super-resolution on satellite imagery. The application allows users to upload satellite images from any source, select a specific region of interest, and receive AI-enhanced results that recover fine structures and reduce visual artifacts.

Key capabilities include:
- **2× super-resolution enhancement** from 256×256 to 512×512 display resolution
- **Side-by-side comparison** of original and enhanced imagery
- **Interactive region selection** for targeted enhancement
- **Real-time processing** with progress feedback
- **Web-based interface** accessible from any modern browser

Real-world applications span multiple industries:
- **Agriculture**: Enhance crop monitoring imagery to detect early signs of stress, improve field boundary detection, and analyze historical low-resolution archives
- **Urban Planning**: Improve resolution of building and infrastructure details for development zone analysis and historical change detection
- **Disaster Response**: Enhance damage assessment imagery after natural disasters when high-resolution imagery is unavailable or delayed
- **Environmental Monitoring**: Improve coastal observation, forest canopy analysis, and wildlife habitat mapping

### Architecture diagrams

![CAIsat Architecture](docs/images/architecture-diagram.png)

The application follows a three-tier cloud-native architecture:

1. **Frontend (React)**: Web-based UI with satellite map integration, image upload, and interactive region selection
2. **Backend (FastAPI)**: REST API handling image preprocessing, tensor conversion, and model communication via KServe v2 protocol
3. **Model Server (MLServer)**: ONNX runtime serving the SwinIR transformer model through OpenShift AI InferenceService

All components communicate within the OpenShift cluster, with the model packaged as an OCI container image for simplified deployment without requiring external storage.

## Requirements

### Minimum hardware requirements

**Application Components:**

**Backend:**
- CPU: 100m vCPU (request) / 500m vCPU (limit)
- Memory: 256 MiB (request) / 512 MiB (limit)

**Frontend:**
- CPU: 50m vCPU (request) / 200m vCPU (limit)
- Memory: 128 MiB (request) / 256 MiB (limit)

**LLM/Model Server:**
- CPU: 4 vCPU (request) / 4 vCPU (limit)
- Memory: 6 GiB (request) / 8 GiB (limit)
- GPU: Not required (CPU-based inference)

**Total Cluster Requirements:**
- CPU: ~4.5 vCPU minimum
- Memory: ~9 GiB minimum

> **Note**: Model inference takes approximately 30-60 seconds per image on CPU. GPU acceleration can significantly reduce processing time but is not required for this quickstart.

### Minimum software requirements

This quickstart has been tested with:
- **OpenShift**: 4.12 or later
- **OpenShift AI**: 2.22 or later with KServe/ModelMesh serving installed
- **Helm**: 3.12 or later
- **oc CLI**: 4.12 or later

The OpenShift AI operator must be installed with the following components:
- KServe serving stack (for InferenceService support)
- MLServer runtime (for ONNX model serving)

### Required user permissions

This quickstart can be deployed by any user with:
- Permission to create projects/namespaces in OpenShift
- Permission to deploy applications via Helm charts
- Permission to create InferenceService resources (OpenShift AI custom resources)
- No cluster admin access required

Standard OpenShift AI data scientist or developer roles are sufficient.

## Deploy

### Prerequisites

Before deploying, ensure you have:
- Access to a Red Hat OpenShift cluster (4.12+) with OpenShift AI (2.22+) installed
- `oc` CLI (version 4.12+) installed and authenticated to your cluster
- `helm` CLI (version 3.12+) installed
- The KServe serving stack enabled in OpenShift AI
- Sufficient cluster resources (see [Minimum hardware requirements](#minimum-hardware-requirements))

### Installation

1. Clone the repository:
```bash
git clone https://github.com/rh-ai-quickstart/caisat.git
cd caisat
```

2. Create a new OpenShift project:
```bash
PROJECT="caisat"
oc new-project ${PROJECT}
```

3. Install using Helm:

The chart includes the model deployment by default. Simply run:

```bash
helm install caisat ./chart --namespace ${PROJECT}
```

This will deploy:
- SwinIR model as a KServe InferenceService
- FastAPI backend with automatic model endpoint configuration
- React frontend with OpenShift Route for external access

The installation takes approximately 3-5 minutes as the model container image is pulled and the InferenceService initializes.

> **Note**: The model is packaged as an OCI container image (`quay.io/sara_banderby/csi_cai:model`), so no separate model upload or data connection configuration is needed.

### Validating the deployment

1. Check that all pods are running:
```bash
oc get pods -n ${PROJECT}
```

Expected output should show:
- `caisat-backend-*`: Running
- `caisat-frontend-*`: Running  
- `swinir-predictor-*`: Running (model server)

2. Verify the InferenceService is ready:
```bash
oc get inferenceservice swinir -n ${PROJECT}
```

Wait until the `READY` column shows `True`.

3. Get the application URL:
```bash
echo https://$(oc get route caisat -n ${PROJECT} --template='{{.spec.host}}')
```

4. Open the URL in your browser. You should see the CAIsat application interface with:
   - A satellite map view
   - Upload button for satellite imagery
   - Status indicator showing "System Online"

5. Test the enhancement functionality:
   - Upload a satellite image (or capture from the embedded map)
   - Position the selection box over an area of interest
   - Click "Enhance Selection"
   - Wait for processing (30-60 seconds)
   - View the side-by-side comparison of original and enhanced imagery

### Delete

To completely remove the deployment:

1. Uninstall the Helm release:
```bash
helm uninstall caisat --namespace ${PROJECT}
```

2. (Optional) Delete the project and all resources:
```bash
oc delete project ${PROJECT}
```

This will remove all deployed components including the model InferenceService, backend, frontend, routes, and associated resources.

## Repository structure

```
.
├── backend/                  # FastAPI backend service
│   ├── app.py                # Main API application
│   ├── requirements.txt      # Python dependencies
│   └── Containerfile         # Container build definition
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── App.js            # Main React component
│   │   ├── App.css           # Styling
│   │   └── Telescope.js      # Satellite icon component
│   ├── public/               # Static assets
│   ├── package.json          # Node.js dependencies
│   └── build/                # Production build output
├── model-container/          # OCI model packaging
│   ├── README.md             # Model packaging documentation
│   ├── build-swinir.sh       # Model conversion script
│   ├── build.sh              # Container build script
│   └── Containerfile         # Model container definition
├── chart/                    # Helm chart for deployment
│   ├── Chart.yaml            # Chart metadata
│   ├── values.yaml           # Configuration values
│   ├── README.md             # Helm chart documentation
│   └── templates/            # Kubernetes resource templates
│       ├── inferenceservice.yaml     # KServe model deployment
│       ├── servingruntime.yaml       # MLServer runtime config
│       ├── backend-deployment.yaml   # Backend deployment
│       ├── backend-service.yaml      # Backend service
│       ├── backend-route.yaml        # Backend route
│       ├── frontend-deployment.yaml  # Frontend deployment
│       ├── frontend-service.yaml     # Frontend service
│       ├── route.yaml                # Frontend route (main UI)
│       ├── configmap.yaml            # Environment configuration
│       └── model-secret.yaml         # Model configuration
├── docs/
│   └── images/               # Architecture diagrams and screenshots
└── README.md
```

## References

- [OpenShift AI Documentation](https://docs.redhat.com/en/documentation/red_hat_openshift_ai_self-managed)
- [KServe InferenceService API](https://kserve.github.io/website/latest/modelserving/v1beta1/serving_runtime/)
- [SwinIR: Image Restoration using Swin Transformer](https://github.com/JingyunLiang/SwinIR)
- [MLServer ONNX Runtime](https://mlserver.readthedocs.io/en/latest/runtimes/onnx.html)
- [KServe V2 Inference Protocol](https://docs.seldon.io/projects/seldon-core/en/latest/reference/apis/v2-protocol.html)

## Technical details

### Model Architecture

This quickstart uses **SwinIR** (Swin Transformer for Image Restoration), a state-of-the-art transformer-based model for image super-resolution. The model has been converted to ONNX format for optimized inference on CPU.

**Model Specifications:**
- Input: 256×256 RGB image (3 channels, FP32)
- Output: 1024×1024 RGB image (4× upscaling)
- Display: Resized to 512×512 (2×) for better usability
- Framework: ONNX Runtime via MLServer
- Parameters: ~11.7M
- Processing time: ~30-60 seconds per image (CPU)

### Data Flow

1. User uploads image or captures from satellite map view
2. Frontend sends selected 256×256 region to backend (`/api/enhance` endpoint)
3. Backend preprocesses image:
   - Converts to RGB if needed
   - Resizes to 256×256
   - Normalizes to [0, 1] range
   - Transforms from HWC to CHW format (channels first)
   - Adds batch dimension
4. Backend sends KServe v2 inference request to model endpoint
5. MLServer processes request through ONNX runtime
6. Model returns 1024×1024 enhanced image
7. Backend postprocesses output:
   - Removes batch dimension
   - Converts CHW to HWC format
   - Clips values and converts to uint8
   - Resizes to 512×512 for display
8. Frontend receives enhanced image and displays side-by-side comparison

### API Endpoints

**Backend:**
- `GET /`: Health check with model endpoint info
- `GET /health`: Kubernetes liveness/readiness probe
- `POST /api/enhance`: Image enhancement endpoint (accepts multipart/form-data)

**Model Inference:**
- KServe v2 protocol at `/v2/models/{model-name}/infer`
- Request/response format follows KServe inference protocol specification

### Container Images

Pre-built images are available on Quay.io:
- **Frontend**: `quay.io/sara_banderby/caisat:frontend`
- **Backend**: `quay.io/sara_banderby/caisat:backend`
- **Model**: `quay.io/sara_banderby/csi_cai:model`

### Important Notice

The AI enhancement process performs super-resolution, denoising, and artifact removal. While the model improves apparent image sharpness and recovers visually plausible details, it infers features from learned patterns rather than physical measurements.

**Limitations:**
- Reconstructed features may not accurately reflect original ground truth
- Performance degrades with heavily pixelated, blurred, or compressed inputs
- Does not preserve spectral signatures, radiometric calibration, or other scientific properties
- Enhanced features should be interpreted as visual approximations for exploration and presentation, not for quantitative scientific analysis

For production scientific workflows, consult domain experts about appropriate use of AI-enhanced imagery.

## Tags

**Title:** AI-Powered Satellite Imagery Enhancement  
**Description:** Enhance satellite imagery resolution using AI super-resolution models on Red Hat OpenShift AI for agriculture, urban planning, and environmental monitoring  
**Industry:** Cross-industry  
**Product:** OpenShift AI  
**Use case:** Image processing, AI/ML inference, geospatial analysis  
**Partner:** N/A  
**Contributor org:** Red Hat
