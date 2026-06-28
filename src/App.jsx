import requests
import time
from datetime import datetime

# ==========================================
# ⚙️ ตั้งค่าระบบ (CONFIGURATIONS)
# ==========================================
# 1. Token กรมอุตุฯ ของคุณ
TMD_ACCESS_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjM2Y2I3ODk4OGUxNTVjYzBkOTVkOGE2OWY1ZTUyNDZiYTlkZjJkODNlZjJmMjgxZWE1ZjJiOGRkZDRiOTI3YjkxN2UwNjU0ZDVjODRiODIwIn0.eyJhdWQiOiIyIiwianRpIjoiMzZjYjc4OTg4ZTE1NWNjMGQ5NWQ4YTY5ZjVlNTI0NmJhOWRmMmQ4M2VmMmYyODFlYTVmMmI4ZGRkNGI5MjdiOTE3ZTA2NTRkNWM4NGI4MjAiLCJpYXQiOjE3ODIwOTkwMDIsIm5iZiI6MTc4MjA5OTAwMiwiZXhwIjoxODEzNjM1MDAyLCJzdWIiOiI1NDYyIiwic2NvcGVzIjpbXX0.ZDn7RcEsTGJ6FkyGs-sx8tp7tA7KlHwfmDtnwmR0WuerLfp34yQIYC5D4MfekUkDyvnv4H4y_7tNQOOxNzvfzpqM2OWz6occWurtugDKaOF6w-eqaJmwxdLv39ufR9d8RdCRmZINXcGT2TpGv39lzX8SyLgmHs0MXEMm13z4Duo8ZS1yqxlCEnhDeY4EAi5sR2CfFBRXX7nYNS9GmK91dudiUmw9ODT3CRoVYhTJEVba0DtZTOR0nC1Thtih6RivjW2aVcNgdVf8L07tBFzGf1CA347FbnSz_mYOHdWAp4VK3BZ0n31sispTNUhhTUzd9yV5798ypPb4-eTWZWpPhqFXql0VGHyxdaJyvIQg-Uj1ZZxJU_zSvteT_ke-y9xU0OmQ99zGm1SGLxII_2K519qmhpx8I0LnhoaT3dimmAqizHWAwn2SvyYJtsTlGSCCFp9FsXzef0Dbfq0jv9RUuCegBGMq70qgRIWO69LPrBbzxlcHOzNe9VNNmAHMpeh5yYbt7cRnpUZQhIR-xIvadF2qbFxbq5PFjOU-VZ4XwsfYe3i1-zz04IOkwVvVS_N8_-2p9Ok1YNT5P4_bJ8YnLY6FOCmSF7hhCLyL6Zw4hIlHUp7OpMMAoecceQf2WX_OQNmripECRCjrgM30qNgmKqNovVJuuyEuDS73JoMrObw"

# 2. ลิงก์ฐานข้อมูล Firebase ของคุณ (เอามาจากข้อ 1.5 ในคู่มือ)
# ⚠️ อย่าลืม! ต้องมี /energy_data.json ต่อท้ายลิงก์เสมอ
FIREBASE_URL = "https://energyme-8727d-default-rtdb.asia-southeast1.firebasedatabase.app/"

# ==========================================

LOCATIONS = [
    {"name": "เชียงใหม่", "lat": 18.79, "lon": 98.98},
    {"name": "ขอนแก่น", "lat": 16.48, "lon": 102.82},
    {"name": "กรุงเทพมหานคร", "lat": 13.75, "lon": 100.50},
    {"name": "ระยอง", "lat": 12.68, "lon": 101.27},
    {"name": "หัวหิน", "lat": 12.56, "lon": 99.95},
    {"name": "สุราษฎร์ธานี", "lat": 9.14, "lon": 99.32},
    {"name": "ภูเก็ต", "lat": 7.88, "lon": 98.39},
    {"name": "หาดใหญ่", "lat": 7.00, "lon": 100.46},
    {"name": "สงขลา", "lat": 7.19, "lon": 100.59}
]

def fetch_and_upload():
    print(f"\n[{datetime.now().strftime('%H:%M:%S')}] 🚀 กำลังเริ่มกระบวนการ Data Pipeline...")

    success_count = 0
    final_data = []
    logs = []

    for loc in LOCATIONS:
        print(f"ดึงข้อมูล {loc['name']}...", end=" ")
        base_temp, base_wind, base_rh = 0, 0, 0
        source = "Satellite Only"

        # 1. ดึงดาวเทียม (Backup)
        try:
            sat_url = f"https://api.open-meteo.com/v1/forecast?latitude={loc['lat']}&longitude={loc['lon']}&current=temperature_2m,wind_speed_10m,relative_humidity_2m"
            sat_res = requests.get(sat_url, timeout=5).json()
            base_temp = sat_res.get('current', {}).get('temperature_2m', 0)
            base_wind = sat_res.get('current', {}).get('wind_speed_10m', 0)
            base_rh = sat_res.get('current', {}).get('relative_humidity_2m', 0)
        except Exception as e:
            logs.append(f"{loc['name']}: Satellite Fail")

        # 2. ดึงรัฐบาล (TMD) แบบยิงตรงจาก IP ไทย
        try:
            tmd_url = f"https://data.tmd.go.th/nwpapi/v1/forecast/location/hourly/at?lat={loc['lat']}&lon={loc['lon']}"
            tmd_res = requests.get(
                tmd_url,
                headers={'authorization': f'Bearer {TMD_ACCESS_TOKEN}', 'accept': 'application/json'},
                timeout=10
            )

            if tmd_res.status_code == 200:
                tmd_json = tmd_res.json()
                if tmd_json.get('WeatherForecasts'):
                    forecasts = tmd_json['WeatherForecasts'][0].get('forecasts', [])
                    if forecasts:
                        tmd_data = forecasts[0].get('data', {})
                        base_temp = tmd_data.get('tc', base_temp)
                        base_wind = tmd_data.get('ws10', base_wind)
                        base_rh = tmd_data.get('rh', base_rh)
                        source = "TMD + Satellite"
                        success_count += 1
            else:
                logs.append(f"{loc['name']}: TMD Error {tmd_res.status_code}")

        except Exception as e:
            logs.append(f"{loc['name']}: TMD Network Error")

        # ใส่จานเตรียมเสิร์ฟ
        final_data.append({
            "name": loc['name'],
            "tc": base_temp,
            "ws10": base_wind,
            "rh": base_rh,
            "source": source
        })
        print(f"[{source}]")
        time.sleep(0.5) # พักหายใจกันโดนบล็อก

    # 3. โยนขึ้น Cloud Database (Firebase)
    payload = {
        "data": final_data,
        "successCount": success_count,
        "logs": logs,
        "lastUpdated": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

    try:
        print("กำลังอัปโหลดข้อมูลขึ้น Cloud Database...", end=" ")
        upload_res = requests.put(FIREBASE_URL, json=payload)
        upload_res.raise_for_status()
        print("✅ สำเร็จ!")
    except Exception as e:
        print(f"❌ ล้มเหลว: {e}")

if __name__ == "__main__":
    # ให้สคริปต์รันวนลูปดึงข้อมูลทุกๆ 30 นาที
    while True:
        fetch_and_upload()
        print("⏳ รอ 30 นาทีเพื่อดึงข้อมูลรอบถัดไป... (ห้ามปิดหน้าต่างนี้)")
        time.sleep(1800)