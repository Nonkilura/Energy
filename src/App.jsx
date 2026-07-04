import React, { useState, useEffect } from 'react';
import { Thermometer, Wind, Droplets, AlertTriangle, CheckCircle2, MapPin, RefreshCw, Database, CloudRain, Cloud, Gauge, Sun, Moon } from 'lucide-react';

export default function App() {
  const FIREBASE_URL = "https://energyme-8727d-default-rtdb.asia-southeast1.firebasedatabase.app/energy_data.json";

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [layer, setLayer] = useState('tc');
  const [systemStatus, setSystemStatus] = useState({ success: 0, total: 9, logs: [], lastUpdated: "" });
  const [lastMetrics, setLastMetrics] = useState({ avg: 0, max: 0 });

  // 🌟 เพิ่ม State สำหรับจัดการ Theme (ค่าเริ่มต้นเป็น 'dark')
  const [theme, setTheme] = useState('dark');
  const isDark = theme === 'dark';

  // 🎨 ดิกชันนารีสี (Theme Dictionary) ควบคุมสีทั้งหมดจากจุดเดียว
  const t = {
    bg: isDark ? 'bg-slate-950' : 'bg-gray-50',
    text: isDark ? 'text-slate-200' : 'text-slate-700',
    textMuted: isDark ? 'text-slate-400' : 'text-slate-500',
    textStrong: isDark ? 'text-white' : 'text-slate-900',
    sidebar: isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200',
    card: isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200 shadow-sm',
    cardHover: isDark ? 'hover:bg-slate-800/80' : 'hover:bg-gray-50',
    layerBtnActive: isDark ? 'bg-slate-800 border-slate-700 shadow-md text-white' : 'bg-slate-100 border-gray-200 shadow-sm text-slate-900',
    layerBtnInactive: isDark ? 'hover:bg-slate-800/50 text-slate-400 border-transparent' : 'hover:bg-gray-100 text-slate-500 border-transparent',
    statusSuccessBg: isDark ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200',
    statusErrorBg: isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200',
    statusSuccessText: isDark ? 'text-emerald-400' : 'text-emerald-600',
    statusErrorText: isDark ? 'text-amber-400' : 'text-amber-600',
    gradientText: isDark ? 'from-emerald-400 to-teal-400' : 'from-emerald-600 to-teal-600',
    themeToggleBg: isDark ? 'bg-slate-950/50' : 'bg-gray-100',
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(FIREBASE_URL);
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);

      const dbData = await res.json();

      if (dbData && dbData.data) {
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
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, []);

  const currentAvg = data.length > 0 ? data.reduce((acc, curr) => acc + (curr[layer] || 0), 0) / data.length : 0;
  const currentMax = data.length > 0 ? Math.max(...data.map(d => d[layer] || 0)) : 0;

  useEffect(() => {
    if (!loading && data.length > 0) {
       setLastMetrics({ avg: currentAvg, max: currentMax });
    }
  }, [layer]);

  const deltaAvg = currentAvg - lastMetrics.avg;
  const deltaMax = currentMax - lastMetrics.max;

  const layerInfo = {
    'tc': { name: 'อุณหภูมิ', icon: <Thermometer className="w-5 h-5 text-orange-500" />, unit: '°C', color: 'text-orange-500' },
    'ws10': { name: 'ความเร็วลม', icon: <Wind className="w-5 h-5 text-teal-500" />, unit: ' km/h', color: 'text-teal-500' },
    'rh': { name: 'ความชื้นสัมพัทธ์', icon: <Droplets className="w-5 h-5 text-blue-500" />, unit: '%', color: 'text-blue-500' },
    'pressure': { name: 'ความกดอากาศ', icon: <Gauge className="w-5 h-5 text-purple-500" />, unit: ' hPa', color: 'text-purple-500' },
    'cloud': { name: 'ปริมาณเมฆ', icon: <Cloud className={`w-5 h-5 ${isDark ? 'text-slate-300' : 'text-slate-500'}`} />, unit: '%', color: isDark ? 'text-slate-300' : 'text-slate-500' },
    'rain_prob': { name: 'โอกาสเกิดฝน', icon: <CloudRain className="w-5 h-5 text-indigo-500" />, unit: '%', color: 'text-indigo-500' }
  };

  return (
    <div className={`min-h-screen ${t.bg} ${t.text} font-sans flex transition-colors duration-300`}>

      {/* Sidebar */}
      <div className={`w-72 ${t.sidebar} p-6 flex flex-col z-10 overflow-y-auto transition-colors duration-300 ${isDark ? 'shadow-xl' : 'shadow-lg border-r'}`}>

        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-12 h-12 rounded-xl shadow-sm p-1 flex items-center justify-center shrink-0 ${isDark ? 'bg-white' : 'bg-slate-50 border border-gray-200'}`}>
              <img src="/logo.png" alt="Propolis Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className={`text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${t.gradientText} tracking-tight`}>
              Propolis
            </h1>
          </div>

          {/* 🌟 Theme Toggle Switch */}
          <div className={`flex p-1 rounded-lg mb-4 mt-4 border ${t.themeToggleBg} ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>
            <button
              onClick={() => setTheme('light')}
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-semibold transition-all ${!isDark ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Sun size={14} /> สว่าง
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-semibold transition-all ${isDark ? 'bg-slate-700 shadow text-white' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Moon size={14} /> มืด
            </button>
          </div>

          <p className="text-xs text-emerald-500 mb-2 flex items-center gap-1 font-mono font-medium">
            <Database className="w-3 h-3" /> Architecture: Decoupled
          </p>
          <p className={`text-xs ${t.textMuted}`}>ระบบประมวลผลข้อมูลสิ่งแวดล้อมเชิงลึก</p>
        </div>

        {/* System Status */}
        <div className={`p-4 rounded-xl mb-6 border ${systemStatus.success > 0 ? t.statusSuccessBg : t.statusErrorBg} transition-colors duration-300`}>
          <div className="flex items-center gap-3 mb-2">
            {systemStatus.success > 0 ?
              <CheckCircle2 className={`w-5 h-5 ${t.statusSuccessText}`} /> :
              <AlertTriangle className={`w-5 h-5 ${t.statusErrorText}`} />
            }
            <span className={`text-sm font-bold ${systemStatus.success > 0 ? t.statusSuccessText : t.statusErrorText}`}>
              ข้อมูลอุตุนิยมวิทยา
            </span>
          </div>
          <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            อัปเดต: {systemStatus.lastUpdated || "กำลังโหลด..."}<br/>
            สถานี: {systemStatus.success}/{systemStatus.total} โหนด
          </p>
        </div>

        {/* Layer Selection */}
        <div className="mb-6 flex-grow">
          <label className={`block text-xs font-bold ${t.textMuted} uppercase tracking-wider mb-3`}>
            ชั้นข้อมูล (Layers)
          </label>
          <div className="space-y-2">
            {Object.keys(layerInfo).map(key => (
              <button
                key={key}
                onClick={() => setLayer(key)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all border ${layer === key ? t.layerBtnActive : t.layerBtnInactive}`}
              >
                {layerInfo[key].icon}
                <span className={`text-sm font-medium ${layer === key ? t.textStrong : t.textMuted}`}>
                  {layerInfo[key].name}
                </span>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 mt-auto shadow-md"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'กำลังซิงค์...' : 'รีเฟรชข้อมูล'}
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto relative">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className={`p-6 rounded-2xl border ${t.card} transition-colors duration-300`}>
            <p className={`text-sm font-medium ${t.textMuted} mb-2`}>ชั้นข้อมูลที่วิเคราะห์</p>
            <div className="flex items-center gap-3">
              {layerInfo[layer].icon}
              <h2 className={`text-2xl font-bold ${t.textStrong}`}>{layerInfo[layer].name}</h2>
            </div>
          </div>

          <div className={`p-6 rounded-2xl border ${t.card} transition-colors duration-300`}>
            <p className={`text-sm font-medium ${t.textMuted} mb-2`}>ค่าเฉลี่ยระดับประเทศ</p>
            <div className="flex items-end gap-3">
              <h2 className={`text-4xl font-light ${t.textStrong}`}>{currentAvg.toFixed(1)}<span className={`text-xl ${t.textMuted} ml-1`}>{layerInfo[layer].unit}</span></h2>
              {deltaAvg !== 0 && (
                <span className={`text-sm font-bold mb-1 ${deltaAvg > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {deltaAvg > 0 ? '↑' : '↓'} {Math.abs(deltaAvg).toFixed(1)}
                </span>
              )}
            </div>
          </div>

          <div className={`p-6 rounded-2xl border ${t.card} transition-colors duration-300`}>
            <p className={`text-sm font-medium ${t.textMuted} mb-2`}>จุดวิกฤตสูงสุด (Max)</p>
            <div className="flex items-end gap-3">
              <h2 className={`text-4xl font-light ${layerInfo[layer].color}`}>{currentMax.toFixed(1)}<span className={`text-xl ${t.textMuted} ml-1`}>{layerInfo[layer].unit}</span></h2>
              {deltaMax !== 0 && (
                <span className={`text-sm font-bold mb-1 ${deltaMax > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {deltaMax > 0 ? '↑' : '↓'} {Math.abs(deltaMax).toFixed(1)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Telemetry Grid */}
        <div className="mb-4">
          <h3 className={`text-lg font-bold ${t.textStrong} mb-4 flex items-center gap-2`}>
            <MapPin className={`w-5 h-5 ${t.textMuted}`} />
            ข้อมูลโทรมาตรล่าสุด (Telemetry)
          </h3>

          {loading ? (
             <div className={`h-64 flex items-center justify-center border-2 border-dashed rounded-2xl ${isDark ? 'border-slate-800' : 'border-gray-300'}`}>
                <div className={`animate-pulse flex items-center gap-2 ${t.textMuted} font-medium`}>
                  <RefreshCw className="w-5 h-5 animate-spin" /> กำลังดึงข้อมูลจาก Cloud...
                </div>
             </div>
          ) : data.length === 0 ? (
             <div className={`h-64 flex flex-col items-center justify-center border rounded-2xl text-rose-500 ${isDark ? 'border-rose-500/30 bg-rose-500/5' : 'border-rose-200 bg-rose-50'}`}>
                <Database className="w-8 h-8 mb-2 opacity-70" />
                <p className="font-semibold">ยังไม่มีข้อมูลใน Database</p>
                <p className="text-xs opacity-80 mt-1">กรุณารันไฟล์ data_worker.py เพื่อส่งข้อมูลสภาพอากาศขึ้นมา</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.map((loc, idx) => (
                <div key={idx} className={`p-5 rounded-xl border flex justify-between items-center transition-colors duration-300 ${t.card} ${t.cardHover}`}>
                  <div>
                    <h4 className={`font-bold ${t.textStrong}`}>{loc.name}</h4>
                    <p className={`text-xs mt-1 font-mono font-medium ${t.textMuted}`}>
                      {loc.source === 'TMD + Satellite' ? '🟢 Data Fusion' : '🟡 NWP Model'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-semibold ${layerInfo[layer].color}`}>
                      {(loc[layer] || 0).toFixed(1)}
                      <span className={`text-sm ml-1 font-medium ${t.textMuted}`}>{layerInfo[layer].unit}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Debug Logs */}
        {systemStatus.logs && systemStatus.logs.length > 0 && (
          <div className={`mt-8 p-4 border rounded-xl ${isDark ? 'bg-rose-500/10 border-rose-500/20' : 'bg-rose-50 border-rose-200'}`}>
            <h4 className={`text-sm font-bold mb-2 flex items-center gap-2 ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>
              <AlertTriangle className="w-4 h-4" /> ปัญหาขณะ Python ดึงข้อมูล (Worker Logs)
            </h4>
            <ul className={`text-xs space-y-1 font-mono ${isDark ? 'text-rose-300/80' : 'text-rose-600/80'}`}>
              {systemStatus.logs.map((log, i) => <li key={i}>{log}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}