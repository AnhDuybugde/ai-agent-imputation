from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import pandas as pd
import uuid
from data_manager import save_workspace_files
import io
import time

router = APIRouter()

@router.post("/upload")
async def upload_workspace(time_series: UploadFile = File(...), station_meta: UploadFile = File(...)):
    if not time_series.filename.endswith('.csv') or not station_meta.filename.endswith('.csv'):
        raise HTTPException(400, "Both files must be valid CSVs")
        
    workspace_id = f"custom_{str(uuid.uuid4())[:8]}_{int(time.time())}"
    
    try:
        # Read files into pandas
        ts_content = await time_series.read()
        meta_content = await station_meta.read()
        
        df_time = pd.read_csv(io.BytesIO(ts_content))
        df_meta = pd.read_csv(io.BytesIO(meta_content))
        
        # Validation checks
        if df_time.empty or df_meta.empty:
            raise ValueError("Uploaded files cannot be empty.")
            
        # Optional: standardize metadata columns here if they upload non-standard names
        # But we assume the UI provides guidance. Let's do basic mapping if not found:
        col_lower = [c.lower() for c in df_meta.columns]
        if 'id' not in col_lower or 'lat' not in col_lower or 'lon' not in col_lower:
            # We don't force strict fail yet, but we will print a warning
            pass
            
        # Save to local disk
        save_workspace_files(workspace_id, df_time, df_meta)
        
        return JSONResponse({
            "message": "Workspace initialized successfully",
            "workspace_id": workspace_id,
            "ts_shape": df_time.shape,
            "meta_shape": df_meta.shape
        })
        
    except pd.errors.EmptyDataError:
        raise HTTPException(400, "One of the CSV files is empty or corrupted.")
    except Exception as e:
        raise HTTPException(500, f"Error processing file: {str(e)}")
