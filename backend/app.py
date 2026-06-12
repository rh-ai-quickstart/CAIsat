"""
FastAPI backend for Zoom & Enhance application.

This service receives images from the frontend, sends them to the
OpenShift AI model endpoint, and returns the enhanced result.
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import aiohttp
import numpy as np
from PIL import Image
import io
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Zoom & Enhance API")

# Simple in-memory counter for enhancements
enhancement_counter = 0

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model endpoint from environment variable (no default - must be configured)
MODEL_ENDPOINT = os.getenv("MODEL_ENDPOINT")

if not MODEL_ENDPOINT:
    raise ValueError(
        "MODEL_ENDPOINT environment variable must be set. "
        "Example: http://model-service.namespace.svc.cluster.local:8080/v2/models/model-name/infer"
    )


def preprocess_image(image: Image.Image) -> dict:
    """
    Preprocess image for ONNX model input.

    Args:
        image: PIL Image

    Returns:
        JSON payload for KServe v2 inference protocol
    """
    # Convert to RGB if needed
    if image.mode != 'RGB':
        image = image.convert('RGB')

    # Resize to 256x256 for consistent processing
    image = image.resize((256, 256), Image.LANCZOS)

    # Convert to numpy array and normalize to [0, 1]
    img_array = np.array(image).astype(np.float32) / 255.0

    # Convert HWC to CHW format (channels first)
    img_array = np.transpose(img_array, (2, 0, 1))

    # Add batch dimension: (1, 3, H, W)
    img_array = np.expand_dims(img_array, 0)

    # Create KServe v2 inference request
    # https://github.com/kserve/kserve/blob/master/docs/predict-api/v2/required_api.md
    request_data = {
        "inputs": [
            {
                "name": "input",
                "shape": list(img_array.shape),
                "datatype": "FP32",
                "data": img_array.flatten().tolist()
            }
        ]
    }

    return request_data


def postprocess_output(output_data: dict) -> Image.Image:
    """
    Convert model output to PIL Image.

    Args:
        output_data: KServe v2 inference response

    Returns:
        PIL Image
    """
    # Extract output from response
    outputs = output_data["outputs"][0]
    shape = outputs["shape"]
    data = outputs["data"]

    # Reshape to (1, 3, H, W)
    output_array = np.array(data).reshape(shape)

    # Remove batch dimension
    output_array = output_array[0]

    # Convert CHW to HWC
    output_array = np.transpose(output_array, (1, 2, 0))

    # Clip to [0, 1] and convert to uint8
    output_array = np.clip(output_array, 0, 1)
    output_array = (output_array * 255).astype(np.uint8)

    return Image.fromarray(output_array)


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "service": "Zoom & Enhance API",
        "status": "operational",
        "model_endpoint": MODEL_ENDPOINT
    }


@app.get("/health")
async def health():
    """Kubernetes health check."""
    return {"status": "healthy"}


@app.get("/api/stats")
async def get_stats():
    """Get enhancement statistics."""
    return {
        "total_enhancements": enhancement_counter,
        "status": "operational"
    }


@app.post("/api/enhance")
async def enhance_image(image: UploadFile = File(...)):
    """
    Enhance an uploaded image using the AI model.

    Args:
        image: Uploaded image file

    Returns:
        Enhanced image
    """
    global enhancement_counter

    try:
        print("=== ENHANCE REQUEST STARTED ===")
        # Read and decode image
        print("Reading uploaded file...")
        contents = await image.read()
        print(f"File size: {len(contents)} bytes")

        print("Decoding image...")
        img = Image.open(io.BytesIO(contents))
        print(f"Received image: {img.size[0]}x{img.size[1]}, mode: {img.mode}")

        # Preprocess image
        print("Preprocessing image...")
        request_data = preprocess_image(img)
        print(f"Input shape: {request_data['inputs'][0]['shape']}")
        print(f"Data points: {len(request_data['inputs'][0]['data'])}")

        print(f"Sending request to model endpoint: {MODEL_ENDPOINT}")

        # Send to model endpoint
        print("Creating HTTP session...")
        async with aiohttp.ClientSession() as session:
            print("Sending POST request to model...")
            async with session.post(
                MODEL_ENDPOINT,
                json=request_data,
                timeout=aiohttp.ClientTimeout(total=300)  # 5 minutes for model inference
            ) as response:
                print(f"Model response status: {response.status}")
                if response.status != 200:
                    error_text = await response.text()
                    print(f"Model endpoint error: {error_text}")
                    raise HTTPException(
                        status_code=502,
                        detail=f"Model inference failed: {error_text}"
                    )

                print("Reading JSON response...")
                result = await response.json()
                print(f"Response keys: {list(result.keys())}")

        print("Model inference successful")

        # Postprocess output
        print("Starting postprocess...")
        enhanced_img = postprocess_output(result)
        print(f"Enhanced image from model: {enhanced_img.size[0]}x{enhanced_img.size[1]}")

        # Resize to 512x512 (2x instead of 4x) for better usability
        enhanced_img = enhanced_img.resize((512, 512), Image.LANCZOS)
        print(f"Resized to: {enhanced_img.size[0]}x{enhanced_img.size[1]}")

        # Convert to bytes
        print("Converting to PNG bytes...")
        img_byte_arr = io.BytesIO()
        enhanced_img.save(img_byte_arr, format='PNG')
        png_size = img_byte_arr.tell()  # Get size BEFORE seek
        img_byte_arr.seek(0)
        print(f"PNG size: {png_size} bytes")

        print("Sending response...")

        # Increment counter on successful enhancement
        enhancement_counter += 1
        print(f"Total enhancements: {enhancement_counter}")

        response = StreamingResponse(
            img_byte_arr,
            media_type="image/png",
            headers={"Content-Disposition": "inline; filename=enhanced.png"}
        )
        print("=== ENHANCE REQUEST COMPLETED ===")
        return response

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_detail = f"{type(e).__name__}: {str(e)}"
        print(f"Error processing image: {error_detail}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=error_detail)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
