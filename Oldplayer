/* =========================================================================
 *  OmniFlix · Stellar Player
 *  Drop-in multi-source video embed with auto-fallback.
 *
 *  Public, source-agnostic API:
 *    player.playMovie(tmdbId)
 *    player.playEpisode(tmdbId, season, episode)
 *    player.next()                  // jump to next fallback source
 *    player.setSource(index)        // force a specific source
 *    player.listSources()           // [{ index, name }]
 *    player.currentSourceName()
 *
 *  Sources are exposed to the UI under majestic constellation names ONLY.
 *  No provider domain is leaked through any public surface.
 *
 *  Order (auto-rotates if a source fails or never reports playback):
 *    1. Lumen       — primary (Hindi dub preferred)
 *    2. Aurora      (Hindi audio)
 *    3. Nebula
 *    4. Stellar     (VidRock, enterprise-grade)
 *    5. Eclipse     (Hindi dub)
 *    6. Solstice    (Hindi dub)
 *    7. Halo        (Hindi audio, Multi-Lang server)
 *    8. Orion       (Hindi audio, Multi-Lang server)
 *    9. Vega        (Hindi audio, Multi-Lang server)
 * ========================================================================= */

(function (global) {
  'use strict';

  // ── Provider origins (used only internally) ────────────────────────────────
  const O_A  = 'https://web.nxsha.app';      // Aurora / Halo / Orion / Vega
  const O_B  = 'https://cinemaos.tech';      // Nebula
  const O_C  = 'https://peachify.top';       // Eclipse / Lumen / Solstice
  const O_VR = 'https://vidrock.ru';         // Stellar (VidRock)
  const TRUSTED_ORIGINS = [O_A, O_B, O_C, O_VR];

  const NO_SOURCE_WATCHDOG_MS = 300000;
  const PROGRESS_STORAGE_KEY  = 'peachifyProgress'; // kept for cross-source resume

  // ── helpers ────────────────────────────────────────────────────────────────
  function validId(id) {
    if (id == null) return false;
    if (typeof id === 'number') return Number.isFinite(id) && id > 0;
    if (typeof id !== 'string') return false;
    if (/^\d+$/.test(id)) return true;
    if (/^tt\d{6,}$/.test(id)) return true;
    return false;
  }

  function readProgressStore() {
    try { return JSON.parse(localStorage.getItem(PROGRESS_STORAGE_KEY) || '{}'); }
    catch (_) { return {}; }
  }
  function writeProgressStore(store) {
    try { localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(store)); } catch (_) {}
  }
  function resumeFor(ctx) {
    const store = readProgressStore();
    const rec = store[String(ctx.id)];
    if (!rec) return 0;
    if (ctx.type === 'tv') {
      const key = `s${ctx.season}e${ctx.episode}`;
      const ep = rec.show_progress && rec.show_progress[key];
      return ep && ep.progress ? Math.floor(ep.progress.watched || 0) : 0;
    }
    return rec.progress ? Math.floor(rec.progress.watched || 0) : 0;
  }

  // ── URL builders ───────────────────────────────────────────────────────────
  // (VR) VidRock — official-grade, no params; postMessage protocol for progress + events.
  //      Movies:  https://vidrock.ru/movie/{tmdb_id}
  //      Series:  https://vidrock.ru/tv/{tmdb_id}/{season}/{episode}
  function buildVidrockUrl(ctx /*, opts */) {
    const path = ctx.type === 'tv'
      ? `/tv/${ctx.id}/${ctx.season}/${ctx.episode}`
      : `/movie/${ctx.id}`;
    return `${O_VR}${path}`;
  }

  // (A) Nxsha — bare URL is most reliable; params only when forced as fallback.
  function buildAuroraUrl(ctx, opts = {}) {
    const path = ctx.type === 'tv'
      ? `/embed/tv/${ctx.id}/${ctx.season}/${ctx.episode}`
      : `/embed/movie/${ctx.id}`;
    const p = new URLSearchParams();
    if (opts.lang)       p.set('lang', opts.lang);
    if (opts.sub)        p.set('sub', opts.sub);
    if (opts.server)     p.set('server', opts.server);
    if (opts.one_server) p.set('one_server', 'true');
    const qs = p.toString();
    return `${O_A}${path}${qs ? '?' + qs : ''}`;
  }

  // (B) CinemaOS — documented player route, theme + autoPlay
  function buildNebulaUrl(ctx, opts = {}) {
    const path = ctx.type === 'tv'
      ? `/player/${ctx.id}/${ctx.season}/${ctx.episode}`
      : `/player/${ctx.id}`;
    const p = new URLSearchParams();
    if (opts.accent)   p.set('theme', String(opts.accent).replace('#',''));
    if (opts.autoPlay !== false) p.set('autoPlay', 'true');
    p.set('title', 'false');
    p.set('poster', 'false');
    if (ctx.type === 'tv') {
      if (opts.autoNext != null) p.set('autoNext', String(opts.autoNext));
      if (opts.showNextBtn === false) p.set('nextButton', 'false');
    }
    const startAt = opts.startAt != null ? opts.startAt : resumeFor(ctx);
    if (startAt && startAt > 5) p.set('startTime', Math.floor(startAt));
    return `${O_B}${path}?${p.toString()}`;
  }

  // (C) Peachify — clean by default; opts add dub / quality / hide flags.
  function buildPeachifyUrl(ctx, opts = {}) {
    const path = ctx.type === 'tv'
      ? `/embed/tv/${ctx.id}/${ctx.season}/${ctx.episode}`
      : `/embed/movie/${ctx.id}`;
    const p = new URLSearchParams();
    if (opts.dub)      p.set('dub', opts.dub);
    if (opts.audio)    p.set('audio', opts.audio);
    if (opts.sub)      p.set('sub', opts.sub);
    if (opts.subtitle) p.set('subtitle', opts.subtitle);
    if (opts.quality)  p.set('quality', String(opts.quality));
    if (opts.server)   p.set('server', opts.server);
    if (opts.api)      p.set('api', opts.api);
    if (opts.accent)   p.set('accent', String(opts.accent).replace('#',''));
    if (opts.autoPlay === false) p.set('autoPlay', 'false');
    if (ctx.type === 'tv') {
      if (opts.autoNext != null) p.set('autoNext', String(opts.autoNext));
      if (opts.showNextBtn === false) p.set('showNextBtn', 'false');
    }
    const startAt = opts.startAt != null ? opts.startAt : resumeFor(ctx);
    if (startAt && startAt > 5) p.set('startAt', Math.floor(startAt));
    const isHide = (v) => v === false || v === 0 || v === 'false' || v === '0' || v === 'off' || v === 'hide';
    const hideKeys = ['pip','cast','fullscreen','volume','servers','captions','quality',
                      'play','rewind','forward','timegroup','timeslider','settings'];
    if (opts.hide && typeof opts.hide === 'object') {
      hideKeys.forEach(k => { if (isHide(opts.hide[k])) p.set(k, 'hide'); });
    }
    const qs = p.toString();
    return `${O_C}${path}${qs ? '?' + qs : ''}`;
  }

  // ── Default fallback chain (Aurora first, Nebula second) ───────────────────
  function defaultChain() {
    // Hindi audio/dub is the preferred default on every source that supports it.
    return [
                                            // 1. PRIMARY
      { name: 'Aurora',   kind: 'aurora',    opts: { lang: 'hi' } },  
       { name: 'Lumen',    kind: 'peachify',  opts: { dub: 'Hindi' } },   // 2.
      { name: 'Nebula',   kind: 'nebula',    opts: {} },                                                        // 3.
      { name: 'Stellar',  kind: 'vidrock',   opts: {} },                                                        // 4. VidRock
      { name: 'Eclipse',  kind: 'peachify',  opts: { dub: 'Hindi' } },                                          // 5.
      { name: 'Solstice', kind: 'peachify',  opts: { dub: 'Hindi' } },                                          // 6.
      { name: 'Halo',     kind: 'aurora',    opts: { server: 'MbPly-[Multi-Lang]',  lang: 'hi' } },             // 7.
      { name: 'Orion',    kind: 'aurora',    opts: { server: 'ZetPly-[Multi-Lang]', lang: 'hi' } },             // 8.
      { name: 'Vega',     kind: 'aurora',    opts: { server: 'Xuhd-[Multi-Lang]',   lang: 'hi' } }              // 9.
    ];
  }

  // ── main class ─────────────────────────────────────────────────────────────
  class StellarPlayer {
    constructor(target, options = {}) {
      this.host = (typeof target === 'string') ? document.querySelector(target) : target;
      if (!this.host) throw new Error('StellarPlayer: target element not found');

      this.opts = Object.assign({
        accent: null,
        autoPlay: true,
        autoNext: true,
        showNextBtn: true,
        hide: null,
        servers: defaultChain(),
        onEvent: null,
        onProgress: null,
        onSourceChange: null,
        onLoading: null
      }, options || {});

      this.ctx          = null;
      this.serverIndex  = 0;
      this._watchdog    = null;
      this._token       = 0;
      this._iframe      = null;

      this._installListener();
    }

    // ----- public API --------------------------------------------------------
    playMovie(id, perCallOpts) {
      if (!validId(id)) { console.warn('StellarPlayer: invalid id', id); return false; }
      this.ctx = { type: 'movie', id, _opts: perCallOpts || {} };
      this.serverIndex = 0;
      this._mount();
      return true;
    }
    playEpisode(id, season, episode, perCallOpts) {
      if (!validId(id)) { console.warn('StellarPlayer: invalid id', id); return false; }
      this.ctx = { type: 'tv', id, season, episode, _opts: perCallOpts || {} };
      this.serverIndex = 0;
      this._mount();
      return true;
    }
    next()    { this._rotate('manual next()'); }
    setSource(i) {
      if (i < 0 || i >= this.opts.servers.length) return;
      this.serverIndex = i;
      this._mount();
    }
    listSources()  { return this.opts.servers.map((s, i) => ({ index: i, name: s.name })); }
    currentSourceName() {
      const s = this.opts.servers[this.serverIndex];
      return s ? s.name : null;
    }
    destroy() {
      this._clearWatchdog();
      this.host.innerHTML = '';
      this._iframe = null;
      window.removeEventListener('message', this._onMessage);
    }

    // back-compat alias methods (in case older code calls these names)
    setServer(i)         { return this.setSource(i); }
    listServers()        { return this.listSources(); }
    currentServerName()  { return this.currentSourceName(); }

    // ----- internals ---------------------------------------------------------
    _mount() {
      if (!this.ctx) return;
      const srv = this.opts.servers[this.serverIndex];
      if (!srv) return;

      const merged = Object.assign({
        accent: this.opts.accent,
        autoPlay: this.opts.autoPlay,
        autoNext: this.opts.autoNext,
        showNextBtn: this.opts.showNextBtn,
        hide: this.opts.hide
      }, srv.opts || {}, this.ctx._opts || {});

      let url;
      if      (srv.kind === 'vidrock')   url = buildVidrockUrl(this.ctx, merged);
      else if (srv.kind === 'aurora')    url = buildAuroraUrl(this.ctx, merged);
      else if (srv.kind === 'nebula')    url = buildNebulaUrl(this.ctx, merged);
      else                               url = buildPeachifyUrl(this.ctx, merged);

      // signal loading
      if (typeof this.opts.onLoading === 'function') this.opts.onLoading(true, srv.name);
      if (typeof this.opts.onSourceChange === 'function') this.opts.onSourceChange(srv.name, this.serverIndex);

      // Replace iframe
      this.host.innerHTML = '';
      const ifr = document.createElement('iframe');
      ifr.src = url;
      ifr.style.cssText = 'width:100%;height:100%;border:0;display:block;background:#000;';
      ifr.setAttribute('allowfullscreen', '');
      ifr.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen; clipboard-write');
      ifr.setAttribute('referrerpolicy', 'origin');
      ifr.setAttribute('loading', 'eager');
      this._iframe = ifr;
      this.host.appendChild(ifr);

      this._armWatchdog();
    }

    _armWatchdog() {
      this._clearWatchdog();
      const token = ++this._token;
      this._watchdog = setTimeout(() => {
        if (token !== this._token) return;
        this._rotate('no playback signal (timeout)');
      }, NO_SOURCE_WATCHDOG_MS);
    }
    _clearWatchdog() {
      if (this._watchdog) { clearTimeout(this._watchdog); this._watchdog = null; }
      this._token++;
    }

    _rotate(reason) {
      const next = this.serverIndex + 1;
      if (next >= this.opts.servers.length) {
        console.warn('[StellarPlayer] All sources exhausted —', reason);
        if (typeof this.opts.onLoading === 'function') {
          this.opts.onLoading(false, this.currentSourceName(), 'exhausted');
        }
        return;
      }
      this.serverIndex = next;
      const name = this.opts.servers[next].name;
      console.info('[StellarPlayer] Rotating to', name, '—', reason);
      this._mount();
    }

    _installListener() {
      this._onMessage = (event) => {
        if (!TRUSTED_ORIGINS.includes(event.origin)) return;
        const msg = event.data;
        if (!msg || typeof msg !== 'object') return;

        if (msg.type === 'MEDIA_DATA' && msg.data) {
          // VidRock sends an Array; peachify sends an Object keyed by id (or 'm<id>').
          // Merge both shapes into our unified progress store so resume works
          // across every source automatically.
          const store = readProgressStore();
          if (Array.isArray(msg.data)) {
            msg.data.forEach((rec) => {
              if (!rec || rec.id == null) return;
              store[String(rec.id)] = rec;
            });
          } else {
            Object.keys(msg.data).forEach(k => {
              const rec = msg.data[k];
              if (!rec) return;
              const key = rec.id != null ? String(rec.id) : String(k).replace(/^m/, '');
              store[key] = rec;
            });
          }
          writeProgressStore(store);
          // Also mirror to the legacy 'vidRockProgress' key for any code that
          // reads it directly (per VidRock docs).
          try { localStorage.setItem('vidRockProgress', JSON.stringify(Object.values(store))); } catch(_) {}
          if (typeof this.opts.onProgress === 'function') this.opts.onProgress(store);
        }

        if (msg.type === 'PLAYER_EVENT' && msg.data) {
          this._clearWatchdog();
          if (typeof this.opts.onLoading === 'function') this.opts.onLoading(false, this.currentSourceName());
          if (typeof this.opts.onEvent === 'function') this.opts.onEvent(msg.data);
          const ev = msg.data.event;
          if (ev === 'error' || ev === 'no_sources' || ev === 'sources_failed') {
            this._rotate('source reported: ' + ev);
          }
        }
      };
      window.addEventListener('message', this._onMessage);
    }
  }

  // Expose
  StellarPlayer.defaultChain = defaultChain;
  global.StellarPlayer  = StellarPlayer;
  // Back-compat global so any older code keeps working
  global.PeachifyPlayer = StellarPlayer;
})(typeof window !== 'undefined' ? window : globalThis);
