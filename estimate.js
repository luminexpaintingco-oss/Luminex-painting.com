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

  // Record intent only. Count a lead after the form service returns to
  // the confirmation URL, not before it accepts the request.
  if (form) form.addEventListener('submit', () => {
    storage.remove('luminexEstimateTxn');
    storage.remove('luminexEstimateConversionSent');
    storage.set('luminexEstimatePending', '1');
    ensureTransactionId();
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

  if (form) {
    form.innerHTML = '<div role="status"><h3>Thank you!</h3><p>Your estimate request was submitted. We’ll contact you to discuss your project.</p><p>Prefer to speak now? <a href="tel:+17047875727">Call (704) 787-5727</a>.</p></div>';
    form.setAttribute('tabindex', '-1');
    form.focus({preventScroll:true});
  }
})();
