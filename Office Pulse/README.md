# Office Pulse 專案說明書

這是一個現代化的團隊考勤與費用管理系統 (Office Pulse)，具備定位打卡、行事曆排班、差旅費報表產生等功能。

## 🚀 1. 快速啟動 (Quick Start)

請確認您的電腦已安裝 [Node.js](https://nodejs.org/)。

### 安裝套件
在專案根目錄執行：
```bash
npm install
```

### 啟動開發伺服器
```bash
npm run dev
```
啟動後，請打開瀏覽器訪問顯示的網址 (通常是 `http://localhost:5173`)。

---

## 🔒 2. 安全與隱私 (Privacy & Security)

為了確保程式碼不被外洩，請務必遵照以下設定：

1.  **建立 GitHub 私有倉庫 (Private Repository)**
    *   在 GitHub 新增 Repository 時，選擇 **"Private" (私有)**。
    *   這樣只有您這和您邀請的協作者可以看到程式碼。

2.  **保護敏感資料**
    *   本專案已設定 `.gitignore`，自動忽略 `node_modules` 與環境變數檔 (`.env`)。
    *   **切勿** 將含有 API Key (如 OpenAI Key, Google Maps Key) 的檔案直接上傳。

---

## 📦 3. 自動部署 (Deployment)

本專案已內建 **GitHub Actions** 流程。

1.  將程式碼推送到 GitHub `main` 分支。
2.  前往 GitHub 倉庫的 **Settings** -> **Pages**。
3.  在 **Build and deployment** 區塊：
    *   Source 選擇 **GitHub Actions** (重要！)。
4.  以後每次 `git push`，系統會自動打包並部署到 GitHub Pages。
    *   *注意：若使用 Private Repo，GitHub Pages 可能需要升級 Pro 版才能限制存取權限，否則 Pages 網址本身可能是公開的。若需極致隱私，建議部署到 Vercel 或 Netlify 並開啟密碼保護。*

---

## 🛠 4. 專案結構
*   `index.html`: 入口網頁
*   `js/app.js`: 核心邏輯 (React/Vanilla JS)
*   `css/`: 樣式表 (含 RWD 設定)
*   `.github/workflows`: 自動化部署腳本

---


---

## ✅ 最近更新 (Latest Updates)

### v7.1.0 - 打卡與 UI 穩定性修正 (Current Stable)
1.  **UI 優化**: 
    - 修正 "Meeting" (會議) 選項的顯示/隱藏邏輯，確保相關輸入框只在選擇會議狀態時出現。
2.  **手機版打卡修復**:
    - 修正地圖模態框中的確認按鈕邏輯，現在能正確判斷並執行「上班」或「下班」動作，而非總是執行上班。
    - **時間完整性修正**: 強制打卡動作使用當下真實時間 (`new Date()`)，修復了當使用者在月曆上瀏覽其他日期時打卡，會導致記錄錯誤地寫入該日期的嚴重 Bug。
3.  **資料持久化**:
    - 移除系統啟動時的測試用資料清除邏輯，確保使用者登出或重整後，當日的打卡狀態依然正確保留。

## 📝 版本控制指令

```bash
git init
git add .
git commit -m "Initial commit"
# 替換成您的倉庫網址
git remote add origin https://github.com/您的帳號/repo名稱.git
git push -u origin main
```
