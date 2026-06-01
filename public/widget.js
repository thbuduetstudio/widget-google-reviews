(function () {
  const script = document.currentScript;
  const apiBase = new URL(script.src).origin;

  const containers = document.querySelectorAll("[data-google-reviews]");

  containers.forEach(async function (container) {
    const placeId = container.getAttribute("data-place-id");
    const place = container.getAttribute("data-place");

    if (!placeId && !place) {
      container.innerHTML = "Place ID ou nom d'établissement manquant.";
      return;
    }

    const bodyStyle = window.getComputedStyle(document.body);
    const fontFamily = bodyStyle.fontFamily || "system-ui, sans-serif";
    const textColor = bodyStyle.color || "#1f2937";
    const bgColor = bodyStyle.backgroundColor || "#ffffff";

    const accentColor = findAccentColor() || textColor;

    container.innerHTML = `
      <div class="tk-loading">Chargement des avis...</div>
    `;

    injectStyles(fontFamily, textColor, bgColor, accentColor);

    try {
      const query = placeId
        ? `place_id=${encodeURIComponent(placeId)}`
        : `place=${encodeURIComponent(place)}`;
      
      const response = await fetch(`${apiBase}/api/reviews?${query}`);

      const data = await response.json();

      if (!response.ok || !data.reviews) {
        container.innerHTML = "";
        return;
      }

      const reviews = data.reviews.slice(0, 5);
      const businessName = data.displayName?.text || "";
      const rating = data.rating || "";
      const total = data.userRatingCount || "";
      const mapsUrl = data.googleMapsUri || "#";

      container.innerHTML = `
        <section class="tk-widget">
          <div class="tk-header">
            <div>
              <div class="tk-title">${escapeHtml(businessName)}</div>
              <div class="tk-rating">
                <span class="tk-stars">${stars(rating)}</span>
                <span>${rating ? rating + " / 5" : ""}</span>
              </div>
              ${total ? `<div class="tk-total">Basé sur ${total} avis Google</div>` : ""}
            </div>
            <a class="tk-button" href="${mapsUrl}" target="_blank" rel="noopener">
              Voir tous les avis
            </a>
          </div>

          <div class="tk-carousel">
            ${reviews
              .map(function (review) {
                const author = review.authorAttribution?.displayName || "Client Google";
                const authorUrl = review.authorAttribution?.uri || "#";
                const reviewRating = review.rating || 5;
                const text = review.text?.text || "";
                const date = formatDate(review.publishTime);

                return `
                  <article class="tk-card">
                    <div class="tk-card-stars">${stars(reviewRating)}</div>
                    <p class="tk-text">“${escapeHtml(text)}”</p>
                    <div class="tk-author">
                      <a href="${authorUrl}" target="_blank" rel="noopener">
                        ${escapeHtml(author)}
                      </a>
                    </div>
                    ${date ? `<div class="tk-date">${date}</div>` : ""}
                  </article>
                `;
              })
              .join("")}
          </div>

          <div class="tk-google">Avis fournis par Google</div>
        </section>
      `;
    } catch (error) {
      container.innerHTML = "";
    }
  });

  function injectStyles(fontFamily, textColor, bgColor, accentColor) {
    if (document.getElementById("trustkit-styles")) return;

    const style = document.createElement("style");
    style.id = "trustkit-styles";

    style.textContent = `
      .tk-widget {
        font-family: ${fontFamily};
        color: ${textColor};
        width: 100%;
        box-sizing: border-box;
        padding: 24px;
        border-radius: 24px;
        background: rgba(255,255,255,0.72);
        border: 1px solid rgba(0,0,0,0.08);
        box-shadow: 0 12px 40px rgba(0,0,0,0.08);
        backdrop-filter: blur(10px);
      }

      .tk-header {
        display: flex;
        justify-content: space-between;
        gap: 20px;
        align-items: flex-start;
        margin-bottom: 22px;
      }

      .tk-title {
        font-size: 1.25rem;
        font-weight: 700;
        margin-bottom: 6px;
      }

      .tk-rating {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
      }

      .tk-stars,
      .tk-card-stars {
        color: ${accentColor};
        letter-spacing: 1px;
        white-space: nowrap;
      }

      .tk-total,
      .tk-date,
      .tk-google {
        font-size: 0.85rem;
        opacity: 0.68;
      }

      .tk-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 10px 16px;
        border-radius: 999px;
        background: ${accentColor};
        color: white !important;
        text-decoration: none;
        font-size: 0.9rem;
        font-weight: 600;
        white-space: nowrap;
        transition: transform 0.2s ease, opacity 0.2s ease;
      }

      .tk-button:hover {
        transform: translateY(-1px);
        opacity: 0.92;
      }

      .tk-carousel {
        display: flex;
        gap: 16px;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        padding-bottom: 10px;
      }

      .tk-carousel::-webkit-scrollbar {
        height: 6px;
      }

      .tk-carousel::-webkit-scrollbar-thumb {
        background: rgba(0,0,0,0.18);
        border-radius: 999px;
      }

      .tk-card {
        flex: 0 0 calc(33.333% - 12px);
        min-width: 260px;
        scroll-snap-align: start;
        box-sizing: border-box;
        padding: 18px;
        border-radius: 20px;
        background: rgba(255,255,255,0.78);
        border: 1px solid rgba(0,0,0,0.08);
      }

      .tk-text {
        font-size: 0.95rem;
        line-height: 1.5;
        margin: 12px 0 16px;
      }

      .tk-author a {
        color: inherit;
        font-weight: 700;
        text-decoration: none;
      }

      .tk-google {
        margin-top: 12px;
        text-align: right;
      }

      .tk-loading {
        font-family: ${fontFamily};
        opacity: 0.7;
      }

      @media (max-width: 800px) {
        .tk-widget {
          padding: 18px;
          border-radius: 20px;
        }

        .tk-header {
          flex-direction: column;
        }

        .tk-card {
          flex-basis: 86%;
        }

        .tk-button {
          width: 100%;
        }

        .tk-google {
          text-align: left;
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
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
