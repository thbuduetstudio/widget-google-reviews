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

    const widgetUid = "tk-" + Math.random().toString(36).slice(2);
    container.setAttribute("data-trustkit-id", widgetUid);

    injectStyles({
      widgetUid,
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
    const widgetId = container.getAttribute("data-trustkit-id");

    container.innerHTML = `
      <section class="tk-widget" id="${widgetId}" data-current="0">
        <div class="tk-top">
          <div class="tk-brand">
            <div class="tk-badge">Avis Google</div>
            <h3>${escapeHtml(businessName)}</h3>
          </div>

          <div class="tk-score">
            <div class="tk-score-main">
              <span>${rating ? Number(rating).toFixed(1) : ""}</span>
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
              <button class="tk-dot ${index === 0 ? "active" : ""}" type="button" data-index="${index}" aria-label="Voir l'avis ${index + 1}"></button>
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
        <div>
          <div class="tk-card-stars">${stars(reviewRating)}</div>

          <p class="tk-text ${isLong ? "is-long" : ""}">
            “${escapeHtml(text)}”
          </p>

          ${isLong ? `<button class="tk-read-more" type="button">Voir tout</button>` : ""}
        </div>

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

  function injectStyles({ widgetUid, fontFamily, accentColor, bgColor, textColor, radius }) {
    const existing = document.getElementById(`trustkit-styles-${widgetUid}`);
    if (existing) existing.remove();

    const softAccent = mixColors(accentColor, bgColor, 0.14);
    const lightAccent = mixColors(accentColor, bgColor, 0.08);
    const borderAccent = mixColors(accentColor, bgColor, 0.26);
    const cardBg = mixColors(bgColor, "#ffffff", 0.72);
    const shadowColor = hexToRgba(accentColor, 0.12);

    const style = document.createElement("style");
    style.id = `trustkit-styles-${widgetUid}`;

    style.textContent = `
      #${widgetUid}.tk-widget {
        width: 100%;
        box-sizing: border-box;
        font-family: ${fontFamily};
        color: ${textColor};
        background:
          radial-gradient(circle at top left, ${softAccent}, transparent 38%),
          linear-gradient(135deg, ${cardBg}, ${bgColor});
        border: 1px solid ${borderAccent};
        border-radius: ${Number(radius)}px;
        padding: 26px;
        box-shadow: 0 22px 60px ${shadowColor};
        overflow: hidden;
      }

      #${widgetUid} .tk-top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 20px;
        margin-bottom: 22px;
      }

      #${widgetUid} .tk-brand {
        min-width: 0;
      }

      #${widgetUid} .tk-badge {
        display: inline-flex;
        align-items: center;
        padding: 6px 10px;
        border-radius: 999px;
        background: ${lightAccent};
        color: ${accentColor};
        font-size: 0.75rem;
        font-weight: 800;
        margin-bottom: 10px;
      }

      #${widgetUid} .tk-brand h3 {
        margin: 0;
        font-size: clamp(1.15rem, 2vw, 1.45rem);
        line-height: 1.15;
        letter-spacing: -0.03em;
        color: ${textColor};
        text-align: left;
      }

      #${widgetUid} .tk-score {
        flex: 0 0 auto;
        text-align: right;
      }

      #${widgetUid} .tk-score-main {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        font-weight: 900;
      }

      #${widgetUid} .tk-score-main > span:first-child {
        font-size: 1.35rem;
        color: ${textColor};
      }

      #${widgetUid} .tk-stars,
      #${widgetUid} .tk-card-stars {
        color: ${accentColor};
        letter-spacing: 1px;
        white-space: nowrap;
      }

      #${widgetUid} .tk-total,
      #${widgetUid} .tk-date {
        font-size: 0.83rem;
        opacity: 0.62;
      }

      #${widgetUid} .tk-review-wrap {
        display: grid;
        grid-template-columns: 44px 1fr 44px;
        gap: 14px;
        align-items: center;
      }

      #${widgetUid} .tk-review-stage {
        position: relative;
        min-height: 250px;
      }

      #${widgetUid} .tk-slide {
        display: none;
        min-height: 250px;
        box-sizing: border-box;
        padding: 24px;
        border-radius: ${Math.max(Number(radius) - 6, 12)}px;
        background: ${mixColors(bgColor, "#ffffff", 0.86)};
        border: 1px solid rgba(15, 23, 42, 0.08);
      }

      #${widgetUid} .tk-slide.active {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        animation: tkFade-${widgetUid} .22s ease;
      }

      @keyframes tkFade-${widgetUid} {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
      }

      #${widgetUid} .tk-card-stars {
        font-size: 0.95rem;
        margin-bottom: 14px;
      }

      #${widgetUid} .tk-text {
        margin: 0;
        font-size: clamp(0.98rem, 1.5vw, 1.08rem);
        line-height: 1.65;
        color: ${textColor};
      }

      #${widgetUid} .tk-text.is-long {
        display: -webkit-box;
        -webkit-line-clamp: 5;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      #${widgetUid} .tk-text.expanded {
        display: block;
        overflow: visible;
      }

      #${widgetUid} .tk-read-more {
        align-self: flex-start;
        margin-top: 12px;
        padding: 0;
        background: transparent;
        color: ${accentColor};
        border-radius: 0;
        font-size: 0.9rem;
        font-weight: 800;
        cursor: pointer;
      }

      #${widgetUid} .tk-author-row {
        margin-top: 22px;
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: 16px;
      }

      #${widgetUid} .tk-author {
        color: ${textColor};
        font-weight: 850;
        text-decoration: none;
      }

      #${widgetUid} .tk-arrow {
        width: 44px;
        height: 44px;
        border-radius: 999px;
        border: 1px solid ${borderAccent};
        background: ${lightAccent};
        color: ${accentColor};
        font-size: 2rem;
        line-height: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: transform .18s ease, background .18s ease;
      }

      #${widgetUid} .tk-arrow:hover {
        transform: translateY(-1px);
        background: ${softAccent};
      }

      #${widgetUid} .tk-bottom {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        margin-top: 20px;
      }

      #${widgetUid} .tk-dots {
        display: flex;
        gap: 7px;
        align-items: center;
      }

      #${widgetUid} .tk-dot {
        width: 8px;
        height: 8px;
        padding: 0;
        border: 0;
        border-radius: 999px;
        background: ${lightAccent};
        cursor: pointer;
      }

      #${widgetUid} .tk-dot.active {
        width: 24px;
        background: ${accentColor};
      }

      #${widgetUid} .tk-google-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 11px 16px;
        border-radius: 999px;
        background: ${accentColor};
        color: white !important;
        text-decoration: none;
        font-size: 0.9rem;
        font-weight: 850;
        white-space: nowrap;
      }

      [data-trustkit-id="${widgetUid}"] .tk-loading {
        font-family: ${fontFamily};
        opacity: 0.7;
      }

      @media (max-width: 760px) {
        #${widgetUid}.tk-widget {
          padding: 20px;
        }

        #${widgetUid} .tk-top {
          flex-direction: column;
        }

        #${widgetUid} .tk-score {
          text-align: left;
        }

        #${widgetUid} .tk-score-main {
          justify-content: flex-start;
        }

        #${widgetUid} .tk-review-wrap {
          grid-template-columns: 1fr;
        }

        #${widgetUid} .tk-arrow {
          display: none;
        }

        #${widgetUid} .tk-review-stage,
        #${widgetUid} .tk-slide {
          min-height: 300px;
        }

        #${widgetUid} .tk-bottom {
          flex-direction: column;
          align-items: stretch;
        }

        #${widgetUid} .tk-google-link {
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
        return rgbToHex(bg) || bg;
      }

      if (color) return rgbToHex(color) || color;
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

  function mixColors(colorA, colorB, amount) {
    const a = parseColor(colorA);
    const b = parseColor(colorB);

    if (!a || !b) return colorA;

    const r = Math.round(a.r * amount + b.r * (1 - amount));
    const g = Math.round(a.g * amount + b.g * (1 - amount));
    const bValue = Math.round(a.b * amount + b.b * (1 - amount));

    return rgbToHex(`rgb(${r}, ${g}, ${bValue})`);
  }

  function hexToRgba(hex, alpha) {
    const rgb = parseColor(hex);

    if (!rgb) return `rgba(15, 23, 42, ${alpha})`;

    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  }

  function parseColor(color) {
    if (!color) return null;

    if (color.startsWith("#")) {
      let hex = color.replace("#", "");

      if (hex.length === 3) {
        hex = hex.split("").map(c => c + c).join("");
      }

      if (hex.length !== 6) return null;

      return {
        r: parseInt(hex.substring(0, 2), 16),
        g: parseInt(hex.substring(2, 4), 16),
        b: parseInt(hex.substring(4, 6), 16)
      };
    }

    const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);

    if (!rgbMatch) return null;

    return {
      r: Number(rgbMatch[1]),
      g: Number(rgbMatch[2]),
      b: Number(rgbMatch[3])
    };
  }

  function rgbToHex(rgb) {
    const parsed = parseColor(rgb);

    if (!parsed) return null;

    return (
      "#" +
      [parsed.r, parsed.g, parsed.b]
        .map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0"))
        .join("")
    );
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
