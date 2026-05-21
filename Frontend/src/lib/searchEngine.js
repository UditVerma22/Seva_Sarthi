// src/lib/searchEngine.js
// ─────────────────────────────────────────────────────────────────────────────
// Industry-Level Smart Search Engine for Seva Sarthi
// Supports: Hindi transliteration, English, typo tolerance, word-boundary matching
// Built for Tier 2/3 city users with limited typing skills
// ─────────────────────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════════════════════
// 1. SYNONYM & ALIAS MAP (English + Hindi Transliterated)
// Maps common search terms to canonical service/tool identifiers
// ══════════════════════════════════════════════════════════════════════════════

const SEARCH_ALIASES = {
  // ── AC / Air Conditioner ──
  'ac': ['ac', 'air conditioner', 'air conditioning', 'ac servicing', 'ac repair', 'split ac', 'window ac', 'ac cleaning', 'ac gas'],
  'air conditioner': ['ac', 'air conditioner', 'ac servicing', 'ac repair'],
  'ac repair': ['ac', 'ac repair', 'ac servicing', 'air conditioner'],
  'ac service': ['ac', 'ac servicing', 'ac repair', 'ac cleaning', 'air conditioner'],
  'split ac': ['ac', 'split ac', 'ac servicing', 'air conditioner'],
  'window ac': ['ac', 'window ac', 'ac servicing', 'air conditioner'],
  // Hindi
  'thanda': ['ac', 'air conditioner', 'ac servicing', 'cooling'],
  'thandi': ['ac', 'air conditioner', 'ac servicing', 'cooling'],
  'ac wala': ['ac', 'ac repair', 'ac servicing'],
  'ac thik': ['ac', 'ac repair', 'ac servicing'],
  'ac kharab': ['ac', 'ac repair'],
  'cooling': ['ac', 'air conditioner'],

  // ── Washing Machine ──
  'washing machine': ['washing machine', 'washer', 'laundry'],
  'washer': ['washing machine', 'washer', 'laundry'],
  'wm': ['washing machine', 'washer'],
  'washing': ['washing machine', 'washer', 'laundry'],
  // Hindi
  'dhulai': ['washing machine', 'laundry', 'cleaning'],
  'dhulai machine': ['washing machine', 'washer'],
  'kapde dhona': ['washing machine', 'laundry'],
  'kapde': ['washing machine', 'laundry'],

  // ── Refrigerator ──
  'fridge': ['refrigerator', 'fridge', 'freezer'],
  'refrigerator': ['refrigerator', 'fridge', 'freezer'],
  'freezer': ['refrigerator', 'fridge', 'freezer'],
  // Hindi
  'fridge wala': ['refrigerator', 'fridge repair'],
  'fridge kharab': ['refrigerator', 'fridge repair'],

  // ── Electrician ──
  'electrician': ['electrician', 'electrical', 'wiring', 'switch', 'fan', 'light', 'mcb'],
  'electric': ['electrician', 'electrical', 'wiring'],
  'wiring': ['electrician', 'electrical', 'wiring'],
  'switch': ['electrician', 'switch', 'electrical'],
  'fan': ['electrician', 'fan', 'ceiling fan'],
  'light': ['electrician', 'light', 'tube light', 'bulb'],
  'bulb': ['electrician', 'light', 'bulb'],
  // Hindi
  'bijli': ['electrician', 'electrical', 'wiring'],
  'bijli wala': ['electrician', 'electrical'],
  'bijlee': ['electrician', 'electrical', 'wiring'],
  'light wala': ['electrician', 'light'],
  'pankha': ['electrician', 'fan', 'ceiling fan'],
  'switch board': ['electrician', 'switch'],
  'mcb': ['electrician', 'mcb', 'electrical'],

  // ── Plumber ──
  'plumber': ['plumber', 'plumbing', 'pipe', 'leak', 'tap', 'drain', 'water'],
  'plumbing': ['plumber', 'plumbing', 'pipe', 'leak'],
  'pipe': ['plumber', 'plumbing', 'pipe'],
  'leak': ['plumber', 'plumbing', 'leak', 'water leak'],
  'tap': ['plumber', 'tap', 'faucet'],
  'drain': ['plumber', 'drain', 'drainage', 'blocked drain'],
  'nalkaa': ['plumber', 'tap', 'plumbing', 'water'],
  // Hindi
  'nal': ['plumber', 'tap', 'plumbing', 'water'],
  'pani': ['plumber', 'plumbing', 'water', 'ro', 'water purifier'],
  'pani wala': ['plumber', 'plumbing'],
  'nali': ['plumber', 'drain', 'drainage'],
  'paip': ['plumber', 'pipe', 'plumbing'],

  // ── Carpenter ──
  'carpenter': ['carpenter', 'carpentry', 'wood', 'furniture', 'door', 'cabinet'],
  'carpentry': ['carpenter', 'carpentry', 'wood', 'furniture'],
  'furniture': ['carpenter', 'furniture', 'assembly', 'table', 'bed', 'cabinet'],
  'door': ['carpenter', 'door', 'wood'],
  'cabinet': ['carpenter', 'cabinet', 'furniture', 'kitchen cabinet'],
  // Hindi
  'mistri': ['carpenter', 'carpentry', 'handyman', 'home maintenance'],
  'lakdi': ['carpenter', 'carpentry', 'wood'],
  'lakdi wala': ['carpenter', 'carpentry'],
  'darwaza': ['carpenter', 'door'],
  'almaari': ['carpenter', 'cabinet', 'wardrobe', 'furniture'],
  'almari': ['carpenter', 'cabinet', 'wardrobe', 'furniture'],

  // ── Painting ──
  'painting': ['painting', 'paint', 'wall', 'color', 'whitewash', 'distemper'],
  'paint': ['painting', 'paint', 'wall'],
  'painter': ['painting', 'paint', 'painter'],
  'whitewash': ['painting', 'whitewash', 'wall'],
  'distemper': ['painting', 'distemper', 'wall'],
  // Hindi
  'rang': ['painting', 'paint', 'color'],
  'rangai': ['painting', 'paint'],
  'deewar': ['painting', 'wall'],
  'safedi': ['painting', 'whitewash'],
  'putty': ['painting', 'putty', 'wall'],

  // ── Cleaning ──
  'cleaning': ['cleaning', 'deep cleaning', 'home cleaning', 'bathroom cleaning', 'kitchen cleaning'],
  'deep cleaning': ['cleaning', 'deep cleaning', 'home cleaning'],
  'bathroom cleaning': ['cleaning', 'bathroom', 'toilet', 'bathroom cleaning'],
  'kitchen cleaning': ['cleaning', 'kitchen', 'kitchen cleaning'],
  'sofa cleaning': ['sofa cleaning', 'carpet cleaning', 'upholstery', 'fabric cleaning'],
  'carpet cleaning': ['carpet cleaning', 'sofa cleaning', 'fabric cleaning'],
  // Hindi
  'safai': ['cleaning', 'deep cleaning', 'home cleaning'],
  'saaf': ['cleaning', 'deep cleaning'],
  'ghar safai': ['cleaning', 'home cleaning', 'deep cleaning'],
  'bartan': ['cleaning', 'kitchen cleaning'],
  'bathroom safai': ['cleaning', 'bathroom cleaning'],
  'toilet': ['cleaning', 'bathroom cleaning', 'toilet'],
  'sofa safai': ['sofa cleaning', 'carpet cleaning'],

  // ── Pest Control ──
  'pest control': ['pest control', 'cockroach', 'termite', 'mosquito', 'bug'],
  'pest': ['pest control', 'bug', 'insect'],
  'cockroach': ['pest control', 'cockroach', 'bug'],
  'termite': ['pest control', 'termite'],
  'mosquito': ['pest control', 'mosquito'],
  // Hindi
  'keede': ['pest control', 'bug', 'insect'],
  'keedey': ['pest control', 'bug', 'insect'],
  'makodi': ['pest control', 'cockroach'],
  'cockroach marna': ['pest control', 'cockroach'],
  'deemak': ['pest control', 'termite'],
  'macchar': ['pest control', 'mosquito'],

  // ── Microwave / Oven ──
  'microwave': ['microwave', 'oven'],
  'oven': ['microwave', 'oven'],

  // ── RO / Water Purifier ──
  'ro': ['ro', 'water purifier', 'water filter'],
  'water purifier': ['ro', 'water purifier', 'water filter'],
  'water filter': ['ro', 'water purifier', 'water filter'],
  'ro service': ['ro', 'water purifier', 'ro service'],

  // ── Geyser ──
  'geyser': ['geyser', 'water heater', 'heater'],
  'water heater': ['geyser', 'water heater'],
  'heater': ['geyser', 'water heater', 'heater'],

  // ── Salon / Beauty ──
  'salon': ['salon', 'beauty', 'hair', 'facial', 'waxing', 'makeup'],
  'beauty': ['salon', 'beauty', 'facial', 'makeup'],
  'facial': ['salon', 'facial', 'beauty'],
  'waxing': ['salon', 'waxing', 'beauty'],
  'haircut': ['salon', 'haircut', 'hair'],
  'makeup': ['salon', 'makeup', 'beauty', 'bridal'],
  // Hindi
  'baal': ['salon', 'haircut', 'hair'],
  'baal katna': ['salon', 'haircut'],
  'sundarta': ['salon', 'beauty'],

  // ── Spa / Massage ──
  'spa': ['spa', 'massage', 'relax', 'therapy', 'body massage'],
  'massage': ['massage', 'spa', 'relax', 'body massage', 'therapy'],
  'malish': ['massage', 'spa', 'body massage'],
  'maalish': ['massage', 'spa', 'body massage'],

  // ── Garden ──
  'garden': ['garden', 'gardening', 'lawn', 'plant', 'landscaping'],
  'gardening': ['garden', 'gardening', 'lawn', 'landscaping'],
  'lawn': ['garden', 'lawn', 'grass'],
  // Hindi
  'bagicha': ['garden', 'gardening', 'plant'],
  'paudha': ['garden', 'plant', 'gardening'],

  // ── Home Maintenance ──
  'handyman': ['handyman', 'home maintenance', 'repair', 'general maintenance'],
  'repair': ['repair', 'home maintenance', 'handyman'],
  // Hindi
  'theek karna': ['repair', 'home maintenance'],
  'tamir': ['repair', 'home maintenance', 'handyman'],

  // ── Tool Rental Specific ──
  'drill': ['drill', 'drills', 'drivers', 'power drill', 'electric drill'],
  'hammer': ['hammer', 'mallet', 'hammers'],
  'saw': ['saw', 'grinder', 'cutting'],
  'grinder': ['grinder', 'saw', 'angle grinder', 'cutting'],
  'wrench': ['wrench', 'pliers', 'spanner'],
  'pliers': ['pliers', 'wrench', 'cutter'],
  'ladder': ['ladder', 'scaffolding', 'step ladder'],
  'spanner': ['wrench', 'spanner', 'pliers'],
  // Hindi
  'aari': ['saw', 'cutting'],
  'hathoda': ['hammer', 'mallet'],
  'seedhi': ['ladder', 'step ladder'],
  'pana': ['wrench', 'spanner'],
};


