from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
import pandas as pd
import numpy as np
import os
import uuid
import time
from data_manager import load_data, get_workspace_dir
from sice_algorithm import get_paper_weighted_seed, run_ml_imputation

router = APIRouter()

@router.post("/run_full_sice")
def run_full_sice(model_name: str = "LGBM", workspace_id: str = "default"):
    """
    Executes the full SICE imputation pipeline on the entire dataset
    and returns a path/link to download the filled CSV.
    """
    df_temp, _ = load_data(workspace_id)
    
    if df_temp.empty:
        raise HTTPException(400, "Dataset is empty.")
        
    df_num = df_temp.select_dtypes(include=[np.number])
    if not df_num.isna().any().any():
        raise HTTPException(400, "Dataset contains no missing values.")
        
    # Phase 1: Seed
    print(f"Starting Seed generation for {workspace_id}...")
    df_seed = get_paper_weighted_seed(df_temp)
    
    # Phase 2: OvR Imputation
    print(f"Starting OvR formulation with {model_name}...")
    df_imp = run_ml_imputation(df_temp, df_seed, model_name)
    
    # Create final output folder
    out_dir = get_workspace_dir(workspace_id)
    if not out_dir:
        # Default scenario fallback
        out_dir = os.path.join(os.path.dirname(__file__), "..", "workspaces", "default_dist")
        os.makedirs(out_dir, exist_ok=True)
        
    out_filename = f"imputed_{model_name}_{int(time.time())}.csv"
    out_path = os.path.join(out_dir, out_filename)
    
    # Save mapping WMO code mappings back if this is the default dataset
    # By default, df_imp has the generalized IDs. We will just save it as is.
    df_imp.to_csv(out_path, index=False)
    
    return {
        "status": "success",
        "message": "Imputation complete",
        "download_url": f"/api/imputation/download?workspace_id={workspace_id}&filename={out_filename}",
        "imputed_stats": {
            "total_rows_filled": df_num.isna().sum().sum()
        }
    }

@router.get("/download")
def download_result(workspace_id: str, filename: str):
    out_dir = get_workspace_dir(workspace_id)
    if not out_dir and workspace_id == "default":
         out_dir = os.path.join(os.path.dirname(__file__), "..", "workspaces", "default_dist")
         
    file_path = os.path.join(out_dir, filename)
    if not os.path.exists(file_path):
        raise HTTPException(404, "File not found")
        
    return FileResponse(path=file_path, filename=filename, media_type="text/csv")
