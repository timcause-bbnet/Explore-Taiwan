# Geography Exam Maker (國中地理出題系統)

這是一個專為國中地理老師設計的網頁應用程式，用於收集歷年題庫、勾選出題範圍並製作考卷。

## 功能特色
- 題庫收集：支援選擇題與簡答題。
- 範圍篩選：可針對年級（一、二、三年級）及考試類別（平常考、月考）篩選題目。
- 線上出題：勾選需要的題目，自動排版。
- 考卷列印：提供適合列印的考卷版面。
- 編輯功能：可手動修改題目內容。

## 安裝與執行
1. 安裝相依套件：
   ```bash
   npm install
   ```
2. 啟動開發伺服器：
   ```bash
   npm run dev
   ```
3. 建置專案：
   ```bash
   npm run build
   ```

## 部署
本專案已設定 GitHub Actions，推送到 `main` 分支時會自動部署至 GitHub Pages。
或是手動執行：
```bash
npm run deploy
```

## 技術堆疊
- React + Vite
- Vanilla CSS (Modern Design)
- GitHub Pages Deployment
