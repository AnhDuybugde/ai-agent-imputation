import pandas as pd
import numpy as np
import gc
import os
from tqdm.auto import tqdm
from sklearn.metrics import r2_score, mean_squared_error
from sklearn.linear_model import LinearRegression, Ridge, Lasso
from sklearn.neighbors import KNeighborsRegressor
from sklearn.tree import DecisionTreeRegressor
from sklearn.svm import SVR
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor, AdaBoostRegressor
from xgboost import XGBRegressor
from lightgbm import LGBMRegressor

import warnings
warnings.filterwarnings("ignore")

# ==========================================
# 1. TẠO SEED (PRE-IMPUTATION: BIDIRECTIONAL WEIGHTED LGBM THEO BÀI BÁO)
# ==========================================
def get_paper_weighted_seed(df_miss):
    df_num = df_miss.select_dtypes(include=[np.number]).copy().astype('float32')
    
    # Tạo feature matrix X tạm thời (không có NaN) để LGBM có thể fit()
    df_features = df_num.interpolate(method='linear', limit_direction='both').ffill().bfill().fillna(0)
    
    df_filled = df_num.copy()
    target_cols = df_num.columns.tolist()
    
    for col in target_cols:
        s = df_num[col].reset_index(drop=True)
        if not s.isna().any():
            continue
            
        features = [c for c in target_cols if c != col]
        
        # Xác định vị trí các block missing (gaps)
        is_missing = s.isna().astype(int)
        diff = is_missing.diff().fillna(is_missing)
        
        starts_idx = np.where(diff == 1)[0]
        ends_idx = np.where(diff == -1)[0]
        
        # Xử lý edge case nếu gap nằm ở cuối chuỗi
        if len(starts_idx) > len(ends_idx):
            ends_idx = np.append(ends_idx, len(s))
            
        for st, en in zip(starts_idx, ends_idx):
            # Lọc các index có dữ liệu thực sự trước và sau gap
            valid_before = np.where(~s.iloc[:st].isna())[0]
            valid_after = np.where(~s.iloc[en:].isna())[0] + en
            
            len_before = len(valid_before)
            len_after = len(valid_after)
            
            if len_before == 0 and len_after == 0:
                continue 
                
            # Công thức (1): Tính tỷ lệ alpha
            alpha = len_before / (len_before + len_after)
            
            X_test = df_features.iloc[st:en][features].values
            y_before = np.zeros(en - st)
            y_after = np.zeros(en - st)
            
            # Huấn luyện Y_before (Dữ liệu quá khứ)
            if len_before > 0:
                X_train_before = df_features.iloc[valid_before][features].values
                y_train_before = s.iloc[valid_before].values
                model_before = LGBMRegressor(n_estimators=30, n_jobs=-1, random_state=42, verbose=-1)
                model_before.fit(X_train_before, y_train_before)
                y_before = model_before.predict(X_test)
                
            # Huấn luyện Y_after (Dữ liệu tương lai)
            if len_after > 0:
                X_train_after = df_features.iloc[valid_after][features].values
                y_train_after = s.iloc[valid_after].values
                model_after = LGBMRegressor(n_estimators=30, n_jobs=-1, random_state=42, verbose=-1)
                model_after.fit(X_train_after, y_train_after)
                y_after = model_after.predict(X_test)
                
            # Công thức (2): Kết hợp
            if len_before == 0:
                final_pred = y_after
            elif len_after == 0:
                final_pred = y_before
            else:
                final_pred = alpha * y_before + (1 - alpha) * y_after
                
            # Điền vào bản sao gốc
            df_filled.iloc[st:en, df_filled.columns.get_loc(col)] = final_pred
            
    return df_filled

# ==========================================
# 2. MACHINE LEARNING MODELS DICTIONARY & OVR LOGIC
# ==========================================
def get_ml_models():
    return {
        'LN': LinearRegression(n_jobs=-1),
        'Ridge': Ridge(alpha=1.0),
        'Lasso': Lasso(alpha=0.1),
        'KNN': KNeighborsRegressor(n_neighbors=5, n_jobs=-1),
        'DT': DecisionTreeRegressor(random_state=42),
        'SVR': SVR(kernel='rbf'), 
        'RF': RandomForestRegressor(n_estimators=50, n_jobs=-1, random_state=42),
        'GB': GradientBoostingRegressor(n_estimators=50, random_state=42),
        'Ada': AdaBoostRegressor(n_estimators=50, random_state=42),
        'XGB': XGBRegressor(n_estimators=50, n_jobs=-1, random_state=42, verbosity=0),
        'LGBM': LGBMRegressor(n_estimators=50, n_jobs=-1, random_state=42, verbose=-1)
    }

def run_ml_imputation(df_miss, df_seed, model_name):
    df_num = df_miss.select_dtypes(include=[np.number]).astype('float32')
    target_cols = df_num.columns.tolist()
    working = df_seed[target_cols].copy()
    
    models_dict = get_ml_models()
    model = models_dict[model_name]
    
    # One-vs-Rest: Duyệt qua từng cột để refine giá trị từ Seed
    pbar_targets = tqdm(target_cols, desc=f"⏳ Imputing {model_name:<5}", leave=False)
    for target in pbar_targets:
        m_idx = df_num[target].isna()
        if not m_idx.any(): continue
        
        pred_cols = [c for c in target_cols if c != target]
        
        # X lấy từ Seed chất lượng cao, y lấy từ giá trị thực (non-NaN)
        X_train = working.loc[~m_idx, pred_cols].values
        y_train = df_num.loc[~m_idx, target].values 
        X_test = working.loc[m_idx, pred_cols].values
        
        model.fit(X_train, y_train)
        working.loc[m_idx, target] = model.predict(X_test)
        
    return working

