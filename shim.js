/* 日帝六廠｜Google 登入＋Apps Script API 轉接層
   讓原本 google.script.run / google.script.url 的頁面程式，在 GitHub Pages 上不改邏輯直接運作。 */
(function () {
  'use strict';
  var CFG = window.RIDI_CONFIG || {};
  var KEY_T = 'ridi_id_token', KEY_E = 'ridi_id_exp', KEY_S = 'ridi_session';
  var token = '', exp = 0, sess = '', waiters = [], overlay = null, gisReady = false;
  try { token = localStorage.getItem(KEY_T) || ''; exp = Number(localStorage.getItem(KEY_E)) || 0; sess = localStorage.getItem(KEY_S) || ''; } catch (e) {}
  function b64u(x) { return decodeURIComponent(escape(atob(x.replace(/-/g, '+').replace(/_/g, '/')))); }
  function sessInfo() { try { var v = b64u(sess.split('.')[1]).split('|'); return { email: v[0], exp: Number(v[1]) }; } catch (e) { return null; } }
  function sessValid() { var i = sess && sessInfo(); return !!(i && i.exp > Date.now() + 60000); }
  function saveSess(s) { if (!s) return; sess = s; try { localStorage.setItem(KEY_S, s); } catch (e) {} }

  function valid() { return sessValid() || (token && Date.now() < exp - 60000); }
  function authToken() { return sessValid() ? sess : token; }
  function save(t) {
    token = t || '';
    try {
      var p = JSON.parse(decodeURIComponent(escape(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))));
      exp = (p.exp || 0) * 1000;
    } catch (e) { exp = Date.now() + 50 * 60000; }
    try { localStorage.setItem(KEY_T, token); localStorage.setItem(KEY_E, String(exp)); } catch (e) {}
  }
  function tokenEmail() {
    if (sessValid()) return sessInfo().email || '';
    try { return JSON.parse(b64u(token.split('.')[1])).email || ''; } catch (e) { return ''; }
  }
  function clear() { token = ''; exp = 0; sess = ''; try { localStorage.removeItem(KEY_T); localStorage.removeItem(KEY_E); localStorage.removeItem(KEY_S); } catch (e) {} }

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
      return fetch(CFG.API_URL, { method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ fn: fn, args: args, token: authToken() }) });
    }).then(function (r) {
      if (!r.ok) throw new Error('伺服器回應錯誤（' + r.status + '），請稍後再試。');
      return r.json();
    }).then(function (j) {
      if (j && j.session) saveSess(j.session);
      if (j && j.ok) return j.result;
      var msg = (j && j.error) || '未知錯誤';
      if (/尚未開通/.test(msg) && tokenEmail()) msg += '（目前登入：' + tokenEmail() + '，如帳號不對請按右上「切換帳號」）';
      if (j && j.auth && !retried) { clear(); return call(fn, args, true); }
      if (j && j.auth) { clear(); showOverlay(msg); }
      throw new Error(msg);
    });
  }


  /* ---- 物料清單預載：掃碼後直接由手機顯示，背景再向伺服器更新 ---- */
  var CAT_TTL = 10 * 60000, cats = {}, catLoading = {}, catFail = {}, dbp = null;
  function idb() {
    if (dbp) return dbp;
    dbp = new Promise(function (res) {
      try { var o = indexedDB.open('ridi', 1); o.onupgradeneeded = function () { o.result.createObjectStore('catalog'); }; o.onsuccess = function () { res(o.result); }; o.onerror = function () { res(null); }; } catch (e) { res(null); }
    });
    return dbp;
  }
  function idbGet(k) { return idb().then(function (d) { return d ? new Promise(function (res) { try { var q = d.transaction('catalog').objectStore('catalog').get(k); q.onsuccess = function () { res(q.result || null); }; q.onerror = function () { res(null); }; } catch (e) { res(null); } }) : null; }); }
  function idbPut(k, v) { return idb().then(function (d) { if (!d) return; try { d.transaction('catalog', 'readwrite').objectStore('catalog').put(v, k); } catch (e) {} }); }
  function idbClear() { return idb().then(function (d) { if (!d) return; try { d.transaction('catalog', 'readwrite').objectStore('catalog').clear(); } catch (e) {} }); }
  function indexCat(c) { var m = {}, dup = {}; (c.items || []).forEach(function (it, i) { (it.keys || []).forEach(function (k) { if (k in m && m[k] !== i) dup[k] = 1; m[k] = i; }); }); Object.keys(dup).forEach(function (k) { delete m[k]; }); c.map = m; return c; }
  function catKey(b) { return (tokenEmail() || '') + '|' + b; }
  function loadCat(b, force) {
    if (!/^RD[1-6]$/.test(b)) return;
    var mem = cats[b];
    if (!force && mem && Date.now() - mem.at < CAT_TTL) return;
    if (catLoading[b] || (catFail[b] && Date.now() - catFail[b] < 5 * 60000)) return;
    catLoading[b] = true;
    (mem ? Promise.resolve(null) : idbGet(catKey(b))).then(function (saved) {
      if (saved && saved.items && !cats[b]) cats[b] = indexCat(saved);
      if (!force && cats[b] && Date.now() - cats[b].at < CAT_TTL) { catLoading[b] = false; return; }
      return call('catalog', [b]).then(function (c) { if (c && c.items) { cats[b] = indexCat(c); idbPut(catKey(b), { branch: c.branch, week: c.week, at: c.at, items: c.items }); } });
    }).catch(function () { catFail[b] = Date.now(); }).then(function () { catLoading[b] = false; });
  }
  function fromCat(b, raw) {
    var c = cats[b]; if (!c || !c.map) return null;
    var k = String(raw || '').trim().split('|')[0].trim().toUpperCase(); if (!k) return null;
    var i = c.map[k]; if (i === undefined) return null;
    var it = JSON.parse(JSON.stringify(c.items[i])); delete it.keys; return it;
  }
  function patchCat(b, res) {
    var c = cats[b]; if (!c || !res || !res.code) return;
    c.items.forEach(function (it) { if (it.code === res.code) { Object.keys(res).forEach(function (k) { it[k] = res[k]; }); } });
  }
  function weekId() { var t = new Date(Date.now() + 8 * 3600000), d = (t.getUTCDay() + 6) % 7; return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate() - d)).toISOString().slice(0, 10); }
  function catReady(b) {
    if (cats[b]) return Promise.resolve(cats[b]);
    return idbGet(catKey(b)).then(function (saved) { if (saved && saved.items && !cats[b]) cats[b] = indexCat(saved); return cats[b] || null; }, function () { return null; });
  }
  function itemOut(c, it) { var o = JSON.parse(JSON.stringify(it)); delete o.keys; if (c.week !== weekId()) o.countState = { week: weekId(), latest: null }; return o; }
  function weeklyFromCat(c) {
    if (!c || c.week !== weekId()) return null;
    var items = c.items.map(function (it) { var l = it.countState && it.countState.latest; return { code: it.code, sku: it.sku, name: it.name, area: it.location || '未設定儲位', unit: it.unit || '', done: !!l && !l.returned, latest: l || null }; });
    return { week: c.week, total: items.length, done: items.filter(function (r) { return r.done; }).length, items: items };
  }
  function swrKey(fn, args) { return 'ridi_swr|' + (tokenEmail() || '') + '|' + fn + '|' + JSON.stringify(args); }
  function swrGet(k) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function swrPut(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function employeeName(id) { var bt = swrGet(swrKey('bootstrap', [])); var e = bt && (bt.employees || []).filter(function (x) { return x.id === id; })[0]; return e ? e.name : (tokenEmail() || ''); }
  function afterTransact(q, result) {
    var b = q.branch, c = cats[b];
    if (c && c.map) {
      var i = c.map[String(q.code || '').trim().split('|')[0].trim().toUpperCase()], it = i === undefined ? null : c.items[i];
      if (it && result) {
        if (q.type === '盤點提報') { if (c.week !== weekId()) { c.items.forEach(function (x) { x.countState = { week: weekId(), latest: null }; }); c.week = weekId(); } it.countState = { week: weekId(), latest: { id: result.id, quantity: result.quantity, unit: it.unit, employee: employeeName(q.employeeId || q.employee), time: new Date().toISOString(), returned: false, approved: false } }; }
        if (q.type === '入庫' && typeof it.balance === 'number') it.balance += Number(result.quantity) || 0;
        if (q.type === '調撥出貨' && typeof it.balance === 'number') it.balance -= Number(result.quantity) || 0;
        idbPut(catKey(b), { branch: c.branch, week: c.week, at: c.at, items: c.items });
      }
    }
    Object.keys(cats).forEach(function (x) { cats[x].at = 0; });
    setTimeout(function () { Object.keys(cats).forEach(function (x) { loadCat(x, true); }); }, 1500);
  }
  function fast(fn, args) {
    var b = args[0];
    if (typeof b === 'string' && /^RD[1-6]$/.test(b)) loadCat(b);
    if ((fn === 'lookup' || fn === 'countLookup') && args.length >= 2) {
      return catReady(b).then(function (c) {
        var k = String(args[1] || '').trim().split('|')[0].trim().toUpperCase(), i = c && c.map ? c.map[k] : undefined;
        if (i !== undefined) { call(fn, args).then(function (r) { patchCat(b, r); }, function () {}); return itemOut(c, c.items[i]); }
        return call(fn, args);
      });
    }
    if (fn === 'weeklyCounts' && /^RD[1-6]$/.test(b)) {
      return catReady(b).then(function (c) { var w = weeklyFromCat(c); return w || call(fn, args); });
    }
    if (fn === 'bootstrap') {
      var k = swrKey(fn, args), cached = swrGet(k);
      var p = call(fn, args).then(function (r) { swrPut(k, r); var bs = (r && r.branches) || []; if (bs.length === 1) loadCat(bs[0]); return r; });
      if (cached && tokenEmail()) { p.catch(function () {}); return Promise.resolve(cached); }
      return p;
    }
    var p2 = call(fn, args);
    if (fn === 'transact') p2.then(function (r) { afterTransact(args[0] || {}, r); }, function () {});
    return p2;
  }

  function runner(ok, fail) {
    return new Proxy({}, {
      get: function (_, k) {
        if (k === 'withSuccessHandler') return function (f) { return runner(f, fail); };
        if (k === 'withFailureHandler') return function (f) { return runner(ok, f); };
        if (k === 'withUserObject') return function () { return runner(ok, fail); };
        return function () {
          var a = Array.prototype.slice.call(arguments);
          fast(String(k), a).then(function (r) { if (ok) ok(r); }, function (e) { if (fail) fail(e); else console.error(e); });
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
  document.addEventListener('change', function (e) { if (e.target && e.target.id === 'branch' && e.target.value) loadCat(e.target.value); }, true);
  setInterval(function () { var s = document.getElementById('branch'); if (s && s.value && valid()) loadCat(s.value); }, 60000);
  document.addEventListener('DOMContentLoaded', function () {
    var b = document.createElement('button'); b.type = 'button'; b.textContent = '切換帳號';
    b.style.cssText = 'position:fixed;right:8px;bottom:8px;z-index:9000;font-size:12px;padding:6px 10px;border-radius:14px;border:1px solid #c9d3d7;background:#fff;color:#33474f;opacity:.85';
    b.onclick = function () { window.ridiSignOut(); };
    document.body.appendChild(b);
  });
  window.ridiSignOut = function () {
    clear(); cats = {}; idbClear();
    if (window.google && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect();
    location.reload();
  };
  if ('serviceWorker' in navigator) window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
})();
