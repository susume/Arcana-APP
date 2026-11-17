globalThis.arcanaAndroid = (() => {
  const plugins = globalThis.Capacitor?.Plugins;
  const billing = plugins?.PlayBilling;
  const device = plugins?.ArcanaDevice;
  const app = plugins?.App;
  const testerBuild = document.documentElement.hasAttribute('data-tester-access');
  const testerPassKey = 'arcana_android_tester_pass';
  let testerActive = false;
  let testerBusy = false;
  let testerNotice = '';
  let entitlement = '';
  let ownedToken = '';
  let price = '';
  let pending = false;
  let checkoutReady = false;
  let notice = 'Checking Google Play…';
  let refreshTask;
  let paymentOpen = false;
  let paymentTimer;
  let savingFile = false;

  async function workerRequest(route, body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await fetch(getAIProxyUrl().replace(/\/$/, '') + route, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      if (!response.ok) {
        const error = new Error('Arcana’s service could not complete the request.');
        error.status = response.status;
        throw error;
      }
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  function renderPurchaseControls() {
    const label = entitlement ? 'Premium active through Google Play.' : testerActive ? '' : notice;
    document.querySelectorAll('[data-play-purchase]').forEach(surface => {
      if (!surface.hasChildNodes()) {
        surface.innerHTML = `
          <div class="settings-actions">
            <button type="button" class="btn btn-primary btn-sm" data-play-buy onclick="arcanaAndroid.buy()" disabled>Unlock Premium</button>
            <button type="button" class="btn btn-sm" data-play-restore onclick="arcanaAndroid.restore()">Restore purchases</button>
          </div>
          <p class="settings-note" role="status" data-play-notice></p>`;
        if (testerBuild) {
          surface.insertAdjacentHTML('beforeend', `
            <details class="flow-details activation-box" data-tester-access-panel>
              <summary>Tester access</summary>
              <form data-tester-activate>
                <label>Tester code
                  <input type="text" name="code" required maxlength="128" autocomplete="off" autocapitalize="characters" spellcheck="false">
                </label>
                <button type="submit" class="btn btn-primary btn-sm">Activate Premium</button>
              </form>
              <p class="activation-status" data-tester-status role="status"></p>
              <button type="button" class="btn btn-sm" data-tester-end hidden>End tester access</button>
            </details>`);
          surface.querySelector('[data-tester-activate]').addEventListener('submit', activateTester);
          surface.querySelector('[data-tester-end]').addEventListener('click', endTesterAccess);
        }
      }
      const purchase = surface.querySelector('[data-play-buy]');
      purchase.hidden = !!entitlement || testerActive || pending;
      purchase.disabled = !checkoutReady || !!refreshTask || paymentOpen;
      purchase.textContent = price ? 'Unlock Premium · ' + price : 'Unlock Premium';
      surface.querySelector('[data-play-restore]').disabled = !billing || !!refreshTask || paymentOpen;
      surface.querySelector('[data-play-notice]').textContent = label;
      if (testerBuild) {
        const form = surface.querySelector('[data-tester-activate]');
        form.hidden = testerActive;
        form.querySelector('button').disabled = testerBusy;
        const end = surface.querySelector('[data-tester-end]');
        end.hidden = !testerActive;
        end.disabled = testerBusy;
        surface.querySelector('[data-tester-status]').textContent = testerNotice;
      }
    });
  }

  function setTesterAccess(active) {
    const wasPremium = !!entitlement || testerActive;
    testerActive = active;
    if (wasPremium !== (!!entitlement || testerActive)
        && document.getElementById('screen-history')?.classList.contains('active')) {
      renderHistory();
    }
  }

  async function verifyTesterAccess(credentials) {
    if (testerBusy) return false;
    testerBusy = true;
    testerNotice = 'Verifying tester access…';
    renderPurchaseControls();
    try {
      const result = await workerRequest('/api/android/tester', credentials);
      if (result.active !== true || typeof result.testerPass !== 'string' || !result.testerPass) {
        throw new Error('Invalid tester response.');
      }
      setTesterAccess(true);
      testerNotice = 'Premium activated for testing.';
      if (credentials.code) {
        try {
          localStorage.setItem(testerPassKey, result.testerPass);
        } catch {
          testerNotice = 'Premium activated for this session. This device could not save your tester pass.';
        }
      }
      return true;
    } catch (error) {
      if (error.status === 403 || error.status === 410 || error.status === 400) {
        if (credentials.testerPass) {
          setTesterAccess(false);
          try { localStorage.removeItem(testerPassKey); } catch {}
        }
        testerNotice = credentials.code
          ? 'That tester code was not recognized.'
          : 'Your tester pass has ended. Enter the current tester code.';
      } else if (error.status === 404 || error.status === 503) {
        testerNotice = 'Tester access is unavailable. Check with the test organizer.';
      } else if (error.status === 429) {
        testerNotice = 'Too many attempts. Try again shortly.';
      } else {
        testerNotice = 'Could not verify tester access. Check your connection and try again.';
      }
      return false;
    } finally {
      testerBusy = false;
      renderEntitlementsUI();
    }
  }

  async function activateTester(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.elements.code;
    if (await verifyTesterAccess({ code: input.value.trim() })) {
      form.reset();
      form.closest('[data-tester-access-panel]')?.querySelector('[data-tester-end]').focus();
    }
  }

  function restoreTesterAccess() {
    if (!testerBuild) return;
    let testerPass;
    try { testerPass = localStorage.getItem(testerPassKey); } catch {}
    if (testerPass) void verifyTesterAccess({ testerPass });
  }

  function endTesterAccess(event) {
    try {
      localStorage.removeItem(testerPassKey);
    } catch {
      testerNotice = 'Could not clear the saved pass. Try again.';
      renderPurchaseControls();
      return;
    }
    setTesterAccess(false);
    testerNotice = 'Tester access ended on this device.';
    renderEntitlementsUI();
    event.currentTarget.closest('[data-tester-access-panel]')?.querySelector('input').focus();
  }

  function upgradeMarkup(title) {
    return `<div class="modal upgrade-modal">
      <button type="button" class="close-btn" onclick="closeModal('modal-upgrade')" aria-label="Close upgrade dialog">&times;</button>
      <h2>${title}</h2>
      <p class="upgrade-note">Unlock Premium with one payment through Google Play.</p>
      <ul class="upgrade-benefits">
        <li>Unlimited readings and five advanced spreads</li>
        <li>Journal tools and up to 50 saved readings</li>
        <li>Voice narration and reading comparison</li>
      </ul>
      <div data-play-purchase></div>
      <p class="upgrade-note">To restore a purchase, use the Google Play account you bought it with.</p>
    </div>`;
  }

  async function checkPurchase(ownership, explicit) {
    checkoutReady = false;
    price = '';
    try {
      const owned = ownership || await billing.getOwnership();
      const token = owned.purchaseToken || '';
      if (token !== ownedToken) entitlement = '';
      ownedToken = token;
      pending = owned.pending === true;
      if (token) {
        notice = 'Checking your purchase with Google Play…';
        renderPurchaseControls();
        const verified = await workerRequest('/api/play/verify', { purchaseToken: token });
        entitlement = verified.status === 'active' ? verified.entitlementToken || '' : '';
        pending = verified.status === 'pending';
        if (!pending && !entitlement) {
          notice = 'Google Play could not confirm an active Premium purchase.';
          return;
        }
      }
      if (pending) {
        notice = 'Payment is pending in Google Play. Premium opens when payment completes.';
        return;
      }
      if (entitlement) {
        if (explicit) showToast('Premium restored.');
        return;
      }
      const offer = await billing.getOffer();
      if (offer.price) {
        const service = await workerRequest('/api/play/status', {});
        if (service.ready === true) {
          checkoutReady = true;
          price = offer.price;
          notice = explicit ? 'No Premium purchase was found on this Google Play account.' : 'Lifetime access with one payment.';
          return;
        }
      }
      notice = explicit ? 'No Premium purchase was found on this Google Play account.' : 'Purchases are unavailable in this build.';
    } catch {
      notice = ownedToken
        ? 'Could not verify your purchase. Reconnect and try Restore purchases.'
        : 'Purchases are unavailable. Check your connection and open Arcana from Google Play.';
    }
  }

  async function refreshPurchases({ explicit = false, ownership } = {}) {
    if (!billing) {
      notice = 'Purchases are available in the Android app from Google Play.';
      renderPurchaseControls();
      return;
    }
    if (refreshTask) {
      await refreshTask;
      if (!ownership && !explicit) return;
    }
    notice = 'Checking Google Play…';
    refreshTask = checkPurchase(ownership, explicit).finally(() => {
      refreshTask = undefined;
      renderEntitlementsUI();
    });
    renderPurchaseControls();
    await refreshTask;
  }

  async function onPurchaseResult(result) {
    clearTimeout(paymentTimer);
    paymentOpen = false;
    if (result.result === 'owned' || result.result === 'updated') {
      const ownership = result.purchaseToken || result.pending ? result : undefined;
      await refreshPurchases({ ownership });
      if (entitlement) showToast('Premium activated.');
      return;
    }
    if (result.result === 'price_changed') {
      price = result.price;
      notice = 'Google Play updated the price. Review the new price before purchasing.';
    } else if (result.result === 'cancelled') {
      notice = 'Purchase canceled.';
    } else {
      notice = 'Google Play could not start the purchase. Try Restore purchases or try again later.';
    }
    renderPurchaseControls();
  }

  async function buy() {
    if (!checkoutReady || refreshTask || paymentOpen || pending || entitlement || testerActive) return;
    paymentOpen = true;
    notice = 'Opening Google Play…';
    renderPurchaseControls();
    try {
      const status = await workerRequest('/api/play/status', {});
      if (status.ready !== true) throw new Error('Purchases unavailable.');
      const result = await billing.buy({ price });
      if (result.result !== 'launched') await onPurchaseResult(result);
      else if (paymentOpen) {
        paymentTimer = setTimeout(() => {
          paymentOpen = false;
          void refreshPurchases();
        }, 120_000);
      }
    } catch {
      await onPurchaseResult({ result: 'unavailable' });
    }
  }

  function restore() {
    return refreshPurchases({ explicit: true });
  }

  function startNavigation() {
    app?.addListener('backButton', ({ canGoBack }) => {
      const saveDialog = document.getElementById('save-reading-overlay');
      const dialog = saveDialog || (typeof activeDialog !== 'undefined' ? activeDialog : null);
      if (dialog) {
        dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      } else if (canGoBack) {
        history.back();
      } else {
        app.exitApp();
      }
    });
  }

  function start() {
    startNavigation();
    billing?.addListener('purchaseResult', onPurchaseResult);
    app?.addListener('resume', () => {
      if (!paymentOpen) void refreshPurchases();
      restoreTesterAccess();
    });
    if (new URLSearchParams(location.search).get('play') === 'ready') {
      const url = new URL(location.href);
      url.searchParams.delete('play');
      history.replaceState(null, '', url);
      openModal('modal-settings');
      document.getElementById('settings-premium-details').open = true;
    }
    void refreshPurchases();
    restoreTesterAccess();
    if (testerBuild) window.addEventListener('online', restoreTesterAccess);
  }

  if (document.body === null) {
    document.addEventListener('DOMContentLoaded', () => {
      if (document.body.classList.contains('public-site')) startNavigation();
    }, { once: true });
  } else if (document.body.classList.contains('public-site')) {
    startNavigation();
  }

  function renderReporting() {
    const actions = document.querySelector('#screen-reading .reading-actions-secondary');
    if (!actions) return;
    let report = actions.querySelector('[data-play-report]');
    if (!report) {
      report = document.createElement('button');
      report.type = 'button';
      report.className = 'btn';
      report.dataset.playReport = '';
      report.textContent = 'Report reading';
      report.addEventListener('click', openReport);
      actions.appendChild(report);
    }
    report.hidden = state.readingMode !== 'ai' || !state.narrative || state.readingInProgress;
  }

  function openReport() {
    if (state.readingMode !== 'ai' || !state.narrative) return;
    let dialog = document.getElementById('modal-reading-report');
    if (!dialog) {
      dialog = document.createElement('div');
      dialog.id = 'modal-reading-report';
      dialog.className = 'modal-overlay';
      dialog.setAttribute('aria-hidden', 'true');
      dialog.innerHTML = `<form class="modal ritual-modal">
        <button type="button" class="close-btn" onclick="closeModal('modal-reading-report')" aria-label="Close report">&times;</button>
        <h2>Report an AI reading</h2>
        <p class="settings-note">Arcana receives your reason and the text below. You can remove personal details before sending.</p>
        <label for="report-reason">Reason</label>
        <select id="report-reason" required>
          <option value="">Choose a reason</option>
          <option value="unsafe">Unsafe advice</option>
          <option value="offensive">Offensive content</option>
          <option value="misleading">Misleading content</option>
          <option value="other">Something else</option>
        </select>
        <label for="report-reading">Reading text to send</label>
        <textarea id="report-reading" class="journal-textarea" rows="6" maxlength="20000" required></textarea>
        <button type="submit" class="btn btn-primary btn-sm">Send report</button>
        <p class="settings-note" role="status"></p>
      </form>`;
      dialog.querySelector('form').addEventListener('submit', sendReport);
      dialog.addEventListener('click', event => { if (event.target === dialog) closeModal(dialog.id); });
      document.body.appendChild(dialog);
    }
    const form = dialog.querySelector('form');
    if (!form.querySelector('button[type="submit"]').disabled) {
      form.reset();
      form.querySelector('textarea').value = state.narrative.slice(0, 20_000);
      form.querySelector('[role="status"]').textContent = '';
    }
    activateDialog(dialog, document.activeElement);
  }

  async function sendReport(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('button[type="submit"]');
    const status = form.querySelector('[role="status"]');
    if (submit.disabled) return;
    submit.disabled = true;
    status.textContent = 'Sending report…';
    try {
      await workerRequest('/api/reading-report', {
        reason: form.querySelector('select').value,
        reading: form.querySelector('textarea').value.trim()
      });
      form.reset();
      closeModal('modal-reading-report');
      showToast('Your report was sent.');
    } catch {
      status.textContent = 'The report could not be sent. Check your connection and try again.';
    } finally {
      submit.disabled = false;
    }
  }

  async function saveFile(blob, filename) {
    if (savingFile) throw new Error('Choose a location for the current file first.');
    savingFile = true;
    try {
      const encoded = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',', 2)[1]);
        reader.onerror = () => reject(new Error('The file could not be prepared.'));
        reader.readAsDataURL(blob);
      });
      const result = await device.saveFile({ filename, mime: blob.type, base64: encoded });
      return result.saved;
    } finally {
      savingFile = false;
    }
  }

  return {
    isPremium: () => !!entitlement || testerActive, renderPurchaseControls, upgradeMarkup, start, buy, restore, renderReporting,
    saveFile: device ? saveFile : null,
    print: device ? (html, title) => device.print({ html, title }) : null,
    printPage: device ? title => device.print({ title, currentPage: true }) : null,
    narrate: device ? text => device.narrate({ text }) : null
  };
})();
