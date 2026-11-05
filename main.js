import { background, constellation } from 'asciify-engine/kit';

/**
 * Asciify Constellation Background Integration
 * Drawn behind #hero's content; follows light and dark, pauses off screen,
 * holds a still frame under reduced motion. cursor: false turns the pointer off.
 */

let bg = null;

export function initAsciify() {
  // If already mounted, return existing handle
  if (bg) return bg;

  const hero = document.querySelector('#hero');
  const copy = document.querySelector('#hero .copy');

  if (!hero) {
    console.warn('[Asciify] #hero element not found.');
    return null;
  }

  try {
    bg = background(hero, {
      preset: constellation,
      clear: copy || undefined,
      palette: '#8fd3c7',
      charset: " CARDEMIR",
      cursor: false,
      cellSize: 11,
      speed: 1,
      opacity: 1,
      mark: 'glyph',
    });

    // Make handle available for inspectability & tests
    window.__asciifyBg = bg;
    return bg;
  } catch (error) {
    console.warn('[Asciify] Initialization failed gracefully:', error);
    return null;
  }
}

export function destroyAsciify() {
  if (bg) {
    bg.destroy();
    bg = null;
    window.__asciifyBg = null;
  }
}

// Lifecycle Management
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAsciify, { once: true });
  } else {
    initAsciify();
  }

  // Pause when tab/window is hidden, resume when visible
  document.addEventListener('visibilitychange', () => {
    if (!bg) return;
    if (document.hidden) {
      bg.pause();
    } else {
      bg.play();
    }
  });

  // Respect prefers-reduced-motion dynamically if preference changes
  if (typeof window !== 'undefined' && window.matchMedia) {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    motionQuery.addEventListener('change', (e) => {
      bg?.update({ reducedMotion: e.matches });
    });
  }

  // Clean up on page unmount / unload
  window.addEventListener('pagehide', destroyAsciify, { once: true });
  window.addEventListener('beforeunload', destroyAsciify, { once: true });
}
