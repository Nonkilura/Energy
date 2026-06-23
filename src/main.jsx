import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
// ⚠️ สำคัญมาก: นี่คือบรรทัดที่ทำให้ระบบรู้จัก Tailwind หากบรรทัดนี้หายไป CSS ทั้งเว็บจะพังทันที
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)