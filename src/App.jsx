import React, { useState, useEffect } from 'react';
import { Thermometer, Wind, Droplets, AlertTriangle, CheckCircle2, MapPin, RefreshCw } from 'lucide-react';
/// อย่าลืมมาแก้ app.jsx จากเมื่อวานที่เจมมินี่ถึงลิมิต
export default function App() {
  // มาตรฐานอุตสาหกรรมสำหรับ Vite: ดึง Token จากไฟล์ .env
  // (ใส่ Fallback Token ไว้เผื่อกรณีที่ไฟล์ .env ของคุณมีปัญหา เพื่อรับประกันว่า Gov API จะทำงาน)
  const TMD_ACCESS_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjM2Y2I3ODk4OGUxNTVjYzBkOTVkOGE2OWY1ZTUyNDZiYTlkZjJkODNlZjJmMjgxZWE1ZjJiOGRkZDRiOTI3YjkxN2UwNjU0ZDVjODRiODIwIn0.eyJhdWQiOiIyIiwianRpIjoiMzZjYjc4OTg4ZTE1NWNjMGQ5NWQ4YTY5ZjVlNTI0NmJhOWRmMmQ4M2VmMmYyODFlYTVmMmI4ZGRkNGI5MjdiOTE3ZTA2NTRkNWM4NGI4MjAiLCJpYXQiOjE3ODIwOTkwMDIsIm5iZiI6MTc4MjA5OTAwMiwiZXhwIjoxODEzNjM1MDAyLCJzdWIiOiI1NDYyIiwic2NvcGVzIjpbXX0.ZDn7RcEsTGJ6FkyGs-sx8tp7tA7KlHwfmDtnwmR0WuerLfp34yQIYC5D4MfekUkDyvnv4H4y_7tNQOOxNzvfzpqM2OWz6occWurtugDKaOF6w-eqaJmwxdLv39ufR9d8RdCRmZINXcGT2TpGv39lzX8SyLgmHs0MXEMm13z4Duo8ZS1yqxlCEnhDeY4EAi5sR2CfFBRXX7nYNS9GmK91dudiUmw9ODT3CRoVYhTJEVba0DtZTOR0nC1Thtih6RivjW2aVcNgdVf8L07tBFzGf1CA347FbnSz_mYOHdWAp4VK3BZ0n31sispTNUhhTUzd9yV5798ypPb4-eTWZWpPhqFXql0VGHyxdaJyvIQg-Uj1ZZxJU_zSvteT_ke-y9xU0OmQ99zGm1SGLxII_2K519qmhpx8I0LnhoaT3dimmAqizHWAwn2SvyYJtsTlGSCCFp9FsXzef0Dbfq0jv9RUuCegBGMq70qgRIWO69LPrBbzxlcHOzNe9VNNmAHMpeh5yYbt7cRnpUZQhIR-xIvadF2qbFxbq5PFjOU-VZ4XwsfYe3i1-zz04IOkwVvVS_N8_-2p9Ok1YNT5P4_bJ8YnLY6FOCmSF7hhCLyL6Zw4hIlHUp7OpMMAoecceQf2WX_OQNmripECRCjrgM30qNgmKqNovVJuuyEuDS73JoMrObw";

  const locations = [
    { name: "เชียงใหม่", lat: 18.79, lon: 98.98 },
    { name: "ขอนแก่น", lat: 16.48, lon: 102.82 },
    { name: "กรุงเทพมหานคร", lat: 13.75, lon: 100.50 },
    { name: "ระยอง", lat: 12.68, lon: 101.27 },
    { name: "หัวหิน", lat: 12.56, lon: 99.95 },
    { name: "สุราษฎร์ธานี", lat: 9.14, lon: 99.32 },
    { name: "ภูเก็ต", lat: 7.88, lon: 98.39 },
    { name: "หาดใหญ่", lat: 7.00, lon: 100.46 },
    { name: "สงขลา", lat: 7.19, lon: 100.59 }
  ];

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [layer, setLayer] = useState('tc');
  const [systemStatus, setSystemStatus] = useState({ success: 0, total: locations.length, logs: [] });
  const [lastMetrics, setLastMetrics] = useState({ avg: 0, max: 0 });

  const fetchData = async () => {
    setLoading(true);
    let successCount = 0;
    const newData = [];
    const logs = [];

    for (const loc of locations) {
      let baseTemp = 0, baseWind = 0, baseRh = 0;
      let source = "Satellite Only";

      // 1. ดึงข้อมูล Open-Meteo (ระบบดาวเทียมสำรอง)
      try {
        const satUrl = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,wind_speed_10m,relative_humidity_2m`;
        const satRes = await fetch(satUrl);
        const satJson = await satRes.json();
        baseTemp = satJson.current?.temperature_2m || 0;
        baseWind = satJson.current?.wind_speed_10m || 0;
        baseRh = satJson.current?.relative_humidity_2m || 0;
      } catch (e) {
        logs.push(`${loc.name}: Satellite fetch failed. (${String(e.message || 'Unknown Error')})`);
      }

      // 2. ดึงข้อมูลรัฐบาล กรมอุตุนิยมวิทยา (TMD) แบบเรียกตรงๆ
      if (TMD_ACCESS_TOKEN) {
        try {
          // ดึงตรง ไม่ต้องผ่าน proxy ป้องกันปัญหา path ผิดเพี้ยน
          const tmdUrl = `https://data.tmd.go.th/nwpapi/v1/forecast/location/hourly/at?lat=${loc.lat}&lon=${loc.lon}`;
          const tmdRes = await fetch(tmdUrl, {
            headers: {
              'authorization': `Bearer ${TMD_ACCESS_TOKEN}`,
              'accept': 'application/json'
            }
          });

          if (tmdRes.ok) {
            const tmdJson = await tmdRes.json();
            if (tmdJson.WeatherForecasts && tmdJson.WeatherForecasts.length > 0) {
              const forecasts = tmdJson.WeatherForecasts[0].forecasts;
              if (forecasts && forecasts.length > 0) {
                const tmdData = forecasts[0].data;
                // ถ้ามีข้อมูลรัฐบาล ให้ทับค่าดาวเทียม
                baseTemp = tmdData.tc !== undefined ? tmdData.tc : baseTemp;
                baseWind = tmdData.ws10 !== undefined ? tmdData.ws10 : baseWind;
                baseRh = tmdData.rh !== undefined ? tmdData.rh : baseRh;
                source = "TMD + Satellite";
                successCount++;
              }
            }
          } else {
             logs.push(`${loc.name}: TMD Error ${tmdRes.status}`);
          }
        } catch (e) {
          // ใช้ String() ครอบเพื่อป้องกัน Error: Objects are not valid as a React child
          logs.push(`${loc.name}: TMD API Network Error - ${String(e.message || 'CORS or Timeout')}`);
        }
      }

      newData.push({
        name: loc.name,
        tc: baseTemp,
        ws10: baseWind,
        rh: baseRh,
        source: source
      });
    }

    setData(newData);
    setSystemStatus({ success: successCount, total: locations.length, logs });
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 600000);
    return () => clearInterval(interval);
  }, []);

  const currentAvg = data.length > 0 ? data.reduce((acc, curr) => acc + curr[layer], 0) / data.length : 0;
  const currentMax = data.length > 0 ? Math.max(...data.map(d => d[layer])) : 0;

  useEffect(() => {
    if (!loading && data.length > 0) {
       setLastMetrics({ avg: currentAvg, max: currentMax });
    }
  }, [layer]);

  const deltaAvg = currentAvg - lastMetrics.avg;
  const deltaMax = currentMax - lastMetrics.max;

  const layerInfo = {
    'tc': { name: 'อุณหภูมิ', icon: <Thermometer className="w-5 h-5 text-orange-500" />, unit: '°C', color: 'text-orange-500' },
    'ws10': { name: 'ความเร็วลม', icon: <Wind className="w-5 h-5 text-teal-400" />, unit: ' km/h', color: 'text-teal-400' },
    'rh': { name: 'ความชื้นสัมพัทธ์', icon: <Droplets className="w-5 h-5 text-blue-400" />, unit: '%', color: 'text-blue-400' }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex">

      {/* Sidebar */}
      <div className="w-72 bg-slate-900 border-r border-slate-800 p-6 flex flex-col shadow-xl z-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 mb-2">
            EnergyGIS Core
          </h1>
          <p className="text-xs text-slate-400">ระบบประมวลผลข้อมูลสิ่งแวดล้อม IoT แบบกระจายศูนย์</p>
        </div>

        {/* System Status */}
        <div className={`p-4 rounded-xl mb-8 border ${systemStatus.success === systemStatus.total ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
          <div className="flex items-center gap-3 mb-2">
            {systemStatus.success === systemStatus.total ?
              <CheckCircle2 className="w-5 h-5 text-emerald-400" /> :
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            }
            <span className={`text-sm font-semibold ${systemStatus.success === systemStatus.total ? 'text-emerald-400' : 'text-amber-400'}`}>
              สถานะโทรมาตรภาครัฐ
            </span>
          </div>
          <p className="text-xs text-slate-300">
            เชื่อมต่อสำเร็จ {systemStatus.success}/{systemStatus.total} สถานี
          </p>
        </div>

        {/* Layer Selection */}
        <div className="mb-6 flex-grow">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            ชั้นข้อมูล (Data Layer)
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
          className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'กำลังซิงค์ข้อมูล...' : 'อัปเดตข้อมูลเดี๋ยวนี้'}
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto relative">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg">
            <p className="text-sm text-slate-400 mb-1">ชั้นข้อมูลปัจจุบัน</p>
            <div className="flex items-center gap-3">
              {layerInfo[layer].icon}
              <h2 className="text-2xl font-bold text-white">{layerInfo[layer].name}</h2>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg">
            <p className="text-sm text-slate-400 mb-1">ค่าเฉลี่ยภูมิภาค</p>
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
            <p className="text-sm text-slate-400 mb-1">ความเข้มข้นสูงสุด</p>
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
            เครือข่ายสถานีโทรมาตร (Telemetry Nodes)
          </h3>

          {loading ? (
             <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-800 rounded-2xl">
                <div className="animate-pulse text-slate-500 flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin" /> กำลังประมวลผลข้อมูล Data Fusion...
                </div>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.map((loc, idx) => (
                <div key={idx} className="bg-slate-900/50 hover:bg-slate-800/80 transition-colors border border-slate-800 p-5 rounded-xl flex justify-between items-center group">
                  <div>
                    <h4 className="font-medium text-slate-200">{loc.name}</h4>
                    <p className="text-xs text-slate-500 mt-1 font-mono">
                      {loc.source === 'TMD + Satellite' ? '🟢 Gov API' : '🟡 Backup Sat'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-light ${layerInfo[layer].color}`}>
                      {loc[layer].toFixed(1)}
                      <span className="text-sm ml-1 text-slate-500">{layerInfo[layer].unit}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Debug Logs */}
        {systemStatus.logs.length > 0 && (
          <div className="mt-8 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
            <h4 className="text-sm font-semibold text-rose-400 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> System Logs (Engineer Only)
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