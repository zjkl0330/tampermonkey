// ==UserScript==
// @name         云析直链 · 网盘直链下载助手
// @namespace    https://github.com/CYQawa/YunX
// @version      1.9.2
// @author       云析直链（YunX 移植）
// @description  夸克 / UC / 123 / 115 / 天翼 / 移动 / 百度 / 迅雷 / 阿里 / 城通 网盘分享直链解析，附分享页去广告：自动列目录、8 线程分片下载、暂停续传，可导出 IDM / Aria2 / cURL 命令。无口令、无授权码，装上即用。
// @license      AGPL-3.0-or-later
// @homepage     https://github.com/CYQawa/YunX
// @supportURL   https://github.com/zjkl0330/tampermonkey/issues
// @updateURL    https://raw.githubusercontent.com/zjkl0330/tampermonkey/main/js/%E4%BA%91%E6%9E%90%E7%9B%B4%E9%93%BE.user.js
// @downloadURL  https://raw.githubusercontent.com/zjkl0330/tampermonkey/main/js/%E4%BA%91%E6%9E%90%E7%9B%B4%E9%93%BE.user.js
// @match        https://pan.quark.cn/
// @match        https://pan.quark.cn/s/*
// @match        https://drive.uc.cn/s/*
// @match        https://www.123865.com/s/*
// @match        https://www.123pan.com/s/*
// @match        https://www.123pan.cn/s/*
// @match        https://yun.123pan.cn/*
// @match        https://share.123pan.cn/123pan/*
// @match        https://115.com/s/*
// @match        https://115cdn.com/s/*
// @match        https://115rc.com/s/*
// @match        https://cloud.189.cn/t/*
// @match        https://cloud.189.cn/web/share*
// @match        https://yun.139.com/*
// @match        https://caiyun.139.com/*
// @match        https://pan.baidu.com/s/*
// @match        https://pan.baidu.com/share/*
// @match        https://yun.baidu.com/s/*
// @match        https://openapi.baidu.com/oauth/*
// @match        https://pan.xunlei.com/s/*
// @match        https://*.ctfile.com/*
// @match        https://*.ctfile.net/*
// @match        https://*.545c.com/*
// @match        https://www.alipan.com/s/*
// @match        https://www.aliyundrive.com/s/*
// @exclude      *://*/passport/*
// @exclude      *://*/login*
// @exclude      *://*/register*
// @exclude      *://*/reg.html*
// @exclude      *://*/vip*
// @exclude      *://*/pay*
// @exclude      *://*/about/*
// @exclude      *://*/help*
// @connect      pan.baidu.com
// @connect      openapi.baidu.com
// @connect      *.baidu.com
// @connect      *.baidupcs.com
// @connect      *.xunlei.com
// @connect      *.quark.cn
// @connect      *.uc.cn
// @connect      *.123pan.cn
// @connect      *.123pan.com
// @connect      *.123865.com
// @connect      *.189.cn
// @connect      *.ctyunxs.cn
// @connect      *.139.com
// @connect      *.mcloud.com
// @connect      *.aliyundrive.com
// @connect      *.alipan.com
// @connect      *.aliyuncs.com
// @connect      *.ctfile.com
// @connect      *.ctfile.net
// @connect      *.545c.com
// @connect      *.115.com
// @connect      *.115cdn.com
// @connect      *.115rc.com
// @connect      raw.githubusercontent.com
// @connect      api.github.com
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_cookie
// @grant        GM_registerMenuCommand
// @grant        GM_openInTab
// @grant        unsafeWindow
// @run-at       document-idle
// @noframes
// ==/UserScript==

