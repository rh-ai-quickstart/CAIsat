# [INSERT quickstart title here]

> **CONTRIBUTOR TODO: update title**
>
> Replace the H1 title above with your quickstart title
>
> **TITLE requirements:**
> - MAX CHAR: 64
> - Industry use case, e.g.: "Protect patient data with LLM guardrails"
>
> _TITLE will be extracted for publication._

[Add your short description here - max 160 characters]

> **CONTRIBUTOR TODO: short description**
>
> Add a SHORT DESCRIPTION of your use case between H1 title and the Table of Contents
>
> **SHORT DESCRIPTION requirements:**
> - MAX CHAR: 160
> - Describe the INDUSTRY use case
>
> _SHORT DESCRIPTION will be extracted for publication._

## Table of Contents

> **CONTRIBUTOR TODO: update table of contents links**
>
> This section is recommended for better navigation. The links below are examples - update them to match your actual README sections.

- [Overview](#overview)
- [Detailed description](#detailed-description)
  - [See it in action](#see-it-in-action)
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

> **CONTRIBUTOR TODO: add overview**
>
> Write 2-4 sentences that give a high-level summary of what this quickstart does.
>
> **Focus on:**
> - What problem does this solve?
> - Who is this for? (e.g., "Healthcare providers managing patient data")
> - What will users be able to do after deploying this?
>
> Keep it non-technical - save technical details for later sections.

## Detailed description

> **CONTRIBUTOR TODO: add detailed description**
>
> Write 2-3 paragraphs that expand on the overview.
>
> **Include:**
> - The business/industry problem in more detail
> - How this quickstart addresses that problem
> - Key features or capabilities users will gain
> - Real-world scenarios where this would be used
>
> This is about the USE CASE, not the technology. Don't explain how it works technically yet.
>
> **Example:** "In healthcare settings, clinicians often need to quickly access patient information while ensuring HIPAA compliance. This quickstart demonstrates how AI can summarize patient records while maintaining strict data privacy through guardrails..."


### See it in action

> **CONTRIBUTOR TODO: add demo links**
>
> This section is RECOMMENDED but optional.
>
> **Add links to:**
> - Arcade interactive demos (preferred)
> - YouTube/video walkthroughs
> - Live demo instances (if available)
>
> This helps users see the value before deploying. Many users don't have immediate access to deployment environments, so demos are crucial.
>
> **Example:**
> - [Try the interactive demo](https://arcade.example.com/your-demo)
> - [Watch the 3-minute walkthrough](https://youtube.com/example)

### Architecture diagrams

> **CONTRIBUTOR TODO: add architecture diagram**
>
> This section is REQUIRED.
>
> **Include:**
> - A clear architecture diagram showing components and data flow
> - Put image files in `docs/images/` folder
> - Use descriptive filenames (e.g., `architecture-overview.png`)
> - Add alt text for accessibility
>
> **Example:**
> ```
> ![Architecture diagram showing data flow from user input through LLM to output](docs/images/architecture-overview.png)
> ```
>
> Optionally add a brief explanation of the diagram below the image.


## Requirements

> _This section groups all prerequisites users need before deploying_

### Minimum hardware requirements

> **CONTRIBUTOR TODO: add minimum hardware requirements**
>
> This section is REQUIRED. Be SPECIFIC - don't say "GPU", say exactly which GPU.
>
> **Include:**
> - CPU: specify cores, requests, and limits
> - Memory: specify GiB, requests, and limits  
> - GPU: exact models (e.g., "NVIDIA A10, A100, L40S, or T4")
> - Storage: if significant storage is needed
>
> If your quickstart deploys a model, list the model's resource requirements separately.
>
> **Example:**
>
> **Application:**
> - CPU: 2 vCPU (request) / 4 vCPU (limit)
> - Memory: 4 GiB (request) / 8 GiB (limit)
>
> **LLM (if deploying a model):**
> - CPU: 4 vCPU (request) / 8 vCPU (limit)
> - Memory: 16 GiB (request) / 32 GiB (limit)
> - GPU: 1 NVIDIA GPU (A10, A100, L40S, T4, or similar)
>
> > **Note**: If using MaaS (external model endpoint), GPU is not required.

### Minimum software requirements

> **CONTRIBUTOR TODO: add minimum software requirements**
>
> This section is REQUIRED. Be SPECIFIC about versions.
>
> **Include:**
> - OpenShift version (e.g., "OpenShift 4.14 or later")
> - OpenShift AI version (e.g., "OpenShift AI 2.22 or later")
> - Other platform dependencies (operators, services)
> - Client tools (oc CLI, helm, etc.)
>
> **BAD:** "Requires OpenShift AI"  
> **GOOD:** "Tested with OpenShift AI 2.22-2.25 on OpenShift 4.14+"

### Required user permissions

> **CONTRIBUTOR TODO: add user permissions**
>
> This section is REQUIRED. Be clear about what permissions are needed.
>
> **Options:**
> - Regular user with standard permissions (preferred!)
> - Namespace admin
> - Cluster admin (only if absolutely necessary - explain why)
>
> **Example:**
>
> This quickstart can be deployed by any user with:
> - Permission to create projects/namespaces
> - Permission to deploy applications via Helm
> - No cluster admin access required


## Deploy

> _This section contains all deployment instructions_

### Prerequisites

> **CONTRIBUTOR TODO: verify and update prerequisites**
>
> List specific items users must have/do BEFORE running installation commands.
>
> **Include:**
> - Access to specific platforms/clusters
> - CLI tools installed (with version requirements)
> - Authentication/credentials needed
> - Network access requirements
>
> **Example:**
>
> Before deploying, ensure you have:
> - Access to a Red Hat OpenShift cluster with OpenShift AI 2.22+ installed
> - `oc` CLI (version 4.14+) installed and authenticated
> - `helm` CLI (version 3.12+) installed
> - API key for your model endpoint (if using MaaS)

### Installation

> **CONTRIBUTOR TODO: customize installation steps**
>
> Provide STEP-BY-STEP instructions. Assume users have limited knowledge.
>
> **Include:**
> - Clear numbered steps
> - Exact commands to run (users should be able to copy/paste)
> - Explanation of what each major step does
> - Any configuration choices users need to make
>
> Test these steps yourself on a fresh environment to ensure they work!
>
> **Key things to update:**
> - Replace "my-quickstart" and "YOUR_QUICKSTART_NAME" with your actual names
> - Add any additional --set flags specific to your quickstart
> - If your quickstart requires a model, keep the model options section below
> - If your quickstart does NOT require a model, remove the model options section below entirely

1. Clone the repository:
```bash
git clone https://github.com/rh-ai-quickstart/YOUR_QUICKSTART_NAME.git
cd YOUR_QUICKSTART_NAME
```

2. Create a new OpenShift project:
```bash
PROJECT="my-quickstart"
oc new-project ${PROJECT}
```

3. Install using Helm:

```bash
helm install my-quickstart ./chart --namespace ${PROJECT}
```

#### If your quickstart requires a model

**Option A: Use your own model (MaaS - Model as a Service)**

If you have an existing model endpoint, provide the model name, endpoint, and API key:
```bash
helm install my-quickstart ./chart --namespace ${PROJECT} \
  --set model.name=YOUR_MODEL_NAME \
  --set model.endpoint=YOUR_MODEL_ENDPOINT \
  --set model.api_key=YOUR_API_KEY
```

> **Note**: The `model.endpoint` should be the full URL including protocol and port if needed (e.g., `https://my-model.example.com` or `http://my-model:8080`).

**Option B: Deploy with a model included in the chart**

If you don't provide any model configuration, the chart will deploy a default model on your cluster:
```bash
helm install my-quickstart ./chart --namespace ${PROJECT}
```

> **Note**: Option B requires a GPU available in your cluster for the LLM deployment. See [Minimum hardware requirements](#minimum-hardware-requirements) for details. You must add your own model InferenceService template under `chart/templates/` for this option to work.

#### Testing model access (before deploying)

If you are bringing your own model (Option A), you can verify the endpoint is reachable **before** installing the chart:

```bash
oc run test-model-access --rm -it --restart=Never \
  --image=registry.access.redhat.com/ubi9/ubi-minimal:latest \
  -- /bin/sh -c 'curl -sf --max-time 10 \
    -H "Authorization: Bearer YOUR_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"model\": \"YOUR_MODEL_NAME\", \"messages\": [{\"role\": \"user\", \"content\": \"Say hello in one word.\"}], \"max_tokens\": 10}" \
    "YOUR_MODEL_ENDPOINT/v1/chat/completions" && echo "" && echo "SUCCESS" || echo "FAILED"'
```

Replace `YOUR_API_KEY`, `YOUR_MODEL_NAME`, and `YOUR_MODEL_ENDPOINT` with your actual values.

### Validating the deployment

> **CONTRIBUTOR TODO: add validation steps**
>
> Tell users how to verify the deployment was successful.
>
> **Include:**
> - Commands to check pod status
> - How to access the application (routes, URLs)
> - How to verify functionality (e.g., "run helm test")
> - Expected output/behavior
>
> **Example:**
>
> 1. Check all pods are running:
>    ```bash
>    oc get pods -n ${PROJECT}
>    ```
>    
> 2. Get the application URL:
>    ```bash
>    echo https://$(oc get route/my-app -n ${PROJECT} --template='{{.spec.host}}')
>    ```
>    
> 3. Test the endpoint is responding:
>    ```bash
>    curl -s https://$(oc get route/my-app -n ${PROJECT} --template='{{.spec.host}}')/health
>    ```
>
> If your quickstart uses a model, you can run the included Helm test:
> ```bash
> helm test my-quickstart --namespace ${PROJECT}
> ```
>
> If your quickstart does not use a model, remove the helm test step and add your own validation steps.

### Delete

> **CONTRIBUTOR TODO: verify deletion steps**
>
> Provide clear instructions to cleanly remove the deployment.
>
> **Include:**
> - Command to uninstall via Helm
> - Any manual cleanup needed (secrets, PVCs, etc.)
> - How to verify complete removal
>
> Users should be able to return their environment to pre-deployment state.
>
> **Example:**
>
> To completely remove the deployment:
>
> 1. Uninstall the Helm release:
>    ```bash
>    helm uninstall my-quickstart --namespace ${PROJECT}
>    ```
>
> 2. (Optional) Delete the project:
>    ```bash
>    oc delete project ${PROJECT}
>    ```

## Repository structure

> **CONTRIBUTOR TODO: update the file tree**
>
> Show the organization of your repository so contributors understand where things are.
>
> Update this to reflect your actual structure - add application code directories, additional config folders, etc.
>
> Keep it concise - don't list every single file, just the important directories and key files.

```
.
├── chart/                    # Helm chart for deploying the quickstart
│   ├── Chart.yaml            # Chart metadata
│   ├── values.yaml           # Default configuration values (model info, resources, etc.)
│   └── templates/            # Kubernetes resource templates
│       ├── test-model-access.yaml  # Helm test for verifying model connectivity
│       └── ...               # Add your templates here (deployments, services, etc.)
├── docs/
│   └── images/               # Architecture diagrams and screenshots
└── README.md
```

> **EXAMPLE:** If your quickstart includes application source code (e.g., a web UI, API server), add it as a sibling directory to chart/. For example:
> ```
> ├── my-app/                 # Application source code
> │   ├── app.py
> │   ├── Containerfile
> │   └── requirements.txt
> ```

## References

> **CONTRIBUTOR TODO: add relevant links**
>
> This section is RECOMMENDED but optional.
>
> **Include links to:**
> - Official documentation for technologies used
> - Blog posts or articles about the use case
> - Research papers or whitepapers
> - Related quickstarts or examples
> - Partner/vendor documentation
>
> **Example:**
> - [OpenShift AI Documentation](https://docs.redhat.com/en/openshift-ai)
> - [LangChain Documentation](https://langchain.com/docs)
> - [Blog: Building HIPAA-Compliant AI Applications](https://example.com/blog)
>
> _Remove this section entirely if you have no references to add._

## Technical details

> **CONTRIBUTOR TODO: add technical deep dive**
>
> This section is OPTIONAL.
>
> **Use this for:**
> - How the components work together technically
> - Implementation details developers would want to know
> - Model details (size, quantization, context window)
> - API endpoints and integration points
> - Performance characteristics
>
> This is where technical depth goes - the earlier sections focus on the use case.
>
> _Remove this section if not needed._

## Tags

> **CONTRIBUTOR TODO: add metadata and tags for publication**
>
> Tags are REQUIRED for publication to redhat.com catalog.
>
> **Fill in:**
> - **Title:** (must match H1 heading, max 64 chars)
> - **Description:** (must match short description, max 160 chars)
> - **Industry:** ONE from the list in CONTRIBUTING.md (e.g., Healthcare, Retail, Financial Services)
> - **Product:** Primary Red Hat product (e.g., OpenShift AI, OpenShift, RHEL)
> - **Use case:** Optional descriptor (e.g., security, automation, productivity)
> - **Partner:** Optional, list partners if applicable (e.g., NVIDIA, Intel)
> - **Contributor org:** Defaults to "Red Hat" unless partner or community contribution
>
> **Example:**
>
> **Title:** Protect patient data with LLM guardrails  
> **Description:** Deploy HIPAA-compliant AI assistants for healthcare with built-in data protection and audit logging  
> **Industry:** Healthcare provider  
> **Product:** OpenShift AI  
> **Use case:** Security, compliance  
> **Partner:** N/A  
> **Contributor org:** Red Hat
