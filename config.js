/* =========================================================================
 *  OmniFlix · Runtime Configuration
 *  -------------------------------------------------------------------------
 *  Edit this file ONLY. No build step. No code changes needed elsewhere.
 *
 *  TMDB is geo-restricted in some regions. To make the catalogue reach
 *  globally, route every TMDB API call AND every TMDB image through
 *  your own Cloudflare Worker. One URL handles both. See the companion
 *  file `cloudflare-worker.js` and `PROXY-SETUP.md`.
 *
 *  ┌─────────────────────────────────────────────────────────────────┐
 *  │  1.  Deploy `cloudflare-worker.js` to Cloudflare Workers.       │
 *  │  2.  Copy your *.workers.dev URL into TMDB_PROXY_BASE below.    │
 *  │  3.  Refresh the app.  That's it.                               │
 *  └─────────────────────────────────────────────────────────────────┘
 * ========================================================================= */

window.OMNIFLIX_CONFIG = {

  // ── TMDB proxy URL ─────────────────────────────────────────────────
  // Paste your Cloudflare Worker URL here (no trailing slash, no /3).
  // The Worker handles BOTH the API and the image CDN automatically —
  // by path:
  //     /3/...    →  api.themoviedb.org
  //     /t/p/...  →  image.tmdb.org
  //
  // Leave empty ('') to call TMDB directly (only works where the API
  // and the CDN aren't blocked).
  //
  //   Example:  'https://tmdb.your-name.workers.dev'
  //   Example:  'https://tmdb-proxy.example.com'
  //
  TMDB_PROXY_BASE: 'https://tmdb.pasamaraooo49.workers.dev/',

  // ── Image proxying (optional, advanced) ────────────────────────────
  // By default, when TMDB_PROXY_BASE is set, **images also go through
  // the same Worker** (TMDB images can be blocked in some regions too).
  //
  // Set this to false if you'd rather have only the API proxied and
  // load images directly from image.tmdb.org — saves Worker requests
  // (Cloudflare free tier = 100k/day, and every poster counts).
  //
  PROXY_IMAGES: true,

  // ── Picture-in-Picture (mini-player) default ───────────────────────
  // true  → PiP/mini mode is ON by default for new visitors.
  // false → PiP/mini mode is OFF by default.
  // Users can always flip the switch in Settings → Mini player.
  //
  PIP_DEFAULT_ENABLED: true,
};