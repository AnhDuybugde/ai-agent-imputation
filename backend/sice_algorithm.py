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
    Simplified Mean Pre-imputation.
    Replaces the heavy Bidirectional HGBT with simple column mean to prevent OOM
    and drastically speed up execution on weak cloud instances.
    """
    df_num = df_miss.select_dtypes(include=[np.number]).copy().astype('float32')
    df_filled = df_num.copy()
    
    for col in df_filled.columns:
        if df_filled[col].isna().any():
            mean_val = df_filled[col].mean()
            if pd.isna(mean_val):
                mean_val = 0.0  # Fallback if entire column is NaN
            
            # Use assignment to avoid fillna future warnings
            mask = df_filled[col].isna()
            df_filled.loc[mask, col] = mean_val
            
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
def run_ml_imputation(df_miss: pd.DataFrame, df_seed: pd.DataFrame, model_name: str, target_focus: str = None):
    """
    SICE refinement: loops through each target column, uses the pre-imputed seed 
    as features, and predicts the actual NaNs using standard machine learning models.
    """
    df_num = df_miss.select_dtypes(include=[np.number]).astype('float32')
    target_cols = df_num.columns.tolist()
    if target_focus and target_focus in target_cols:
        target_cols = [target_focus]
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
