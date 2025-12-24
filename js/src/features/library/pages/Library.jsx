import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import SegmentedTabs from '../../../ui/primitives/SegmentedTabs';
import TagLibrary from '../../tags/pages/TagLibrary';
import Aliases from '../../aliases/pages/Aliases';

const TAB_STORAGE_KEY = 'cozygen_library_tab';
const TAB_KEYS = new Set(['tags', 'aliases']);

const normalizeTab = (value) => (TAB_KEYS.has(value) ? value : '');

const readStoredTab = () => {
  if (typeof window === 'undefined') return '';
  try {
    return normalizeTab(window.localStorage.getItem(TAB_STORAGE_KEY) || '');
  } catch {
    return '';
  }
};

export default function Library() {
  const [searchParams, setSearchParams] = useSearchParams();
  const paramTab = normalizeTab(searchParams.get('tab'));

  const [activeTab, setActiveTab] = useState(() => {
    const stored = readStoredTab();
    return paramTab || stored || 'tags';
  });

  const tabItems = useMemo(
    () => [
      { key: 'tags', label: 'Tags' },
      { key: 'aliases', label: 'Aliases' },
    ],
    []
  );

  useEffect(() => {
    if (paramTab && paramTab !== activeTab) {
      setActiveTab(paramTab);
    }
  }, [activeTab, paramTab]);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(TAB_STORAGE_KEY, activeTab);
      }
    } catch {
      // ignore storage failures
    }

    if (paramTab !== activeTab) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('tab', activeTab);
      setSearchParams(nextParams, { replace: true });
    }
  }, [activeTab, paramTab, searchParams, setSearchParams]);

  return (
    <div className="page-shell page-stack">
      <div className="page-bar">
        <h1 className="page-bar-title">Library</h1>
        <div className="page-bar-actions">
          <SegmentedTabs
            ariaLabel="Library tabs"
            value={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            size="sm"
            layout="auto"
          />
        </div>
      </div>

      {activeTab === 'tags' ? (
        <TagLibrary inline />
      ) : null}

      {activeTab === 'aliases' ? (
        <Aliases inline />
      ) : null}
    </div>
  );
}
