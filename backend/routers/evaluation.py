import pandas as pd
import numpy as np
import math
from fastapi import APIRouter, Query
from data_manager import load_data, generate_eda
from sice_algorithm import get_paper_weighted_seed, get_ml_models, run_ml_imputation
from sklearn.metrics import mean_squared_error, r2_score

router = APIRouter()

@router.get("/eda")
def get_eda(workspace_id: str = "default"):
    df_temp, df_st = load_data(workspace_id)
    eda_stats, station_stats = generate_eda(df_temp, df_st)
    
    # Provide a time_series sample for a representative station
    target_col = None
    for c in df_temp.columns:
        if c != 'Time':
            target_col = c
            break
            
    # Sample data
    sample_df = df_temp[['Time', target_col]].dropna().head(200)
    time_series_sample = [
        {"time": str(row['Time']), "temp": round(float(row[target_col]), 1)}
        for _, row in sample_df.iterrows()
    ]

    # Generate missing calendar data
    df_num = df_temp.select_dtypes(include=[np.number])
    df_null = df_num.isnull().sum(axis=1)
    df_temp_missing = df_temp[['Time']].copy()
    df_temp_missing['missing_nodes'] = df_null
    
    # Aggregate missingness by date
    df_missing_date = df_temp_missing.groupby(df_temp_missing['Time'].dt.date)['missing_nodes'].sum().reset_index()
    missing_calendar = [
        {"date": str(row['Time']), "count": int(row['missing_nodes'])}
        for _, row in df_missing_date.tail(100).iterrows()
    ]

    return {
        "overall": eda_stats,
        "stations": station_stats,
        "time_series": time_series_sample,
        "missing_calendar": missing_calendar
    }

@router.get("/correlation")
def get_correlation(workspace_id: str = "default"):
    df_temp, df_st = load_data(workspace_id)
    
    df_num = df_temp.select_dtypes(include=[np.number])
    if df_num.empty or len(df_num.columns) < 2:
        return {"nodes": [], "links": []}
        
    p_corr = df_num.corr(method='pearson').abs()
    s_corr = df_num.corr(method='spearman').abs()
    
    final_corr = (p_corr + s_corr) / 2
    
    links = []
    nodes_added = set()
    
    for col1 in final_corr.columns:
        for col2 in final_corr.columns:
            if col1 != col2 and col1 < col2:
                val = final_corr.loc[col1, col2]
                if pd.notna(val) and val >= 0.8:
                    links.append({"source": str(col1), "target": str(col2), "value": round(val, 3)})
                    nodes_added.add(col1)
                    nodes_added.add(col2)
                    
    nodes = []
    for st_id in nodes_added:
        st_info = df_st[df_st['id'].astype(str) == str(st_id)]
        if not st_info.empty:
            nodes.append({"id": str(st_id), "name": str(st_info['name'].values[0])})
        else:
            nodes.append({"id": str(st_id), "name": str(st_id)})
            
    return {"nodes": nodes, "links": links}

