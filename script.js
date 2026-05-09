
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('[data-mobile-toggle]');
  const panel = document.querySelector('[data-mobile-panel]');
  if (toggle && panel) {
    toggle.addEventListener('click', () => panel.classList.toggle('open'));
  }

  // Google Ads "ItemClicked" conversion tracking via event delegation
  const conversionSelector = '.nav-links a, .mobile-panel a, .store-badge, [data-conversion]';
  document.addEventListener('click', (e) => {
    const target = e.target.closest(conversionSelector);
    if (!target) return;
    if (typeof gtag_report_conversion !== 'function') return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return;
    if (target.target === '_blank') {
      // Let the browser open the new tab; just fire the conversion event.
      gtag_report_conversion();
      return;
    }
    e.preventDefault();
    gtag_report_conversion(target.href);
  });

  // Google Ads "ItemClicked" conversion tracking for the YouTube hero video
  const ytIframe = document.getElementById('ytplayer');
  if (ytIframe && window.YT === undefined) {
    const ytScript = document.createElement('script');
    ytScript.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(ytScript);
  }
  window.onYouTubeIframeAPIReady = function () {
    const iframe = document.getElementById('ytplayer');
    if (!iframe || !window.YT || !window.YT.Player) return;
    let conversionSent = false;
    new window.YT.Player('ytplayer', {
      events: {
        'onStateChange': (event) => {
          if (event.data === 1 && !conversionSent) {
            conversionSent = true;
            if (typeof gtag_report_conversion === 'function') {
              gtag_report_conversion();
            }
          }
        }
      }
    });
  };

  // Section reveal animation.
  // Behavior: any section currently in the viewport (or within ~200px below it)
  // is revealed immediately. Once the user scrolls ~100px from the top, every
  // remaining section is revealed in one pass. This gives a snappy, consistent
  // experience on both mobile and desktop and avoids "stuck blank" sections.
  const revealEls = document.querySelectorAll('.hero, .page-hero, .section, .section-tight, .premium-section');
  revealEls.forEach((el) => el.classList.add('reveal'));
  // Only now do we let CSS hide the un-revealed sections — guarantees that if
  // JS ever fails to run, content remains visible.
  document.documentElement.classList.add('js-reveal-ready');

  const showNearViewport = () => {
    const vh = window.innerHeight || document.documentElement.clientHeight;
    revealEls.forEach((el) => {
      if (el.classList.contains('in-view')) return;
      const rect = el.getBoundingClientRect();
      // Reveal if any part is within the viewport plus a 200px lookahead.
      if (rect.top < vh + 200 && rect.bottom > -200) {
        el.classList.add('in-view');
      }
    });
  };

  const revealAll = () => {
    revealEls.forEach((el) => el.classList.add('in-view'));
  };

  // Initial paint: reveal anything already on screen.
  showNearViewport();

  let allRevealed = false;
  const onScroll = () => {
    if (allRevealed) return;
    if (window.scrollY > 100) {
      // After 100px of scrolling, just reveal everything in one go.
      allRevealed = true;
      revealAll();
      window.removeEventListener('scroll', onScroll);
      return;
    }
    showNearViewport();
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  // Safety net: if anything is still hidden after 1.5s (e.g. fonts/images
  // shifting layout, slow first paint), reveal it so content is never stuck.
  setTimeout(showNearViewport, 200);
  setTimeout(revealAll, 1500);

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
