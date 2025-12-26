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

  // Media-inspired poses
  if (prefix === 'cinema') return 'cinema';
  if (prefix === 'game') return 'game';
  if (prefix === 'art') return 'art';

  // Body position categories
  if (prefix === 'stand') return 'stand';
  if (prefix === 'sit') return 'sit';
  if (prefix === 'lie') return 'lie';
  if (prefix === 'action') return 'action';

  // Adult/NSFW poses
  if (prefix === 'nsfw') return 'nsfw';

  // Legacy prefixes
  if (raw.startsWith('flirty_')) return 'flirty';

  // High-energy / movement / combat + stealth all grouped as Action
  if (
    raw.startsWith('dynamic_') ||
    raw.startsWith('stealth_') ||
    raw.startsWith('athletic_') ||
    raw.startsWith('running_') ||
    raw.startsWith('walking_')
  ) {
    return 'action';
  }

  // Quiet / resting / seated / reclining
  if (
    raw.startsWith('sleepy_') ||
    raw.startsWith('relaxed_') ||
    raw.startsWith('reclining_') ||
    raw.startsWith('sitting_') ||
    raw.startsWith('kneeling_')
  ) {
    return 'rest';
  }

  // Expression-led / emotional tones
  if (
    raw.startsWith('happy_') ||
    raw.startsWith('sad_') ||
    raw.startsWith('angry_') ||
    raw.startsWith('nervous_') ||
    raw.startsWith('smug_') ||
    raw.startsWith('surprised_') ||
    raw.startsWith('scared_') ||
    raw.startsWith('tipsy_')
  ) {
    return 'emotion';
  }

  // Deliberate / posed / cinematic framing
  if (
    raw.startsWith('composed_') ||
    raw.startsWith('contemplative_') ||
    raw.startsWith('looking_')
  ) {
    return 'posed';
  }

  // Default bucket: everyday gestures + activities + traditional poses
  return 'everyday';
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
  const prefix = raw.split('_')[0] || '';

  // Group lighting into a small set of predictable buckets.
  if (['fire', 'candlelight', 'embers'].includes(prefix)) return 'fire';
  if (['moonlight'].includes(prefix)) return 'night';
  if (['neon'].includes(prefix)) return 'neon';
  if (['studio', 'stage', 'sidelighting', 'dim'].includes(prefix)) return 'studio';
  if (['golden', 'sunbeam', 'dappled'].includes(prefix)) return 'natural';
  if (['lens', 'light'].includes(prefix)) return 'effects';

  return prefix || 'other';
}

function deriveNsfwSubcategory(name = '') {
  const raw = String(name || '').trim().toLowerCase();
  if (!raw) return '';
  const prefix = raw.split('_')[0] || '';

  // NSFW subcategories based on prefix
  const validSubcategories = [
    'penetration', 'oral', 'anal', 'masturbation', 'toys', 'handjob', 'footjob', 'paizuri',
    'group', 'bdsm', 'femdom', 'maledom', 'lesbian', 'pregnant', 'water', 'public', 'clothed',
    'cumshot', 'aftercare', 'kissing', 'teasing', 'specialty', 'positions', 'pov', 'ahegao',
    'lactation', 'squirting', 'furniture', 'vehicle', 'flexible', 'tentacle', 'futanari',
    'size', 'spanking', 'pegging'
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

  // Character subcategories based on prefix
  const validSubcategories = [
    'fantasy', 'scifi', 'horror', 'cyber', 'hist', 'waste', 'occult', 'myth'
  ];

  if (validSubcategories.includes(prefix)) {
    return prefix;
  }

  // Default fallback
  return 'other';
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

  if (cat === 'char') {
    return deriveCharSubcategory(trimmed) || 'other';
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
  const mapping = {
    // SUBJECT - Who/what is in the frame
    char: 'SUBJECT - Characters',
    body: 'SUBJECT - Body',
    outfit: 'SUBJECT - Outfits',
    accessory: 'SUBJECT - Accessories',

    // ACTION - What they're doing
    pose: 'ACTION - Poses',
    action: 'ACTION - Actions',
    nsfw: 'ACTION - NSFW',

    // SCENE - Where/environment
    scene: 'SCENE - Scenes',
    weather: 'SCENE - Weather',
    prop: 'SCENE - Props',

    // COMPOSITION - How it looks (technical)
    camera: 'COMPOSITION - Camera',
    lighting: 'COMPOSITION - Lighting',
    style: 'COMPOSITION - Style',
    mood: 'COMPOSITION - Mood',
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
