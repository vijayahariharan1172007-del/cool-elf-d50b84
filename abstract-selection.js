(() => {
  // Adds an explicit abstract-submission choice to every event card and
  // carries that choice into the event-registration API request.
  const abstractChoice = new Map();

  const requiredKeys = new Set([
    'symposium-1',
    'symposium-2',
    'meme',
    'poster-slogan'
  ]);

  const esc = value => String(value ?? '').replace(/[&<>\"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'
  }[m]));

  function addChoices() {
    document.querySelectorAll('#identityGrid .identity-card').forEach(card => {
      const button = card.querySelector('.event-select[data-key]');
      if (!button || card.querySelector('.abstract-choice')) return;

      const key = String(button.dataset.key || '').trim();
      const required = requiredKeys.has(key);
      const choice = abstractChoice.has(key) ? abstractChoice.get(key) : required;
      abstractChoice.set(key, choice);

      const wrap = document.createElement('label');
      wrap.className = 'abstract-choice';
      wrap.style.cssText = 'display:flex;align-items:center;gap:9px;margin-top:12px;padding:10px 12px;border:1px solid rgba(255,255,255,.16);border-radius:10px;background:rgba(0,0,0,.18);font:700 10px Orbitron,sans-serif;letter-spacing:.7px;cursor:pointer;';
      wrap.innerHTML = '<input type="checkbox" class="abstract-choice-check" data-key="' + esc(key) + '"' + (choice ? ' checked' : '') + (required ? ' disabled' : '') + ' style="width:18px;height:18px;accent-color:#d21e34;cursor:pointer;">' +
        '<span>' + (required ? 'ABSTRACT / FILE SUBMISSION — REQUIRED' : 'ABSTRACT / FILE SUBMISSION — OPTIONAL') + '</span>';

      const check = wrap.querySelector('input');
      check.addEventListener('click', event => event.stopPropagation());
      check.addEventListener('change', () => abstractChoice.set(key, check.checked));
      card.appendChild(wrap);
    });
  }

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    if (String(url).includes('/api/create-event-registration') && init?.body) {
      try {
        const body = JSON.parse(init.body);
        const key = String(body.eventKey || '').trim();
        if (key) {
          const check = document.querySelector('#identityGrid .abstract-choice-check[data-key="' + CSS.escape(key) + '"]');
          const requested = check ? !!check.checked : !!abstractChoice.get(key);
          body.customFields = {
            ...(body.customFields && typeof body.customFields === 'object' ? body.customFields : {}),
            abstract_submission_requested: requested ? 'true' : 'false'
          };
          init = { ...init, body: JSON.stringify(body) };
        }
      } catch (_) {
        // Leave unrelated requests untouched.
      }
    }
    return originalFetch(input, init);
  };

  const observer = new MutationObserver(addChoices);
  const start = () => {
    addChoices();
    const grid = document.getElementById('identityGrid');
    if (grid) observer.observe(grid, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
