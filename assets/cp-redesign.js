(() => {
  'use strict';

  const onReady = (callback) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
  };

  const searchIcon = `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="11" cy="11" r="6.5"></circle>
      <path d="m16 16 4 4"></path>
    </svg>`;

  const announcementIcons = [
    `<svg class="cp-announcement-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 6h11v11H3zM14 10h3l4 4v3h-7z"></path><circle cx="7" cy="18" r="2"></circle><circle cx="18" cy="18" r="2"></circle></svg>`,
    `<svg class="cp-announcement-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.6"></path><path d="M4 4v4.6h4.6"></path></svg>`,
    `<svg class="cp-announcement-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 7h16v11H4zM4 10h16"></path><path d="M7 15h4"></path></svg>`,
    `<svg class="cp-announcement-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 11a6 6 0 0 1 12 0v5a2 2 0 0 1-2 2h-2v-6h4M6 12H2v4a2 2 0 0 0 2 2h2v-6Z"></path><path d="M14 19c0 1.1-.9 2-2 2h-2"></path></svg>`,
  ];

  function enhanceAnnouncementBar() {
    document.querySelectorAll('.announcement-slider__slide').forEach((slide, index) => {
      slide.setAttribute('role', 'group');
      slide.setAttribute('aria-label', `${index + 1} von ${slide.parentElement?.children.length || 1}`);
      slide.querySelectorAll('.announcement-text').forEach((text) => {
        if (text.querySelector('.cp-announcement-icon')) return;
        text.insertAdjacentHTML('afterbegin', announcementIcons[index % announcementIcons.length]);
      });
    });
  }

  function integrateSearch() {
    const sourceRoot = document.querySelector('[data-cp-search]');
    const header = document.querySelector('.header');
    const headerRight = document.querySelector('.header__right');
    if (!sourceRoot || !header || !headerRight) return;

    // Replace the Theme Editor's inline-search instance so its legacy,
    // text-only listeners cannot race the richer result renderer below.
    const root = sourceRoot.cloneNode(true);
    sourceRoot.replaceWith(root);

    const originalParent = root.parentNode;
    const placeholder = document.createComment('cp-search-home');
    originalParent.insertBefore(placeholder, root);

    const icon = root.querySelector('.cp-searchbar__icon');
    if (icon) icon.innerHTML = searchIcon;

    const input = root.querySelector('[data-cp-search-input]');
    const dropdown = root.querySelector('[data-cp-search-dropdown]');
    const list = root.querySelector('[data-cp-search-list]');
    const desktop = window.matchMedia('(min-width: 990px)');

    if (input && dropdown && list) {
      const locale = document.documentElement.lang || 'de-DE';
      const language = locale.toLowerCase().split('-')[0];
      const currency = window.Shopify?.currency?.active || 'EUR';
      const labelsByLanguage = {
        de: {
          products: 'Produkte',
          pages: 'Seiten',
          collections: 'Kollektionen',
          articles: 'Ratgeber',
          product: 'Produkt',
          page: 'Seite',
          collection: 'Kollektion',
          article: 'Ratgeber',
          sale: 'Im Angebot',
          soldOut: 'Ausverkauft',
          allResults: 'Alle Ergebnisse anzeigen',
        },
        en: {
          products: 'Products',
          pages: 'Pages',
          collections: 'Collections',
          articles: 'Guides',
          product: 'Product',
          page: 'Page',
          collection: 'Collection',
          article: 'Guide',
          sale: 'Sale',
          soldOut: 'Sold out',
          allResults: 'View all results',
        },
        fr: {
          products: 'Produits',
          pages: 'Pages',
          collections: 'Collections',
          articles: 'Guides',
          product: 'Produit',
          page: 'Page',
          collection: 'Collection',
          article: 'Guide',
          sale: 'Promotion',
          soldOut: 'Épuisé',
          allResults: 'Afficher tous les résultats',
        },
      };
      const labels = labelsByLanguage[language] || labelsByLanguage.de;
      const moneyFormatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
      });
      const cache = new Map();
      let debounceTimer;
      let activeRequest;

      const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      }[character]));

      const formatMoney = (value) => moneyFormatter.format(Number(value || 0));

      const imageUrl = (url, width = 360) => {
        if (!url) return '';
        try {
          const parsed = new URL(url, window.location.origin);
          parsed.searchParams.set('width', String(width));
          return parsed.toString();
        } catch {
          return url;
        }
      };

      const close = () => {
        dropdown.hidden = true;
        input.removeAttribute('aria-activedescendant');
      };

      const open = () => {
        dropdown.hidden = false;
      };

      const productPrice = (product) => {
        const minimum = Number(product.price_min ?? product.price ?? 0);
        const maximum = Number(product.price_max ?? product.price ?? minimum);
        const compareAt = Number(product.compare_at_price_max || 0);
        const current = minimum !== maximum
          ? `${formatMoney(minimum)}–${formatMoney(maximum)}`
          : formatMoney(minimum);
        const comparison = compareAt > minimum
          ? `<s class="cp-searchbar__compare-price">${escapeHtml(formatMoney(compareAt))}</s>`
          : '';
        return `<span class="cp-searchbar__price">${comparison}<strong>${escapeHtml(current)}</strong></span>`;
      };

      const productImage = (product) => {
        const source = product.featured_image?.url || product.image;
        const alt = product.featured_image?.alt || product.title;
        if (!source) {
          return `<span class="cp-searchbar__product-placeholder" aria-hidden="true">
            <svg viewBox="0 0 48 48" focusable="false"><path d="M8 10h32v28H8zM13 32l8-8 6 6 4-4 5 6"></path><circle cx="31" cy="18" r="3"></circle></svg>
          </span>`;
        }
        return `<img
          src="${escapeHtml(imageUrl(source, 160))}"
          srcset="${escapeHtml(imageUrl(source, 96))} 96w, ${escapeHtml(imageUrl(source, 160))} 160w, ${escapeHtml(imageUrl(source, 240))} 240w"
          sizes="(min-width: 990px) 8.4rem, 8rem"
          alt="${escapeHtml(alt)}"
          width="160"
          height="160"
          loading="lazy"
        >`;
      };

      const productBadge = (product) => {
        if (!product.available) {
          return `<span class="cp-searchbar__badge cp-searchbar__badge--sold-out">${escapeHtml(labels.soldOut)}</span>`;
        }
        if (Number(product.compare_at_price_max || 0) > Number(product.price_min ?? product.price ?? 0)) {
          return `<span class="cp-searchbar__badge cp-searchbar__badge--sale">${escapeHtml(labels.sale)}</span>`;
        }
        return '';
      };

      const renderProducts = (products) => {
        const cards = products.slice(0, 6).map((product) => `
          <li class="cp-searchbar__product-item${product.available ? '' : ' is-sold-out'}">
            <a class="cp-searchbar__product-card" href="${escapeHtml(product.url)}">
              <span class="cp-searchbar__product-media">
                ${productImage(product)}
                ${productBadge(product)}
              </span>
              <span class="cp-searchbar__product-content">
                <span class="cp-searchbar__product-title">${escapeHtml(product.title)}</span>
                ${productPrice(product)}
              </span>
            </a>
          </li>
        `).join('');
        if (!cards) return '';
        return `
          <li class="cp-searchbar__section-title">${escapeHtml(labels.products)}</li>
          <li class="cp-searchbar__product-results">
            <ul class="cp-searchbar__product-grid" role="group" aria-label="${escapeHtml(labels.products)}">${cards}</ul>
          </li>
        `;
      };

      const renderTextSection = (title, itemLabel, items, limit) => {
        const rows = items.slice(0, limit).map((item) => `
          <li class="cp-searchbar__item">
            <a href="${escapeHtml(item.url)}">
              <span>${escapeHtml(item.title)}</span>
              <span class="cp-searchbar__muted">${escapeHtml(itemLabel)}</span>
            </a>
          </li>
        `).join('');
        if (!rows) return '';
        return `<li class="cp-searchbar__section-title">${escapeHtml(title)}</li>${rows}`;
      };

      const render = (results, query) => {
        const products = results.products || [];
        const pages = results.pages || [];
        const collections = results.collections || [];
        const articles = results.articles || [];
        if (!products.length && !pages.length && !collections.length && !articles.length) {
          list.innerHTML = '';
          close();
          return;
        }

        const sections = [
          renderProducts(products),
          renderTextSection(labels.pages, labels.page, pages, 4),
          renderTextSection(labels.collections, labels.collection, collections, 4),
          renderTextSection(labels.articles, labels.article, articles, 3),
        ].filter(Boolean);
        const divider = '<li class="cp-searchbar__divider" aria-hidden="true"></li>';
        const searchRoot = window.Shopify?.routes?.root || '/';
        const allResultsUrl = `${searchRoot}search?q=${encodeURIComponent(query)}&options%5Bprefix%5D=last`;
        list.innerHTML = `${sections.join(divider)}
          <li class="cp-searchbar__all-results">
            <a href="${escapeHtml(allResultsUrl)}">${escapeHtml(labels.allResults)} <span aria-hidden="true">→</span></a>
          </li>`;
        open();
      };

      const fetchSuggestions = async (query) => {
        const key = query.toLocaleLowerCase(locale);
        if (cache.has(key)) return cache.get(key);
        activeRequest?.abort();
        activeRequest = new AbortController();
        const routeRoot = window.Shopify?.routes?.root || '/';
        const endpoint = `${routeRoot}search/suggest.json`.replace(/\/{2,}/g, '/');
        const parameters = new URLSearchParams({ q: query });
        parameters.set('resources[type]', 'product,page,collection,article');
        parameters.set('resources[limit]', '16');
        parameters.set('resources[options][unavailable_products]', 'last');
        parameters.set('resources[options][fields]', 'title,product_type');
        const response = await fetch(`${endpoint}?${parameters}`, {
          headers: { Accept: 'application/json' },
          signal: activeRequest.signal,
        });
        if (!response.ok) throw new Error(`Search request failed: ${response.status}`);
        const data = await response.json();
        const results = data?.resources?.results || {};
        cache.set(key, results);
        return results;
      };

      dropdown.id = dropdown.id || 'CpPredictiveSearchResults';
      input.setAttribute('aria-controls', dropdown.id);
      input.setAttribute('aria-expanded', dropdown.hidden ? 'false' : 'true');
      input.setAttribute('aria-autocomplete', 'list');
      list.setAttribute('role', 'list');

      const hiddenObserver = new MutationObserver(() => {
        input.setAttribute('aria-expanded', dropdown.hidden ? 'false' : 'true');
      });
      hiddenObserver.observe(dropdown, { attributes: true, attributeFilter: ['hidden'] });

      input.addEventListener('input', () => {
        const query = input.value.trim();
        clearTimeout(debounceTimer);
        if (query.length < 2) {
          activeRequest?.abort();
          list.innerHTML = '';
          close();
          return;
        }
        debounceTimer = window.setTimeout(async () => {
          root.setAttribute('aria-busy', 'true');
          try {
            render(await fetchSuggestions(query), query);
          } catch (error) {
            if (error.name !== 'AbortError') close();
          } finally {
            root.removeAttribute('aria-busy');
          }
        }, 140);
      });

      input.addEventListener('focus', () => {
        if (list.children.length) open();
      });

      input.addEventListener('keydown', (event) => {
        if (event.key !== 'ArrowDown' || dropdown.hidden) return;
        const firstLink = dropdown.querySelector('a');
        if (!firstLink) return;
        event.preventDefault();
        firstLink.focus();
      });

      dropdown.addEventListener('keydown', (event) => {
        const links = Array.from(dropdown.querySelectorAll('a'));
        const currentIndex = links.indexOf(document.activeElement);
        if (event.key === 'ArrowDown' && currentIndex > -1 && links[currentIndex + 1]) {
          event.preventDefault();
          links[currentIndex + 1].focus();
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          if (currentIndex > 0) links[currentIndex - 1].focus();
          else input.focus();
        }
        if (event.key === 'Escape') {
          close();
          input.focus();
        }
      });

      document.addEventListener('click', (event) => {
        if (!root.contains(event.target)) close();
      });
    }

    const moveSearch = () => {
      if (desktop.matches) {
        header.insertBefore(root, headerRight);
      } else if (placeholder.parentNode && root.parentNode !== originalParent) {
        placeholder.parentNode.insertBefore(root, placeholder.nextSibling);
      }
    };

    moveSearch();
    desktop.addEventListener?.('change', moveSearch);
  }

  function improveMegaMenuSemantics() {
    document.querySelectorAll('.header__inline-menu .header__menu-item--top').forEach((item) => {
      const parent = item.closest('details, dropdown-menu, mega-menu');
      if (!parent) return;
      const dropdown = parent.querySelector('.list-menu-dropdown');
      if (!dropdown) return;
      if (!dropdown.id) dropdown.id = `CpMenu-${Math.random().toString(36).slice(2, 9)}`;
      item.setAttribute('aria-controls', dropdown.id);
      if (!item.hasAttribute('aria-expanded')) item.setAttribute('aria-expanded', 'false');
    });
  }

  function enhanceLagunGallery() {
    if (!document.body.classList.contains('cp-lagun-redesign')) return;
    const gallery = document.querySelector('media-gallery');
    if (!gallery) return;

    const altTexts = [
      'Lagun Tischgestell Standard-Set in Silber',
      'Silbernes Lagun Tischgestell im Detail',
      'Video zur Bewegung des Lagun Tischgestells',
      'Lagun Tischgestell mit Tischplatte im Camper',
      'Lagun Tischgestell aus Aluminium – Detailansicht',
      'Schwenkarm des Lagun Tischgestells',
      'Lagun Tischgestell Standard-Set – Komponenten',
      'Lagun Tischsystem im kompakten Camper-Ausbau',
      'Montiertes Lagun Tischgestell im Fahrzeug',
      'Lagun Tischgestell mit variabler Tischposition',
      'Lagun Tischgestell im Camping-Alltag',
      'Camping-Tisch auf dem Lagun Tischgestell',
      'Video zum Lagun Tischsystem',
    ];

    const mediaItems = gallery.querySelectorAll('.product__media-item');
    mediaItems.forEach((item, index) => {
      item.querySelectorAll('img').forEach((image) => {
        if (!image.alt?.trim()) image.alt = altTexts[index] || 'Lagun Tischgestell in Silber';
      });
    });

    gallery.querySelectorAll('.thumbnail-list__item').forEach((item, index) => {
      item.querySelectorAll('img').forEach((image) => {
        if (!image.alt?.trim()) image.alt = `Vorschau: ${altTexts[index] || 'Lagun Tischgestell in Silber'}`;
      });
    });
  }

  function relocateProductReviews() {
    if (!document.body.classList.contains('cp-lagun-redesign')) return;
    const destination = document.querySelector('[data-cp-reviews-destination]');
    const reviews = document.querySelector('.cp-reviews');
    if (!destination || !reviews) return;
    document.querySelectorAll('.cp-review-summary__link[aria-label]').forEach((link) => {
      link.removeAttribute('aria-label');
    });
    const appBlock = reviews.closest('.shopify-app-block') || reviews;
    destination.appendChild(appBlock);
  }

  function reviewerDisplayName(customerName) {
    const parts = String(customerName || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '';
    if (parts.length === 1) return parts[0];
    const last = parts[parts.length - 1];
    const lastInitial = last.endsWith('.') ? last : `${last.charAt(0).toLocaleUpperCase('de-DE')}.`;
    return `${parts[0]} ${lastInitial}`;
  }

  function randomIndex(length) {
    if (window.crypto?.getRandomValues) {
      const value = new Uint32Array(1);
      window.crypto.getRandomValues(value);
      return value[0] % length;
    }
    return Math.floor(Math.random() * length);
  }

  function initRandomFiveStarReviewer() {
    const root = document.querySelector('[data-cp-random-five-star]');
    if (!root || root.dataset.cpReady === 'true') return;

    const productId = root.dataset.productId;
    const name = root.querySelector('[data-cp-reviewer-name]');
    const count = root.querySelector('[data-cp-reviewer-count]');
    const avatar = root.querySelector('[data-cp-reviewer-avatar]');
    if (!productId || !name || !count) return;
    root.dataset.cpReady = 'true';

    const endpoint = `https://bewertungen.camping-pioneers.de/api/public/products/${encodeURIComponent(productId)}/reviews`;
    const loadPage = (page) => fetch(`${endpoint}?limit=50&page=${page}`, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      })
        .then((response) => response.ok ? response.json() : Promise.reject(new Error('Reviews unavailable')));

    loadPage(1)
      .then(async (firstPage) => {
        const totalPages = Math.min(10, Math.max(1, Number(firstPage.totalPages || 1)));
        const additionalPages = totalPages > 1
          ? await Promise.all(Array.from({ length: totalPages - 1 }, (_, index) => loadPage(index + 2)))
          : [];
        return [firstPage, ...additionalPages]
          .flatMap((page) => Array.isArray(page.reviews) ? page.reviews : []);
      })
      .then((reviews) => {
        const fiveStarReviews = reviews.filter((review) => Number(review.rating) === 5 && String(review.customerName || '').trim());
        if (!fiveStarReviews.length) return;

        const selected = fiveStarReviews[randomIndex(fiveStarReviews.length)];
        const displayName = reviewerDisplayName(selected.customerName);
        if (!displayName) return;
        name.textContent = displayName;
        count.textContent = new Intl.NumberFormat('de-DE').format(Math.max(0, fiveStarReviews.length - 1));
        if (avatar) avatar.textContent = displayName.charAt(0).toLocaleUpperCase('de-DE');
        root.hidden = false;
      })
      .catch(() => {});
  }

  function initAdaptiveProductSticky() {
    if (!document.body.classList.contains('cp-lagun-redesign')) return;
    const product = document.querySelector('product-info .product');
    const media = product?.querySelector(':scope > .product__media-wrapper');
    const info = product?.querySelector('.product__info-container');
    if (!product || !media || !info || product.dataset.cpStickyReady === 'true') return;

    const desktop = window.matchMedia('(min-width: 990px)');
    let frame = 0;
    const refresh = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        product.classList.remove('cp-sticky-media', 'cp-sticky-info');
        product.removeAttribute('data-cp-sticky-mode');
        if (!desktop.matches || !product.isConnected) return;

        const mediaHeight = media.getBoundingClientRect().height;
        const infoHeight = info.getBoundingClientRect().height;
        if (infoHeight > mediaHeight + 40) {
          product.classList.add('cp-sticky-media');
          product.dataset.cpStickyMode = 'media';
        } else if (mediaHeight > infoHeight + 40) {
          product.classList.add('cp-sticky-info');
          product.dataset.cpStickyMode = 'info';
        }
      });
    };

    const observer = 'ResizeObserver' in window ? new ResizeObserver(refresh) : null;
    observer?.observe(media);
    observer?.observe(info);
    media.querySelectorAll('img, video').forEach((element) => {
      element.addEventListener('load', refresh, { once: true });
      element.addEventListener('loadedmetadata', refresh, { once: true });
    });
    desktop.addEventListener?.('change', refresh);
    window.addEventListener('resize', refresh, { passive: true });
    product.dataset.cpStickyReady = 'true';
    refresh();
  }

  function initEditorialScrollEffects() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    document.querySelectorAll('[data-cp-lagun-experience]').forEach((root) => {
      if (root.dataset.cpRevealReady === 'true') return;

      const sections = Array.from(root.children).filter((element) => (
        element.matches('section') && !element.matches('[data-cp-video-scrub], [data-cp-hotspots]')
      ));
      const motionSpeeds = [-14, 9, -7, 16, -11, 6];
      sections.forEach((section) => {
        section.classList.add('cp-lagun-scroll-reveal');
        Array.from(section.children).forEach((child, index) => {
          child.dataset.cpMotionSpeed = String(motionSpeeds[index % motionSpeeds.length]);
        });
      });

      if (!('IntersectionObserver' in window)) {
        sections.forEach((section) => section.classList.add('is-visible'));
        root.dataset.cpRevealReady = 'true';
        return;
      }

      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });

      sections.forEach((section) => observer.observe(section));
      root.dataset.cpRevealReady = 'true';
    });
  }

  function hotspotPositionFraction(token, axis) {
    const value = String(token || '').trim().toLowerCase();
    if (!value) return 0.5;
    if (value === 'center') return 0.5;
    if (value === 'left' || value === 'top') return 0;
    if (value === 'right' || value === 'bottom') return 1;
    if (value.endsWith('%')) return Math.min(1, Math.max(0, Number.parseFloat(value) / 100));
    return axis === 'x' ? 0.5 : 0.5;
  }

  function projectHotspotCanvas(canvas) {
    const image = canvas.querySelector('.cp-lagun-hotspots__image, img');
    const markers = Array.from(canvas.querySelectorAll('[data-cp-hotspot-marker]'));
    if (!image || !markers.length || !image.naturalWidth || !image.naturalHeight) return;

    const boxWidth = image.clientWidth;
    const boxHeight = image.clientHeight;
    if (!boxWidth || !boxHeight) return;

    const style = window.getComputedStyle(image);
    const naturalWidth = image.naturalWidth;
    const naturalHeight = image.naturalHeight;
    const containScale = Math.min(boxWidth / naturalWidth, boxHeight / naturalHeight);
    let scaleX = boxWidth / naturalWidth;
    let scaleY = boxHeight / naturalHeight;

    if (style.objectFit === 'contain') {
      scaleX = containScale;
      scaleY = containScale;
    } else if (style.objectFit === 'cover') {
      const coverScale = Math.max(boxWidth / naturalWidth, boxHeight / naturalHeight);
      scaleX = coverScale;
      scaleY = coverScale;
    } else if (style.objectFit === 'none') {
      scaleX = 1;
      scaleY = 1;
    } else if (style.objectFit === 'scale-down') {
      const scaleDown = Math.min(1, containScale);
      scaleX = scaleDown;
      scaleY = scaleDown;
    }

    const renderedWidth = naturalWidth * scaleX;
    const renderedHeight = naturalHeight * scaleY;
    const objectPosition = style.objectPosition.trim().split(/\s+/);
    const positionX = hotspotPositionFraction(objectPosition[0], 'x');
    const positionY = hotspotPositionFraction(objectPosition[1] || objectPosition[0], 'y');
    const imageContentLeft = image.offsetLeft + ((boxWidth - renderedWidth) * positionX);
    const imageContentTop = image.offsetTop + ((boxHeight - renderedHeight) * positionY);

    markers.forEach((marker) => {
      const sourceX = Math.min(100, Math.max(0, Number(marker.dataset.cpSourceX || 50))) / 100;
      const sourceY = Math.min(100, Math.max(0, Number(marker.dataset.cpSourceY || 50))) / 100;
      const projectedLeft = imageContentLeft + (renderedWidth * sourceX);
      const projectedTop = imageContentTop + (renderedHeight * sourceY);
      const isCropped = projectedLeft < image.offsetLeft
        || projectedLeft > image.offsetLeft + boxWidth
        || projectedTop < image.offsetTop
        || projectedTop > image.offsetTop + boxHeight;

      marker.style.setProperty('--cp-hotspot-left', `${projectedLeft.toFixed(3)}px`);
      marker.style.setProperty('--cp-hotspot-top', `${projectedTop.toFixed(3)}px`);
      marker.classList.toggle('is-cropped', isCropped);
    });

    canvas.dataset.cpHotspotProjected = 'true';
    canvas.dataset.cpHotspotFit = style.objectFit;
  }

  function initHotspotGeometry() {
    document.querySelectorAll('[data-cp-hotspot-canvas]').forEach((canvas) => {
      const image = canvas.querySelector('.cp-lagun-hotspots__image, img');
      if (!image) return;

      const refresh = () => window.requestAnimationFrame(() => projectHotspotCanvas(canvas));
      if (canvas.dataset.cpHotspotGeometryReady !== 'true') {
        image.addEventListener('load', refresh);
        if ('ResizeObserver' in window) {
          const observer = new ResizeObserver(refresh);
          observer.observe(canvas);
          observer.observe(image);
        } else {
          window.addEventListener('resize', refresh, { passive: true });
        }
        canvas.dataset.cpHotspotGeometryReady = 'true';
      }

      refresh();
    });
  }

  function initImmersiveLagunScroll() {
    if (!document.querySelector('[data-cp-lagun-experience]')) return;

    if (window.cpLagunImmersiveController) {
      window.cpLagunImmersiveController.registerMedia();
      window.cpLagunImmersiveController.schedule();
      return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;

    const clamp = (value, minimum = 0, maximum = 1) => Math.min(maximum, Math.max(minimum, value));
    const sceneColors = {
      paper: [244, 246, 249],
      forest: [23, 53, 44],
      technical: [5, 7, 10],
    };
    const mixColor = (from, to, progress) => from.map((channel, index) => (
      Math.round(channel + ((to[index] - channel) * progress))
    ));
    const smoothstep = (progress) => progress * progress * (3 - (2 * progress));
    const sectionProgress = (section) => {
      if (!section) return 0;
      const rect = section.getBoundingClientRect();
      const range = Math.max(1, section.offsetHeight - window.innerHeight);
      return clamp(-rect.top / range);
    };

    const update = () => {
      frame = 0;

      const sceneModules = Array.from(document.querySelectorAll('.cp-lagun-editor-section [data-cp-scene]'));
      if (sceneModules.length) {
        const viewportAnchor = window.innerHeight * 0.54;
        const sceneAnchors = sceneModules.map((module) => {
          const rect = module.getBoundingClientRect();
          return {
            scene: module.dataset.cpScene || 'paper',
            center: rect.top + (rect.height / 2),
          };
        });
        let before = sceneAnchors[0];
        let after = sceneAnchors[sceneAnchors.length - 1];
        for (let index = 0; index < sceneAnchors.length; index += 1) {
          if (sceneAnchors[index].center <= viewportAnchor) before = sceneAnchors[index];
          if (sceneAnchors[index].center >= viewportAnchor) {
            after = sceneAnchors[index];
            break;
          }
        }
        const distance = Math.max(1, after.center - before.center);
        const rawProgress = before === after ? 0 : clamp((viewportAnchor - before.center) / distance);
        const transitionProgress = smoothstep(rawProgress);
        const fromColor = sceneColors[before.scene] || sceneColors.paper;
        const toColor = sceneColors[after.scene] || fromColor;
        const color = mixColor(fromColor, toColor, transitionProgress);
        document.body.style.setProperty('--cp-lagun-viewport-bg', `rgb(${color.join(', ')})`);
        const scrollWave = window.scrollY / Math.max(700, window.innerHeight * 1.35);
        document.body.style.setProperty('--cp-lagun-gradient-x-one', `${(16 + (Math.sin(scrollWave) * 10)).toFixed(2)}%`);
        document.body.style.setProperty('--cp-lagun-gradient-y-one', `${(24 + (Math.cos(scrollWave * 0.72) * 12)).toFixed(2)}%`);
        document.body.style.setProperty('--cp-lagun-gradient-x-two', `${(84 + (Math.cos(scrollWave * 0.62) * 9)).toFixed(2)}%`);
        document.body.style.setProperty('--cp-lagun-gradient-y-two', `${(66 + (Math.sin(scrollWave * 0.83) * 14)).toFixed(2)}%`);
        document.body.dataset.cpViewportScene = transitionProgress < 0.5 ? before.scene : after.scene;
        document.body.dataset.cpViewportSceneProgress = transitionProgress.toFixed(4);
      }

      document.querySelectorAll('[data-cp-lagun-experience]').forEach((experience) => {
        const backgroundScenes = Array.from(experience.querySelectorAll('[data-cp-background-scene]'));
        if (!backgroundScenes.length) return;
        let activeScene = experience.dataset.cpScene || 'paper';
        const sceneLine = window.innerHeight * 0.52;
        backgroundScenes.forEach((scene) => {
          if (scene.getBoundingClientRect().top <= sceneLine) {
            activeScene = scene.dataset.cpBackgroundScene || activeScene;
          }
        });
        experience.dataset.cpScene = activeScene;
      });

      if (prefersReducedMotion.matches) return;

      document.querySelectorAll('[data-cp-parallax]').forEach((item) => {
        const rect = item.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) return;
        const itemCenter = rect.top + rect.height / 2;
        const offset = clamp((window.innerHeight / 2 - itemCenter) / window.innerHeight, -1, 1) * 3.2;
        item.style.setProperty('--cp-parallax-y', `${offset.toFixed(2)}rem`);
      });

      document.querySelectorAll('[data-cp-motion-speed]').forEach((item) => {
        const rect = item.getBoundingClientRect();
        if (rect.bottom < -80 || rect.top > window.innerHeight + 80) return;
        const itemCenter = rect.top + (rect.height / 2);
        const travel = clamp((window.innerHeight / 2 - itemCenter) / window.innerHeight, -1, 1);
        const speed = Number(item.dataset.cpMotionSpeed || 0);
        item.style.setProperty('--cp-motion-y', `${(travel * speed).toFixed(2)}px`);
      });

      document.querySelectorAll('[data-cp-video-scrub]').forEach((spin) => {
        const spinVideo = spin.querySelector('video');
        const spinChapters = Array.from(spin.querySelectorAll('[data-cp-spin-chapter]'));
        const progress = sectionProgress(spin);
        const spinArc = Math.sin(progress * Math.PI);
        spin.style.setProperty('--cp-spin-progress', progress.toFixed(4));
        spin.style.setProperty('--cp-spin-drift', `${((0.5 - progress) * 18).toFixed(2)}px`);
        spin.style.setProperty('--cp-spin-scale', (1.01 + spinArc * 0.03).toFixed(4));
        spin.style.setProperty('--cp-spin-heading-shift', `${(progress * -14).toFixed(2)}px`);
        spin.style.setProperty('--cp-spin-chapters-shift', `${((0.5 - progress) * 10).toFixed(2)}px`);

        if (spinVideo?.duration && spinVideo.readyState >= 1) {
          const targetTime = Math.min(Math.max(0, spinVideo.duration - 0.04), progress * spinVideo.duration);
          if (Math.abs(spinVideo.currentTime - targetTime) > 0.025) spinVideo.currentTime = targetTime;
        }

        const chapterIndex = Math.min(
          Math.max(0, spinChapters.length - 1),
          Math.floor(progress * spinChapters.length),
        );
        spinChapters.forEach((chapter, index) => chapter.classList.toggle('is-active', index === chapterIndex));
        spin.dataset.cpProgress = progress.toFixed(3);
      });

      document.querySelectorAll('[data-cp-hotspots]').forEach((hotspots) => {
        const hotspotMarkers = Array.from(hotspots.querySelectorAll('[data-cp-hotspot-marker]'));
        const hotspotCards = Array.from(hotspots.querySelectorAll('[data-cp-hotspot-card]'));
        if (!hotspotCards.length) return;
        const progress = sectionProgress(hotspots);
        const hotspotArc = Math.sin(progress * Math.PI);
        hotspots.style.setProperty('--cp-hotspot-progress', progress.toFixed(4));
        hotspots.style.setProperty('--cp-hotspot-drift', `${((0.5 - progress) * 14).toFixed(2)}px`);
        hotspots.style.setProperty('--cp-hotspot-scale', (0.99 + hotspotArc * 0.025).toFixed(4));
        const activeIndex = Math.min(hotspotCards.length - 1, Math.floor(progress * hotspotCards.length));
        hotspotMarkers.forEach((marker, index) => {
          marker.classList.toggle('is-active', index === activeIndex);
          marker.classList.toggle('is-past', index < activeIndex);
        });
        hotspotCards.forEach((card, index) => card.classList.toggle('is-active', index === activeIndex));
        hotspots.dataset.cpActiveHotspot = String(activeIndex + 1);
        hotspots.dataset.cpProgress = progress.toFixed(3);
      });
    };

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    const registerMedia = () => {
      document.querySelectorAll('[data-cp-video-scrub] video').forEach((video) => {
        video.pause();
        if (video.dataset.cpScrubReady === 'true') return;
        video.addEventListener('loadedmetadata', schedule);
        video.dataset.cpScrubReady = 'true';
      });
    };

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    prefersReducedMotion.addEventListener?.('change', schedule);
    window.cpLagunImmersiveController = { registerMedia, schedule };
    registerMedia();
    schedule();
  }

  function initBundleBuilder() {
    document.querySelectorAll('[data-cp-bundle]').forEach((root) => {
      if (root.dataset.cpReady === 'true') return;

      const checkboxes = Array.from(root.querySelectorAll('[data-cp-bundle-item]'));
      const total = root.querySelector('[data-cp-bundle-total]');
      const button = root.querySelector('[data-cp-bundle-add]');
      const status = root.querySelector('[data-cp-bundle-status]');
      const currency = root.closest('[data-cp-lagun-experience]')?.dataset.currency || 'EUR';
      const money = new Intl.NumberFormat('de-DE', { style: 'currency', currency });

    const selectedItems = () => checkboxes
      .filter((checkbox) => checkbox.checked && checkbox.dataset.variantId)
      .map((checkbox) => ({
        id: Number(checkbox.dataset.variantId),
        quantity: 1,
        price: Number(checkbox.dataset.price || 0),
      }));

    const updateTotal = () => {
      const cents = selectedItems().reduce((sum, item) => sum + item.price, 0);
      if (total) total.textContent = money.format(cents / 100);
    };

    checkboxes.forEach((checkbox) => checkbox.addEventListener('change', updateTotal));
    updateTotal();

    button?.addEventListener('click', async () => {
      const items = selectedItems().map(({ id, quantity }) => ({ id, quantity }));
      if (!items.length) return;

      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      if (status) status.textContent = root.dataset.addingText || 'Auswahl wird hinzugefügt …';

      try {
        const response = await fetch(window.theme?.routes?.cart_add_url || '/cart/add.js', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          body: JSON.stringify({ items }),
        });

        const result = await response.json();
        if (!response.ok || result.status) {
          throw new Error(result.description || result.message || 'Die Auswahl konnte nicht hinzugefügt werden.');
        }

        if (status) status.textContent = root.dataset.successText || 'Die Auswahl liegt jetzt im Warenkorb.';
        document.dispatchEvent(new CustomEvent('cart:refresh', { detail: { open: true } }));

        if (!document.querySelector('cart-drawer')) {
          window.location.assign(window.theme?.routes?.cart_url || '/cart');
        }
      } catch (error) {
        if (status) status.textContent = error.message || root.dataset.errorText || 'Die Auswahl konnte nicht hinzugefügt werden.';
      } finally {
        button.disabled = false;
        button.removeAttribute('aria-busy');
      }
    });

      root.dataset.cpReady = 'true';
    });
  }

  function initLagunProductSwitches() {
    document.querySelectorAll('[data-cp-lagun-product-switch]').forEach((link) => {
      if (link.dataset.cpSwitchReady === 'true') return;
      link.addEventListener('click', (event) => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const target = new URL(link.href, window.location.href);
        if (target.origin !== window.location.origin || target.pathname === window.location.pathname) return;
        event.preventDefault();
        document.body.classList.add('cp-lagun-product-switching');
        window.setTimeout(() => window.location.assign(target.href), 170);
      });
      link.dataset.cpSwitchReady = 'true';
    });
  }

  function init() {
    document.documentElement.classList.add('cp-redesign-ready');
    enhanceAnnouncementBar();
    integrateSearch();
    improveMegaMenuSemantics();
    enhanceLagunGallery();
    relocateProductReviews();
    initRandomFiveStarReviewer();
    initAdaptiveProductSticky();
    initEditorialScrollEffects();
    initHotspotGeometry();
    initImmersiveLagunScroll();
    initBundleBuilder();
    initLagunProductSwitches();
  }

  onReady(init);
  document.addEventListener('shopify:section:load', () => {
    enhanceAnnouncementBar();
    enhanceLagunGallery();
    relocateProductReviews();
    initRandomFiveStarReviewer();
    initAdaptiveProductSticky();
    initEditorialScrollEffects();
    initHotspotGeometry();
    initImmersiveLagunScroll();
    initBundleBuilder();
    initLagunProductSwitches();
  });
})();