@router.get("/evaluate_gaps")
def evaluate_gaps(station_id: str, gap_type: str = "3", workspace_id: str = "default"):
    """
    SICE AI Agent Evaluation Pipeline.
    (Bidirectional LGBM Pre-impute + OvR Regression)
    """
    df_temp, _ = load_data(workspace_id)
    target_col = str(station_id)
    if target_col not in df_temp.columns:
        return {"error": f"Station {station_id} not found in workspace."}

    df = df_temp.copy()
    
    # 1. Create artificial gaps in the target column
    # Only keep periods where target_col is healthy to simulate gaps accurately
    valid_mask = df[target_col].notna()
    
    try:
        gap_days = int(gap_type)
    except Exception:
        gap_days = 3
    gap_len = gap_days * 8 # assuming 8 records/day
    num_gaps = 5 # limit gaps to 5 in Model Arena to ensure fast feedback
    
    # Find start positions safely
    available_starts = np.where((df['Time'].dt.hour == 1) & valid_mask)[0].tolist()
    available_starts = [pos for pos in available_starts if pos + gap_len < len(df)]
    np.random.seed(42)  
    
    gap_indices_list = []
    y_true_full = df[target_col].copy()
    
    for _ in range(num_gaps):
        if not available_starts: break
        start_pos = int(np.random.choice(available_starts))
        end_pos = start_pos + gap_len
        
        # Verify gap has valid data initially
        if df.loc[start_pos:end_pos-1, target_col].isna().any():
            available_starts.remove(start_pos)
            continue
            
        df.loc[start_pos:end_pos-1, target_col] = np.nan
        gap_indices_list.extend(list(range(start_pos, end_pos)))
        
        # anti-overlap
        available_starts = [pos for pos in available_starts if abs(pos - start_pos) > gap_len]
        
    gap_indices = gap_indices_list
    
    if len(gap_indices) == 0:
        return {"error": "Could not generate valid gaps for evaluation. Data might be too sparse."}

    # 2. SICE Phase 1: Pre-imputation (Bidirectional Seed)
    df_seed = get_paper_weighted_seed(df)
    
    # 3. SICE Phase 2: OvR Models Evaluation
    models = get_ml_models()
    results = []
    model_preds = {}
    
    for name in models.keys():
        # OvR refinement
        df_imp = run_ml_imputation(df, df_seed, name)
        y_pred_full = df_imp[target_col]
        
        # Extract predictions for the gap indices
        y_pred = y_pred_full.loc[gap_indices].values
        valid = ~np.isnan(y_pred)
        if sum(valid) == 0:
            continue
            
        y_t = y_true_full.loc[gap_indices].values[valid]
        y_p = y_pred[valid]
        
        rmse = math.sqrt(mean_squared_error(y_t, y_p))
        mae = np.mean(np.abs(y_t - y_p))
        r2 = r2_score(y_t, y_p)
        
        # NSE metric as defined by user in SICE logic
        nse = 1 - (np.sum((y_t - y_p)**2) / (np.sum((y_t - np.mean(y_t))**2) + 1e-9))
        
        score = (1/(rmse+0.01)) + (max(0, nse) * 0.5) 
        
        results.append({
            "model": name,
            "rmse": round(rmse, 4),
            "mae": round(mae, 4),
            "r2": round(r2, 4),
            "nse": round(nse, 4),
            "score": round(score, 2)
        })
        model_preds[name] = y_pred_full # store full series

    # Sort results
    results.sort(key=lambda x: x['score'], reverse=True)

    # 4. Generate Plot Data for Best Model
    best_model_name = results[0]['model']
    best_pred_full = model_preds[best_model_name]
    
    first_gap_start = min(gap_indices)
    first_gap_end = first_gap_start + gap_len
    
    view_start = max(0, first_gap_start - 30)
    view_end = min(len(df), first_gap_end + 30)
    
    plot_data = []
    for i in range(view_start, view_end):
        row_time = df.loc[i, 'Time']
        true_val = float(y_true_full.get(i, np.nan))
        
        if pd.isna(true_val): continue
            
        if i in gap_indices and i < first_gap_end:
            p_val = best_pred_full.iloc[i]
            pred_val = float(p_val) if pd.notna(p_val) else None
            plot_data.append({
                "time": str(row_time),
                "true_val": round(true_val, 2),
                "gap_val": None,
                "imputed_val": round(pred_val, 2) if pred_val else None
            })
        else:
            plot_data.append({
                "time": str(row_time),
                "true_val": round(true_val, 2),
                "gap_val": round(true_val, 2),
                "imputed_val": None
            })

    return {
        "station_id": station_id,
        "gap_type": gap_type,
        "best_model": best_model_name,
        "evaluations": results,
        "plot_data": plot_data,
        "metrics_guide": {
            "NSE": "Nash-Sutcliffe Efficiency (1 is perfect match)",
            "RMSE": "Root Mean Square Error (Lower is better)"
        }
    }
