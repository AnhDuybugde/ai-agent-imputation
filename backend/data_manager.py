import pandas as pd
import numpy as np
import os

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "dataset", "data_43_temp.csv")
STATION_PATH = os.path.join(os.path.dirname(__file__), "..", "dataset", "vietnam_stations_43.csv")

def load_data():
    df_temp = pd.read_csv(DATA_PATH, parse_dates=["TimeVN"])
    df_st = pd.read_csv(STATION_PATH)
    
    # Clean up station codes mapping: Some column names are '48/86' instead of '48886'
    name_mapping = dict(zip(df_st['Tên cột gốc (CSV)'], df_st['WMO_Code'].astype(str)))
    df_temp = df_temp.rename(columns=name_mapping)
    
    return df_temp, df_st

def generate_eda(df_temp, df_st):
    numeric_cols = df_temp.select_dtypes(include=[np.number]).columns
    
    # Overall summary
    eda_stats = {
        "total_records": len(df_temp),
        "total_missing": int(df_temp[numeric_cols].isnull().sum().sum()),
        "time_start": str(df_temp['TimeVN'].min()),
        "time_end": str(df_temp['TimeVN'].max()),
    }
    
    # Station-wise stats
    station_stats = []
    for st_id in numeric_cols:
        st_info = df_st[df_st['WMO_Code'].astype(str) == str(st_id)]
        if not st_info.empty:
            st_name = st_info['Tên trạm'].values[0]
            lat = st_info['Vĩ độ (°N)'].values[0]
            lon = st_info['Kinh độ (°E)'].values[0]
        else:
            st_name = "Unknown"
            lat, lon = 0.0, 0.0
            
        col_data = df_temp[st_id]
        station_stats.append({
            "wmo_code": st_id,
            "name": st_name,
            "lat": lat,
            "lon": lon,
            "mean": float(col_data.mean()),
            "std": float(col_data.std()),
            "min": float(col_data.min()),
            "max": float(col_data.max()),
            "missing_count": int(col_data.isnull().sum())
        })
        
    return eda_stats, station_stats
