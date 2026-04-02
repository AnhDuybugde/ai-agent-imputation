# Autonomous Spatio-Temporal Imputer (Full Stack App)
Tái thiết kế hệ thống thành một nền tảng Web Application hoàn chỉnh với Frontend cực đẹp và Backend xử lý Machine Learning mạnh mẽ. Khác với phiên bản cũ, hệ thống giờ đây sẽ tiến tới khả năng tương tác với người dùng (Upload dữ liệu tuỳ chỉnh) sau khi hoàn thiện **Machine Learning Engine Lõi** với dữ liệu có sẵn.

## User Review Required
> [!IMPORTANT]
> Bạn hoàn toàn đúng! Web app hiện tại trả ra số liệu rất tốt, nhưng **thiếu tính trực quan (Visualizations) cho chính dữ liệu chuỗi thời gian**. Để giải quyết triệt để, tôi đề xuất tiếp tục Nâng cấp **Hệ thống Visualizations**, và bạn cần xem qua:
> 
> 1. **Visualized EDA (Agent Knowledge):** Thay vì chỉ hiện Bar Chart trung bình, Backend sẽ gửi thêm mẫu Time-series để Frontend vẽ **Line Chart thể hiện dao động nhiệt độ thực tế theo thời gian** của trạm. Người dùng có thể nhìn thấy chuỗi dữ liệu nhấp nhô thế nào.
> 2. **Trực quan hoá Quá trình Đục Lỗ & Ghép nối (Visualization of Imputation Process - Model Arena):** 
>    - Khi hệ thống chọn ra "Best Model", Backend sẽ không chỉ trả về điểm số, mà sẽ trả về **mảng toạ độ Điểm thực (True Values)** và **Điểm mô hình đoán (Predicted/Imputed)**.
>    - Frontend sẽ dùng `Recharts` vẽ một biểu đồ đường (Line Chart). Trong đó: Đường liền là dữ liệu gốc hai bên (Context), Đoạn đứt nét màu Xám là vị trí bị đục (Gaps), và Đường nổi màu Xanh/Tím là đường mà Cỗ máy ML đã vẽ nới vào. Bạn sẽ **NHÌN THẤY TẬN MẮT** nó điền lỗ hổng có cong tự nhiên và chuẩn xác không!
> 3. **Tầm nhìn Tương lai:** File Upload và tự động phân tích không đổi.

## Proposed Changes

### 1. Kiến trúc Backend (FastAPI - Machine Learning Engine - `backend/`)
#### [MODIFY] `backend/routers/evaluation.py`: 
Nâng cấp từ Mock Data sang AI Pipeline thực tế:
- **Real Synthetic Gap Generator**:
  - Viết hàm đục lỗ chủ động trên dữ liệu hoàn chỉnh của tập giả lập.
  - *Short Gap*: Xoá ngẫu nhiên chuỗi độ dài 3-5 thời điểm.
  - *Continuous Gap*: Xoá ngẫu nhiên vài tuần dữ liệu liên tiếp (VD: xoá một khoảng 7-14 ngày).
  - *Spatial Gap*: Tắt hoàn toàn tín hiệu của một trạm.
- **Model Training & Inference Logic**:
  - Chạy thật chức năng biến đổi Time-series thành Feature Engineering (Lag 1h, 3h, 24h, Hour of Day, Month).
  - Implement các thuật toán thật: `Interpolation (Linear/Spline)`, `LOCF`, `RandomForestRegressor`, `LGBMRegressor` từ LightGBM.
- **Metrics Calculation Engine**:
  - Đối chiếu dữ liệu được Imputed với dữ liệu Gốc.
  - Tính thực tế **RMSE**, **R2**, **FB**, **FSD**.
- **[NEW] Trích xuất Dữ liệu Visualization**:
  - Khi chốt xong Best Model ở chu trình trên, lấy mảng khoảng +/- 50 time steps bao quanh cái Gap đó.
  - Đóng gói dữ liệu dạng: `{ time, true_temp, gap_temp (có Null), imputed_temp }` rồi ném trả về cho giao diện Model Arena vẽ.

#### [NEW] `backend/routers/upload.py` (Tầm nhìn Tương lai):
- Xây dựng API nhận file `POST /api/upload`. Phân tích header và trả về file csv đã impute hoàn toàn tự động.

#### [NEW] `backend/routers/live_imputation.py`:
- Fetch dữ liệu hiện tại từ OpenWeather API cho danh sách 43 trạm khí tượng.
- Nếu API trả về bị khuyết dữ liệu (hoặc giả lập mất kết nối), Agent sẽ đánh giá Gap Size hiện hành và dùng "Best Model" đã chọn ở Tab 1 để tiến hành Imputation.
- Tính toán và trả về sự thay đổi của phân phối thống kê sau bước ghép: Biểu diễn thay đổi bằng các chỉ số FB, FSD và hiển thị biểu đồ hộp (Boxplots) trước & sau tương ứng.

### 2. Kiến trúc Frontend (React + Vite - Trực quan hoá - `frontend/`)
Sử dụng thư viện `Recharts` tạo Multi-line Chart.

#### [UPDATE] Tab 1: Agent Knowledge & Evaluation
- **EDA Analytics:** Bổ sung Line Chart biểu diễn diễn biến Time-series của một Trạm theo tuần/tháng, để thấy được các dao động nhiễu và đợt không khí lạnh/nóng. Mở rộng từ cái BarChart thụ động hiện hữu.

#### [UPDATE] Tab 2: Model Arena
- **Đấu trường Chart:** Ngay dưới Bảng xếp hạng Model, một biểu đồ LineChart lớn sẽ xuất hiện. Show chuỗi thời gian 100 điểm. Đoạn bị "đục lỗ" (Artificial Gap) sẽ được tô bật lên. Hai đường chồng nhau: Giá trị bị xoá (True Value - làm mờ) và Đường dự đoán của Best Model (Imputed Value - Sáng màu). 
- Cho phép người dùng chiêm ngưỡng thực tế khả năng bảo toàn Phương Sai (FSD) trên giao diện thay vì chỉ nhìn con số!

## Open Questions
1. Việc code thật các bộ ML (Random Forest/LightGBM) có thể mất vài chục giây để quá trình đánh giá (Tab Model Arena) trả về kết quả thay vì trả ngay lập tức như Mock. Bạn có đồng ý với sự chờ đợi này để đổi lấy kết quả **chuẩn đo lường học thuật thật 100%** không?
2. Trong quá trình training ML, Agent sẽ dùng Dữ liệu lịch sử của trạm đó kết hợp với Tính mùa vụ (Tháng/Giờ). Bạn có muốn Agent lấy thêm "Trạm lân cận" (dựa trên Toạ độ Lat/Lon gầng nhất) làm dữ liệu dự đoán mồi không?

## Phân công (Verification Plan)
- Tạo Backend FastAPI, test các mô hình ML (Evaluation pipeline).
- Tạo Frontend Vite. Tích hợp giao diện UI/UX "đẹp mắt, wow".
- Nối Frontend với Backend thông qua Axios.
- Kiểm tra tính ổn định trước khi export thư mục lên GitHub.
