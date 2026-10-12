class SocialFloating extends HTMLElement {
  constructor() {
    super();

    // Prevent popup on Shopify robot challenge page
    if (window.location.pathname === '/challenge') {
      return;
    }

    this.classes = {
      activeClass: 'is-active',
      closingClass: 'is-closing'
    };

    this.querySelectorAll('[data-social-toggle]').forEach((button) => {
      button.addEventListener('click', this.onButtonClick.bind(this));
    });
  }

  onButtonClick(event) {
    event.preventDefault();
    if (!theme.config.mqlSmall) return;

    this.classList.contains(this.classes.activeClass) ? this.close() : this.open();
  }

  open() {
    this.classList.add(this.classes.activeClass);

    // close promo-popup
    const popup = document.querySelector('promo-popup');
    popup && popup.close();
  }

  close() {
    this.classList.add(this.classes.closingClass);

    setTimeout(() => {
      this.classList.remove(this.classes.activeClass);
      this.classList.remove(this.classes.closingClass);
    }, 500);
  }
}
if (!customElements.get('social-floating')) {
  customElements.define('social-floating', SocialFloating);
}

class PromoPopup extends HTMLElement {
  constructor() {
    super();

    // Prevent popup on Shopify robot challenge page
    if (window.location.pathname === '/challenge') {
      return;
    }

    this.cookieName = 'beyours:promo-popup';
    this.autoOpen = this.dataset.autoOpen === 'true';
    this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.openedBy = null;

    this.classes = {
      bodyClass: 'promo-popup--open',
      activeClass: 'is-active',
      closingClass: 'is-closing',
      showImage: 'show-image'
    };

    this.popup = this.querySelector('.promo-popup');
    this.toggleButtons = this.querySelectorAll('[data-popup-toggle]');
    this.triggerButtons = this.querySelectorAll('[data-popup-trigger]');

    this.toggleButtons.forEach((button) => {
      button.addEventListener('click', this.onButtonClick.bind(this));
    });

    this.onKeydown = this.onKeydown.bind(this);
    document.addEventListener('keydown', this.onKeydown);

    // Only reopen after a submission from this modal. Other customer forms on
    // the page use their own anchors and must not trigger the popup.
    if (window.location.hash === '#LagunNewsletterPopup' && this.querySelector('.form__message')) {
      this.open();
    } else if (this.autoOpen && (!this.getCookie(this.cookieName) || this.dataset.testMode === 'true')) {
      this.init();
    }
  }

  connectedCallback() {
    if (Shopify.designMode) {
      this.onShopifySectionLoad = this.onSectionLoad.bind(this);
      this.onShopifySectionSelect = this.onSectionSelect.bind(this);
      this.onShopifySectionDeselect = this.onSectionDeselect.bind(this);
      document.addEventListener('shopify:section:load', this.onShopifySectionLoad);
      document.addEventListener('shopify:section:select', this.onShopifySectionSelect);
      document.addEventListener('shopify:section:deselect', this.onShopifySectionDeselect);
    }
  }
  disconnectedCallback() {
    document.removeEventListener('keydown', this.onKeydown);

    if (Shopify.designMode) {
      document.removeEventListener('shopify:section:load', this.onShopifySectionLoad);
      document.removeEventListener('shopify:section:select', this.onShopifySectionSelect);
      document.removeEventListener('shopify:section:deselect', this.onShopifySectionDeselect);

      document.body.classList.remove(this.classes.bodyClass);
    }
  }
  onSectionLoad(event) {
    filterShopifyEvent(event, this, this.open.bind(this));
  }
  onSectionSelect(event) {
    filterShopifyEvent(event, this, this.open.bind(this));
  }
  onSectionDeselect(event) {
    filterShopifyEvent(event, this, this.close.bind(this));
  }

  init() {
    if(!this.popup) {
      return;
    }
    
    if (Shopify && Shopify.designMode) {
      return;
    }

    setTimeout(function() {
      this.open();
    }.bind(this), parseInt(this.dataset.delay) * 1000);
  }

  onButtonClick(event) {
    event.preventDefault();
    if (!this.popup) return;

    if (this.popup.classList.contains(this.classes.activeClass)) {
      this.close();
      return;
    }

    if (event.currentTarget.matches('[data-popup-trigger]')) {
      this.openedBy = event.currentTarget;
    }
    this.open();
  }

  onKeydown(event) {
    if (event.key === 'Escape' && this.popup?.classList.contains(this.classes.activeClass)) {
      event.preventDefault();
      this.close();
    }
  }

  open() {
    if (!this.popup || this.popup.classList.contains(this.classes.activeClass)) return;

    document.body.classList.remove(this.classes.bodyClass);
    this.classList.add('is-modal-open');
    this.popup.classList.remove(this.classes.closingClass);
    this.popup.classList.add(this.classes.activeClass);
    this.popup.setAttribute('aria-hidden', 'false');
    this.triggerButtons.forEach((button) => button.setAttribute('aria-expanded', 'true'));

    setTimeout(() => {
      this.popup.classList.add(this.classes.showImage);
    }, this.reduceMotion ? 0 : 600);

    if (this.popup.dataset.position === 'center') {
      setScrollbarWidth();
      document.body.classList.add(this.classes.bodyClass);
    }

    requestAnimationFrame(() => {
      const closeButton = this.popup.querySelector('.popup-close');
      if (typeof trapFocus === 'function') {
        trapFocus(this.popup, closeButton || this.popup);
      } else {
        (closeButton || this.popup).focus();
      }
    });

    // close social-floating
    const social = document.querySelector('social-floating');
    social && social.close();
  }

  close() {
    if (!this.popup || !this.popup.classList.contains(this.classes.activeClass)) return;

    this.popup.classList.add(this.classes.closingClass);

    setTimeout(() => {
      this.popup.classList.remove(this.classes.activeClass);
      this.popup.classList.remove(this.classes.closingClass);
      this.popup.classList.remove(this.classes.showImage);
      this.classList.remove('is-modal-open');
      this.popup.setAttribute('aria-hidden', 'true');
      this.triggerButtons.forEach((button) => button.setAttribute('aria-expanded', 'false'));

      if (this.popup.dataset.position === 'center') {
        document.body.classList.remove(this.classes.bodyClass);
      }

      if (typeof removeTrapFocus === 'function') {
        removeTrapFocus(this.openedBy);
      } else if (this.openedBy) {
        this.openedBy.focus();
      }
    }, this.reduceMotion ? 0 : 500);

    // Manual teaser mode remains permanently available and never writes a cookie.
    if (!this.autoOpen) return;

    // Remove a cookie in case it was set in test mode.
    if (this.dataset.testMode === 'true') {
      this.removeCookie(this.cookieName);
      return;
    }

    this.setCookie(this.cookieName, this.dataset.expiry);
  }

  getCookie(name) {
    const match = document.cookie.match(`(^|;)\\s*${name}\\s*=\\s*([^;]+)`);
    return match ? match[2] : null;
  }

  setCookie(name, expiry) {
    document.cookie = `${name}=true; max-age=${(expiry * 24 * 60 * 60)}; path=/`;
  }

  removeCookie(name) {
    document.cookie = `${name}=; max-age=0`;
  }
}
if (!customElements.get('promo-popup')) {
  customElements.define('promo-popup', PromoPopup);
}
