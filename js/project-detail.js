(function () {
  "use strict";

  const carousels = document.querySelectorAll(".hero-carousel");
  const galleries = document.querySelectorAll(".project-gallery");
  let videoModal = null;
  let videoIframe = null;
  let galleryModal = null;
  let galleryModalImage = null;
  let galleryImages = [];
  let galleryAlts = [];
  let galleryIndex = 0;

  carousels.forEach(function (carousel) {
    try {
      initCarousel(carousel);
    } catch (error) {
      console.error("Carousel init failed:", error);
    }
  });

  document.querySelectorAll(".trailer-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const rawValue = (
        btn.dataset.videoUrl ||
        btn.dataset.youtubeUrl ||
        btn.dataset.youtubeId ||
        btn.dataset.vimeoUrl ||
        ""
      ).trim();

      if (isMobileViewport() && rawValue) {
        window.open(rawValue, "_blank", "noopener,noreferrer");
        return;
      }

      openVideoModal(parseVideoUrl(rawValue));
    });
  });

  galleries.forEach(function (gallery) {
    try {
      initGallery(gallery);
    } catch (error) {
      console.error("Gallery init failed:", error);
    }
  });

  document.querySelectorAll(".project-embed[data-video-url]").forEach(function (embed) {
    try {
      initInlineEmbed(embed);
    } catch (error) {
      console.error("Inline video init failed:", error);
    }
  });

  function isMobileViewport() {
    return window.matchMedia("(max-width: 720px)").matches;
  }

  function initInlineEmbed(embed) {
    const rawValue = (embed.dataset.videoUrl || "").trim();
    const video = parseVideoUrl(rawValue, { autoplay: false });
    if (!video) return;
    embed.innerHTML = "";
    embed.appendChild(createVideoIframe(video, embed.getAttribute("aria-label") || "Project video"));
  }

  function parseVideoUrl(value, options) {
    if (!value) return null;

    const trimmed = value.trim();
    const settings = options || {};
    const vimeo = parseVimeoUrl(trimmed, settings);
    if (vimeo) return vimeo;

    const youtube = parseYouTubeUrl(trimmed, settings);
    if (youtube) return youtube;

    return null;
  }

  function parseYouTubeUrl(value, settings) {
    let videoId = "";

    const embedMatch = value.match(/(?:youtube\.com\/embed\/|youtube-nocookie\.com\/embed\/)([A-Za-z0-9_-]{11})/);
    if (embedMatch) videoId = embedMatch[1];

    const watchMatch = value.match(/(?:youtube\.com\/watch\?.*v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (watchMatch) videoId = watchMatch[1];

    if (!videoId && /^[A-Za-z0-9_-]{11}$/.test(value)) {
      videoId = value;
    }

    if (!videoId) return null;

    const params = new URLSearchParams({
      rel: "0",
      enablejsapi: "1",
      modestbranding: "1"
    });

    if (!settings || settings.autoplay !== false) params.set("autoplay", "1");

    if (window.location.origin && window.location.protocol !== "file:") {
      params.set("origin", window.location.origin);
    }

    return {
      type: "youtube",
      embedUrl: "https://www.youtube-nocookie.com/embed/" + videoId + "?" + params.toString()
    };
  }

  function parseVimeoUrl(value, settings) {
    let videoId = "";
    let privacyHash = "";

    try {
      const url = new URL(value, window.location.href);
      const h = url.searchParams.get("h");
      if (h) privacyHash = h;

      const playerMatch = url.pathname.match(/\/video\/(\d+)/);
      if (playerMatch) videoId = playerMatch[1];

      const privateMatch = url.pathname.match(/^\/(\d+)\/([a-zA-Z0-9]+)/);
      if (privateMatch) {
        videoId = privateMatch[1];
        privacyHash = privateMatch[2];
      }

      const pageMatch = url.pathname.match(/^\/(\d+)$/);
      if (pageMatch) videoId = pageMatch[1];
    } catch (error) {
      const playerMatch = value.match(/player\.vimeo\.com\/video\/(\d+)/);
      if (playerMatch) videoId = playerMatch[1];

      const privateMatch = value.match(/vimeo\.com\/(\d+)\/([a-zA-Z0-9]+)/);
      if (privateMatch) {
        videoId = privateMatch[1];
        privacyHash = privateMatch[2];
      }

      const pageMatch = value.match(/vimeo\.com\/(\d+)(?:[?&#]|$)/);
      if (pageMatch) videoId = pageMatch[1];

      const hashMatch = value.match(/[?&]h=([a-zA-Z0-9]+)/);
      if (hashMatch) privacyHash = hashMatch[1];
    }

    if (!videoId) return null;

    const params = new URLSearchParams({ title: "0", byline: "0", portrait: "0", dnt: "1" });
    if (!settings || settings.autoplay !== false) params.set("autoplay", "1");
    if (privacyHash) params.set("h", privacyHash);

    return {
      type: "vimeo",
      embedUrl: "https://player.vimeo.com/video/" + videoId + "?" + params.toString()
    };
  }

  function createVideoIframe(video, title) {
    const iframe = document.createElement("iframe");
    iframe.src = video.embedUrl;
    iframe.allow = "autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share";
    iframe.setAttribute("allowfullscreen", "");
    iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    iframe.title = title || "Project video";
    return iframe;
  }

  function initCarousel(carousel) {
    if (!carousel.dataset.images) return;
    const images = JSON.parse(carousel.dataset.images);
    const alts = carousel.dataset.alts
      ? JSON.parse(carousel.dataset.alts)
      : images.map(function (_, i) { return "Project image " + (i + 1); });
    const videos = carousel.dataset.videos ? JSON.parse(carousel.dataset.videos) : [];

    const hero = carousel.querySelector(".project-detail__hero");
    const counter = carousel.querySelector(".hero-carousel__counter");
    const prevBtn = carousel.querySelector(".hero-carousel__btn--prev");
    const nextBtn = carousel.querySelector(".hero-carousel__btn--next");

    if (!hero || !prevBtn || !nextBtn) return;
    if (!images.length) return;

    const track = document.createElement("div");
    track.className = "hero-carousel__track";

    function videoAt(i) {
      if (!videos[i]) return "";
      return String(videos[i]).trim();
    }

    function stopHeroVideos() {
      track.querySelectorAll(".hero-carousel__embed").forEach(function (wrap) {
        wrap.remove();
      });
      track.querySelectorAll(".hero-carousel__slide.is-playing").forEach(function (slide) {
        slide.classList.remove("is-playing");
      });
    }

    function playHeroVideo(slide, rawUrl) {
      const video = parseVideoUrl(rawUrl);
      if (!video) return;
      stopHeroVideos();
      const wrap = document.createElement("div");
      wrap.className = "hero-carousel__embed";
      wrap.appendChild(createVideoIframe(video, "Project video"));
      slide.appendChild(wrap);
      slide.classList.add("is-playing");
    }

    function createSlide(src, alt, videoUrl) {
      const slide = document.createElement("div");
      slide.className = "hero-carousel__slide";
      const img = document.createElement("img");
      img.className = "hero-carousel__image";
      img.src = src;
      img.alt = alt;
      img.draggable = false;
      slide.appendChild(img);

      if (videoUrl) {
        const play = document.createElement("button");
        play.type = "button";
        play.className = "hero-carousel__play";
        play.setAttribute("aria-label", "Play video");
        play.addEventListener("click", function (e) {
          e.stopPropagation();
          playHeroVideo(slide, videoUrl);
        });
        slide.appendChild(play);
      }

      return slide;
    }

    const looping = images.length > 1;
    if (looping) {
      track.appendChild(createSlide(images[images.length - 1], alts[images.length - 1], videoAt(images.length - 1)));
    }
    images.forEach(function (src, i) {
      track.appendChild(createSlide(src, alts[i], videoAt(i)));
    });
    if (looping) {
      track.appendChild(createSlide(images[0], alts[0], videoAt(0)));
    }

    hero.innerHTML = "";
    hero.appendChild(track);

    let index = 0;
    let locked = false;
    let jumping = false;
    let scrollTimer = 0;

    function pageWidth() {
      return track.clientWidth;
    }

    function realPage() {
      return looping ? index + 1 : index;
    }

    function setCounter() {
      if (!counter) return;
      counter.textContent = (index + 1) + " / " + images.length;
    }

    function jumpToPage(page) {
      jumping = true;
      track.style.scrollBehavior = "auto";
      track.scrollLeft = page * pageWidth();
      track.style.scrollBehavior = "";
      jumping = false;
    }

    function settle() {
      if (jumping) return;
      const width = pageWidth();
      if (!width) return;

      const page = Math.round(track.scrollLeft / width);
      const previousIndex = index;

      if (looping) {
        if (page <= 0) {
          jumpToPage(images.length);
          index = images.length - 1;
        } else if (page >= images.length + 1) {
          jumpToPage(1);
          index = 0;
        } else {
          index = page - 1;
        }
      } else {
        index = page;
      }

      if (previousIndex !== index) stopHeroVideos();
      setCounter();
      locked = false;
    }

    function go(delta) {
      if (!looping) return;
      if (locked) return;
      stopHeroVideos();
      locked = true;
      index = (index + delta + images.length) % images.length;
      setCounter();
      const page = Math.round(track.scrollLeft / pageWidth());
      track.scrollTo({ left: (page + delta) * pageWidth(), behavior: "smooth" });
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(settle, 450);
    }

    track.addEventListener("scroll", function () {
      if (jumping) return;
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(settle, 80);
    }, { passive: true });
    track.addEventListener("scrollend", settle);

    prevBtn.addEventListener("click", function () { go(-1); });
    nextBtn.addEventListener("click", function () { go(1); });

    window.addEventListener("resize", function () {
      jumpToPage(realPage());
    });

    setCounter();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        jumpToPage(realPage());
      });
    });
  }

  function ensureVideoModal() {
    if (videoModal) return;

    videoModal = document.createElement("div");
    videoModal.className = "video-modal";
    videoModal.id = "video-modal";
    videoModal.hidden = true;
    videoModal.setAttribute("role", "dialog");
    videoModal.setAttribute("aria-modal", "true");
    videoModal.setAttribute("aria-label", "Project trailer");
    videoModal.innerHTML =
      '<div class="video-modal__backdrop" data-close></div>' +
      '<div class="video-modal__dialog">' +
        '<button type="button" class="video-modal__close" aria-label="Close trailer"></button>' +
        '<div class="video-modal__iframe-wrap">' +
          '<iframe allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" title="Project trailer"></iframe>' +
        "</div>" +
      "</div>";

    document.body.appendChild(videoModal);
    videoIframe = videoModal.querySelector("iframe");

    videoModal.querySelector(".video-modal__close").addEventListener("click", closeVideoModal);
    videoModal.querySelector("[data-close]").addEventListener("click", closeVideoModal);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && videoModal && !videoModal.hidden) {
        closeVideoModal();
      }
    });
  }

  function initGallery(gallery) {
    const images = JSON.parse(gallery.dataset.images);
    const alts = gallery.dataset.alts
      ? JSON.parse(gallery.dataset.alts)
      : images.map(function (_, i) { return "Gallery image " + (i + 1); });
    const track = gallery.querySelector(".project-gallery__track");
    const prevBtn = gallery.querySelector(".project-gallery__nav--prev");
    const nextBtn = gallery.querySelector(".project-gallery__nav--next");

    if (track) {
      track.innerHTML = "";
      images.forEach(function (src, index) {
        const thumb = document.createElement("button");
        thumb.type = "button";
        thumb.className = "project-gallery__thumb";
        thumb.dataset.index = String(index);
        thumb.setAttribute("aria-label", "View gallery image " + (index + 1));

        const img = document.createElement("img");
        img.src = src;
        img.alt = alts[index] || "Gallery image " + (index + 1);
        img.loading = "lazy";
        thumb.appendChild(img);

        thumb.addEventListener("click", function () {
          openGalleryModal(images, alts, index);
        });

        track.appendChild(thumb);
      });
    } else {
      gallery.querySelectorAll(".project-gallery__thumb").forEach(function (thumb) {
        thumb.addEventListener("click", function () {
          const index = Number(thumb.dataset.index) || 0;
          openGalleryModal(images, alts, index);
        });
      });
    }

    function galleryMaxScroll() {
      return track.scrollWidth - track.clientWidth;
    }

    function updateGalleryNav() {
      if (!track || !prevBtn || !nextBtn) return;

      const canScroll = galleryMaxScroll() > 4;
      prevBtn.disabled = !canScroll;
      nextBtn.disabled = !canScroll;
    }

    function scrollGallery(direction) {
      if (!track) return;

      const maxScroll = galleryMaxScroll();
      if (maxScroll <= 4) return;

      if (direction > 0 && track.scrollLeft >= maxScroll - 4) {
        track.scrollTo({ left: 0, behavior: "smooth" });
        return;
      }

      if (direction < 0 && track.scrollLeft <= 4) {
        track.scrollTo({ left: maxScroll, behavior: "smooth" });
        return;
      }

      const amount = Math.max(track.clientWidth * 0.7, 200);
      track.scrollBy({ left: direction * amount, behavior: "smooth" });
    }

    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        scrollGallery(-1);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        scrollGallery(1);
      });
    }

    if (track) {
      track.addEventListener("scroll", updateGalleryNav, { passive: true });
      window.addEventListener("resize", updateGalleryNav);
      updateGalleryNav();
      requestAnimationFrame(updateGalleryNav);
    }
  }

  function ensureGalleryModal() {
    if (galleryModal) return;

    galleryModal = document.createElement("div");
    galleryModal.className = "gallery-modal";
    galleryModal.id = "gallery-modal";
    galleryModal.hidden = true;
    galleryModal.setAttribute("role", "dialog");
    galleryModal.setAttribute("aria-modal", "true");
    galleryModal.setAttribute("aria-label", "Project gallery");
    galleryModal.innerHTML =
      '<div class="gallery-modal__backdrop" data-close></div>' +
      '<div class="gallery-modal__dialog">' +
        '<button type="button" class="gallery-modal__close" aria-label="Close gallery"></button>' +
        '<div class="gallery-modal__viewport">' +
          '<button type="button" class="gallery-modal__btn gallery-modal__btn--prev" aria-label="Previous image"></button>' +
          '<img class="gallery-modal__image" src="" alt="">' +
          '<button type="button" class="gallery-modal__btn gallery-modal__btn--next" aria-label="Next image"></button>' +
        "</div>" +
      "</div>";

    document.body.appendChild(galleryModal);
    galleryModalImage = galleryModal.querySelector(".gallery-modal__image");

    galleryModal.querySelector(".gallery-modal__close").addEventListener("click", closeGalleryModal);
    galleryModal.querySelector("[data-close]").addEventListener("click", closeGalleryModal);
    galleryModal.querySelector(".gallery-modal__btn--prev").addEventListener("click", function () {
      showGalleryImage(galleryIndex - 1);
    });
    galleryModal.querySelector(".gallery-modal__btn--next").addEventListener("click", function () {
      showGalleryImage(galleryIndex + 1);
    });

    document.addEventListener("keydown", function (e) {
      if (!galleryModal || galleryModal.hidden) return;

      if (e.key === "Escape") {
        closeGalleryModal();
      } else if (e.key === "ArrowLeft") {
        showGalleryImage(galleryIndex - 1);
      } else if (e.key === "ArrowRight") {
        showGalleryImage(galleryIndex + 1);
      }
    });
  }

  function showGalleryImage(nextIndex) {
    if (!galleryImages.length) return;

    galleryIndex = (nextIndex + galleryImages.length) % galleryImages.length;
    galleryModalImage.src = galleryImages[galleryIndex];
    galleryModalImage.alt = galleryAlts[galleryIndex];
  }

  function openGalleryModal(images, alts, startIndex) {
    ensureGalleryModal();
    galleryImages = images;
    galleryAlts = alts;
    showGalleryImage(startIndex);
    galleryModal.hidden = false;
    document.body.classList.add("modal-open");
  }

  function closeGalleryModal() {
    if (!galleryModal) return;
    galleryModal.hidden = true;
    galleryModalImage.src = "";
    galleryModalImage.alt = "";
    galleryImages = [];
    galleryAlts = [];
    document.body.classList.remove("modal-open");
  }

  function openVideoModal(video) {
    if (!video) {
      console.warn("Trailer button is missing a valid YouTube or Vimeo URL.");
      return;
    }

    ensureVideoModal();
    videoIframe.src = video.embedUrl;
    videoModal.hidden = false;
    document.body.classList.add("modal-open");
  }

  function closeVideoModal() {
    if (!videoModal) return;
    videoIframe.src = "";
    videoModal.hidden = true;
    document.body.classList.remove("modal-open");
  }
})();
