# CAIsat Architecture Diagram

This directory should contain the architecture diagram referenced in the main README.

## Required Image

**File**: `architecture-diagram.png`

**Content**: The diagram should illustrate:
- User interaction with web browser
- Frontend (React) component
- Backend (FastAPI) component  
- Model Server (MLServer/ONNX) component
- Data flow showing:
  - Image upload from user
  - Preprocessing in backend
  - KServe v2 inference request to model
  - Enhanced image response back to user

**Format**: PNG, 1200-1600px wide recommended

**Alt Text**: Already included in main README as:
> "CAIsat Architecture"

## Tools

You can create the diagram using:
- Draw.io / diagrams.net
- Lucidchart
- Microsoft Visio
- Any diagramming tool that exports to PNG

## Style Guidelines

- Use clear, simple shapes (rectangles for components)
- Show data flow with arrows
- Label each component clearly
- Use consistent colors (e.g., blue for OpenShift components)
- Include the OpenShift AI / Red Hat branding if appropriate
