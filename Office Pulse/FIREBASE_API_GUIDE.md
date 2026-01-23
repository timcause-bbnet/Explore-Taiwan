# 🔥 如何取得 Firebase 連線設定 (firebaseConfig)

恭喜您建立了資料庫！現在我們需要一把「鑰匙」讓您的網頁能連進去。

請依照以下 5 個步驟操作：

1.  **回到專案首頁**
    *   點擊左上角的 **「專案總覽 (Project Overview)」** 文字。

2.  **進入專案設定**
    *   在「專案總覽」文字的右邊，有一個小齒輪圖示 ⚙️。
    *   點擊齒輪，選擇 **「專案設定 (Project settings)」**。

3.  **新增網頁應用程式**
    *   將畫面由上往下滑動，滑到最底下的 **「您的應用程式 (Your apps)」** 區塊。
    *   您會看到幾個圓形圖示，請點擊 **`</>`** (這個符號代表網頁 Web)。

4.  **註冊應用程式**
    *   **應用程式暱稱**：隨便填，例如 `Office Pulse`。
    *   **不要勾選** 「亦設定 Firebase Hosting」(我們會用 GitHub，所以不用勾)。
    *   點擊藍色的 **「註冊應用程式 (Register app)」** 按鈕。

5.  **複製程式碼**
    *   畫面會跑出一大串程式碼。
    *   請找到 **`const firebaseConfig = { ... };`** 這一段。
    *   **只需要複製 `{` 到 `}` 中間的內容 (包含大括號)**。

---

### 範例 (請複製長得像這樣的內容給我)：
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyDaNsPu...",
  authDomain: "office-pulse-123.firebaseapp.com",
  databaseURL: "https://office-pulse-123.firebaseio.com",
  projectId: "office-pulse-123",
  storageBucket: "office-pulse-123.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdefg"
};
```
