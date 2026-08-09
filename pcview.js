/* PC view for in-app browsers (?pc=1)
   Linked from every <head> right after the stylesheets, paired with the embed-only
   <a class="open-full" href="?pc=1"> button.
   The app webview cannot render nested iframes and resets its own zoom, so neither the
   wrapper nor a wide viewport works there. Instead:
     1. drop every mobile media rule from our own stylesheets, so the desktop rules win
     2. lay the document out at DESIGN px
     3. shrink it with a CSS transform, which no webview zoom reset can undo
   Load order: right after the stylesheets, before the page scripts. */

(function () {
  var DESIGN = 1240;
  if (location.search.indexOf('pc=1') === -1) return;

  document.documentElement.setAttribute('data-pc', '1');

  var mv = document.querySelector('meta[name="viewport"]');
  if (mv) mv.setAttribute('content', 'width=device-width, initial-scale=1');

  function stripMobileRules(sheet) {
    var rules;
    try { rules = sheet.cssRules; } catch (e) { return; }   /* cross-origin sheet */
    if (!rules) return;
    for (var i = rules.length - 1; i >= 0; i--) {
      var r = rules[i];
      if (r.type === 4) {                                   /* CSSMediaRule */
        var t = r.conditionText || (r.media && r.media.mediaText) || '';
        var m = /max-width:\s*(\d+)px/.exec(t);
        if (m && parseInt(m[1], 10) <= DESIGN) {
          try { sheet.deleteRule(i); } catch (e) {}
        }
      }
    }
  }

  /* vw/vh do not follow CSS zoom: containers sized in vw would stay phone-narrow.
     Restate the few width/height rules that depend on them, in DESIGN px. */
  function injectOverrides() {
    if (document.getElementById('pcview-css')) return;
    if (!document.head) return;
    var css =
      /* 1085 = 92% of DESIGN. Selector names follow this site's containers. */
      'body.pcview .sheet { width: 1200px; margin-left: auto; margin-right: auto; }' +
      'body.pcview #fx, body.pcview #fxload { position: absolute; }' +
      'body.pcview .stage { width: 1180px !important; height: 664px !important; min-height: 0 !important; aspect-ratio: auto !important; margin: 0 auto !important; }' +
      'body.pcview .main-cover { width: 1180px !important; margin: 0 auto !important; }' +
      'body.pcview .cover-bg { height: 664px !important; min-height: 0 !important; top: 0 !important; }' +
      'body.pcview .page-heading { padding: 76px 0 38px; }' +
      'body.pcview .page-title { font-size: 78px; }' +
      'body.pcview .page-sub { font-size: 15px; }' +
      'body.pcview .pane-title { font-size: 23px; }' +
      'body.pcview .pane { padding: 26px; }';
    var st = document.createElement('style');
    st.id = 'pcview-css';
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* Width must be captured before the body is widened: once the document overflows, mobile
     browsers grow the layout viewport, and reading innerWidth again would feed that growth
     back into the scale (measured 1089 instead of 375 -> almost no shrink at all). */
  var BASE = (function () {
    var sw = (window.screen && window.screen.width) || 0;
    var iw = window.innerWidth || document.documentElement.clientWidth || 0;
    if (sw && iw) return Math.min(sw, iw);
    return sw || iw || DESIGN;
  })();

  function scale() { return BASE / DESIGN; }

  /* transform, not zoom: some in-app webviews ignore `zoom` entirely */
  function place() {
    if (!document.body) return;
    var s = scale();
    document.documentElement.style.overflowX = 'hidden';
    document.documentElement.style.width = BASE + 'px';   /* pin the layout viewport */
    document.body.style.width = DESIGN + 'px';
    document.body.style.transformOrigin = '0 0';
    document.body.style.transform = 'scale(' + s + ')';
    sizeDocument();
  }

  /* the transform is visual only, so the document keeps its unscaled height: restate it */
  function sizeDocument() {
    if (!document.body) return;
    var s = scale();
    var anchor = document.querySelector('.site-footer') || document.querySelector('.main-cover');
    var h = anchor ? Math.ceil(anchor.getBoundingClientRect().bottom / s + window.scrollY / s) : document.body.scrollHeight;
    document.documentElement.style.height = Math.ceil(h * s) + 'px';
  }

  function apply() {
    injectOverrides();
    for (var i = 0; i < document.styleSheets.length; i++) stripMobileRules(document.styleSheets[i]);
    if (document.body) document.body.classList.add('pcview');
    place();
  }

  apply();
  document.addEventListener('DOMContentLoaded', apply);
  window.addEventListener('load', function () {
    apply();
    [300, 900, 2000].forEach(function (t) { setTimeout(sizeDocument, t); });
    if (window.ResizeObserver && document.body) new ResizeObserver(sizeDocument).observe(document.body);
  });
  window.addEventListener('resize', function () {
    var sw = (window.screen && window.screen.width) || 0;
    if (sw) BASE = sw;                                     /* orientation change only */
    place();
  });
})();
