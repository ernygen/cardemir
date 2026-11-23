// Floating "back to portfolio" link for the project replicas (inline styles, so no replica CSS is touched).
(() => {
    const a = document.createElement('a');
    a.href = '../../index.html#projects';
    a.textContent = '← Portfolio';
    a.setAttribute('aria-label', 'Back to the Cardemir portfolio');
    Object.assign(a.style, {
        position: 'fixed', left: '16px', bottom: '16px', zIndex: '2147483647',
        padding: '8px 14px', borderRadius: '999px', border: '1px solid rgba(143,211,199,.45)',
        background: 'rgba(10,10,10,.88)', color: '#8fd3c7', textDecoration: 'none',
        font: '600 13px/1.2 system-ui, -apple-system, Segoe UI, sans-serif', boxShadow: '0 4px 14px rgba(0,0,0,.35)',
    });
    document.body.appendChild(a);
})();
