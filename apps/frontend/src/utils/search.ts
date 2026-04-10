/**
 * Search and filter utilities
 */

/**
 * Fuzzy search implementation
 */
export function fuzzySearch(query: string, text: string): boolean {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  
  let queryIndex = 0;
  let textIndex = 0;
  
  while (queryIndex < queryLower.length && textIndex < textLower.length) {
    if (queryLower[queryIndex] === textLower[textIndex]) {
      queryIndex++;
    }
    textIndex++;
  }
  
  return queryIndex === queryLower.length;
}

/**
 * Calculate fuzzy match score (0-1, higher is better)
 */
export function fuzzyScore(query: string, text: string): number {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  
  if (textLower.includes(queryLower)) {
    // Exact substring match gets high score
    return 1 - (textLower.indexOf(queryLower) / textLower.length) * 0.3;
  }
  
  let score = 0;
  let queryIndex = 0;
  let textIndex = 0;
  let consecutiveMatches = 0;
  
  while (queryIndex < queryLower.length && textIndex < textLower.length) {
    if (queryLower[queryIndex] === textLower[textIndex]) {
      score += 1 + consecutiveMatches * 0.5; // Bonus for consecutive matches
      consecutiveMatches++;
      queryIndex++;
    } else {
      consecutiveMatches = 0;
    }
    textIndex++;
  }
  
  if (queryIndex < queryLower.length) {
    return 0; // Didn't match all query characters
  }
  
  return score / (queryLower.length + textLower.length);
}

/**
 * Search multiple fields in an object
 */
export function searchObject<T extends Record<string, any>>(
  obj: T,
  query: string,
  fields: (keyof T)[]
): boolean {
  const queryLower = query.toLowerCase();
  
  return fields.some(field => {
    const value = obj[field];
    if (value == null) return false;
    return String(value).toLowerCase().includes(queryLower);
  });
}

/**
 * Filter array by search query across multiple fields
 */
export function filterBySearch<T extends Record<string, any>>(
  items: T[],
  query: string,
  fields: (keyof T)[]
): T[] {
  if (!query.trim()) return items;
  
  return items.filter(item => searchObject(item, query, fields));
}

/**
 * Sort items by relevance to search query
 */
export function sortByRelevance<T extends Record<string, any>>(
  items: T[],
  query: string,
  fields: (keyof T)[]
): T[] {
  if (!query.trim()) return items;
  
  return items
    .map(item => {
      const scores = fields.map(field => {
        const value = item[field];
        if (value == null) return 0;
        return fuzzyScore(query, String(value));
      });
      const maxScore = Math.max(...scores);
      return { item, score: maxScore };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
}

/**
 * Highlight matching text in a string
 */
export function highlightMatches(text: string, query: string): string {
  if (!query.trim()) return text;
  
  const regex = new RegExp(`(${escapeRegex(query)})`, "gi");
  return text.replace(regex, "<mark>$1</mark>");
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Debounce function for search input
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Create a search index for faster lookups
 */
export class SearchIndex<T> {
  private items: T[];
  private index: Map<string, Set<number>>;
  private getSearchableText: (item: T) => string;
  
  constructor(items: T[], getSearchableText: (item: T) => string) {
    this.items = items;
    this.getSearchableText = getSearchableText;
    this.index = new Map();
    this.buildIndex();
  }
  
  private buildIndex() {
    this.items.forEach((item, idx) => {
      const text = this.getSearchableText(item).toLowerCase();
      const words = text.split(/\s+/);
      
      words.forEach(word => {
        if (!this.index.has(word)) {
          this.index.set(word, new Set());
        }
        this.index.get(word)!.add(idx);
      });
    });
  }
  
  search(query: string): T[] {
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) return this.items;
    
    // Find items that match all words
    const matchingSets = words.map(word => {
      // Find all index entries that start with this word
      const matches = new Set<number>();
      for (const [indexWord, indices] of this.index.entries()) {
        if (indexWord.startsWith(word)) {
          indices.forEach(idx => matches.add(idx));
        }
      }
      return matches;
    });
    
    // Intersect all sets
    const intersection = matchingSets.reduce((acc, set) => {
      const result = new Set<number>();
      acc.forEach(idx => {
        if (set.has(idx)) result.add(idx);
      });
      return result;
    });
    
    return Array.from(intersection).map(idx => this.items[idx]);
  }
  
  update(items: T[]) {
    this.items = items;
    this.index.clear();
    this.buildIndex();
  }
}
