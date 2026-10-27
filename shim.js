/* 日帝六廠｜Google 登入＋Apps Script API 轉接層
   讓原本 google.script.run / google.script.url 的頁面程式，在 GitHub Pages 上不改邏輯直接運作。 */
(function () {
  'use strict';
  var CFG = window.RIDI_CONFIG || {};
  var KEY_T = 'ridi_id_token', KEY_E = 'ridi_id_exp';
  var token = '', exp = 0, waiters = [], overlay = null, gisReady = false;
  try { token = localStorage.getItem(KEY_T) || ''; exp = Number(localStorage.getItem(KEY_E)) || 0; } catch (e) {}

  function valid() { return token && Date.now() < exp - 60000; }
  function save(t) {
    token = t || '';
    try {
      var p = JSON.parse(decodeURIComponent(escape(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))));
      exp = (p.exp || 0) * 1000;
    } catch (e) { exp = Date.now() + 50 * 60000; }
    try { localStorage.setItem(KEY_T, token); localStorage.setItem(KEY_E, String(exp)); } catch (e) {}
  }
  function clear() { token = ''; exp = 0; try { localStorage.removeItem(KEY_T); localStorage.removeItem(KEY_E); } catch (e) {} }

  function css() {
    if (document.getElementById('ridiAuthCss')) return;
    var s = document.createElement('style'); s.id = 'ridiAuthCss';
    s.textContent = '#ridiAuth{position:fixed;inset:0;z-index:10000;background:rgba(23,59,75,.96);display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}' +
      '#ridiAuth .box{background:#fff;border-radius:16px;padding:28px 22px;width:90%;max-width:380px;text-align:center;color:#1b2b33}' +
      '#ridiAuth h2{margin:0 0 6px;font-size:20px}#ridiAuth p{margin:0 0 18px;font-size:14px;color:#4e5f67;line-height:1.5}' +
      '#ridiAuth .btn{display:flex;justify-content:center;min-height:44px}#ridiAuth .err{color:#b42318;font-size:13px;margin-top:12px;white-space:pre-wrap}';
    document.head.appendChild(s);
  }
  function showOverlay(msg) {
    css();
    if (!overlay) {
      overlay = document.createElement('div'); overlay.id = 'ridiAuth';
      overlay.innerHTML = '<div class="box"><h2>日帝汽車｜物料管理</h2><p>請使用公司登記的 Google 帳號登入<br>Đăng nhập bằng tài khoản Google</p><div class="btn" id="ridiGBtn"></div><div class="err" id="ridiErr"></div></div>';
      (document.body || document.documentElement).appendChild(overlay);
    }
    overlay.hidden = false;
    document.getElementById('ridiErr').textContent = msg || '';
    whenGis(function () {
      google.accounts.id.renderButton(document.getElementById('ridiGBtn'), { theme: 'filled_blue', size: 'large', text: 'signin_with', shape: 'pill', locale: 'zh-TW' });
      google.accounts.id.prompt();
    });
  }
  function hideOverlay() { if (overlay) overlay.hidden = true; }

  function whenGis(fn) {
    if (window.google && google.accounts && google.accounts.id) {
      if (!gisReady) {
        google.accounts.id.initialize({
          client_id: CFG.CLIENT_ID,
          auto_select: true,
          use_fedcm_for_prompt: true,
          callback: function (r) {
            if (!r || !r.credential) return;
            save(r.credential); hideOverlay();
            var w = waiters; waiters = []; w.forEach(function (f) { f(); });
          }
        });
        gisReady = true;
      }
      fn();
    } else setTimeout(function () { whenGis(fn); }, 150);
  }
  function ensureToken() {
    if (valid()) return Promise.resolve();
    return new Promise(function (res) {
      waiters.push(res);
      if (document.body) showOverlay(); else document.addEventListener('DOMContentLoaded', function () { showOverlay(); });
    });
  }

  function call(fn, args, retried) {
    if (!CFG.API_URL || /^PASTE_/.test(CFG.API_URL) || !CFG.CLIENT_ID || /^PASTE_/.test(CFG.CLIENT_ID)) {
      return Promise.reject(new Error('系統尚未完成設定（config.js），請聯絡管理者。'));
    }
    return ensureToken().then(function () {
      return fetch(CFG.API_URL, { method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ fn: fn, args: args, token: token }) });
    }).then(function (r) {
      if (!r.ok) throw new Error('伺服器回應錯誤（' + r.status + '），請稍後再試。');
      return r.json();
    }).then(function (j) {
      if (j && j.ok) return j.result;
      var msg = (j && j.error) || '未知錯誤';
      if (j && j.auth && !retried) { clear(); return call(fn, args, true); }
      if (j && j.auth) { clear(); showOverlay(msg); }
      throw new Error(msg);
    });
  }

  function runner(ok, fail) {
    return new Proxy({}, {
      get: function (_, k) {
        if (k === 'withSuccessHandler') return function (f) { return runner(f, fail); };
        if (k === 'withFailureHandler') return function (f) { return runner(ok, f); };
        if (k === 'withUserObject') return function () { return runner(ok, fail); };
        return function () {
          var a = Array.prototype.slice.call(arguments);
          call(String(k), a).then(function (r) { if (ok) ok(r); }, function (e) { if (fail) fail(e); else console.error(e); });
        };
      }
    });
  }

  window.google = window.google || {};
  window.google.script = {
    run: runner(null, null),
    url: {
      getLocation: function (cb) {
        var q = new URLSearchParams(location.search), parameter = {}, parameters = {};
        q.forEach(function (v, k) { if (!(k in parameter)) parameter[k] = v; (parameters[k] = parameters[k] || []).push(v); });
        cb({ parameter: parameter, parameters: parameters, hash: location.hash.replace(/^#/, '') });
      }
    }
  };
  window.ridiSignOut = function () {
    clear();
    if (window.google && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect();
    location.reload();
  };
  if ('serviceWorker' in navigator) window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
})();
