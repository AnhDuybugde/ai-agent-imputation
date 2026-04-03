import pandas as pd
import numpy as np
import logging
from sklearn.linear_model import LinearRegression, Ridge, Lasso
from sklearn.neighbors import KNeighborsRegressor
from sklearn.tree import DecisionTreeRegressor
from sklearn.svm import SVR
from sklearn.ensemble import HistGradientBoostingRegressor
import warnings

warnings.filterwarnings("ignore")

logger = logging.getLogger(__name__)

# ==========================================
# 1. PRE-IMPUTATION (BIDIRECTIONAL WEIGHTED LGBM)
# ==========================================
def get_paper_weighted_seed(df_miss: pd.DataFrame):
    """
    Bidirectional LGBM pre-imputation function.
    Fills gaps by training LGBM on past and future data and weighting them via alpha.
    """
    df_num = df_miss.select_dtypes(include=[np.number]).copy().astype('float32')
    
    # Create simple feature matrix without NaNs using basic linear interpolation + border fill for LGBM to fit
    df_features = df_num.interpolate(method='linear', limit_direction='both').ffill().bfill().fillna(0)
    
    df_filled = df_num.copy()
    target_cols = df_num.columns.tolist()
    
    for col in target_cols:
        s = df_num[col].reset_index(drop=True)
        if not s.isna().any():
            continue
            
        features = [c for c in target_cols if c != col]
        
        # Identify missing blocks (gaps)
        is_missing = s.isna().astype(int)
        diff = is_missing.diff().fillna(is_missing)
        
        starts_idx = np.where(diff == 1)[0]
        ends_idx = np.where(diff == -1)[0]
        
        # Handle edge case if gap sits at the end of the series
        if len(starts_idx) > len(ends_idx):
            ends_idx = np.append(ends_idx, len(s))
            
        for st, en in zip(starts_idx, ends_idx):
            # Valid indices BEFORE and AFTER the gap
            valid_before = np.where(~s.iloc[:st].isna())[0]
            valid_after = np.where(~s.iloc[en:].isna())[0] + en
            
            len_before = len(valid_before)
            len_after = len(valid_after)
            
            if len_before == 0 and len_after == 0:
                continue 
                
            # Weighting alpha (Eq 1)
            alpha = len_before / (len_before + len_after)
            
            X_test = df_features.iloc[st:en][features].values
            y_before = np.zeros(en - st)
            y_after = np.zeros(en - st)
            
            # Train Y_before (Past Data)
            if len_before > 0:
                X_train_before = df_features.iloc[valid_before][features].values
                y_train_before = s.iloc[valid_before].values
                model_before = HistGradientBoostingRegressor(max_iter=30, random_state=42)
                model_before.fit(X_train_before, y_train_before)
                y_before = model_before.predict(X_test)
                
            # Train Y_after (Future Data)
            if len_after > 0:
                X_train_after = df_features.iloc[valid_after][features].values
                y_train_after = s.iloc[valid_after].values
                model_after = HistGradientBoostingRegressor(max_iter=30, random_state=42)
                model_after.fit(X_train_after, y_train_after)
                y_after = model_after.predict(X_test)
                
            # Combine
            if len_before == 0:
                final_pred = y_after
            elif len_after == 0:
                final_pred = y_before
            else:
                final_pred = alpha * y_before + (1 - alpha) * y_after
                
            # Fill original copy
            df_filled.iloc[st:en, df_filled.columns.get_loc(col)] = final_pred
            
    return df_filled

# ==========================================
# 2. MACHINE LEARNING MODELS DICTIONARY
# ==========================================
def get_ml_models():
    """ Returns lightweight robust models suited for cloud CPU limitations """
    return {
        'LN': LinearRegression(n_jobs=-1),
        'Ridge': Ridge(alpha=1.0),
        'Lasso': Lasso(alpha=0.1),
        'KNN': KNeighborsRegressor(n_neighbors=5, n_jobs=-1),
        'DT': DecisionTreeRegressor(random_state=42),
        'SVR': SVR(kernel='rbf'), 
        'HGBT': HistGradientBoostingRegressor(max_iter=50, random_state=42)
    }

# ==========================================
# 3. ONE-VS-REST FINAL IMPUTATION
# ==========================================
def run_ml_imputation(df_miss: pd.DataFrame, df_seed: pd.DataFrame, model_name: str):
    """
    OvR refinement: loops through each target column, uses the pre-imputed seed 
    as features, and predicts the actual NaNs using standard machine learning models.
    """
    df_num = df_miss.select_dtypes(include=[np.number]).astype('float32')
    target_cols = df_num.columns.tolist()
    working = df_seed[target_cols].copy()
    
    models_dict = get_ml_models()
    if model_name not in models_dict:
        # Fallback 
        model_name = 'HGBT'
        
    model = models_dict[model_name]
    
    for target in target_cols:
        m_idx = df_num[target].isna()
        if not m_idx.any(): continue
        
        pred_cols = [c for c in target_cols if c != target]
        if len(pred_cols) == 0:
            continue
            
        # X from high quality Seed, y from true original non-NaN values
        X_train = working.loc[~m_idx, pred_cols].values
        y_train = df_num.loc[~m_idx, target].values 
        X_test = working.loc[m_idx, pred_cols].values
        
        # In rare case where entirely NaN
        if len(X_train) == 0:
            continue
            
        model.fit(X_train, y_train)
        working.loc[m_idx, target] = model.predict(X_test)
        
    # Inject predicted numeric data back into full dataframe format
    df_final = df_miss.copy()
    for target in target_cols:
        df_final[target] = working[target]
        
    return df_final
