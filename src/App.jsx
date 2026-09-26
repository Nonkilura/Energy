import React, { useState, useEffect, useRef } from 'react';
import { Thermometer, Wind, Droplets, AlertTriangle, CheckCircle2, MapPin, RefreshCw, CloudRain, Cloud, Gauge, Sun, Moon, Menu, X, Map as MapIcon, LayoutDashboard, Sprout, Search, Star } from 'lucide-react';

const loadLeaflet = () => {
  return new Promise((resolve) => {
    if (window.L) return resolve(window.L);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => resolve(window.L);
    document.head.appendChild(script);
  });
};

export default function App() {
  const FIREBASE_URL = "https://energyme-8727d-default-rtdb.asia-southeast1.firebasedatabase.app/energy_data.json";

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [layer, setLayer] = useState('tc');
  const [isDark, setIsDark] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Pinning System
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('weatherPins');
    return saved ? JSON.parse(saved) : ["กรุงเทพมหานคร"];
  });

  const [systemStatus, setSystemStatus] = useState({ success: 0, total: 0, lastUpdated: "ไม่ทราบเวลา" });

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const tileLayer = useRef(null);
  const markersLayer = useRef(null);

  const setTheme = (theme) => setIsDark(theme === 'dark');
  const t = {
    bg: isDark ? 'bg-slate-900' : 'bg-slate-50',
    text: isDark ? 'text-slate-200' : 'text-slate-800',
    textMuted: isDark ? 'text-slate-400' : 'text-slate-500',
    textStrong: isDark ? 'text-white' : 'text-slate-900',
    sidebar: isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200',
    card: isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm',
  };

  const layerInfo = {
    'tc': { name: 'อุณหภูมิ', icon: <Thermometer className="w-5 h-5 text-orange-500" />, unit: '°C', color: 'text-orange-500' },
    'rain_prob': { name: 'โอกาสฝนตก (พยากรณ์)', icon: <CloudRain className="w-5 h-5 text-indigo-500" />, unit: '%', color: 'text-indigo-500' },
    'rain_mm': { name: 'ปริมาณฝนสะสม', icon: <Droplets className="w-5 h-5 text-blue-400" />, unit: ' มม.', color: 'text-blue-400' },
    'ws10': { name: 'ความเร็วลม', icon: <Wind className="w-5 h-5 text-teal-500" />, unit: ' km/h', color: 'text-teal-500' },
    'rh': { name: 'ความชื้นสัมพัทธ์', icon: <Cloud className="w-5 h-5 text-blue-500" />, unit: '%', color: 'text-blue-500' }
  };

  const toggleFavorite = (province) => {
    setFavorites(prev => {
      const newFavs = prev.includes(province) ? prev.filter(p => p !== province) : [...prev, province];
      localStorage.setItem('weatherPins', JSON.stringify(newFavs));
      return newFavs;
    });
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(FIREBASE_URL);
      const dbData = await res.json();
      if (dbData && dbData.data) {
        setData(dbData.data);
        setSystemStatus({
          success: dbData.successCount || 0,
          total: dbData.data.length || 0,
          lastUpdated: dbData.updated || "ไม่ทราบเวลา"
        });
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

  // Map Initialization
  useEffect(() => {
    let isMounted = true;
    loadLeaflet().then((L) => {
      if (!isMounted || !mapRef.current) return;
      if (!mapInstance.current) {
        mapInstance.current = L.map(mapRef.current, { center: [13.75, 100.5], zoom: 6, zoomControl: false });
        tileLayer.current = L.tileLayer(
          isDark ? "https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        ).addTo(mapInstance.current);
        markersLayer.current = L.layerGroup().addTo(mapInstance.current);
      }
    });
    return () => { isMounted = false; };
  }, []);

  // Update Map Markers
  useEffect(() => {
    if (window.L && mapInstance.current && markersLayer.current && data.length > 0) {
      markersLayer.current.clearLayers();
      data.forEach(loc => {
        if (loc.lat && loc.lon) {
          const val = loc[layer] || 0;
          let color = '#3b82f6';
          if (layer === 'tc') color = val > 35 ? '#ef4444' : val > 30 ? '#f97316' : '#3b82f6';

          const marker = window.L.circleMarker([loc.lat, loc.lon], { radius: 10, color, fillColor: color, fillOpacity: 0.8, weight: 1 });
          marker.bindTooltip(`<b>${loc.name} (${loc.province})</b><br/>${layerInfo[layer].name}: ${val}${layerInfo[layer].unit}`);
          markersLayer.current.addLayer(marker);
        }
      });
    }
  }, [data, layer, isDark]);

  const filteredData = data.filter(d =>
    d.name.includes(searchQuery) || d.province.includes(searchQuery)
  );

  const pinnedData = data.filter(d => favorites.includes(d.province));

  return (
    <div className={`h-screen w-full flex overflow-hidden ${t.bg} ${t.text} font-sans`}>
      {/* Sidebar */}
      <div className={`${t.sidebar} flex flex-col z-40 h-full border-r w-72 p-6`}>
        <h1 className="text-2xl font-bold tracking-tight mb-8">Propolis</h1>

        <div className="mb-6">
            <label className={`block text-xs font-bold ${t.textMuted} uppercase mb-3`}>มุมมอง</label>
            <button onClick={() => setActiveView('dashboard')} className={`w-full flex items-center gap-3 p-3 rounded-lg border mb-2 ${activeView === 'dashboard' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-transparent border-transparent'}`}>
              <LayoutDashboard className="w-5 h-5" /> แผงควบคุม
            </button>
            <button onClick={() => setActiveView('map')} className={`w-full flex items-center gap-3 p-3 rounded-lg border ${activeView === 'map' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-transparent border-transparent'}`}>
              <MapIcon className="w-5 h-5" /> แผนที่
            </button>
        </div>

        <div className="mb-6">
            <label className={`block text-xs font-bold ${t.textMuted} uppercase mb-3`}>ชั้นข้อมูล (แผนที่)</label>
            {Object.keys(layerInfo).map(key => (
              <button key={key} onClick={() => setLayer(key)} className={`w-full flex items-center gap-3 p-3 rounded-lg border mb-2 ${layer === key ? 'bg-slate-100 border-slate-300 font-bold' : 'border-transparent'}`}>
                {layerInfo[key].icon} <span className="text-sm">{layerInfo[key].name}</span>
              </button>
            ))}
        </div>

        <div className="mt-auto p-4 rounded-xl border bg-emerald-50 border-emerald-100">
            <p className="text-xs font-bold text-emerald-700">สถานะ: เชื่อมต่อ TMD สำเร็จ</p>
            <p className="text-xs text-emerald-600 mt-1">สถานี: {systemStatus.success} / {systemStatus.total}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative h-full flex flex-col">
        {/* Header Actions */}
        <div className="absolute top-4 right-4 z-[2000] flex gap-2">
            <button onClick={fetchData} className="px-4 py-2 bg-white border rounded-lg shadow-sm flex items-center gap-2 text-sm font-semibold">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> อัปเดตข้อมูล
            </button>
        </div>

        {/* MAP VIEW */}
        <div className={`w-full h-full absolute inset-0 transition-opacity ${activeView === 'map' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
          <div ref={mapRef} className="w-full h-full"></div>
        </div>

        {/* DASHBOARD VIEW */}
        <div className={`w-full h-full overflow-y-auto p-8 pt-20 absolute inset-0 ${t.bg} ${activeView === 'dashboard' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
          <div className="max-w-7xl mx-auto">

            {/* Search Bar */}
            <div className="relative mb-8">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="ค้นหาจังหวัด หรือ ชื่อสถานี..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-12 pr-4 py-4 rounded-xl border shadow-sm outline-none ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-200 text-slate-900 focus:border-blue-500'}`}
              />
            </div>

            {/* Pinned Locations (Favorites) */}
            {searchQuery === "" && (
              <div className="mb-10">
                <h3 className="text-lg font-bold flex items-center gap-2 mb-4"><Star className="text-yellow-500 fill-yellow-500" /> สถานีที่ปักหมุดไว้</h3>
                {pinnedData.length === 0 ? (
                  <p className={t.textMuted}>ยังไม่มีสถานีที่ปักหมุด ค้นหาและกดรูปดาวเพื่อเพิ่มสถานีโปรด</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pinnedData.map((loc, idx) => (
                      <StationCard key={idx} loc={loc} t={t} isPinned={true} toggleFav={() => toggleFavorite(loc.province)} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* All/Search Results */}
            <div>
              <h3 className="text-lg font-bold mb-4">{searchQuery ? 'ผลการค้นหา' : 'สถานีทั้งหมด'}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredData.map((loc, idx) => (
                  <StationCard key={idx} loc={loc} t={t} isPinned={favorites.includes(loc.province)} toggleFav={() => toggleFavorite(loc.province)} />
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

function StationCard({ loc, t, isPinned, toggleFav }) {
  return (
    <div className={`p-5 rounded-xl border flex flex-col gap-4 ${t.card}`}>
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-bold text-lg">{loc.name}</h4>
          <p className={`text-sm ${t.textMuted}`}>{loc.province}</p>
        </div>
        <button onClick={toggleFav} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <Star className={`w-5 h-5 ${isPinned ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-2">
        <div>
          <p className={`text-xs ${t.textMuted} mb-1 flex items-center gap-1`}><Thermometer className="w-3 h-3"/> อุณหภูมิ (TMD)</p>
          <p className="font-semibold text-xl text-orange-500">{loc.tc.toFixed(1)}°C</p>
        </div>
        <div>
          <p className={`text-xs ${t.textMuted} mb-1 flex items-center gap-1`}><CloudRain className="w-3 h-3"/> โอกาสฝน (พยากรณ์)</p>
          <p className="font-semibold text-xl text-indigo-500">{loc.rain_prob}%</p>
        </div>
      </div>
    </div>
  );
}