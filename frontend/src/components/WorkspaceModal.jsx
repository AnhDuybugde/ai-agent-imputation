import React, { useState } from 'react';
import axios from 'axios';
import { X, Upload, FileText, MapPin, CheckCircle, Loader, AlertTriangle, Database } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export default function WorkspaceModal({ currentId, onClose, onWorkspaceChange }) {
  const [useDefault, setUseDefault] = useState(currentId === 'default');
  const [timeFile, setTimeFile] = useState(null);
  const [metaFile, setMetaFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUpload = async () => {
    if (!timeFile || !metaFile) {
        setError("Vui lòng chọn đủ 2 file CSV (Time Series và Station Metadata).");
        return;
    }
    
    setLoading(true);
    setError('');
    
    const formData = new FormData();
    formData.append("time_series", timeFile);
    formData.append("station_meta", metaFile);
    
    try {
        const response = await axios.post(`${API}/api/workspace/upload`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        onWorkspaceChange(response.data.workspace_id);
    } catch (err) {
        setError(err.response?.data?.detail || "Upload phân tích thất bại.");
    } finally {
        setLoading(false);
    }
  };

  const handleSetDefault = () => {
    onWorkspaceChange('default');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden relative">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-800/50">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Database size={22} className="text-indigo-400" /> Quản Lý Dữ Liệu (Workspace)
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 p-8">
            <p className="text-slate-300 mb-6 leading-relaxed">
                Nền tảng <strong>SICE Spatio-Temporal</strong> phân tích dữ liệu đa chiều. Bạn có thể sử dụng bộ dữ liệu thời tiết mặc định (Default Vietnam 43 Stations) hoặc tải lên hệ thống cảm biến riêng của bạn để AI Agent học quy luật.
            </p>

            <div className="grid md:grid-cols-2 gap-6">
                {/* DEFAULT WORKSPACE */}
                <div 
                    onClick={handleSetDefault}
                    className={`cursor-pointer p-5 rounded-xl border-2 transition-all ${currentId === 'default' ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-800 bg-slate-800/50 hover:border-slate-600'}`}
                >
                    <div className="flex justify-between items-start mb-3">
                        <div className="p-3 rounded-lg bg-emerald-500/20 text-emerald-400">
                            <CheckCircle size={24} />
                        </div>
                        {currentId === 'default' && <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded-full font-medium">Đang Dùng</span>}
                    </div>
                    <h3 className="font-semibold text-lg text-white mb-2">Default (Vietnam Demo)</h3>
                    <p className="text-sm text-slate-400">Dữ liệu thời tiết chuẩn 43 trạm trên toàn Việt Nam. Tối ưu sẵn cho việc minh hoạ khả năng nội suy SICE.</p>
                </div>

                {/* CUSTOM UPLOAD WORKSPACE */}
                <div className={`p-5 rounded-xl border-2 transition-all ${currentId !== 'default' ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-800 bg-slate-800/50'}`}>
                    <div className="flex justify-between items-start mb-3">
                        <div className="p-3 rounded-lg bg-indigo-500/20 text-indigo-400">
                            <Upload size={24} />
                        </div>
                        {currentId !== 'default' && <span className="bg-indigo-500/20 text-indigo-400 text-xs px-2 py-1 rounded-full font-medium">Custom Active</span>}
                    </div>
                    <h3 className="font-semibold text-lg text-white mb-4">Tải Lên Workspace Mới</h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-medium text-slate-400 block mb-1">1. Time Series Data (CSV)</label>
                            <label className="flex items-center gap-2 p-2 border border-slate-700 rounded-lg cursor-pointer hover:bg-slate-800 transition text-sm">
                                <FileText size={16} className="text-slate-400" />
                                <span className="truncate flex-1 text-slate-300">{timeFile ? timeFile.name : "Chọn file dữ liệu gốc..."}</span>
                                <input type="file" accept=".csv" className="hidden" onChange={e => setTimeFile(e.target.files[0])} />
                            </label>
                        </div>
                        
                        <div>
                            <label className="text-xs font-medium text-slate-400 block mb-1">2. Cấu trúc Trạm / Tọa độ (CSV)</label>
                            <label className="flex items-center gap-2 p-2 border border-slate-700 rounded-lg cursor-pointer hover:bg-slate-800 transition text-sm">
                                <MapPin size={16} className="text-slate-400" />
                                <span className="truncate flex-1 text-slate-300">{metaFile ? metaFile.name : "Chọn file chứa tọa độ (lat/lon)..."}</span>
                                <input type="file" accept=".csv" className="hidden" onChange={e => setMetaFile(e.target.files[0])} />
                            </label>
                        </div>

                        {error && (
                            <div className="p-3 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-start gap-2">
                                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        <button 
                            disabled={!timeFile || !metaFile || loading}
                            onClick={handleUpload}
                            className={`w-full py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition ${(!timeFile || !metaFile || loading) ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
                        >
                            {loading ? <Loader size={18} className="animate-spin" /> : <Upload size={18} />}
                            {loading ? "Đang xử lý dữ liệu AI..." : "Khởi Tạo Workspace"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
