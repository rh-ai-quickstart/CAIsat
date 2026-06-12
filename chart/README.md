# Zoom & Enhance Helm Chart

Helm chart for deploying the Zoom & Enhance application on OpenShift.

## Prerequisites

- OpenShift cluster with Helm 3 installed
- SwinIR model deployed as InferenceService
- Container images pushed to registry

## Installation

### Quick Install

```bash
# Deploy in current namespace (model in same namespace)
helm install zoom-enhance ./helm/zoom-enhance \
  --set model.serviceName=swinir-predictor \
  --set model.name=swinir

# Deploy in specific namespace
helm install zoom-enhance ./helm/zoom-enhance \
  --namespace my-app \
  --create-namespace \
  --set model.serviceName=swinir-predictor \
  --set model.name=swinir

# Model in different namespace
helm install zoom-enhance ./helm/zoom-enhance \
  --set model.serviceName=swinir-predictor \
  --set model.namespace=models-namespace \
  --set model.name=swinir
```

### Custom Values

Create a `my-values.yaml`:

```yaml
model:
  serviceName: swinir-predictor
  namespace: ""  # Same namespace as release
  name: swinir

backend:
  image:
    repository: quay.io/your-org/csi-backend
    tag: "v1.0"

frontend:
  image:
    repository: quay.io/your-org/csi-frontend
    tag: "v1.0"
  route:
    host: zoom-enhance.apps.your-cluster.com
```

Then install:

```bash
helm install zoom-enhance ./helm/zoom-enhance -f my-values.yaml
```

## Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `model.serviceName` | Model inference service name | `swinir-predictor` |
| `model.namespace` | Namespace where model is deployed | `""` (same as release) |
| `model.name` | Model name | `swinir` |
| `model.port` | Model service port | `8080` |
| `backend.replicaCount` | Backend replica count | `2` |
| `backend.image.repository` | Backend image repository | `quay.io/sara_banderby/csi-backend` |
| `backend.image.tag` | Backend image tag | `latest` |
| `frontend.replicaCount` | Frontend replica count | `2` |
| `frontend.image.repository` | Frontend image repository | `quay.io/sara_banderby/csi-frontend` |
| `frontend.image.tag` | Frontend image tag | `latest` |
| `frontend.route.enabled` | Enable OpenShift route | `true` |
| `frontend.route.host` | Custom hostname | `""` (auto-generated) |

See `values.yaml` for all options.

## Upgrade

```bash
helm upgrade zoom-enhance ./helm/zoom-enhance -f my-values.yaml
```

## Uninstall

```bash
helm uninstall zoom-enhance
```

## Examples

### Install in different namespace

```bash
helm install zoom-enhance ./helm/zoom-enhance \
  --namespace my-app \
  --create-namespace \
  --set model.namespace=my-models
```

### Use specific image versions

```bash
helm install zoom-enhance ./helm/zoom-enhance \
  --set backend.image.tag=v1.0 \
  --set frontend.image.tag=v1.0
```

### Custom resources

```bash
helm install zoom-enhance ./helm/zoom-enhance \
  --set backend.resources.requests.memory=512Mi \
  --set backend.resources.limits.memory=1Gi
```

### Disable route (use port-forward)

```bash
helm install zoom-enhance ./helm/zoom-enhance \
  --set frontend.route.enabled=false

# Then access via port-forward:
kubectl port-forward svc/zoom-enhance-frontend 8080:8080
```

## Verify Installation

```bash
# Check pods
oc get pods -l app.kubernetes.io/name=zoom-enhance

# Check services
oc get svc -l app.kubernetes.io/name=zoom-enhance

# Get route URL
oc get route zoom-enhance -o jsonpath='{.spec.host}'
```

## Troubleshooting

### Pods not starting

```bash
# Check pod status
oc describe pod -l app.kubernetes.io/component=backend

# Check logs
oc logs -l app.kubernetes.io/component=backend
```

### Model endpoint not reachable

```bash
# Verify configmap
oc get configmap zoom-enhance-config -o yaml

# Test from backend pod
oc exec -it deployment/zoom-enhance-backend -- curl -v $MODEL_ENDPOINT
```

### Update model endpoint

```bash
helm upgrade zoom-enhance ./helm/zoom-enhance \
  --reuse-values \
  --set model.serviceName=new-model-service
```
