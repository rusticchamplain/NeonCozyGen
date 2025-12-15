// js/src/pages/LoraLibrary.jsx
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import LoraTarotCard from '../components/lora/LoraTarotCard';
import LoraCardEditor from '../components/lora/LoraCardEditor';
import {
  deleteLoraCard,
  listLoraLibrary,
  saveLoraCard,
} from '../api';

function slugify(value) {
  return (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'section';
}

function cardMatchesFilters(card, query, activeTags) {
  const normalizedQuery = query.trim().toLowerCase();
  const hasTagFilters = activeTags.length > 0;
  const haystack = [];

  const push = (val) => {
    if (val) haystack.push(String(val));
  };

  push(card.name);
  push(card.description);
  push(card.modelName);
  push(card.recommendedWeight);
  push(card.folder);
  (card.keywords || []).forEach(push);
  (card.tags || []).forEach(push);
  (card.promptExamples || []).forEach((prompt) => {
    push(prompt.title);
    push(prompt.text);
    push(prompt.negative);
    push(prompt.weightTip);
  });
  if (card.files) {
    push(card.files.high);
    push(card.files.low);
    (card.files.others || []).forEach(push);
  }

  const matchesQuery =
    !normalizedQuery ||
    haystack.some((value) =>
      value.toLowerCase().includes(normalizedQuery)
    );

  const matchesTags =
    !hasTagFilters ||
    activeTags.every((tag) => (card.tags || []).includes(tag));

  return matchesQuery && matchesTags;
}

function groupByCategory(cards) {
  const map = new Map();
  cards.forEach((card) => {
    const title = card.category?.trim() || 'LoRA Library';
    if (!map.has(title)) {
      map.set(title, []);
    }
    map.get(title).push(card);
  });
  return Array.from(map.entries()).map(([title, entries]) => ({
    id: `${slugify(title)}-${entries.length}`,
    title,
    cards: entries,
  }));
}

export default function LoraLibrary() {
  const [cards, setCards] = useState([]);
  const [meta, setMeta] = useState({ draftCount: 0, missingCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [activeTags, setActiveTags] = useState([]);
  const [editorCard, setEditorCard] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchCards = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listLoraLibrary();
      setCards(Array.isArray(data?.items) ? data.items : []);
      setMeta({
        draftCount: data?.draftCount || 0,
        missingCount: data?.missingCount || 0,
      });
    } catch (err) {
      setError(err.message || 'Failed to load LoRA library.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const availableTags = useMemo(() => {
    const set = new Set();
    cards.forEach((card) => {
      (card.tags || []).forEach((tag) => tag && set.add(tag));
    });
    return Array.from(set).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
  }, [cards]);

  const filteredCards = useMemo(
    () =>
      cards.filter((card) =>
        cardMatchesFilters(card, search, activeTags)
      ),
    [cards, search, activeTags]
  );

  const drafts = filteredCards.filter(
    (card) => card.status === 'detected'
  );
  const missingCards = filteredCards.filter(
    (card) => card.status === 'missing'
  );
  const configuredCards = filteredCards.filter(
    (card) => card.status !== 'detected' && card.status !== 'missing'
  );
  const configuredSections = useMemo(
    () => groupByCategory(configuredCards),
    [configuredCards]
  );

  const visibleCount = filteredCards.length;

  const toggleTag = (tag) => {
    setActiveTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : [...prev, tag]
    );
  };

  const startEditing = (card) => {
    setEditorCard(card);
    setStatus('');
    setError('');
  };

  const handleSave = async (payload) => {
    if (!editorCard) return;
    setSaving(true);
    setError('');
    try {
      await saveLoraCard(editorCard.id, payload);
      setStatus(`Saved ${payload.name || editorCard.id}`);
      setEditorCard(null);
      await fetchCards();
    } catch (err) {
      setError(err.message || 'Failed to save LoRA card.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editorCard) return;
    if (
      typeof window !== 'undefined' &&
      !window.confirm('Remove saved details for this card?')
    ) {
      return;
    }
    setSaving(true);
    setError('');
    try {
      await deleteLoraCard(editorCard.id);
      setStatus('Card reset to detected state.');
      setEditorCard(null);
      await fetchCards();
    } catch (err) {
      setError(err.message || 'Failed to reset card.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="ui-panel lora-library-hero">
        <div className="space-y-3">
          <span className="ui-kicker">LoRA Library</span>
          <h1 className="text-2xl font-semibold tracking-wide">
            Tarot board for your LoRAs
          </h1>
          {status && (
            <p className="text-xs text-[#3EF0FF] uppercase tracking-[0.3em]">
              {status}
            </p>
          )}
          {error && (
            <p className="text-xs text-[#FF9DBB] uppercase tracking-[0.3em]">
              {error}
            </p>
          )}
        </div>

        <div className="lora-library-controls space-y-3">
          <label htmlFor="lora-library-search" className="sr-only">
            Search LoRAs
          </label>
          <input
            id="lora-library-search"
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="lora-library-search"
            placeholder="Search LoRAs..."
          />
          {availableTags.length > 0 && (
            <div className="lora-library-tags">
              {availableTags.map((tag) => {
                const active = activeTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={[
                      'lora-tag-chip',
                      active ? 'is-active' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {tag}
                  </button>
                );
              })}
              {activeTags.length > 0 && (
                <button
                  type="button"
                  className="lora-tag-chip is-muted"
                  onClick={() => setActiveTags([])}
                >
                  Clear
                </button>
              )}
            </div>
          )}
          <div className="lora-library-meta">
            <span>
              Showing {visibleCount} of {cards.length} cards
            </span>
            <span>
              Drafts {meta.draftCount} · Missing {meta.missingCount}
            </span>
            <button
              type="button"
              className="ui-button is-compact is-muted"
              onClick={fetchCards}
              disabled={loading}
            >
              Refresh
            </button>
          </div>
        </div>
      </section>

      {editorCard && (
        <LoraCardEditor
          card={editorCard}
          saving={saving}
          onCancel={() => setEditorCard(null)}
          onSave={handleSave}
          onDelete={
            editorCard.status !== 'detected' ? handleDelete : undefined
          }
        />
      )}

      {loading ? (
        <section className="ui-panel text-center py-16">
          <p className="text-base text-slate-200/80">Loading library…</p>
        </section>
      ) : (
        <>
          {drafts.length > 0 && (
            <section className="space-y-4">
              <header className="ui-section-head">
                <div className="ui-section-text">
                  <span className="ui-kicker">Auto-detected</span>
                  <h2 className="text-xl font-semibold">
                    LoRAs that need details
                  </h2>
                </div>
              </header>
              <div className="lora-card-grid">
                {drafts.map((card) => (
                  <LoraTarotCard
                    key={card.id}
                    {...card}
                    sectionTitle="Detected"
                    onEdit={() => startEditing(card)}
                  />
                ))}
              </div>
            </section>
          )}

          {configuredSections.length === 0 &&
          drafts.length === 0 &&
          missingCards.length === 0 ? (
            <section className="ui-panel text-center py-16">
              <p className="text-base text-slate-200/80">
                No cards match your filters yet. Try refreshing or clear the
                search above.
              </p>
            </section>
          ) : (
            configuredSections.map((section) => (
              <section key={section.id} className="space-y-4">
                <header className="ui-section-head">
                  <div className="ui-section-text">
                    <span className="ui-kicker">Collection</span>
                    <h2 className="text-xl font-semibold">
                      {section.title}
                    </h2>
                  </div>
                </header>
                <div className="lora-card-grid">
                  {section.cards.map((card) => (
                    <LoraTarotCard
                      key={card.id}
                      {...card}
                      sectionTitle={section.title}
                      onEdit={() => startEditing(card)}
                    />
                  ))}
                </div>
              </section>
            ))
          )}

          {missingCards.length > 0 && (
            <section className="space-y-4">
              <header className="ui-section-head">
                <div className="ui-section-text">
                  <span className="ui-kicker">Needs attention</span>
                  <h2 className="text-xl font-semibold">
                    Cards referencing missing files
                  </h2>
                </div>
              </header>
              <div className="lora-card-grid">
                {missingCards.map((card) => (
                  <LoraTarotCard
                    key={card.id}
                    {...card}
                    sectionTitle="Missing"
                    onEdit={() => startEditing(card)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
