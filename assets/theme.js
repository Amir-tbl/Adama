/* ==========================================================================
   ADAMA Theme - JavaScript
   Vanilla JS, no dependencies
   ========================================================================== */

(function () {
  'use strict';

  /* -----------------------------------------------------------------------
     Utility Functions
     ----------------------------------------------------------------------- */
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  function debounce(fn, delay = 300) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function fetchJSON(url, options = {}) {
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...options.headers,
      },
    }).then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    });
  }

  function formatMoney(cents) {
    const format = window.theme?.moneyFormat || '${{amount}}';
    const amount = (cents / 100).toFixed(2);
    return format
      .replace('{{amount}}', amount)
      .replace('{{amount_no_decimals}}', Math.round(cents / 100))
      .replace('{{amount_with_comma_separator}}', amount.replace('.', ','))
      .replace('{{amount_no_decimals_with_comma_separator}}', Math.round(cents / 100));
  }

  /* -----------------------------------------------------------------------
     Header - Sticky & Scroll behavior
     ----------------------------------------------------------------------- */
  const Header = {
    init() {
      this.header = $('[data-header]');
      if (!this.header) return;

      this.lastScroll = 0;
      this.isSticky = this.header.classList.contains('header--sticky');

      if (this.isSticky) {
        window.addEventListener('scroll', debounce(() => this.onScroll(), 10), { passive: true });
      }
    },

    onScroll() {
      const scrollY = window.scrollY;
      if (scrollY > 50) {
        this.header.classList.add('header--scrolled');
      } else {
        this.header.classList.remove('header--scrolled');
      }
      this.lastScroll = scrollY;
    },
  };

  /* -----------------------------------------------------------------------
     Mobile Navigation
     ----------------------------------------------------------------------- */
  const MobileNav = {
    init() {
      this.nav = $('[data-mobile-nav]');
      this.toggleBtn = $('[data-mobile-menu-toggle]');
      this.closeBtn = $('[data-mobile-menu-close]');

      if (!this.nav || !this.toggleBtn) return;

      this.toggleBtn.addEventListener('click', () => this.toggle());
      if (this.closeBtn) {
        this.closeBtn.addEventListener('click', () => this.close());
      }

      // Submenu toggles
      $$('.mobile-nav__toggle', this.nav).forEach((btn) => {
        btn.addEventListener('click', () => {
          const expanded = btn.getAttribute('aria-expanded') === 'true';
          btn.setAttribute('aria-expanded', !expanded);
        });
      });

      // Close on overlay click
      const overlay = $('#overlay');
      if (overlay) {
        overlay.addEventListener('click', () => this.close());
      }
    },

    toggle() {
      const isOpen = this.nav.classList.contains('is-active');
      if (isOpen) {
        this.close();
      } else {
        this.open();
      }
    },

    open() {
      this.nav.classList.add('is-active');
      this.nav.setAttribute('aria-hidden', 'false');
      this.toggleBtn.setAttribute('aria-expanded', 'true');
      document.body.classList.add('no-scroll');
      const overlay = $('#overlay');
      if (overlay) overlay.classList.add('is-active');
    },

    close() {
      this.nav.classList.remove('is-active');
      this.nav.setAttribute('aria-hidden', 'true');
      this.toggleBtn.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('no-scroll');
      const overlay = $('#overlay');
      if (overlay) overlay.classList.remove('is-active');
    },
  };

  /* -----------------------------------------------------------------------
     Search
     ----------------------------------------------------------------------- */
  const Search = {
    init() {
      this.overlay = $('[data-search-overlay]');
      this.toggleBtns = $$('[data-search-toggle]');
      this.closeBtn = $('[data-search-close]');
      this.input = $('[data-predictive-search-input]');
      this.results = $('[data-predictive-search-results]');

      if (!this.overlay) return;

      this.toggleBtns.forEach((btn) => {
        btn.addEventListener('click', () => this.toggle());
      });

      if (this.closeBtn) {
        this.closeBtn.addEventListener('click', () => this.close());
      }

      if (this.input) {
        this.input.addEventListener('input', debounce(() => this.predict(), 300));
      }

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.overlay.classList.contains('is-active')) {
          this.close();
        }
      });
    },

    toggle() {
      if (this.overlay.classList.contains('is-active')) {
        this.close();
      } else {
        this.open();
      }
    },

    open() {
      this.overlay.classList.add('is-active');
      this.overlay.setAttribute('aria-hidden', 'false');
      if (this.input) {
        setTimeout(() => this.input.focus(), 100);
      }
    },

    close() {
      this.overlay.classList.remove('is-active');
      this.overlay.setAttribute('aria-hidden', 'true');
      if (this.input) this.input.value = '';
      if (this.results) this.results.innerHTML = '';
    },

    predict() {
      const query = this.input.value.trim();
      if (query.length < 2) {
        this.results.innerHTML = '';
        return;
      }

      const url = `${window.theme.routes.predictive_search_url}?q=${encodeURIComponent(query)}&resources[type]=product&resources[limit]=6&section_id=predictive-search`;

      fetch(url)
        .then((res) => res.text())
        .then((html) => {
          // Parse product results from the Shopify predictive search response
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          const results = doc.querySelector('#shopify-section-predictive-search');

          if (results) {
            this.results.innerHTML = results.innerHTML;
          } else {
            // Fallback: use the search API directly
            this.predictFallback(query);
          }
        })
        .catch(() => this.predictFallback(query));
    },

    predictFallback(query) {
      fetchJSON(`${window.theme.routes.search_url}.json?q=${encodeURIComponent(query)}&type=product&limit=6`)
        .then((data) => {
          if (!data.results || data.results.length === 0) {
            this.results.innerHTML = '<p style="padding: 1rem; color: var(--color-text-secondary);">No results found.</p>';
            return;
          }

          const html = data.results.map((item) => `
            <a href="${item.url}" class="predictive-search__item">
              ${item.image ? `<img src="${item.image}" alt="${item.title}" class="predictive-search__item-image" width="50" height="50" loading="lazy">` : ''}
              <div>
                <div class="predictive-search__item-title">${item.title}</div>
                <div class="predictive-search__item-price">${formatMoney(item.price)}</div>
              </div>
            </a>
          `).join('');

          this.results.innerHTML = `<div class="predictive-search__results">${html}</div>`;
        })
        .catch(() => {
          this.results.innerHTML = '';
        });
    },
  };

  /* -----------------------------------------------------------------------
     Announcement Bar
     ----------------------------------------------------------------------- */
  const AnnouncementBar = {
    init() {
      const closeBtn = $('[data-announcement-close]');
      if (!closeBtn) return;

      closeBtn.addEventListener('click', () => {
        const bar = $('[data-announcement-bar]');
        if (bar) {
          bar.style.display = 'none';
          sessionStorage.setItem('announcement-dismissed', 'true');
        }
      });

      // Check if previously dismissed
      if (sessionStorage.getItem('announcement-dismissed') === 'true') {
        const bar = $('[data-announcement-bar]');
        if (bar) bar.style.display = 'none';
      }
    },
  };

  /* -----------------------------------------------------------------------
     Cart (Drawer & Page)
     ----------------------------------------------------------------------- */
  const Cart = {
    init() {
      this.drawer = $('[data-cart-drawer]');
      this.toggleBtns = $$('[data-cart-toggle]');
      this.closeBtns = $$('[data-cart-drawer-close]');

      this.toggleBtns.forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          if (window.theme?.settings?.cart_type === 'page') {
            window.location.href = window.theme.routes.cart_url;
          } else {
            this.toggleDrawer();
          }
        });
      });

      this.closeBtns.forEach((btn) => {
        btn.addEventListener('click', () => this.closeDrawer());
      });

      // Listen for add-to-cart events
      document.addEventListener('cart:add', (e) => {
        this.onItemAdded(e.detail);
      });

      // Quantity buttons in cart
      this.bindCartQuantity();

      // Remove buttons
      this.bindCartRemove();

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.drawer?.classList.contains('is-active')) {
          this.closeDrawer();
        }
      });
    },

    toggleDrawer() {
      if (!this.drawer) return;
      if (this.drawer.classList.contains('is-active')) {
        this.closeDrawer();
      } else {
        this.openDrawer();
      }
    },

    openDrawer() {
      if (!this.drawer) return;
      this.drawer.classList.add('is-active');
      this.drawer.setAttribute('aria-hidden', 'false');
      document.body.classList.add('no-scroll');
    },

    closeDrawer() {
      if (!this.drawer) return;
      this.drawer.classList.remove('is-active');
      this.drawer.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('no-scroll');
    },

    bindCartQuantity() {
      document.addEventListener('click', (e) => {
        const minus = e.target.closest('[data-quantity-minus][data-line]');
        const plus = e.target.closest('[data-quantity-plus][data-line]');

        if (minus) {
          const line = parseInt(minus.dataset.line);
          const input = minus.closest('[data-quantity-selector]')?.querySelector('[data-quantity-input]');
          if (input) {
            const newVal = Math.max(0, parseInt(input.value) - 1);
            input.value = newVal;
            this.updateLine(line, newVal);
          }
        }

        if (plus) {
          const line = parseInt(plus.dataset.line);
          const input = plus.closest('[data-quantity-selector]')?.querySelector('[data-quantity-input]');
          if (input) {
            const newVal = parseInt(input.value) + 1;
            input.value = newVal;
            this.updateLine(line, newVal);
          }
        }
      });
    },

    bindCartRemove() {
      document.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('[data-cart-remove]');
        if (removeBtn) {
          const line = parseInt(removeBtn.dataset.line);
          this.updateLine(line, 0);
        }
      });
    },

    updateLine(line, quantity) {
      fetchJSON(window.theme.routes.cart_change_url + '.js', {
        method: 'POST',
        body: JSON.stringify({ line, quantity }),
      })
        .then((cart) => {
          this.updateCartUI(cart);
        })
        .catch(console.error);
    },

    addToCart(variantId, quantity = 1) {
      const body = {
        items: [{ id: variantId, quantity }],
      };

      return fetchJSON(window.theme.routes.cart_add_url + '.js', {
        method: 'POST',
        body: JSON.stringify(body),
      }).then((data) => {
        document.dispatchEvent(new CustomEvent('cart:add', { detail: data }));
        return this.getCart();
      });
    },

    getCart() {
      return fetchJSON(window.theme.routes.cart_url + '.js').then((cart) => {
        this.updateCartUI(cart);
        return cart;
      });
    },

    onItemAdded() {
      this.getCart().then(() => {
        this.openDrawer();
      });
    },

    updateCartUI(cart) {
      // Update cart count badges
      $$('[data-cart-count]').forEach((el) => {
        el.textContent = cart.item_count;
        el.classList.toggle('hidden', cart.item_count === 0);
      });

      // Update subtotal
      $$('[data-cart-subtotal], [data-cart-drawer-subtotal]').forEach((el) => {
        el.textContent = formatMoney(cart.total_price);
      });

      // Refresh drawer content
      this.refreshDrawer(cart);
    },

    refreshDrawer(cart) {
      const body = $('[data-cart-drawer-body]');
      const footer = $('[data-cart-drawer-footer]');
      if (!body) return;

      if (cart.item_count === 0) {
        body.innerHTML = `
          <div class="cart-drawer__empty" data-cart-drawer-empty>
            <p>${window.theme.strings.viewCart || 'Your cart is empty.'}</p>
            <a href="/collections/all" class="btn btn--primary">Continue Shopping</a>
          </div>
        `;
        if (footer) footer.style.display = 'none';
        return;
      }

      if (footer) footer.style.display = '';

      const itemsHtml = cart.items.map((item, index) => {
        const line = index + 1;
        const variantTitle = item.variant_title && item.variant_title !== 'Default Title' ? item.variant_title : '';
        return `
          <div class="cart-drawer__item" data-cart-drawer-item data-line="${line}" data-key="${item.key}">
            <div class="cart-drawer__item-media">
              <a href="${item.url}">
                ${item.image ? `<img src="${this.resizeImage(item.image, '150x')}" alt="${item.title}" width="80" height="80" loading="lazy">` : ''}
              </a>
            </div>
            <div class="cart-drawer__item-info">
              <a href="${item.url}" class="cart-drawer__item-title">${item.product_title}</a>
              ${variantTitle ? `<p class="cart-drawer__item-variant">${variantTitle}</p>` : ''}
              <div class="cart-drawer__item-bottom">
                <div class="quantity-selector quantity-selector--sm" data-quantity-selector>
                  <button type="button" class="quantity-selector__btn" data-quantity-minus data-line="${line}">-</button>
                  <input type="number" value="${item.quantity}" min="0" class="quantity-selector__input" data-quantity-input data-line="${line}">
                  <button type="button" class="quantity-selector__btn" data-quantity-plus data-line="${line}">+</button>
                </div>
                <span class="cart-drawer__item-price" data-item-price>${formatMoney(item.final_line_price)}</span>
              </div>
            </div>
            <button type="button" class="cart-drawer__item-remove" data-cart-remove data-line="${line}" aria-label="Remove">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        `;
      }).join('');

      body.innerHTML = `<div class="cart-drawer__items" data-cart-drawer-items>${itemsHtml}</div>`;

      // Update footer subtotal
      const subtotalEl = $('[data-cart-drawer-subtotal]');
      if (subtotalEl) subtotalEl.textContent = formatMoney(cart.total_price);
    },

    resizeImage(url, size) {
      if (!url) return '';
      return url.replace(/(\.[^.]+)$/, `_${size}$1`);
    },
  };

  /* -----------------------------------------------------------------------
     Product Page
     ----------------------------------------------------------------------- */
  const ProductPage = {
    init() {
      this.productJson = $('[data-product-json]');
      if (!this.productJson) return;

      try {
        this.product = JSON.parse(this.productJson.textContent);
      } catch (e) {
        return;
      }

      this.initGallery();
      this.initVariants();
      this.initQuantity();
      this.initAddToCart();
      this.initSizeGuide();
      this.initImageZoom();
    },

    initGallery() {
      const thumbs = $$('[data-gallery-thumb]');
      const slides = $$('[data-gallery-slide]');

      if (thumbs.length === 0 || slides.length === 0) return;

      thumbs.forEach((thumb) => {
        thumb.addEventListener('click', () => {
          const index = parseInt(thumb.dataset.galleryThumb);

          slides.forEach((s) => s.classList.remove('is-active'));
          thumbs.forEach((t) => t.classList.remove('is-active'));

          slides[index]?.classList.add('is-active');
          thumb.classList.add('is-active');
        });
      });
    },

    initVariants() {
      const optionInputs = $$('[data-option-input]');
      this.select = $('[data-product-select]');

      if (optionInputs.length === 0 || !this.select) return;

      optionInputs.forEach((input) => {
        input.addEventListener('change', () => {
          // Update selected state visually
          const container = input.closest('.product-option__values');
          $$('.product-option__value', container).forEach((v) => v.classList.remove('is-selected'));
          input.closest('.product-option__value').classList.add('is-selected');

          this.updateVariant();
        });
      });
    },

    updateVariant() {
      const selectedOptions = $$('[data-option-input]:checked').map((i) => i.value);

      // Find matching variant
      const variant = this.product.variants.find((v) =>
        v.options.every((opt, idx) => opt === selectedOptions[idx])
      );

      if (!variant) return;

      // Update select
      this.select.value = variant.id;

      // Update price
      const priceContainer = $('[data-product-price]');
      if (priceContainer) {
        if (variant.compare_at_price && variant.compare_at_price > variant.price) {
          priceContainer.innerHTML = `
            <span class="product-info__price--sale">${formatMoney(variant.price)}</span>
            <span class="product-info__price--compare">${formatMoney(variant.compare_at_price)}</span>
            <span class="product-info__badge product-info__badge--sale">${window.theme?.strings?.onSale || 'Sale'}</span>
          `;
        } else {
          priceContainer.innerHTML = `
            <span class="product-info__price--regular">${formatMoney(variant.price)}</span>
          `;
        }
      }

      // Update add to cart button
      const addBtn = $('[data-add-to-cart]');
      const addText = $('[data-add-to-cart-text]');
      if (addBtn && addText) {
        if (variant.available) {
          addBtn.disabled = false;
          addText.textContent = window.theme?.strings?.addToCart || 'Add to Cart';
        } else {
          addBtn.disabled = true;
          addText.textContent = window.theme?.strings?.soldOut || 'Sold Out';
        }
      }

      // Update gallery to show variant image
      if (variant.featured_media) {
        const targetSlide = $(`[data-media-id="${variant.featured_media.id}"]`);
        if (targetSlide) {
          const index = targetSlide.dataset.gallerySlide;
          $$('[data-gallery-slide]').forEach((s) => s.classList.remove('is-active'));
          $$('[data-gallery-thumb]').forEach((t) => t.classList.remove('is-active'));
          targetSlide.classList.add('is-active');
          const thumb = $(`[data-gallery-thumb="${index}"]`);
          if (thumb) thumb.classList.add('is-active');
        }
      }

      // Update URL without reload
      const url = new URL(window.location);
      url.searchParams.set('variant', variant.id);
      window.history.replaceState({}, '', url);
    },

    initQuantity() {
      const selector = $('.product-info [data-quantity-selector]');
      if (!selector) return;

      const minus = $('[data-quantity-minus]', selector);
      const plus = $('[data-quantity-plus]', selector);
      const input = $('[data-quantity-input]', selector);

      if (minus && input) {
        minus.addEventListener('click', () => {
          input.value = Math.max(1, parseInt(input.value) - 1);
        });
      }

      if (plus && input) {
        plus.addEventListener('click', () => {
          input.value = parseInt(input.value) + 1;
        });
      }
    },

    initAddToCart() {
      const addBtn = $('[data-add-to-cart]');
      if (!addBtn) return;

      addBtn.addEventListener('click', () => {
        if (addBtn.disabled) return;

        const variantId = this.select?.value;
        const quantityInput = $('[data-quantity-input]');
        const quantity = quantityInput ? parseInt(quantityInput.value) : 1;

        if (!variantId) return;

        addBtn.classList.add('is-loading');

        Cart.addToCart(parseInt(variantId), quantity)
          .then(() => {
            addBtn.classList.remove('is-loading');
          })
          .catch((err) => {
            console.error('Add to cart error:', err);
            addBtn.classList.remove('is-loading');
          });
      });
    },

    initSizeGuide() {
      const toggle = $('[data-size-guide-toggle]');
      const modal = $('[data-size-guide-modal]');
      if (!toggle || !modal) return;

      toggle.addEventListener('click', () => {
        modal.classList.add('is-active');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('no-scroll');
      });

      $$('[data-modal-close]', modal).forEach((btn) => {
        btn.addEventListener('click', () => {
          modal.classList.remove('is-active');
          modal.setAttribute('aria-hidden', 'true');
          document.body.classList.remove('no-scroll');
        });
      });
    },

    initImageZoom() {
      $$('[data-image-zoom]').forEach((wrapper) => {
        const img = $('img', wrapper);
        if (!img) return;

        wrapper.addEventListener('click', (e) => {
          if (wrapper.classList.contains('is-zoomed')) {
            wrapper.classList.remove('is-zoomed');
            img.style.transformOrigin = '';
          } else {
            wrapper.classList.add('is-zoomed');
            const rect = wrapper.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            img.style.transformOrigin = `${x}% ${y}%`;
          }
        });

        wrapper.addEventListener('mousemove', (e) => {
          if (!wrapper.classList.contains('is-zoomed')) return;
          const rect = wrapper.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 100;
          img.style.transformOrigin = `${x}% ${y}%`;
        });

        wrapper.addEventListener('mouseleave', () => {
          wrapper.classList.remove('is-zoomed');
          img.style.transformOrigin = '';
        });
      });
    },
  };

  /* -----------------------------------------------------------------------
     Quick Add to Cart (from product cards)
     ----------------------------------------------------------------------- */
  const QuickAdd = {
    init() {
      document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-quick-add]');
        if (!btn) return;

        e.preventDefault();
        const variantId = parseInt(btn.dataset.quickAdd);
        if (!variantId) return;

        btn.classList.add('is-loading');
        Cart.addToCart(variantId, 1)
          .then(() => btn.classList.remove('is-loading'))
          .catch(() => btn.classList.remove('is-loading'));
      });
    },
  };

  /* -----------------------------------------------------------------------
     Quick View
     ----------------------------------------------------------------------- */
  const QuickView = {
    init() {
      document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-quick-view]');
        if (!btn) return;

        e.preventDefault();
        const productUrl = btn.dataset.quickView;
        if (!productUrl) return;

        this.open(productUrl);
      });
    },

    open(url) {
      const modal = $('[data-quick-view-modal]');
      const content = $('[data-quick-view-content]');
      if (!modal || !content) return;

      content.innerHTML = '<div style="text-align: center; padding: 3rem;"><p>Loading...</p></div>';
      modal.classList.add('is-active');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('no-scroll');

      fetch(url)
        .then((res) => res.text())
        .then((html) => {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');

          const productTitle = doc.querySelector('.product-info__title')?.textContent || '';
          const productPrice = doc.querySelector('[data-product-price]')?.innerHTML || '';
          const productImage = doc.querySelector('.product-gallery__image')?.outerHTML || '';
          const productForm = doc.querySelector('.product-info')?.innerHTML || '';

          content.innerHTML = `
            <div class="quick-view__image">${productImage}</div>
            <div class="quick-view__info">${productForm}</div>
          `;
        })
        .catch(() => {
          content.innerHTML = '<p style="padding: 2rem; text-align: center;">Unable to load product.</p>';
        });

      $$('[data-modal-close]', modal).forEach((btn) => {
        btn.addEventListener('click', () => this.close());
      });
    },

    close() {
      const modal = $('[data-quick-view-modal]');
      if (!modal) return;
      modal.classList.remove('is-active');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('no-scroll');
    },
  };

  /* -----------------------------------------------------------------------
     Wishlist (localStorage)
     ----------------------------------------------------------------------- */
  const Wishlist = {
    STORAGE_KEY: 'adama-wishlist',

    init() {
      this.items = this.getItems();
      this.updateCount();
      this.updateButtons();

      document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-wishlist-add]');
        if (!btn) return;

        e.preventDefault();
        const productId = btn.dataset.wishlistAdd;
        this.toggle(productId);
        this.updateButtons();
      });
    },

    getItems() {
      try {
        return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || [];
      } catch {
        return [];
      }
    },

    saveItems() {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.items));
    },

    toggle(productId) {
      const id = String(productId);
      const index = this.items.indexOf(id);
      if (index > -1) {
        this.items.splice(index, 1);
      } else {
        this.items.push(id);
      }
      this.saveItems();
      this.updateCount();
    },

    isInWishlist(productId) {
      return this.items.includes(String(productId));
    },

    updateCount() {
      $$('[data-wishlist-count]').forEach((el) => {
        el.textContent = this.items.length;
        el.style.display = this.items.length > 0 ? '' : 'none';
      });
    },

    updateButtons() {
      $$('[data-wishlist-add]').forEach((btn) => {
        const id = btn.dataset.wishlistAdd;
        const svg = btn.querySelector('svg');
        if (this.isInWishlist(id)) {
          btn.classList.add('is-active');
          if (svg) svg.setAttribute('fill', 'currentColor');
        } else {
          btn.classList.remove('is-active');
          if (svg) svg.setAttribute('fill', 'none');
        }
      });
    },
  };

  /* -----------------------------------------------------------------------
     Collection Filters
     ----------------------------------------------------------------------- */
  const CollectionFilters = {
    init() {
      this.filterToggle = $('[data-filter-toggle]');
      this.filterSidebar = $('[data-collection-filters]');
      this.filterClose = $('[data-filter-close]');
      this.sortSelect = $('[data-sort-select]');

      if (this.filterToggle && this.filterSidebar) {
        this.filterToggle.addEventListener('click', () => this.toggleFilters());

        if (this.filterClose) {
          this.filterClose.addEventListener('click', () => this.closeFilters());
        }
      }

      if (this.sortSelect) {
        this.sortSelect.addEventListener('change', () => {
          const url = new URL(window.location);
          url.searchParams.set('sort_by', this.sortSelect.value);
          window.location = url.toString();
        });
      }

      // Filter form submission
      const filterForm = $('[data-filter-form]');
      if (filterForm) {
        filterForm.addEventListener('submit', (e) => {
          e.preventDefault();
          this.applyFilters(filterForm);
        });
      }
    },

    toggleFilters() {
      this.filterSidebar.classList.toggle('is-active');
      const isOpen = this.filterSidebar.classList.contains('is-active');
      document.body.classList.toggle('no-scroll', isOpen && window.innerWidth < 1024);
    },

    closeFilters() {
      this.filterSidebar.classList.remove('is-active');
      document.body.classList.remove('no-scroll');
    },

    applyFilters(form) {
      const formData = new FormData(form);
      const url = new URL(window.location.pathname, window.location.origin);

      for (const [key, value] of formData.entries()) {
        if (value) url.searchParams.append(key, value);
      }

      // Preserve sort
      const currentUrl = new URL(window.location);
      const sortBy = currentUrl.searchParams.get('sort_by');
      if (sortBy) url.searchParams.set('sort_by', sortBy);

      window.location = url.toString();
    },
  };

  /* -----------------------------------------------------------------------
     Scroll Animations
     ----------------------------------------------------------------------- */
  const ScrollAnimations = {
    init() {
      // Check for reduced motion preference
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      this.elements = $$('[data-animate]');
      if (this.elements.length === 0) return;

      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const delay = parseInt(entry.target.dataset.delay) || 0;
              setTimeout(() => {
                entry.target.classList.add('is-visible');
              }, delay);
              this.observer.unobserve(entry.target);
            }
          });
        },
        {
          threshold: 0.1,
          rootMargin: '0px 0px -50px 0px',
        }
      );

      this.elements.forEach((el) => this.observer.observe(el));
    },
  };

  /* -----------------------------------------------------------------------
     Lazy Loading (native with fallback)
     ----------------------------------------------------------------------- */
  const LazyLoad = {
    init() {
      // Native lazy loading is used via HTML attributes.
      // This provides a fallback for browsers that don't support it.
      if ('loading' in HTMLImageElement.prototype) return;

      const images = $$('img[loading="lazy"]');
      if (images.length === 0) return;

      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
            }
            observer.unobserve(img);
          }
        });
      });

      images.forEach((img) => observer.observe(img));
    },
  };

  /* -----------------------------------------------------------------------
     Dropdown Navigation (Desktop)
     ----------------------------------------------------------------------- */
  const DropdownNav = {
    init() {
      $$('.header__nav-item.has-dropdown').forEach((item) => {
        const btn = $('button', item);
        if (!btn) return;

        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const expanded = btn.getAttribute('aria-expanded') === 'true';
          // Close others
          $$('.header__nav-item.has-dropdown button').forEach((b) => b.setAttribute('aria-expanded', 'false'));
          btn.setAttribute('aria-expanded', !expanded);
        });
      });

      // Close on outside click
      document.addEventListener('click', () => {
        $$('.header__nav-item.has-dropdown button').forEach((b) => b.setAttribute('aria-expanded', 'false'));
      });
    },
  };

  /* -----------------------------------------------------------------------
     Product Recommendations (Related Products)
     ----------------------------------------------------------------------- */
  const Recommendations = {
    init() {
      const section = $('[data-product-json]');
      if (!section) return;

      try {
        const product = JSON.parse(section.textContent);
        const container = $('.section-related-products');
        if (!container) return;

        const url = `/recommendations/products.json?product_id=${product.id}&limit=4`;
        fetchJSON(url)
          .then((data) => {
            if (data.products && data.products.length > 0) {
              // Products are rendered server-side via the related-products section
              // This is a fallback for dynamic loading
            }
          })
          .catch(() => {});
      } catch {
        // Fail silently
      }
    },
  };

  /* -----------------------------------------------------------------------
     Initialize Everything
     ----------------------------------------------------------------------- */
  function init() {
    Header.init();
    MobileNav.init();
    Search.init();
    AnnouncementBar.init();
    Cart.init();
    ProductPage.init();
    QuickAdd.init();
    QuickView.init();
    Wishlist.init();
    CollectionFilters.init();
    ScrollAnimations.init();
    LazyLoad.init();
    DropdownNav.init();
    Recommendations.init();
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