(function () {
  'use strict';

  /* =======================================================================
   * 0. 常量
   * ===================================================================== */

  const APP = { name: '云析直链', version: '1.9.2' };

  // 夸克 PC 客户端 UA：列表 / 取链接口都校验它
  const UA_QUARK =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'quark-cloud-drive/2.5.20 Chrome/100.0.4896.160 Electron/18.3.5.12-a038f7b798 Safari/537.36 Channel/pckk_other_ch';

  const UA_UC =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Chrome/120.0.0.0 Safari/537.36';

  const UA_123_WEB =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Chrome/130.0.0.0 Safari/537.36';

  // 115 必须用客户端 UA：浏览器 UA 请求取链接口会被判「版本过低」直接拒绝（50029）
  const UA_115 =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
    '115Browser/36.0.1 Chrome/108.0.5359.215 Safari/537.36';

  // 123 分享列表接口只认 Dart UA
  const UA_123_DART = 'Dart/3.12 (dart:io)';


  const ICON = {
    bolt: '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M13.4 2.1 3.6 13.9c-.35.42-.05 1.05.5 1.05h5.6l-1.2 7.1c-.09.54.6.85.93.42l9.8-11.8c.35-.42.05-1.05-.5-1.05h-5.6l1.2-7.1c.09-.54-.6-.85-.93-.42z" fill="#fff"/></svg>',
    link: '<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="#94a3b8" stroke-width="1.6" stroke-linecap="round"><path d="M10 13.5a4 4 0 0 0 5.7 0l2.6-2.6a4 4 0 0 0-5.7-5.7l-1.2 1.2"/><path d="M14 10.5a4 4 0 0 0-5.7 0l-2.6 2.6a4 4 0 0 0 5.7 5.7l1.2-1.2"/></svg>',
    warn: '<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="#dc2626" stroke-width="1.6" stroke-linecap="round"><path d="M12 3.5 2.8 20h18.4L12 3.5z"/><path d="M12 9.5v5"/><circle cx="12" cy="17.4" r=".9" fill="#dc2626" stroke="none"/></svg>',
    folder: '<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="#94a3b8" stroke-width="1.6" stroke-linecap="round"><path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4l2 2.5h9A1.5 1.5 0 0 1 21 10v7.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-10z"/></svg>',
    spin: '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#1e6fff" stroke-width="2.4" stroke-linecap="round"><path d="M12 3.5a8.5 8.5 0 1 1-6 2.5" opacity=".9"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.9s" repeatCount="indefinite"/></path></svg>'
  };

  const DEFAULT_SETTINGS = {
    autoParse: true,     // 打开分享页自动预解析
    showBall: true,      // 显示右下角悬浮球
    hookButtons: true,   // 在页面「保存到网盘 / 下载」旁挂一个 ⚡直链 按钮
    adBlock: true,       // 隐藏分享页的推广 / 开会员 / 下客户端浮层
    adExtra: '',         // 用户自定义的额外隐藏选择器，逗号分隔
    copyMode: 'link',    // link | aria2 | curl | idm
    downloadMode: 'auto', // auto | engine | blob | browser
    threads: 8           // 分片并发连接数
  };

  const BLOB_LIMIT = 200 * 1024 * 1024; // 脚本代下（走内存）上限

  /* =======================================================================
   * 1. 基础工具
   * ===================================================================== */

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));

  function fmtSize(bytes) {
    const n = Number(bytes) || 0;
    if (n <= 0) return '—';
    const unit = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    let i = 0;
    let v = n;
    while (v >= 1024 && i < unit.length - 1) { v /= 1024; i++; }
    return `${i === 0 ? v : v.toFixed(v >= 100 ? 0 : 1)} ${unit[i]}`;
  }

  function extOf(name) {
    const m = /\.([A-Za-z0-9]{1,5})$/.exec(name || '');
    return m ? m[1].toUpperCase() : '';
  }

  // 按扩展名给个小色块，纯装饰
  function extColor(ext) {
    const map = {
      ZIP: '#8b5cf6', RAR: '#8b5cf6', '7Z': '#8b5cf6', TAR: '#8b5cf6', GZ: '#8b5cf6',
      MP4: '#ef4444', MKV: '#ef4444', AVI: '#ef4444', MOV: '#ef4444', TS: '#ef4444', FLV: '#ef4444',
      MP3: '#f59e0b', FLAC: '#f59e0b', WAV: '#f59e0b', M4A: '#f59e0b',
      JPG: '#10b981', PNG: '#10b981', GIF: '#10b981', WEBP: '#10b981',
      PDF: '#dc2626', DOC: '#2563eb', DOCX: '#2563eb', XLS: '#16a34a', XLSX: '#16a34a',
      PPT: '#ea580c', PPTX: '#ea580c', TXT: '#64748b', APK: '#22c55e', EXE: '#0ea5e9',
      AAR: '#0ea5e9', JAR: '#0ea5e9', IPA: '#0ea5e9', ISO: '#6366f1'
    };
    return map[ext] || '#94a3b8';
  }

  function toastRootPush(text, type, ttl) {
    const root = (typeof getRoot === 'function' && getRoot()) || null;
    const host = root ? root.getElementById('yx-toasts') : document.getElementById('yx-toasts');
    if (!host) return;
    const el = document.createElement('div');
    el.className = 'toast ' + (type || 'info');
    el.textContent = text;
    host.appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
    setTimeout(() => {
      el.classList.remove('in');
      setTimeout(() => el.remove(), 240);
    }, ttl || 2600);
  }

  function copyText(text) {
    try {
      if (typeof GM_setClipboard === 'function') {
        GM_setClipboard(text, 'text');
        return true;
      }
    } catch (e) { /* ignore */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (e) {
      return false;
    }
  }

  /* =======================================================================
   * 2. 运行环境兼容层
   * -----------------------------------------------------------------------
   * 油猴（Tampermonkey / Violentmonkey）里 GM_* 齐全，直接用；
   * 手机浏览器、Via、X 浏览器、部分内置脚本引擎不提供 GM_xmlhttpRequest，
   * 这里自动降级到 fetch + localStorage，避免面板直接报
   * "GM_xmlhttpRequest is not defined" 而整个失效。
   * ===================================================================== */

  const HAS_GM_XHR = typeof GM_xmlhttpRequest === 'function';
  const HAS_GM_STORE = typeof GM_getValue === 'function' && typeof GM_setValue === 'function';
  const IS_MOBILE = /Android|iPhone|iPad|iPod|Mobile|HarmonyOS/i.test(navigator.userAgent || '');

  const GMStore = {
    get(k, d) {
      try {
        if (HAS_GM_STORE) {
          const v = GM_getValue(k);
          return v === undefined ? d : v;
        }
        const raw = localStorage.getItem('yx:' + k);
        return raw === null ? d : JSON.parse(raw);
      } catch (e) { return d; }
    },
    set(k, v) {
      try {
        if (HAS_GM_STORE) { GM_setValue(k, v); return; }
        localStorage.setItem('yx:' + k, JSON.stringify(v));
      } catch (e) { /* ignore */ }
    }
  };

  // 用 fetch 模拟 GM_xmlhttpRequest 的回调协议
  function fetchRequest(opt) {
    const ctl = new AbortController();
    const headers = Object.assign({}, opt.headers || {});
    // fetch 禁止手工设置 Cookie / Referer，交给浏览器自动带（同站请求会自动带上）
    Object.keys(headers).forEach((k) => {
      if (/^(cookie|referer|user-agent|host|origin)$/i.test(k)) delete headers[k];
    });
    const type = opt.responseType || 'text';
    let timer = null;
    if (opt.timeout > 0) timer = setTimeout(() => { try { ctl.abort(); } catch (e) {} }, opt.timeout);
    const clear = () => { if (timer) { clearTimeout(timer); timer = null; } };

    fetch(opt.url, {
      method: (opt.method || 'GET').toUpperCase(),
      headers,
      body: opt.data === undefined || opt.data === null ? undefined : opt.data,
      credentials: opt.credentials || 'include',
      redirect: 'follow',
      signal: ctl.signal
    }).then(async (r) => {
      const hs = Array.from(r.headers.entries()).map(([k, v]) => `${k}: ${v}`).join('\r\n');
      let response = null, responseText = '';

      if (type === 'arraybuffer' || type === 'blob') {
        const total = Number(r.headers.get('content-length') || 0);
        if (opt.onprogress && r.body && r.body.getReader) {
          const reader = r.body.getReader();
          const parts = [];
          let loaded = 0;
          for (;;) {
            const step = await reader.read();
            if (step.done) break;
            parts.push(step.value);
            loaded += step.value.length;
            try { opt.onprogress({ loaded, total }); } catch (e) { /* ignore */ }
          }
          const buf = new Uint8Array(loaded);
          let off = 0;
          for (const p of parts) { buf.set(p, off); off += p.length; }
          response = buf.buffer;
        } else {
          response = await r.arrayBuffer();
          if (opt.onprogress) {
            try { opt.onprogress({ loaded: response.byteLength, total: response.byteLength || total }); } catch (e) { /* ignore */ }
          }
        }
        if (type === 'blob') {
          response = new Blob([response], { type: r.headers.get('content-type') || 'application/octet-stream' });
        }
      } else {
        responseText = await r.text();
        response = responseText;
      }

      clear();
      if (opt.onload) {
        opt.onload({
          status: r.status, statusText: r.statusText, responseHeaders: hs,
          responseText, response, finalUrl: r.url
        });
      }
    }).catch((e) => {
      clear();
      const aborted = e && (e.name === 'AbortError' || ctl.signal.aborted);
      if (aborted) {
        if (opt.onabort) opt.onabort(e); else if (opt.ontimeout) opt.ontimeout(e);
      } else if (opt.onerror) {
        opt.onerror(e);
      }
    });

    return { abort() { try { ctl.abort(); } catch (e) {} } };
  }

  function httpRequest(opt) {
    // 只有百度 / 迅雷走页面内 fetch：
    //   - 百度接口与分享页同源，Cookie 自动带
    //   - 迅雷接口与分享页同站且放行 CORS
    // 其余平台（夸克 / 123 / 115…）强校验自定义 UA，必须用 GM_xmlhttpRequest，
    // 不能因为「同源」就切成 fetch，否则会丢掉 UA 直接 403。
    // opt.forceGM：百度 xpan 开放接口与 dlink 必须带 UA「pan.baidu.com」，
    // fetch 改不了 UA，只能强制走 GM 通道。
    if (!opt.forceGM && preferPageFetch(opt.url)) return fetchRequest(opt);
    if (HAS_GM_XHR) return GM_xmlhttpRequest(opt);
    return fetchRequest(opt);
  }

  function preferPageFetch(url) {
    try {
      const u = new URL(url, location.href);
      const host = u.hostname;
      const isBaidu = /(^|\.)baidu\.com$|(^|\.)baidupcs\.com$/.test(host);
      const isXunlei = /(^|\.)xunlei\.com$/.test(host);
      if (!isBaidu && !isXunlei) return false;
      // 页面本身就在对应站点上才用 fetch（否则没有 Cookie 意义，还会被 CORS 拦）
      const onBaidu = /(^|\.)baidu\.com$/.test(location.hostname);
      const onXunlei = /(^|\.)xunlei\.com$/.test(location.hostname);
      return (isBaidu && onBaidu) || (isXunlei && onXunlei);
    } catch (e) {
      return false;
    }
  }

  /* =======================================================================
   * 3. 设置持久化
   * ===================================================================== */

  const Store = {
    read() {
      let raw = null;
      try { raw = GMStore.get('yx_settings', null); } catch (e) { raw = null; }
      if (raw && typeof raw === 'object') return Object.assign({}, DEFAULT_SETTINGS, raw);
      if (typeof raw === 'string') {
        try { return Object.assign({}, DEFAULT_SETTINGS, JSON.parse(raw)); } catch (e) { /* ignore */ }
      }
      return Object.assign({}, DEFAULT_SETTINGS);
    },
    write(s) {
      try { GMStore.set('yx_settings', s); } catch (e) { /* ignore */ }
    }
  };

  const settings = Store.read();

  /* =======================================================================
   * 3. 网络层（GM_xmlhttpRequest）
   * ===================================================================== */

  function gmRequest(opt) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const done = (fn, v) => { if (!settled) { settled = true; fn(v); } };
      try {
        httpRequest({
          method: opt.method || 'GET',
          url: opt.url,
          headers: opt.headers || {},
          data: opt.data,
          forceGM: opt.forceGM,
          credentials: opt.credentials,
          timeout: opt.timeout === 0 ? 0 : (opt.timeout || 25000),
          responseType: opt.responseType || 'text',
          onload: (r) => done(resolve, r),
          onprogress: (e) => { if (opt.onprogress) opt.onprogress(e); },
          onerror: (r) => {
            const raw = String((r && (r.error || r.statusText)) || '');
            // @connect 白名单没覆盖到的域会被脚本管理器直接拒绝，
            // 这种错必须说清是「没授权这个域」，否则用户只会看到「网络错误」无从下手
            const blocked = /connect|refused|permission|not allowed|not permitted|CSP|blocked/i.test(raw);
            done(reject, new Error(blocked
              ? `域名未授权：${raw}（该 CDN 不在 @connect 列表，请在脚本管理器里允许）`
              : '网络错误：无法连接服务器（可能需要代理）'));
          },
          ontimeout: () => done(reject, new Error('请求超时，请重试')),
          onabort: () => done(reject, new Error('请求已取消'))
        });
      } catch (e) {
        done(reject, e);
      }
    });
  }

  function parseJSON(res, fallback) {
    if (res && res.response && typeof res.response === 'object') return res.response;
    const text = (res && res.responseText) || '';
    try {
      return JSON.parse(text);
    } catch (e) {
      const code = res && res.status;
      throw new Error(`${fallback}（HTTP ${code}，响应不是 JSON，可能被风控）`);
    }
  }

  function apiMessage(json, fallback) {
    const msg = (json && (json.message || json.msg || json.desc)) || '';
    return msg || fallback;
  }

  function gmCookies(url) {
    return new Promise((resolve) => {
      try {
        if (typeof GM_cookie === 'undefined' || !GM_cookie) return resolve([]);
        const fn = GM_cookie.list
          ? GM_cookie.list.bind(GM_cookie)
          : (d, cb) => GM_cookie('list', d, cb);
        fn({ url }, (cookies, err) => {
          if (err || !cookies) return resolve([]);
          resolve(cookies);
        });
      } catch (e) {
        resolve([]);
      }
    });
  }

  async function cookieHeader(url) {
    const list = await gmCookies(url);
    if (list && list.length) return list.map((c) => `${c.name}=${c.value}`).join('; ');
    return document.cookie.split(';').map((s) => s.trim()).filter(Boolean).join('; ');
  }

  // 从响应头里捞游客 Cookie（__pugs）
  function pickCookie(res, name) {
    const raw = (res && res.responseHeaders) || '';
    const re = new RegExp(`set-cookie:\\s*(${name}=[^;\\r\\n]+)`, 'i');
    const m = raw.match(re);
    return m ? m[1].trim() : '';
  }

  // 把游客 Cookie 落到当前站点域上，让浏览器直接点链接也能下载（尽力而为）
  function plantCookie(cookieKV, registrable) {
    if (!cookieKV) return;
    try {
      const idx = cookieKV.indexOf('=');
      if (idx < 0) return;
      const name = cookieKV.slice(0, idx);
      const value = cookieKV.slice(idx + 1);
      document.cookie = `${name}=${value}; domain=.${registrable}; path=/; max-age=10800; SameSite=Lax; Secure`;
    } catch (e) { /* ignore */ }
  }

  /* =======================================================================
   * 4. 平台适配
   * ===================================================================== */

  /**
   * 夸克 / UC 共用同一套 clouddrive 协议，仅域名、UA、header 不同。
   * 流程：token（拿 stoken）→ detail（列目录）→ file/download（换直链）
   */
  function makeCloudDrive(cfg) {
    const baseHeaders = (cookie) => {
      const h = {
        'User-Agent': cfg.ua,
        'Origin': cfg.origin,
        'Referer': cfg.referer + '/',
        'Content-Type': 'application/json;charset=UTF-8'
      };
      // 只有拿到完整登录态（含 __pus/__puus）才手动带 Cookie；
      // 否则交给 Tampermonkey 的 Cookie 罐处理，避免用残缺 Cookie 覆盖掉浏览器登录态
      if (cookie && /__(?:puus|pus|pugs)=/.test(cookie)) h['Cookie'] = cookie;
      return h;
    };

    return {
      id: cfg.id,
      name: cfg.name,
      color: cfg.color,
      logo: cfg.logo,
      hosts: cfg.hosts,
      guestLabel: '游客',
      guestHint: '游客态有大小限制',
      cookieUrl: cfg.origin,

      pick(url) {
        const m = url.match(cfg.shareRe);
        if (!m) return null;
        const pwd = (url.match(/[?&](?:pwd|passcode)=([A-Za-z0-9]+)/) || [])[1] || '';
        return { id: m[1], pwd };
      },

      async init(ctx) {
        ctx.cookie = await cookieHeader(cfg.origin);
        ctx.logged = /(__pus=|__puus=)/.test(ctx.cookie);

        // Cookie 里读不到登录态时（__puus 是 HttpOnly，手机浏览器基本读不到），
        // 会出现「已经登录了，面板还显示游客」。这里再用接口探一次真实状态。
        const probe = (!ctx.logged && typeof cfg.probeLogin === 'function')
          ? cfg.probeLogin(ctx, baseHeaders).catch(() => false)
          : null;

        const res = await gmRequest({
          method: 'POST',
          url: cfg.tokenUrl,
          headers: baseHeaders(ctx.cookie),
          data: JSON.stringify({
            pwd_id: ctx.id,
            passcode: ctx.pwd || '',
            support_visit_limit_private_share: true
          })
        });
        const json = parseJSON(res, '获取分享信息失败');
        if (Number(json.status) !== 200) {
          throw new Error(apiMessage(json, '分享不存在或已失效'));
        }
        const d = json.data || {};
        ctx.stoken = d.stoken || '';
        ctx.title = d.title || '';
        if (!ctx.stoken) throw new Error('分享凭证获取失败（stoken 为空）');

        if (probe) {
          try { if (await probe) ctx.logged = true; } catch (e) { /* ignore */ }
        }
      },

      async list(ctx, dirId) {
        const pdir = dirId || '0';
        let json;

        if (cfg.listHook) {
          json = await cfg.listHook(ctx, pdir);
        } else if (cfg.detailMode === 'get') {
          const qs = new URLSearchParams({
            pr: cfg.pr, fr: 'pc', pwd_id: ctx.id, stoken: ctx.stoken,
            pdir_fid: pdir, ver: '2', force: '0', _page: '1', _size: '100',
            _fetch_banner: '0', _fetch_share: '0', fetch_relate_conversation: '0',
            _fetch_total: '1', _sort: 'file_type:asc,file_name:asc'
          });
          const res = await gmRequest({ url: `${cfg.detailUrl}?${qs}`, headers: baseHeaders(ctx.cookie) });
          json = parseJSON(res, '获取文件列表失败');
        } else {
          const body = {
            pwd_id: ctx.id, passcode: ctx.pwd || '', force: 0, page: 1, size: 50,
            fetch_banner: 1, fetch_share: 1, fetch_total: 1,
            sort: 'file_type:asc,file_name:asc',
            banner_platform: 'other', web_platform: 'windows', fetch_error_background: 1
          };
          if (pdir !== '0') body.pdir_fid = pdir;
          const res = await gmRequest({
            method: 'POST',
            url: `${cfg.detailUrl}&ve=2.5.20`,
            headers: baseHeaders(ctx.cookie),
            data: JSON.stringify(body)
          });
          json = parseJSON(res, '获取文件列表失败');
        }

        if (Number(json.status) !== 200) {
          const code = Number(json.code);
          if (code === 41018 || code === 41020) throw new Error('提取码不正确或已失效');
          throw new Error(apiMessage(json, '获取文件列表失败'));
        }
        const data = json.data || {};
        const arr = (data.list || (data.detail_info && data.detail_info.list) || []);
        return arr.map((it) => ({
          fid: it.fid,
          name: it.file_name || it.fname || '未命名',
          size: Number(it.size || it.fsize || 0),
          dir: !!(it.dir || it.isdir === 1),
          token: it.share_fid_token || it.fid_token || ''
        }));
      },

      async link(ctx, file) {
        const body = JSON.stringify({
          fids: [file.fid],
          fids_token: [file.token],
          pwd_id: ctx.id,
          stoken: ctx.stoken,
          speedup_session: '',
          token: ''
        });

        const doCall = (cookie) => gmRequest({
          method: 'POST',
          url: cfg.downloadUrl,
          headers: baseHeaders(cookie),
          data: body
        });

        let usedGuest = false;
        let res = await doCall(ctx.logged ? ctx.cookie : (ctx.guestCookie || ''));
        let json = parseJSON(res, '获取直链失败');

        if (Number(json.status) !== 200 || !json.data || !json.data.length) {
          // 登录态失效 / 超出游客上限 → 退回游客链路再试一次
          if (ctx.logged) {
            res = await doCall(ctx.guestCookie || '');
            json = parseJSON(res, '获取直链失败');
            usedGuest = true;
          }
        }

        if (Number(json.status) !== 200) {
          const code = Number(json.code);
          if (code === 23018) throw new Error('游客链有大小限制，请在本站登录后重试');
          if (code === 31001) throw new Error('需要登录：请先在本站登录账号');
          if (code === 41010 || code === 41006) throw new Error('分享已失效');
          throw new Error(apiMessage(json, '获取直链失败'));
        }

        // 游客态会随响应下发 __pugs，缺它 CDN 直接 412
        const pug = pickCookie(res, '__pugs');
        if (pug) {
          ctx.guestCookie = pug;
          plantCookie(pug, cfg.cookieDomain);
        } else if (!ctx.guestCookie) {
          const cookies = await gmCookies(cfg.origin);
          const hit = cookies.find((c) => c.name === '__pugs');
          if (hit) ctx.guestCookie = `__pugs=${hit.value}`;
        }

        const item = (json.data && json.data[0]) || {};
        const url = item.download_url || item.downloadUrl;
        if (!url) throw new Error('服务器未返回直链（可能触发风控，请稍后重试）');

        const headers = { Referer: cfg.referer + '/' };
        if (!ctx.logged || usedGuest) {
          if (ctx.guestCookie) headers.Cookie = ctx.guestCookie;
        }
        return {
          url,
          headers,
          guest: !ctx.logged || usedGuest,
          filename: item.file_name || item.filename || file.name,
          size: Number(item.size || file.size || 0)
        };
      }
    };
  }

  const quark = makeCloudDrive({
    id: 'quark',
    name: '夸克网盘',
    color: '#1e6fff',
    logo: '夸',
    hosts: ['pan.quark.cn'],
    shareRe: /pan\.quark\.cn\/s\/([A-Za-z0-9]+)/,
    origin: 'https://pan.quark.cn',
    referer: 'https://pan.quark.cn',
    cookieDomain: 'quark.cn',
    ua: UA_QUARK,
    pr: 'ucpro',
    tokenUrl: 'https://drive-pc.quark.cn/1/clouddrive/share/sharepage/token?pr=ucpro&fr=pc',
    detailUrl: 'https://drive-pc.quark.cn/1/clouddrive/share/sharepage/detail',
    detailMode: 'get',
    downloadUrl: 'https://drive-pc.quark.cn/1/clouddrive/file/download?pr=ucpro&fr=pc&sys=win32&ve=3.23.2',

    // 登录态兜底探测：Cookie 读不到 HttpOnly 的 __puus 时靠接口判断
    async probeLogin(ctx, baseHeaders) {
      // ① 同源接口，最轻：登录后 data 里有 nickname / user_id
      try {
        const r = await gmRequest({ url: 'https://pan.quark.cn/account/info?fr=pc&platform=web', timeout: 8000 });
        const j = JSON.parse(String((r && r.responseText) || '{}'));
        const d = j.data || {};
        if (d.nickname || d.user_id || d.passport || d.member_type) {
          ctx.nick = d.nickname || '';
          return true;
        }
      } catch (e) { /* ignore */ }
      // ② 会员接口兜底：未登录返回 401 / code 31001 require login [guest]
      try {
        const r = await gmRequest({
          url: 'https://drive-pc.quark.cn/1/clouddrive/member?pr=ucpro&fr=pc',
          headers: baseHeaders(''),
          timeout: 8000
        });
        if (Number(r && r.status) === 200) return true;
      } catch (e) { /* ignore */ }
      return false;
    }
  });

  const uc = makeCloudDrive({
    id: 'uc',
    async listHook(ctx, pdir) {
      const qs = new URLSearchParams({
        entry: 'ft', fr: 'pc', pr: 'UCBrowser',
        pwd_id: ctx.id, fetch_file_list: '1', passcode: ctx.pwd || '',
        _page: '1', _size: '50', _fetch_total: '1', _fetch_task: '1', _fetch_share: '1', _sort: '',
        stoken: ctx.stoken
      });
      if (pdir && pdir !== '0') qs.set('pdir_fid', pdir);
      const res = await gmRequest({
        url: `https://pc-api.uc.cn/1/clouddrive/transfer_share/detail?${qs.toString()}`,
        headers: {
          'User-Agent': UA_UC,
          'Origin': 'https://fast.uc.cn',
          'Referer': 'https://fast.uc.cn/'
        }
      });
      return parseJSON(res, '获取文件列表失败');
    },
    name: 'UC 网盘',
    color: '#ff6a00',
    logo: 'UC',
    hosts: ['drive.uc.cn'],
    shareRe: /drive\.uc\.cn\/s\/([A-Za-z0-9]+)/,
    origin: 'https://drive.uc.cn',
    referer: 'https://drive.uc.cn',
    cookieDomain: 'uc.cn',
    ua: UA_UC,
    pr: 'UCBrowser',
    tokenUrl: 'https://pc-api.uc.cn/1/clouddrive/share/sharepage/token?pr=UCBrowser&fr=pc',
    detailUrl: 'https://pc-api.uc.cn/1/clouddrive/share/sharepage/v2/detail?pr=UCBrowser&fr=pc',
    detailMode: 'post',
    downloadUrl: 'https://pc-api.uc.cn/1/clouddrive/file/download?entry=ft&fr=pc&pr=UCBrowser'
  });

  /* ---------------- 123 云盘 ---------------- */

  const SIGN_TABLE = 'adefghlmyijnopkqrstubcvwsz';

  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32hex(str) {
    let c = 0xFFFFFFFF;
    const bytes = new TextEncoder().encode(str);
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return ((c ^ 0xFFFFFFFF) >>> 0).toString(16);
  }

  const pad2 = (n) => String(n).padStart(2, '0');

  // 123 的 auth-key / auth-value 签名（与网页端一致：web / 3，时间 +16h）
  function make123Sign(path, ts) {
    const t = ts || Math.floor(Date.now() / 1000);
    const d = new Date((t + 57600) * 1000);
    const minute = `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}`;
    const sub = minute.split('').map((ch) => SIGN_TABLE[Number(ch)]).join('');
    const ak = crc32hex(sub);
    const rnd = Math.floor(Math.random() * 10000000);
    const av = `${t}-${rnd}-${crc32hex(`${t}|${rnd}|${path}|web|3|${ak}`)}`;
    return { ak, av };
  }

  function decode123Url(raw) {
    const url = String(raw || '').trim();
    if (!url) return '';
    if (url.indexOf('://') < 0) {
      try {
        const s = atob(url);
        return /^https?:/i.test(s) ? s : '';
      } catch (e) { return ''; }
    }
    const i = url.indexOf('params=');
    if (i < 0) return url;
    try {
      let p = url.slice(i + 7).split('&')[0].replace(/-/g, '+').replace(/_/g, '/');
      while (p.length % 4) p += '=';
      return atob(p);
    } catch (e) {
      return url;
    }
  }

  function read123Token() {
    // 网页登录后 token 落在当前站点 localStorage
    const keys = ['authorToken', 'token', 'access_token'];
    for (const k of keys) {
      try {
        const v = localStorage.getItem(k);
        if (v && String(v).length > 20) {
          if (String(v).trim().startsWith('{')) {
            try {
              const o = JSON.parse(v);
              const t = o.token || o.accessToken || o.access_token;
              if (t) return t;
            } catch (e) { /* ignore */ }
          } else {
            return String(v).replace(/^"|"$/g, '');
          }
        }
      } catch (e) { /* ignore */ }
    }
    return '';
  }

  const pan123 = {
    id: 'pan123',
    name: '123 云盘',
    color: '#0b7dda',
    logo: '123',
    hosts: ['www.123865.com', 'www.123pan.com', 'yun.123pan.cn'],
    guestLabel: '未登录',
    guestHint: '未登录拿不到直链，需先登录 123 账号',
    cookieUrl: 'https://www.123865.com',

    pick(url) {
      let m = url.match(/123(?:865|pan)\.(?:com|cn)\/s\/([A-Za-z0-9]+-[A-Za-z0-9]+)/);
      if (!m) m = url.match(/share\.123pan\.cn\/123pan\/([A-Za-z0-9-]+)/);
      if (!m) m = url.match(/[?&]sk=([A-Za-z0-9-]+)/);
      if (!m) return null;
      const pwd = (url.match(/[?&](?:pwd|password)=([A-Za-z0-9]+)/) || [])[1] || '';
      return { id: m[1], pwd };
    },

    async init(ctx) {
      ctx.cookie = await cookieHeader('https://www.123865.com');
      ctx.logged = !!read123Token();
      const json = await this._list(ctx, '0', '0', 1);
      ctx.title = (json.data && json.data.ShareName) || '';
    },

    async _list(ctx, dirId, next, page) {
      const qs = new URLSearchParams({
        limit: '100',
        next: next || '0',
        orderBy: 'file_name',
        orderDirection: 'asc',
        shareKey: ctx.id,
        ParentFileId: dirId || '0',
        Page: String(page || 1)
      });
      if (ctx.pwd) qs.set('SharePwd', ctx.pwd);
      const res = await gmRequest({
        url: `https://yun.123pan.cn/b/api/share/get?${qs.toString()}`,
        headers: { 'User-Agent': UA_123_DART }
      });
      const json = parseJSON(res, '获取文件列表失败');
      if (Number(json.code) !== 0) {
        if (Number(json.code) === 5113) throw new Error('提取码不正确');
        if (Number(json.code) === 5111) throw new Error('分享不存在或已失效');
        throw new Error(apiMessage(json, '获取文件列表失败'));
      }
      if (json.data && json.data.Expired) throw new Error('分享已过期');
      return json;
    },

    async list(ctx, dirId) {
      const out = [];
      const seen = new Set();
      let next = '0';
      let page = 1;

      for (let guard = 0; guard < 50; guard++) {
        const json = await this._list(ctx, dirId || '0', next, page);
        const data = json.data || {};
        const arr = data.InfoList || [];
        let added = 0;
        for (const it of arr) {
          const fid = String(it.FileId);
          if (seen.has(fid)) continue;
          seen.add(fid);
          added++;
          out.push({
            fid,
            name: it.FileName || '未命名',
            size: Number(it.Size || 0),
            dir: Number(it.Type) === 1,
            token: `${it.S3KeyFlag || ''}|${it.Etag || ''}|${it.StorageNode || ''}`
          });
        }
        // Next: "-1" 表示末页；"" 表示还有下一页（按 Page 翻）；数字为游标
        next = data.Next == null ? '-1' : String(data.Next);
        if (next === '-1' || added === 0) break;
        page++;
        await sleep(120);
      }
      return out;
    },

    async link(ctx, file) {
      const token = read123Token();
      if (!token) {
        throw new Error('123 云盘取直链需登录：请在本站登录 123 账号后刷新页面');
      }
      const parts = String(file.token).split('|');
      const s3KeyFlag = parts[0] || '';
      const etag = parts[1] || '';
      const path = '/b/api/share/download/info';
      const { ak, av } = make123Sign(path);

      const res = await gmRequest({
        method: 'POST',
        url: 'https://www.123865.com' + path,
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'platform': 'android',
          'app-version': '39',
          'authorization': `Bearer ${token}`,
          'loginuuid': '9a1f9a1e-1e1b-4b0e-9f00-' + Math.random().toString(16).slice(2, 14),
          'auth-key': ak,
          'auth-value': av,
          'User-Agent': UA_123_WEB
        },
        data: JSON.stringify({
          ShareKey: ctx.id,
          FileID: Number(file.fid),
          S3KeyFlag: s3KeyFlag,
          Size: file.size,
          Etag: etag
        })
      });

      const json = parseJSON(res, '获取直链失败');
      if (Number(json.code) !== 0) {
        const code = Number(json.code);
        if (code === 5112) throw new Error('123 云盘现在要求「注册登录或付费」才能下载（服务端直接拦截），请先在本站登录账号');
        if (code === 5111) throw new Error('分享已失效');
        throw new Error(apiMessage(json, '获取直链失败'));
      }
      const d = json.data || {};
      const url = decode123Url(d.DownloadURL || d.DownloadUrl || '');
      if (!url) throw new Error('未拿到直链，可能触发了 123 的频率限制');
      return {
        url,
        headers: { Referer: 'https://yun.123pan.cn/', 'User-Agent': UA_123_DART },
        guest: false,
        filename: d.FileName || file.name,
        size: Number(d.Size || file.size || 0)
      };
    }
  };

  /* ---------------- 115 网盘 ---------------- */

  const p115 = {
    id: '115',
    name: '115 网盘',
    color: '#2f7bff',
    logo: '115',
    hosts: ['115.com', '115cdn.com', '115rc.com'],
    cookieUrl: 'https://115.com',
    guestLabel: '游客',
    guestHint: '取链需登录 115 账号',

    pick(url) {
      const m = url.match(/115(?:cdn|rc)?\.com\/s\/(sw[A-Za-z0-9]+)/i);
      if (!m) return null;
      const pwd = (url.match(/[?&](?:password|pwd)=([A-Za-z0-9]+)/i) || [])[1] || '';
      return { id: m[1], pwd };
    },

    _headers(ctx) {
      const h = {
        Referer: `https://115.com/s/${ctx.id}`,
        'User-Agent': UA_115,
        Origin: 'https://115.com'
      };
      // 只有读到完整登录态才手动带，否则交给浏览器/油猴自己的 Cookie 罐
      if (ctx.cookie && /(?:^|;\s*)(?:UID|SEID)=/.test(ctx.cookie)) h.Cookie = ctx.cookie;
      return h;
    },

    async init(ctx) {
      ctx.cookie = await cookieHeader('https://115.com');
      ctx.logged = /(?:^|;\s*)(?:UID|SEID)=/.test(ctx.cookie);

      const res = await gmRequest({
        url: 'https://webapi.115.com/share/snap?share_code=' + encodeURIComponent(ctx.id) +
             '&receive_code=' + encodeURIComponent(ctx.pwd || '') +
             '&offset=0&limit=1&asc=0&cid=0&format=json',
        headers: this._headers(ctx)
      });
      const json = parseJSON(res, '获取分享信息失败');
      if (!json.state) {
        const msg = String(json.error || '');
        if (/取消|不存在|失效/.test(msg)) throw new Error('分享已失效或被取消');
        throw new Error(msg || '分享不存在');
      }
      const d = json.data || {};
      const info = d.shareinfo || {};
      ctx.title = info.share_title || '';
      ctx.userId = String((d.userinfo || {}).user_id || '');
      if (Number(info.has_receive_code) === 1 && !ctx.pwd) throw new Error('该分享需要访问码');
    },

    async list(ctx, dirId) {
      const cid = dirId || '0';
      const res = await gmRequest({
        url: 'https://webapi.115.com/share/snap?share_code=' + encodeURIComponent(ctx.id) +
             '&receive_code=' + encodeURIComponent(ctx.pwd || '') +
             '&offset=0&limit=200&asc=0&cid=' + encodeURIComponent(cid) + '&format=json',
        headers: this._headers(ctx)
      });
      const json = parseJSON(res, '获取文件列表失败');
      if (!json.state) throw new Error(String(json.error || '获取文件列表失败'));
      const arr = ((json.data || {}).list) || [];
      return arr.map((it) => {
        const isDir = Number(it.fc) === 0;
        const fid = String(it.fid || '');
        const id = isDir ? String(it.cid || '') : (fid || String(it.cid || ''));
        return {
          fid: id,
          name: it.n || '未命名',
          size: isDir ? 0 : Number(it.s || 0),
          dir: isDir,
          token: ''
        };
      }).filter((x) => x.fid);
    },

    async link(ctx, file) {
      const res = await gmRequest({
        url: 'https://webapi.115.com/share/downurl?dl=1' +
             '&user_id=' + encodeURIComponent(ctx.userId || '') +
             '&share_code=' + encodeURIComponent(ctx.id) +
             '&file_id=' + encodeURIComponent(file.fid) +
             (ctx.pwd ? '&receive_code=' + encodeURIComponent(ctx.pwd) : ''),
        headers: this._headers(ctx)
      });
      const json = parseJSON(res, '获取直链失败');
      if (!json.state) {
        const msg = String(json.error || '');
        const no = Number(json.errno || json.errNo || 0);
        if (no === 990001 || /登录/.test(msg)) {
          throw new Error('115 取链需要登录：请先在 115.com 登录账号，再回来点「下载」');
        }
        if (no === 50029) throw new Error('115 要求客户端 UA，当前环境被拒（50029）');
        throw new Error(msg || '获取直链失败');
      }
      const d = json.data || {};
      let url = d.file_url_302 || d.file_url || ((d.url || {}).url) || '';
      if (!url && typeof d === 'string') url = d;
      if (!url) throw new Error('115 未返回直链（可能触发风控，稍后重试）');

      // 直链接口会顺带下发 CDN Cookie，缺了可能 403
      const cdn = [];
      const raw = (res && res.responseHeaders) || '';
      raw.split(/\r?\n/).forEach((line) => {
        const m = /^set-cookie:\s*([^=;]+=[^;]+)/i.exec(line.trim());
        if (m) cdn.push(m[1].trim());
      });

      return {
        url,
        headers: Object.assign({ Referer: 'https://115.com/' }, cdn.length ? { Cookie: cdn.join('; ') } : {}),
        guest: false,
        filename: d.fn || file.name,
        size: Number(d.fs || file.size || 0)
      };
    }
  };

  /* ---------------- 天翼云盘 ---------------- */

  const tianyi = {
    id: 'tianyi',
    name: '天翼云盘',
    color: '#ff6a00',
    logo: '天翼',
    hosts: ['cloud.189.cn'],
    cookieUrl: 'https://cloud.189.cn',
    guestLabel: '游客',
    guestHint: '取链需登录天翼账号',

    pick(url) {
      let m = url.match(/cloud\.189\.cn\/t\/([A-Za-z0-9]+)/i);
      if (!m) m = url.match(/cloud\.189\.cn\/web\/share\?code=([A-Za-z0-9]+)/i);
      if (!m) return null;
      const pwd = (url.match(/[?&]accessCode=([A-Za-z0-9]+)/i) || [])[1] || '';
      return { id: m[1], pwd };
    },

    _h(ctx) {
      const h = { Referer: `https://cloud.189.cn/t/${ctx.id}`, Accept: 'application/json;charset=UTF-8' };
      if (ctx.cookie) h.Cookie = ctx.cookie;
      return h;
    },

    async init(ctx) {
      ctx.cookie = await cookieHeader('https://cloud.189.cn');
      ctx.logged = /COOKIE_LOGIN_USER|sessionKey/i.test(ctx.cookie);
      const qs = new URLSearchParams({ shareCode: ctx.id });
      if (ctx.pwd) qs.set('accessCode', ctx.pwd);
      const res = await gmRequest({
        url: `https://cloud.189.cn/api/open/share/getShareInfoByCodeV2.action?${qs}`,
        headers: this._h(ctx)
      });
      const txt = (res && res.responseText) || '';
      let json = null;
      try { json = JSON.parse(txt); } catch (e) { /* 出错时是 XML */ }
      if (!json) {
        const msg = (/<message>([\s\S]*?)<\/message>/.exec(txt) || [])[1] || '';
        if (/sessionKey=null|not login|请登录/i.test(msg)) {
          throw new Error('天翼需要登录：请先在 cloud.189.cn 登录，再回来解析');
        }
        if (/expired/i.test(msg)) throw new Error('分享已过期');
        if (/not found/i.test(msg)) throw new Error('分享不存在或已被取消');
        throw new Error(msg || '获取分享信息失败');
      }
      ctx.title = json.fileName || json.shareName || '';
      ctx.shareId = String(json.shareId || '');
      ctx.shareMode = String(json.shareMode || '');
      if (!ctx.shareId) throw new Error('未取到 shareId（多为未登录）');
    },

    async list(ctx, dirId) {
      const fid = dirId || ctx.shareId;
      const qs = new URLSearchParams({
        pageNum: '1', pageSize: '120', fileId: fid, shareDirFileId: fid,
        isFolder: 'true', shareId: ctx.shareId, shareMode: ctx.shareMode || '', accessCode: ctx.pwd || ''
      });
      const res = await gmRequest({
        url: `https://cloud.189.cn/api/open/share/listShareDir.action?${qs}`,
        headers: this._h(ctx)
      });
      const json = parseJSON(res, '获取文件列表失败');
      if (Number(json.res_code) !== 0) throw new Error(json.res_message || '获取文件列表失败');
      const ao = json.fileListAO || {};
      const dirs = (ao.folderList || []).map((it) => ({
        fid: String(it.id), name: it.name || '未命名', size: 0, dir: true, token: ''
      }));
      const files = (ao.fileList || []).map((it) => ({
        fid: String(it.id), name: it.name || '未命名',
        size: Number(it.size || 0), dir: false, token: ''
      }));
      return dirs.concat(files);
    },

    async link(ctx, file) {
      const qs = new URLSearchParams({ fileId: file.fid, dt: '1', shareId: ctx.shareId });
      const res = await gmRequest({
        url: `https://cloud.189.cn/api/open/file/getFileDownloadUrl.action?${qs}`,
        headers: this._h(ctx)
      });
      let json = null;
      try { json = JSON.parse((res && res.responseText) || ''); } catch (e) { json = null; }
      if (!json) {
        const msg = (/<message>([\s\S]*?)<\/message>/.exec((res && res.responseText) || '') || [])[1] || '';
        if (/sessionKey=null/i.test(msg)) throw new Error('天翼取链需要登录：请先在 cloud.189.cn 登录');
        throw new Error(msg || '获取直链失败');
      }
      if (Number(json.res_code) !== 0) throw new Error(json.res_message || '获取直链失败');
      const url = json.fileDownloadUrl;
      if (!url) throw new Error('天翼未返回直链');
      const list = (json.fileDownloadUrls || [])[0] || {};
      return {
        url,
        headers: { Referer: 'https://cloud.189.cn/' },
        guest: false,
        filename: file.name,
        size: Number(list.fileSize || file.size || 0)
      };
    }
  };

  /* =======================================================================
   * 移动云盘：请求/响应都是 AES-CBC（key 固定，IV 前置 16 字节，响应可能 gzip）
   * ===================================================================== */
  const C139_KEY = 'PVGDwmcvfs1uV3d1';
  const C139_BASE = 'https://share-kd-njs.yun.139.com/yun-share/richlifeApp/devapp/IOutLink';

  async function c139Key() {
    const raw = new TextEncoder().encode(C139_KEY);
    return crypto.subtle.importKey('raw', raw, { name: 'AES-CBC' }, false, ['encrypt', 'decrypt']);
  }

  function bytesToB64(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i += 8192) {
      s += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
    }
    return btoa(s);
  }

  async function c139Seal(obj) {
    const key = await c139Key();
    const iv = crypto.getRandomValues(new Uint8Array(16));
    const pt = new TextEncoder().encode(JSON.stringify(obj));
    const ct = await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, key, pt);
    const all = new Uint8Array(16 + ct.byteLength);
    all.set(iv, 0);
    all.set(new Uint8Array(ct), 16);
    return bytesToB64(all);
  }

  async function c139Open(b64) {
    const raw = Uint8Array.from(atob(String(b64).trim()), (c) => c.charCodeAt(0));
    if (raw.length <= 16) throw new Error('移动云盘返回内容为空');
    const key = await c139Key();
    const pt = await crypto.subtle.decrypt({ name: 'AES-CBC', iv: raw.subarray(0, 16) }, key, raw.subarray(16));
    let u = new Uint8Array(pt);
    if (u[0] === 0x1f && u[1] === 0x8b && typeof DecompressionStream === 'function') {
      const ds = new DecompressionStream('gzip');
      const buf = await new Response(new Blob([u]).stream().pipeThrough(ds)).arrayBuffer();
      u = new Uint8Array(buf);
    }
    return JSON.parse(new TextDecoder().decode(u));
  }

  // 登录后部分接口要带手机号；从页面 localStorage 里尽量捞一个
  function c139Account() {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i) || '';
        if (!/user|account|login|mine/i.test(k)) continue;
        const s = localStorage.getItem(k) || '';
        const m = s.match(/(?:phone|mobile|account|userName|loginName)["']?\s*[:=]\s*["']?(\d{6,15})/);
        if (m) return m[1];
      }
    } catch (e) { /* ignore */ }
    return '';
  }

  const c139 = {
    id: 'c139',
    name: '移动云盘',
    color: '#1a8cff',
    logo: '移动',
    hosts: ['yun.139.com', 'caiyun.139.com'],
    cookieUrl: 'https://yun.139.com',
    guestLabel: '游客',
    guestHint: '取链需登录移动云盘账号',

    pick(url) {
      if (!/139\.com/i.test(url)) return null;
      let m = url.match(/caiyun\.139\.com\/m\/i\?([A-Za-z0-9]+)/i);
      if (!m) m = url.match(/\/w\/i\/([A-Za-z0-9]{6,32})/i);
      if (!m) m = url.match(/[?&#](?:linkID|shareId)=([A-Za-z0-9]{6,32})/i);
      if (!m) return null;
      const pwd = (url.match(/[?&#](?:pwd|passwd|password|accessCode)=([A-Za-z0-9]+)/i) || [])[1] || '';
      return { id: m[1], pwd };
    },

    _headers() {
      return {
        'Content-Type': 'application/json;charset=UTF-8',
        'hcy-cool-flag': '1',
        'x-deviceinfo': '||3|12.27.0|||||chrome 150.0.0.0|360X444|zh-cn|||',
        'x-huawei-channelsrc': '10245500',
        'x-mm-source': '0002',
        'Origin': 'https://yun.139.com',
        'Referer': 'https://yun.139.com/'
      };
    },

    async _post(ctx, path, body) {
      const res = await gmRequest({
        method: 'POST',
        url: C139_BASE + path,
        headers: this._headers(),
        data: await c139Seal(body)
      });
      const txt = (res && res.responseText) || '';
      if (!txt) throw new Error(`移动云盘无响应（HTTP ${(res && res.status) || '?'}）`);
      let json;
      try { json = await c139Open(txt); }
      catch (e) { throw new Error('移动云盘返回无法解密，接口可能已变更'); }
      const code = String(json.resultCode === undefined ? '0' : json.resultCode);
      const msg = json.desc || json.message || '';
      if (code !== '0') {
        if (code === '200000401' || /鉴权失败/.test(msg)) {
          throw new Error('移动云盘取链需要登录：请先在 yun.139.com 登录账号，再回来解析');
        }
        if (/密码/.test(msg)) throw new Error('提取码不正确，请检查后重试');
        throw new Error(msg || `移动云盘错误 ${code}`);
      }
      return json;
    },

    async init(ctx) {
      ctx.account = c139Account();
      ctx.cookie = await cookieHeader('https://yun.139.com');
      ctx.logged = !!ctx.account || /[a-z0-9]{20,}/i.test(ctx.cookie);
      ctx.shareId = ctx.id;
    },

    async list(ctx, dirId) {
      const pca = !dirId || dirId === '0' ? 'root' : dirId;
      const j = await this._post(ctx, '/getOutLinkInfoV6', {
        getOutLinkInfoReq: {
          account: ctx.account || '',
          linkID: ctx.id,
          passwd: ctx.pwd || '',
          caSrt: 1, coSrt: 1, srtDr: 0, bNum: 1,
          pCaID: pca,
          eNum: 200
        }
      });
      const d = j.data || {};
      if (d.shareName && !ctx.title) ctx.title = d.shareName;
      if (d.linkName && !ctx.title) ctx.title = d.linkName;
      const dirs = (d.caLst || []).map((x) => ({
        fid: String(x.caID), name: x.caName || '未命名', size: 0, dir: true, token: ''
      }));
      const files = (d.coLst || []).map((x) => ({
        fid: String(x.coID), name: x.coName || '未命名',
        size: Number(x.coSize || 0), dir: false, token: ''
      }));
      return dirs.concat(files);
    },

    async link(ctx, file) {
      const j = await this._post(ctx, '/dlFromOutLinkV3', {
        dlFromOutLinkReqV3: {
          account: ctx.account || '',
          linkID: ctx.id,
          coIDLst: { item: [file.fid] },
          commonAccountInfo: { account: ctx.account || '', accountType: 1 }
        }
      });
      const d = j.data || {};
      const url = d.redrUrl || d.downloadUrl || d.contentUrl || '';
      if (!url) throw new Error('移动云盘未返回直链');
      return {
        url,
        headers: { Referer: 'https://yun.139.com/' },
        guest: false,
        filename: file.name,
        size: Number(d.coSize || file.size || 0)
      };
    }
  };

  /* =======================================================================
   * 百度网盘：verify（提取码）→ xpan/share/list → share/transfer → locateDownload
   * 关键：取链必须登录，且必须先把文件转存进自己的网盘（官方唯一路径）
   * ===================================================================== */
  const BAIDU_APP_ID = '250528';
  const BAIDU_UA_WEB =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
  const BAIDU_UA_NETDISK = 'netdisk;12.24.6;piano;android-android;16;JSbridge4.4.0;jointBridge;1.1.0';
  // 下载 dlink 时的强制 UA。百度开放平台文档原文：
  //   「User-Agent: pan.baidu.com  必填」；UA 不对会命中防盗链（31326 / 403），
  //   文件超过 50MB 时尤其明显。这个 UA 只能靠 GM_xmlhttpRequest 设置。
  const BAIDU_DL_UA = 'pan.baidu.com';
  const BAIDU_TMP_DIR = '/yunx';
  // 授权用的公开 client_id（都是开源项目/官方测试端在用的，可长期使用）。
  // 第一个不通时自动顺延下一个。
  const BAIDU_CLIENTS = [
    'omiOnr2tYnN9vSyDErcVFWpPU2mZA7YO', // OpenList
    'iYCeC9g08h5vuP9UqvPHKKSVrKFXGa1v', // Alist
    'L6g70tBRRIXLsY0Z3HwKqlRE'          // pcstest_oauth（百度官方 PC 测试端）
  ];
  const BAIDU_TOKEN_KEY = 'baidu_access_token';
  const baiduAuthURL = (cid) =>
    'https://openapi.baidu.com/oauth/2.0/authorize?response_type=token&scope=basic,netdisk' +
    `&client_id=${cid}&redirect_uri=oob&confirm_login=0`;

  const baidu = {
    id: 'baidu',
    name: '百度网盘',
    color: '#2a6cff',
    logo: '百度',
    hosts: ['pan.baidu.com', 'yun.baidu.com'],
    cookieUrl: 'https://pan.baidu.com',
    guestLabel: '未登录',
    guestHint: '百度已关闭游客取链，登录后走免转存通道',
    needGM: false,
    forceBrowser: true,

    pick(url) {
      if (!/baidu\.com/i.test(url)) return null;
      let m = url.match(/pan\.baidu\.com\/s\/([A-Za-z0-9_-]+)/i);
      if (!m) m = url.match(/[?&]surl=([A-Za-z0-9_-]+)/i);
      if (!m) return null;
      let pwd = (url.match(/[?&#]pwd=([A-Za-z0-9]{4})/i) || [])[1] || '';
      if (!pwd) {
        const m2 = url.match(/(?:提取码|密码|口令)\s*[：:]?\s*([A-Za-z0-9]{4})(?![A-Za-z0-9])/);
        if (m2) pwd = m2[1];
      }
      return { id: m[1], pwd };
    },

    _cookie(ctx) {
      const parts = [];
      if (ctx.cookie) parts.push(ctx.cookie);
      if (ctx.sekey && !/BDCLND=/.test(ctx.cookie || '')) parts.push(`BDCLND=${ctx.sekey}`);
      return parts.join('; ');
    },

    _webHeaders(ctx) {
      const h = {
        'User-Agent': BAIDU_UA_WEB,
        'Referer': `https://pan.baidu.com/s/${ctx.id}`
      };
      const ck = this._cookie(ctx);
      if (ck) h.Cookie = ck;
      return h;
    },

    _appHeaders(ctx) {
      const h = {
        'User-Agent': BAIDU_UA_NETDISK,
        'Referer': 'https://pan.baidu.com/disk/main',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
      };
      const ck = this._cookie(ctx);
      if (ck) h.Cookie = ck;
      return h;
    },

    /* ---------------- 授权（AccessToken 通道） ----------------
     * 百度 2023 年起关闭游客取链，2025 年起前端普遍改走开放平台 OAuth。
     * 好处：一次授权拿到 access_token（30 天有效），之后完全不依赖
     * BDUSS / bdstoken / 页面改版，取链和下载都只认这个 token。
     */
    token() {
      const t = GMStore.get(BAIDU_TOKEN_KEY, '') || '';
      return typeof t === 'string' ? t.trim() : '';
    },

    hasToken() {
      return !!this.token();
    },

    /**
     * 打开授权页 → 授权页由本脚本自动点「允许」→ token 写回存储。
     * 授权页逻辑见文件末尾 baiduAuthPage()。
     */
    async authorize() {
      const existing = this.token();
      if (existing) return existing;
      let url = '';
      for (const cid of BAIDU_CLIENTS) {
        url = baiduAuthURL(cid);
        // 逐个试：某个 client_id 被封时，授权页会报错而不是给出「允许」按钮，
        // 超时后顺延下一个（最多 25 秒）。
        const ok = await this._openAuthAndWait(url);
        if (ok) return ok;
      }
      throw new Error(
        '百度授权未完成。请确认：1) 已在本浏览器登录百度账号；2) 授权页弹出后点击「允许」。' +
          '若一直没反应，可在脚本菜单里先用「打开直链面板」登录后再试。'
      );
    },

    _openAuthAndWait(url) {
      return new Promise((resolve) => {
        let opened = null;
        try {
          if (typeof GM_openInTab === 'function') {
            opened = GM_openInTab(url, { active: true, insert: true, setParent: true });
          }
        } catch (e) { opened = null; }
        if (!opened) {
          try { window.open(url, '_blank', 'noopener'); } catch (e) { /* ignore */ }
        }
        let n = 0;
        const iv = setInterval(() => {
          n++;
          const t = this.token();
          if (t) { clearInterval(iv); resolve(t); return; }
          // 2 分钟还没授权成功就放弃，交给上层换 client_id / 报错
          if (n > 60) { clearInterval(iv); resolve(''); }
        }, 2000);
      });
    },

    // 统一 xpan 开放接口请求：必须带 UA pan.baidu.com，且强制 GM 通道
    async _xpan(url) {
      const res = await gmRequest({
        url,
        forceGM: true,
        headers: { 'User-Agent': BAIDU_DL_UA, 'Referer': 'https://pan.baidu.com/' }
      });
      return parseJSON(res, '百度开放接口异常');
    },

    // 校验令牌是否可用（顺便拿到账号名做反馈）
    async verifyToken() {
      const token = this.token();
      if (!token) return null;
      try {
        const j = await this._xpan(
          'https://pan.baidu.com/rest/2.0/xpan/nas?method=uinfo' +
            `&access_token=${encodeURIComponent(token)}`
        );
        if (Number(j.errno) === 0) return j;
        if (Number(j.errno) === 31045 || Number(j.errno) === -6) {
          GMStore.set(BAIDU_TOKEN_KEY, '');
        }
        return null;
      } catch (e) { return null; }
    },

    // dlink 必须追加 access_token 才能下载（百度文档硬性要求，不是 Header）
    _attachToken(dlink, token) {
      if (!dlink || !/^http/i.test(dlink)) return '';
      if (/[?&]access_token=/.test(dlink)) return dlink;
      const t = token || this.token();
      if (!t) return dlink;
      return dlink + (dlink.indexOf('?') >= 0 ? '&' : '?') + 'access_token=' + encodeURIComponent(t);
    },

    // 用 token 取 dlink（自己网盘里的文件 / 转存后的文件都走这里）
    async _dlinkByToken(fsid) {
      const token = this.token();
      if (!token) return '';
      const url =
        'https://pan.baidu.com/rest/2.0/xpan/multimedia?method=filemetas&dlink=1' +
        `&fsids=%5B${encodeURIComponent(String(fsid))}%5D` +
        `&access_token=${encodeURIComponent(token)}`;
      const j = await this._xpan(url);
      if (Number(j.errno) === 31045 || Number(j.errno) === -6) {
        // token 失效：清掉，让上层引导重新授权
        GMStore.set(BAIDU_TOKEN_KEY, '');
        throw new Error('百度访问令牌已过期，已自动清除，请点「授权百度」重新授权');
      }
      if (Number(j.errno) !== 0) {
        throw new Error(j.errmsg || `百度取链失败（errno ${j.errno}）`);
      }
      const it = (j.list || [])[0];
      if (!it || !it.dlink) throw new Error('百度未返回 dlink（文件可能已被删除或无权访问）');
      return this._attachToken(it.dlink, token);
    },

    // 用 token 列出自己网盘目录（转存后回读用）
    async _listByToken(dir) {
      const token = this.token();
      if (!token) throw new Error('缺少百度访问令牌');
      const url =
        'https://pan.baidu.com/rest/2.0/xpan/file?method=list&showempty=1' +
        `&dir=${encodeURIComponent(dir)}&access_token=${encodeURIComponent(token)}`;
      const j = await this._xpan(url);
      if (Number(j.errno) === 31045) {
        GMStore.set(BAIDU_TOKEN_KEY, '');
        throw new Error('百度访问令牌已过期，请重新授权');
      }
      return j;
    },

    // 用 token 转存分享文件（比网页版 /share/transfer 稳定，不吃 bdstoken）
    async _transferByToken(ctx, file) {
      const token = this.token();
      if (!token) throw new Error('缺少百度访问令牌');
      if (!ctx.shareId || !ctx.shareUk) throw new Error('分享信息不完整（shareid / uk 缺失）');
      const q = new URLSearchParams({
        method: 'transfer',
        access_token: token,
        shareid: String(ctx.shareId),
        from: String(ctx.shareUk),
        sekey: ctx.sekey || '',
        ondup: 'newcopy',
        async: '0'
      });
      const body = new URLSearchParams({
        fsidlist: JSON.stringify([Number(file.fid)]),
        path: BAIDU_TMP_DIR
      });
      const res = await gmRequest({
        method: 'POST',
        url: `https://pan.baidu.com/rest/2.0/xpan/share?${q.toString()}`,
        forceGM: true,
        headers: {
          'User-Agent': BAIDU_DL_UA,
          'Referer': `https://pan.baidu.com/s/${ctx.id}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: body.toString()
      });
      const j = parseJSON(res, '转存失败');
      if (Number(j.errno) !== 0) {
        throw new Error(j.show_msg || j.errmsg || `转存失败（errno ${j.errno}）`);
      }
      const list = j.list || j.extra_list || [];
      const fsid = list[0] && (list[0].to_fsid || list[0].fsid || list[0].fs_id);
      return fsid ? String(fsid) : '';
    },

    _needLogin() {
      throw new Error('百度分享页需要先登录：登录本页，或点下方按钮用令牌授权');
    },

    _check(json, fallback) {
      const code = Number(json.errno === undefined ? 0 : json.errno);
      if (code === 0) return json;
      if (code === -6) this._needLogin();
      if (code === -9 || code === 12) throw new Error('提取码不正确，请检查后重试');
      if (code === 2) throw new Error(json.errmsg || '百度返回参数错误（errno 2），多为 Cookie 不完整');
      throw new Error(json.errmsg || json.show_msg || `${fallback}（errno ${code}）`);
    },

    async init(ctx) {
      const pi = this._pageInfo();
      ctx.bdstoken = pi.bdstoken || '';
      ctx.sekey = pi.sekey || '';
      ctx.jsToken = pi.jsToken || '';
      ctx.shareUk = pi.share_uk || '';
      ctx.shareId = pi.shareid || '';
      ctx.cookie = '';
      // 关键：BDUSS 是 HttpOnly，document.cookie / GM_cookie 都读不到，
      // 所以不能拿 Cookie 判断登录态。页面里的 locals.loginstate 才是准的。
      ctx.logged = pi.loginstate === 1 || !!ctx.bdstoken;
      if (!ctx.logged && pi.loginstate === 0) {
        // 明确是游客，不用再试探
        ctx.guestConfirmed = true;
      }
      // 兜底：页面变量读不到（部分手机脚本引擎没有 unsafeWindow）时，
      // 直接同域请求 gettemplatevariable —— fetch 会自动带上 HttpOnly 的 BDUSS
      if (ctx.bdstoken) return;
      try {
        const res = await gmRequest({
          url: `https://pan.baidu.com/api/gettemplatevariable?clienttype=0&app_id=${BAIDU_APP_ID}&web=1&fields=%5B%22bdstoken%22%5D`,
          headers: this._webHeaders(ctx)
        });
        const j = parseJSON(res, '获取 bdstoken 失败');
        if (Number(j.errno) === 0 && j.result && j.result.bdstoken) {
          ctx.bdstoken = j.result.bdstoken;
          ctx.logged = true;
        }
      } catch (e) { /* 拿不到就让后续接口自己报错 */ }
    },

    // 从分享页自身上下文取会话（locals / jsToken / currentSekey）
    _pageInfo() {
      const out = {};
      try {
        const W = typeof unsafeWindow !== 'undefined' && unsafeWindow ? unsafeWindow : window;
        const dump = W.locals && W.locals.dump ? W.locals.dump() : null;
        if (dump) {
          const val = (k) => {
            const v = dump[k];
            if (v && typeof v === 'object' && 'value' in v) return v.value;
            return v;
          };
          out.bdstoken = String(val('bdstoken') || '');
          out.share_uk = String(val('share_uk') || '');
          out.shareid = String(val('shareid') || '');
          out.loginstate = Number(val('loginstate'));
        }
        out.jsToken = String(W.jsToken || '');
        out.sekey = String(
          W.currentSekey ||
          (W.cache && W.cache.list && W.cache.list.config &&
            W.cache.list.config.params && W.cache.list.config.params.sekey) || ''
        );
      } catch (e) { /* ignore */ }
      return out;
    },

    async _verify(ctx) {
      if (!ctx.pwd) return;
      const res = await gmRequest({
        method: 'POST',
        url: `https://pan.baidu.com/share/verify?surl=${encodeURIComponent(ctx.id)}`,
        headers: Object.assign(this._webHeaders(ctx), {
          'Content-Type': 'application/x-www-form-urlencoded'
        }),
        data: `pwd=${encodeURIComponent(ctx.pwd)}&vcode_str=&vcode=`
      });
      const j = this._check(parseJSON(res, '提取码校验失败'), '提取码校验失败');
      ctx.sekey = j.randsk || '';
    },

    async list(ctx, dirId) {
      if (!ctx.logged) this._needLogin();
      if (!ctx.sekey && ctx.pwd) await this._verify(ctx);
      const dir = !dirId || dirId === '0' ? '/' : dirId;
      const isRoot = dir === '/';
      let j = null;
      let firstErr = null;

      // 路线 A：xpan 分享列表（新）
      try {
        let url = `https://pan.baidu.com/rest/2.0/xpan/share?method=list&shorturl=${encodeURIComponent(ctx.id)}` +
          `&page=1&num=100&root=${isRoot ? 1 : 0}&dir=${encodeURIComponent(dir)}`;
        if (ctx.sekey) url += `&sekey=${encodeURIComponent(ctx.sekey)}`;
        const res = await gmRequest({ url, headers: this._webHeaders(ctx) });
        const t = parseJSON(res, '获取文件列表失败');
        if (Number(t.errno) === 0 && Array.isArray(t.list)) j = t;
        else firstErr = new Error(`xpan list errno ${t.errno}${t.errmsg ? ' ' + t.errmsg : ''}`);
      } catch (e) { firstErr = e; }

      // 路线 B：老 web 接口（share/list），新接口改动时兜底
      if (!j) {
        try {
          const uk = ctx.shareUk || ctx.uk || '';
          let url = 'https://pan.baidu.com/share/list?order=other&desc=1&showempty=0&web=1' +
            '&page=1&num=100' +
            `&uk=${encodeURIComponent(uk)}&shareid=${encodeURIComponent(ctx.shareId || '')}` +
            `&dir=${encodeURIComponent(dir)}&t=${Date.now()}&channel=chunlei&app_id=${BAIDU_APP_ID}` +
            `&bdstoken=${encodeURIComponent(ctx.bdstoken || '')}`;
          if (ctx.sekey) url += `&sekey=${encodeURIComponent(ctx.sekey)}`;
          const res = await gmRequest({ url, headers: this._webHeaders(ctx) });
          const t = parseJSON(res, '获取文件列表失败');
          if (Number(t.errno) === 0 && Array.isArray(t.list)) j = t;
          else firstErr = firstErr || new Error(`share/list errno ${t.errno}${t.errmsg ? ' ' + t.errmsg : ''}`);
        } catch (e) { firstErr = firstErr || e; }
      }

      if (!j) {
        if (firstErr && /-6|未登录|login/i.test(firstErr.message)) this._needLogin();
        throw firstErr || new Error('获取文件列表失败');
      }

      ctx.shareId = String(j.share_id || ctx.shareId || '');
      ctx.uk = String(j.uk || ctx.uk || '');
      if (j.title && !ctx.title) ctx.title = j.title;
      return (j.list || []).map((it) => {
        const isDir = String(it.isdir) === '1';
        return {
          fid: isDir ? (it.path || it.server_filename) : String(it.fs_id),
          name: it.server_filename || '未命名',
          size: Number(it.size || 0),
          dir: isDir,
          token: ''
        };
      });
    },

    async _ensureDir(ctx) {
      if (ctx.dirReady) return;
      if (!ctx.bdstoken) throw new Error('百度会话已失效：请刷新页面重新登录');
      await gmRequest({
        method: 'POST',
        url: `https://pan.baidu.com/api/create?a=commit&channel=chunlei&web=1&app_id=${BAIDU_APP_ID}&clienttype=0&bdstoken=${ctx.bdstoken}`,
        headers: this._appHeaders(ctx),
        data: `path=${encodeURIComponent(BAIDU_TMP_DIR)}&isdir=1&size&block_list=%5B%5D&method=post&dataType=json`
      });
      ctx.dirReady = true;
    },

    async _transfer(ctx, file) {
      await this._ensureDir(ctx);
      const res = await gmRequest({
        method: 'POST',
        url: `https://pan.baidu.com/share/transfer?shareid=${ctx.shareId}&from=${ctx.uk}` +
          `&channel=chunlei&sekey=${ctx.sekey || ''}&ondup=newcopy&web=1&app_id=${BAIDU_APP_ID}` +
          `&bdstoken=${ctx.bdstoken}&clienttype=0`,
        headers: Object.assign(this._webHeaders(ctx), {
          'Origin': 'https://pan.baidu.com',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        }),
        data: `fsidlist=%5B%22${file.fid}%22%5D&path=${encodeURIComponent(BAIDU_TMP_DIR)}`
      });
      const j = this._check(parseJSON(res, '转存失败'), '转存失败');
      const first = ((j.extra || {}).list || [])[0];
      if (!first) throw new Error('转存未返回文件（可能空间不足或文件违规）');
      return { fid: String(first.to_fs_id || ''), path: String(first.to || '') };
    },

    async _locate(ctx, path) {
      const time = Math.floor(Date.now() / 1000);
      const url = 'https://d.pcs.baidu.com/rest/2.0/pcs/file?method=locatedownload' +
        `&app_id=${BAIDU_APP_ID}&clienttype=17&ver=4.0&ant=1&check_blue=1&es=1&esl=1&apn_id=1_-1` +
        '&freeisp=0&queryfree=0&use=1&dtype=1&eck=1&ehps=1&err_ver=1.0&network_type=WIFI&channel=0' +
        `&path=${encodeURIComponent(path)}&time=${time}` +
        '&rand=5ed606e9da222cde0474cdf70eda884b&devuid=0F1E9FC2E084472DA5A61C4CF4C759AF' +
        '&cuid=0F1E9FC2E084472DA5A61C4CF4C759AF&deviceid=348642637967375013' +
        '&psign=860a071f77c860e8cea06e4e54c518f3&version=2.2.111.34&version_app=12.24.6&vip=0';
      const res = await gmRequest({
        method: 'POST', url,
        headers: Object.assign(this._appHeaders(ctx), { 'Content-Type': 'application/x-www-form-urlencoded' }),
        data: '0'
      });
      const j = this._check(parseJSON(res, '获取直链失败'), '获取直链失败');
      const urls = (j.urls || []).filter((x) => x && x.url);
      const plain = urls.filter((x) => Number(x.encrypt || 0) === 0)
        .sort((a, b) => (a.url.indexOf('https') === 0 ? 0 : 1) - (b.url.indexOf('https') === 0 ? 0 : 1))[0];
      const pick = plain || urls.filter((x) => x.url.indexOf('https') === 0)[0] || urls[0];
      if (!pick) throw new Error('百度未返回可用直链');
      return pick.url;
    },

    async link(ctx, file) {
      const hasToken = this.hasToken();
      if (!ctx.logged && !hasToken) {
        throw new Error('百度已关闭游客取链：请在本页登录百度账号后刷新重试。登录后走「免转存」通道，不会往你网盘写任何文件');
      }
      const errors = [];
      const dlHeaders = { 'User-Agent': BAIDU_DL_UA, 'Referer': 'https://pan.baidu.com/' };

      // 路线 A：分享直下（api/sharedownload），不转存、不占空间
      try {
        const url = await this._sharedownload(ctx, file);
        if (url) {
          return {
            url: this._attachToken(url),
            headers: dlHeaders,
            guest: false,
            filename: file.name,
            size: Number(file.size || 0),
            note: '免转存直链，链接约 8 小时有效（下载须带 UA：pan.baidu.com）'
          };
        }
      } catch (e) { errors.push('免转存：' + (e.message || e)); }

      // 路线 B：转存到自己网盘 → filemetas 取 dlink
      //   B1 有 access_token 时走开放接口（最稳，不吃 bdstoken）
      //   B2 没 token 时退回网页接口（吃 bdstoken）
      if (hasToken) {
        try {
          const fsid = await this._transferByToken(ctx, file);
          if (!fsid) throw new Error('转存成功但没拿到 fsid');
          const url = await this._dlinkByToken(fsid);
          if (!url) throw new Error('百度未返回 dlink');
          return {
            url,
            headers: dlHeaders,
            guest: false,
            filename: file.name,
            size: Number(file.size || 0),
            note: `已转存到网盘 ${BAIDU_TMP_DIR}（可自行删除），链接 8 小时有效`
          };
        } catch (e) { errors.push('转存(token)：' + (e.message || e)); }
      }

      try {
        const saved = await this._transfer(ctx, file);
        const url = await this._filemetas(ctx, saved.fid);
        if (!url) throw new Error('百度未返回 dlink');
        return {
          url: this._attachToken(url),
          headers: dlHeaders,
          guest: false,
          filename: file.name,
          size: Number(file.size || 0),
          note: `已转存到网盘 ${BAIDU_TMP_DIR}，可自行删除`
        };
      } catch (e) { errors.push('转存：' + (e.message || e)); }

      throw new Error(errors.join(' / '));
    },

    _b64(s) {
      try { return btoa(unescape(encodeURIComponent(s))); } catch (e) { return ''; }
    },

    // 分享直下：tplconfig 拿 sign/timestamp → api/sharedownload
    async _sharedownload(ctx, file) {
      if (!ctx.bdstoken) throw new Error('缺少 bdstoken（会话未就绪，刷新页面再试）');
      const surl = /^1/.test(ctx.id) ? ctx.id : '1' + ctx.id;
      const baiduid = (document.cookie.match(/BAIDUID=([^;]+)/) || [])[1] || '';
      const logid = baiduid ? this._b64(decodeURIComponent(baiduid)) : '';
      const q = [
        'fields=sign,timestamp', 'channel=chunlei', 'web=1',
        `app_id=${BAIDU_APP_ID}`, 'clienttype=0', 'view_mode=1',
        `surl=${encodeURIComponent(surl)}`,
        `bdstoken=${encodeURIComponent(ctx.bdstoken)}`
      ].concat(logid ? [`logid=${encodeURIComponent(logid)}`] : []).join('&');
      const tpl = this._check(
        parseJSON(await gmRequest({ url: `https://pan.baidu.com/share/tplconfig?${q}`, headers: this._webHeaders(ctx) }), '获取签名失败'),
        '获取签名失败'
      );
      const d = tpl.data || tpl;
      if (!d || !d.sign || !d.timestamp) throw new Error(`未拿到 sign/timestamp（errno ${tpl.errno}）`);

      const body = new URLSearchParams({
        encrypt: '0',
        product: 'share',
        uk: String(ctx.shareUk || ctx.uk || ''),
        primaryid: String(ctx.shareId || ''),
        fid_list: JSON.stringify([Number(file.fid)])
      });
      if (ctx.sekey) body.set('extra', JSON.stringify({ sekey: ctx.sekey }));

      const post = [
        'channel=chunlei', 'clienttype=0', 'web=1', `app_id=${BAIDU_APP_ID}`,
        `sign=${encodeURIComponent(d.sign)}`, `timestamp=${encodeURIComponent(d.timestamp)}`,
        `bdstoken=${encodeURIComponent(ctx.bdstoken)}`
      ].concat(logid ? [`logid=${encodeURIComponent(logid)}`] : [])
        .concat(ctx.jsToken ? [`jsToken=${encodeURIComponent(ctx.jsToken)}`] : []).join('&');

      const res = await gmRequest({
        method: 'POST',
        url: `https://pan.baidu.com/api/sharedownload?${post}`,
        headers: {
          'User-Agent': BAIDU_UA_NETDISK,
          'Referer': `https://pan.baidu.com/s/${ctx.id}`,
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        },
        data: body.toString()
      });
      const j = this._check(parseJSON(res, '分享直下失败'), '分享直下失败');
      if (typeof j.list === 'string') throw new Error(j.list || '文件过大，需转存后下载');
      const first = (j.list || [])[0];
      if (!first || !first.dlink) throw new Error(`未返回 dlink（errno ${j.errno}）`);
      return first.dlink;
    },

    // 自己的网盘文件取 dlink（网页版真实接口，比 locatedownload 的固定 psign 可靠）
    async _filemetas(ctx, fsid) {
      const url = `https://pan.baidu.com/api/filemetas?dlink=1&fsids=%5B${encodeURIComponent(fsid)}%5D` +
        `&bdstoken=${encodeURIComponent(ctx.bdstoken)}&web=5&app_id=${BAIDU_APP_ID}`;
      const j = this._check(
        parseJSON(await gmRequest({ url, headers: this._webHeaders(ctx) }), '取 dlink 失败'),
        '取 dlink 失败'
      );
      const it = (j.info || j.list || [])[0];
      return (it && it.dlink) || '';
    }
  };

  /* =======================================================================
   * 迅雷云盘：网页版 captcha 签名（9 层 md5）→ 分享列表 → 转存 → 取链
   * ===================================================================== */
  function md5hex(s) {
    const bytes = new TextEncoder().encode(s);
    const n = bytes.length;
    const bitLen = n * 8;
    const total = (((n + 8) >> 6) + 1) * 64;
    const buf = new Uint8Array(total);
    buf.set(bytes);
    buf[n] = 0x80;
    const view = new DataView(buf.buffer);
    view.setUint32(total - 8, bitLen >>> 0, true);
    view.setUint32(total - 4, Math.floor(bitLen / 4294967296) >>> 0, true);
    const S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
      5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
      4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
      6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
    const K = [];
    for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) | 0;
    let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
    for (let off = 0; off < total; off += 64) {
      const M = [];
      for (let i = 0; i < 16; i++) M[i] = view.getUint32(off + i * 4, true) | 0;
      let A = a0, B = b0, C = c0, D = d0;
      for (let i = 0; i < 64; i++) {
        let F, g;
        if (i < 16) { F = (B & C) | (~B & D); g = i; }
        else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
        else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
        else { F = C ^ (B | ~D); g = (7 * i) % 16; }
        F = (F + A + K[i] + M[g]) | 0;
        A = D; D = C; C = B;
        B = (B + ((F << S[i]) | (F >>> (32 - S[i])))) | 0;
      }
      a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0;
    }
    const hex = (x) => {
      let s = '';
      for (let i = 0; i < 4; i++) s += ((x >>> (i * 8)) & 0xff).toString(16).padStart(2, '0');
      return s;
    };
    return hex(a0) + hex(b0) + hex(c0) + hex(d0);
  }

  const XL_CID = 'Xqp0kJBXWhwaTpB6';
  const XL_VER = '1.93.10';
  const XL_HOST = 'pan.xunlei.com';
  const XL_DEV = '78a70629a2b17d0b4302317ffa94807a';
  const XL_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
  const XL_SALTS = [
    'DVM8BRQfJWDsIE0JbH5GCUM0z0jU1yGymBTj4Eyloazv1F+w0G7ig',
    'T',
    'a1fUxfjOO1/dW++DpGupRgw9P93L',
    'aktKbp+/lQc3MvlMHIupt65LjAgJOL6ttMFvTKK+7+WKubSf9rT',
    'SB/ne9FQUnQmWz4Wuv9KqKfGOBOCUubpHpECxOHfD4hNoMclYA2Yq',
    'sOZFBQ8IMFy3OFjAIf/eA65iqFvS9TIKzLyrhiT6',
    'ZhJdLgL7MGh2GanboB0yk',
    'Osf',
    'v'
  ];
  const xlCaptcha = Object.create(null);

  function xlSign(ts) {
    let h = XL_CID + XL_VER + XL_HOST + XL_DEV + ts;
    for (const s of XL_SALTS) h = md5hex(h + s);
    return `1.${h}`;
  }

  async function xlToken(action) {
    const cached = xlCaptcha[action];
    if (cached && Date.now() < cached.exp) return cached.token;
    const ts = String(Date.now());
    const body = {
      client_id: XL_CID,
      action,
      device_id: XL_DEV,
      meta: {
        username: '', phone_number: '', email: '',
        package_name: XL_HOST,
        client_version: XL_VER,
        captcha_sign: xlSign(ts),
        timestamp: ts,
        user_id: ''
      }
    };
    const res = await gmRequest({
      method: 'POST',
      url: 'https://xluser-ssl.xunlei.com/v1/shield/captcha/init',
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
        'Accept': '*/*',
        'Origin': 'https://pan.xunlei.com',
        'Referer': 'https://pan.xunlei.com/',
        'User-Agent': XL_UA
      },
      data: JSON.stringify(body)
    });
    const j = parseJSON(res, '迅雷验证码初始化失败');
    if (!j.captcha_token) throw new Error(j.error_description || '迅雷验证码初始化失败');
    const ttl = Math.max(60, (Number(j.expires_in) || 300) - 30);
    xlCaptcha[action] = { token: j.captcha_token, exp: Date.now() + ttl * 1000 };
    return j.captcha_token;
  }

  function xlAccessToken() {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i) || '';
        if (k.indexOf('credentials_') !== 0) continue;
        const j = JSON.parse(localStorage.getItem(k) || '{}');
        if (j && j.access_token) return j.access_token;
      }
    } catch (e) { /* ignore */ }
    return '';
  }

  const xunlei = {
    id: 'xunlei',
    name: '迅雷云盘',
    color: '#1f7cff',
    logo: '迅雷',
    hosts: ['pan.xunlei.com'],
    cookieUrl: 'https://pan.xunlei.com',
    guestLabel: '游客',
    guestHint: '游客可列目录，下载需登录（转存后取链）',
    needGM: false,
    forceBrowser: true,

    pick(url) {
      if (!/xunlei\.com/i.test(url)) return null;
      const m = url.match(/pan\.xunlei\.com\/s\/([A-Za-z0-9_-]+)/i);
      if (!m) return null;
      const pwd = (url.match(/[?&#](?:pwd|password)=([A-Za-z0-9]{4,8})/i) || [])[1] || '';
      return { id: m[1], pwd };
    },

    _h(tk, ctx) {
      const h = {
        'User-Agent': XL_UA,
        'X-Device-Id': XL_DEV,
        'X-Client-Id': XL_CID,
        'X-Captcha-Token': tk,
        'Origin': 'https://pan.xunlei.com',
        'Referer': 'https://pan.xunlei.com/'
      };
      if (ctx && ctx.token) h.Authorization = `Bearer ${ctx.token}`;
      return h;
    },

    async init(ctx) {
      ctx.token = xlAccessToken();
      ctx.logged = !!ctx.token;
      ctx.passToken = '';
    },

    async list(ctx, dirId) {
      const sub = !!dirId && dirId !== '0';
      const action = sub ? 'GET:/drive/v1/share/detail' : 'GET:/drive/v1/share';
      const tk = await xlToken(action);
      const url = sub
        ? `https://api-pan.xunlei.com/drive/v1/share/detail?share_id=${encodeURIComponent(ctx.id)}` +
          `&parent_id=${encodeURIComponent(dirId)}&pass_code_token=${encodeURIComponent(ctx.passToken || '')}` +
          '&limit=100&page_token=&thumbnail_size=SIZE_SMALL'
        : `https://api-pan.xunlei.com/drive/v1/share?share_id=${encodeURIComponent(ctx.id)}` +
          `&pass_code=${encodeURIComponent(ctx.pwd || '')}&limit=100&page_token=&thumbnail_size=SIZE_SMALL`;
      const res = await gmRequest({ url, headers: this._h(tk, ctx) });
      const j = parseJSON(res, '迅雷分享解析失败');
      if (j && j.error) {
        const msg = j.error_description || j.error;
        if (j.error === 'captcha_invalid') {
          delete xlCaptcha[action];
          throw new Error('迅雷验证码已失效，请点重试');
        }
        if (/share.*(not found|expired)|分享.*(不存在|过期)/i.test(msg)) {
          throw new Error('分享不存在或已失效');
        }
        throw new Error(`迅雷返回：${msg}`);
      }
      const data = j.data || j;
      const status = data.share_status;
      if (status === 'PASS_CODE_NEED') throw new Error('该分享需要提取码，请在链接后加 ?pwd=xxxx 再试');
      if (status === 'PASS_CODE_ERROR') throw new Error('提取码不正确');
      if (status === 'PASS_CODE_EMPTY') throw new Error('请先填写提取码');
      if (data.pass_code_token) ctx.passToken = data.pass_code_token;
      if (data.title && !ctx.title) ctx.title = data.title;
      const files = data.files || [];
      const dirs = files.filter((f) => f.kind === 'drive#folder')
        .map((f) => ({ fid: String(f.id), name: f.name || '未命名', size: 0, dir: true, token: '' }));
      const plain = files.filter((f) => f.kind !== 'drive#folder')
        .map((f) => ({ fid: String(f.id), name: f.name || '未命名', size: Number(f.size || 0), dir: false, token: '' }));
      return dirs.concat(plain);
    },

    async link(ctx, file) {
      if (!ctx.token) throw new Error('迅雷取链需要登录：请先在 pan.xunlei.com 登录账号');
      const tk = await xlToken('POST:/drive/v1/share/restore');
      const res = await gmRequest({
        method: 'POST',
        url: 'https://api-pan.xunlei.com/drive/v1/share/restore',
        headers: Object.assign(this._h(tk, ctx), { 'Content-Type': 'application/json' }),
        data: JSON.stringify({
          share_id: ctx.id,
          pass_code_token: ctx.passToken || '',
          parent_id: '',
          ancestor_ids: [],
          file_ids: [file.fid],
          specify_parent_id: false
        })
      });
      const j = parseJSON(res, '迅雷转存失败');
      const trace = (((j.data || {}).params) || {}).trace_file_ids || '';
      let newId = '';
      try {
        const map = JSON.parse(trace);
        newId = map[file.fid] || '';
      } catch (e) { /* ignore */ }
      if (!newId) throw new Error('迅雷转存未返回文件（可能空间不足）');

      const tk2 = await xlToken(`GET:/drive/v1/files/${newId}`);
      const r2 = await gmRequest({
        url: `https://api-pan.xunlei.com/drive/v1/files/${newId}?_magic=2021&usage=PLAY` +
          '&thumbnail_size=SIZE_LARGE&with=hdr10&with=subtitle_files',
        headers: this._h(tk2, ctx)
      });
      const j2 = parseJSON(r2, '获取迅雷直链失败');
      const d = j2.data || j2;
      const url = ((d.links || {})['application/octet-stream'] || {}).url || d.web_content_link || '';
      if (!url) throw new Error('迅雷未返回直链');
      return {
        url,
        headers: { 'User-Agent': XL_UA, 'Referer': 'https://pan.xunlei.com/' },
        guest: false,
        filename: file.name,
        size: Number(d.size || file.size || 0)
      };
    }
  };

  /* =======================================================================
   * 阿里云盘：匿名 share_token 列目录，取链需登录后的 access_token
   * ===================================================================== */
  const ALI_BASE = 'https://api.aliyundrive.com';

  function aliToken() {
    try {
      const direct = ['token', '__token'];
      for (const k of direct) {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        const j = JSON.parse(raw);
        if (j && (j.access_token || j.accessToken)) return j.access_token || j.accessToken;
      }
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i) || '';
        if (!/token/i.test(k)) continue;
        const raw = localStorage.getItem(k) || '';
        if (raw.indexOf('access_token') < 0) continue;
        const j = JSON.parse(raw);
        if (j && j.access_token) return j.access_token;
      }
    } catch (e) { /* ignore */ }
    return '';
  }

  const aliyun = {
    id: 'aliyun',
    name: '阿里云盘',
    color: '#6a4bff',
    logo: '阿里',
    hosts: ['www.alipan.com', 'www.aliyundrive.com'],
    cookieUrl: 'https://www.alipan.com',
    guestLabel: '游客',
    guestHint: '取链需登录阿里云盘',

    pick(url) {
      if (!/ali(?:pan|yundrive)\.com/i.test(url)) return null;
      const m = url.match(/ali(?:pan|yundrive)\.com\/s\/([A-Za-z0-9]+)/i);
      if (!m) return null;
      const pwd = (url.match(/[?&#](?:pwd|password|share_pwd)=([A-Za-z0-9]{4})/i) || [])[1] || '';
      return { id: m[1], pwd };
    },

    async _post(ctx, path, body, extra) {
      const headers = { 'Content-Type': 'application/json;charset=UTF-8' };
      if (ctx.shareToken) headers['x-share-token'] = ctx.shareToken;
      if (ctx.token) headers.Authorization = `Bearer ${ctx.token}`;
      const res = await gmRequest({
        method: 'POST', url: ALI_BASE + path,
        headers: Object.assign(headers, extra || {}),
        data: JSON.stringify(body)
      });
      let j = null;
      try { j = JSON.parse((res && res.responseText) || '{}'); } catch (e) { j = null; }
      if (!j) throw new Error(`阿里云盘返回异常（HTTP ${(res && res.status) || '?'}）`);
      if (j.code) {
        if (/ShareLink/i.test(j.code)) throw new Error('分享不存在或已失效');
        if (/AccessToken/i.test(j.code)) throw new Error('阿里云盘取链需要登录：请先在 alipan.com 登录账号');
        if (/SharePwd|pwd/i.test(j.code)) throw new Error('提取码不正确，请检查后重试');
        throw new Error(j.message || j.code);
      }
      return j;
    },

    async init(ctx) {
      ctx.token = aliToken();
      ctx.logged = !!ctx.token;
      ctx.shareToken = '';
      const info = await this._post(ctx, '/adrive/v3/share_link/get_share_by_anonymous', { share_id: ctx.id });
      ctx.title = info.share_name || info.share_title || '';
      const needPwd = !!info.has_pwd;
      if (needPwd && !ctx.pwd) throw new Error('该分享需要提取码，请在链接后加 ?pwd=xxxx 再试');
      const tk = await this._post(ctx, '/v2/share_link/get_share_token', {
        share_id: ctx.id, share_pwd: ctx.pwd || ''
      });
      if (!tk.share_token) throw new Error('获取阿里分享凭证失败（提取码可能不对）');
      ctx.shareToken = tk.share_token;
    },

    async list(ctx, dirId) {
      const parent = !dirId || dirId === '0' ? 'root' : dirId;
      const j = await this._post(ctx, '/adrive/v3/file/list', {
        share_id: ctx.id,
        parent_file_id: parent,
        limit: 100,
        order_by: 'name',
        order_direction: 'ASC',
        fields: '*'
      });
      return (j.items || []).map((it) => ({
        fid: String(it.file_id),
        name: it.name || '未命名',
        size: Number(it.size || 0),
        dir: it.type === 'folder',
        token: String(it.drive_id || '')
      }));
    },

    async link(ctx, file) {
      if (!ctx.token) throw new Error('阿里云盘取链需要登录：请先在 alipan.com 登录账号');
      const j = await this._post(ctx, '/v2/file/get_download_url', {
        drive_id: file.token || '',
        file_id: file.fid,
        expire_sec: 14400
      });
      if (!j.url) throw new Error('阿里未返回直链');
      return {
        url: j.url,
        headers: { 'Referer': 'https://www.alipan.com/' },
        guest: false,
        filename: file.name,
        size: Number(file.size || 0)
      };
    }
  };

  /* ---------------- 城通网盘 ---------------- */

  const CT_API = 'https://urlapi.ctfile.com';

  function ctHeaders() {
    return {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Origin': 'https://www.ctfile.com',
      'Referer': 'https://www.ctfile.com/',
      'Accept': 'application/json, text/plain, */*'
    };
  }

  const ctHex = {
    toBytes(h) {
      const s = String(h || '');
      const a = new Uint8Array(s.length >> 1);
      for (let i = 0; i < a.length; i++) a[i] = parseInt(s.substr(i * 2, 2), 16);
      return a;
    },
    from(b) {
      let s = '';
      for (let i = 0; i < b.length; i++) s += (b[i] < 16 ? '0' : '') + b[i].toString(16);
      return s;
    }
  };

  /**
   * 城通的人机验证是 ALTCHA 的 PBKDF2 变体（不是图形验证码）：
   *   derivedKey = PBKDF2-HMAC-SHA256(
   *       password = hexToBytes(nonce) || uint32_be(counter),
   *       salt     = hexToBytes(salt),
   *       iterations = cost, dkLen = keyLength)
   *   命中条件：hex(derivedKey).startsWith(keyPrefix)
   * counter 从 0 递增。实测 2779 次命中、耗时约 0.5s（批量并发 deriveBits）。
   * 已用 Python 独立复现，result 与浏览器 solution 逐字节一致。
   */
  async function ctSolveAltcha(challenge) {
    const p = (challenge && challenge.parameters) || {};
    if (String(p.algorithm || '').indexOf('PBKDF2/') !== 0) {
      throw new Error('城通验证算法已变更（' + (p.algorithm || '未知') + '），需要更新脚本');
    }
    if (!(self.crypto && crypto.subtle)) {
      throw new Error('当前环境不支持 WebCrypto，城通验证无法完成（请用 https 页面）');
    }
    const nonce = ctHex.toBytes(p.nonce);
    const salt = ctHex.toBytes(p.salt);
    const prefix = String(p.keyPrefix || '').toLowerCase();
    const cost = Number(p.cost) || 1200;
    const klen = Number(p.keyLength) || 32;
    if (!prefix) throw new Error('城通验证参数缺失');

    const t0 = Date.now();
    const BATCH = 64;
    const LIMIT = 400000;
    for (let base = 0; base < LIMIT; base += BATCH) {
      const jobs = [];
      for (let i = 0; i < BATCH; i++) {
        const c = base + i;
        const pwd = new Uint8Array(nonce.length + 4);
        pwd.set(nonce, 0);
        new DataView(pwd.buffer).setUint32(nonce.length, c, false);
        jobs.push((async () => {
          const key = await crypto.subtle.importKey('raw', pwd, { name: 'PBKDF2' }, false, ['deriveBits']);
          const bits = await crypto.subtle.deriveBits(
            { name: 'PBKDF2', salt: salt, iterations: cost, hash: 'SHA-256' }, key, klen * 8
          );
          return [c, ctHex.from(new Uint8Array(bits))];
        })());
      }
      const rs = await Promise.all(jobs);
      for (let i = 0; i < rs.length; i++) {
        if (rs[i][1].indexOf(prefix) === 0) {
          return { counter: rs[i][0], derivedKey: rs[i][1], time: Date.now() - t0 };
        }
      }
    }
    throw new Error('城通验证超时（已尝试 40 万次），请重试');
  }

  const ctfile = {
    id: 'ctfile',
    name: '城通网盘',
    color: '#1a8fe3',
    logo: '城通',
    hosts: ['www.ctfile.com', 'url95.ctfile.com'],
    cookieUrl: 'https://www.ctfile.com',
    guestLabel: '游客',
    guestHint: '游客可取链，免费通道限速 30KB/s（脚本多连接加速）',
    maxThreads: 4,          // 城通 CDN 对单 IP 有并发/流量限制，实测 4 路最稳（8 路易 503）

    pick(url) {
      const m = String(url).match(/(?:ctfile\.com|ctfile\.net|545c\.com)\/(f|file|d)\/([0-9]+-[0-9]+(?:-[0-9a-f]+)?)/i);
      if (!m) return null;
      const pwd = (String(url).match(/[?&](?:p|passcode|pwd)=([A-Za-z0-9]+)/) || [])[1] || '';
      return { id: m[2], pwd };
    },

    async init(ctx) {
      // 1. 取 ALTCHA challenge（每次解析都要新的，token 一次性）
      const cr = await gmRequest({
        url: `${CT_API}/api/v2/captcha/altcha?captcha_action=share_passcode`,
        headers: ctHeaders()
      });
      const cj = parseJSON(cr, '获取城通验证失败');
      if (!cj || !cj.parameters) throw new Error('城通验证接口返回异常');

      // 2. 本地解 PoW
      const sol = await ctSolveAltcha(cj);
      ctx.altchaToken = bytesToB64(new TextEncoder().encode(JSON.stringify({ challenge: cj, solution: sol })));

      // 3. 用 token 换文件信息
      const qs = new URLSearchParams({
        kind: 'file', id: ctx.id, folder_id: '0', fk: '',
        passcode: ctx.pwd || '', type_id: '0', altcha_token: ctx.altchaToken
      });
      const res = await gmRequest({ url: `${CT_API}/api/v2/resource?${qs.toString()}`, headers: ctHeaders() });
      const j = parseJSON(res, '获取城通文件信息失败');
      const code = Number(j.code);
      if (code !== 200) {
        const msg = String(j.msg || '');
        if (code === 423 && /passcode/i.test(msg)) {
          throw new Error(ctx.pwd ? '提取码不正确，请检查后重试' : '该分享需要提取码，请在链接后加 ?p=xxxx 再试');
        }
        if (code === 423) throw new Error('城通人机验证未通过，请重试');
        if (code === 404) throw new Error('文件不存在或已被删除');
        throw new Error(msg || `城通返回错误（${code}）`);
      }
      const d = j.data || {};
      const f = d.file || {};
      ctx.file = f;
      ctx.accessPass = d.access_pass || '';
      ctx.title = f.file_name || '';
      ctx.logged = false;
    },

    async list(ctx) {
      const f = ctx.file || {};
      if (!f.file_id) throw new Error('没有读到文件信息');
      return [{
        fid: String(ctx.id),
        name: f.file_name || '未命名',
        size: Number(f.file_size_bytes || 0),
        dir: false,
        token: ''
      }];
    },

    async link(ctx, file) {
      const f = ctx.file || {};
      // verifycode / file_chk 是 resource 那一次响应里下发的，会随请求变化，
      // 必须原样带回来，否则服务端报 "Download signature is invalid"
      const body = {
        context: {
          kind: 'file', id: ctx.id, folder_id: '0', fk: '',
          passcode: ctx.pwd || '', type_id: '0', access_pass: ctx.accessPass || ''
        },
        app: false,
        verifycode: f.verifycode || '',
        original_file: {
          file_id: f.file_id,
          userid: f.userid,
          file_chk: f.file_chk || '',
          start_time: f.start_time,
          wait_seconds: f.wait_seconds
        },
        carrier: 0
      };
      const headers = ctHeaders();
      headers['Content-Type'] = 'application/json;charset=UTF-8';
      const res = await gmRequest({
        method: 'POST',
        url: `${CT_API}/api/v2/download`,
        headers,
        data: JSON.stringify(body)
      });
      const j = parseJSON(res, '城通取链失败');
      if (Number(j.code) !== 200) {
        if (Number(j.code) === 423) throw new Error('城通验证已过期，请重新解析');
        throw new Error(j.msg || '城通取链失败');
      }
      const d = j.data || {};
      if (!d.downurl) throw new Error('城通未返回直链');
      return {
        url: d.downurl,
        headers: { 'Referer': 'https://url95.ctfile.com/' },
        guest: true,
        filename: d.file_name || file.name,
        size: Number(d.file_size || file.size || 0),
        note: '免费通道单连接限速 30KB/s，脚本按多连接分片下载；直链绑定你的 IP，勿外传'
      };
    }
  };

  const PLATFORMS = [quark, uc, pan123, p115, tianyi, c139, baidu, xunlei, aliyun, ctfile];

  function detectPlatform(url) {
    for (const p of PLATFORMS) {
      if (p.pick(url)) return p;
    }
    return null;
  }

  /* =======================================================================
   * 5. 业务状态
   * ===================================================================== */

  const state = {
    mounted: false,
    host: null,         // 自己创建的 shadow host，用来识别并清掉重复实例
    open: false,
    platform: null,
    ctx: null,
    stack: [],          // [{id, name}]
    items: [],
    selected: new Set(),
    links: new Map(),   // fid -> {url, headers, guest}
    busy: new Set(),
    loading: false,
    error: '',
    filter: '',
    shareUrl: '',
    navLock: false,     // 用户在面板里手动进过目录后，不再跟随页面的目录变化
    selFromPage: false, // 当前选中是否来自页面勾选同步
    pageSelDirty: false, // 用户在面板里手动改过选择，别再被页面同步覆盖
    more: null,         // {fid, x, y}
    settingsOpen: false
  };

  function resetShare() {
    state.platform = null;
    state.ctx = null;
    state.stack = [];
    state.items = [];
    state.selected.clear();
    state.links.clear();
    state.busy.clear();
    state.error = '';
    state.filter = '';
    state.shareUrl = '';
  }

  async function parseShare(rawUrl, pwdOverride) {
    const url = String(rawUrl || '').trim();
    if (!url) {
      state.error = '请先粘贴分享链接';
      state.loading = false;
      render();
      return;
    }
    const platform = detectPlatform(url);
    if (!platform) {
      state.error = `暂不支持这个链接：目前支持 ${PLATFORMS.map((x) => x.name).join(' / ')}`;
      state.loading = false;
      render();
      return;
    }
    const picked = platform.pick(url);
    if (!picked) {
      state.error = '这个页面不是分享页，请打开具体的分享链接';
      state.loading = false;
      render();
      return;
    }
    if (platform.needGM && !HAS_GM_XHR && !preferPageFetch('https://' + platform.hosts[0] + '/')) {
      state.error = `${platform.name} 需要电脑端油猴环境（要自定义 UA 与 Referer），手机浏览器直连取不到直链`;
      state.loading = false;
      render();
      return;
    }
    if (!picked.pwd && pwdOverride) picked.pwd = String(pwdOverride).trim();
    if (!picked.pwd) {
      const m = url.match(/(?:提取码|访问码|密码|口令)\s*[：:]?\s*([A-Za-z0-9]{4,8})(?![A-Za-z0-9])/);
      if (m) picked.pwd = m[1];
    }

    resetShare();
    state.platform = platform;
    state.shareUrl = url;
    state.ctx = { id: picked.id, pwd: picked.pwd || '', title: '', stoken: '', cookie: '', guestCookie: '', logged: false };
    state.loading = true;
    state.error = '';
    render();

    try {
      await platform.init(state.ctx);
      state.items = await platform.list(state.ctx, '0');
      state.stack = [{ id: '0', name: '根目录' }];
    } catch (e) {
      state.error = e && e.message ? e.message : '解析失败';
      state.items = [];
    } finally {
      state.loading = false;
      render();
    }
  }

  // 一键授权百度：打开授权页（脚本自动点允许）→ 回写 token → 重解析
  async function doBaiduAuth() {
    try {
      // 已有令牌先校验，有效就不打扰用户重走授权
      if (baidu.token()) {
        const me = await baidu.verifyToken();
        if (me) {
          toastRootPush(`已授权：${me.netdisk_name || me.baidu_name || '百度网盘'}，正在重新解析…`);
          state.links.clear();
          if (state.shareUrl) await parseShare(state.shareUrl);
          else render();
          return;
        }
        toastRootPush('旧令牌已失效，重新授权中…', 'warn');
      } else {
        toastRootPush('正在打开百度授权页，请在弹出的页面确认「允许」…');
      }
      const t = await baidu.authorize();
      if (!t) throw new Error('没有拿到令牌，请重试');
      const me = await baidu.verifyToken();
      if (!me) {
        toastRootPush('拿到令牌但校验未通过，请重试一次授权', 'warn');
      } else {
        toastRootPush(`授权成功：${me.netdisk_name || me.baidu_name || '已授权'}，正在重新解析…`);
      }
      state.links.clear();
      if (state.shareUrl) await parseShare(state.shareUrl);
      else render();
    } catch (e) {
      toastRootPush(e.message || '授权失败', 'err');
    }
  }

  async function enterDir(item) {
    if (!state.platform || !state.ctx) return;
    state.navLock = true;   // 用户自己在面板里导航了，别再被页面目录拉走
    state.pageSelDirty = false;
    state.loading = true;
    state.error = '';
    render();
    try {
      const list = await state.platform.list(state.ctx, item.fid);
      state.items = list;
      state.stack.push({ id: item.fid, name: item.name });
      state.selected.clear();
    } catch (e) {
      state.error = e && e.message ? e.message : '打开文件夹失败';
    } finally {
      state.loading = false;
      render();
    }
  }

  async function backDir() {
    if (state.stack.length <= 1) return;
    state.navLock = true;
    state.pageSelDirty = false;
    state.stack.pop();
    const top = state.stack[state.stack.length - 1];
    state.loading = true;
    state.error = '';
    render();
    try {
      state.items = await state.platform.list(state.ctx, top.id);
      state.selected.clear();
    } catch (e) {
      state.error = e && e.message ? e.message : '返回失败';
    } finally {
      state.loading = false;
      render();
    }
  }

  async function resolveLink(item, force) {
    if (!force && state.links.has(item.fid)) return state.links.get(item.fid);
    if (state.busy.has(item.fid)) {
      // 已在取链，等它完成
      for (let i = 0; i < 60; i++) {
        await sleep(200);
        if (state.links.has(item.fid)) return state.links.get(item.fid);
        if (!state.busy.has(item.fid)) break;
      }
    }
    state.busy.add(item.fid);
    renderRowState(item.fid);
    try {
      const link = await state.platform.link(state.ctx, item);
      state.links.set(item.fid, link);
      return link;
    } finally {
      state.busy.delete(item.fid);
      renderRowState(item.fid);
    }
  }

  function buildAria2(link, name) {
    const hs = Object.entries(link.headers || {})
      .map(([k, v]) => ` --header="${k}: ${v}"`).join('');
    return `aria2c -c -x16 -s16 -k1M${hs} -o "${name}" "${link.url}"`;
  }

  function buildCurl(link, name) {
    const hs = Object.entries(link.headers || {})
      .map(([k, v]) => ` -H "${k}: ${v}"`).join('');
    return `curl -L -C -${hs} -o "${name}" "${link.url}"`;
  }

  function buildPayload(link, name) {
    if (settings.copyMode === 'aria2') return buildAria2(link, name);
    if (settings.copyMode === 'curl') return buildCurl(link, name);
    if (settings.copyMode === 'idm') return buildIDM(link, name);
    return link.url;
  }

  async function doCopy(item) {
    try {
      const link = await resolveLink(item);
      const text = buildPayload(link, item.name);
      const ok = copyText(text);
      const what = { link: '直链', aria2: ' Aria2 命令', curl: ' cURL 命令', idm: ' IDM 命令' }[settings.copyMode] || '直链';
      if (!ok) { toastRootPush('复制失败，请检查浏览器权限', 'err'); return; }
      // 游客链带 __pugs 才能过 CDN 校验：浏览器同域可用，外部下载器必须显式带 Cookie
      const needsCookie = !!(link.headers && link.headers.Cookie);
      if (needsCookie && settings.copyMode === 'idm') {
        toastRootPush('已复制 IDM 命令，但游客链需 __pugs Cookie，IDM 会 412 —— 请改用「Aria2 命令」', 'warn');
      } else if (needsCookie && settings.copyMode === 'link') {
        toastRootPush('已复制直链（游客链已种 Cookie，浏览器打开可用；外部下载器请用 Aria2 命令）', 'warn');
      } else {
        toastRootPush(`已复制${what}`, 'ok');
      }
    } catch (e) {
      toastRootPush(e.message || '取链失败', 'err');
    }
  }

  function buildIDM(link, name) {
    return `idman.exe /d "${link.url}" /f "${name}" /p "%USERPROFILE%\\Downloads" /q`;
  }

  // 移动端直接交给浏览器下载器：文件进系统「下载」，跟自己点链接一样
  function triggerDownload(url, name) {
    try {
      const a = document.createElement('a');
      a.href = url;
      if (name) a.download = name;
      a.rel = 'noopener';
      a.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => a.remove(), 1500);
      return true;
    } catch (e) { return false; }
  }

  // 浏览器直接打开：桌面先占标签页，避免 await 后被弹窗拦截
  async function openInTab(item) {
    let tab = null;
    if (!IS_MOBILE) {
      try { tab = window.open('about:blank', '_blank'); } catch (e) { tab = null; }
    }
    let link;
    try {
      link = await resolveLink(item);
    } catch (e) {
      if (tab) tab.close();
      toastRootPush(e.message || '取链失败', 'err');
      return;
    }
    const needHeader = link.guest || !!link.headers.Cookie;
    const domain = state.platform.id === 'quark' ? 'quark.cn' : (state.platform.id === 'uc' ? 'uc.cn' : '');
    if (needHeader && link.headers.Cookie && domain) {
      plantCookie(link.headers.Cookie, domain);
    }

    if (IS_MOBILE) {
      // 手机上新开标签大多被拦，直接触发下载更像原生行为
      triggerDownload(link.url, item.name);
      toastRootPush('已交给浏览器下载，进度看系统「下载」列表', 'ok');
      return;
    }

    if (needHeader && link.headers.Cookie && domain) {
      toastRootPush('已打开直链；若出现 412/403，请改用「⋯ → 复制 IDM 命令 / Aria2 命令」', 'warn');
    }
    if (tab && !tab.closed) tab.location.href = link.url;
    else window.open(link.url, '_blank', 'noopener');
  }

  // 不能分片时的降级：小文件走内存代下，大文件提示改用外部下载器（避免被弹窗拦截）
  async function fallbackDownload(item, link, reason) {
    if (link && link.size > 0 && link.size <= BLOB_LIMIT) {
      toastRootPush(`${reason}，改用单连接代下`, 'warn');
      await blobDownload(item, link);
      return;
    }
    toastRootPush(`${reason}；请用「⋯ → 复制 IDM / Aria2 命令」交给下载器`, 'warn', 6000);
  }

  async function doDownload(item) {
    const fid = String(item.fid);
    const t = DL.get(fid);


    if (t && t.status === 'run') { DL.pause(fid); return; }
    if (t && (t.status === 'pause' || t.status === 'err')) { await DL.resume(item); return; }
    if (t && t.status === 'done') {
      // 下完再点一次 = 重新下一份
      DL.tasks.delete(fid);
      renderRowState(fid);
    }

    // auto：手机 / 没有 GM_xmlhttpRequest 的环境直接交给浏览器下载器，
    // 这样文件会出现在系统「下载」里，跟自己点链接下载完全一样；
    // 桌面油猴环境才用分片引擎（能暂停续传、能看到速度）
    const autoBrowser = IS_MOBILE || !HAS_GM_XHR;
    // 百度 / 迅雷的直链校验 Cookie 与 UA，分片 fetch 改不了 UA 会 403。
    // 但百度拿到 access_token 后可以走 GM 通道改 UA（pan.baidu.com），
    // 这时分片引擎反而更稳：能续传、能多线程，还绕开 50MB 的浏览器 403。
    const baiduTokenMode = !!(state.platform && state.platform.id === 'baidu' &&
      state.platform.hasToken && state.platform.hasToken());
    const forceBrowser = !!(state.platform && state.platform.forceBrowser) && !baiduTokenMode;
    const mode = settings.downloadMode === 'auto'
      ? ((autoBrowser || forceBrowser) ? 'browser' : 'engine')
      : settings.downloadMode;
    if (mode === 'browser') { await openInTab(item); return; }
    if (mode === 'blob') {
      try {
        const link = await resolveLink(item);
        await blobDownload(item, link);
      } catch (e) {
        toastRootPush(e.message || '取链失败', 'err');
      }
      return;
    }
    // auto / engine：先试分片；拿不到 Range 时 DL.start 内部会降级并提示
    await DL.start(item);
  }

  async function blobDownload(item, link) {
    toastRootPush(`开始下载 ${item.name}（脚本代下，最多 ${fmtSize(BLOB_LIMIT)}）`);
    try {
      const blob = await gmRequest({
        url: link.url,
        headers: link.headers,
        responseType: 'blob',
        timeout: 0,
        onprogress: (e) => {
          if (e && e.total) {
            const pct = Math.min(99, Math.round((e.loaded / e.total) * 100));
            updateProgress(item.fid, pct);
          }
        }
      }).then((r) => r.response);

      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = item.name || 'download';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 15000);
      updateProgress(item.fid, 100);
      toastRootPush('下载完成，已交给浏览器保存', 'ok');
    } catch (e) {
      toastRootPush('代下失败：' + (e.message || '未知错误'), 'err');
    }
  }

  /* =======================================================================
   * 4.5 多线程分片下载引擎（OPFS 缓存 + 断点续传）
   *
   * 思路与 IDM / aria2 一致：
   *   探测 Range → 按块切成 N 片 → N 个并发连接各取一片 → 写进本地缓存文件
   *   每片完成即落盘，因此暂停/刷新页面后可以只补缺失的片，不用从头再来。
   * 落盘用 OPFS（navigator.storage.getDirectory），支持随机 offset 写入，
   * 不占内存、也不需要用户选保存位置；下完再交给浏览器另存。
   * ===================================================================== */

  const OPFS_DIR = 'yunx-dl';
  const TASK_KEY = 'yx_tasks';
  const MAX_TASKS_KEEP = 20;

  function fmtSpeed(bps) {
    if (!bps || !isFinite(bps) || bps <= 0) return '';
    if (bps >= 1048576) return (bps / 1048576).toFixed(1) + 'MB/s';
    if (bps >= 1024) return Math.round(bps / 1024) + 'KB/s';
    return Math.round(bps) + 'B/s';
  }

  function fmtEta(sec) {
    if (!isFinite(sec) || sec <= 0) return '';
    if (sec < 60) return Math.round(sec) + ' 秒';
    if (sec < 3600) return Math.floor(sec / 60) + ' 分 ' + Math.round(sec % 60) + ' 秒';
    return Math.floor(sec / 3600) + ' 时 ' + Math.round((sec % 3600) / 60) + ' 分';
  }

  // 可中止的 GM 请求（gmRequest 没有暴露 abort）
  function gmRaw(opt) {
    let handle = null;
    let aborted = false;
    // 百度直链必须由 GM 通道发出，才能带上 UA「pan.baidu.com」；
    // 走页面 fetch 会被 CORS 拦，且 UA 固定为浏览器标识（>50MB 直接 403）。
    const wantBaiduUA = /^pan\.baidu\.com$/i.test(String((opt.headers || {})['User-Agent'] || ''));
    const promise = new Promise((resolve, reject) => {
      try {
        handle = httpRequest({
          method: opt.method || 'GET',
          url: opt.url,
          headers: opt.headers || {},
          forceGM: wantBaiduUA,
          timeout: opt.timeout === 0 ? 0 : (opt.timeout || 0),
          responseType: opt.responseType || 'arraybuffer',
          onprogress: (e) => { if (opt.onprogress) opt.onprogress(e); },
          onload: (r) => { if (!aborted) resolve(r); },
          onerror: () => { if (!aborted) reject(Object.assign(new Error('网络错误'), { net: true })); },
          ontimeout: () => { if (!aborted) reject(Object.assign(new Error('请求超时'), { net: true })); },
          onabort: () => { reject(Object.assign(new Error('已中止'), { aborted: true })); }
        });
      } catch (e) {
        reject(e);
      }
    });
    return {
      promise,
      abort() {
        aborted = true;
        try { handle && handle.abort(); } catch (e) { /* ignore */ }
      }
    };
  }

  const DL = {
    tasks: new Map(),
    _dir: null,
    _saveTimer: null,

    get(fid) { return this.tasks.get(String(fid)) || null; },

    async dir() {
      if (this._dir) return this._dir;
      if (!navigator.storage || !navigator.storage.getDirectory) return null;
      const root = await navigator.storage.getDirectory();
      this._dir = await root.getDirectoryHandle(OPFS_DIR, { create: true });
      return this._dir;
    },

    async handle(fid) {
      const dir = await this.dir();
      if (!dir) return null;
      return dir.getFileHandle('dl_' + fid, { create: true });
    },

    async removeCache(fid) {
      try {
        const dir = await this.dir();
        if (dir) await dir.removeEntry('dl_' + fid);
      } catch (e) { /* 文件不存在就算了 */ }
    },

    /**
     * 探测是否支持 Range。先 HEAD（不动数据），不行再退化到 1 字节 GET。
     * 1 字节 GET 带 4MB 保险：万一服务端无视 Range 直接吐全量，立刻掐断。
     */
    async probe(url, headers) {
      const base = Object.assign({}, headers);
      try {
        const r = await gmRaw({ url, headers: base, method: 'HEAD', responseType: 'text', timeout: 15000 });
        const res = await r.promise;
        const hs = String(res.responseHeaders || '').toLowerCase();
        const len = Number((hs.match(/content-length:\s*(\d+)/) || [])[1] || 0);
        const ranges = (hs.match(/accept-ranges:\s*([a-z]+)/) || [])[1] || '';
        if (len > 0 && ranges && ranges !== 'none') return { ok: true, total: len };
        if (len > 0 && ranges === 'none') return { ok: false, total: len };
      } catch (e) { /* HEAD 被拒，继续退化 */ }

      let tooBig = false;
      const ctl = gmRaw({
        url,
        headers: Object.assign({}, base, { Range: 'bytes=0-0' }),
        timeout: 20000,
        onprogress: (e) => {
          if (e && e.loaded > 4 * 1024 * 1024) { tooBig = true; ctl.abort(); }
        }
      });
      try {
        const res = await ctl.promise;
        const hs = String(res.responseHeaders || '');
        const cr = hs.match(/content-range:\s*bytes\s+\d+-\d+\/(\d+)/i);
        if (res.status === 206 && cr) return { ok: true, total: Number(cr[1]) };
        const cl = Number((hs.match(/content-length:\s*(\d+)/i) || [])[1] || 0);
        return { ok: false, total: cl };
      } catch (e) {
        return { ok: false, total: tooBig ? -1 : 0 };
      }
    },

    // 切片计划：块大小随文件大小自适应，块数控制在 3000 以内（存档时才不会太大）
    plan(size, threads) {
      const target = Math.ceil(size / Math.max(1, threads * 8));
      let chunk = Math.max(1 << 20, Math.min(16 << 20, target));
      chunk = Math.ceil(chunk / (1 << 20)) * (1 << 20);
      if (size / chunk > 3000) chunk = Math.ceil(size / 3000);
      const chunks = [];
      for (let s = 0; s < size; s += chunk) {
        chunks.push({ s, e: Math.min(size, s + chunk) - 1, done: false, got: 0, claim: false });
      }
      return { chunk, chunks };
    },

    async start(item) {
      const fid = String(item.fid);
      if (this.get(fid)) return null;

      const task = {
        fid, name: item.name || 'download', size: 0, url: '', headers: {},
        status: 'probe', chunks: [], chunkSize: 0, loaded: 0,
        aborters: new Set(), writer: null, handle: null,
        speed: 0, fails: 0, err: '', pumping: false
      };
      this.tasks.set(fid, task);
      renderRowState(fid);

      let link;
      try {
        link = await resolveLink(item);
      } catch (e) {
        this.tasks.delete(fid);
        renderRowState(fid);
        toastRootPush(e.message || '取链失败', 'err');
        return null;
      }

      task.url = link.url;
      task.headers = link.headers || {};
      task.size = Number(link.size || 0);

      const probe = await this.probe(task.url, task.headers);
      if (!probe.ok || !probe.total || probe.total < 0) {
        this.tasks.delete(fid);
        renderRowState(fid);
        await fallbackDownload(item, link, '这条直链不支持分片（没有 Range）');
        return null;
      }
      task.size = probe.total;

      try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) { /* ignore */ }
      // 部分平台的 CDN 对「同一会话并发连接数」有硬上限（城通 limit=2，超了直接 503）
      const cap = Math.max(1, Math.min(16, Number((state.platform && state.platform.maxThreads) || 16)));
      const threads = Math.max(1, Math.min(cap, Number(settings.threads) || 8));
      const p = this.plan(task.size, threads);
      task.chunkSize = p.chunk;
      task.chunks = p.chunks;

      try {
        task.handle = await this.handle(fid);
        task.writer = await task.handle.createWritable({ keepExistingData: true });
      } catch (e) {
        this.tasks.delete(fid);
        renderRowState(fid);
        await fallbackDownload(item, link, '无法写入本地缓存（浏览器存储配额不足）');
        return null;
      }

      task.status = 'run';
      renderRowState(fid);
      this.pump(task);
      this.ticker(task);
      this.scheduleSave();
      const n = task.chunks.length;
      toastRootPush(`开始分片下载：${threads} 连接 / ${n} 片（${fmtSize(task.size)}），可随时暂停`);
      return task;
    },

    async fetchChunk(task, c) {
      const len = c.e - c.s + 1;
      const ctl = gmRaw({
        url: task.url,
        headers: Object.assign({}, task.headers, { Range: `bytes=${c.s}-${c.e}` }),
        timeout: 0,
        onprogress: (e) => {
          const g = Math.min(Number(e.loaded || 0), len);
          task.loaded += g - (c.got || 0);
          c.got = g;
        }
      });
      task.aborters.add(ctl);
      let res;
      try {
        res = await ctl.promise;
      } finally {
        task.aborters.delete(ctl);
      }

      if (res.status !== 206) {
        throw new Error(`分片请求被拒绝（HTTP ${res.status}）`);
      }
      const buf = res.response;
      if (!buf || buf.byteLength !== len) {
        throw new Error('分片长度不符，服务端可能不支持 Range');
      }
      if (task.status !== 'run') throw Object.assign(new Error('已暂停'), { aborted: true });
      await task.writer.write({ type: 'write', position: c.s, data: buf });
    },

    activeCount() {
      let n = 0;
      for (const t of this.tasks.values()) if (t.status === 'run') n++;
      return n;
    },

    async pump(task) {
      if (task.pumping) return;
      task.pumping = true;
      // 同时下载多个文件时平分连接数，避免一口气铺开几十个连接被风控
      const running = Math.max(1, this.activeCount());
      const threads = Math.max(2, Math.min(16, Math.floor((Number(settings.threads) || 8) / running)));

      const worker = async () => {
        while (task.status === 'run') {
          const c = task.chunks.find((x) => !x.done && !x.claim);
          if (!c) return;
          c.claim = true;
          try {
            await this.fetchChunk(task, c);
            c.done = true;
            c.got = 0;
          } catch (e) {
            if (e && e.aborted) { c.claim = false; return; }
            c.claim = false;
            task.loaded -= c.got || 0;
            c.got = 0;
            task.fails = (task.fails || 0) + 1;
            if (task.fails > 8) {
              task.status = 'err';
              task.err = e.message || '下载失败';
              this.fail(task);
              return;
            }
            await sleep(500);
          }
        }
      };

      await Promise.all(Array.from({ length: threads }, worker));
      task.pumping = false;

      if (task.status === 'run' && task.chunks.every((c) => c.done)) {
        await this.finish(task);
      }
    },

    async finish(task) {
      task.status = 'done';
      if (task._tick) { clearInterval(task._tick); task._tick = null; }
      task.loaded = task.size;
      try { await task.writer.close(); } catch (e) { /* ignore */ }
      task.writer = null;

      try {
        const file = await task.handle.getFile();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(file);
        a.download = task.name;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 60000);
      } catch (e) {
        toastRootPush('缓存读取失败：' + (e.message || ''), 'err');
      }

      updateTaskUI(task);
      toastRootPush(`下载完成：${task.name}（${fmtSize(task.size)}）`, 'ok');
      this.forget(task.fid);
      setTimeout(() => {
        this.tasks.delete(task.fid);
        this.removeCache(task.fid);
        renderRowState(task.fid);
      }, 60000);
    },

    async fail(task) {
      if (task._tick) { clearInterval(task._tick); task._tick = null; }
      for (const a of Array.from(task.aborters)) a.abort();
      task.aborters.clear();
      try { task.writer && (await task.writer.close()); } catch (e) { /* ignore */ }
      task.writer = null;
      updateTaskUI(task);
      toastRootPush(`下载失败：${task.err || '未知错误'}（已保留进度，可点「继续」重试）`, 'err');
      this.scheduleSave();
    },

    pause(fid) {
      const t = this.get(fid);
      if (!t || t.status !== 'run') return;
      t.status = 'pause';
      for (const a of Array.from(t.aborters)) a.abort();
      t.aborters.clear();
      t.pumping = false;
      // 半截分片会作废，按已落盘的分片重算，显示的数字才是真实的续传起点
      let done = 0;
      for (const c of t.chunks) {
        if (c.done) done += c.e - c.s + 1;
        c.got = 0;
        c.claim = false;
      }
      t.loaded = done;
      if (t._tick) { clearInterval(t._tick); t._tick = null; }
      if (t.writer) {
        try { t.writer.close(); } catch (e) { /* ignore */ }
        t.writer = null;
      }
      updateTaskUI(t);
      this.scheduleSave();
      toastRootPush('已暂停，进度已写入本地缓存，点「继续」从断点接着下');
    },

    async resume(item) {
      const t = this.get(String(item.fid));
      if (!t || t.status === 'run') return;
      let link;
      try {
        link = await resolveLink(item, true);
      } catch (e) {
        toastRootPush(e.message || '取链失败', 'err');
        return;
      }
      t.url = link.url;
      t.headers = link.headers || {};
      try {
        t.handle = await this.handle(t.fid);
        const file = await t.handle.getFile();
        let maxEnd = 0;
        for (const c of t.chunks) if (c.done) maxEnd = Math.max(maxEnd, c.e + 1);
        if (file.size < maxEnd) {
          // 缓存被浏览器清掉了：已有分片清零，从头下，别拼出一个坏文件
          for (const c of t.chunks) { c.done = false; c.got = 0; c.claim = false; }
          t.loaded = 0;
          toastRootPush('本地缓存已失效，重新开始下载', 'warn');
        }
        t.writer = await t.handle.createWritable({ keepExistingData: true });
      } catch (e) {
        toastRootPush('恢复失败：' + (e.message || '无法写入缓存'), 'err');
        return;
      }
      t.status = 'run';
      t.fails = 0;
      t.err = '';
      renderRowState(t.fid);
      this.pump(t);
      this.ticker(t);
      toastRootPush('继续下载');
    },

    async cancel(fid) {
      const t = this.get(fid);
      if (!t) return;
      t.status = 'cancel';
      for (const a of Array.from(t.aborters)) a.abort();
      t.aborters.clear();
      if (t._tick) clearInterval(t._tick);
      try { t.writer && (await t.writer.close()); } catch (e) { /* ignore */ }
      this.tasks.delete(fid);
      this.forget(fid);
      await this.removeCache(fid);
      renderRowState(fid);
      toastRootPush('已取消，本地缓存已清理');
    },

    ticker(task) {
      if (task._tick) clearInterval(task._tick);
      let last = task.loaded;
      let lastT = Date.now();
      task._tick = setInterval(() => {
        const now = Date.now();
        const dt = (now - lastT) / 1000;
        if (dt > 0.2) {
          const sp = Math.max(0, (task.loaded - last) / dt);
          task.speed = task.speed > 0 ? task.speed * 0.55 + sp * 0.45 : sp;
          last = task.loaded;
          lastT = now;
        }
        updateTaskUI(task);
        if (now - (task._saved || 0) > 4000) {
          task._saved = now;
          this.scheduleSave();
        }
      }, 500);
    },

    scheduleSave() {
      clearTimeout(this._saveTimer);
      this._saveTimer = setTimeout(() => this.save(), 1200);
    },

    save() {
      const out = [];
      for (const t of this.tasks.values()) {
        if (!t.size || !t.chunks.length) continue;
        if (t.status === 'done' || t.status === 'cancel') continue;
        out.push({
          fid: t.fid,
          name: t.name,
          size: t.size,
          chunkSize: t.chunkSize,
          bits: t.chunks.map((c) => (c.done ? '1' : '0')).join(''),
          loaded: t.loaded,
          status: t.status === 'run' ? 'pause' : t.status,
          ts: Date.now()
        });
      }
      try {
        GMStore.set(TASK_KEY, out.slice(0, MAX_TASKS_KEEP));
      } catch (e) { /* ignore */ }
    },

    forget(fid) {
      try {
        const arr = (GMStore.get(TASK_KEY, []) || []).filter((x) => String(x.fid) !== String(fid));
        GMStore.set(TASK_KEY, arr);
      } catch (e) { /* ignore */ }
    },

    restore() {
      let arr = [];
      try { arr = GMStore.get(TASK_KEY, []) || []; } catch (e) { arr = []; }
      for (const rec of arr) {
        if (!rec || !rec.size || !rec.chunkSize || !rec.bits) continue;
        if (rec.status === 'done' || rec.status === 'cancel') continue;
        const chunks = [];
        let loaded = 0;
        for (let i = 0; i < rec.bits.length; i++) {
          const s = i * rec.chunkSize;
          const e = Math.min(rec.size, s + rec.chunkSize) - 1;
          const done = rec.bits[i] === '1';
          if (done) loaded += e - s + 1;
          chunks.push({ s, e, done, got: 0, claim: false });
        }
        if (!chunks.some((c) => !c.done)) continue;
        this.tasks.set(String(rec.fid), {
          fid: String(rec.fid),
          name: rec.name,
          size: rec.size,
          chunkSize: rec.chunkSize,
          chunks,
          loaded,
          status: 'pause',
          url: '',
          headers: {},
          aborters: new Set(),
          writer: null,
          handle: null,
          speed: 0,
          fails: 0,
          err: '',
          pumping: false,
          restored: true
        });
      }
    }
  };

  function taskPct(task) {
    if (!task || !task.size) return 0;
    return Math.min(100, (task.loaded / task.size) * 100);
  }

  function taskSZHTML(task) {
    const pct = taskPct(task);
    const txt = task.status === 'done' ? '已完成'
      : task.status === 'err' ? '失败 · 点继续'
        : task.status === 'pause' ? `已暂停 ${pct.toFixed(0)}%`
          : `${pct.toFixed(0)}%${task.size >= 1048576 ? ' · ' + (fmtSpeed(task.speed) || '…') : ''}`;
    const cls = task.status === 'pause' ? ' pause' : (task.status === 'err' ? ' err' : '');
    return `<div class="pbar${cls}"><i style="width:${pct.toFixed(1)}%"></i></div><div class="ptxt">${esc(txt)}</div>`;
  }

  function updateTaskUI(task) {
    const root = getRoot();
    if (!root) return;
    const row = root.querySelector(`.row[data-fid="${window.CSS.escape(task.fid)}"]`);
    if (!row) return;
    const sz = row.querySelector('.sz');
    if (!sz) return;
    let bar = sz.querySelector('.pbar i');
    if (!bar) {
      sz.innerHTML = '<div class="pbar"><i></i></div><div class="ptxt"></div>';
      bar = sz.querySelector('.pbar i');
    }
    const pct = taskPct(task);
    bar.style.width = pct.toFixed(1) + '%';
    bar.parentNode.classList.toggle('pause', task.status === 'pause');
    bar.parentNode.classList.toggle('err', task.status === 'err');
    const txt = sz.querySelector('.ptxt');
    if (!txt) return;
    if (task.status === 'done') txt.textContent = '已完成';
    else if (task.status === 'err') txt.textContent = '失败 · 点继续重试';
    else if (task.status === 'pause') txt.textContent = `已暂停 ${pct.toFixed(0)}%`;
    else if (task.size && task.size < 1024 * 1024) txt.textContent = `${pct.toFixed(0)}%`;
    else txt.textContent = `${pct.toFixed(0)}% · ${fmtSpeed(task.speed) || '…'}`;

    // 「下载」按钮随状态变成 暂停 / 继续
    const dl = row.querySelector('[data-act=dl]');
    if (dl) {
      if (task.status === 'run') { dl.textContent = '暂停'; dl.classList.add('warn'); }
      else if (task.status === 'pause' || task.status === 'err') { dl.textContent = '继续'; dl.classList.add('warn'); }
      else { dl.textContent = '下载'; dl.classList.remove('warn'); }
    }
  }

  function updateTaskRow(task) {
    updateTaskUI(task);
    if (task.status === 'pause') renderRowState(task.fid);
  }

  function selectAll() {
    const files = visibleItems().filter((i) => !i.dir);
    if (!files.length) return;
    const all = files.every((i) => state.selected.has(i.fid));
    files.forEach((i) => {
      if (all) state.selected.delete(i.fid);
      else state.selected.add(i.fid);
    });
    renderList();
    renderStatus();
  }

  async function copySelected() {    const targets = state.items.filter((i) => !i.dir && state.selected.has(i.fid));
    if (!targets.length) {
      toastRootPush('请先勾选要复制的文件', 'warn');
      return;
    }
    toastRootPush(`正在获取 ${targets.length} 个文件的直链…`);
    const lines = [];
    for (const it of targets) {
      try {
        const link = await resolveLink(it);
        lines.push(buildPayload(link, it.name));
        await sleep(220); // 温柔一点，避免频控
      } catch (e) {
        lines.push(`# ${it.name} 取链失败：${e.message}`);
      }
    }
    const ok = copyText(lines.join('\n'));
    toastRootPush(ok ? `已复制 ${targets.length} 条` : '复制失败', ok ? 'ok' : 'err');
  }

  async function exportAria2() {
    const targets = state.items.filter((i) => !i.dir);
    if (!targets.length) {
      toastRootPush('当前目录没有文件', 'warn');
      return;
    }
    toastRootPush(`正在生成 ${targets.length} 个文件的 Aria2 脚本…`);
    const lines = ['#!/bin/sh', '# 由云析直链生成', ''];
    for (const it of targets) {
      try {
        const link = await resolveLink(it);
        lines.push(buildAria2(link, it.name));
        await sleep(220);
      } catch (e) {
        lines.push(`# ${it.name}：${e.message}`);
      }
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${(state.ctx && state.ctx.title) || 'yunx'}-aria2.sh`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 8000);
    toastRootPush('已导出 Aria2 脚本', 'ok');
  }

  /* =======================================================================
   * 6. 界面
   * ===================================================================== */

  const PANEL_CSS = `
    :host { all: initial; }
    * { box-sizing: border-box; }
    .wrap { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; }
    .fab {
      position: fixed; right: 14px; top: 62vh; z-index: 2147483000;
      width: 52px; height: 52px; border-radius: 16px; cursor: pointer;
      background: linear-gradient(135deg, #2f7bff, #5b9bff);
      color: #fff; display: flex; align-items: center; justify-content: center;
      box-shadow: 0 10px 26px rgba(27, 92, 214, .38), 0 2px 6px rgba(0,0,0,.12);
      font-size: 23px; user-select: none; touch-action: none;
      transition: transform .18s ease, opacity .18s ease, top .16s ease, left .16s ease, right .16s ease;
    }
    .fab.left { left: 14px; right: auto; }
    .fab:hover { transform: translateY(-2px) scale(1.03); }
    /* 拖动中：关掉过渡，跟手；放大一点点给反馈 */
    .fab.drag { transition: none; transform: scale(1.07); }
    /* 登录 / 验证码浮层出现时自动让位：淡出且不接收点击，浮层关掉自动回来 */
    .fab.away { opacity: 0; pointer-events: none; transform: scale(.6) translateX(28px); }
    .fab.away.left { transform: scale(.6) translateX(-28px); }
    .fab.hide { display: none; }
    .fab .badge {
      position: absolute; top: -6px; right: -6px; min-width: 20px; height: 20px; padding: 0 5px;
      border-radius: 10px; background: #f43f5e; color: #fff; font-size: 11px; font-weight: 700;
      display: none; align-items: center; justify-content: center; border: 2px solid #fff;
    }
    .fab .badge.on { display: flex; }

    .mask {
      position: fixed; inset: 0; background: rgba(15, 23, 42, .38); backdrop-filter: blur(2px);
      z-index: 2147483001; opacity: 0; pointer-events: none; transition: opacity .18s ease;
    }
    .mask.on { opacity: 1; pointer-events: auto; }

    .panel {
      position: fixed; z-index: 2147483002; left: 50%; top: 50%;
      width: min(880px, calc(100vw - 40px)); max-height: min(78vh, 760px);
      background: #fff; border-radius: 16px; overflow: hidden;
      box-shadow: 0 24px 64px rgba(15, 23, 42, .28), 0 4px 12px rgba(15, 23, 42, .1);
      display: none; flex-direction: column; color: #0f172a;
      transform: translate(-50%, -47%) scale(.985); opacity: 0;
      transition: transform .2s cubic-bezier(.2,.8,.2,1), opacity .18s ease;
    }
    .panel.on { display: flex; }
    .panel.in { transform: translate(-50%, -50%) scale(1); opacity: 1; }

    .hd { padding: 16px 18px 12px; border-bottom: 1px solid #eef2f7; display: flex; gap: 12px; align-items: flex-start; }
    .logo {
      width: 38px; height: 38px; border-radius: 11px; flex: 0 0 38px;
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-weight: 800; font-size: 13px; letter-spacing: -.3px;
    }
    .hd-main { flex: 1; min-width: 0; }
    .t1 { font-size: 15px; font-weight: 700; display: flex; align-items: center; gap: 8px; min-width: 0; }
    .t1 #yx-title { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
    .tag { flex: 0 0 auto; font-size: 11px; font-weight: 600; padding: 2px 7px; border-radius: 6px; background: #eef4ff; color: #1d4ed8; }
    .tag.guest { background: #fff7ed; color: #c2410c; }
    .t2 { margin-top: 4px; font-size: 12px; color: #64748b; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
    .hd-ops { display: flex; gap: 6px; flex: 0 0 auto; }
    .icon-btn {
      width: 30px; height: 30px; border-radius: 9px; border: 1px solid #e6ebf2; background: #fff;
      color: #475569; cursor: pointer; font-size: 14px; line-height: 1; display: flex; align-items: center; justify-content: center;
    }
    .icon-btn:hover { background: #f5f8fc; color: #0f172a; }

    .bar { display: flex; gap: 8px; align-items: center; padding: 10px 18px; border-bottom: 1px solid #f1f5f9; flex-wrap: wrap; }
    .btn {
      height: 30px; padding: 0 11px; border-radius: 8px; border: 1px solid #e6ebf2; background: #fff;
      font-size: 12px; color: #334155; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;
    }
    .btn:hover { background: #f5f8fc; }
    .btn.primary { background: var(--acc, #1e6fff); border-color: var(--acc, #1e6fff); color: #fff; }
    .btn.primary:hover { filter: brightness(1.05); }
    .btn.ghost { border-style: dashed; }
    .btn[disabled] { opacity: .45; cursor: not-allowed; }
    .spacer { flex: 1; }
    .search {
      height: 30px; width: 168px; border-radius: 8px; border: 1px solid #e6ebf2; padding: 0 10px;
      font-size: 12px; outline: none; color: #0f172a; background: #fbfcfe;
    }
    .search:focus { border-color: var(--acc, #1e6fff); background: #fff; }

    .crumb { display: flex; align-items: center; gap: 6px; padding: 8px 18px; font-size: 12px; color: #64748b; border-bottom: 1px solid #f1f5f9; }
    .crumb a { color: var(--acc, #1e6fff); cursor: pointer; }
    .crumb .sep { color: #cbd5e1; }
    .crumb b { color: #0f172a; font-weight: 600; }

    .list { flex: 1; overflow: auto; min-height: 120px; background: #fff; }
    .row {
      display: flex; align-items: center; gap: 10px; padding: 9px 18px; border-bottom: 1px solid #f6f8fb;
      font-size: 13px;
    }
    .row:hover { background: #fafcff; }
    .row.sel { background: #f4f9ff; }
    .row.sel:hover { background: #eef6ff; }
    .row .cb { flex: 0 0 16px; display: flex; }
    .row input[type=checkbox] { width: 15px; height: 15px; accent-color: var(--acc, #1e6fff); cursor: pointer; }
    .row .nm { flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; }
    .ext {
      flex: 0 0 auto; min-width: 34px; height: 18px; padding: 0 5px; border-radius: 5px;
      color: #fff; font-size: 10px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center;
      letter-spacing: .2px;
    }
    .ext.folder { background: #fbbf24; }
    .nm .txt { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
    .folder .txt { cursor: pointer; }
    .folder .txt:hover { color: var(--acc, #1e6fff); }
    .sz { flex: 0 0 116px; text-align: right; color: #94a3b8; font-size: 12px; font-variant-numeric: tabular-nums; }
    .ops { flex: 0 0 auto; display: flex; gap: 6px; align-items: center; min-width: 132px; justify-content: flex-end; }
    .row .state { font-size: 11px; color: #94a3b8; margin-right: 4px; white-space: nowrap; }
    .mini {
      height: 26px; padding: 0 9px; border-radius: 7px; border: 1px solid #e6ebf2; background: #fff;
      font-size: 12px; color: #334155; cursor: pointer;
    }
    .mini:hover { border-color: var(--acc, #1e6fff); color: var(--acc, #1e6fff); }
    .mini.solid { background: var(--acc, #1e6fff); border-color: var(--acc, #1e6fff); color: #fff; }
    .mini.solid:hover { filter: brightness(1.05); color: #fff; }
    .mini[disabled] { opacity: .55; cursor: default; }

    .empty { padding: 40px 24px; text-align: center; color: #94a3b8; font-size: 13px; line-height: 1.9; }
    .empty .big { font-size: 30px; margin-bottom: 10px; height: 36px; display: flex; align-items: center; justify-content: center; }
    .empty .err { color: #dc2626; }
    .pwbar { margin-top: 12px; display: flex; gap: 8px; justify-content: center; }
    .pwbar input {
      height: 32px; width: 180px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0 10px;
      font-size: 13px; outline: none; text-align: center; letter-spacing: 1px;
    }
    .pwbar input:focus { border-color: var(--acc, #1e6fff); }
    .pwbar .btn { height: 32px; }
    .linkbtn { color: var(--acc, #1e6fff); cursor: pointer; text-decoration: underline; }

    .inputbar { padding: 16px 18px 4px; display: flex; gap: 8px; }
    .inputbar input {
      flex: 1; height: 36px; border-radius: 9px; border: 1px solid #e2e8f0; padding: 0 12px;
      font-size: 13px; outline: none;
    }
    .inputbar input:focus { border-color: var(--acc, #1e6fff); }

    .ft { padding: 9px 18px; border-top: 1px solid #eef2f7; display: flex; align-items: center; gap: 10px; font-size: 12px; color: #94a3b8; }
    .ft .dot { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; }
    .ft .dot.guest { background: #f59e0b; }

    .toasts { position: fixed; left: 50%; bottom: 96px; transform: translateX(-50%); z-index: 2147483003; display: flex; flex-direction: column; gap: 8px; align-items: center; pointer-events: none; }
    .toast {
      background: #0f172a; color: #fff; font-size: 12.5px; padding: 9px 14px; border-radius: 10px;
      opacity: 0; transform: translateY(8px); transition: all .2s ease; box-shadow: 0 8px 24px rgba(15,23,42,.25);
      max-width: 520px; text-align: center; line-height: 1.5;
    }
    .toast.in { opacity: 1; transform: none; }
    .toast.ok { background: #15803d; }
    .toast.err { background: #b91c1c; }
    .toast.warn { background: #b45309; }

    .more-menu {
      position: fixed; z-index: 2147483003; background: #fff; border: 1px solid #e6ebf2; border-radius: 11px;
      box-shadow: 0 14px 40px rgba(15,23,42,.18); padding: 6px; min-width: 168px; display: none;
    }
    .more-menu.on { display: block; }
    .more-menu button {
      display: block; width: 100%; text-align: left; border: 0; background: none; padding: 8px 10px;
      font-size: 12.5px; color: #334155; border-radius: 7px; cursor: pointer;
    }
    .more-menu button:hover { background: #f4f8ff; color: #1d4ed8; }

    .settings {
      position: absolute; inset: 0; background: #fff; z-index: 5; padding: 18px 20px; display: none;
      overflow: auto;
    }
    .settings.on { display: block; }
    .settings h3 { margin: 0 0 14px; font-size: 15px; }
    .field { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f4f7fb; font-size: 13px; gap: 16px; }
    .field .lbl { color: #334155; }
    .field .desc { font-size: 11.5px; color: #94a3b8; margin-top: 2px; }
    .field select { height: 30px; border-radius: 8px; border: 1px solid #e2e8f0; padding: 0 8px; font-size: 12px; background: #fff; }
    .switch { width: 38px; height: 22px; border-radius: 11px; background: #e2e8f0; position: relative; cursor: pointer; transition: background .16s; flex: 0 0 38px; }
    .switch.on { background: var(--acc, #1e6fff); }
    .switch i { position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: left .16s; }
    .switch.on i { left: 18px; }
    .prog { height: 4px; background: #eef2f7; border-radius: 2px; overflow: hidden; margin-top: 3px; }
    .prog i { display: block; height: 100%; width: 0; background: var(--acc, #1e6fff); transition: width .2s; }
    .pbar { height: 5px; background: #eef2f7; border-radius: 3px; overflow: hidden; margin: 2px 0 3px; }
    .pbar i { display: block; height: 100%; width: 0; background: var(--acc, #1e6fff); transition: width .3s linear; }
    .pbar.pause i { background: #f59e0b; }
    .pbar.err i { background: #dc2626; }
    .ptxt { font-size: 10.5px; color: #94a3b8; line-height: 1.25; white-space: nowrap; }
    .mini.warn { border-color: #f59e0b; color: #b45309; background: #fffbeb; }
    .mini.warn:hover { border-color: #f59e0b; color: #92400e; }
    .more-menu button.danger { color: #dc2626; }
    .more-menu button.danger:hover { background: #fef2f2; }
  `;

  /* =======================================================================
   * 5.9 页面联动：跟随页面当前目录 + 同步页面勾选
   * -----------------------------------------------------------------------
   * 用户更习惯直接在网盘页面上操作：点进文件夹、勾上文件。
   * 面板要是各走各的，就会出现「页面已经在文件夹里，面板还停在根目录」。
   *
   * 夸克进文件夹既不换 URL、也不重新请求（数据首屏就拿到了），所以拿不到 pdir_fid。
   * 这里的做法是拿「页面上正在显示的文件名」当锚点：
   *   ① 面板当前层没有这些名字 → 逐层往下翻，翻到哪层对得上就切过去
   *   ② 监听页面勾选，按文件名匹配回面板条目，同步成面板的选中态
   *      点球打开就能直接下载 / 复制直链
   * ===================================================================== */

  let lastFollowAt = 0;

  // 页面上当前看得见的文件名（手机是 .item-tit，桌面是表格第二列 / title）
  function pageVisibleNames() {
    const set = new Set();
    const push = (t) => {
      const s = String(t || '').replace(/\s+/g, ' ').trim();
      if (s && s.length < 120) set.add(s);
    };
    try {
      document.querySelectorAll('.file-item .item-tit').forEach((el) => push(el.textContent));
      document.querySelectorAll('tr.ant-table-row').forEach((tr) => {
        const t = tr.querySelector('[title]');
        if (t) { push(t.getAttribute('title')); return; }
        const td = tr.querySelectorAll('td');
        if (td.length > 1) push(td[1].textContent);
      });
      document.querySelectorAll('.file-item .item-tit[title]').forEach((el) => push(el.getAttribute('title')));
    } catch (e) { /* ignore */ }
    return Array.from(set);
  }

  function layerHit(items, names) {
    if (!items || !items.length || !names || !names.length) return false;
    const set = new Set(items.map((i) => String(i.name || '').replace(/\s+/g, ' ').trim()));
    let hit = 0;
    for (const n of names) if (set.has(n)) hit++;
    return hit >= Math.min(2, names.length);
  }

  // 按页面上的显示顺序排一遍，免得面板顺序和用户刚看到的对不上
  function orderLikePage(items, names) {
    if (!items || !names || !names.length) return items;
    const idx = new Map();
    names.forEach((n, i) => idx.set(n, i));
    return items.slice().sort((a, b) => {
      const ia = idx.has(a.name) ? idx.get(a.name) : 9999;
      const ib = idx.has(b.name) ? idx.get(b.name) : 9999;
      return ia - ib;
    });
  }

  // 页面进到了子目录 → 面板跟着切过去。
  // 夸克进文件夹不发请求、URL 也不变，只能靠「页面上正在显示哪些文件名」反推层级：
  // 在当前层找不到，就逐层往下翻，命中即切（最多翻 12 个目录，避免请求风暴）。
  async function followPageDir(force) {
    if (!state.ctx || !state.platform) return false;
    if (state.navLock && !force) return false;
    if (Date.now() - lastFollowAt < 1200) return false;

    const names = pageVisibleNames();
    if (!names.length) return false;
    if (layerHit(state.items, names)) return false;   // 已经在同一层
    if (!state.items.some((i) => i.dir)) return false; // 当前层没有可下去的文件夹

    lastFollowAt = Date.now();
    const tried = new Set();
    const queue = state.items.filter((i) => i.dir).map((i) => ({
      id: i.fid,
      path: [{ id: '0', name: '根目录' }, { id: i.fid, name: i.name }]
    }));
    let budget = 12;

    while (queue.length && budget-- > 0) {
      const node = queue.shift();
      if (!node || tried.has(node.id)) continue;
      tried.add(node.id);
      let list = null;
      try { list = await state.platform.list(state.ctx, node.id); } catch (e) { continue; }
      if (layerHit(list, names)) {
        state.items = orderLikePage(list, names);
        state.stack = node.path;
        state.selected.clear();
        state.selFromPage = false;
        if (state.open) render();
        return true;
      }
      list.filter((i) => i.dir).forEach((i) => queue.push({
        id: i.fid,
        path: node.path.concat([{ id: i.fid, name: i.name }])
      }));
      if (queue.length > 60) break;
    }
    return false;
  }

  function inOurUI(el) {
    try { return !!(el && el.closest && el.closest('[id^="yunx-panlink"]')); } catch (e) { return false; }
  }

  // 页面上当前勾选了哪些行（手机是 .file-item，桌面是 antd 表格行）
  function pageCheckedRows() {
    const rows = [];
    let all = false;
    try {
      Array.from(document.querySelectorAll('input[type=checkbox]:checked')).forEach((cb) => {
        if (inOurUI(cb)) return;
        const row = cb.closest('.file-item, tr.ant-table-row, .ant-table-row, [class*="file-row"], [class*="fileRow"]');
        if (row && !inOurUI(row)) { rows.push(row); return; }
        // 落在表头 / 全选位置的勾选框 → 视为全选
        const head = cb.closest('thead, [class*="header"], [class*="Header"]');
        if (head) all = true;
      });
      Array.from(document.querySelectorAll('.ant-table-row-selected, .file-item.selected, .file-item.checked')).forEach((r) => {
        if (!inOurUI(r) && rows.indexOf(r) < 0) rows.push(r);
      });
    } catch (e) { /* ignore */ }
    return { all, rows };
  }

  function setBallBadge(n) {
    const root = getRoot();
    if (!root) return;
    const badge = root.getElementById('yx-badge');
    if (!badge) return;
    badge.textContent = n > 0 ? String(n) : '';
    badge.classList.toggle('on', n > 0);
  }

  // 把页面上的勾选同步成面板的选中态
  function syncPageSelection() {
    if (!state.ctx || !state.items.length) return;
    if (state.pageSelDirty) return;   // 用户刚在面板里改过，不要抢
    const picked = pageCheckedRows();
    const empty = !picked.all && !picked.rows.length;

    if (empty) {
      // 只有「上一次是页面同步来的」才跟着清空，否则会误删用户在面板里手选的
      if (state.selFromPage && state.selected.size) {
        state.selected = new Set();
        state.selFromPage = false;
        setBallBadge(0);
        if (state.open) render();
      }
      return;
    }

    const hit = new Set();
    if (picked.all) {
      state.items.forEach((it) => { if (!it.dir) hit.add(it.fid); });
    } else {
      state.items.forEach((it) => {
        if (it.dir) return;
        const n = String(it.name || '').replace(/\s+/g, '');
        if (!n) return;
        for (const row of picked.rows) {
          const t = String(row.textContent || '').replace(/\s+/g, '');
          if (t && t.indexOf(n) >= 0) { hit.add(it.fid); break; }
        }
      });
    }
    if (!hit.size) return;   // 页面勾的东西不在当前目录里，不动面板

    const same = hit.size === state.selected.size && Array.from(hit).every((f) => state.selected.has(f));
    state.selFromPage = true;
    setBallBadge(hit.size);
    if (same) return;
    state.selected = hit;
    if (state.open) render();
  }

  function bindPageSelectionWatcher() {
    let timer = null;
    const kick = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        try { syncPageSelection(); } catch (e) { /* ignore */ }
      }, 240);
    };
    try {
      document.addEventListener('click', kick, true);
      document.addEventListener('change', kick, true);
    } catch (e) { /* ignore */ }
    setInterval(kick, 3000);   // 兜底：有些勾选是脚本改状态，不冒泡事件
  }

  function mountUI() {
    if (state.mounted) return;
    state.mounted = true;

    // 同一个页面被注入两次很常见：浏览器自带脚本引擎 + 油猴各注入一份，
    // 或者脚本更新后旧实例还挂在页面上。两份都有自己的悬浮球，就变成两个球。
    // 这里用 window 级标记互斥，并把别人挂的 host 清掉，保证页面上只有一个。
    try {
      if (window.__YX_UI__) { return; }
      window.__YX_UI__ = 1;
    } catch (e) { /* ignore */ }
    try {
      document.querySelectorAll('#yunx-panlink-host').forEach((el) => {
        try { el.remove(); } catch (e) { /* ignore */ }
      });
    } catch (e) { /* ignore */ }

    const host = document.createElement('div');
    host.id = 'yunx-panlink-host';
    host.style.cssText = 'position:fixed;inset:0;width:0;height:0;z-index:2147483000';
    state.host = host;
    const root = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = PANEL_CSS;

    const wrap = document.createElement('div');
    wrap.className = 'wrap';
    wrap.innerHTML = `
      <div class="fab" id="yx-fab" title="云析直链">${ICON.bolt}<span class="badge" id="yx-badge"></span></div>
      <div class="mask" id="yx-mask"></div>
      <div class="panel" id="yx-panel">
        <div class="hd">
          <div class="logo" id="yx-logo" style="background:#1e6fff">夸</div>
          <div class="hd-main">
            <div class="t1"><span id="yx-title">云析直链</span><span class="tag" id="yx-tag" style="display:none">已登录</span></div>
            <div class="t2" id="yx-sub">粘贴分享链接，一键获取直链</div>
          </div>
          <div class="hd-ops">
            <button class="icon-btn" id="yx-new" title="解析其它链接">⇄</button>
            <button class="icon-btn" id="yx-set" title="设置">⚙</button>
            <button class="icon-btn" id="yx-close" title="关闭 (Esc)">✕</button>
          </div>
        </div>
        <div class="bar" id="yx-bar">
          <button class="btn" id="yx-select-all">全选</button>
          <button class="btn primary" id="yx-copy-sel">复制已选</button>
          <button class="btn" id="yx-export">导出 Aria2</button>
          <button class="btn" id="yx-refresh">刷新</button>
          <div class="spacer"></div>
          <input class="search" id="yx-search" placeholder="搜索文件…">
        </div>
        <div class="crumb" id="yx-crumb" style="display:none"></div>
        <div class="list" id="yx-list"></div>
        <div class="ft">
          <span class="dot" id="yx-dot"></span>
          <span id="yx-status">就绪</span>
        </div>
        <div class="settings" id="yx-settings">
          <h3>设置</h3>
          <div class="field">
            <div><div class="lbl">打开分享页自动解析</div><div class="desc">进入分享页后在后台预取文件列表</div></div>
            <div class="switch" data-key="autoParse"><i></i></div>
          </div>
          <div class="field">
            <div><div class="lbl">显示悬浮球</div><div class="desc">按住拖动可换边，位置会记住；登录 / 验证码弹层出现时自动隐藏</div></div>
            <div class="switch" data-key="showBall"><i></i></div>
          </div>
          <div class="field">
            <div><div class="lbl">在页面按钮旁挂「直链下载」</div><div class="desc">接管「保存到网盘 / 打开 APP / 下载」，点它直接进下载面板</div></div>
            <div class="switch" data-key="hookButtons"><i></i></div>
          </div>
          <div class="field">
            <div><div class="lbl">隐藏分享页广告</div><div class="desc">只隐藏广告 / 推广浮层，不碰下载按钮和文件列表</div></div>
            <div class="switch" data-key="adBlock"><i></i></div>
          </div>
          <div class="field">
            <div><div class="lbl">额外隐藏选择器</div><div class="desc">逗号分隔，如 .my-banner,#gg-box</div></div>
            <input class="search" id="yx-ad-extra" placeholder=".my-banner,#gg" style="width:132px;height:30px">
          </div>
          <div class="field">
            <div><div class="lbl">复制内容</div><div class="desc">点「复制」时写入剪贴板的内容</div></div>
            <select id="yx-copy-mode">
              <option value="link">直链</option>
              <option value="aria2">Aria2 命令</option>
              <option value="curl">cURL 命令</option>
              <option value="idm">IDM 命令</option>
            </select>
          </div>
          <div class="field">
            <div><div class="lbl">下载方式</div><div class="desc">分片下载＝多线程 + 暂停续传，和 IDM 一个思路</div></div>
            <select id="yx-dl-mode">
              <option value="auto">智能（手机交给浏览器，电脑走分片）</option>
              <option value="engine">始终分片下载</option>
              <option value="blob">单连接代下（≤200MB）</option>
              <option value="browser">直接交给浏览器</option>
            </select>
          </div>
          <div class="field">
            <div><div class="lbl">并发连接数</div><div class="desc">8 连接一般就能跑满带宽，太多容易触发风控</div></div>
            <select id="yx-threads">
              <option value="4">4 线程</option>
              <option value="8">8 线程</option>
              <option value="12">12 线程</option>
              <option value="16">16 线程</option>
            </select>
          </div>
          <div class="field">
            <div><div class="lbl">百度访问令牌</div><div class="desc">手机等无 GM 存储的环境：授权后把令牌粘到这里</div></div>
            <input class="search" id="yx-baidu-token" placeholder="access_token" style="width:132px;height:30px">
          </div>
          <div class="field" style="border:0;color:#94a3b8;font-size:11.5px">
            <div id="yx-update-line">版本 v${APP.version} · 无口令 / 无授权码</div>
            <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
              <button class="btn" id="yx-check-update">检查更新</button>
              <button class="btn" id="yx-repo">项目主页</button>
              <button class="btn" id="yx-set-back">返回</button>
            </div>
          </div>
        </div>
      </div>
      <div class="toasts" id="yx-toasts"></div>
      <div class="more-menu" id="yx-more"></div>
    `;

    root.appendChild(style);
    root.appendChild(wrap);
    document.documentElement.appendChild(host);

    bindFabDrag(root);
    bindEvents(root);
    state.settingsOpen = false;
    render();
    applyBall();
    applyFabPos();
    watchFabAvoid();
    watchSoloHost();
  }

  /* ---------------------- 悬浮球：防重复 / 可拖动 / 自动让位 ---------------------- */

  const FAB_POS_KEY = 'yx_fab_pos';
  let fabDragged = false;

  // 位置按「贴哪边 + 垂直比例」存，换设备、转屏都能落回合理位置
  function applyFabPos() {
    const root = getRoot();
    if (!root) return;
    const fab = root.getElementById('yx-fab');
    if (!fab) return;
    let pos = null;
    try { pos = GMStore.get(FAB_POS_KEY, null); } catch (e) { pos = null; }
    const side = pos && pos.side === 'left' ? 'left' : 'right';
    let ratio = pos && typeof pos.ratio === 'number' ? pos.ratio : 0.62;
    ratio = Math.min(0.82, Math.max(0.10, ratio));
    fab.classList.toggle('left', side === 'left');
    const h = fab.offsetHeight || 52;
    fab.style.top = `${Math.round(ratio * window.innerHeight - h / 2)}px`;
    fab.style.bottom = 'auto';
    fab.style.left = '';
    fab.style.right = '';
  }

  function bindFabDrag(root) {
    const fab = root.getElementById('yx-fab');
    if (!fab) return;

    let down = false, moved = false, sx = 0, sy = 0, ox = 0, oy = 0;

    fab.addEventListener('pointerdown', (e) => {
      down = true;
      moved = false;
      const r = fab.getBoundingClientRect();
      sx = e.clientX;
      sy = e.clientY;
      ox = e.clientX - r.left;
      oy = e.clientY - r.top;
      try { fab.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    });

    fab.addEventListener('pointermove', (e) => {
      if (!down) return;
      if (!moved && Math.hypot(e.clientX - sx, e.clientY - sy) < 7) return;
      moved = true;
      fab.classList.add('drag');
      const w = fab.offsetWidth || 52;
      const h = fab.offsetHeight || 52;
      const x = Math.min(window.innerWidth - w - 2, Math.max(2, e.clientX - ox));
      const y = Math.min(window.innerHeight - h - 2, Math.max(2, e.clientY - oy));
      fab.style.left = `${x}px`;
      fab.style.right = 'auto';
      fab.style.top = `${y}px`;
      fab.style.bottom = 'auto';
    });

    const end = (e) => {
      if (!down) return;
      down = false;
      fab.classList.remove('drag');
      if (!moved) return;
      fabDragged = true;
      const r = fab.getBoundingClientRect();
      const side = r.left + r.width / 2 < window.innerWidth / 2 ? 'left' : 'right';
      const ratio = (r.top + r.height / 2) / Math.max(1, window.innerHeight);
      try { GMStore.set(FAB_POS_KEY, { side, ratio: Math.min(0.82, Math.max(0.10, ratio)) }); } catch (err) { /* ignore */ }
      applyFabPos();
    };
    fab.addEventListener('pointerup', end);
    fab.addEventListener('pointercancel', end);

    // 拖动结束时浏览器还会补一个 click，必须在这里掐掉，否则一拖就弹出面板
    fab.addEventListener('click', (e) => {
      if (!fabDragged) return;
      fabDragged = false;
      e.stopImmediatePropagation();
      e.preventDefault();
    }, true);
  }

  // 页面上出现登录框 / 验证码输入时把球收起来，避免挡住输入和「获取验证码」
  function fabShouldYield() {
    const sels = [
      'input[type="password"]',
      'input[placeholder*="验证码"]',
      'input[placeholder*="密码"]',
      'input[placeholder*="口令"]',
      'input[name*="captcha"]',
      '[class*="captcha"] input',
      '[class*="pass-form"] input'
    ];
    for (const s of sels) {
      let list = null;
      try { list = document.querySelectorAll(s); } catch (e) { continue; }
      for (const el of list) {
        if (!el || (el.closest && el.closest('[id^="yunx-panlink"]'))) continue;
        let r = null;
        try { r = el.getBoundingClientRect(); } catch (e) { continue; }
        if (!r || r.width < 24 || r.height < 12) continue;
        if (r.bottom < 0 || r.top > window.innerHeight) continue;
        let cs = null;
        try { cs = getComputedStyle(el); } catch (e) { cs = null; }
        if (cs && (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.15)) continue;
        return true;
      }
    }
    return false;
  }

  function watchFabAvoid() {
    const tick = () => {
      const root = getRoot();
      if (!root) return;
      const fab = root.getElementById('yx-fab');
      if (!fab) return;
      if (!settings.showBall) return;
      let yield_ = false;
      try { yield_ = fabShouldYield(); } catch (e) { yield_ = false; }
      fab.classList.toggle('away', yield_);
    };
    tick();
    setInterval(tick, 1200);
    // 键盘弹出 / 收起、横竖屏切换后视口变了，重新贴边
    window.addEventListener('resize', () => { applyFabPos(); });
    window.addEventListener('orientationchange', () => { setTimeout(applyFabPos, 260); });
  }

  // 同一页面若还有第二个球（另一份脚本挂的），把不是自己的那个清掉
  function watchSoloHost() {
    setInterval(() => {
      let list = null;
      try { list = document.querySelectorAll('#yunx-panlink-host'); } catch (e) { return; }
      if (!list || list.length <= 1) return;
      list.forEach((el) => {
        if (el === state.host) return;
        try { el.remove(); } catch (e) { /* ignore */ }
      });
    }, 2000);
  }

  function bindEvents(root) {
    const on = (id, ev, fn) => {
      const el = root.getElementById(id);
      if (el) el.addEventListener(ev, fn);
    };

    on('yx-fab', 'click', () => openPanel());
    on('yx-mask', 'click', () => closePanel());
    on('yx-close', 'click', () => closePanel());
    on('yx-new', 'click', () => { resetShare(); state.settingsOpen = false; render(); });
    on('yx-set', 'click', () => { state.settingsOpen = true; render(); });
    on('yx-set-back', 'click', () => { state.settingsOpen = false; render(); });
    on('yx-check-update', 'click', () => checkUpdate(true));
    on('yx-repo', 'click', () => {
      try {
        if (typeof GM_openInTab === 'function') return GM_openInTab(REPO_URL, { active: true, insert: true });
      } catch (e) { /* ignore */ }
      window.open(REPO_URL, '_blank', 'noopener');
    });
    on('yx-refresh', 'click', () => { if (state.shareUrl) parseShare(state.shareUrl); else openPanel(); });
    on('yx-copy-sel', 'click', copySelected);
    on('yx-select-all', 'click', selectAll);
    on('yx-export', 'click', exportAria2);

    on('yx-search', 'input', (e) => {
      state.filter = e.target.value.trim().toLowerCase();
      renderList();
    });

    // 列表事件委托
    const list = root.getElementById('yx-list');
    list.addEventListener('change', (e) => {
      const cb = e.target.closest('input[type=checkbox]');
      if (!cb) return;
      const fid = cb.dataset.fid;
      if (cb.checked) state.selected.add(fid); else state.selected.delete(fid);
      state.selFromPage = false;   // 用户在面板里动手了，别再被页面同步覆盖
      state.pageSelDirty = true;
      const rr = cb.closest('.row');
      if (rr) rr.classList.toggle('sel', cb.checked);
      renderStatus();
    });
    list.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      const row = e.target.closest('.row');
      if (!row) return;
      const fid = row.dataset.fid;
      const item = state.items.find((i) => i.fid === fid);
      if (!item) return;

      if (btn) {
        const act = btn.dataset.act;
        if (act === 'copy') return doCopy(item);
        if (act === 'dl') return doDownload(item);
        if (act === 'enter') return enterDir(item);
        if (act === 'more') return openMore(btn, item);
        return;
      }
      // 点名字进文件夹
      if (item.dir && e.target.closest('.nm')) enterDir(item);
    });

    // 设置项
    root.addEventListener('click', (e) => {
      const sw = e.target.closest('.switch');
      if (sw && sw.dataset.key) {
        settings[sw.dataset.key] = !settings[sw.dataset.key];
        Store.write(settings);
        sw.classList.toggle('on', !!settings[sw.dataset.key]);
        if (sw.dataset.key === 'showBall') applyBall();
        if (sw.dataset.key === 'hookButtons') {
          if (settings.hookButtons) hookPageButtons();
          else {
            document.querySelectorAll('[data-yx-hook]').forEach((n) => n.remove());
            document.querySelectorAll('[data-yx-hooked]').forEach((n) => { delete n.dataset.yxHooked; });
          }
        }
        if (sw.dataset.key === 'adBlock') {
          const st = document.getElementById('yx-adblock');
          if (st) st.remove();
          initAdBlock();
        }
      }
    });
    const cm = root.getElementById('yx-copy-mode');
    if (cm) {
      cm.value = settings.copyMode;
      cm.addEventListener('change', () => { settings.copyMode = cm.value; Store.write(settings); });
    }
    const dm = root.getElementById('yx-dl-mode');
    if (dm) {
      dm.value = settings.downloadMode;
      dm.addEventListener('change', () => { settings.downloadMode = dm.value; Store.write(settings); });
    }
    const th = root.getElementById('yx-threads');
    if (th) {
      th.value = String(settings.threads || 8);
      th.addEventListener('change', () => {
        settings.threads = Number(th.value) || 8;
        Store.write(settings);
      });
    }
    const ax = root.getElementById('yx-ad-extra');
    if (ax) {
      ax.value = settings.adExtra || '';
      ax.addEventListener('change', () => {
        settings.adExtra = ax.value.trim();
        Store.write(settings);
        const st = document.getElementById('yx-adblock');
        if (st) st.remove();
        initAdBlock();
      });
    }
    // 手动填百度令牌（手机无 GM 存储时的兜底）
    const bt = root.getElementById('yx-baidu-token');
    if (bt) {
      bt.value = baidu.token();
      bt.addEventListener('change', () => {
        const v = bt.value.trim();
        GMStore.set(BAIDU_TOKEN_KEY, v);
        toastRootPush(v ? '百度令牌已保存' : '百度令牌已清除', v ? 'ok' : 'info');
      });
    }

    // 更多菜单
    const more = root.getElementById('yx-more');
    more.addEventListener('click', async (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const item = state.more && state.more.item;
      closeMore();
      if (!item) return;
      const act = b.dataset.m;
      try {
        if (act === 'pause') { DL.pause(item.fid); return; }
        if (act === 'goon') { await DL.resume(item); return; }
        if (act === 'cancel') { await DL.cancel(item.fid); return; }
        if (act === 'open') {
          const tab = window.open('about:blank', '_blank');
          try {
            const link = await resolveLink(item);
            if (tab && !tab.closed) tab.location.href = link.url;
            else window.open(link.url, '_blank', 'noopener');
          } catch (err) {
            if (tab) tab.close();
            throw err;
          }
          return;
        }
        const link = await resolveLink(item);
        if (act === 'aria2') { copyText(buildAria2(link, item.name)); toastRootPush('已复制 Aria2 命令', 'ok'); }
        if (act === 'curl') { copyText(buildCurl(link, item.name)); toastRootPush('已复制 cURL 命令', 'ok'); }
        if (act === 'url') { copyText(link.url); toastRootPush('已复制直链', 'ok'); }
        if (act === 'idm') { copyText(buildIDM(link, item.name)); toastRootPush('已复制 IDM 命令（IDM 需支持 Referer 的站点请先看说明）', 'ok'); }
        if (act === 'name') { copyText(item.name); toastRootPush('已复制文件名', 'ok'); }
      } catch (err) {
        toastRootPush(err.message || '取链失败', 'err');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (state.more) closeMore();
        else if (state.open) closePanel();
      }
    }, true);

    document.addEventListener('click', (e) => {
      if (state.more && !e.composedPath().includes(root.getElementById('yx-more'))) closeMore();
    }, true);
  }

  function applyBall() {
    const root = getRoot();
    if (!root) return;
    const fab = root.getElementById('yx-fab');
    if (!fab) return;
    fab.classList.toggle('hide', !settings.showBall);
    if (settings.showBall) applyFabPos();
  }

  function getRoot() {
    // 页面上可能残留别的实例（另一份脚本挂的），优先用自己创建的那个
    const own = state.host && state.host.isConnected ? state.host : null;
    const host = own || document.getElementById('yunx-panlink-host');
    return host && host.shadowRoot ? host.shadowRoot : null;
  }

  function openPanel() {
    const root = getRoot();
    if (!root) return;
    state.open = true;
    state.navLock = false;    // 每次打开面板都重新跟一次页面目录
    state.pageSelDirty = false;
    const badge = root.getElementById('yx-badge');
    if (badge) { badge.textContent = ''; badge.classList.remove('on'); }
    const mask = root.getElementById('yx-mask');
    const panel = root.getElementById('yx-panel');
    mask.classList.add('on');
    panel.classList.add('on');
    requestAnimationFrame(() => panel.classList.add('in'));

    const plat = detectPlatform(location.href);
    if (plat && !state.ctx) {
      // 移动云盘的分享 ID 在 hash 里（#/w/i/xxx），不能丢掉
      parseShare(location.href)
        .then(() => followPageDir(true))
        .then(() => syncPageSelection())
        .catch(() => {});
    } else {
      render();
      // 页面在子目录 / 已勾选文件时，面板跟上
      followPageDir(true).then(() => syncPageSelection()).catch(() => {});
    }

    // 第一次用给一句人话：下载按钮到底会发生什么
    if (!GMStore.get('yx_greet', 0)) {
      GMStore.set('yx_greet', 1);
      setTimeout(() => {
        toastRootPush(IS_MOBILE
          ? '点「下载」直接交给浏览器，文件进系统「下载」列表'
          : '点「下载」走分片引擎，可暂停、可刷新后续传', 'ok');
      }, 900);
    }
  }

  function closePanel() {
    const root = getRoot();
    if (!root) return;
    state.open = false;
    const mask = root.getElementById('yx-mask');
    const panel = root.getElementById('yx-panel');
    panel.classList.remove('in');
    mask.classList.remove('on');
    setTimeout(() => { panel.classList.remove('on'); }, 180);
    closeMore();
  }

  function openMore(btn, item) {
    const root = getRoot();
    if (!root) return;
    const menu = root.getElementById('yx-more');
    state.more = { item };
    const task = DL.get(item.fid);
    menu.innerHTML = `
      <button data-m="url">复制直链</button>
      <button data-m="idm">复制 IDM 命令</button>
      <button data-m="aria2">复制 Aria2 命令</button>
      <button data-m="curl">复制 cURL 命令</button>
      <button data-m="open">浏览器打开</button>
      <button data-m="name">复制文件名</button>
      ${task && task.status === 'run' ? '<button data-m="pause">暂停下载</button>' : ''}
      ${task && task.status === 'pause' ? '<button data-m="goon">继续下载</button>' : ''}
      ${task ? '<button data-m="cancel" class="danger">取消并清理缓存</button>' : ''}
    `;
    const r = btn.getBoundingClientRect();
    const w = 180;
    const left = Math.min(window.innerWidth - w - 12, Math.max(12, r.right - w));
    const top = Math.min(window.innerHeight - menu.offsetHeight - 12, r.bottom + 6);
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
    menu.classList.add('on');
  }

  function closeMore() {
    const root = getRoot();
    state.more = null;
    if (root) {
      const menu = root.getElementById('yx-more');
      if (menu) menu.classList.remove('on');
    }
  }

  /* ---------------- 渲染 ---------------- */

  function render() {
    const root = getRoot();
    if (!root) return;

    const acc = (state.platform && state.platform.color) || '#1e6fff';
    root.getElementById('yx-panel').style.setProperty('--acc', acc);

    const logo = root.getElementById('yx-logo');
    logo.style.background = acc;
    logo.textContent = state.platform ? state.platform.logo : '析';

    const title = root.getElementById('yx-title');
    if (state.ctx && state.ctx.title) title.textContent = state.ctx.title;
    else if (state.platform) title.textContent = state.platform.name;
    else title.textContent = '云析直链';

    const tag = root.getElementById('yx-tag');
    if (state.ctx) {
      tag.style.display = '';
      const tok = state.platform && state.platform.id === 'baidu' && state.platform.hasToken && state.platform.hasToken();
      const nick = state.ctx.nick ? String(state.ctx.nick).trim().slice(0, 10) : '';
      tag.textContent = tok ? '已授权' : (state.ctx.logged ? (nick || '已登录') : (state.platform.guestLabel || '游客'));
      tag.className = 'tag' + (tok || state.ctx.logged ? '' : ' guest');
    } else {
      tag.style.display = 'none';
    }

    const sub = root.getElementById('yx-sub');
    if (state.error) sub.textContent = state.error;
    else if (state.loading) sub.textContent = '正在解析…';
    else if (state.ctx) {
      const files = state.items.filter((i) => !i.dir).length;
      const dirs = state.items.length - files;
      const parts = [];
      if (files) parts.push(`${files} 个文件`);
      if (dirs) parts.push(`${dirs} 个文件夹`);
      sub.textContent = `${state.platform.name} · ${parts.join('，') || '空目录'}${state.ctx.logged ? '' : ' · 游客态'}`;
    } else {
      sub.textContent = '粘贴分享链接，一键获取直链';
    }

    // 百度：没有令牌就给一个「授权」快捷入口（错误区已有主按钮时不重复）
    if (state.platform && state.platform.id === 'baidu' && state.platform.hasToken && !state.platform.hasToken() && !state.error) {
      const label = '一键授权百度网盘（提升取链成功率）';
      sub.innerHTML = `<span>${esc(sub.textContent || '')}</span>
        <a data-yx-auth="1" style="margin-left:8px;color:#6aa8ff;cursor:pointer;text-decoration:underline">${label}</a>`;
      const link = sub.querySelector('[data-yx-auth]');
      if (link) link.onclick = (e) => { e.preventDefault(); doBaiduAuth(); };
    }

    const crumb = root.getElementById('yx-crumb');
    if (state.stack.length > 1) {
      crumb.style.display = '';
      const parts = state.stack.map((s, i) =>
        i === state.stack.length - 1
          ? `<b>${esc(s.name)}</b>`
          : `<a data-jump="${i}">${esc(s.name)}</a>`
      );
      crumb.innerHTML = `<a data-back="1">← 返回</a><span class="sep">/</span>` + parts.join('<span class="sep">/</span>');
    } else {
      crumb.style.display = 'none';
    }

    // 没有解析结果时，批量操作不可点
    ['yx-select-all', 'yx-copy-sel', 'yx-export', 'yx-refresh'].forEach((id) => {
      const b = root.getElementById(id);
      if (b) b.disabled = !state.ctx;
    });

    // 设置面板
    const set = root.getElementById('yx-settings');
    set.classList.toggle('on', state.settingsOpen);
    if (state.settingsOpen) renderUpdateLine();
    $$('.switch', root).forEach((sw) => {
      sw.classList.toggle('on', !!settings[sw.dataset.key]);
    });

    // 面包屑事件（重绑定）
    crumb.onclick = (e) => {
      const back = e.target.closest('[data-back]');
      if (back) return backDir();
      const jump = e.target.closest('[data-jump]');
      if (jump) {
        const idx = Number(jump.dataset.jump);
        const target = state.stack[idx];
        state.stack = state.stack.slice(0, idx + 1);
        state.loading = true;
        render();
        state.platform.list(state.ctx, target.id).then((l) => {
          state.items = l; state.loading = false; render();
        }).catch((err) => {
          state.error = err.message; state.loading = false; render();
        });
      }
    };

    renderList();
    renderStatus();
  }

  function visibleItems() {
    if (!state.filter) return state.items;
    return state.items.filter((i) => i.name.toLowerCase().includes(state.filter));
  }

  function renderList() {
    const root = getRoot();
    if (!root) return;
    const box = root.getElementById('yx-list');

    if (!state.ctx) {
      box.innerHTML = `
        <div class="inputbar">
          <input id="yx-url" placeholder="粘贴夸克 / UC / 123 分享链接或整段分享文案">
          <button class="btn primary" id="yx-go" style="height:36px">解析</button>
        </div>
        <div class="empty">
          <div class="big">${ICON.link}</div>
          支持 夸克网盘 · UC 网盘 · 123 云盘<br>
          打开分享页会自动识别，也可以在上方直接粘贴
        </div>`;
      const input = box.querySelector('#yx-url');
      const go = () => {
        const v = input.value.trim();
        if (v) parseShare(v);
      };
      box.querySelector('#yx-go').addEventListener('click', go);
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
      return;
    }

    if (state.loading) {
      box.innerHTML = `<div class="empty"><div class="big">${ICON.spin}</div>正在解析，请稍候…</div>`;
      return;
    }

    if (state.error) {
      const needPwd = /密码|提取码|口令|passcode/i.test(state.error);
      const needLogin = /登录|未登录|账号|授权/i.test(state.error) && !needPwd;
      const loginUrl = (state.platform && state.platform.cookieUrl) || 'https://pan.baidu.com/';
      const isBaidu = !!(state.platform && state.platform.id === 'baidu');
      box.innerHTML = `<div class="empty"><div class="big">${ICON.warn}</div><div class="err">${esc(state.error)}</div>
        ${needLogin ? (isBaidu ? `<div class="pwbar">
          <button class="btn primary" id="yx-auth">一键授权百度网盘</button>
          <button class="btn" id="yx-relogin">我已登录，重试</button>
        </div>
        <div class="hint" style="margin-top:10px;font-size:12px;opacity:.62;line-height:1.6">
          授权只申请「网盘读写」权限，用来生成下载直链，不读你的账号资料，令牌存在本地、30 天有效。
        </div>` : `<div class="pwbar">
          <a class="btn primary" id="yx-login" href="${esc(loginUrl)}" target="_blank" rel="noopener">去登录</a>
          <button class="btn" id="yx-relogin">我已登录，重试</button>
        </div>`) : `<div class="pwbar">
          <input id="yx-pwd" placeholder="提取码（如需要）" value="${esc(state.ctx.pwd || '')}">
          <button class="btn" id="yx-retry">重试</button>
        </div>`}</div>`;
      const retry = box.querySelector('#yx-retry');
      const relogin = box.querySelector('#yx-relogin');
      const pwd = box.querySelector('#yx-pwd');
      const authBtn = box.querySelector('#yx-auth');
      const again = () => parseShare(state.shareUrl || location.href, pwd ? pwd.value : '');
      if (retry) retry.addEventListener('click', again);
      if (relogin) relogin.addEventListener('click', again);
      if (authBtn) authBtn.addEventListener('click', doBaiduAuth);
      if (pwd) {
        pwd.addEventListener('keydown', (e) => { if (e.key === 'Enter') again(); });
        if (needPwd) setTimeout(() => pwd.focus(), 30);
      }
      return;
    }

    const items = visibleItems();
    if (!items.length) {
      box.innerHTML = `<div class="empty"><div class="big">${ICON.folder}</div>${state.items.length ? '没有匹配的文件' : '此目录为空'}</div>`;
      return;
    }

    box.innerHTML = items.map((it) => rowHTML(it)).join('');
  }

  function rowHTML(it) {
    const sel = state.selected.has(it.fid) ? 'checked' : '';
    const ext = it.dir ? 'DIR' : (extOf(it.name) || 'FILE');
    const extCls = it.dir ? 'ext folder' : 'ext';
    const bg = it.dir ? '' : `style="background:${extColor(ext)}"`;
    const busy = state.busy.has(it.fid);
    const task = it.dir ? null : DL.get(it.fid);
    const dlTxt = !task ? '下载'
      : task.status === 'run' ? '暂停'
        : (task.status === 'pause' || task.status === 'err') ? '继续' : '下载';
    const dlCls = task && (task.status === 'run' || task.status === 'pause' || task.status === 'err')
      ? 'mini warn' : 'mini';
    const ops = it.dir
      ? `<button class="mini solid" data-act="enter">进入</button>`
      : `<button class="mini solid" data-act="copy" ${busy ? 'disabled' : ''}>复制</button>
         <button class="${dlCls}" data-act="dl" ${busy ? 'disabled' : ''}>${dlTxt}</button>
         <button class="mini" data-act="more" title="更多">⋯</button>`;
    const stateTxt = busy ? '<span class="state">取链中…</span>' : '<span class="state" data-state></span>';

    return `<div class="row ${it.dir ? 'folder' : ''}${sel ? ' sel' : ''}" data-fid="${esc(it.fid)}">
      <label class="cb"><input type="checkbox" data-fid="${esc(it.fid)}" ${sel} ${it.dir ? 'disabled' : ''}></label>
      <div class="nm" title="${esc(it.name)}">
        <span class="${extCls}" ${bg}>${esc(ext)}</span>
        <span class="txt">${esc(it.name)}</span>
      </div>
      <div class="sz">${it.dir ? '—' : (task ? taskSZHTML(task) : fmtSize(it.size) + (busy ? '<div class="prog"><i></i></div>' : ''))}</div>
      <div class="ops">${stateTxt}${ops}</div>
    </div>`;
  }

  // 局部更新（不整表重绘，避免搜索框/滚动跳动）
  function renderRowState(fid) {
    const root = getRoot();
    if (!root) return;
    const row = root.querySelector(`.row[data-fid="${window.CSS.escape(String(fid))}"]`);
    if (!row) return;
    const item = state.items.find((i) => i.fid === fid);
    if (!item) return;
    const newHTML = rowHTML(item);
    const tmp = document.createElement('div');
    tmp.innerHTML = newHTML;
    row.replaceWith(tmp.firstElementChild);
    renderStatus();
  }

  function updateProgress(fid, pct) {
    const root = getRoot();
    if (!root) return;
    const row = root.querySelector(`.row[data-fid="${window.CSS.escape(String(fid))}"]`);
    if (!row) return;
    let bar = row.querySelector('.prog i');
    if (!bar) {
      const box = row.querySelector('.sz');
      if (!box) return;
      box.insertAdjacentHTML('beforeend', '<div class="prog"><i></i></div>');
      bar = row.querySelector('.prog i');
    }
    if (bar) bar.style.width = pct + '%';
  }

  function renderStatus() {
    const root = getRoot();
    if (!root) return;
    const el = root.getElementById('yx-status');
    const dot = root.getElementById('yx-dot');
    if (!el) return;

    if (!state.ctx) {
      el.textContent = '就绪';
      dot.className = 'dot';
      return;
    }
    const total = state.items.filter((i) => !i.dir).length;
    const dirs = state.items.length - total;
    const sel = state.selected.size;
    const tok = state.platform.id === 'baidu' && state.platform.hasToken && state.platform.hasToken();
    const mode = tok ? '令牌已授权' : (state.ctx.logged ? '登录态' : (state.platform.guestLabel || '游客态'));
    const count = dirs ? `${total} 文件 / ${dirs} 文件夹` : `${total} 个文件`;
    el.textContent = `${state.platform.name} · 共 ${count} · 已选 ${sel} · ${mode}`;
    dot.className = 'dot' + (state.ctx.logged || tok ? '' : ' guest');

    const allBtn = root.getElementById('yx-select-all');
    if (allBtn) {
      const files = visibleItems().filter((i) => !i.dir);
      const all = files.length > 0 && files.every((i) => state.selected.has(i.fid));
      allBtn.textContent = all ? '取消全选' : '全选';
    }
  }

  /* =======================================================================
   * 7. 启动
   * ===================================================================== */

  function preloadFor(url) {
    const plat = detectPlatform(url);
    if (!plat || !plat.pick(url)) return;
    if (!settings.autoParse) return;
    if (state.ctx && state.shareUrl === url) return;
    parseShare(url).then(() => {
      const root = getRoot();
      if (!root) return;
      const badge = root.getElementById('yx-badge');
      const n = state.items.filter((i) => !i.dir).length;
      if (badge && n && !state.open) {
        badge.textContent = String(n);
        badge.classList.add('on');
      }
    }).catch(() => {});
  }

  /* =======================================================================
   * 7. 接管页面按钮
   * -----------------------------------------------------------------------
   * 夸克/UC 分享页原来的「保存到网盘 / 打开 APP / 下载」对我们没用，
   * 这里在这些按钮旁边挂一个「⚡直链」，点一下就是脚本的下载面板。
   * ===================================================================== */

  const HOOK_RE = /^(保存到网盘|存到网盘|下载|立即下载|普通下载|高速下载|下载到本地|打开\s*APP|用\s*APP\s*打开|APP\s*内打开)$/i;

  function hookPageButtons() {
    if (!settings.hookButtons) return;
    if (!detectPlatform(location.href)) return;

    const scan = () => {
      // 全页面只挂一个，避免手机窄屏被挤出屏幕
      if (document.querySelector('[data-yx-hook]')) return;
      const sel = 'button, a, [role="button"], [class*="btn"], [class*="button"], [class*="Button"]';
      let nodes;
      try { nodes = document.querySelectorAll(sel); } catch (e) { return; }
      for (const el of nodes) {
        if (!el || el.dataset.yxHooked) continue;
        if (el.closest('[id^="yunx-panlink"]')) continue;
        const txt = (el.textContent || '').replace(/\s+/g, '').trim();
        if (!txt || txt.length > 10 || !HOOK_RE.test(txt)) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 56 || r.height < 22) continue;
        if (r.bottom < 0 || r.top > window.innerHeight * 3) continue;

        el.dataset.yxHooked = '1';
        const b = document.createElement('span');
        b.textContent = '直链下载';
        b.setAttribute('data-yx-hook', '1');
        b.style.cssText = [
          'display:inline-flex', 'align-items:center', 'justify-content:center',
          'height:34px', 'padding:0 13px', 'margin-left:8px', 'vertical-align:middle',
          'border-radius:9px', 'background:linear-gradient(135deg,#2f7bff,#5b9bff)',
          'color:#fff', 'font:600 13px/1 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif',
          'cursor:pointer', 'user-select:none', 'white-space:nowrap', 'letter-spacing:.5px',
          'box-shadow:0 3px 10px rgba(30,111,255,.35)', 'position:relative', 'z-index:2147482000'
        ].join(';');
        b.addEventListener('click', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          openPanel();
        }, true);
        try { el.insertAdjacentElement('afterend', b); } catch (e) { /* ignore */ }
        return;
      }
    };

    scan();
    let timer = null;
    try {
      const mo = new MutationObserver(() => {
        if (timer) return;
        timer = setTimeout(() => { timer = null; scan(); }, 600);
      });
      mo.observe(document.documentElement, { childList: true, subtree: true });
    } catch (e) { /* ignore */ }
  }

  /* =======================================================================
   * 7.5 分享页去广告
   * -----------------------------------------------------------------------
   * 只隐藏「明确是广告」的容器：class/id 里带 advert / sponsor / promo / ad-。
   * 不用 *ad* 这种宽匹配，避免把 download、upload、badge 误杀。
   * 用户可以在设置里补自己的选择器。
   * ===================================================================== */

  const AD_SELECTORS = [
    '[class*="advert"]', '[id*="advert"]',
    '[class*="Advert"]', '[id*="Advert"]',
    '[class*="sponsor"]', '[id*="sponsor"]',
    '[class*="promo-"]', '[class*="promo_"]', '[id*="promo"]',
    '[class^="ad-"]', '[class*="-ad-"]', '[class$="-ad"]',
    '[id^="ad-"]', '[id$="-ad"]',
    '[data-ad]', '[data-ad-slot]', '[data-advertisement]'
  ];

  function initAdBlock() {
    const ID = 'yx-adblock';
    const old = document.getElementById(ID);
    if (!settings.adBlock) { if (old) old.remove(); return; }
    if (old) return;

    const extra = String(settings.adExtra || '')
      .split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
    const list = AD_SELECTORS.concat(extra);

    const style = document.createElement('style');
    style.id = ID;
    (document.head || document.documentElement).appendChild(style);
    const sheet = style.sheet;
    if (!sheet) return;
    for (const sel of list) {
      try {
        sheet.insertRule(`${sel}{display:none!important}`, sheet.cssRules.length);
      } catch (e) { /* 单个选择器非法就跳过，不影响其它 */ }
    }
  }

  /* =======================================================================
   * 百度 OAuth 授权页（openapi.baidu.com）
   *   1) /oauth/2.0/authorize  → 自动点「允许」
   *   2) /oauth/2.0/login_success → 从地址栏抓 access_token 写回存储
   * 这个页面只做这两件事，不挂面板。
   * ===================================================================== */
  function yxAuthBanner(html) {
    let el = document.getElementById('yx-auth-banner');
    if (!el) {
      el = document.createElement('div');
      el.id = 'yx-auth-banner';
      el.style.cssText = [
        'position:fixed', 'z-index:2147483647', 'left:50%', 'top:18px',
        'transform:translateX(-50%)', 'background:#1b1f27', 'color:#fff',
        'padding:12px 18px', 'border-radius:12px',
        'font:14px/1.65 system-ui,-apple-system,"Segoe UI",sans-serif',
        'box-shadow:0 10px 34px rgba(0,0,0,.45)', 'max-width:88vw', 'text-align:center'
      ].join(';');
      (document.body || document.documentElement).appendChild(el);
    }
    el.innerHTML = html;
    return el;
  }

  function baiduAuthPage() {
    const href = location.href;
    // 只处理本脚本发起的授权：client_id 必须在白名单里（或 10 分钟内有本脚本发起的授权）。
    // 否则用户在授权别的应用时会被我们“帮”着点同意 —— 那是越权。
    const cid = (() => {
      try { return new URL(href).searchParams.get('client_id') || ''; } catch (e) { return ''; }
    })();
    const pendingAt = Number(GMStore.get('yx_baidu_auth_pending', 0) || 0);
    const ours = BAIDU_CLIENTS.indexOf(cid) >= 0 ||
      (pendingAt > 0 && Date.now() - pendingAt < 10 * 60 * 1000);
    if (!ours) return;

    // ① 授权确认页：自动点「允许」，省掉用户找按钮
    if (/\/oauth\/2\.0\/authorize/.test(href)) {
      if (cid) GMStore.set('yx_baidu_auth_pending', Date.now());
      const onLoginBox = !!document.querySelector('#TANGRAM_3__submit, .pass-form');
      yxAuthBanner(
        onLoginBox
          ? '云析直链：请先在此页<b>登录百度账号</b><br>' +
            '<span style="opacity:.65;font-size:12px">登录后本页会自动帮你点「允许」</span>'
          : '云析直链：正在自动确认授权…'
      );
      let n = 0;
      const iv = setInterval(() => {
        n++;
        const btn =
          document.querySelector('#auth-allow') ||
          document.querySelector('button[class*="allow"]') ||
          Array.from(document.querySelectorAll('button, a, input[type=button], input[type=submit]'))
            .find((b) => /^(允许|授权|同意|允许访问|确认授权)/.test((b.innerText || b.value || '').trim()));
        if (btn && !/submit/i.test(btn.id || '')) {
          clearInterval(iv);
          try { btn.click(); } catch (e) { /* ignore */ }
          yxAuthBanner('云析直链：已自动点击「允许」，正在跳转…');
          return;
        }
        if (n > 900) clearInterval(iv); // 最多等 6 分钟
      }, 400);
      return;
    }

    // ② 授权成功页：地址栏里带 access_token
    if (/login_success/.test(href)) {
      let saved = false;
      const grab = () => {
        if (saved) return true;
        const m = String(location.href).match(/access_token=([^&#]+)/);
        if (!m) return false;
        const token = decodeURIComponent(m[1]);
        if (!token || token.length < 16) return false;
        saved = true;
        try {
          GMStore.set(BAIDU_TOKEN_KEY, token);
          GMStore.set('baidu_access_token_at', Date.now());
        } catch (e) { /* ignore */ }
        // 无 GM 环境（手机脚本引擎）时，跨域写不进主页面，给用户手动复制的兜底
        const manual = !HAS_GM_STORE;
        yxAuthBanner(
          '✅ 百度授权成功' +
            (manual
              ? '<br><span style="font-size:12px;opacity:.8">请长按复制下面这串令牌，回到网盘页面粘贴：</span>' +
                `<br><textarea readonly style="width:min(520px,80vw);height:64px;margin-top:8px;font-size:12px;background:#0e1116;color:#8fd;border:1px solid #333;border-radius:8px;padding:6px">${token}</textarea>`
              : '<br><span style="font-size:12px;opacity:.75">令牌已保存，3 秒后自动关闭本页</span>')
        );
        if (!manual) setTimeout(() => { try { window.close(); } catch (e) { /* ignore */ } }, 2800);
        return true;
      };
      if (grab()) return;
      yxAuthBanner('云析直链：等待百度返回授权结果…');
      let n = 0;
      const iv = setInterval(() => {
        n++;
        if (grab() || n > 900) clearInterval(iv);
      }, 200);
      return;
    }

    // ③ 其它 openapi 页面：不打扰
  }

  /* =======================================================================
   * 7. 自动更新（分发源：GitHub raw）
   * -----------------------------------------------------------------------
   * @updateURL / @downloadURL 已指向仓库，脚本管理器会自己按周期拉新版；
   * 这里再补一层：面板内手动检查 + 每 24 小时静默检查，方便看版本差异。
   * ===================================================================== */

  const RAW_URL =
    'https://raw.githubusercontent.com/zjkl0330/tampermonkey/main/js/%E4%BA%91%E6%9E%90%E7%9B%B4%E9%93%BE.user.js';
  const REPO_URL = 'https://github.com/zjkl0330/tampermonkey';

  function vnum(v) {
    return String(v || '0').split('.').map((x) => parseInt(x, 10) || 0);
  }

  function cmpVersion(a, b) {
    const x = vnum(a);
    const y = vnum(b);
    const n = Math.max(x.length, y.length);
    for (let i = 0; i < n; i++) {
      const d = (x[i] || 0) - (y[i] || 0);
      if (d) return d > 0 ? 1 : -1;
    }
    return 0;
  }

  async function fetchRemoteVersion() {
    // 只要脚本头 2KB：Range 是 CORS 安全请求头，不用预检；
    // 整包 16 万字节在部分手机浏览器里读 body 会卡住，取头又准又快
    const res = await gmRequest({
      method: 'GET',
      url: `${RAW_URL}?t=${Date.now()}`,
      headers: { 'Range': 'bytes=0-2047' },
      // 跨域拉 raw 不能带 Cookie：对方允许源是 *，带凭据会被浏览器直接判 CORS 失败
      credentials: 'omit',
      timeout: 15000
    });
    const code = res && res.status;
    if (!(code >= 200 && code < 300)) throw new Error(`拉取失败（HTTP ${code || 0}）`);
    const text = String((res && res.responseText) || '').slice(0, 4096);
    const m = text.match(/@version\s+([0-9][0-9.]*)/);
    if (!m) throw new Error('远端脚本头里没有 @version');
    return m[1];
  }

  function openInstallPage() {
    try {
      if (typeof GM_openInTab === 'function') {
        GM_openInTab(RAW_URL, { active: true, insert: true });
        return;
      }
    } catch (e) { /* ignore */ }
    window.open(RAW_URL, '_blank', 'noopener');
  }

  function renderUpdateLine() {
    const root = typeof getRoot === 'function' ? getRoot() : null;
    const el = root && root.getElementById('yx-update-line');
    if (!el) return;
    const info = state.updateInfo;
    if (info && info.has) {
      el.innerHTML = `版本 v${APP.version} → <b style="color:#fbbf24">v${esc(info.latest)}</b> 可更新`;
    } else if (info && info.has === false) {
      el.textContent = `版本 v${APP.version} · 已是最新`;
    } else {
      el.textContent = `版本 v${APP.version} · 无口令 / 无授权码`;
    }
  }

  async function checkUpdate(manual) {
    if (manual) toastRootPush('正在检查更新…', 'info', 1200);
    try {
      const latest = await fetchRemoteVersion();
      const has = cmpVersion(latest, APP.version) > 0;
      state.updateInfo = { latest, has };
      GMStore.set('yx_update', { t: Date.now(), latest, has });
      renderUpdateLine();
      if (has) {
        toastRootPush(`${manual ? '' : '发现新版本 '}v${latest}（当前 v${APP.version}）`, 'warn', 6000);
        if (manual && confirm(`发现新版本 v${latest}\n当前版本 v${APP.version}\n\n现在打开安装页覆盖更新？`)) {
          openInstallPage();
        }
      } else if (manual) {
        toastRootPush(`已是最新版本 v${APP.version}`);
      }
      return { latest, has };
    } catch (e) {
      if (manual) {
        toastRootPush(`检查更新失败：${e.message || e}｜raw 域名国内可能不通，可到项目主页手动下载`, 'err', 5200);
      }
      return null;
    }
  }

  function boot() {
    DL.restore();
    mountUI();
    hookPageButtons();
    initAdBlock();
    bindPageSelectionWatcher();

    try {
      if (typeof GM_registerMenuCommand === 'function') {
        GM_registerMenuCommand('⚡ 打开直链面板', () => openPanel());
        GM_registerMenuCommand('⚙ 云析直链设置', () => { state.settingsOpen = true; openPanel(); render(); });
      }
    } catch (e) { /* ignore */ }

    // 只在分享页自动预解析
    if (detectPlatform(location.href)) preloadFor(location.href);

    // 每 24 小时静默查一次新版：有更新才弹提示，没有就完全不打扰
    try {
      const up = GMStore.get('yx_update', {}) || {};
      if (!up.t || Date.now() - Number(up.t) > 24 * 3600 * 1000) checkUpdate(false);
      else if (up.latest) state.updateInfo = { latest: up.latest, has: !!up.has };
    } catch (e) { /* ignore */ }

    window.addEventListener('beforeunload', () => DL.save());

    // SPA 路由变化
    let lastHref = location.href;
    setInterval(() => {
      if (location.href === lastHref) return;
      lastHref = location.href;
      if (detectPlatform(location.href)) {
        resetShare();
        preloadFor(location.href);
        hookPageButtons();
      }
    }, 1200);
  }

  // 百度 OAuth 授权页只做「自动授权 + 收 token」，不加载面板
  if (/(^|\.)openapi\.baidu\.com$/.test(location.hostname)) {
    baiduAuthPage();
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
