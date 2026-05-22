
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('[data-mobile-toggle]');
  const panel = document.querySelector('[data-mobile-panel]');
  if (toggle && panel) {
    toggle.addEventListener('click', () => panel.classList.toggle('open'));
  }

  // Send a GA4 virtual pageview whenever any Product Hunt badge is clicked
  // (the in-hero badge or the small top-bar badge that appears on scroll).
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.ph-badge-home, .ph-badge-header')) return;
    const payload = {
      page_title: 'Clicked Product Hunt Button',
      page_location: window.location.href,
      page_path: '/virtual/clicked-product-hunt-button'
    };
    if (typeof gtag === 'function') {
      gtag('event', 'page_view', payload);
    }
    if (window.dataLayer && typeof window.dataLayer.push === 'function') {
      window.dataLayer.push({ event: 'virtual_pageview', ...payload });
    }
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14, rootMargin: "0px 0px -6% 0px" });

  document.querySelectorAll('.hero, .page-hero, .section, .section-tight, .premium-section').forEach((el) => {
    el.classList.add('reveal');
    observer.observe(el);
  });

  const heroBadge = document.querySelector('.ph-badge-home');
  const headerBadge = document.querySelector('[data-ph-badge-header]');
  if (heroBadge && headerBadge) {
    const header = document.querySelector('.site-header');
    const updateBadgeState = () => {
      const headerH = header ? header.getBoundingClientRect().height : 64;
      const heroBadgeBottom = heroBadge.getBoundingClientRect().bottom;
      // Show the small header badge only once the in-hero badge has scrolled
      // up behind the sticky top bar.
      headerBadge.classList.toggle('is-visible', heroBadgeBottom <= headerH);
    };
    updateBadgeState();
    window.addEventListener('scroll', updateBadgeState, { passive: true });
    window.addEventListener('resize', updateBadgeState);
  }

  const contactForm = document.querySelector('[data-contact-form]');
  if (contactForm) {
    const status = document.querySelector('[data-contact-status]');
    const submitBtn = contactForm.querySelector('button[type="submit"]');

    const setStatus = (message, isError = false) => {
      if (!status) return;
      status.textContent = message;
      status.classList.toggle('error', isError);
      status.classList.toggle('success', !isError && message.length > 0);
    };

    contactForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      setStatus('');

      const formData = new FormData(contactForm);
      const payload = {
        name: String(formData.get('name') || '').trim(),
        email: String(formData.get('email') || '').trim(),
        subject: String(formData.get('subject') || '').trim(),
        message: String(formData.get('message') || '').trim(),
        captchaToken: String(formData.get('cf-turnstile-response') || '').trim(),
      };

      if (!payload.captchaToken) {
        setStatus('Please complete the CAPTCHA before sending.', true);
        return;
      }

      if (submitBtn) submitBtn.disabled = true;
      setStatus('Sending message...');

      try {
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(result.error || 'Failed to send message.');
        }

        contactForm.reset();
        if (window.turnstile && typeof window.turnstile.reset === 'function') {
          window.turnstile.reset();
        }
        setStatus('Message sent. We will get back to you shortly.');
      } catch (error) {
        setStatus(error.message || 'Could not send message right now.', true);
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }
});
