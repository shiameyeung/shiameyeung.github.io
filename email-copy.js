// Copy only this approved public address, and only in response to a click.
(() => {
  'use strict';

  if (window.SiteEmailCopy?.installed) return;

  const EMAIL = '1@yotenra.com';
  const RESET_AFTER = 2200;
  const COPY_SELECTOR = '[data-copy-email]';
  const UI_SELECTOR = '[data-copy-email], [data-copy-label], [data-copy-status]';
  const strings = {
    zh: { copy: '复制邮箱', copied: '已复制', manual: `请手动复制：${EMAIL}` },
    en: { copy: 'Copy email address', copied: 'Copied', manual: `Please copy manually: ${EMAIL}` },
    ja: { copy: 'メールアドレスをコピー', copied: 'コピーしました', manual: `手動でコピーしてください：${EMAIL}` },
  };
  const states = new WeakMap();
  let refreshQueued = false;

  function language() {
    const lang = (document.documentElement.lang || 'ja').toLowerCase();
    if (lang.startsWith('zh')) return 'zh';
    if (lang.startsWith('en')) return 'en';
    return 'ja';
  }

  function stateFor(button) {
    if (!states.has(button)) {
      states.set(button, {
        phase: 'idle', result: 'none', method: 'none', attempts: 0, successes: 0, timer: null,
      });
    }
    return states.get(button);
  }

  function statusFor(button) {
    const group = button.closest('[data-copy-group]');
    if (group) return group.querySelector('[data-copy-status]');
    for (let container = button.parentElement; container; container = container.parentElement) {
      const status = container.querySelector('[data-copy-status]');
      if (status) return status;
    }
    return null;
  }

  function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
  }

  function render(button) {
    const state = stateFor(button);
    const text = strings[language()];
    const label = state.phase === 'success' ? text.copied : text.copy;
    setText(button.querySelector('[data-copy-label]'), label);
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-busy', String(state.phase === 'pending'));

    // Result persists after the temporary success label resets; count changes
    // only after writeText resolves or execCommand explicitly returns true.
    button.dataset.copyState = state.phase;
    button.dataset.copyResult = state.result;
    button.dataset.copyMethod = state.method;
    button.dataset.copyAttempts = String(state.attempts);
    button.dataset.copyCount = String(state.successes);

    const status = statusFor(button);
    if (status) {
      if (!status.hasAttribute('aria-live')) status.setAttribute('aria-live', 'polite');
      status.setAttribute('aria-atomic', 'true');
      status.dataset.copyResult = state.result;
      status.dataset.copyMethod = state.method;
      setText(status, state.phase === 'success' ? text.copied : state.phase === 'manual' ? text.manual : '');
    }
  }

  function mount() {
    document.querySelectorAll(COPY_SELECTOR).forEach(render);
  }

  function scheduleMount() {
    if (refreshQueued) return;
    refreshQueued = true;
    queueMicrotask(() => {
      refreshQueued = false;
      mount();
    });
  }

  function legacyCopy() {
    const focused = document.activeElement;
    const selection = document.getSelection();
    const ranges = [];
    let inputSelection = null;
    for (let i = 0; selection && i < selection.rangeCount; i += 1) {
      ranges.push(selection.getRangeAt(i).cloneRange());
    }
    if (focused && typeof focused.selectionStart === 'number') {
      inputSelection = [focused.selectionStart, focused.selectionEnd, focused.selectionDirection];
    }

    const field = document.createElement('textarea');
    field.value = EMAIL;
    field.readOnly = true;
    field.tabIndex = -1;
    field.setAttribute('aria-hidden', 'true');
    field.dataset.copyTemporary = 'true';
    field.style.cssText = 'position:fixed;left:-10000px;top:0;width:1px;height:1px;padding:0;border:0;font-size:16px;opacity:0;';
    let copied = false;
    try {
      document.body.append(field);
      field.focus({ preventScroll: true });
      field.select();
      field.setSelectionRange(0, field.value.length);
      copied = typeof document.execCommand === 'function' && document.execCommand('copy') === true;
    } catch (_) {
      copied = false;
    } finally {
      field.remove();
      if (focused?.isConnected && typeof focused.focus === 'function') {
        try { focused.focus({ preventScroll: true }); } catch (_) { /* Focus may no longer be available. */ }
      }
      if (selection) {
        try {
          selection.removeAllRanges();
          ranges.forEach(range => selection.addRange(range));
        } catch (_) { /* A replaced DOM node may invalidate a saved range. */ }
      }
      if (inputSelection && focused?.isConnected) {
        try { focused.setSelectionRange(...inputSelection); } catch (_) { /* Some input types do not support selection. */ }
      }
    }
    return copied;
  }

  async function copyAddress() {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(EMAIL);
        return { copied: true, method: 'clipboard' };
      }
    } catch (_) { /* Try the legacy path after an unavailable or rejected API. */ }
    const copied = legacyCopy();
    return { copied, method: copied ? 'exec-command' : 'none' };
  }

  document.addEventListener('click', async event => {
    const button = event.target instanceof Element ? event.target.closest(COPY_SELECTOR) : null;
    if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true') return;
    event.preventDefault();

    const state = stateFor(button);
    if (state.phase === 'pending') return;
    clearTimeout(state.timer);
    state.timer = null;
    state.phase = 'pending';
    state.result = 'pending';
    state.method = 'none';
    state.attempts += 1;
    render(button);

    let outcome;
    try {
      outcome = await copyAddress();
    } catch (_) {
      outcome = { copied: false, method: 'none' };
    }
    state.method = outcome.method;
    state.phase = outcome.copied ? 'success' : 'manual';
    state.result = outcome.copied ? 'success' : 'manual';
    if (outcome.copied) state.successes += 1;
    if (button.isConnected) render(button);

    if (outcome.copied) {
      state.timer = setTimeout(() => {
        state.phase = 'idle';
        state.timer = null;
        if (button.isConnected) render(button);
      }, RESET_AFTER);
    }
  });

  const observer = new MutationObserver(records => {
    if (records.some(record => {
      if (record.type === 'attributes') return record.target === document.documentElement;
      if (record.target instanceof Element && record.target.closest(UI_SELECTOR)) return true;
      return Array.from(record.addedNodes).some(node => node instanceof Element &&
        (node.matches(UI_SELECTOR) || node.querySelector(UI_SELECTOR)));
    })) scheduleMount();
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'], childList: true, subtree: true });
  window.SiteEmailCopy = Object.freeze({ installed: true, mount });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();
