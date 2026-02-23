document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  if (page) {
    const link = document.querySelector(`.nav a[data-page="${page}"]`);
    if (link) link.classList.add('active');
  }

  document.querySelectorAll('.faq-item button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      if (item) item.classList.toggle('open');
    });
  });
});
