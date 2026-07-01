import React, { useState, useEffect } from 'react';
import { Thermometer, Wind, Droplets, AlertTriangle, CheckCircle2, MapPin, RefreshCw, Database, CloudRain, Cloud, Gauge } from 'lucide-react';

export default function App() {
  // ⚠️ เปลี่ยน URL ด้านล่างนี้เป็นของ Firebase คุณ (ต้องมี /energy_data.json ต่อท้าย)
  const FIREBASE_URL = "https://energyme-8727d-default-rtdb.asia-southeast1.firebasedatabase.app/energy_data.json";

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [layer, setLayer] = useState('tc');
  const [systemStatus, setSystemStatus] = useState({ success: 0, total: 9, logs: [], lastUpdated: "" });
  const [lastMetrics, setLastMetrics] = useState({ avg: 0, max: 0 });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(FIREBASE_URL);
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);

      const dbData = await res.json();

      if (dbData && dbData.data) {
        // ดึงข้อมูลตรงๆ จาก Firebase ที่ Python ประมวลผลมาให้แล้ว (รวมถึง Pressure, Cloud, Rain Prob)
        setData(dbData.data);
        setSystemStatus({
          success: dbData.successCount || 0,
          total: dbData.data.length || 9,
          logs: dbData.logs || [],
          lastUpdated: dbData.lastUpdated || "ไม่ทราบเวลา"
        });
      } else {
        setData([]);
      }
    } catch (e) {
      console.error("Firebase Error:", e);
      setSystemStatus(prev => ({...prev, logs: [...(prev.logs || []), `Failed to connect to Firebase: ${e.message}`]}));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // ให้เว็บอัปเดตข้อมูลจาก Firebase อัตโนมัติทุกๆ 5 นาที
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, []);

  // ระบบคำนวณค่าเฉลี่ยและค่าสูงสุด พร้อมป้องกัน Error กรณีข้อมูลบางตัวหายไป (|| 0)
  const currentAvg = data.length > 0 ? data.reduce((acc, curr) => acc + (curr[layer] || 0), 0) / data.length : 0;
  const currentMax = data.length > 0 ? Math.max(...data.map(d => d[layer] || 0)) : 0;

  useEffect(() => {
    if (!loading && data.length > 0) {
       setLastMetrics({ avg: currentAvg, max: currentMax });
    }
  }, [layer]);

  const deltaAvg = currentAvg - lastMetrics.avg;
  const deltaMax = currentMax - lastMetrics.max;

  // 🗺️ นิยามชั้นข้อมูลเชิงลึกทางอุตุนิยมวิทยาครบชุด (อิงจาก API ของรัฐและดาวเทียม)
  const layerInfo = {
    'tc': { name: 'อุณหภูมิ', icon: <Thermometer className="w-5 h-5 text-orange-500" />, unit: '°C', color: 'text-orange-500' },
    'ws10': { name: 'ความเร็วลม', icon: <Wind className="w-5 h-5 text-teal-400" />, unit: ' km/h', color: 'text-teal-400' },
    'rh': { name: 'ความชื้นสัมพัทธ์', icon: <Droplets className="w-5 h-5 text-blue-400" />, unit: '%', color: 'text-blue-400' },
    'pressure': { name: 'ความกดอากาศ', icon: <Gauge className="w-5 h-5 text-purple-400" />, unit: ' hPa', color: 'text-purple-400' },
    'cloud': { name: 'ปริมาณเมฆ', icon: <Cloud className="w-5 h-5 text-slate-300" />, unit: '%', color: 'text-slate-300' },
    'rain_prob': { name: 'โอกาสเกิดฝน (API)', icon: <CloudRain className="w-5 h-5 text-indigo-400" />, unit: '%', color: 'text-indigo-400' }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex">

      {/* Sidebar */}
      <div className="w-72 bg-slate-900 border-r border-slate-800 p-6 flex flex-col shadow-xl z-10 overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 mb-2">
            EnergyGIS Core
          </h1>
          <p className="text-xs text-emerald-500/80 mb-2 flex items-center gap-1 font-mono">
            <Database className="w-3 h-3" /> Architecture: Decoupled
          </p>
          <p className="text-xs text-slate-400">ระบบประมวลผลข้อมูลสิ่งแวดล้อมเชิงลึก</p>
        </div>

        {/* System Status */}
        <div className={`p-4 rounded-xl mb-6 border ${systemStatus.success > 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
          <div className="flex items-center gap-3 mb-2">
            {systemStatus.success > 0 ?
              <CheckCircle2 className="w-5 h-5 text-emerald-400" /> :
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            }
            <span className={`text-sm font-semibold ${systemStatus.success > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              ข้อมูลอุตุนิยมวิทยา (TMD+NWP)
            </span>
          </div>
          <p className="text-xs text-slate-300">
            อัปเดต: {systemStatus.lastUpdated || "กำลังโหลด..."}<br/>
            สถานี: {systemStatus.success}/{systemStatus.total} โหนด
          </p>
        </div>

        {/* Layer Selection */}
        <div className="mb-6 flex-grow">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            ชั้นข้อมูล (Meteorological Layers)
          </label>
          <div className="space-y-2">
            {Object.keys(layerInfo).map(key => (
              <button
                key={key}
                onClick={() => setLayer(key)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${layer === key ? 'bg-slate-800 border border-slate-700 shadow-md' : 'hover:bg-slate-800/50 border border-transparent'}`}
              >
                {layerInfo[key].icon}
                <span className={`text-sm font-medium ${layer === key ? 'text-white' : 'text-slate-400'}`}>
                  {layerInfo[key].name}
                </span>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 mt-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'กำลังซิงค์...' : 'รีเฟรชข้อมูล'}
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto relative">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg">
            <p className="text-sm text-slate-400 mb-1">ชั้นข้อมูลที่วิเคราะห์</p>
            <div className="flex items-center gap-3">
              {layerInfo[layer].icon}
              <h2 className="text-2xl font-bold text-white">{layerInfo[layer].name}</h2>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg">
            <p className="text-sm text-slate-400 mb-1">ค่าเฉลี่ยระดับประเทศ</p>
            <div className="flex items-end gap-3">
              <h2 className="text-4xl font-light text-white">{currentAvg.toFixed(1)}<span className="text-xl text-slate-500 ml-1">{layerInfo[layer].unit}</span></h2>
              {deltaAvg !== 0 && (
                <span className={`text-sm font-medium mb-1 ${deltaAvg > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {deltaAvg > 0 ? '↑' : '↓'} {Math.abs(deltaAvg).toFixed(1)}
                </span>
              )}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg">
            <p className="text-sm text-slate-400 mb-1">จุดวิกฤตสูงสุด (Max)</p>
            <div className="flex items-end gap-3">
              <h2 className={`text-4xl font-light ${layerInfo[layer].color}`}>{currentMax.toFixed(1)}<span className="text-xl text-slate-500 ml-1">{layerInfo[layer].unit}</span></h2>
              {deltaMax !== 0 && (
                <span className={`text-sm font-medium mb-1 ${deltaMax > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {deltaMax > 0 ? '↑' : '↓'} {Math.abs(deltaMax).toFixed(1)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Telemetry Grid */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-slate-400" />
            ข้อมูลโทรมาตรล่าสุด (Telemetry)
          </h3>

          {loading ? (
             <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-800 rounded-2xl">
                <div className="animate-pulse text-slate-500 flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin" /> กำลังดึงข้อมูลจาก Cloud...
                </div>
             </div>
          ) : data.length === 0 ? (
             <div className="h-64 flex flex-col items-center justify-center border border-rose-500/30 bg-rose-500/5 rounded-2xl text-rose-400">
                <Database className="w-8 h-8 mb-2 opacity-50" />
                <p>ยังไม่มีข้อมูลใน Database</p>
                <p className="text-xs opacity-70 mt-1">กรุณารันไฟล์ data_worker.py เพื่อส่งข้อมูลสภาพอากาศขึ้นมา</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.map((loc, idx) => (
                <div key={idx} className="bg-slate-900/50 hover:bg-slate-800/80 transition-colors border border-slate-800 p-5 rounded-xl flex justify-between items-center group">
                  <div>
                    <h4 className="font-medium text-slate-200">{loc.name}</h4>
                    <p className="text-xs text-slate-500 mt-1 font-mono">
                      {loc.source === 'TMD + Satellite' ? '🟢 Data Fusion (TMD)' : '🟡 NWP Model'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-light ${layerInfo[layer].color}`}>
                      {(loc[layer] || 0).toFixed(1)}
                      <span className="text-sm ml-1 text-slate-500">{layerInfo[layer].unit}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Debug Logs */}
        {systemStatus.logs && systemStatus.logs.length > 0 && (
          <div className="mt-8 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
            <h4 className="text-sm font-semibold text-rose-400 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> ปัญหาขณะ Python ดึงข้อมูล (Worker Logs)
            </h4>
            <ul className="text-xs text-rose-300/80 space-y-1 font-mono">
              {systemStatus.logs.map((log, i) => <li key={i}>{log}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}