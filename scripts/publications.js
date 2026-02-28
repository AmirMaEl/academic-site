(function () {
  const listSelector = "[data-publications-list]";
  const dataUrl = new URL("data/publications.json", document.baseURI).toString();
  const inlineDataSelector = "#publications-data";
  const isFileProtocol = window.location.protocol === "file:";

  function setStatus(container, message) {
    container.innerHTML = "";
    const card = document.createElement("article");
    card.className = "publication-card publication-card--loading";
    card.textContent = message;
    container.appendChild(card);
  }

  function createActionLink(label, url) {
    const anchor = document.createElement("a");
    anchor.className = "publication-action";
    anchor.href = url;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.textContent = label || "View Source";
    return anchor;
  }

  function resolveResources(publication) {
    if (Array.isArray(publication.resources) && publication.resources.length) {
      return publication.resources.filter((entry) => entry && entry.url);
    }
    if (publication.link) {
      return [{ label: "View Source", url: publication.link }];
    }
    return [];
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatAuthors(authors) {
    const safeAuthors = escapeHtml(authors);
    return safeAuthors.replace(/\b(Amir El-Ghoussani|A\.?\s?El-Ghoussani)\b/g, '<span class="publication-author--self">$1</span>');
  }

  function createCard(publication) {
    const article = document.createElement("article");
    article.className = "publication-card";

    if (publication.cover) {
      const media = document.createElement("div");
      media.className = "publication-card__media";

      const img = document.createElement("img");
      img.className = "publication-card__cover";
      img.src = publication.cover;
      img.alt = `${publication.title} cover image`;
      img.loading = "lazy";

      media.appendChild(img);
      article.appendChild(media);
    }

    const content = document.createElement("div");
    content.className = "publication-card__content";
    article.appendChild(content);

    const header = document.createElement("div");
    header.className = "publication-card__header";

    if (publication.conference) {
      const badge = document.createElement("span");
      badge.className = "publication-card__badge";
      badge.textContent = publication.conference;
      header.appendChild(badge);
    }

    const titleEl = document.createElement("h3");
    titleEl.className = "publication-card__title";
    titleEl.textContent = publication.title;
    header.appendChild(titleEl);

    content.appendChild(header);

    if (publication.authors) {
      const authorsEl = document.createElement("p");
      authorsEl.className = "publication-card__meta";
      authorsEl.innerHTML = formatAuthors(publication.authors);
      content.appendChild(authorsEl);
    }

    if (publication.venue || publication.year) {
      const venueEl = document.createElement("p");
      venueEl.className = "publication-card__venue";
      const yearLabel = publication.year ? String(publication.year) : "";
      const venueParts = [publication.venue, yearLabel].filter(Boolean);
      venueEl.textContent = venueParts.join(" | ");
      content.appendChild(venueEl);
    }

    const resources = resolveResources(publication);
    if (resources.length) {
      const actions = document.createElement("div");
      actions.className = "publication-actions";
      resources.forEach((resource) => {
        actions.appendChild(createActionLink(resource.label, resource.url));
      });
      content.appendChild(actions);
    }

    return article;
  }

  async function hydratePublications() {
    const list = document.querySelector(listSelector);
    if (!list) {
      return;
    }

    setStatus(list, "Loading publications...");

    try {
      const inlineNode = document.querySelector(inlineDataSelector);
      let payload;

      if (inlineNode && inlineNode.textContent.trim()) {
        payload = JSON.parse(inlineNode.textContent);
      } else {
        const response = await fetch(`${dataUrl}?${Date.now()}`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        payload = await response.json();
      }

      const publications = Array.isArray(payload.publications) ? payload.publications : [];
      if (!publications.length) {
        setStatus(list, "No publications found.");
        return;
      }

      list.innerHTML = "";
      publications.forEach((publication) => {
        list.appendChild(createCard(publication));
      });
    } catch (error) {
      console.error("Failed to load publications", error);
      if (isFileProtocol) {
        setStatus(list, "Open the site via a local server (for example: python -m http.server) to view publications.");
      } else {
        setStatus(list, "Unable to load publications automatically.");
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", hydratePublications);
  } else {
    hydratePublications();
  }
})();
