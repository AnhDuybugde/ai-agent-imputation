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

    # Generate missing calendar data for the selected station logic or overall
    # We will compute null counts by month and day
    df_null = df_temp[df_temp.select_dtypes(include=[np.number]).columns].isnull().sum(axis=1)
    df_temp_missing = df_temp[['TimeVN']].copy()
    df_temp_missing['missing_nodes'] = df_null
    
    # Aggregate missingness by date
    df_missing_date = df_temp_missing.groupby(df_temp_missing['TimeVN'].dt.date)['missing_nodes'].sum().reset_index()
    # take top 365 days or typical year
    missing_calendar = [
        {"date": str(row['TimeVN']), "count": int(row['missing_nodes'])}
        for _, row in df_missing_date.tail(100).iterrows() # last 100 days for simplicity
    ]

    return {
        "overall": eda_stats,
        "stations": station_stats,
        "time_series": time_series_sample,
        "missing_calendar": missing_calendar
    }

@router.get("/correlation")
def get_correlation():
    """
    Compute exactly as user requested:
    corr = (pearson.abs() + spearman.abs()) / 2
    threshold = 0.8
    """
    df_num = df_temp.select_dtypes(include=[np.number])
    p_corr = df_num.corr(method='pearson').abs()
    s_corr = df_num.corr(method='spearman').abs()
    
    final_corr = (p_corr + s_corr) / 2
    
    # Format into a network representation
    links = []
    nodes_added = set()
    
    for col1 in final_corr.columns:
        for col2 in final_corr.columns:
            if col1 != col2 and col1 < col2: # Upper triangle to avoid dupes
                val = final_corr.loc[col1, col2]
                if val >= 0.8:
                    links.append({"source": col1, "target": col2, "value": round(val, 3)})
                    nodes_added.add(col1)
                    nodes_added.add(col2)
                    
    nodes = []
    # Collect node standard info
    for st_id in nodes_added:
        st_info = df_st[df_st['WMO_Code'].astype(str) == str(st_id)]
        if not st_info.empty:
            nodes.append({
                "id": str(st_id), 
                "name": st_info['Tên trạm'].values[0]
            })
        else:
            nodes.append({"id": str(st_id), "name": str(st_id)})
            
    return {"nodes": nodes, "links": links}

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

    # 3. Create Artificial Gaps using multiple gaps logic (anti-overlap)
    df = df.dropna().reset_index(drop=True)
    n_rows = len(df)
    
    # gap_type corresponds to days: "1", "3", "5", "7"
    try:
        gap_days = int(gap_type)
    except:
        gap_days = 7
        
    gap_len = gap_days * 8 # 8 rows per day
    num_gaps = 10 # Explicitly set to 10 as in notebook code

    # Find 1:00 AM positions (Fast because TimeVN is already datetime)
    available_starts = np.where(df['TimeVN'].dt.hour == 1)[0].tolist()
    available_starts = [pos for pos in available_starts if pos + gap_len <= n_rows]
    
    np.random.seed(42)  # For reproducibility in evaluation
    gap_indices_list = []
    
    # Ground truth full array
    y_true_full = df[target_col].copy()
    
    for _ in range(num_gaps):
        if not available_starts:
            break
        start_pos = int(np.random.choice(available_starts))
        end_pos = start_pos + gap_len
        
        # Punch hole
        df.loc[start_pos:end_pos-1, target_col] = np.nan
        gap_indices_list.extend(list(range(start_pos, end_pos)))
        
        # Anti-overlap logic
        available_starts = [pos for pos in available_starts if abs(pos - start_pos) > gap_len]
        
    gap_indices = gap_indices_list
    
    # Wait, the gap_len logic here is up to end_pos - 1, which has gap_len elements
    
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
            
        y_t = y_true_full.loc[gap_indices].values[valid]
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

    # 6. Generate Plot Data for Best Model (Focus on the first generated gap to visualize)
    best_model_name = results[0]['model']
    best_pred = model_preds[best_model_name] # predictions for all gaps
    
    # We only visualize the first gap section
    first_gap_start = min(gap_indices) if gap_indices else 0
    first_gap_end = first_gap_start + gap_len
    
    view_start = max(0, first_gap_start - 50)
    view_end = min(n_rows, first_gap_end + 50)
    
    plot_data = []
    for i in range(view_start, view_end):
        row_time = df.loc[i, 'TimeVN']
        # The true value that was originally there
        true_val = float(y_true_full.get(i, df.loc[i, target_col])) if pd.notnull(df.loc[i, target_col]) or i in gap_indices else None
        
        if true_val is None:
            continue
            
        if i in gap_indices and i < first_gap_end:
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
