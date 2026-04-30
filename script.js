
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
    if (target.target === '_blank') return;
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
