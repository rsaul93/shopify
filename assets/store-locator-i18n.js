/**
 * Applies translated strings to Google Maps Extended Component Library (gmpx)
 * so that gmpx-store-locator and gmpx-place-picker show correct language.
 * Expects: window.__GMAP_STRINGS__ (object), window.__GMAP_LIBRARY_URL__ (string)
 */
const strings = window.__GMAP_STRINGS__;
const libraryUrl = window.__GMAP_LIBRARY_URL__;

if (strings && libraryUrl) {
  const TEMPLATE_KEYS = [
    'LOCATOR_DIRECTIONS_BUTTON_LABEL',
    'PLACE_CLOSES',
    'PLACE_OPENS',
    'PLACE_PHOTO_ALT',
    'PLACE_PHOTO_TILE_ARIA_LABEL',
    'PLACE_REVIEWS_AUTHOR_PHOTO_ALT'
  ];

  const PLACEHOLDER = /%0%/g;
  function buildLiterals() {
    const out = {};
    for (const key of Object.keys(strings)) {
      const val = strings[key];
      if (TEMPLATE_KEYS.includes(key) && typeof val === 'string') {
        out[key] = (t) => val.replace(PLACEHOLDER, t != null ? t : '');
      } else if (key === 'PLACE_RATING_ARIA_LABEL' && typeof val === 'string') {
        const parts = val.split('||');
        out[key] = (t) => (t === 1 ? (parts[0] || '1 star') : (parts[1] || `${t} stars`).replace(PLACEHOLDER, t));
      } else {
        out[key] = val;
      }
    }
    return out;
  }

  import(/* webpackIgnore: true */ libraryUrl)
    .then((module) => {
      if (module.setStringLiterals) {
        module.setStringLiterals(buildLiterals());
      }
    })
    .catch(() => {});
}