# ==========================================
# 3. METRICS EVALUATION
# ==========================================
def get_final_metrics(df_orig, df_imp, df_miss):
    stats = []
    common_cols = [c for c in df_miss.columns if c in df_orig.columns and c in df_imp.columns and c not in ['TimeVN', 'Time', 'Date']]
    for col in common_cols:
        mask = pd.isna(df_miss[col].values) & ~pd.isna(df_orig[col].values)
        yt, yp = df_orig[col].values[mask], df_imp[col].values[mask]
        valid = ~np.isnan(yp); yt, yp = yt[valid], yp[valid]
        if len(yt) < 2: continue
        
        rng = np.nanmax(df_orig[col].values) - np.nanmin(df_orig[col].values)
        rng = rng if rng > 0 else 1.0
        
        stats.append({
            "Station": col,
            "NSE": 1 - (np.sum((yt - yp)**2) / (np.sum((yt - np.mean(yt))**2) + 1e-9)),
            "R2": r2_score(yt, yp),
            "RMSE": np.sqrt(mean_squared_error(yt, yp)),
            "MAE": np.mean(np.abs(yt - yp)),
            "Sim": (1/len(yt)) * np.sum(1 / (1 + (np.abs(yp - yt) / rng)))
        })
    return pd.DataFrame(stats)

# ==========================================
# 4. EXECUTION PIPELINE & LƯU KẾT QUẢ
# ==========================================
# 🔴 CHỈNH SỬA Ở ĐÂY CHO MỖI LẦN CHẠY 🔴
METHOD_NAME = "MLBUI_LGBM_OVR"  # Tên phương pháp
LEAD_TIME = "7D"               # Thời gian dự báo (vd: '1D', '3D', '5D', '7D')
# -------------------------------------------------------------

# Tự động tạo thư mục lưu trữ (vd: Results_OvR_PaperSeed_1D)
SAVE_DIR = f"Results_{METHOD_NAME}_{LEAD_TIME}"
os.makedirs(SAVE_DIR, exist_ok=True)

groups_to_test = [('LOW', df_low), ('MED', df_med), ('HIGH', df_high)]
models_to_test = list(get_ml_models().keys())

comparison_data = []

print(f"🚀 Khởi động {METHOD_NAME} cho tập {LEAD_TIME}...\n")

pbar_levels = tqdm(groups_to_test, desc="📊 LEVEL", colour='magenta', position=0)
for level_name, df_group_missing in pbar_levels:
    
    # Bước 1: Tạo Seed mạnh bằng phương pháp của bài báo (chạy 1 lần cho mỗi độ khuyết)
    df_seed_paper = get_paper_weighted_seed(df_group_missing)
    
    pbar_models = tqdm(models_to_test, desc=f"🏆 MODEL ({level_name})", colour='green', position=1, leave=False)
    for model_name in pbar_models:
        
        # Bước 2: Refine dữ liệu bằng mô hình One-vs-Rest hiện tại
        df_imp = run_ml_imputation(df_group_missing, df_seed_paper, model_name)
        
        # Bước 3: Đánh giá Metrics (nhớ define 'df' gốc ở ngoài trước khi chạy)
        metrics_df = get_final_metrics(df, df_imp, df_group_missing)
        
        if not metrics_df.empty:
            s = metrics_df.mean(numeric_only=True)
            comparison_data.append({
                'Level': level_name,
                'Model': model_name,
                'NSE (↑)': s['NSE'], 'R2 (↑)': s['R2'], 'Sim (↑)': s['Sim'],
                'RMSE (↓)': s['RMSE'], 'MAE (↓)': s['MAE']
            })
            
        # -----------------------------------------------------------
        # Bước 4: LƯU BẢNG DATA SAU KHI ĐIỀN KHUYẾT ĐỂ VẼ BIỂU ĐỒ
        # -----------------------------------------------------------
        df_imp_save = df_imp.copy()
        
        # Ghép thêm cột TimeVN (nếu có) để sau này dễ trace lại ngày tháng vẽ trục X
        if 'TimeVN' in df_group_missing.columns:
            df_imp_save.insert(0, 'TimeVN', df_group_missing['TimeVN'].values)
            
        # Đặt tên file logic: VD: Data_OvR_PaperSeed_1D_LOW_LGBM.csv
        imputed_filename = f"Data_{METHOD_NAME}_{LEAD_TIME}_{level_name}_{model_name}.csv"
        save_path = os.path.join(SAVE_DIR, imputed_filename)
        df_imp_save.to_csv(save_path, index=False)
        # -----------------------------------------------------------
            
        # Dọn dẹp RAM
        del df_imp, df_imp_save
        gc.collect()

# ==========================================
# 5. EXPORT METRICS & HIỂN THỊ
# ==========================================
final_df = pd.DataFrame(comparison_data)
final_df['Level'] = pd.Categorical(final_df['Level'], categories=['LOW', 'MED', 'HIGH'], ordered=True)
final_df = final_df.sort_values(by=['Level', 'Model']).set_index(['Level', 'Model'])

# Lưu file metrics vào trong cùng thư mục chạy
metrics_filename = f"Metrics_{METHOD_NAME}_{LEAD_TIME}.csv"
metrics_path = os.path.join(SAVE_DIR, metrics_filename)

final_df.to_csv(metrics_path)

print(f"\n✅ Hoàn tất! Toàn bộ file kết quả và file data đã được lưu gọn gàng trong thư mục: '{SAVE_DIR}'")

display(final_df.style.format(precision=4)\
        .background_gradient(cmap='RdYlGn', subset=['NSE (↑)', 'R2 (↑)'])\
        .background_gradient(cmap='RdYlGn_r', subset=['RMSE (↓)', 'MAE (↓)']))