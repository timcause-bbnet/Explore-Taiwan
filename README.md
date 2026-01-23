# 探索台灣 (Taiwan Exploration Portal)

這是一個包含前台入口網站與後台管理系統的整合專案，旨在推廣台灣之美（如阿里山等區域）。

## 功能特色

*   **前台 (Portal)**: 展示台灣各地的景點、美食與住宿資訊。
*   **後台 (Admin)**: 
    *   **超級管理員**: 設定網站架構、管理區域與輪播圖片。
    *   **區域管理**: 針對特定區域（如阿里山、日月潭）進行資料的 CRUD (新增、讀取、更新、刪除)。
*   **PMS 整合**: 簡易的旅宿管理系統後端邏輯。

## 技術架構

*   **Backend**: Python (http.server based custom handler)
*   **Frontend**: HTML5, CSS3, Vanilla JavaScript
*   **Database**: JSON Files (stored in `data/`)

## 快速開始

### 1. 安裝依賴
雖然主要核心為 Python，但我們提供 `package.json` 以便於管理指令 (如果需要)。
請確保已安裝 Python 3.x。

### 2. 啟動伺服器
您可以直接執行根目錄下的批次檔：
```bash
./start_server.bat
```
或者使用 npm 指令 (需安裝 Node.js):
```bash
npm start
```

伺服器預設運行於 Port **8082**。

*   前台首頁: `http://localhost:8082/portal.html`
*   後台管理: `http://localhost:8082/super_admin.html`

## 資料夾結構

*   `alishan-portal/`: 前端網頁原始碼 (`static/` 為主要資源)
*   `data/`: 存放資料庫 JSON 檔案 (已加入 gitignore 避免上傳敏感資料，保留範例)
*   `server.py`: 主要後端伺服器邏輯

