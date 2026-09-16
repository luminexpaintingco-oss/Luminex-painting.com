(() => {
  'use strict';

  const form = document.getElementById('estimateForm');
  const ADS_CONVERSION = 'AW-18392172792/HMHiCPaslO8cEPiRicJE';

  // Strengthen internal discovery paths from the homepage without changing
  // the existing page layout or core conversion flow. Google can render these
  // normal anchor links, and visitors can use them to reach nearby-area pages.
  function addDiscoveryLinks() {
    const serviceAreas = [
      ['interior-painters-salisbury-nc.html', 'Salisbury, NC'],
      ['interior-painters-huntersville-nc.html', 'Huntersville, NC'],
      ['interior-painters-mooresville-nc.html', 'Mooresville, NC'],
      ['interior-painters-davidson-nc.html', 'Davidson, NC'],
      ['interior-painters-cornelius-nc.html', 'Cornelius, NC'],
      ['interior-painters-harrisburg-nc.html', 'Harrisburg, NC']
    ];

    const areaList = document.querySelector('.area-list');
    if (areaList) {
      const existing = new Set(
        Array.from(areaList.querySelectorAll('a')).map(link => link.getAttribute('href'))
      );
      const nearby = areaList.querySelector('a[href="#estimate"]');

      serviceAreas.forEach(([href, label]) => {
        if (existing.has(href)) return;
        const link = document.createElement('a');
        link.href = href;
        link.textContent = label;
        areaList.insertBefore(link, nearby || null);
      });

      if (nearby && nearby.textContent.trim() === 'Nearby Communities') nearby.remove();
    }

    const guidesWrap = document.querySelector('#guides .wrap');
    if (guidesWrap && !document.getElementById('more-city-guides')) {
      const moreGuides = document.createElement('div');
      moreGuides.id = 'more-city-guides';
      moreGuides.className = 'area-links';

      [
        ['interior-painting-cost-salisbury-nc.html', 'Salisbury Cost Guide →'],
        ['interior-painting-cost-huntersville-nc.html', 'Huntersville Cost Guide →'],
        ['interior-painting-cost-mooresville-nc.html', 'Mooresville Cost Guide →'],
        ['interior-painting-cost-davidson-nc.html', 'Davidson Cost Guide →'],
        ['interior-painting-cost-cornelius-nc.html', 'Cornelius Cost Guide →'],
        ['interior-painting-cost-harrisburg-nc.html', 'Harrisburg Cost Guide →']
      ].forEach(([href, label]) => {
        const link = document.createElement('a');
        link.className = 'area-link';
        link.href = href;
        link.textContent = label;
        moreGuides.appendChild(link);
      });

      guidesWrap.appendChild(moreGuides);
    }
  }

  addDiscoveryLinks();

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

    // A failure in one analytics provider must not block the other.
    try { if (typeof fbq === 'function') fbq('track', 'Lead'); }
    catch (error) { console.warn('Luminex Meta lead tracking failed', error); }

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
    try { trackEstimateLead('estimate_form_confirmed'); }
    catch (error) { console.warn('Luminex Google lead tracking failed', error); }
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