// ══════════════════════════════════════════════════════════════════════════════
// 2. WORD BOUNDARY MATCH (prevents "ac" matching inside "machine")
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Check if a query matches text using word-boundary logic.
 * For short queries (<=3 chars), ONLY match at word start.
 * For longer queries, match as whole word or word prefix.
 */
function wordBoundaryMatch(query, text) {
  if (!query || !text) return false;
  const q = query.toLowerCase().trim();
  const t = text.toLowerCase();

  // For very short queries (1-3 chars), require match at word start
  // This prevents "ac" matching "machine" but allows "ac" matching "AC Servicing"
  if (q.length <= 3) {
    // Split text into words and check if any word STARTS with the query
    const words = t.split(/[\s\-_/,&()]+/);
    return words.some(word => word.startsWith(q));
  }

  // For longer queries, use word-boundary regex
  try {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|[\\s\\-_/,&()])${escaped}`, 'i');
    return regex.test(t);
  } catch {
    return t.includes(q);
  }
}


// ══════════════════════════════════════════════════════════════════════════════
// 3. FUZZY MATCH (for typos — Levenshtein distance)
// ══════════════════════════════════════════════════════════════════════════════

function levenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,       // deletion
        matrix[i][j - 1] + 1,       // insertion
        matrix[i - 1][j - 1] + cost  // substitution
      );
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Check if two words are "close enough" (within typo tolerance).
 * Only for words 4+ chars. Max 1 typo for 4-6 chars, max 2 for 7+ chars.
 */
function fuzzyWordMatch(query, word) {
  const q = query.toLowerCase();
  const w = word.toLowerCase();

  if (q.length < 4) return q === w; // No fuzzy for short words
  if (q === w) return true;

  // Check if one starts with the other (prefix match)
  if (w.startsWith(q) || q.startsWith(w)) return true;

  const maxDist = q.length <= 6 ? 1 : 2;
  return levenshteinDistance(q, w) <= maxDist;
}


// ══════════════════════════════════════════════════════════════════════════════
// 4. ALIAS EXPANSION — expand user query to canonical terms
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Given a user's raw search query, expand it through the alias map.
 * Returns a set of all canonical terms that should be searched.
 * Also checks for multi-word alias matches and fuzzy matches.
 */
function expandQuery(rawQuery) {
  const q = rawQuery.toLowerCase().trim();
  const expanded = new Set();

  // Add the original query terms (strip punctuation for individual words)
  const queryWords = q.replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 0);
  queryWords.forEach(w => expanded.add(w));

  // 1. Try exact full-phrase match first
  if (SEARCH_ALIASES[q]) {
    SEARCH_ALIASES[q].forEach(term => expanded.add(term.toLowerCase()));
  }

  // 2. Try each word individually
  queryWords.forEach(word => {
    if (SEARCH_ALIASES[word]) {
      SEARCH_ALIASES[word].forEach(term => expanded.add(term.toLowerCase()));
    }
  });

  // 3. Try progressive multi-word combinations
  // e.g., "ac service repair" → try "ac service", "service repair"
  for (let len = 2; len <= queryWords.length; len++) {
    for (let start = 0; start <= queryWords.length - len; start++) {
      const phrase = queryWords.slice(start, start + len).join(' ');
      if (SEARCH_ALIASES[phrase]) {
        SEARCH_ALIASES[phrase].forEach(term => expanded.add(term.toLowerCase()));
      }
    }
  }

  // 4. Fuzzy match against alias keys (for typos)
  queryWords.forEach(word => {
    if (word.length >= 4) {
      Object.keys(SEARCH_ALIASES).forEach(aliasKey => {
        // Only fuzzy match single-word aliases
        if (!aliasKey.includes(' ') && fuzzyWordMatch(word, aliasKey)) {
          SEARCH_ALIASES[aliasKey].forEach(term => expanded.add(term.toLowerCase()));
        }
      });
    }
  });

  return expanded;
}


// ══════════════════════════════════════════════════════════════════════════════
// 5. SCORING SYSTEM — AND logic: ALL query words must match
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Expand a SINGLE word through the alias map.
 * Returns the set of canonical terms for that specific word.
 */
function expandSingleWord(word) {
  const w = word.toLowerCase().trim();
  const terms = new Set([w]);
  if (SEARCH_ALIASES[w]) {
    SEARCH_ALIASES[w].forEach(t => terms.add(t.toLowerCase()));
  }
  // Fuzzy match for typos (4+ chars only)
  if (w.length >= 4) {
    Object.keys(SEARCH_ALIASES).forEach(key => {
      if (!key.includes(' ') && fuzzyWordMatch(w, key)) {
        SEARCH_ALIASES[key].forEach(t => terms.add(t.toLowerCase()));
      }
    });
  }
  return terms;
}

/**
 * Check if a SINGLE query word (or any of its expanded aliases) matches the item.
 * Returns a score (0 = no match, higher = better match).
 */
function scoreWordMatch(word, wordAliases, name, desc, category, providerName) {
  let bestScore = 0;

  for (const term of wordAliases) {
    // Name matches (highest value)
    if (name === term) bestScore = Math.max(bestScore, 100);
    else if (name.startsWith(term + ' ') || name.startsWith(term)) bestScore = Math.max(bestScore, 80);
    else if (wordBoundaryMatch(term, name)) bestScore = Math.max(bestScore, 60);

    // Category matches
    if (wordBoundaryMatch(term, category)) bestScore = Math.max(bestScore, 40);

    // Description matches
    if (wordBoundaryMatch(term, desc)) bestScore = Math.max(bestScore, 20);

    // Provider name matches
    if (wordBoundaryMatch(term, providerName)) bestScore = Math.max(bestScore, 10);
  }

  return bestScore;
}

/**
 * Score a service/tool against a search query using AND logic.
 * ALL query words must match for score > 0.
 * 
 * "ac cleaning" → "ac" MUST match AND "cleaning" MUST match
 * This prevents "Sofa Dry Cleaning" matching (since "ac" doesn't match it)
 */
function scoreItem(item, _expandedTerms, rawQuery) {
  const name = (item.name || '').toLowerCase();
  const desc = (item.description || '').toLowerCase();
  const category = (item.category || '').toLowerCase();
  const providerName = (item.providerId?.name || item.providerName || '').toLowerCase();
  const q = rawQuery.toLowerCase().trim();

  // Split query into individual words (strip punctuation)
  const queryWords = q.replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 0);
  
  if (queryWords.length === 0) return 0;

  // First, try the full phrase as an alias (e.g., "ac cleaning", "washing machine")
  const fullPhraseAliases = expandSingleWord(q);
  
  // Check full phrase match — if it matches well, that's great
  let fullPhraseScore = 0;
  for (const term of fullPhraseAliases) {
    if (name === term) fullPhraseScore = Math.max(fullPhraseScore, 100);
    else if (wordBoundaryMatch(term, name)) fullPhraseScore = Math.max(fullPhraseScore, 70);
    if (wordBoundaryMatch(term, desc)) fullPhraseScore = Math.max(fullPhraseScore, 25);
    if (wordBoundaryMatch(term, category)) fullPhraseScore = Math.max(fullPhraseScore, 40);
  }

  // Then, do AND logic: EVERY word must match independently
  let totalWordScore = 0;
  let allWordsMatch = true;

  for (const word of queryWords) {
    const wordAliases = expandSingleWord(word);
    const wordScore = scoreWordMatch(word, wordAliases, name, desc, category, providerName);
    
    if (wordScore === 0) {
      allWordsMatch = false;
      break; // One word didn't match → entire query fails
    }
    totalWordScore += wordScore;
  }

  // If full phrase matched well, use that; otherwise require AND logic
  if (fullPhraseScore >= 60) {
    return fullPhraseScore;
  }

  if (!allWordsMatch) {
    return 0; // AND logic failed — not all words matched
  }

  return totalWordScore;
}


// ══════════════════════════════════════════════════════════════════════════════
// 6. CATEGORY KEYWORD MATCHING (STRICT, for category clicks)
// ══════════════════════════════════════════════════════════════════════════════

// Generic words that appear in DB category names — useless for sub-filtering
// because every service in that category will contain these words
const GENERIC_CATEGORY_WORDS = new Set([
  'cleaning', 'clean', 'repair', 'service', 'services', 'maintenance',
  'professional', 'home', 'works', 'general', 'control', 'care',
  'appliance', 'electrical', 'personal', 'deep', 'full', 'complete',
  'scrub', 'pest', 'paint', 'wood', 'water',
  // Hindi generic
  'safai', 'seva', 'kaam',
]);

/**
 * Check if a service matches a specific sub-category keyword set.
 * 
 * STRICT LOGIC:
 * 1. Filters out generic/common words that are part of the DB category name
 *    (e.g., "cleaning" in "Professional Cleaning" category)
 * 2. Requires at least ONE specific/distinguishing keyword to match
 *    in the service's name or description
 * 3. Prioritizes name matches over description matches
 * 
 * This prevents "Sofa Dry Cleaning" from showing up when 
 * "Bathroom & Kitchen Cleaning" is selected.
 */
function matchesCategoryKeywords(item, keywords, dbCategory) {
  if (!keywords || keywords.length === 0) return true;

  const name = (item.name || '').toLowerCase();

  // Extract words from the DB category to auto-detect generic terms
  const categoryWords = new Set();
  if (dbCategory) {
    dbCategory.toLowerCase().split(/[\s&,]+/).forEach(w => {
      if (w.length > 2) categoryWords.add(w);
    });
  }

  // Separate keywords into specific (distinguishing) vs generic
  const specificKeywords = [];
  
  for (const kw of keywords) {
    const kwLower = kw.toLowerCase().trim();
    if (!kwLower) continue;
    
    // Check if this keyword is generic (appears in category name or is a common word)
    const kwWords = kwLower.split(/\s+/);
    const isGeneric = kwWords.length === 1 && (
      GENERIC_CATEGORY_WORDS.has(kwLower) || 
      categoryWords.has(kwLower)
    );
    
    if (!isGeneric) {
      specificKeywords.push(kwLower);
    }
  }

  // If we filtered out ALL keywords (shouldn't happen with good data), 
  // fall back to matching any original keyword
  if (specificKeywords.length === 0) {
    return keywords.some(kw => {
      const keyword = kw.toLowerCase();
      return wordBoundaryMatch(keyword, name);
    });
  }

  // Require at least ONE specific keyword to match in the service NAME only
  // (not description — descriptions often contain overlapping terms from other sub-items
  //  e.g. "Full Home Deep Cleaning" description mentions "bathroom" and "kitchen")
  return specificKeywords.some(kw => {
    return wordBoundaryMatch(kw, name);
  });
}


// ══════════════════════════════════════════════════════════════════════════════
// 7. PUBLIC API — Main search functions
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Filter and rank services based on search query.
 * 
 * @param {Array} items - All services/tools
 * @param {string} searchTerm - User's raw search query
 * @param {Object} options - Additional filter options
 * @param {string} options.dbCategory - Exact DB category to filter by
 * @param {string[]} options.keywords - Category keywords for sub-filtering
 * @param {number} options.maxPrice - Maximum price filter
 * @param {number} options.minRating - Minimum rating filter
 * @param {string} options.sortBy - Sort mode ('relevance', 'lowestPrice', 'highestPrice', 'highestRated')
 * @param {string} options.priceField - Field name for price ('basePrice' or 'dailyRate')
 * @returns {Array} Filtered and sorted items
 */
export function searchAndFilter(items, searchTerm, options = {}) {
  const {
    dbCategory = '',
    keywords = [],
    maxPrice = Infinity,
    minRating = 0,
    sortBy = 'relevance',
    priceField = 'basePrice',
    condition = 'All',
    onlyAvailable = false,
  } = options;

  const hasSearch = searchTerm && searchTerm.trim().length > 0;
  const expandedTerms = hasSearch ? expandQuery(searchTerm) : new Set();

  // Filter
  let results = items.map(item => {
    let passes = true;

    // 1. DB Category filter (hard match)
    if (dbCategory && item.category !== dbCategory) {
      passes = false;
    }

    // 2. Keyword filter (sub-category precision — e.g. "AC" within "Appliance Repair")
    if (passes && dbCategory && keywords.length > 0) {
      if (!matchesCategoryKeywords(item, keywords, dbCategory)) {
        passes = false;
      }
    }

    // 3. Text search with scoring
    let score = 0;
    if (passes && hasSearch) {
      score = scoreItem(item, expandedTerms, searchTerm);
      if (score === 0) passes = false;
    }

    // 4. Price filter
    const price = item[priceField] || 0;
    if (passes && price > maxPrice) passes = false;

    // 5. Rating filter
    if (passes && (item.rating || 5) < minRating) passes = false;

    // 6. Condition filter (for tools)
    if (passes && condition !== 'All' && item.condition && item.condition !== condition) passes = false;

    // 7. Availability filter (for tools)
    if (passes && onlyAvailable && item.status !== 'available') passes = false;

    return { item, score, passes };
  }).filter(r => r.passes);

  // Sort
  if (sortBy === 'relevance' && hasSearch) {
    // Sort by score descending (most relevant first)
    results.sort((a, b) => b.score - a.score);
  } else if (sortBy === 'lowestPrice' || sortBy === 'priceLowHigh') {
    results.sort((a, b) => (a.item[priceField] || 0) - (b.item[priceField] || 0));
  } else if (sortBy === 'highestPrice' || sortBy === 'priceHighLow') {
    results.sort((a, b) => (b.item[priceField] || 0) - (a.item[priceField] || 0));
  } else if (sortBy === 'highestRated') {
    results.sort((a, b) => (b.item.rating || 5) - (a.item.rating || 5));
  }

  return results.map(r => r.item);
}

/**
 * Get search suggestions based on partial input.
 * Returns matching alias keys for autocomplete.
 */
export function getSearchSuggestions(query, maxResults = 8) {
  if (!query || query.trim().length < 2) return [];

  const q = query.toLowerCase().trim();
  const suggestions = [];

  // Match alias keys
  Object.keys(SEARCH_ALIASES).forEach(key => {
    if (key.startsWith(q) || wordBoundaryMatch(q, key)) {
      suggestions.push(key);
    }
  });

  // Also try fuzzy
  if (suggestions.length < 3 && q.length >= 4) {
    Object.keys(SEARCH_ALIASES).forEach(key => {
      if (!suggestions.includes(key) && fuzzyWordMatch(q, key)) {
        suggestions.push(key);
      }
    });
  }

  // Sort: exact prefix matches first, then alphabetical
  suggestions.sort((a, b) => {
    const aStarts = a.startsWith(q) ? 0 : 1;
    const bStarts = b.startsWith(q) ? 0 : 1;
    if (aStarts !== bStarts) return aStarts - bStarts;
    return a.localeCompare(b);
  });

  return suggestions.slice(0, maxResults);
}

// Export helpers for testing
export { wordBoundaryMatch, expandQuery, scoreItem, matchesCategoryKeywords, fuzzyWordMatch };
