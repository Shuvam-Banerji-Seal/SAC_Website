/**
 * SAC IISER Kolkata - Performance Monitoring Utilities
 */

import Stats from 'stats.js';

const isDebugMode =
  import.meta.env.DEV ||
  (typeof window !== 'undefined' && window.location.search.includes('debug'));

let statsInstance = null;

function supported(type) {
  return (
    typeof PerformanceObserver !== 'undefined' &&
    PerformanceObserver.supportedEntryTypes?.includes(type)
  );
}

export function initFPSMonitor() {
  if (!isDebugMode) return null;
  try {
    const stats = new Stats();
    const dom = stats.domElement;
    if (!dom) return null;
    dom.style.position = 'fixed';
    dom.style.top = '0';
    dom.style.left = '0';
    dom.style.zIndex = '10000';
    document.body.appendChild(dom);
    statsInstance = stats;

    const origRAF = window.requestAnimationFrame;
    window.requestAnimationFrame = (cb) =>
      origRAF((t) => {
        stats.begin();
        cb(t);
        stats.end();
      });

    return stats;
  } catch {
    return null;
  }
}

export function disposeFPSMonitor() {
  if (statsInstance) {
    const el = statsInstance.domElement;
    if (el?.parentNode) el.parentNode.removeChild(el);
    statsInstance = null;
  }
}

export function logRendererInfo(renderer) {
  if (!isDebugMode || !renderer) return;
  const info = renderer.info;
  console.log('[Three.js]', {
    geometries: info.memory.geometries,
    textures: info.memory.textures,
    calls: info.render.calls,
    triangles: info.render.triangles,
  });
}

export function logCoreWebVitals() {
  if (!isDebugMode) return;

  if (supported('largest-contentful-paint')) {
    try {
      new PerformanceObserver((list) => {
        const e = list.getEntries();
        console.log('[LCP]:', e[e.length - 1].startTime.toFixed(0), 'ms');
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {
      /* noop */
    }
  }

  if (supported('layout-shift')) {
    try {
      let cls = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          if (!e.hadRecentInput) cls += e.value;
        }
        console.log('[CLS]:', cls.toFixed(4));
      }).observe({ type: 'layout-shift', buffered: true });
    } catch {
      /* noop */
    }
  }

  if (supported('first-input')) {
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          if (e.processingDuration != null) {
            console.log('[FID]:', e.processingDuration.toFixed(0), 'ms');
          }
        }
      }).observe({ type: 'first-input', buffered: true });
    } catch {
      /* noop */
    }
  } else if (supported('event')) {
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          if (e.processingDuration != null && e.duration > 16) {
            console.log('[INP]:', e.processingDuration.toFixed(0), 'ms');
          }
        }
      }).observe({ type: 'event', buffered: true, durationThreshold: 16 });
    } catch {
      /* noop */
    }
  }

  if (performance?.memory) {
    setInterval(() => {
      const m = performance.memory;
      console.log('[Memory]:', {
        used: (m.usedJSHeapSize / 1e6).toFixed(0) + 'MB',
        total: (m.totalJSHeapSize / 1e6).toFixed(0) + 'MB',
      });
    }, 10000);
  }
}
