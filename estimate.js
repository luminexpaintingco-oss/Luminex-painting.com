(() => {
  'use strict';

  const form = document.getElementById('estimateForm');
  const ADS_CONVERSION = 'AW-18392172792/HMHiCPaslO8cEPiRicJE';

  const storage = {
    get(key) { try { return sessionStorage.getItem(key); } catch (_) { return null; } },
    set(key, value) { try { sessionStorage.setItem(key, value); } catch (_) {} },
    remove(key) { try { sessionStorage.removeItem(key); } catch (_) {} }
  };

  function ensureTransactionId() {
    let txn = storage.get('luminexEstimateTxn');
    if (!txn) {
      txn = 'estimate-' + Date.now() + '-' + Math.random().toString(36).slice(2);
      storage.set('luminexEstimateTxn', txn);
    }
    return txn;
  }

  function trackEstimateLead(source) {
    if (storage.get('luminexEstimateConversionSent') === '1') return;

    const txn = ensureTransactionId();

    if (typeof fbq === 'function') fbq('track', 'Lead');

    if (typeof gtag === 'function') {
      gtag('event', 'generate_lead', {
        value: 1.0,
        currency: 'USD',
        lead_source: source || 'estimate_form'
      });
      gtag('event', 'conversion', {
        send_to: ADS_CONVERSION,
        value: 1.0,
        currency: 'USD',
        transaction_id: txn
      });
    }

    storage.set('luminexEstimateConversionSent', '1');
  }

  function showConfirmation() {
    if (!form) return;
    form.innerHTML = '<div role="status"><h3>Thank you!</h3><p>Your estimate request was submitted. We’ll contact you to discuss your project.</p><p>Prefer to speak now? <a href="tel:+17047875727">Call (704) 787-5727</a>.</p></div>';
    form.setAttribute('tabindex', '-1');
    form.focus({preventScroll:true});
  }

  // Confirm acceptance with the provider before recording a lead.
  let sending = false;
  if (form) form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending || !form.reportValidity()) return;
    const payload = new FormData(form);
    if (payload.get('_honey')) return;
    sending = true;
    const button = form.querySelector('button[type="submit"]');
    const label = button.textContent;
    button.disabled = true;
    button.textContent = 'Sending…';
    let status = form.querySelector('[data-submit-status]');
    if (!status) {
      status = document.createElement('p');
      status.setAttribute('data-submit-status', '');
      status.setAttribute('role', 'alert');
      form.appendChild(status);
    }
    status.textContent = '';
    storage.remove('luminexEstimateTxn');
    storage.remove('luminexEstimateConversionSent');
    ensureTransactionId();
    let accepted = false;
    try {
      const response = await fetch(form.action.replace('formsubmit.co/', 'formsubmit.co/ajax/'), {
        method: 'POST',
        headers: {'Accept': 'application/json'},
        body: payload
      });
      const result = await response.json();
      if (!response.ok || !(result.success === true || result.success === 'true')) throw new Error('Not accepted');
      accepted = true;
    } catch (_) {
      status.textContent = 'We couldn’t confirm your request was sent. Please try again or call (704) 787-5727.';
      button.disabled = false;
      button.textContent = label;
      sending = false;
    }
    if (!accepted) return;
    // Analytics errors must never hide a successfully submitted request.
    try { trackEstimateLead('estimate_form_confirmed'); } catch (_) {}
    storage.remove('luminexEstimatePending');
    showConfirmation();
  });

  // Phone-link clicks are useful analytics events, but are not treated here
  // as completed leads/calls. Google Ads call reporting handles calls from ads.
  document.querySelectorAll('a[href="tel:+17047875727"]').forEach(link => {
    link.addEventListener('click', () => {
      if (typeof gtag === 'function') {
        gtag('event', 'click_to_call', {
          link_location: link.closest('.lead-mobile') ? 'mobile_bar' : 'page',
          page_path: location.pathname
        });
      }
    });
  });

  // The provider redirects here after submission. A pending request guards
  // against conversions from direct visits and reloads of the confirmation URL.
  if (new URLSearchParams(location.search).get('submitted') !== 'true') return;

  if (storage.get('luminexEstimatePending') === '1') {
    trackEstimateLead('estimate_thank_you');
    storage.remove('luminexEstimatePending');
    storage.remove('luminexEstimateTxn');
    storage.remove('luminexEstimateConversionSent');
  }

  showConfirmation();
})();
