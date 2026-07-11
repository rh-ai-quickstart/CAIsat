"""
CAIsat Backend API

FastAPI service that serves satellite imagery metadata and images from S4 storage
to the frontend application.
"""

from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
import boto3
from botocore.exceptions import ClientError
import json
import os
from typing import Dict, Any, List

# Configuration from environment variables
S3_ENDPOINT = os.getenv('S3_ENDPOINT', 'http://s4.caisat.svc.cluster.local:7480')
S3_ACCESS_KEY = os.getenv('S3_ACCESS_KEY', 'caisat-access-key')
S3_SECRET_KEY = os.getenv('S3_SECRET_KEY', 'caisat-secret-key-change-in-production')
S3_BUCKET = os.getenv('S3_BUCKET', 'satellite-images')

# Initialize FastAPI app
app = FastAPI(
    title="CAIsat API",
    description="Backend API for CAIsat satellite imagery change detection platform",
    version="1.0.0"
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize S3 client
s3_client = boto3.client(
    's3',
    endpoint_url=S3_ENDPOINT,
    aws_access_key_id=S3_ACCESS_KEY,
    aws_secret_access_key=S3_SECRET_KEY
)

print(f"CAIsat Backend API starting...")
print(f"  S3 Endpoint: {S3_ENDPOINT}")
print(f"  S3 Bucket: {S3_BUCKET}")


@app.get("/")
async def root():
    """Root endpoint - API information"""
    return {
        "service": "CAIsat Backend API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "endpoints": {
            "areas": "/api/areas",
            "stats": "/api/areas/{location}/stats",
            "images": "/api/areas/{location}/images/{date}",
            "health": "/health"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Test S3 connection
        s3_client.list_buckets()
        return {
            "status": "healthy",
            "s3_connection": "ok",
            "bucket": S3_BUCKET
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "s3_connection": "failed",
            "error": str(e)
        }


@app.get("/api/areas")
async def get_areas() -> Dict[str, Any]:
    """
    Get list of all monitored areas with summary statistics.

    Returns metadata/areas.json from S4 storage.
    """
    try:
        # Fetch areas.json from S3
        response = s3_client.get_object(
            Bucket=S3_BUCKET,
            Key='metadata/areas.json'
        )

        # Parse JSON
        areas_data = json.loads(response['Body'].read().decode('utf-8'))

        return areas_data

    except ClientError as e:
        if e.response['Error']['Code'] == 'NoSuchKey':
            raise HTTPException(
                status_code=404,
                detail="Areas metadata not found. Run analysis pipeline first."
            )
        else:
            raise HTTPException(
                status_code=500,
                detail=f"S3 error: {str(e)}"
            )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching areas: {str(e)}"
        )


@app.get("/api/areas/{location}/stats")
async def get_location_stats(location: str) -> Dict[str, Any]:
    """
    Get detailed statistics for a specific location.

    Args:
        location: Location ID (las_vegas, dubai, death_valley, phoenix)

    Returns metadata/{location}-stats.json from S4 storage.
    """
    # Validate location
    valid_locations = ['las_vegas', 'dubai', 'death_valley', 'phoenix']
    if location not in valid_locations:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid location. Must be one of: {', '.join(valid_locations)}"
        )

    try:
        # Fetch stats JSON from S3
        response = s3_client.get_object(
            Bucket=S3_BUCKET,
            Key=f'metadata/{location}-stats.json'
        )

        # Parse JSON
        stats_data = json.loads(response['Body'].read().decode('utf-8'))

        return stats_data

    except ClientError as e:
        if e.response['Error']['Code'] == 'NoSuchKey':
            raise HTTPException(
                status_code=404,
                detail=f"Statistics not found for {location}. Run analysis pipeline first."
            )
        else:
            raise HTTPException(
                status_code=500,
                detail=f"S3 error: {str(e)}"
            )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching stats: {str(e)}"
        )


@app.get("/api/areas/{location}/images/{date}")
async def get_location_image(location: str, date: str):
    """
    Get satellite image for a specific location and date.

    Args:
        location: Location ID (las_vegas, dubai, death_valley, phoenix)
        date: Date in YYYY-MM-DD format (e.g., 2024-05-15)

    Returns PNG image from S4 storage.
    """
    # Validate location
    valid_locations = ['las_vegas', 'dubai', 'death_valley', 'phoenix']
    if location not in valid_locations:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid location. Must be one of: {', '.join(valid_locations)}"
        )

    # Validate date format (basic check)
    if len(date) != 10 or date[4] != '-' or date[7] != '-':
        raise HTTPException(
            status_code=400,
            detail="Invalid date format. Use YYYY-MM-DD (e.g., 2024-05-15)"
        )

    try:
        # Construct S3 key (flat structure: location-date.png)
        image_key = f"{location}-{date}.png"

        # Fetch image from S3
        response = s3_client.get_object(
            Bucket=S3_BUCKET,
            Key=image_key
        )

        # Return image with correct content type
        image_data = response['Body'].read()

        return Response(
            content=image_data,
            media_type="image/png",
            headers={
                "Cache-Control": "public, max-age=86400",  # Cache for 1 day
                "Content-Disposition": f'inline; filename="{location}-{date}.png"'
            }
        )

    except ClientError as e:
        if e.response['Error']['Code'] == 'NoSuchKey':
            raise HTTPException(
                status_code=404,
                detail=f"Image not found for {location} on {date}"
            )
        else:
            raise HTTPException(
                status_code=500,
                detail=f"S3 error: {str(e)}"
            )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching image: {str(e)}"
        )


@app.get("/api/areas/{location}/images")
async def list_location_images(location: str) -> List[str]:
    """
    List all available image dates for a location.

    Args:
        location: Location ID (las_vegas, dubai, death_valley, phoenix)

    Returns list of available dates.
    """
    # Validate location
    valid_locations = ['las_vegas', 'dubai', 'death_valley', 'phoenix']
    if location not in valid_locations:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid location. Must be one of: {', '.join(valid_locations)}"
        )

    try:
        # List all images for this location
        prefix = f"{location}-"
        response = s3_client.list_objects_v2(
            Bucket=S3_BUCKET,
            Prefix=prefix
        )

        if 'Contents' not in response:
            return []

        # Extract dates from filenames
        dates = []
        for obj in response['Contents']:
            key = obj['Key']
            if key.endswith('.png'):
                # Extract date from "location-YYYY-MM-DD.png"
                date = key.replace(f"{location}-", "").replace(".png", "")
                dates.append(date)

        return sorted(dates)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error listing images: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
