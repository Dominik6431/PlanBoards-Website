
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('[data-mobile-toggle]');
  const panel = document.querySelector('[data-mobile-panel]');
  if (toggle && panel) {
    toggle.addEventListener('click', () => panel.classList.toggle('open'));
  }

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
});
