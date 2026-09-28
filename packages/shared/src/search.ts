/** Address punctuation and repeated whitespace do not affect a search. */
export function searchTerms(query: string): string[] {
  return query.normalize('NFKC').toLocaleLowerCase('ru').match(/[\p{L}\p{N}]+/gu) ?? [];
}

export function matchesSearch(text: string, query: string): boolean {
  const normalized = searchTerms(text).join(' ');
  return searchTerms(query).every((term) => normalized.includes(term));
}
