import React, { useState, useEffect, useRef } from 'react';
import { Thermometer, Wind, Droplets, AlertTriangle, CheckCircle2, MapPin, RefreshCw, Database, CloudRain, Cloud, Gauge, Sun, Moon, Menu, X, Map as MapIcon, LayoutDashboard, Sprout } from 'lucide-react';

// โหลด Leaflet ผ่าน CDN (แก้ปัญหา Dependency บนระบบ Preview)
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

  // --- ตัวแปร State ที่จำเป็นทั้งหมด (รอบก่อนหน้าส่วนนี้หายไป) ---
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [layer, setLayer] = useState('tc');
  const [isDark, setIsDark] = useState(false);
  const [activeView, setActiveView] = useState('map');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [systemStatus, setSystemStatus] = useState({ success: 0, total: 9, logs: [], lastUpdated: "ไม่ทราบเวลา" });
  const [lastMetrics, setLastMetrics] = useState({ avg: 0, max: 0, maxLocation: "" });

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const tileLayer = useRef(null);
  const markersLayer = useRef(null);

  // --- การตั้งค่าตีม (Theme) ---
  const setTheme = (theme) => setIsDark(theme === 'dark');
  const t = {
    bg: isDark ? 'bg-slate-900' : 'bg-slate-50',
    text: isDark ? 'text-slate-200' : 'text-slate-800',
    textMuted: isDark ? 'text-slate-400' : 'text-slate-500',
    textStrong: isDark ? 'text-white' : 'text-slate-900',
    sidebar: isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200',
    card: isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm',
    cardHover: isDark ? 'hover:bg-slate-700/50' : 'hover:shadow-md',
    btnActive: isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-blue-50 border-blue-200 text-blue-700',
    btnInactive: isDark ? 'bg-transparent border-transparent hover:bg-slate-800 text-slate-400' : 'bg-transparent border-transparent hover:bg-gray-100 text-slate-600',
    themeToggleBg: isDark ? 'bg-slate-800' : 'bg-slate-100',
    statusSuccessBg: isDark ? 'bg-emerald-900/20 border-emerald-800' : 'bg-emerald-50 border-emerald-100',
    statusSuccessText: isDark ? 'text-emerald-400' : 'text-emerald-700',
    statusErrorBg: isDark ? 'bg-rose-900/20 border-rose-800' : 'bg-rose-50 border-rose-100',
    statusErrorText: isDark ? 'text-rose-400' : 'text-rose-700',
  };

  const layerInfo = {
    'agri_risk': { name: 'คำแนะนำการเกษตร', icon: <Sprout className="w-5 h-5 text-green-500" />, unit: '', color: 'text-green-500' },
    'tc': { name: 'อุณหภูมิ', icon: <Thermometer className="w-5 h-5 text-orange-500" />, unit: '°C', color: 'text-orange-500' },
    'ws10': { name: 'ความเร็วลม', icon: <Wind className="w-5 h-5 text-teal-500" />, unit: ' km/h', color: 'text-teal-500' },
    'rh': { name: 'ความชื้นสัมพัทธ์', icon: <Droplets className="w-5 h-5 text-blue-500" />, unit: '%', color: 'text-blue-500' },
    'pressure': { name: 'ความกดอากาศ', icon: <Gauge className="w-5 h-5 text-purple-500" />, unit: ' hPa', color: 'text-purple-500' },
    'cloud': { name: 'ปริมาณเมฆ', icon: <Cloud className={`w-5 h-5 ${isDark ? 'text-slate-300' : 'text-slate-500'}`} />, unit: '%', color: isDark ? 'text-slate-300' : 'text-slate-500' },
    'rain_mm': { name: 'ปริมาณฝน (WMO)', icon: <CloudRain className="w-5 h-5 text-blue-400" />, unit: ' มม.', color: 'text-blue-400' },
    'rain_prob': { name: 'โอกาสเกิดฝน', icon: <CloudRain className="w-5 h-5 text-indigo-500" />, unit: '%', color: 'text-indigo-500' }
  };

  // ประเมินระดับฝน
  const analyzeRainIntensity = (mm) => {
    if (mm === 0) return { label: 'ไม่มีฝน', bg: isDark ? 'bg-slate-800/50' : 'bg-gray-100', color: isDark ? 'text-slate-400' : 'text-gray-500' };
    if (mm < 2.5) return { label: 'ฝนเล็กน้อย', bg: isDark ? 'bg-blue-900/40' : 'bg-blue-100', color: isDark ? 'text-blue-300' : 'text-blue-700' };
    if (mm < 10) return { label: 'ฝนปานกลาง', bg: isDark ? 'bg-indigo-900/40' : 'bg-indigo-100', color: isDark ? 'text-indigo-300' : 'text-indigo-700' };
    if (mm < 50) return { label: 'ฝนหนัก', bg: isDark ? 'bg-purple-900/40' : 'bg-purple-100', color: isDark ? 'text-purple-300' : 'text-purple-700' };
    return { label: 'ฝนตกหนักมาก', bg: isDark ? 'bg-rose-900/40' : 'bg-rose-100', color: isDark ? 'text-rose-300' : 'text-rose-700' };
  };

  // ฟังก์ชัน AI จำลองสำหรับประเมินวิกฤตการเกษตร
  const calculateAgriRisk = (loc) => {
    let riskLevel = 0; // 0=ปกติ, 1=เฝ้าระวัง(เหลือง), 2=วิกฤต(แดง)
    let warnings = [];
    let advice = "สภาพอากาศปกติ เหมาะแก่การเพาะปลูก";

    const wind = loc.ws10 || 0;
    const rain = loc.rain_prob || 0;
    const cloud = loc.cloud || 0;
    const temp = loc.tc || 0;
    const rh = loc.rh || 0;
    const pressure = loc.pressure || 1010;

    // 1. พายุลมแรง
    if (wind > 35 || pressure < 1000) {
      riskLevel = 2;
      warnings.push("🌪️ เสี่ยงพายุลมแรง");
      advice = "เสริมความแข็งแรงโรงเรือน งดฉีดพ่นสารเคมี";
    } else if (wind > 20) {
      riskLevel = Math.max(riskLevel, 1);
      warnings.push("💨 ลมกระโชกแรง ");
    }

    // 2. ฝนตกหนัก/Rain Bomb
    if (rain > 80 && cloud > 80) {
      riskLevel = 2;
      warnings.push("🌧️ เสี่ยงฝนตกหนักกระจุกตัว (Rain Bomb)");
      advice = "เปิดทางระบายน้ำทันที เฝ้าระวังน้ำขังรากเน่า";
    } else if (rain > 60) {
      riskLevel = Math.max(riskLevel, 1);
      warnings.push("🌦️ ฝนตกต่อเนื่อง");
      if(riskLevel === 1) advice = "เตรียมรับมือฝนตก วางแผนเก็บเกี่ยว";
    }

    // 3. ภัยแล้ง / Heat Stress
    if (temp > 38 && rh < 40) {
      riskLevel = Math.max(riskLevel, 2);
      warnings.push("🔥 ร้อนจัดและแห้งแล้ง");
      if(!advice.includes("พายุ") && !advice.includes("ฝน")) advice = "เพิ่มรอบการให้น้ำ เฝ้าระวังสัตว์เลี้ยงช็อกแดด (Heatstroke)";
    }

    // 4. โรคพืชจากความชื้น
    if (temp >= 28 && temp <= 32 && rh > 85 && rain < 50) {
       riskLevel = Math.max(riskLevel, 1);
       warnings.push("🍄 เสี่ยงโรครา/เชื้อราในพืช");
       if(!warnings.includes("พายุ")) advice = "เฝ้าระวังโรคใบไหม้ หมั่นตรวจแปลง";
    }

    return {
      level: riskLevel,
      warnings: warnings.length > 0 ? warnings : ["✅ สภาพอากาศแจ่มใส"],
      advice: advice,
      color: riskLevel === 2 ? '#ef4444' : riskLevel === 1 ? '#eab308' : '#22c55e'
    };
  };

  const getMarkerColor = (value, currentLayer, locData = null) => {
    if (currentLayer === 'agri_risk' && locData) return calculateAgriRisk(locData).color;
    if (currentLayer === 'tc') return value > 35 ? '#ef4444' : value > 30 ? '#f97316' : '#3b82f6';
    if (currentLayer === 'ws10') return value > 20 ? '#a855f7' : value > 10 ? '#14b8a6' : '#64748b';
    if (currentLayer === 'rh') return value > 80 ? '#2563eb' : value > 50 ? '#3b82f6' : '#93c5fd';
    if (currentLayer === 'pressure') return value > 1015 ? '#8b5cf6' : '#c084fc';
    if (currentLayer === 'cloud') return value > 70 ? '#64748b' : '#cbd5e1';
    if (currentLayer === 'rain_mm') return value > 5 ? '#a855f7' : value > 0 ? '#3b82f6' : (isDark ? '#475569' : '#9ca3af');
    if (currentLayer === 'rain_prob') return value > 70 ? '#4f46e5' : value > 30 ? '#6366f1' : '#9ca3af';
    return isDark ? '#e2e8f0' : '#475569';
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(FIREBASE_URL);
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      const dbData = await res.json();
      if (dbData && dbData.data) {
        const mergedData = dbData.data.map(item => ({
          ...item,
          lat: item.lat || LOCATIONS_COORDS[item.name]?.lat,
          lon: item.lon || LOCATIONS_COORDS[item.name]?.lon,
        }));
        setData(mergedData);
        setSystemStatus({
          success: dbData.successCount || 0,
          total: dbData.data.length || 9,
          logs: dbData.logs || [],
          lastUpdated: dbData.updated || "ไม่ทราบเวลา"
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

  // คำนวณสถิติ
  useEffect(() => {
    if (!loading && data.length > 0) {
      const currentAvg = data.reduce((acc, curr) => acc + (curr[layer] || 0), 0) / data.length;

      let currentMax = -Infinity;
      let maxLocName = "";

      data.forEach(d => {
        const val = d[layer] || 0;
        if (val > currentMax) {
          currentMax = val;
          maxLocName = d.name;
        } else if (val === currentMax && maxLocName !== d.name) {
          if(!maxLocName.includes(d.name)) maxLocName += `, ${d.name}`;
        }
      });

      const parts = maxLocName.split(',');
      if (parts.length > 2) {
          maxLocName = `${parts[0].trim()}, ${parts[1].trim()} และอีก ${parts.length - 2} แห่ง`;
      }
      setLastMetrics({ avg: currentAvg, max: currentMax, maxLocation: maxLocName });
    }
  }, [layer, loading, data]);

  // สร้างแผนที่ Leaflet
  useEffect(() => {
    let isMounted = true;
    let L;

    loadLeaflet().then((leaflet) => {
      if (!isMounted) return; // Abort if component unmounted during the fetch
      L = leaflet;

      const mapContainer = mapRef.current;

      // Ensure container exists AND Leaflet hasn't already tagged it
      if (mapContainer && !mapContainer._leaflet_id && !mapInstance.current) {
        mapInstance.current = L.map(mapContainer, {
          center: [13.736717, 100.523186],
          zoom: 6,
          zoomControl: false
        });

        tileLayer.current = L.tileLayer(
          isDark
            ? "https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
          { attribution: '&copy; Carto' }
        ).addTo(mapInstance.current);

        markersLayer.current = L.layerGroup().addTo(mapInstance.current);
      }
    });

    return () => {
      isMounted = false;
      if (mapInstance.current) {
        mapInstance.current.off(); // Detach event listeners
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []); // isDark is purposefully excluded here to prevent map destruction

  // อัปเดตตีมของแผนที่
  useEffect(() => {
    if (mapInstance.current && tileLayer.current) {
      const newUrl = isDark
        ? "https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
      tileLayer.current.setUrl(newUrl);

      const container = mapRef.current;
      if(container) container.style.backgroundColor = isDark ? '#0f172a' : '#f8fafc';
    }
  }, [isDark]);

  // อัปเดตหมุดบนแผนที่
  useEffect(() => {
    if (window.L && mapInstance.current && markersLayer.current && data.length > 0) {
      const L = window.L;
      markersLayer.current.clearLayers();

      data.forEach(loc => {
        if (loc.lat && loc.lon) {
          const color = getMarkerColor(loc[layer], layer, loc);
          let tooltipContent = '';

          if (layer === 'agri_risk') {
            const risk = calculateAgriRisk(loc);
            tooltipContent = `
              <div style="text-align: center; font-family: sans-serif; color: ${isDark ? 'white' : 'black'}; min-width: 180px;">
                <strong style="display: block; border-bottom: 1px solid rgba(128,128,128,0.3); padding-bottom: 4px; margin-bottom: 4px; font-size: 14px;">${loc.name}</strong>
                <div style="font-size: 13px; font-weight: bold; color: ${risk.color}; margin-bottom: 6px;">
                  ${risk.warnings.join('<br/>')}
                </div>
                <div style="font-size: 11px; background: ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}; padding: 6px; border-radius: 4px;">
                  💡 ${risk.advice}
                </div>
              </div>
            `;
          } else {
            tooltipContent = `
              <div style="text-align: center; font-family: sans-serif; color: ${isDark ? 'white' : 'black'}">
                <strong style="display: block; border-bottom: 1px solid rgba(128,128,128,0.3); padding-bottom: 4px; margin-bottom: 4px;">${loc.name}</strong>
                <div style="font-size: 12px;">
                  <div style="display: flex; justify-content: space-between; gap: 16px;">
                    <span>${layerInfo[layer].name}:</span>
                    <strong>${(loc[layer] || 0).toFixed(1)}${layerInfo[layer].unit}</strong>
                  </div>
                </div>
              </div>
            `;
          }

          const marker = L.circleMarker([loc.lat, loc.lon], {
            radius: 18,
            color: color,
            fillColor: color,
            fillOpacity: 0.6,
            weight: 2
          });

          marker.bindTooltip(tooltipContent, { direction: 'top', offset: [0, -10], opacity: 1, className: isDark ? 'dark-tooltip' : 'light-tooltip' });
          markersLayer.current.addLayer(marker);
        }
      });
    }
  }, [data, layer, isDark]);

  useEffect(() => {
      if(activeView === 'map' && mapInstance.current) {
          setTimeout(() => { mapInstance.current.invalidateSize(); }, 400);
      }
  }, [activeView, isSidebarOpen]);

  const renderLegend = () => {
    let items = [];
    if (layer === 'agri_risk') {
      items = [{ c: '#22c55e', l: 'ปกติ' }, { c: '#eab308', l: 'เฝ้าระวัง' }, { c: '#ef4444', l: 'วิกฤต' }];
    } else if (layer === 'tc') {
      items = [{ c: '#3b82f6', l: '< 30°C' }, { c: '#f97316', l: '30-35°C' }, { c: '#ef4444', l: '> 35°C' }];
    } else if (layer === 'ws10') {
      items = [{ c: '#64748b', l: 'ลมอ่อน' }, { c: '#14b8a6', l: 'ปานกลาง' }, { c: '#a855f7', l: 'ลมแรง' }];
    } else if (layer === 'rh') {
      items = [{ c: '#93c5fd', l: '< 50%' }, { c: '#3b82f6', l: '50-80%' }, { c: '#2563eb', l: '> 80%' }];
    } else if (layer === 'rain_mm') {
      items = [{ c: isDark ? '#475569' : '#9ca3af', l: 'ไม่มีฝน (0 มม.)' }, { c: '#3b82f6', l: 'ฝนเล็กน้อย' }, { c: '#a855f7', l: 'ฝนตกหนัก' }];
    } else {
      items = [{ c: '#9ca3af', l: 'ต่ำ' }, { c: '#6366f1', l: 'ปานกลาง' }, { c: '#4f46e5', l: 'สูง' }];
    }

    return (
      <div className={`absolute bottom-12 right-6 z-[1000] px-4 py-3 rounded-xl shadow-lg border backdrop-blur-md ${isDark ? 'bg-slate-900/90 border-slate-700 text-white' : 'bg-white/95 border-gray-200 text-slate-800'}`}>
        <h4 className="text-xs font-bold mb-2 uppercase tracking-wider opacity-80">คำอธิบายสี (Legend)</h4>
        <div className="flex flex-col gap-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="w-4 h-4 rounded-full border shadow-sm" style={{ backgroundColor: item.c, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}></span>
              <span className="font-medium">{item.l}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`h-screen w-full flex overflow-hidden ${t.bg} ${t.text} font-sans transition-colors duration-300`}>

      {/* 📍 Sidebar */}
      <div className={`${t.sidebar} flex flex-col z-40 transition-all duration-300 absolute md:relative h-full shadow-2xl md:shadow-none border-r ${isSidebarOpen ? 'w-72 translate-x-0' : 'w-72 -translate-x-full md:w-0 md:border-none'}`}>
        <div className={`p-6 flex-grow overflow-y-auto ${!isSidebarOpen ? 'md:hidden' : ''}`}>

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl shadow-sm p-1 flex items-center justify-center shrink-0 ${isDark ? 'bg-white' : 'bg-slate-50 border border-gray-200'}`}>
                <img src="/logo.png" alt="Propolis Logo" className="w-full h-full object-contain" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Propolis</h1>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 rounded-lg hover:bg-slate-500/20">
              <X size={20} />
            </button>
          </div>

          <div className={`flex p-1 rounded-lg mb-6 border ${t.themeToggleBg} ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>
            <button onClick={() => setTheme('light')} className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-semibold transition-all ${!isDark ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-300'}`}>
              <Sun size={14} /> สว่าง
            </button>
            <button onClick={() => setTheme('dark')} className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-semibold transition-all ${isDark ? 'bg-slate-700 shadow text-white' : 'text-slate-500 hover:text-slate-700'}`}>
              <Moon size={14} /> มืด
            </button>
          </div>

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

        <div className="absolute top-4 left-4 right-4 z-[2000] flex justify-between items-center pointer-events-none">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`pointer-events-auto p-3 rounded-xl shadow-lg border transition-all hover:scale-105 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-200 text-slate-800'}`}>
            <Menu size={20} />
          </button>

          <button onClick={fetchData} disabled={loading} className={`pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg border transition-all text-sm font-semibold hover:scale-105 ${isDark ? 'bg-slate-800 border-slate-700 text-emerald-400' : 'bg-white border-gray-200 text-emerald-600'}`}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'ซิงค์...' : 'รีเฟรช'}
          </button>
        </div>

        {/* 🗺️ MAP VIEW */}
        <div className={`w-full h-full absolute inset-0 transition-opacity duration-500 ${activeView === 'map' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
          <div ref={mapRef} className="w-full h-full z-0" style={{ backgroundColor: isDark ? '#0f172a' : '#f8fafc' }}></div>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
            <div className={`px-6 py-3 rounded-full shadow-xl border backdrop-blur-md flex items-center gap-3 ${isDark ? 'bg-slate-900/80 border-slate-700 text-white' : 'bg-white/90 border-gray-200 text-slate-800'}`}>
              {layerInfo[layer].icon}
              <span className="font-bold">โหมดแสดงผล: {layerInfo[layer].name}</span>
            </div>
          </div>

          {renderLegend()}
        </div>

        {/* 📊 DASHBOARD VIEW */}
        <div className={`w-full h-full overflow-y-auto p-8 pt-24 absolute inset-0 transition-opacity duration-500 ${t.bg} ${activeView === 'dashboard' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
          <div className="max-w-7xl mx-auto">
            <h2 className={`text-2xl font-bold mb-6 ${t.textStrong}`}>แผงควบคุมข้อมูลเชิงลึก (Dashboard)</h2>

            {layer === 'agri_risk' ? (
               <div className="mb-8">
                  <div className={`p-6 rounded-2xl border bg-gradient-to-br from-green-500/10 to-emerald-600/10 border-green-500/30 mb-6`}>
                    <h3 className={`text-xl font-bold mb-2 flex items-center gap-2 ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                      <Sprout size={24}/> แดชบอร์ดคำแนะนำการเกษตร
                    </h3>
                    <p className={`text-sm ${t.textMuted}`}>ระบบวิเคราะห์ข้อมูลจากหลายตัวแปรเพื่อแจ้งเตือนภัยพิบัติและโรคพืชล่วงหน้าให้เกษตรกร</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.map((loc, idx) => {
                      const risk = calculateAgriRisk(loc);
                      return (
                        <div key={idx} className={`p-5 rounded-xl border flex flex-col gap-3 transition-colors ${t.card} ${t.cardHover}`}>
                          <div className="flex justify-between items-start">
                             <h4 className={`text-lg font-bold ${t.textStrong}`}>{loc.name}</h4>
                             <span className="flex h-3 w-3 mt-1 relative">
                               {risk.level > 0 && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${risk.level === 2 ? 'bg-red-400' : 'bg-yellow-400'}`}></span>}
                               <span className={`relative inline-flex rounded-full h-3 w-3 ${risk.level === 2 ? 'bg-red-500' : risk.level === 1 ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
                             </span>
                          </div>
                          <div>
                            {risk.warnings.map((w, i) => (
                              <p key={i} className={`text-sm font-semibold mb-1 ${risk.level === 2 ? 'text-red-500' : risk.level === 1 ? 'text-amber-500' : 'text-green-500'}`}>{w}</p>
                            ))}
                          </div>
                          <div className={`mt-auto pt-3 border-t text-xs ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
                             <span className={t.textMuted}>คำแนะนำ: </span>
                             <span className={t.textStrong}>{risk.advice}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
               </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className={`p-6 rounded-2xl border ${t.card}`}>
                    <p className={`text-sm font-medium ${t.textMuted} mb-2`}>ค่าเฉลี่ยระดับประเทศ ({layerInfo[layer].name})</p>
                    <div className="flex items-end gap-3">
                      <h2 className={`text-4xl font-light ${t.textStrong}`}>{lastMetrics.avg.toFixed(1)}<span className={`text-xl ${t.textMuted} ml-1`}>{layerInfo[layer].unit}</span></h2>
                    </div>
                  </div>

                  <div className={`p-6 rounded-2xl border ${t.card}`}>
                    <p className={`text-sm font-medium ${t.textMuted} mb-2`}>ค่าสูงสุด (จากทุกจุดตรวจวัด)</p>
                    <div className="flex items-end gap-3">
                      <h2 className={`text-4xl font-light ${layerInfo[layer].color}`}>{lastMetrics.max.toFixed(1)}<span className={`text-xl ${t.textMuted} ml-1`}>{layerInfo[layer].unit}</span></h2>
                    </div>
                    {lastMetrics.maxLocation && (
                      <p className={`text-xs mt-3 ${t.textMuted} flex items-start gap-1`}>
                        <MapPin className="w-4 h-4 shrink-0 opacity-70" />
                        <span className="leading-tight">พบที่: <span className={`font-semibold ${t.textStrong}`}>{lastMetrics.maxLocation}</span></span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.map((loc, idx) => {
                    const rainStatus = analyzeRainIntensity(loc.rain_mm || 0);
                    return (
                    <div key={idx} className={`p-5 rounded-xl border flex flex-col justify-center transition-colors ${t.card} ${t.cardHover}`}>
                      <div className="flex justify-between items-center w-full">
                        <div>
                          <h4 className={`font-bold ${t.textStrong}`}>{loc.name}</h4>
                          <p className={`text-xs mt-1 font-mono ${t.textMuted}`}>
                            {loc.source?.includes('TMD') && ['tc', 'ws10', 'rh', 'pressure', 'rain_mm'].includes(layer)
                              ? '🟢 TMD API'
                              : '🟡 Open-Meteo Satellite'}
                          </p>
                        </div>
                        <div className={`text-2xl font-semibold ${layerInfo[layer].color}`}>
                          {(loc[layer] || 0).toFixed(1)}<span className={`text-sm ml-1 ${t.textMuted}`}>{layerInfo[layer].unit}</span>
                        </div>
                      </div>

                      {/* ป้ายกำกับอธิบายฝน (WMO) */}
                      {layer === 'rain_mm' && (
                        <div className={`mt-4 px-3 py-2 rounded-lg text-xs font-bold text-center transition-colors duration-300 ${rainStatus.bg} ${rainStatus.color}`}>
                          {rainStatus.label}
                        </div>
                      )}
                    </div>
                  )})}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .dark-tooltip { background-color: #1e293b !important; color: white !important; border-color: #334155 !important; }
        .light-tooltip { background-color: white !important; color: #1e293b !important; border-color: #e2e8f0 !important; }
        .leaflet-tooltip::before { border-top-color: inherit !important; }
      `}} />
    </div>
  );
}