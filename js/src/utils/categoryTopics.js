// js/src/utils/categoryTopics.js

/**
 * Maps categories to their main topics for hierarchical navigation
 */

export const TOPICS = {
  SUBJECT: 'SUBJECT',
  POSE: 'POSE',
  SCENE: 'SCENE',
  STYLES: 'STYLES',
  CAMERA: 'CAMERA',
  PROMPTS: 'PROMPTS',
};

export const TOPIC_LABELS = {
  [TOPICS.SUBJECT]: 'Subject',
  [TOPICS.POSE]: 'Pose',
  [TOPICS.SCENE]: 'Scene',
  [TOPICS.STYLES]: 'Styles',
  [TOPICS.CAMERA]: 'Camera',
  [TOPICS.PROMPTS]: 'Prompts',
};

export const CATEGORY_TO_TOPIC = {
  // SUBJECT - Who/what is in the frame
  character: TOPICS.SUBJECT,
  media_char: TOPICS.SUBJECT,
  body: TOPICS.SUBJECT,
  expression: TOPICS.SUBJECT,
  outfit: TOPICS.SUBJECT,
  accessory: TOPICS.SUBJECT,

  // POSE - Poses and actions
  dynamic: TOPICS.POSE,
  interaction: TOPICS.POSE,
  media_pose: TOPICS.POSE,
  posture: TOPICS.POSE,
  nsfw: TOPICS.POSE,

  // SCENE - Where/environment/atmosphere
  indoor: TOPICS.SCENE,
  outdoor: TOPICS.SCENE,
  urban: TOPICS.SCENE,
  everyday: TOPICS.SCENE,
  media: TOPICS.SCENE,
  art: TOPICS.SCENE,
  history: TOPICS.SCENE,
  speculative: TOPICS.SCENE,
  weather: TOPICS.SCENE,

  // STYLES - Artistic aesthetics
  artistic: TOPICS.STYLES,
  film: TOPICS.STYLES,
  game: TOPICS.STYLES,
  photo: TOPICS.STYLES,
  vintage: TOPICS.STYLES,

  // CAMERA - Technical aspects (composition, lighting, quality)
  angles: TOPICS.CAMERA,
  distance: TOPICS.CAMERA,
  lens: TOPICS.CAMERA,
  technique: TOPICS.CAMERA,
  device: TOPICS.CAMERA,
  lighting: TOPICS.CAMERA,
  render: TOPICS.CAMERA,
  filter: TOPICS.CAMERA,

  // PROMPTS - Full scene compositions
  prompts: TOPICS.PROMPTS,
  prompts_action: TOPICS.PROMPTS,
  prompts_adventure: TOPICS.PROMPTS,
  prompts_cinematic: TOPICS.PROMPTS,
  prompts_fantasy: TOPICS.PROMPTS,
  prompts_historical: TOPICS.PROMPTS,
  prompts_horror: TOPICS.PROMPTS,
  prompts_mystery: TOPICS.PROMPTS,
  prompts_nsfw: TOPICS.PROMPTS,
  prompts_romance: TOPICS.PROMPTS,
  prompts_scifi: TOPICS.PROMPTS,
  prompts_slice: TOPICS.PROMPTS,
};

/**
 * Get the topic for a given category
 */
export function getCategoryTopic(category) {
  const cat = String(category || '').trim().toLowerCase();
  return CATEGORY_TO_TOPIC[cat] || null;
}

/**
 * Get all categories for a given topic
 */
export function getTopicCategories(topic) {
  if (!topic || topic === 'All') return Object.keys(CATEGORY_TO_TOPIC);

  return Object.entries(CATEGORY_TO_TOPIC)
    .filter(([_, t]) => t === topic)
    .map(([cat]) => cat);
}

/**
 * Filter categories by active topic
 */
export function filterCategoriesByTopic(categories, activeTopic) {
  if (!activeTopic || activeTopic === 'All') return categories;

  const topicCategories = getTopicCategories(activeTopic);
  return categories.filter(cat => {
    if (cat === 'All') return true;
    return topicCategories.includes(cat);
  });
}

/**
 * Get the topic for the "All" option or first available category
 */
export function getDefaultTopic(categories) {
  if (!categories || categories.length === 0) return 'All';

  // Find first non-"All" category and get its topic
  const firstCategory = categories.find(cat => cat !== 'All');
  if (!firstCategory) return 'All';

  return getCategoryTopic(firstCategory) || 'All';
}
