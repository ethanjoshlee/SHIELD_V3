/**
 * Loading screens — two distinct variants:
 *   renderRunLoading  — simulation executing (Run button)
 *   renderResetLoading — scenario clearing (Reset button)
 */

/**
 * Run loading: full-screen simulation progress with log lines + percentage.
 * @param {HTMLElement} container
 * @param {number} nTrials
 * @param {Function} onComplete
 */
export function renderRunLoading(container, nTrials, onComplete) {
  const messages = [
    'Parsing model',
    'Running Monte Carlo trials',
    `Aggregating metrics (${nTrials} trials)`,
    'Analysis complete',
  ];

  const el = document.createElement('div');
  el.className = 'screen-loading';
  el.innerHTML = `
    <div class="dot-grid"></div>
    <div class="loading-percent">0%</div>
    <div class="loading-lines">
      ${messages.map((m, i) => `<div class="line" data-idx="${i}">${m}</div>`).join('')}
    </div>
    <div class="loading-bar"><div class="loading-bar-fill"></div></div>
  `;
  container.appendChild(el);

  requestAnimationFrame(() => el.classList.add('active'));

  const lines = el.querySelectorAll('.line');
  const barFill = el.querySelector('.loading-bar-fill');
  const percentEl = el.querySelector('.loading-percent');
  const totalDuration = 1500;
  const stepDuration = totalDuration / messages.length;

  // Animate percentage counter
  const startTime = performance.now();
  function tickPercent() {
    const elapsed = performance.now() - startTime;
    const pct = Math.min(100, Math.round((elapsed / totalDuration) * 100));
    percentEl.textContent = `${pct}%`;
    if (pct < 100) requestAnimationFrame(tickPercent);
  }
  requestAnimationFrame(tickPercent);

  messages.forEach((_, i) => {
    setTimeout(() => {
      lines[i].classList.add('visible');
      if (i < messages.length - 1) lines[i].classList.add('done');
      barFill.style.width = `${((i + 1) / messages.length) * 100}%`;
    }, stepDuration * i);
  });

  setTimeout(() => {
    percentEl.textContent = '100%';
    el.classList.remove('active');
    setTimeout(() => {
      el.remove();
      if (onComplete) onComplete();
    }, 300);
  }, totalDuration + 200);
}

/**
 * Reset loading: lightweight full-screen clear message, no progress bar.
 * @param {HTMLElement} container
 * @param {Function} onComplete
 */
export function renderResetLoading(container, onComplete) {
  const el = document.createElement('div');
  el.className = 'screen-loading screen-loading-reset';
  el.innerHTML = `
    <div class="dot-grid"></div>
    <div class="reset-status">
      <div class="reset-primary">CONFIGURATION CLEARED</div>
      <div class="reset-secondary">returning to selection</div>
    </div>
  `;
  container.appendChild(el);

  requestAnimationFrame(() => el.classList.add('active'));

  // Hold briefly then fade out
  setTimeout(() => {
    el.classList.remove('active');
    setTimeout(() => {
      el.remove();
      if (onComplete) onComplete();
    }, 250);
  }, 650);
}
