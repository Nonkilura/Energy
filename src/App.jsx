import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet'; // Import โดยตรง (ต้องติดตั้งผ่าน npm install leaflet)
import 'leaflet/dist/leaflet.css'; // Import CSS โดยตรง
import { Thermometer, Wind, Droplets, AlertTriangle, CheckCircle2, MapPin, RefreshCw, Database, CloudRain, Cloud, Gauge, Sun, Moon, Menu, X, Map as MapIcon, LayoutDashboard, Sprout } from 'lucide-react';

// ปรับแก้ Icon ของ Leaflet (แก้บั๊ก Marker หายเวลาทำ Build)
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, shadowUrl: markerShadow });

const LOCATIONS_COORDS = {
  "เชียงใหม่": { lat: 18.79, lon: 98.98 },
  "ขอนแก่น": { lat: 16.48, lon: 102.82 },
  "กรุงเทพมหานคร": { lat: 13.75, lon: 100.50 },
  "ระยอง": { lat: 12.68, lon: 101.27 },
  "หัวหิน": { lat: 12.56, lon: 99.95 },
  "สุราษฎร์ธานี": { lat: 9.14, lon: 99.32 },
  "ภูเก็ต": { lat: 7.88, lon: 98.39 },
  "หาดใหญ่": { lat: 7.00, lon: 100.46 },
  "สงขลา": { lat: 7.19, lon: 100.59 }
};

export default function App() {
  const FIREBASE_URL = "https://energyme-8727d-default-rtdb.asia-southeast1.firebasedatabase.app/energy_data.json";

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [layer, setLayer] = useState('tc');
  const [theme, setTheme] = useState('dark');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState('map');

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersLayer = useRef(null);
  const tileLayer = useRef(null);
  const isDark = theme === 'dark';

  const t = {
    bg: isDark ? 'bg-slate-950' : 'bg-gray-50',
    text: isDark ? 'text-slate-200' : 'text-slate-700',
    sidebar: isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200',
    card: isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200 shadow-sm',
    btnActive: isDark ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-900',
    btnInactive: isDark ? 'text-slate-400' : 'text-slate-500'
  };

  const layerInfo = {
    'agri_risk': { name: '⚠️ ประเมินวิกฤต', icon: <Sprout className="w-5 h-5 text-green-500" />, unit: '', color: 'text-green-500' },
    'tc': { name: 'อุณหภูมิ', icon: <Thermometer className="w-5 h-5 text-orange-500" />, unit: '°C', color: 'text-orange-500' },
    'ws10': { name: 'ความเร็วลม', icon: <Wind className="w-5 h-5 text-teal-500" />, unit: ' km/h', color: 'text-teal-500' },
    'rh': { name: 'ความชื้น', icon: <Droplets className="w-5 h-5 text-blue-500" />, unit: '%', color: 'text-blue-500' },
    'rain_prob': { name: 'โอกาสฝน', icon: <CloudRain className="w-5 h-5 text-indigo-500" />, unit: '%', color: 'text-indigo-500' }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(FIREBASE_URL);
      const dbData = await res.json();
      if (dbData?.data) {
        setData(dbData.data.map(item => ({
          ...item,
          lat: item.lat || LOCATIONS_COORDS[item.name]?.lat,
          lon: item.lon || LOCATIONS_COORDS[item.name]?.lon,
        })));
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // 🗺️ ระบบแผนที่ (Core)
  useEffect(() => {
    if (!mapInstance.current && mapRef.current) {
      mapInstance.current = L.map(mapRef.current).setView([13.73, 100.52], 6);
      tileLayer.current = L.tileLayer(isDark
        ? "https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png"
        : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
      ).addTo(mapInstance.current);
      markersLayer.current = L.layerGroup().addTo(mapInstance.current);
    }
  }, []);

  // อัปเดตสีแผนที่เมื่อเปลี่ยนธีม
  useEffect(() => {
    if (tileLayer.current) {
      tileLayer.current.setUrl(isDark
        ? "https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png"
        : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
      );
    }
  }, [isDark]);

  // พล็อตจุดข้อมูล
  useEffect(() => {
    if (markersLayer.current) {
      markersLayer.current.clearLayers();
      data.forEach(loc => {
        if (loc.lat && loc.lon) {
          L.circleMarker([loc.lat, loc.lon], { radius: 12, color: '#10b981', fillOpacity: 0.8 })
            .addTo(markersLayer.current)
            .bindTooltip(`${loc.name}: ${(loc[layer] || 0).toFixed(1)}${layerInfo[layer].unit}`);
        }
      });
    }
  }, [data, layer]);

  useEffect(() => { fetchData(); }, []);

  return (
    <div className={`h-screen w-full flex ${t.bg}`}>
      {isSidebarOpen && (
        <aside className={`${t.sidebar} w-64 p-4 border-r flex flex-col`}>
          <h1 className="text-xl font-bold mb-6">Propolis</h1>
          {Object.keys(layerInfo).map(key => (
            <button key={key} onClick={() => setLayer(key)} className="flex items-center gap-3 p-3 hover:bg-slate-700/20 rounded">
              {layerInfo[key].icon} {layerInfo[key].name}
            </button>
          ))}
          <button onClick={() => setTheme(isDark ? 'light' : 'dark')} className="mt-auto p-3 border rounded">
            {isDark ? 'โหมดสว่าง' : 'โหมดมืด'}
          </button>
        </aside>
      )}

      <main className="flex-1 relative">
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="absolute top-4 left-4 z-[1000] p-2 bg-white rounded shadow">
          <Menu size={24} />
        </button>
        <div ref={mapRef} className="w-full h-full" />
      </main>
    </div>
  );
}