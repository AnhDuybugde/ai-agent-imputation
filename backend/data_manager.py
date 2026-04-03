import pandas as pd
import numpy as np
import os
import shutil

# Default Paths (Vietnam dataset)
DEFAULT_DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "dataset", "data_43_temp.csv")
DEFAULT_STATION_PATH = os.path.join(os.path.dirname(__file__), "..", "dataset", "vietnam_stations_43.csv")

# Workspaces directory
WORKSPACES_DIR = os.path.join(os.path.dirname(__file__), "workspaces")
os.makedirs(WORKSPACES_DIR, exist_ok=True)

def get_workspace_dir(workspace_id: str):
    if not workspace_id or workspace_id == "default":
        return None
    ws_path = os.path.join(WORKSPACES_DIR, workspace_id)
    os.makedirs(ws_path, exist_ok=True)
    return ws_path

def save_workspace_files(workspace_id: str, df_time: pd.DataFrame, df_meta: pd.DataFrame):
    ws_dir = get_workspace_dir(workspace_id)
    time_path = os.path.join(ws_dir, "time_series.csv")
    meta_path = os.path.join(ws_dir, "station_meta.csv")
    df_time.to_csv(time_path, index=False)
    df_meta.to_csv(meta_path, index=False)

def load_data(workspace_id: str = "default"):
    ws_dir = get_workspace_dir(workspace_id)
    
    if ws_dir and os.path.exists(os.path.join(ws_dir, "time_series.csv")) and os.path.exists(os.path.join(ws_dir, "station_meta.csv")):
        df_temp = pd.read_csv(os.path.join(ws_dir, "time_series.csv"))
        df_st = pd.read_csv(os.path.join(ws_dir, "station_meta.csv"))
        
        # Try to parse the first column as datetime if its name contains 'Time' or 'Date'
        time_col = df_temp.columns[0]
        for col in df_temp.columns:
            if 'time' in col.lower() or 'date' in col.lower():
                time_col = col
                break
        df_temp[time_col] = pd.to_datetime(df_temp[time_col], errors='coerce')
        
    else:
        # Fallback to default
        df_temp = pd.read_csv(DEFAULT_DATA_PATH, parse_dates=["TimeVN"])
        df_st = pd.read_csv(DEFAULT_STATION_PATH)
        
        # Rename default station columns (WMO Code matching)
        name_mapping = dict(zip(df_st['Tên cột gốc (CSV)'], df_st['WMO_Code'].astype(str)))
        df_temp = df_temp.rename(columns=name_mapping)
        # Rename standard lat/lon columns to expected generalized names
        df_st = df_st.rename(columns={
            'WMO_Code': 'id',
            'Tên trạm': 'name',
            'Vĩ độ (°N)': 'lat',
            'Kinh độ (°E)': 'lon'
        })
        # Standardize the time column name for the frontend
        df_temp = df_temp.rename(columns={'TimeVN': 'Time'})
        
    return df_temp, df_st

def generate_eda(df_temp, df_st):
    # Time column is assumed to be the first datetime column or 'Time'
    time_col = 'Time' if 'Time' in df_temp.columns else df_temp.columns[0]
    
    numeric_cols = df_temp.select_dtypes(include=[np.number]).columns
    
    # Overall summary
    eda_stats = {
        "total_records": len(df_temp),
        "total_missing": int(df_temp[numeric_cols].isnull().sum().sum()),
        "time_start": str(df_temp[time_col].min()),
        "time_end": str(df_temp[time_col].max()),
    }
    
    # Station-wise stats
    station_stats = []
    for st_id in numeric_cols:
        # Match by ID string flexibly
        st_info = df_st[df_st['id'].astype(str) == str(st_id)]
        if not st_info.empty:
            st_name = st_info['name'].values[0]
            lat = st_info['lat'].values[0]
            lon = st_info['lon'].values[0]
        else:
            st_name = "Unknown"
            lat, lon = 0.0, 0.0
            
        col_data = df_temp[st_id]
        station_stats.append({
            "id": str(st_id),
            "name": st_name,
            "lat": lat,
            "lon": lon,
            "mean": float(col_data.mean()) if not pd.isna(col_data.mean()) else 0.0,
            "std": float(col_data.std()) if not pd.isna(col_data.std()) else 0.0,
            "min": float(col_data.min()) if not pd.isna(col_data.min()) else 0.0,
            "max": float(col_data.max()) if not pd.isna(col_data.max()) else 0.0,
            "missing_count": int(col_data.isnull().sum())
        })
        
    return eda_stats, station_stats
