// js/src/ui/primitives/TopicTabs.jsx
import { TOPICS, TOPIC_LABELS } from '../../utils/categoryTopics';

/**
 * Topic tabs for hierarchical alias navigation
 * SUBJECT | POSE | SCENE | STYLES | CAMERA | PROMPTS
 */
export default function TopicTabs({ activeTopic, onTopicChange, showAll = true }) {
  const topics = showAll
    ? ['All', TOPICS.SUBJECT, TOPICS.POSE, TOPICS.SCENE, TOPICS.STYLES, TOPICS.CAMERA, TOPICS.PROMPTS]
    : [TOPICS.SUBJECT, TOPICS.POSE, TOPICS.SCENE, TOPICS.STYLES, TOPICS.CAMERA, TOPICS.PROMPTS];

  return (
    <div className="topic-tabs">
      {topics.map((topic) => {
        const isActive = activeTopic === topic;
        const label = topic === 'All' ? 'All' : TOPIC_LABELS[topic];

        return (
          <button
            key={topic}
            type="button"
            className={`topic-tab ${isActive ? 'active' : ''}`}
            onClick={() => onTopicChange(topic)}
            aria-pressed={isActive}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
