(function () {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(function () {});
  }
  var KEY = 'rc_ios_a2hs';
  var hint = document.getElementById('iosHint');
  if (!hint) return;
  var ua = navigator.userAgent || '';
  var ios = /iP(hone|od|ad)/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var other = /CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|YaBrowser|Chrome|Android/.test(ua);
  var safari = /Safari/.test(ua) && !other;
  var standalone = window.navigator.standalone === true ||
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  if (ios && safari && !standalone && !localStorage.getItem(KEY)) {
    hint.classList.remove('hidden');
  }
  var close = document.getElementById('iosHintClose');
  if (close) {
    close.addEventListener('click', function () {
      localStorage.setItem(KEY, '1');
      hint.classList.add('hidden');
    });
  }
})();
