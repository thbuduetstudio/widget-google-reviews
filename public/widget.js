(function () {
  const script = document.currentScript;
  const apiBase = new URL(script.src).origin;
  const containers = document.querySelectorAll("[data-google-reviews]");

  containers.forEach(initWidget);

  async function initWidget(container) {
    const placeId = container.getAttribute("data-place-id");

    if (!placeId) {
      container.innerHTML = "Place ID manquant.";
      return;
    }

    const computed = window.getComputedStyle(document.body);

    const accentColor =
      container.getAttribute("data-accent-color") ||
      findAccentColor() ||
      "#2563eb";

    const bgColor =
      container.getAttribute("data-bg-color") ||
      "#ffffff";

    const textColor =
      container.getAttribute("data-text-color") ||
      computed.color ||
      "#111827";

    const radius =
      container.getAttribute("data-radius") ||
      "24";

    injectStyles({
      fontFamily: computed.fontFamily || "system-ui, sans-serif",
      accentColor,
      bgColor,
      textColor,
      radius
    });

    container.innerHTML = `<div class="tk-loading">Chargement des avis...</div>`;

    try {
      const response = await fetch(
        `${apiBase}/api/reviews?place_id=${encodeURIComponent(placeId)}`
      );

      const data = await response.json();

      if (!response.ok || !data.reviews || !data.reviews.length) {
        container.innerHTML = "";
        return;
      }

      renderWidget(container, data);
    } catch (error) {
      container.innerHTML = "";
    }
  }

  function renderWidget(container, data) {
    const reviews = data.reviews.slice(0, 5);
    const businessName = data.displayName?.text || "";
    const rating = data.rating || "";
    const total = data.userRatingCount || "";
    const mapsUrl = data.googleMapsUri || "#";
    const widgetId = "tk-" + Math.random().toString(36).slice(2);

    container.innerHTML = `
      <section class="tk-widget" id="${widgetId}" data-current="0">
        <div class="tk-top">
          <div class="tk-brand">
            <div class="tk-badge">Avis Google</div>
            <h3>${escapeHtml(businessName)}</h3>
          </div>

          <div class="tk-score">
            <div class="tk-score-main">
              <span>${rating ? rating.toFixed ? rating.toFixed(1) : rating : ""}</span>
              <span class="tk-stars">${stars(rating)}</span>
            </div>
            ${total ? `<div class="tk-total">${total} avis</div>` : ""}
          </div>
        </div>

        <div class="tk-review-wrap">
          <button class="tk-arrow tk-prev" type="button" aria-label="Avis précédent">‹</button>

          <div class="tk-review-stage">
            ${reviews.map((review, index) => renderReview(review, index)).join("")}
          </div>

          <button class="tk-arrow tk-next" type="button" aria-label="Avis suivant">›</button>
        </div>

        <div class="tk-bottom">
          <div class="tk-dots">
            ${reviews.map((_, index) => `
              <button class="tk-dot ${index === 0 ? "active" : ""}" type="button" data-index="${index}"></button>
            `).join("")}
          </div>

          <a class="tk-google-link" href="${mapsUrl}" target="_blank" rel="noopener">
            Voir tous les avis
          </a>
        </div>
      </section>
    `;

    const widget = container.querySelector(".tk-widget");
    const prev = container.querySelector(".tk-prev");
    const next = container.querySelector(".tk-next");
    const dots = container.querySelectorAll(".tk-dot");

    prev.addEventListener("click", () => move(widget, -1));
    next.addEventListener("click", () => move(widget, 1));

    dots.forEach(dot => {
      dot.addEventListener("click", () => {
        setActive(widget, Number(dot.dataset.index));
      });
    });

    container.querySelectorAll(".tk-read-more").forEach(button => {
      button.addEventListener("click", () => {
        const text = button.previousElementSibling;
        text.classList.toggle("expanded");
        button.textContent = text.classList.contains("expanded")
          ? "Réduire"
          : "Voir tout";
      });
    });

    setActive(widget, 0);
  }

  function renderReview(review, index) {
    const author = review.authorAttribution?.displayName || "Client Google";
    const authorUrl = review.authorAttribution?.uri || "#";
    const reviewRating = review.rating || 5;
    const text = review.text?.text || "";
    const date = formatDate(review.publishTime);
    const isLong = text.length > 220;

    return `
      <article class="tk-slide ${index === 0 ? "active" : ""}" data-index="${index}">
        <div class="tk-card-stars">${stars(reviewRating)}</div>

        <p class="tk-text ${isLong ? "is-long" : ""}">
          “${escapeHtml(text)}”
        </p>

        ${isLong ? `<button class="tk-read-more" type="button">Voir tout</button>` : ""}

        <div class="tk-author-row">
          <div>
            <a class="tk-author" href="${authorUrl}" target="_blank" rel="noopener">
              ${escapeHtml(author)}
            </a>
            ${date ? `<div class="tk-date">${date}</div>` : ""}
          </div>
        </div>
      </article>
    `;
  }

  function move(widget, direction) {
    const slides = widget.querySelectorAll(".tk-slide");
    const current = Number(widget.dataset.current || 0);
    const nextIndex = (current + direction + slides.length) % slides.length;
    setActive(widget, nextIndex);
  }

  function setActive(widget, index) {
    widget.dataset.current = index;

    widget.querySelectorAll(".tk-slide").forEach(slide => {
      slide.classList.toggle("active", Number(slide.dataset.index) === index);
    });

    widget.querySelectorAll(".tk-dot").forEach(dot => {
      dot.classList.toggle("active", Number(dot.dataset.index) === index);
    });
  }

  function injectStyles({ fontFamily, accentColor, bgColor, textColor, radius }) {
    if (document.getElementById("trustkit-styles")) return;

    const style = document.createElement("style");
    style.id = "trustkit-styles";

    style.textContent = `
      .tk-widget {
        --tk-accent: ${accentColor};
        --tk-bg: ${bgColor};
        --tk-text: ${textColor};
        --tk-radius: ${radius}px;
        --tk-soft: color-mix(in srgb, var(--tk-accent) 10%, white);
        --tk-border: color-mix(in srgb, var(--tk-accent) 22%, transparent);

        width: 100%;
        box-sizing: border-box;
        font-family: ${fontFamily};
        color: var(--tk-text);
        background:
          radial-gradient(circle at top left, color-mix(in srgb, var(--tk-accent) 14%, transparent), transparent 36%),
          var(--tk-bg);
        border: 1px solid var(--tk-border);
        border-radius: var(--tk-radius);
        padding: 26px;
        box-shadow: 0 22px 60px rgba(15, 23, 42, 0.10);
        overflow: hidden;
      }

      .tk-top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 20px;
        margin-bottom: 22px;
      }

      .tk-brand {
        min-width: 0;
      }

      .tk-badge {
        display: inline-flex;
        align-items: center;
        padding: 6px 10px;
        border-radius: 999px;
        background: color-mix(in srgb, var(--tk-accent) 12%, white);
        color: var(--tk-accent);
        font-size: 0.75rem;
        font-weight: 800;
        margin-bottom: 10px;
      }

      .tk-brand h3 {
        margin: 0;
        font-size: clamp(1.15rem, 2vw, 1.45rem);
        line-height: 1.15;
        letter-spacing: -0.03em;
        color: var(--tk-text);
        text-align: left;
      }

      .tk-score {
        flex: 0 0 auto;
        text-align: right;
      }

      .tk-score-main {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        font-weight: 900;
      }

      .tk-score-main > span:first-child {
        font-size: 1.35rem;
        color: var(--tk-text);
      }

      .tk-stars,
      .tk-card-stars {
        color: var(--tk-accent);
        letter-spacing: 1px;
        white-space: nowrap;
      }

      .tk-total,
      .tk-date {
        font-size: 0.83rem;
        opacity: 0.62;
      }

      .tk-review-wrap {
        display: grid;
        grid-template-columns: 44px 1fr 44px;
        gap: 14px;
        align-items: center;
      }

      .tk-review-stage {
        position: relative;
        min-height: 250px;
      }

      .tk-slide {
        display: none;
        min-height: 250px;
        box-sizing: border-box;
        padding: 24px;
        border-radius: calc(var(--tk-radius) - 6px);
        background: rgba(255,255,255,0.72);
        border: 1px solid rgba(15, 23, 42, 0.08);
      }

      .tk-slide.active {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        animation: tkFade .22s ease;
      }

      @keyframes tkFade {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .tk-card-stars {
        font-size: 0.95rem;
        margin-bottom: 14px;
      }

      .tk-text {
        margin: 0;
        font-size: clamp(0.98rem, 1.5vw, 1.08rem);
        line-height: 1.65;
        color: var(--tk-text);
      }

      .tk-text.is-long {
        display: -webkit-box;
        -webkit-line-clamp: 5;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .tk-text.expanded {
        display: block;
        overflow: visible;
      }

      .tk-read-more {
        align-self: flex-start;
        margin-top: 12px;
        padding: 0;
        background: transparent;
        color: var(--tk-accent);
        border-radius: 0;
        font-size: 0.9rem;
        font-weight: 800;
      }

      .tk-author-row {
        margin-top: 22px;
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: 16px;
      }

      .tk-author {
        color: var(--tk-text);
        font-weight: 850;
        text-decoration: none;
      }

      .tk-arrow {
        width: 44px;
        height: 44px;
        border-radius: 999px;
        border: 1px solid color-mix(in srgb, var(--tk-accent) 22%, transparent);
        background: color-mix(in srgb, var(--tk-accent) 10%, white);
        color: var(--tk-accent);
        font-size: 2rem;
        line-height: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: transform .18s ease, background .18s ease;
      }

      .tk-arrow:hover {
        transform: translateY(-1px);
        background: color-mix(in srgb, var(--tk-accent) 16%, white);
      }

      .tk-bottom {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        margin-top: 20px;
      }

      .tk-dots {
        display: flex;
        gap: 7px;
        align-items: center;
      }

      .tk-dot {
        width: 8px;
        height: 8px;
        padding: 0;
        border: 0;
        border-radius: 999px;
        background: color-mix(in srgb, var(--tk-accent) 24%, white);
        cursor: pointer;
      }

      .tk-dot.active {
        width: 24px;
        background: var(--tk-accent);
      }

      .tk-google-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 11px 16px;
        border-radius: 999px;
        background: var(--tk-accent);
        color: white !important;
        text-decoration: none;
        font-size: 0.9rem;
        font-weight: 850;
        white-space: nowrap;
      }

      .tk-loading {
        font-family: ${fontFamily};
        opacity: 0.7;
      }

      @media (max-width: 760px) {
        .tk-widget {
          padding: 20px;
        }

        .tk-top {
          flex-direction: column;
        }

        .tk-score {
          text-align: left;
        }

        .tk-score-main {
          justify-content: flex-start;
        }

        .tk-review-wrap {
          grid-template-columns: 1fr;
        }

        .tk-arrow {
          display: none;
        }

        .tk-review-stage,
        .tk-slide {
          min-height: 300px;
        }

        .tk-bottom {
          flex-direction: column;
          align-items: stretch;
        }

        .tk-google-link {
          width: 100%;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function findAccentColor() {
    const candidates = document.querySelectorAll("a, button, [class*='button'], [class*='btn']");
    for (const el of candidates) {
      const styles = window.getComputedStyle(el);
      const bg = styles.backgroundColor;
      const color = styles.color;

      if (bg && !bg.includes("rgba(0, 0, 0, 0)") && bg !== "transparent") {
        return bg;
      }

      if (color) return color;
    }

    return null;
  }

  function stars(value) {
    const rating = Math.round(Number(value) || 5);
    return "★★★★★".slice(0, rating) + "☆☆☆☆☆".slice(0, 5 - rating);
  }

  function formatDate(value) {
    if (!value) return "";
    try {
      return new Intl.DateTimeFormat("fr-FR", {
        year: "numeric",
        month: "long",
        day: "numeric"
      }).format(new Date(value));
    } catch {
      return "";
    }
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
