
  document.querySelectorAll('[data-site-link]').forEach((a) => {
    a.href = window.WEBSITE_ORIGIN + a.getAttribute('data-site-link');
  });
