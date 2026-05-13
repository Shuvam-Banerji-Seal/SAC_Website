/**
 * SAC IISER Kolkata — Club Card Component (Skeleton)
 * Reusable card for displaying club information.
 */

export class ClubCard {
  constructor(data = {}) {
    this.data = {
      name: data.name || 'Club Name',
      description: data.description || 'Description placeholder...',
      icon: data.icon || '/src/assets/svgs/club-placeholder.svg',
      category: data.category || 'General',
      members: data.members || 0,
    };
    this.element = null;
  }

  /**
   * Render the club card DOM element.
   * @returns {HTMLElement}
   */
  render() {
    this.element = document.createElement('article');
    this.element.className = 'club-card';
    this.element.setAttribute('tabindex', '0');
    this.element.setAttribute('role', 'article');
    this.element.setAttribute('aria-label', this.data.name);

    this.element.innerHTML = `
      <div class="club-card__inner">
        <div class="club-card__icon-wrapper">
          <img
            class="club-card__icon"
            data-src="${this.data.icon}"
            src="/src/assets/svgs/club-placeholder.svg"
            alt="${this.data.name} icon"
            loading="lazy"
          />
          <span class="club-card__category label label--secondary">${this.data.category}</span>
        </div>
        <h3 class="club-card__name heading-md">${this.data.name}</h3>
        <p class="club-card__description body-sm">${this.data.description}</p>
        <div class="club-card__footer">
          <span class="club-card__members body-muted">
            ${this.data.members} member${this.data.members !== 1 ? 's' : ''}
          </span>
          <a href="#" class="club-card__link" aria-label="View ${this.data.name} details">
            View Club →
          </a>
        </div>
      </div>
    `;

    return this.element;
  }

  /**
   * Get the card's DOM element (for GSAP animations, etc.).
   * @returns {HTMLElement|null}
   */
  getElement() {
    return this.element;
  }
}
