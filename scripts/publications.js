(function () {
  const listSelector = '[data-publications-list]';
  const dataUrl = 'data/publications.json';

  function setStatus(container, message) {
    container.innerHTML = '';
    const card = document.createElement('article');
    card.className = 'publication-card publication-card--loading';
    card.textContent = message;
    container.appendChild(card);
  }

  function createActionLink(label, url) {
    const anchor = document.createElement('a');
    anchor.className = 'publication-action';
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.textContent = label || 'View Source';
    return anchor;
  }

  function resolveResources(publication) {
    if (Array.isArray(publication.resources) && publication.resources.length) {
      return publication.resources.filter((entry) => entry && entry.url);
    }
    if (publication.link) {
      return [{ label: 'View Source', url: publication.link }];
    }
    return [];
  }

  function createCard(publication) {
    const article = document.createElement('article');
    article.className = 'publication-card';

    const titleEl = document.createElement('h3');
    titleEl.className = 'publication-card__title';
    titleEl.textContent = publication.title;
    article.appendChild(titleEl);

    if (publication.authors) {
      const authorsEl = document.createElement('p');
      authorsEl.className = 'publication-card__meta';
      authorsEl.textContent = publication.authors;
      article.appendChild(authorsEl);
    }

    if (publication.venue || publication.year) {
      const venueEl = document.createElement('p');
      venueEl.className = 'publication-card__venue';
      const venueParts = [publication.venue, publication.year].filter(Boolean);
      venueEl.textContent = venueParts.join(' · ');
      article.appendChild(venueEl);
    }

    const resources = resolveResources(publication);
    if (resources.length) {
      const actions = document.createElement('div');
      actions.className = 'publication-actions';
      resources.forEach((resource) => {
        actions.appendChild(
          createActionLink(resource.label, resource.url),
        );
      });
      article.appendChild(actions);
    }

    return article;
  }

  function sortPublications(publications) {
    return [...publications].sort((a, b) => {
      const yearA = typeof a.year === 'number' ? a.year : 0;
      const yearB = typeof b.year === 'number' ? b.year : 0;
      if (yearA !== yearB) {
        return yearB - yearA;
      }
      return a.title.localeCompare(b.title);
    });
  }

  async function hydratePublications() {
    const list = document.querySelector(listSelector);
    if (!list) {
      return;
    }

    setStatus(list, 'Loading publications...');

    try {
      const response = await fetch(`${dataUrl}?${Date.now()}`);
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      const payload = await response.json();
      const publications = Array.isArray(payload.publications) ? payload.publications : [];
      if (!publications.length) {
        setStatus(list, 'No publications found.');
        return;
      }

      list.innerHTML = '';
      sortPublications(publications).forEach((publication) => {
        list.appendChild(createCard(publication));
      });
    } catch (error) {
      console.error('Failed to load publications', error);
      setStatus(list, 'Unable to load publications automatically.');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydratePublications);
  } else {
    hydratePublications();
  }
})();
