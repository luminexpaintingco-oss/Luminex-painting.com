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

  // Track a valid estimate-form submission immediately so the conversion is
  // not lost if the external form service redirects without preserving query
  // parameters or if the browser leaves the page before the thank-you state.
  if (form) form.addEventListener('submit', () => {
    storage.set('luminexEstimatePending', '1');
    ensureTransactionId();
    trackEstimateLead('estimate_form_submit');
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

  // Keep the existing thank-you redirect flow as a fallback. If the submit
  // event already sent the Ads conversion, the session flag prevents a
  // duplicate conversion from being recorded.
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
