// Pick the right text for an activity given the content language.
// Hebrew uses the source fields; English uses the translation-preferred fields
// (which already fall back to the source when no translation exists yet).

export function localizedName(activity, lang) {
  return lang === 'he' ? (activity.nameHe || activity.name) : activity.name;
}

export function localizedDesc(activity, lang) {
  return lang === 'he' ? (activity.descriptionHe || activity.description) : activity.description;
}
