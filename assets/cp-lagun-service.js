(() => {
  'use strict';
  const root = document.querySelector('[data-cp-lagun-service]');
  if (!root) return;
  const locale = root.dataset.locale.toLowerCase().startsWith('en') ? 'en' : 'de';
  const rootUrl = root.dataset.rootUrl || '/';
  const loggedIn = root.dataset.loggedIn === 'true';
  const form = root.querySelector('[data-lagun-access-form]');
  const loading = root.querySelector('[data-lagun-loading]');
  const general = root.querySelector('[data-lagun-general]');
  const results = root.querySelector('[data-lagun-results]');
  const resultsGrid = root.querySelector('[data-lagun-results-grid]');
  const message = root.querySelector('[data-lagun-message]');
  const reviewLink = root.querySelector('[data-lagun-review-link]');
  const reviewStatus = root.querySelector('[data-lagun-review-status]');
  const errorText = root.dataset.error;
  const doneText = root.dataset.reviewDone;
  const productCta = root.dataset.productCta;
  const fallbackCta = root.dataset.fallbackCta;
  let mode = 'order';

  const localizedPath = path => {
    if (!path.startsWith('/')) return path;
    const prefix = rootUrl === '/' ? '' : rootUrl.replace(/\/$/, '');
    return `${prefix}${path}`;
  };
  const event = (kind, recommendation) => {
    fetch(localizedPath('/apps/cp-reviews/lagun-recommendation-event'), {
      method: 'POST', headers: { 'content-type': 'application/json' }, keepalive: true,
      body: JSON.stringify({ event: kind, ruleId: recommendation.id, variantId: recommendation.product?.variantId })
    }).catch(() => {});
  };
  const productAvailability = async product => {
    if (!product?.handle) return null;
    try {
      const response = await fetch(localizedPath(`/products/${encodeURIComponent(product.handle)}.js`), { headers: { accept: 'application/json' } });
      if (!response.ok) return null;
      const data = await response.json();
      const variant = data.variants?.find(item => String(item.id) === String(product.variantId));
      return variant?.available ? variant : null;
    } catch { return null; }
  };
  const price = product => {
    const amount = Number(product?.price);
    if (!Number.isFinite(amount)) return '';
    return new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'de-DE', { style: 'currency', currency: product.currencyCode || 'EUR' }).format(amount);
  };
  const append = (parent, tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    parent.append(node);
    return node;
  };
  const renderRecommendation = async recommendation => {
    const product = recommendation.product;
    const availableVariant = await productAvailability(product);
    const card = append(resultsGrid, 'article', 'cp-lagun-service__card cp-lagun-service__recommendation');
    if (product?.imageUrl) {
      const image = append(card, 'img', 'cp-lagun-service__recommendation-image');
      image.src = product.imageUrl; image.alt = ''; image.loading = 'lazy';
    }
    const body = append(card, 'div', 'cp-lagun-service__recommendation-body');
    append(body, 'h3', '', recommendation.title);
    append(body, 'p', '', recommendation.description);
    if (availableVariant && product) {
      append(body, 'div', 'cp-lagun-service__product-name', product.title + (product.variantTitle ? ` · ${product.variantTitle}` : ''));
      append(body, 'div', 'cp-lagun-service__price', price(product));
    }
    const href = availableVariant && product
      ? `${localizedPath(`/products/${encodeURIComponent(product.handle)}`)}?variant=${encodeURIComponent(product.variantId)}&utm_source=lagun_flyer&utm_medium=lagun_service&utm_campaign=lagun_next_step&utm_content=${encodeURIComponent(recommendation.id)}`
      : `${localizedPath(recommendation.fallbackPath)}?utm_source=lagun_flyer&utm_medium=lagun_service&utm_campaign=lagun_next_step&utm_content=${encodeURIComponent(recommendation.id)}`;
    const link = append(body, 'a', 'cp-lagun-service__button', availableVariant ? productCta : fallbackCta);
    link.href = href;
    link.addEventListener('click', () => event('click', recommendation));
    event('impression', recommendation);
  };
  const showForm = () => {
    loading?.classList.add('cp-lagun-service__hidden');
    form?.classList.remove('cp-lagun-service__hidden');
  };
  const applyProfile = async profile => {
    loading?.classList.add('cp-lagun-service__hidden');
    if (!profile?.identified) { showForm(); return; }
    form?.classList.add('cp-lagun-service__hidden');
    general?.classList.add('cp-lagun-service__hidden');
    resultsGrid.replaceChildren();
    for (const recommendation of profile.recommendations || []) await renderRecommendation(recommendation);
    results?.classList.remove('cp-lagun-service__hidden');
    if (profile.review?.url) {
      root.querySelector('[data-lagun-review-identify]')?.classList.add('cp-lagun-service__hidden');
      reviewLink.href = profile.review.url;
      reviewLink.classList.remove('cp-lagun-service__hidden');
      reviewStatus.classList.add('cp-lagun-service__hidden');
    } else {
      root.querySelector('[data-lagun-review-identify]')?.classList.add('cp-lagun-service__hidden');
      root.querySelector('[data-lagun-voucher]')?.classList.add('cp-lagun-service__hidden');
      reviewLink.classList.add('cp-lagun-service__hidden');
      reviewStatus.textContent = doneText;
      reviewStatus.classList.remove('cp-lagun-service__hidden');
    }
  };
  const loadProfile = async () => {
    try {
      const response = await fetch(`${localizedPath('/apps/cp-reviews/lagun-profile')}?locale=${encodeURIComponent(locale)}`, { headers: { accept: 'application/json' } });
      const profile = await response.json();
      if (!response.ok || !profile.ok) throw new Error('profile');
      await applyProfile(profile);
    } catch { showForm(); }
  };

  root.querySelectorAll('[data-lagun-mode]').forEach(tab => tab.addEventListener('click', () => {
    mode = tab.dataset.lagunMode;
    root.querySelectorAll('[data-lagun-mode]').forEach(item => item.setAttribute('aria-selected', String(item === tab)));
    root.querySelector('[data-lagun-order-field]').classList.toggle('cp-lagun-service__hidden', mode !== 'order');
    root.querySelector('[data-lagun-email-field]').classList.toggle('cp-lagun-service__hidden', mode !== 'email');
    root.querySelector('[name="orderNumber"]').required = mode === 'order';
    root.querySelector('[name="email"]').required = mode === 'email';
    message.textContent = '';
  }));
  form?.addEventListener('submit', async e => {
    e.preventDefault(); message.textContent = '';
    if (!form.reportValidity()) return;
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true; submit.textContent = submit.dataset.pending;
    const payload = { postalCode: form.elements.postalCode.value.trim(), locale };
    payload[mode === 'order' ? 'orderNumber' : 'email'] = form.elements[mode === 'order' ? 'orderNumber' : 'email'].value.trim();
    try {
      const response = await fetch(localizedPath('/apps/cp-reviews/lagun-access'), { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(payload) });
      const profile = await response.json();
      if (!response.ok || !profile.ok) throw new Error('access');
      await applyProfile(profile);
    } catch {
      message.textContent = errorText;
      submit.disabled = false; submit.textContent = submit.dataset.idle;
    }
  });
  if (loggedIn) loadProfile(); else showForm();
})();
