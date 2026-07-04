import React, { useState, useEffect } from 'react';
import { Thermometer, Wind, Droplets, AlertTriangle, CheckCircle2, MapPin, RefreshCw, Database, CloudRain, Cloud, Gauge, Sun, Moon, Menu, X, Map as MapIcon, LayoutDashboard } from 'lucide-react';
// 🗺️ Import เครื่องมือสร้างแผนที่
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css'; // ต้องมีเพื่อให้แผนที่แสดงผลถูกต้อง

export default function App() {
  const FIREBASE_URL = "https://energyme-8727d-default-rtdb.asia-southeast1.firebasedatabase.app/energy_data.json";

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🎛️ State สำหรับควบคุม UI
  const [layer, setLayer] = useState('tc');
  const [theme, setTheme] = useState('dark');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState('map'); // 'map' หรือ 'dashboard'

  const [systemStatus, setSystemStatus] = useState({ success: 0, total: 9, logs: [], lastUpdated: "" });
  const [lastMetrics, setLastMetrics] = useState({ avg: 0, max: 0 });

  const isDark = theme === 'dark';

  // 🎨 ดิกชันนารีสี (Theme)
  const t = {
    bg: isDark ? 'bg-slate-950' : 'bg-gray-50',
    text: isDark ? 'text-slate-200' : 'text-slate-700',
    textMuted: isDark ? 'text-slate-400' : 'text-slate-500',
    textStrong: isDark ? 'text-white' : 'text-slate-900',
    sidebar: isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200',
    card: isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200 shadow-sm',
    cardHover: isDark ? 'hover:bg-slate-800/80' : 'hover:bg-gray-50',
    btnActive: isDark ? 'bg-slate-800 border-slate-700 shadow-md text-white' : 'bg-slate-100 border-gray-200 shadow-sm text-slate-900',
    btnInactive: isDark ? 'hover:bg-slate-800/50 text-slate-400 border-transparent' : 'hover:bg-gray-100 text-slate-500 border-transparent',
    statusSuccessBg: isDark ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200',
    statusErrorBg: isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200',
    statusSuccessText: isDark ? 'text-emerald-400' : 'text-emerald-600',
    statusErrorText: isDark ? 'text-amber-400' : 'text-amber-600',
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
    if (!loading && data.length > 0) setLastMetrics({ avg: currentAvg, max: currentMax });
  }, [layer, loading, currentAvg, currentMax, data]);

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

  // 🗺️ ฟังก์ชันกำหนดสีของ Marker บนแผนที่ตามค่าของข้อมูล
  const getMarkerColor = (value, currentLayer) => {
    if (currentLayer === 'tc') return value > 35 ? '#ef4444' : value > 30 ? '#f97316' : '#3b82f6';
    if (currentLayer === 'ws10') return value > 20 ? '#a855f7' : value > 10 ? '#14b8a6' : '#64748b';
    if (currentLayer === 'rain_prob') return value > 70 ? '#4f46e5' : value > 30 ? '#6366f1' : '#9ca3af';
    return isDark ? '#e2e8f0' : '#475569';
  };

  // 🌍 พิกัดศูนย์กลางประเทศไทย
  const THAILAND_CENTER = [13.736717, 100.523186];

  return (
    <div className={`h-screen w-full flex overflow-hidden ${t.bg} ${t.text} font-sans transition-colors duration-300`}>

      {/* 📍 Sidebar (แถบด้านข้าง) */}
      <div
        className={`${t.sidebar} flex flex-col z-40 transition-all duration-300 absolute md:relative h-full shadow-2xl md:shadow-none border-r
        ${isSidebarOpen ? 'w-72 translate-x-0' : 'w-72 -translate-x-full md:w-0 md:border-none'}`}
      >
        <div className={`p-6 flex-grow overflow-y-auto ${!isSidebarOpen ? 'md:hidden' : ''}`}>

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl shadow-sm p-1 flex items-center justify-center shrink-0 ${isDark ? 'bg-white' : 'bg-slate-50 border border-gray-200'}`}>
                <img src="/logo.png" alt="Propolis Logo" className="w-full h-full object-contain" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Propolis</h1>
            </div>
            {/* ปุ่มปิด Sidebar สำหรับมือถือ */}
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 rounded-lg hover:bg-slate-500/20">
              <X size={20} />
            </button>
          </div>

          {/* Theme Toggle */}
          <div className={`flex p-1 rounded-lg mb-6 border ${t.themeToggleBg} ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>
            <button onClick={() => setTheme('light')} className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-semibold transition-all ${!isDark ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-300'}`}>
              <Sun size={14} /> สว่าง
            </button>
            <button onClick={() => setTheme('dark')} className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-semibold transition-all ${isDark ? 'bg-slate-700 shadow text-white' : 'text-slate-500 hover:text-slate-700'}`}>
              <Moon size={14} /> มืด
            </button>
          </div>

          {/* Navigation Views */}
          <div className="mb-6">
            <label className={`block text-xs font-bold ${t.textMuted} uppercase tracking-wider mb-3`}>มุมมอง (Views)</label>
            <div className="space-y-2">
              <button onClick={() => setActiveView('map')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all border ${activeView === 'map' ? t.btnActive : t.btnInactive}`}>
                <MapIcon className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-medium">หน้าหลัก (แผนที่)</span>
              </button>
              <button onClick={() => setActiveView('dashboard')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all border ${activeView === 'dashboard' ? t.btnActive : t.btnInactive}`}>
                <LayoutDashboard className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-medium">แผงควบคุม (ตารางข้อมูล)</span>
              </button>
            </div>
          </div>

          {/* Layer Selection */}
          <div className="mb-6">
            <label className={`block text-xs font-bold ${t.textMuted} uppercase tracking-wider mb-3`}>ชั้นข้อมูล (Layers)</label>
            <div className="space-y-2">
              {Object.keys(layerInfo).map(key => (
                <button key={key} onClick={() => setLayer(key)} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all border ${layer === key ? t.btnActive : t.btnInactive}`}>
                  {layerInfo[key].icon}
                  <span className="text-sm font-medium">{layerInfo[key].name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className={`p-4 rounded-xl mt-auto border ${systemStatus.success > 0 ? t.statusSuccessBg : t.statusErrorBg}`}>
            <div className="flex items-center gap-3 mb-2">
              {systemStatus.success > 0 ? <CheckCircle2 className={`w-5 h-5 ${t.statusSuccessText}`} /> : <AlertTriangle className={`w-5 h-5 ${t.statusErrorText}`} />}
              <span className={`text-sm font-bold ${systemStatus.success > 0 ? t.statusSuccessText : t.statusErrorText}`}>สถานะเซิร์ฟเวอร์</span>
            </div>
            <p className="text-xs opacity-80">อัปเดต: {systemStatus.lastUpdated}</p>
          </div>
        </div>
      </div>

      {/* 🚀 Main Content Area */}
      <div className="flex-1 flex flex-col relative h-full">

        {/* Top Floating Bar (ปุ่มเปิด Sidebar + Refresh) */}
        <div className="absolute top-4 left-4 right-4 z-30 flex justify-between items-center pointer-events-none">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`pointer-events-auto p-3 rounded-xl shadow-lg border transition-all hover:scale-105 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-200 text-slate-800'}`}
          >
            <Menu size={20} />
          </button>

          <button
            onClick={fetchData}
            disabled={loading}
            className={`pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg border transition-all text-sm font-semibold hover:scale-105
            ${isDark ? 'bg-slate-800 border-slate-700 text-emerald-400' : 'bg-white border-gray-200 text-emerald-600'}`}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'ซิงค์...' : 'รีเฟรช'}
          </button>
        </div>

        {/* 🗺️ MAP VIEW */}
        <div className={`w-full h-full absolute inset-0 transition-opacity duration-500 ${activeView === 'map' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
          <MapContainer center={THAILAND_CENTER} zoom={6} className="w-full h-full z-0" zoomControl={false}>
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com/">Carto</a>'
              // 🎩 ทริคเปลี่ยนแผนที่เป็น Dark Mode ด้วย CSS Filter
              className={isDark ? 'map-tiles-dark' : ''}
            />

            {data.map((loc, idx) => (
              loc.lat && loc.lon && (
                <CircleMarker
                  key={idx}
                  center={[loc.lat, loc.lon]}
                  radius={18}
                  pathOptions={{
                    color: getMarkerColor(loc[layer], layer),
                    fillColor: getMarkerColor(loc[layer], layer),
                    fillOpacity: 0.6,
                    weight: 2
                  }}
                >
                  <Tooltip direction="top" offset={[0, -10]} opacity={1} className={isDark ? 'custom-tooltip-dark' : ''}>
                    <div className="text-center">
                      <strong className="text-sm">{loc.name}</strong>
                      <div className="mt-1 text-xs">
                        อุณหภูมิ: {(loc.tc || 0).toFixed(1)}°C<br/>
                        ความเร็วลม: {(loc.ws10 || 0).toFixed(1)} km/h
                      </div>
                      <div className="text-[10px] text-gray-500 mt-1">{loc.source}</div>
                    </div>
                  </Tooltip>
                </CircleMarker>
              )
            ))}
          </MapContainer>

          {/* Map Overlay Indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <div className={`px-6 py-3 rounded-full shadow-xl border backdrop-blur-md flex items-center gap-3
              ${isDark ? 'bg-slate-900/80 border-slate-700 text-white' : 'bg-white/90 border-gray-200 text-slate-800'}`}>
              {layerInfo[layer].icon}
              <span className="font-bold">โหมดแสดงผล: {layerInfo[layer].name}</span>
            </div>
          </div>
        </div>

        {/* 📊 DASHBOARD VIEW (มุมมองเดิม) */}
        <div className={`w-full h-full overflow-y-auto p-8 pt-24 absolute inset-0 transition-opacity duration-500 ${t.bg} ${activeView === 'dashboard' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
          <div className="max-w-7xl mx-auto">
            <h2 className={`text-2xl font-bold mb-6 ${t.textStrong}`}>ภาพรวมข้อมูล (Dashboard)</h2>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className={`p-6 rounded-2xl border ${t.card}`}>
                <p className={`text-sm font-medium ${t.textMuted} mb-2`}>ค่าเฉลี่ยระดับประเทศ</p>
                <div className="flex items-end gap-3">
                  <h2 className={`text-4xl font-light ${t.textStrong}`}>{currentAvg.toFixed(1)}<span className={`text-xl ${t.textMuted} ml-1`}>{layerInfo[layer].unit}</span></h2>
                </div>
              </div>
              <div className={`p-6 rounded-2xl border ${t.card}`}>
                <p className={`text-sm font-medium ${t.textMuted} mb-2`}>จุดวิกฤตสูงสุด (Max)</p>
                <div className="flex items-end gap-3">
                  <h2 className={`text-4xl font-light ${layerInfo[layer].color}`}>{currentMax.toFixed(1)}<span className={`text-xl ${t.textMuted} ml-1`}>{layerInfo[layer].unit}</span></h2>
                </div>
              </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.map((loc, idx) => (
                <div key={idx} className={`p-5 rounded-xl border flex justify-between items-center transition-colors ${t.card} ${t.cardHover}`}>
                  <div>
                    <h4 className={`font-bold ${t.textStrong}`}>{loc.name}</h4>
                    <p className={`text-xs mt-1 font-mono ${t.textMuted}`}>{loc.source.includes('TMD') ? '🟢 Data Fusion' : '🟡 NWP Model'}</p>
                  </div>
                  <div className={`text-2xl font-semibold ${layerInfo[layer].color}`}>
                    {(loc[layer] || 0).toFixed(1)}<span className={`text-sm ml-1 ${t.textMuted}`}>{layerInfo[layer].unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* CSS พิเศษสำหรับ Leaflet Map เพื่อให้เข้ากับระบบ Theme */}
      <style dangerouslySetInnerHTML={{__html: `
        .map-tiles-dark {
          filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
        }
        .leaflet-container {
          background-color: ${isDark ? '#0f172a' : '#f8fafc'};
        }
        .custom-tooltip-dark {
          background-color: #1e293b !important;
          color: white !important;
          border: 1px solid #334155 !important;
        }
        .custom-tooltip-dark .leaflet-tooltip-tip {
          background-color: #1e293b !important;
        }
      `}} />
    </div>
  );
}