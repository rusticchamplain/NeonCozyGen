// js/src/utils/aliasPresentation.js

function titleWord(word) {
  const w = String(word || '').trim();
  if (!w) return '';
  const lower = w.toLowerCase();
  const overrides = {
    scifi: 'Sci-Fi',
    sci: 'Sci',
    ui: 'UI',
    vfx: 'VFX',
    hdr: 'HDR',
    dof: 'DoF',
    bokeh: 'Bokeh',
    vhs: 'VHS',
    jpeg: 'JPEG',
    jpg: 'JPG',
    png: 'PNG',
    gif: 'GIF',
    webp: 'WebP',
    api: 'API',
    nsfw: 'NSFW',
    sfw: 'SFW',
    sfx: 'SFX',
    fx: 'FX',
    lora: 'LoRA',
    loras: 'LoRAs',
    ip: 'IP',
    egirl: 'E-girl',
    i2v: 'I2V',
    t2i: 'T2I',
    img2img: 'Img2Img',
    txt2img: 'Txt2Img',
    tts: 'TTS',
    asmr: 'ASMR',
    ai: 'AI',
    highleg: 'High-Leg',
    'one-piece': 'One-Piece',
    'three-quarter': 'Three-Quarter',
  };
  if (overrides[lower]) return overrides[lower];
  if (/^\d+$/.test(lower)) return lower;
  if (lower === '3d') return '3D';
  if (lower === '2d') return '2D';
  if (lower.length === 1) return lower.toUpperCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function derivePoseSubcategory(name = '') {
  const raw = String(name || '').trim().toLowerCase();
  if (!raw) return '';
  const prefix = raw.split('_')[0] || '';

  // Consolidated subcategories (renamed for clarity)
  if (prefix === 'media') return 'media';
  if (prefix === 'posture') return 'posture';
  if (prefix === 'dynamic') return 'dynamic';
  if (prefix === 'interaction') return 'interaction';
  // Note: 'expression' moved to body category

  // Fallback: if no match, return the prefix itself
  return prefix || 'other';
}

function deriveOutfitSubcategory(name = '') {
  const raw = String(name || '').trim().toLowerCase();
  if (!raw) return '';
  const prefix = raw.split('_')[0] || '';

  if (prefix === 'lingerie') return 'lingerie';
  if (prefix === 'swimwear' || prefix === 'swim') return 'swimwear';
  if (prefix === 'costumes' || prefix === 'tech') return 'costumes';
  if (prefix === 'uniform') return 'uniform';
  if (prefix === 'formal') return 'formal';
  if (prefix === 'alt') return 'alt';
  if (prefix === 'sensual') return 'sensual';
  if (prefix === 'trad') return 'trad';
  if (prefix === 'pro') return 'pro';
  if (prefix === 'sporty') return 'sporty';
  if (prefix === 'fantasy') return 'fantasy';

  if (
    prefix === 'casual' ||
    prefix === 'street' ||
    prefix === 'lounge' ||
    prefix === 'sporty' ||
    prefix === 'dress'
  ) {
    return 'everyday';
  }

  // Fallback: keep whatever prefix we found to avoid losing information.
  return prefix || 'everyday';
}

function deriveLightingSubcategory(name = '') {
  const raw = String(name || '').trim().toLowerCase();
  if (!raw) return '';
  const parts = raw.split('_').filter(Boolean);
  const prefix = parts[0] || '';
  const secondary = parts[1] || '';

  // Group lighting into a small set of predictable buckets.
  if (['fire', 'candlelight', 'embers'].includes(prefix)) return 'fire';
  if (['moonlight'].includes(prefix)) return 'night';
  if (['neon'].includes(prefix)) return 'neon';
  if (['studio', 'stage', 'sidelighting', 'dim'].includes(prefix)) return 'studio';
  if (['golden', 'sunbeam', 'dappled'].includes(prefix)) return 'natural';
  if (['lens', 'light'].includes(prefix)) return 'effects';

  if (prefix === 'special') {
    if (['candlelight', 'embers', 'fire'].includes(secondary)) return 'fire';
    if (secondary === 'moonlight') return 'night';
    if (secondary === 'neon') return 'neon';
    if (['stage', 'spotlight', 'studio'].includes(secondary)) return 'studio';
    if (['sunbeam', 'golden', 'dappled'].includes(secondary)) return 'natural';
    if (secondary) return 'effects';
  }

  if (prefix === 'particle') {
    if (['sunbeam', 'dust'].includes(secondary)) return 'natural';
    return 'effects';
  }

  return prefix || 'other';
}

function deriveNsfwSubcategory(name = '') {
  const raw = String(name || '').trim().toLowerCase();
  if (!raw) return '';
  const prefix = raw.split('_')[0] || '';

  // NSFW subcategories based on prefix (19 categories)
  const validSubcategories = [
    'aftercare', 'bdsm', 'clothed', 'cumshot', 'flexible', 'footjob', 'foreplay',
    'furniture', 'group', 'handjob', 'lesbian', 'locations', 'masturbation', 'oral',
    'paizuri', 'penetration', 'pregnant', 'special', 'toys'
  ];

  if (validSubcategories.includes(prefix)) {
    return prefix;
  }

  // Default fallback
  return 'other';
}

function deriveCharSubcategory(name = '') {
  const raw = String(name || '').trim().toLowerCase();
  if (!raw) return '';
  const prefix = raw.split('_')[0] || '';

  // Character subcategories (renamed for clarity)
  const validSubcategories = [
    'fantasy', 'scifi', 'horror', 'cyberpunk', 'historical', 'wasteland', 'occult', 'mythology'
  ];

  if (validSubcategories.includes(prefix)) {
    return prefix;
  }

  // Default fallback
  return 'other';
}

function deriveHairSubcategory(name = '') {
  const raw = String(name || '').trim().toLowerCase();
  if (!raw) return '';
  const parts = raw.split('_').filter(Boolean);
  if (parts[0] === 'hair' && parts[1]) return parts[1];
  return parts[0] || 'other';
}

export function deriveAliasSubcategory(name = '', category = '') {
  const trimmed = String(name || '').trim();
  const cat = String(category || '').trim().toLowerCase();
  if (!trimmed) return '';

  if (cat === 'outfit') {
    return deriveOutfitSubcategory(trimmed) || 'everyday';
  }

  if (cat === 'pose') {
    return derivePoseSubcategory(trimmed) || 'everyday';
  }

  if (cat === 'lighting') {
    return deriveLightingSubcategory(trimmed) || 'effects';
  }

  if (cat === 'nsfw') {
    return deriveNsfwSubcategory(trimmed) || 'other';
  }

  if (cat === 'character') {
    return deriveCharSubcategory(trimmed) || 'other';
  }

  if (cat === 'hair') {
    return deriveHairSubcategory(trimmed) || 'other';
  }

  const idx = trimmed.indexOf('_');
  if (idx <= 0) return '';
  return trimmed.slice(0, idx).trim();
}

export function aliasTokenBase(token = '') {
  const raw = String(token || '').trim();
  if (!raw) return '';
  return raw.includes(':') ? raw.split(':').slice(1).join(':') : raw;
}

export function formatAliasFriendlyName({
  token = '',
  name = '',
} = {}) {
  const base = String(name || '').trim() || aliasTokenBase(token);
  if (!base) return '';

  const cleanBase = base.replace(/_(\d+)$/u, '');
  let parts = cleanBase.split('_').filter(Boolean);
  if (parts.length === 0) return base;

  // Merge common multi-token phrases into a single friendly word.
  const merged = [];
  for (let i = 0; i < parts.length; i++) {
    const current = parts[i];
    const next = parts[i + 1];
    if (current && next && current.toLowerCase() === 'one' && next.toLowerCase() === 'piece') {
      merged.push('one-piece');
      i += 1;
      continue;
    }
    if (current && next && current.toLowerCase() === 'three' && next.toLowerCase() === 'quarter') {
      merged.push('three-quarter');
      i += 1;
      continue;
    }
    merged.push(current);
  }
  parts = merged;

  // Collapse duplicate slugs like `painterly_painterly` or `explorer_explorer`.
  const uniqueLower = Array.from(new Set(parts.map((p) => String(p).toLowerCase())));
  if (uniqueLower.length === 1) {
    return titleWord(parts[0]);
  }

  const sub = parts[0];
  const rest = parts.slice(1);

  const friendlySub = titleWord(sub);
  const friendlyRest = rest.map(titleWord).join(' ').trim();

  if (!friendlyRest) return parts.map(titleWord).join(' ').trim() || base;
  if (friendlyRest.toLowerCase() === friendlySub.toLowerCase()) {
    // If the slug repeats (e.g. `painterly_painterly`) show only one word.
    if (rest.length === 1 && String(rest[0]).toLowerCase() === String(sub).toLowerCase()) {
      return friendlySub || base;
    }
    return parts.map(titleWord).join(' ').trim() || base;
  }
  return `${friendlySub} - ${friendlyRest}`;
}

export function presentAliasEntry(entry) {
  if (!entry) return { subcategory: '', displayName: '' };
  const name = entry.name || '';
  const token = entry.token || '';
  const baseName = aliasTokenBase(token) || name;
  const subcategory = deriveAliasSubcategory(baseName, entry.category) || 'other';
  const displayName = formatAliasFriendlyName({ token, name }) || token || name || 'Alias';
  return { subcategory, displayName };
}

export function formatCategoryLabel(category = '') {
  const raw = String(category || '').trim();
  if (!raw) return '';
  if (raw === 'All') return 'All';

  // Handle prompt subcategories dynamically
  if (raw.startsWith('prompts_')) {
    const subcat = raw.replace('prompts_', '');
    return `PROMPTS - ${titleWord(subcat)}`;
  }

  const mapping = {
    // SUBJECT - Who/what is in the frame
    character: 'SUBJECT - Character',
    media_char: 'SUBJECT - Media Character',
    body: 'SUBJECT - Body',
    expression: 'SUBJECT - Expression',
    outfit: 'SUBJECT - Outfit',
    accessory: 'SUBJECT - Accessory',

    // POSE - Poses and actions
    dynamic: 'POSE - Dynamic',
    interaction: 'POSE - Interaction',
    media_pose: 'POSE - Media',
    posture: 'POSE - Posture',
    nsfw: 'POSE - NSFW',

    // SCENE - Where/environment/atmosphere
    indoor: 'SCENE - Indoor',
    outdoor: 'SCENE - Outdoor',
    urban: 'SCENE - Urban',
    everyday: 'SCENE - Everyday',
    media: 'SCENE - Media',
    art: 'SCENE - Art',
    history: 'SCENE - History',
    speculative: 'SCENE - Speculative',
    weather: 'SCENE - Weather',

    // STYLES - Artistic aesthetics
    artistic: 'STYLES - Artistic',
    film: 'STYLES - Film',
    game: 'STYLES - Game',
    photo: 'STYLES - Photo',
    vintage: 'STYLES - Vintage',

    // CAMERA - Technical aspects
    angles: 'CAMERA - Angles',
    distance: 'CAMERA - Distance',
    lens: 'CAMERA - Lens',
    technique: 'CAMERA - Technique',
    device: 'CAMERA - Device',
    lighting: 'CAMERA - Lighting',
    render: 'CAMERA - Render',
    filter: 'CAMERA - Filter',

    // PROMPTS - Full scene compositions (fallback for old format)
    prompts: 'PROMPTS - Full Scenes',
  };
  return mapping[raw] || titleWord(raw);
}

export function formatSubcategoryLabel(subcategory = '') {
  const raw = String(subcategory || '').trim();
  if (!raw) return '';
  if (raw === 'All') return 'All';
  return raw
    .split(/[_-]+/u)
    .filter(Boolean)
    .map((part) => titleWord(part))
    .join(' ')
    .trim();
}
