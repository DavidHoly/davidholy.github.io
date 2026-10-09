(function () {
  "use strict";

  const backToTop = document.getElementById("back-to-top");
  if (!backToTop) return;

  const mobileNavQuery = window.matchMedia("(max-width: 720px)");

  function updateBackToTopPosition() {
    const footer = document.querySelector(".site-footer");
    if (!footer) return;

    const footerTop = footer.getBoundingClientRect().top;
    const overlap = window.innerHeight - footerTop;

    if (overlap > 0) {
      backToTop.style.bottom = (overlap + 16) + "px";
    } else {
      backToTop.style.bottom = "1.25rem";
    }
  }

  function updateBackToTop() {
    const show = mobileNavQuery.matches && window.scrollY > 300;
    backToTop.classList.toggle("is-visible", show);

    if (show) {
      updateBackToTopPosition();
    }
  }

  backToTop.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  mobileNavQuery.addEventListener("change", updateBackToTop);
  window.addEventListener("resize", updateBackToTopPosition);
  window.addEventListener("scroll", updateBackToTop, { passive: true });
  updateBackToTop();
})();
