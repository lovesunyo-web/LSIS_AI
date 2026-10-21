// viewer-resizer.js
// 단면도와 자재량계산 영역의 높이를 드래그로 조정하고 브라우저에 저장한다.
(function () {
  const STORAGE_KEY = 'lsCableViewerCanvasHeight';
  const MIN_CANVAS = 300;
  const MIN_TABLE = 220;

  function init() {
    const viewer = document.querySelector('.viewer-container');
    const canvas = document.querySelector('.canvas-area');
    const table = document.getElementById('tableArea');
    const handle = document.getElementById('viewerVerticalResizer');
    if (!viewer || !canvas || !table || !handle) return;

    const setCanvasHeight = (height) => {
      const max = Math.max(MIN_CANVAS, viewer.clientHeight - MIN_TABLE - handle.offsetHeight);
      const safe = Math.max(MIN_CANVAS, Math.min(Number(height) || MIN_CANVAS, max));
      canvas.style.setProperty('--viewer-canvas-height', `${safe}px`);
      try { localStorage.setItem(STORAGE_KEY, String(Math.round(safe))); } catch (e) {}
      window.dispatchEvent(new Event('resize'));
      if (typeof window.update3DCableView === 'function') window.update3DCableView();
    };

    const saved = Number((() => { try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return 0; } })());
    if (saved) requestAnimationFrame(() => setCanvasHeight(saved));

    let startY = 0;
    let startHeight = 0;
    const end = () => {
      document.body.classList.remove('viewer-resizing');
      handle.classList.remove('is-resizing');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
    const move = (event) => setCanvasHeight(startHeight + event.clientY - startY);
    handle.addEventListener('pointerdown', (event) => {
      if (window.matchMedia('(max-width: 900px)').matches) return;
      startY = event.clientY;
      startHeight = canvas.getBoundingClientRect().height;
      handle.setPointerCapture?.(event.pointerId);
      document.body.classList.add('viewer-resizing');
      handle.classList.add('is-resizing');
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', end);
      window.addEventListener('pointercancel', end);
      event.preventDefault();
    });
    handle.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
      const step = event.shiftKey ? 30 : 10;
      setCanvasHeight(canvas.getBoundingClientRect().height + (event.key === 'ArrowUp' ? step : -step));
      event.preventDefault();
    });
  }
  document.addEventListener('DOMContentLoaded', init);
})();
