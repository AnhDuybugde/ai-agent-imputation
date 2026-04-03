def generate_fixed_length_gaps(df_input, gap_days, num_gaps=10, seed=42, rows_per_day=8):
    """
    Tạo bộ dữ liệu missing với CÙNG MỘT độ dài gap cho tất cả các vị trí được chọn.
    Có tích hợp thuật toán chống đè (anti-overlap) để đảm bảo các gap không dính vào nhau.
    """
    df_temp = df_input.copy(deep=True)
    feature_columns = [col for col in df_temp.columns if col != "TimeVN"]
    
    # Đảm bảo format datetime để tìm đúng 1:00 AM
    ts = pd.to_datetime(df_temp['TimeVN'], format='mixed', dayfirst=True, errors='coerce')
    
    # Lấy ra vị trí (integer index) của các dòng có giờ = 1
    # Dùng np.where để lấy vị trí tuyệt đối, an toàn hơn loc khi thao tác
    daily_start_positions = np.where(ts.dt.hour == 1)[0].tolist()
    
    np.random.seed(seed)
    gap_rows = gap_days * rows_per_day
    
    # Dictionary lưu lại các index bị xóa để sau này tính RMSE, MAE
    missing_ground_truth = {col: [] for col in feature_columns}

    for col in feature_columns:
        col_idx = df_temp.columns.get_loc(col)
        
        # Chỉ giữ lại các vị trí bắt đầu mà khi cộng thêm gap_rows không vượt quá chiều dài data
        valid_starts = [pos for pos in daily_start_positions if pos + gap_rows <= len(df_temp)]
        
        available_starts = valid_starts.copy()
        
        for _ in range(num_gaps):
            if not available_starts:
                print(f"Cảnh báo: Không đủ khoảng trống để tạo đủ {num_gaps} gaps cho cột {col}")
                break
                
            # Chọn ngẫu nhiên 1 vị trí bắt đầu
            start_pos = np.random.choice(available_starts)
            end_pos = start_pos + gap_rows
            
            # Xóa dữ liệu (gán NaN)
            df_temp.iloc[start_pos:end_pos, col_idx] = np.nan
            
            # Lưu lại vị trí đã đục lỗ
            missing_ground_truth[col].extend(list(range(start_pos, end_pos)))
            
            # --- CƠ CHẾ CHỐNG ĐÈ (ANTI-OVERLAP) ---
            # Xóa bỏ các vị trí bắt đầu (start_pos) lân cận ra khỏi danh sách available_starts
            # Khoảng cách tối thiểu giữa 2 điểm bắt đầu phải lớn hơn chiều dài của gap
            available_starts = [pos for pos in available_starts if abs(pos - start_pos) > gap_rows]

    return df_temp, missing_ground_truth

# ================= TẠO 4 BỘ DATASET ĐỘC LẬP =================

# Giả sử 'df' là dataframe gốc của bạn
gap_scenarios = [1, 3, 5, 7]
missing_datasets = {}       # Chứa 4 dataframe đã bị đục lỗ
ground_truth_indices = {}   # Chứa vị trí các lỗ hổng để tính sai số sau này

for days in gap_scenarios:
    print(f"Đang tạo dataset cho kịch bản missing {days} ngày liên tục...")
    
    # Gọi hàm cho từng độ dài
    df_miss, truth_dict = generate_fixed_length_gaps(
        df_input=df, 
        gap_days=days, 
        num_gaps=10,   # Tùy chỉnh số lượng đoạn đứt gãy bạn muốn tạo
        seed=42,       # Giữ nguyên seed để kết quả random có thể tái lập được
        rows_per_day=8
    )
    
    # Lưu vào dictionary
    missing_datasets[f'gap_{days}d'] = df_miss
    ground_truth_indices[f'gap_{days}d'] = truth_dict
    
    total_nan = df_miss.isna().sum().sum()
    print(f"-> Hoàn tất! Tổng số NaN tạo ra: {total_nan}\n")

# Để truy xuất data sử dụng:
df_1_day = missing_datasets['gap_1d']
df_3_days = missing_datasets['gap_3d']
df_5_days = missing_datasets['gap_5d']
df_7_days = missing_datasets['gap_7d']

df_missing = df_7_days