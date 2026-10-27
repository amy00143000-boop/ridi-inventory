# 日帝汽車｜物料管理（掃碼盤點／入庫／調撥）

GitHub Pages 網頁版，可即時開相機掃碼，員工以公司登記的 Google 帳號登入。資料仍存放於 Google 試算表，經 Apps Script API 寫入。

| 檔案 | 用途 |
|---|---|
| index.html | 盤點作業（初次盤點、每週盤點） |
| ops.html | 入庫、調撥出貨／收貨 |
| config.js | API 網址與 Google 登入用戶端 ID |
| shim.js | Google 登入、API 轉接 |
| apps-script/API.gs | 貼到 Apps Script 的 API 入口 |
| tools/build.py | 由 Apps Script 匯出的 PAGE/LEGACY 重新產生頁面 |

## 上線步驟
1. Google Cloud Console 建立 OAuth 用戶端 ID（網頁應用程式），已授權的 JavaScript 來源填 `https://amy00143000-boop.github.io`。
2. Apps Script 新增 `API.gs`，填入用戶端 ID；`identity_` 第一行改用 `API_EMAIL_||Session.getActiveUser().getEmail()`。
3. Apps Script「部署 → 新增部署作業 → 網頁應用程式」，執行身分「我」，存取權「任何人」，授權外部連線權限。
4. 將部署網址與用戶端 ID 填入 `config.js`。
5. GitHub「Settings → Pages」選 main 分支根目錄。

權限仍以試算表「人員權限」為準，未開通的 Google 帳號無法讀寫任何資料。
