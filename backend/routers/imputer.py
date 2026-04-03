from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
import pandas as pd
import numpy as np
import os
import math
import uuid
import time
from data_manager import load_data, get_workspace_dir
from sice_algorithm import get_paper_weighted_seed, run_ml_imputation, get_ml_models
from sklearn.metrics import mean_squared_error

router = APIRouter()

def agent_auto_select_model(df_temp: pd.DataFrame) -> str:
    """
    Autonomous AI Logic:
    Takes the dataset, creates a small mock gap on a valid column,
    runs the 6 available models specifically on that segment,
    and returns the name of the model that achieved the lowest RMSE.
    """
    df_num = df_temp.select_dtypes(include=[np.number])
    if df_num.empty:
        return "HGBT" # Fallback
        
    # Find a column with enough valid data
    target_col = None
    for col in df_num.columns:
        if df_num[col].notna().sum() > 50:
            target_col = col
            break
            
    if not target_col:
        return "HGBT"
        
    # Create a small sandbox dataframe
    # We take the first 100 valid rows to speed up the test
    df_test = df_temp.dropna(subset=[target_col]).head(200).copy()
    if len(df_test) < 20:
        return "Ridge" # Too small for HGBT, use Ridge
        
    # Punch a mock hole (len=10)
    start_pos = 10
    end_pos = min(start_pos + 10, len(df_test)-1)
    
    y_true = df_test.loc[start_pos:end_pos-1, target_col].copy()
    df_test.loc[start_pos:end_pos-1, target_col] = np.nan
    
    # Fast Seed
    df_seed = get_paper_weighted_seed(df_test)
    
    # Race the models
    models = get_ml_models()
    best_model = "HGBT"
    best_rmse = float('inf')
    
    for name in models.keys():
        try:
            df_imp = run_ml_imputation(df_test, df_seed, name)
            y_pred = df_imp.loc[start_pos:end_pos-1, target_col]
            rmse = math.sqrt(mean_squared_error(y_true, y_pred))
            if rmse < best_rmse:
                best_rmse = rmse
                best_model = name
        except Exception:
            continue
            
    return best_model

@router.post("/run_full_sice")
def run_full_sice_autonomous(workspace_id: str = "default"):
    """
    Executes the FULLY AUTONOMOUS SICE imputation pipeline.
    It automatically evaluates, picks the best model, runs imputation,
    and returns the file mapping.
    """
    df_temp, _ = load_data(workspace_id)
    
    if df_temp.empty:
        raise HTTPException(400, "Dataset is empty.")
        
    df_num = df_temp.select_dtypes(include=[np.number])
    target_col = df_num.columns[0] if len(df_num.columns) > 0 else None
    
    # Gap Simulation Logic (3 days = 24 rows) for Sandbox/Default
    comparison_snippet = []
    gap_indices = []
    y_true_original = {}
    
    if workspace_id == "default" or not df_num.isna().any().any():
        if target_col is not None and len(df_temp) > 200:
            # Find a safe spot to punch 24 rows (around row 100 to ensure we have past/future data)
            start_pos = 100
            end_pos = start_pos + 24
            
            # Save original values
            for i in range(start_pos, end_pos):
                y_true_original[i] = float(df_temp.loc[i, target_col])
                df_temp.loc[i, target_col] = np.nan
            gap_indices = list(range(start_pos, end_pos))
            print(f"Agent artificially injected a 24-row gap into {target_col} for simulation.")
            
    df_num = df_temp.select_dtypes(include=[np.number])
    if not df_num.isna().any().any():
        raise HTTPException(400, "Dataset contains no missing values and could not be simulated.")
        
    print(f"Agent starting autonomous analysis for {workspace_id}...")
    optimal_model = agent_auto_select_model(df_temp)
    print(f"Agent selected {optimal_model} as the optimal refinement algorithm.")

    # Phase 1: Seed
    print(f"Starting Seed generation...")
    df_seed = get_paper_weighted_seed(df_temp)
    
    # Phase 2: OvR Imputation
    print(f"Starting OvR formulation with {optimal_model}...")
    df_imp = run_ml_imputation(df_temp, df_seed, optimal_model)
    
    # Extract comparison if we made gaps
    if gap_indices and target_col:
        time_col = 'Time' if 'Time' in df_imp.columns else df_imp.columns[0]
        for i in gap_indices[:15]:  # limit to 15 rows for UI table display
            comparison_snippet.append({
                "time": str(df_imp.loc[i, time_col]),
                "original": y_true_original.get(i, None),
                "imputed": round(float(df_imp.loc[i, target_col]), 2)
            })
            
    out_dir = get_workspace_dir(workspace_id)
    if not out_dir:
        out_dir = os.path.join(os.path.dirname(__file__), "..", "workspaces", "default_dist")
        os.makedirs(out_dir, exist_ok=True)
        
    out_filename = f"imputed_{optimal_model}_{int(time.time())}.csv"
    out_path = os.path.join(out_dir, out_filename)
    
    df_imp.to_csv(out_path, index=False)
    
    return {
        "status": "success",
        "message": "Imputation complete",
        "agent_selected_model": optimal_model,
        "download_url": f"/api/imputation/download?workspace_id={workspace_id}&filename={out_filename}",
        "imputed_stats": {
            "total_rows_filled": gap_indices and len(gap_indices) or int(df_num.isna().sum().sum())
        },
        "comparison_snippet": comparison_snippet
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
