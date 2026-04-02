import pandas as pd
import numpy as np
import math
from fastapi import APIRouter
from data_manager import load_data, generate_eda
from sklearn.ensemble import RandomForestRegressor
from lightgbm import LGBMRegressor
from sklearn.metrics import mean_squared_error, r2_score

router = APIRouter()

df_temp, df_st = load_data()
eda_stats, station_stats = generate_eda(df_temp, df_st)

def haversine(lat1, lon1, lat2, lon2):
    R = 6371 # Earth radius in km
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = math.sin(dLat/2) * math.sin(dLat/2) + \
        math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * \
        math.sin(dLon/2) * math.sin(dLon/2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

@router.get("/eda")
def get_eda():
    # Provide a time_series sample for a representative station (e.g., 48825 - Hanoi)
    # Get 200 non-null records for plotting
    col = "48825" if "48825" in df_temp.columns else df_temp.select_dtypes(include=[np.number]).columns[0]
    sample_df = df_temp[['TimeVN', col]].dropna().head(200)
    time_series_sample = [
        {
            "time": str(row['TimeVN']),
            "temp": round(float(row[col]), 1)
        } for _, row in sample_df.iterrows()
    ]

    return {
        "overall": eda_stats,
        "stations": station_stats,
        "time_series": time_series_sample
    }

@router.get("/evaluate_gaps")
def evaluate_gaps(station_id: str, gap_type: str = "short"):
    """
    Real AI Agent Evaluation Pipeline processing.
    """
    # 1. Feature Engineering & Spatial Neighbors
    target_col = str(station_id)
    if target_col not in df_temp.columns:
        return {"error": f"Station {station_id} not found."}

    # Find neighbors
    st_info = df_st[df_st['Tên cột gốc (CSV)'] == target_col]
    if st_info.empty:
        # Fallback to nearest WMO matching
        st_info = df_st[df_st['WMO_Code'].astype(str) == target_col]
        
    lat1 = st_info['Vĩ độ (°N)'].values[0]
    lon1 = st_info['Kinh độ (°E)'].values[0]

    distances = []
    for _, row in df_st.iterrows():
        wmo = str(row['WMO_Code'])
        col_name = str(row['Tên cột gốc (CSV)'])
        if col_name != target_col and col_name in df_temp.columns:
            dist = haversine(lat1, lon1, row['Vĩ độ (°N)'], row['Kinh độ (°E)'])
            distances.append((col_name, dist))
    
    distances.sort(key=lambda x: x[1])
    top_3_neighbors = [x[0] for x in distances[:3]]

    # 2. Extract Data
    df = df_temp[['TimeVN', target_col] + top_3_neighbors].copy()
    
    # Feature Engineering (Temporal)
    df['hour'] = df['TimeVN'].dt.hour
    df['month'] = df['TimeVN'].dt.month
    df['dayofyear'] = df['TimeVN'].dt.dayofyear
    
    # Time Series Smoothing/Lag (only for neighbors since target will have gaps)
    for n in top_3_neighbors:
        df[f'{n}_lag1'] = df[n].shift(1)
        df[f'{n}_lag3'] = df[n].shift(3)

    # 3. Create Artificial Gaps
    # Ensure there are no actual NaNs in the synthetic area initially or just drop rows with NaNs
    df = df.dropna().reset_index(drop=True)
    n_rows = len(df)
    
    start_idx = n_rows // 2 # Punch holes in the middle
    if gap_type == "short":
        gap_len = 4
    elif gap_type == "continuous":
        gap_len = 56 # ~7 days (8 samples per day)
    else: # spatial
        gap_len = 1000 # very huge gap simulating broken sensor
        
    gap_indices = list(range(start_idx, start_idx + gap_len))
    
    # Ground truth
    y_true = df.loc[gap_indices, target_col].copy()
    
    # Create the gap in training data
    df.loc[gap_indices, target_col] = np.nan

    # 4. Prepare Models & Training Set
    # Features X: time components + top 3 nearest
    features = ['hour', 'month', 'dayofyear'] + top_3_neighbors + [f'{n}_lag1' for n in top_3_neighbors]

    # Testing & Training Split
    X_test = df.loc[gap_indices, features]
    
    df_train = df.dropna(subset=[target_col] + features)
    X_train = df_train[features]
    y_train = df_train[target_col]

    # Models list
    models = {
        "LOCF (Forward Fill)": "locf",
        "Linear Interpolation": "linear",
        "Spline Interpolation": "spline",
        "Random Forest (Temporal-Spatial)": RandomForestRegressor(n_estimators=50, max_depth=10, random_state=42),
        "LightGBM (Temporal-Spatial)": LGBMRegressor(n_estimators=100, learning_rate=0.1, random_state=42, force_col_wise=True, verbosity=-1)
    }

    results = []
    model_preds = {}

    for name, model in models.items():
        if name in ["LOCF (Forward Fill)", "Linear Interpolation", "Spline Interpolation"]:
            # Baseline Pandas Imputers
            temp_s = df[target_col].copy()
            if name == "LOCF (Forward Fill)":
                temp_s = temp_s.ffill()
            elif name == "Linear Interpolation":
                temp_s = temp_s.interpolate(method='linear')
            else:
                temp_s = temp_s.interpolate(method='spline', order=3)
            
            y_pred = temp_s.loc[gap_indices].values
        else:
            # ML Models
            model.fit(X_train, y_train)
            y_pred = model.predict(X_test)
            
        model_preds[name] = y_pred
            
        # 5. Metrics calculation
        # Clean NaNs if interpolators failed on edges (should not happen in middle)
        valid = ~np.isnan(y_pred)
        if sum(valid) == 0:
            continue
            
        y_t = y_true.values[valid]
        y_p = y_pred[valid]

        rmse = math.sqrt(mean_squared_error(y_t, y_p))
        mae = np.mean(np.abs(y_t - y_p))
        r2 = r2_score(y_t, y_p)
        
        mean_o = np.mean(y_t)
        mean_p = np.mean(y_p)
        std_o = np.std(y_t)
        std_p = np.std(y_p)
        
        fb = 2 * (mean_o - mean_p) / (mean_o + mean_p + 1e-8)
        fsd = 2 * (std_o - std_p) / (std_o + std_p + 1e-8)
        
        score = (1/(rmse+0.01)) + (0.3/max(0.01, abs(fb))) + (0.2/max(0.01, abs(fsd)))
        
        results.append({
            "model": name,
            "rmse": round(rmse, 4),
            "mae": round(mae, 4),
            "r2": round(r2, 4),
            "fb": round(fb, 4),
            "fsd": round(fsd, 4),
            "score": round(score, 2)
        })

    # Sort results
    results.sort(key=lambda x: x['score'], reverse=True)

    # 6. Generate Plot Data for Best Model
    best_model_name = results[0]['model']
    best_pred = model_preds[best_model_name]
    
    view_start = max(0, start_idx - 50)
    view_end = min(n_rows, start_idx + gap_len + 50)
    
    plot_data = []
    for i in range(view_start, view_end):
        row_time = df.loc[i, 'TimeVN']
        # The true value that was originally there before we punched the hole
        true_val = float(y_true.get(i, df.loc[i, target_col])) if pd.notnull(df.loc[i, target_col]) or i in gap_indices else None
        
        if true_val is None:
            continue
            
        if i in gap_indices:
            p_idx = gap_indices.index(i)
            # Make sure it's valid
            pred_val = float(best_pred[p_idx]) if p_idx < len(best_pred) else None
            plot_data.append({
                "time": str(row_time),
                "true_val": round(true_val, 2),
                "gap_val": None, # it's null in the gap
                "imputed_val": round(pred_val, 2) if pred_val else None
            })
        else:
            plot_data.append({
                "time": str(row_time),
                "true_val": round(true_val, 2),
                "gap_val": round(true_val, 2), # visible as context
                "imputed_val": None
            })

    return {
        "station_id": station_id,
        "gap_type": gap_type,
        "best_model": best_model_name,
        "evaluations": results,
        "plot_data": plot_data,
        "metrics_guide": {
            "FB": "Fractional Bias: -0.3 to 0.3 shows well preserved mean",
            "FSD": "Fraction of Std Dev: Close to 0 shows well preserved variance"
        }
    }
