/** 日帝六廠｜GitHub Pages 網頁 API 入口
 *  使用方式：在 Apps Script 專案新增檔案「API.gs」貼上本檔內容，填入 API_CLIENT_ID，
 *  並將 程式碼.gs 的 identity_ 第一行改為：
 *    const email=String(API_EMAIL_||Session.getActiveUser().getEmail()).toLowerCase();
 */
const API_CLIENT_ID = '1578802597-j2fk34mcu5tl440on2qtd052tt3cgiid.apps.googleusercontent.com';
function apiFns_(){return {bootstrap:bootstrap,lookup:lookup,pendingTasks:pendingTasks,transact:transact,weeklyCounts:weeklyCounts,countLookup:countLookup,reviewList:reviewList,reviewBatch:reviewBatch};}
var API_EMAIL_ = '';

function doPost(e) {
  let body = {};
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { return apiOut_({ ok:false, error:'請求格式錯誤' }); }
  let session = null;
  try {
    const tk = String(body.token || '');
    if (tk.indexOf('S.') === 0) { const s = apiSession_(tk); API_EMAIL_ = s.email; if (s.exp - Date.now() < 3 * 86400000) session = apiSign_(s.email); }
    else { API_EMAIL_ = apiVerify_(tk); session = apiSign_(API_EMAIL_); }
  } catch (err) {
    return apiOut_({ ok:false, auth:true, error:err.message });
  }
  try {
    const fn = String(body.fn || '');
    const fns = apiFns_();
    if (!Object.prototype.hasOwnProperty.call(fns, fn)) throw Error('不允許的操作：' + fn);
    const args = Array.isArray(body.args) ? body.args : [];
    const result = fns[fn].apply(null, args);
    return apiOut_({ ok:true, result: result === undefined ? null : result, session: session });
  } catch (err) {
    return apiOut_({ ok:false, error: (err && err.message) || String(err), session: session });
  } finally {
    API_EMAIL_ = '';
  }
}

function apiVerify_(token) {
  if (!token || token.split('.').length !== 3) throw Error('請先登入 Google 帳號');
  const cache = CacheService.getScriptCache();
  const key = 'idt_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token)).slice(0, 40);
  const hit = cache.get(key);
  if (hit) return hit;
  const res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token), { muteHttpExceptions:true });
  if (res.getResponseCode() !== 200) throw Error('登入已過期，請重新登入');
  const t = JSON.parse(res.getContentText());
  if (t.aud !== API_CLIENT_ID) throw Error('登入來源不符');
  if (t.iss !== 'accounts.google.com' && t.iss !== 'https://accounts.google.com') throw Error('登入來源不符');
  if (String(t.email_verified) !== 'true' || !t.email) throw Error('Google 帳號 Email 未驗證');
  const left = Number(t.exp) - Math.floor(Date.now() / 1000);
  if (!(left > 30)) throw Error('登入已過期，請重新登入');
  const email = String(t.email).toLowerCase();
  cache.put(key, email, Math.min(left - 30, 1800));
  return email;
}

function apiOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
