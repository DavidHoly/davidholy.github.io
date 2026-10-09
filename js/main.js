(function () {
  "use strict";

  const header = document.querySelector(".site-header");
  const navToggle = document.querySelector(".nav__toggle");
  const navMenu = document.querySelector(".nav__menu");
  const navLinks = document.querySelectorAll(".nav__link");
  const filterBtns = document.querySelectorAll(".filter-btn");
  const projectCards = document.querySelectorAll(".project-card");
  const projectsEmpty = document.getElementById("projects-empty");

  /* ── Sticky header ───────────────────────────────────────── */
  function onScroll() {
    header.classList.toggle("is-scrolled", window.scrollY > 20);
    updateActiveNavLink();
  }

  /* ── Active nav link on scroll ───────────────────────────── */
  function updateActiveNavLink() {
    const sectionIds = ["about", "projects", "contact"];
    const headerOffset = 120;
    const scrollPos = window.scrollY + headerOffset;
    const nearPageBottom =
      window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 80;

    let current = sectionIds[0];

    if (nearPageBottom) {
      current = sectionIds[sectionIds.length - 1];
    } else {
      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const section = document.getElementById(sectionIds[i]);
        if (section && scrollPos >= section.offsetTop) {
          current = sectionIds[i];
          break;
        }
      }
    }

    navLinks.forEach(function (link) {
      const href = link.getAttribute("href");
      link.classList.toggle("is-active", href === "#" + current);
    });
  }

  /* ── Mobile nav toggle ───────────────────────────────────── */
  if (navToggle && navMenu) {
    navToggle.addEventListener("click", function () {
      const isOpen = navMenu.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
      navToggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
    });

    navLinks.forEach(function (link) {
      link.addEventListener("click", function () {
        navMenu.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.setAttribute("aria-label", "Open menu");
      });
    });
  }

  /* ── Project filter (multi-select) ───────────────────────── */
  const activeFilters = new Set();

  function syncFilterButtons() {
    const showAll = activeFilters.size === 0;

    filterBtns.forEach(function (btn) {
      const filter = btn.dataset.filter;
      const isActive = filter === "all" ? showAll : activeFilters.has(filter);

      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-pressed", String(isActive));
    });
  }

  function applyProjectFilters() {
    const showAll = activeFilters.size === 0;
    let visibleCount = 0;

    projectCards.forEach(function (card) {
      const categories = (card.dataset.category || "")
        .split(/\s+/)
        .filter(Boolean);
      const show =
        showAll ||
        Array.from(activeFilters).every(function (filter) {
          return categories.includes(filter);
        });

      card.classList.toggle("is-hidden", !show);
      if (show) visibleCount++;
    });

    if (projectsEmpty) {
      projectsEmpty.hidden = visibleCount > 0;
    }
  }

  filterBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      const filter = btn.dataset.filter;

      if (filter === "all") {
        activeFilters.clear();
      } else if (activeFilters.has(filter)) {
        activeFilters.delete(filter);
      } else {
        activeFilters.add(filter);
      }

      syncFilterButtons();
      applyProjectFilters();
    });
  });

  syncFilterButtons();

  /* ── Scroll to anchor on load (e.g. back from project page) ─ */
  if (window.location.hash) {
    const target = document.querySelector(window.location.hash);
    if (target) {
      requestAnimationFrame(function () {
        target.scrollIntoView({ behavior: "smooth" });
      });
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();
