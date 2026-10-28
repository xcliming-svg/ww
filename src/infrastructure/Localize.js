/** @param {Record<string, Record<string,string>>} dictionaries @param {string} locale @param {string} fallback */
export function createLocalize(dictionaries, locale, fallback) {
  /** @param {string} key @param {Record<string,string|number>} [params] */
  return (key, params = {}) => {
    const template = dictionaries[locale]?.[key] ?? dictionaries[fallback]?.[key];
    if (template === undefined) {
      console.error(`Missing locale: ${locale}:${key}`);
      return `[${key}]`;
    }
    return template.replace(/\{(\w+)\}/g, (_, name) => {
      if (!(name in params)) {
        console.error(`Missing parameter: ${key}:${name}`);
        return `{${name}}`;
      }
      return typeof params[name] === 'number'
        ? new Intl.NumberFormat(locale).format(params[name])
        : params[name];
    });
  };
}
