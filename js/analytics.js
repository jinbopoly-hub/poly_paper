/* Shared publication analytics. Existing presentation and navigation are untouched. */
(() => {
  'use strict';
  const id = 'G-4NG557NVB4';
  const optOutKey = 'poly-paper-analytics-opt-out';
  let optedOut = false;
  try { optedOut = localStorage.getItem(optOutKey) === 'true'; } catch (_) {}
  window.polyPaperAnalyticsOptOut = () => {
    window['ga-disable-' + id] = true;
    try { localStorage.setItem(optOutKey, 'true'); } catch (_) {}
    document.cookie.split(';').forEach(cookie => {
      const name = cookie.trim().split('=')[0];
      if (name === '_ga' || name.startsWith('_ga_')) {
        for (const domain of ['', location.hostname, '.' + location.hostname]) {
          document.cookie = name + '=; Max-Age=0; Path=/' + (domain ? '; Domain=' + domain : '');
        }
      }
    });
    const message = document.getElementById('analytics-status');
    if (message) message.textContent = '이 브라우저의 방문 통계 수집을 중지했습니다.';
  };
  if (optedOut || !['jinbopoly-hub.github.io'].includes(location.hostname)) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  const publication = document.querySelector('meta[name="publication-id"]')?.content || 'main';
  // Exclude arbitrary query strings and external referrer queries from analytics.
  const cleanUrl = location.origin + location.pathname;
  let referrer = '';
  try { const url = new URL(document.referrer); referrer = url.origin + url.pathname; } catch (_) {}
  gtag('js', new Date());
  gtag('config', id, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    page_location: cleanUrl,
    page_referrer: referrer,
    publication_id: publication
  });
  const loader = document.createElement('script');
  loader.async = true;
  loader.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
  document.head.appendChild(loader);

  function init() {
    const articles = [...document.querySelectorAll('section[id^="section-"]')];
    const records = new Map(articles.map(el => [el, {
      el, id: el.id, title: el.querySelector('.section-title')?.textContent.trim() || el.id,
      viewed: false, activeMs: 0, sentMs: 0, progress: new Set()
    }]));
    let lastInteraction = performance.now();
    let lastTick = lastInteraction;
    const active = () => document.visibilityState === 'visible' && document.hasFocus() && performance.now() - lastInteraction < 60000;
    ['scroll', 'pointerdown', 'keydown', 'touchstart'].forEach(name => {
      window.addEventListener(name, () => { lastInteraction = performance.now(); }, { passive: true });
    });
    window.addEventListener('focus', () => { lastInteraction = lastTick = performance.now(); });
    function emit(name, record, extra = {}) {
      if (window['ga-disable-' + id]) return;
      gtag('event', name, {
        publication_id: publication, article_id: record.id,
        article_title: record.title, ...extra
      });
    }
    function flush(record) {
      const seconds = Math.floor((record.activeMs - record.sentMs) / 1000);
      if (!record.viewed || seconds < 1) return;
      emit('article_engagement', record, { reading_seconds: seconds, transport_type: 'beacon' });
      record.sentMs += seconds * 1000;
    }
    function tick() {
      const now = performance.now();
      const delta = Math.min(Math.max(now - lastTick, 0), 2000);
      lastTick = now;
      if (!active()) return;
      // A single reading position prevents counting two articles at once.
      const line = Math.min(innerHeight * 0.4, 320);
      for (const [el, record] of records) {
        const rect = el.getBoundingClientRect();
        if (!(rect.top <= line && rect.bottom > line)) continue;
        record.activeMs += delta;
        if (!record.viewed && record.activeMs >= 2000) {
          record.viewed = true;
          emit('article_view', record);
        }
        if (record.viewed) {
          const depth = Math.min(100, Math.max(0, (innerHeight - rect.top) / rect.height * 100));
          // Do not claim lower milestones were read when someone jumps into the middle.
          const reached = [25, 50, 75, 100].filter(value => depth >= value).pop();
          if (reached && !record.progress.has(reached)) {
            record.progress.add(reached);
            emit('article_progress', record, { percent_scrolled: reached });
          }
          if (record.activeMs - record.sentMs >= 15000) flush(record);
        }
        break;
      }
    }
    setInterval(tick, 1000);
    const flushAll = () => { tick(); records.forEach(flush); };
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushAll();
      else { lastTick = lastInteraction = performance.now(); }
    });
    window.addEventListener('pagehide', flushAll);
    window.addEventListener('blur', flushAll);
    document.addEventListener('click', event => {
      const link = event.target.closest('a[href]');
      if (link) {
        const url = new URL(link.href, location.href);
        const record = records.get(document.getElementById(url.hash.slice(1)));
        if (url.pathname === location.pathname && record) {
          emit('select_content', record, { content_type: 'article', item_id: record.id });
        }
      }
      const button = event.target.closest('.section-share .share-button');
      if (button) {
        const record = records.get(button.closest('section'));
        const index = [...button.parentElement.querySelectorAll('.share-button')].indexOf(button);
        // The original Kakao button has no share handler, so it is not counted.
        if (record && index !== 2) emit('share', record, { method: ['X', 'Facebook', '', 'copy_link'][index], content_type: 'article', item_id: record.id });
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
