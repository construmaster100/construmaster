(function () {
  const banner = document.querySelector('.banner-carrusel');
  if (!banner || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const slides = Array.from(banner.querySelectorAll('.banner-carrusel-slide'));
  if (slides.length < 2) return;

  let actual = slides.findIndex((slide) => slide.classList.contains('activo'));
  if (actual < 0) actual = 0;

  window.setInterval(() => {
    slides[actual].classList.remove('activo');
    actual = (actual + 1) % slides.length;
    slides[actual].classList.add('activo');
  }, 12000); // 12 s por imagen, con disolucion efervescente de 6 s (index.css)
})();
