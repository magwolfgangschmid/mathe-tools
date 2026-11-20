/* =========================================================
   shared/components.js – Web Components für das Mathe-Portal
   Enthält:
   - <app-header>        Kopfleiste: Zurück-Button, Titel, Hell/Dunkel-Schalter
   - <app-mode-toolbar>  Tabs (Üben/Regeln), Manuell/Adaptiv, Schwellenregler

   Einbinden (im <head>, ohne defer, damit der Dark-Mode vor dem
   ersten Zeichnen gesetzt wird):
   <link rel="stylesheet" href="../../shared/style.css">
   <script src="../../shared/components.js"></script>

   Die Komponenten nutzen kein Shadow DOM, damit shared/style.css
   (Farbvariablen, .chip, .card …) direkt greift.

   Cache (GitHub Pages): Versionsnummer anhängen und bei Änderungen erhöhen:
   <script src="../../shared/components.js?v=2026-11-20"></script>

   Hilfsfunktionen für die Apps: window.MathPortal.ui (siehe unten am Dateiende).
   ========================================================= */
(function () {
  'use strict';

  /* ---------- Theme (Hell/Dunkel), geteilt über localStorage ---------- */
  const KEY = 'theme';                       // gleicher Schlüssel wie in den bisherigen Apps
  const root = document.documentElement;

  const THEMES = ['light', 'dark', 'sunset'];
  function normalizeTheme(t) { return THEMES.includes(t) ? t : 'light'; }
  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function currentTheme() {
    if (root.classList.contains('sunset')) return 'sunset';
    if (root.classList.contains('dark')) return 'dark';
    return 'light';
  }
  function nextTheme(t) {
    const idx = THEMES.indexOf(normalizeTheme(t));
    return THEMES[(idx + 1) % THEMES.length];
  }

  function apply(theme) {
    const t = normalizeTheme(theme);
    root.classList.toggle('dark', t === 'dark');
    root.classList.toggle('sunset', t === 'sunset');
    root.dataset.theme = t;
    root.style.colorScheme = t === 'light' ? 'light' : 'dark';
    document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: t } }));
  }
  function setTheme(theme) {
    const t = normalizeTheme(theme);
    try { localStorage.setItem(KEY, t); } catch (e) {}
    apply(t);
  }

  // Beim Laden: gespeicherte Wahl, sonst Systemeinstellung
  apply(stored() || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  // Wechsel in einem anderen Browser-Tab übernehmen
  addEventListener('storage', function (e) { if (e.key === KEY && e.newValue) apply(e.newValue); });

  /* ---------- Hilfsfunktionen ---------- */
  // Attribut als Schalter lesen: fehlt es, gilt def; "false" schaltet aus
  function flag(el, name, def) {
    return el.hasAttribute(name) ? el.getAttribute(name) !== 'false' : def;
  }
  function svg(path) {
    return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + '</svg>';
  }
  const ICON = {
    back: '<path d="M15 6l-6 6 6 6"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    sunset: '<path d="M17 18a5 5 0 0 0-10 0"/><path d="M12 9v2"/><path d="m4.2 10.2 1.4 1.4"/><path d="M18.4 11.6l1.4-1.4"/><path d="M2 18h20"/><path d="M7 22h10"/>'
  };
  function refs(el) {
    const r = {};
    el.querySelectorAll('[data-ref]').forEach(function (n) { r[n.dataset.ref] = n; });
    return r;
  }

  /* =========================================================
     <app-header>
     Attribute:
       title       Seitentitel
       subtitle    kleine Zeile unter dem Titel (optional)
       back-url    Ziel des Zurück-Buttons, z. B. "../../"
                   "history" = Schritt zurück im Browserverlauf
                   fehlt das Attribut, wird der Button ausgeblendet
       back-label  Beschriftung des Buttons (Standard: "Zurück")
     Hinweis: Das title-Attribut wird intern übernommen und vom Element
     entfernt, damit der Browser keinen Tooltip über der ganzen Leiste zeigt.
     ========================================================= */
  class AppHeader extends HTMLElement {
    static get observedAttributes() { return ['title', 'subtitle', 'back-url', 'back-label']; }

    get heading() { return this._title || ''; }

    connectedCallback() {
      if (!this._ready) {
        this.innerHTML =
          '<div class="portal-header">' +
            '<a class="portal-btn portal-back" data-ref="back" href="#">' + svg(ICON.back) +
              '<span class="portal-back-label" data-ref="backLabel"></span></a>' +
            '<div class="portal-heading">' +
              '<h1 class="portal-title" data-ref="title"></h1>' +
              '<p class="portal-subtitle mute small" data-ref="sub"></p></div>' +
            '<button type="button" class="portal-btn portal-theme" data-ref="theme"></button>' +
          '</div>';
        this._r = refs(this);
        this._r.back.addEventListener('click', (e) => {
          if (this.getAttribute('back-url') === 'history') { e.preventDefault(); history.back(); }
        });
        this._r.theme.addEventListener('click', () => setTheme(nextTheme(currentTheme())));
        this._ready = true;
      }
      this._onTheme = () => this._renderTheme();
      document.addEventListener('themechange', this._onTheme);
      this._render();
    }

    disconnectedCallback() { document.removeEventListener('themechange', this._onTheme); }

    attributeChangedCallback() { if (this._ready) this._render(); }

    _render() {
      const r = this._r;
      const t = this.getAttribute('title');
      if (t !== null) { this._title = t; this.removeAttribute('title'); }   // kein Tooltip
      r.title.textContent = this._title || '';

      const sub = this.getAttribute('subtitle') || '';
      r.sub.textContent = sub;
      r.sub.classList.toggle('hidden', !sub);

      const url = this.getAttribute('back-url');
      const label = this.getAttribute('back-label') || 'Zurück';
      r.back.classList.toggle('hidden', !url);
      r.back.href = !url || url === 'history' ? '#' : url;
      r.backLabel.textContent = label;
      r.back.setAttribute('aria-label', label);

      this._renderTheme();
    }

    _renderTheme() {
      const t = currentTheme();
      const b = this._r.theme;
      if (t === 'light') {
        b.innerHTML = svg(ICON.moon);
        b.setAttribute('aria-label', 'Zum dunklen Design wechseln (aktuell: Tag)');
      } else if (t === 'dark') {
        b.innerHTML = svg(ICON.sunset);
        b.setAttribute('aria-label', 'Zum Sunset-Design wechseln (aktuell: Nacht)');
      } else {
        b.innerHTML = svg(ICON.sun);
        b.setAttribute('aria-label', 'Zum hellen Design wechseln (aktuell: Sunset)');
      }
    }
  }

  /* =========================================================
     <app-mode-toolbar>
     Attribute (ein-/ausschalten mit "true"/"false"):
       show-tabs      Tab-Umschalter Üben / Regeln        (Standard: false)
       show-mode      Manuell/Adaptiv-Umschalter          (Standard: true)
       show-slider    Schwellenregler, nur im Modus adaptiv sichtbar (Standard: true)
       collapsible-auto  Regler/Fortschritt im Modus adaptiv eingeklappt; ein Klick auf den
                      bereits aktiven Adaptiv-/Auto-Knopf klappt sie auf und zu (Standard: false)
       tab            "practice" (Standard) oder "rules"
       mode           "manual" (Standard) oder "adaptive"
       threshold      richtige Aufgaben in Folge bis zum Aufstieg (Standard: 7, wenn nicht gesetzt)
       min, max       Bereich des Reglers (Standard: 3 bis 10)
       label-practice, label-rules, label-manual, label-adaptive   eigene Beschriftungen
       slider-text    Text über dem Regler, {n} = Schwellenwert
                      (Standard: "Aufstieg nach {n} richtigen Aufgaben in Folge")

     Ereignisse (bubbeln, nur bei Bedienung durch die Person):
       tabchange        detail: { tab }
       modechange       detail: { mode }
       thresholdchange  detail: { value }
       panelchange      detail: { open }   (nur bei collapsible-auto)

     Eigenschaften: .tab  .mode  .threshold  .panelOpen  (lesen und setzen)
     Methode:       .setProgress(run, infoText)  füllt den Fortschrittsbalken
                    (run richtige Aufgaben in Folge, bezogen auf .threshold)
     ========================================================= */
  let uid = 0;

  class AppModeToolbar extends HTMLElement {
    static get observedAttributes() {
      return ['show-tabs', 'show-mode', 'show-slider', 'tab', 'mode', 'threshold', 'min', 'max',
              'label-practice', 'label-rules', 'label-manual', 'label-adaptive', 'slider-text', 'collapsible-auto'];
    }

    get tab() { return this.getAttribute('tab') === 'rules' ? 'rules' : 'practice'; }
    set tab(v) { this.setAttribute('tab', v); }
    get mode() { return this.getAttribute('mode') === 'adaptive' ? 'adaptive' : 'manual'; }
    set mode(v) { this.setAttribute('mode', v); }
    get min() { const v = parseInt(this.getAttribute('min'), 10); return isNaN(v) ? 3 : v; }
    get max() { const v = parseInt(this.getAttribute('max'), 10); return isNaN(v) ? 10 : v; }
    get threshold() {
      const v = parseInt(this.getAttribute('threshold'), 10);
      return Math.min(this.max, Math.max(this.min, isNaN(v) ? 7 : v));
    }
    set threshold(v) { this.setAttribute('threshold', v); }
    // Aufgeklappter Zustand des Regler-Panels (nur mit collapsible-auto relevant)
    get panelOpen() { return !!this._open; }
    set panelOpen(v) { this._open = !!v; if (this._ready) this._render(); }

    connectedCallback() {
      if (!this._ready) {
        const id = 'toolbar-range-' + (++uid);
        this.innerHTML =
          '<nav class="toolbar-tabs grid-2" role="tablist" data-ref="tabs">' +
            '<button type="button" class="chip" role="tab" data-tab="practice" data-ref="tabP"></button>' +
            '<button type="button" class="chip" role="tab" data-tab="rules" data-ref="tabR"></button>' +
          '</nav>' +
          '<section class="card pad stack toolbar-controls" data-ref="controls">' +
            '<div data-ref="modeBox"><h2>Modus</h2><div class="row">' +
              '<button type="button" class="chip chip--grow" data-mode="manual" data-ref="mManual"></button>' +
              '<button type="button" class="chip chip--grow" data-mode="adaptive" data-ref="mAdaptive"></button>' +
            '</div></div>' +
            '<div class="stack-sm" data-ref="sliderBox">' +
              '<label class="lbl" for="' + id + '"><span data-ref="lpre"></span><span data-ref="val"></span><span data-ref="lpost"></span></label>' +
              '<input id="' + id + '" type="range" step="1" data-ref="range">' +
              '<div class="progress"><div data-ref="bar"></div></div>' +
              '<p class="mute small" data-ref="info"></p>' +
            '</div>' +
          '</section>';
        this._r = refs(this);
        const r = this._r;

        r.tabs.addEventListener('click', (e) => {
          const b = e.target.closest('[data-tab]');
          if (!b || b.dataset.tab === this.tab) return;
          this.tab = b.dataset.tab;
          this._emit('tabchange', { tab: this.tab });
        });
        r.modeBox.addEventListener('click', (e) => {
          const b = e.target.closest('[data-mode]');
          if (!b) return;
          if (b.dataset.mode === this.mode) {            // aktiven Adaptiv-/Auto-Knopf erneut: Panel auf/zu
            if (this.mode === 'adaptive' && flag(this, 'collapsible-auto', false)) {
              this.panelOpen = !this.panelOpen;
              this._emit('panelchange', { open: this.panelOpen });
            }
            return;
          }
          this.mode = b.dataset.mode;
          this._emit('modechange', { mode: this.mode });
        });
        r.range.addEventListener('input', () => {
          this.threshold = r.range.value;
          this._emit('thresholdchange', { value: this.threshold });
        });
        this._ready = true;
      }
      this._render();
    }

    attributeChangedCallback(name) {
      if (name === 'mode') this._open = false;           // Moduswechsel klappt das Panel ein
      if (this._ready) this._render();
    }

    setProgress(run, info) {
      this._run = run;
      if (info != null) this._r.info.textContent = info;
      if (this._ready) this._paintBar();
    }

    _emit(name, detail) { this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true })); }

    _paintBar() {
      this._r.bar.style.width = Math.min(100, (this._run || 0) / this.threshold * 100) + '%';
    }

    _render() {
      const r = this._r;
      const showTabs = flag(this, 'show-tabs', false);
      const showMode = flag(this, 'show-mode', true);
      const collapsible = flag(this, 'collapsible-auto', false) && this.mode === 'adaptive';
      const sliderOn = flag(this, 'show-slider', true) && this.mode === 'adaptive' && (!collapsible || !!this._open);

      r.tabs.classList.toggle('hidden', !showTabs);
      r.modeBox.classList.toggle('hidden', !showMode);
      r.sliderBox.classList.toggle('hidden', !sliderOn);
      r.controls.classList.toggle('hidden', !showMode && !sliderOn);

      r.tabP.textContent = this.getAttribute('label-practice') || 'Üben / Training';
      r.tabR.textContent = this.getAttribute('label-rules') || 'Regeln & Herleitung';
      r.mManual.textContent = this.getAttribute('label-manual') || 'Manuell';
      r.mAdaptive.textContent = this.getAttribute('label-adaptive') || 'Adaptiv';

      r.tabs.querySelectorAll('[data-tab]').forEach((b) => {
        const on = b.dataset.tab === this.tab;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-selected', String(on));
      });
      r.modeBox.querySelectorAll('[data-mode]').forEach((b) => {
        const on = b.dataset.mode === this.mode;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      if (collapsible) r.mAdaptive.setAttribute('aria-expanded', String(!!this._open));
      else r.mAdaptive.removeAttribute('aria-expanded');

      r.range.min = this.min;
      r.range.max = this.max;
      r.range.value = this.threshold;
      r.val.textContent = this.threshold;
      // slider-text: eigener Text, {n} steht für den Schwellenwert
      const tx = (this.getAttribute('slider-text') || 'Aufstieg nach {n} richtigen Aufgaben in Folge').split('{n}');
      r.lpre.textContent = tx[0];
      r.lpost.textContent = tx[1] || '';
      this._paintBar();
    }
  }

  /* ---------- Registrierung ---------- */
  if (!customElements.get('app-header')) customElements.define('app-header', AppHeader);
  if (!customElements.get('app-mode-toolbar')) customElements.define('app-mode-toolbar', AppModeToolbar);

  /* ---------- Hilfsfunktionen für die Apps: MathPortal.ui ---------- */
  const ui = {
    // Beschriftung zu lang für den Knopf → Klasse .is-fade (Ausblenden am Rand, siehe style.css)
    fade(root) {
      root.querySelectorAll('button').forEach(function (b) { b.classList.toggle('is-fade', b.scrollWidth > b.clientWidth + 1); });
    },
    // fade() erneut bei Größenänderung und nach dem Laden der Schrift (Breiten ändern sich)
    watchFade(root) {
      const f = function () { ui.fade(root); };
      addEventListener('resize', f);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(f);
      return f;
    },
    // Scrollposition über eine Neuzeichnung hinweg halten (Moduswechsel)
    keepScroll(fn) {
      const sx = window.scrollX, sy = window.scrollY;
      fn();
      const back = function () { window.scrollTo({ left: sx, top: sy, behavior: 'instant' }); };
      back();
      requestAnimationFrame(function () { back(); requestAnimationFrame(back); });
      setTimeout(back, 0);
    },
    // Fokus auf dem Knopf (data-Attribut + Elternelement mit id) nach dem Neuaufbau wiederherstellen
    keepFocus(fn) {
      const a = document.activeElement;
      let host = null, sel = null;
      if (a && a !== document.body && a.attributes) {
        const at = Array.prototype.find.call(a.attributes, function (x) { return /^data-/.test(x.name) && x.name !== 'data-ref'; });
        const h = a.parentElement && a.parentElement.closest('[id]');
        if (at && h) { host = h.id; sel = '[' + at.name + '="' + at.value.replace(/"/g, '\\"') + '"]'; }
      }
      fn();
      if (sel) {
        const el = document.querySelector('#' + host + ' ' + sel);
        if (el && el !== document.activeElement && !el.disabled) el.focus({ preventScroll: true });
      }
    },
    // Enter soll fokussierte Bedienelemente selbst auslösen (nicht global abfangen)
    isControl(t) { return !!(t && t.closest && t.closest('button,a,summary,select,textarea,input,[role="tab"]')); }
  };

  // Kleine API für eigene Skripte: MathPortal.theme.get() / .set('dark') / .toggle(), MathPortal.ui.*
  window.MathPortal = {
    ui: ui,
    theme: {
      get: currentTheme,
      set: setTheme,
      next: nextTheme,
      toggle: function () { setTheme(nextTheme(currentTheme())); }
    }
  };
})();
