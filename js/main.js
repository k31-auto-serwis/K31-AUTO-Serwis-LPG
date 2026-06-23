/* K31 Auto Serwis — interactions */
(function () {
  "use strict";

  /* sticky header state */
  var header = document.querySelector(".header");
  function onScroll() {
    if (!header) return;
    header.classList.toggle("scrolled", window.scrollY > 24);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* mobile menu */
  var burger = document.querySelector(".burger");
  var menu = document.querySelector(".mobile-menu");
  if (burger && menu) {
    burger.addEventListener("click", function () {
      var open = burger.classList.toggle("open");
      menu.classList.toggle("open", open);
      document.body.style.overflow = open ? "hidden" : "";
    });
    menu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        burger.classList.remove("open");
        menu.classList.remove("open");
        document.body.style.overflow = "";
      });
    });
  }

  /* scroll reveal */
  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  document.querySelectorAll(".reveal").forEach(function (el, i) {
    el.style.transitionDelay = (i % 4) * 70 + "ms";
    io.observe(el);
  });

  /* animated stat counters */
  var counted = false;
  function animateStats() {
    if (counted) return;
    var stats = document.querySelectorAll("[data-count]");
    if (!stats.length) return;
    var box = stats[0].closest(".stats");
    if (!box) return;
    var rect = box.getBoundingClientRect();
    if (rect.top > window.innerHeight - 80) return;
    counted = true;
    stats.forEach(function (el) {
      var target = parseInt(el.getAttribute("data-count"), 10);
      var suffix = el.getAttribute("data-suffix") || "";
      var start = 0,
        dur = 1400,
        t0 = performance.now();
      function tick(now) {
        var p = Math.min((now - t0) / dur, 1);
        var val = Math.floor(start + (target - start) * (1 - Math.pow(1 - p, 3)));
        el.textContent = val.toLocaleString("uk-UA") + suffix;
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }
  window.addEventListener("scroll", animateStats, { passive: true });
  animateStats();

  /* lead form → /api/lead (Telegram group) */
  document.querySelectorAll("form[data-lead]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = form.querySelector("button[type=submit]");
      var ok = form.querySelector(".form-success");
      var err = form.querySelector(".form-error");
      var hp = form.querySelector(".hp");
      if (err) { err.classList.remove("show"); err.textContent = ""; }
      if (hp && hp.value) return; // honeypot tripped — silently ignore bots

      var val = function (n) {
        var el = form.querySelector("[name=" + n + "]");
        return el ? el.value : "";
      };
      var payload = {
        name: val("name"),
        phone: val("phone"),
        service: val("service"),
        msg: val("msg"),
        website: hp ? hp.value : "",
        page: location.pathname
      };

      var orig = btn ? btn.textContent : "";
      if (btn) { btn.disabled = true; btn.textContent = "Надсилаємо…"; }

      fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(r); })
        .then(function () {
          if (ok) ok.classList.add("show");
          form.querySelectorAll("input,select,textarea").forEach(function (f) { f.disabled = true; });
          if (btn) btn.style.display = "none";
        })
        .catch(function () {
          if (btn) { btn.disabled = false; btn.textContent = orig; }
          if (err) {
            err.textContent = "Не вдалося надіслати заявку. Зателефонуйте нам: +48 570 789 084";
            err.classList.add("show");
          }
        });
    });
  });

  /* set current year */
  var y = document.querySelector("[data-year]");
  if (y) y.textContent = new Date().getFullYear();
})();
