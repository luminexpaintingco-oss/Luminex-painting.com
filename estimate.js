(() => {
  'use strict';
  const form = document.getElementById('estimateForm');
  const storage = {
    get(key) { try { return sessionStorage.getItem(key); } catch (_) { return null; } },
    set(key, value) { try { sessionStorage.setItem(key, value); } catch (_) {} },
    remove(key) { try { sessionStorage.removeItem(key); } catch (_) {} }
  };
  // Keep native HTML validation and POST working even if storage or analytics is blocked.
  if (form) form.addEventListener('submit', () => {
    storage.set('luminexEstimatePending', '1');
    storage.set('luminexEstimateTxn', 'estimate-' + Date.now() + '-' + Math.random().toString(36).slice(2));
  });
  document.querySelectorAll('a[href="tel:+17047875727"]').forEach(link => {
    link.addEventListener('click', () => {
      if (typeof gtag === 'function') gtag('event', 'click_to_call', {link_location: link.closest('.lead-mobile') ? 'mobile_bar' : 'page', page_path: location.pathname});
      // A phone-link click is not counted as a completed call or a lead.
    });
  });
  if (new URLSearchParams(location.search).get('submitted') !== 'true') return;
  if (storage.get('luminexEstimatePending') === '1') {
    if (typeof fbq === 'function') fbq('track', 'Lead');
    if (typeof gtag === 'function') {
      gtag('event', 'generate_lead', {value:1.0, currency:'USD'});
      gtag('event', 'conversion', {send_to:'AW-18392172792/HMHiCPaslO8cEPiRicJE', value:1.0, currency:'USD', transaction_id:storage.get('luminexEstimateTxn') || ''});
    }
    storage.remove('luminexEstimatePending');
    storage.remove('luminexEstimateTxn');
  }
  if (form) {
    form.innerHTML = '<div role="status"><h3>Thank you!</h3><p>Your estimate request was submitted. We’ll contact you to discuss your project.</p><p>Prefer to speak now? <a href="tel:+17047875727">Call (704) 787-5727</a>.</p></div>';
    form.setAttribute('tabindex', '-1');
    form.focus({preventScroll:true});
  }
})();
