# 🔥 如何建立雲端資料庫 (Firebase Setup)

為了讓大家的手機資料同步，我們需要使用 Google 的 **Firebase** 資料庫服務。
它是免費的，且非常適合像 Office Pulse 這樣的網頁應用。

## 步驟 1: 建立專案
1. 前往 [Firebase Console](https://console.firebase.google.com/) 並登入 Google 帳號。
2. 點擊 **"建立專案 (Create a project)"**。
3. 輸入專案名稱 (例如 `office-pulse-db`)。
4. Google Analytics 步驟可以選「關閉」或「略過」。
5. 等待專案建立完成，點擊「繼續」。

## 步驟 2: 建立 Realtime Database
1. 在左側選單點擊 **"建置 (Build)"** -> **"Realtime Database"**。
2. 點擊 **"建立資料庫 (Create Database)"**。
3. 位置選擇 **"新加坡 (Singapore)"** 或 **"美國 (US)"** 皆可，按下一步。
4. **安全規則 (Security rules)**: 
   - 選擇 **"以測試模式啟動 (Start in test mode)"**。
   - *這會允許知道網址的人在 30 天內讀寫資料，方便我們測試。之後我們會再鎖定權限。*
5. 點擊 **"啟用 (Enable)"**。

## 步驟 3: 獲取連線密鑰 (API Configuration)
1. 點擊左上角的 **"專案總覽 (Project Overview)"** 旁邊的齒輪圖示 ⚙️ -> **"專案設定 (Project settings)"**。
2. 滑到最下方的 **"您的應用程式 (Your apps)"** 區塊。
3. 點擊 **`</>`** 圖示 (網頁 Web)。
4. 輸入 App 暱稱 (例如 `Office Pulse Web`)，不用勾選 Hosting，點擊 **"註冊應用程式 (Register app)"**。
5. 您會看到一段程式碼，請複製 **`const firebaseConfig = { ... };`** 這一整段物件內容。

---

## 範例資料 (複製這段格式給我)
請將您螢幕上看到類似底下的內容複製並貼給 AI：

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyDxxxxxxxxxxxxxxxxxxxxxxxx",
  authDomain: "office-pulse-xxx.firebaseapp.com",
  databaseURL: "https://office-pulse-xxx-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "office-pulse-xxx",
  storageBucket: "office-pulse-xxx.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:xxxxxxxxx"
};
```
