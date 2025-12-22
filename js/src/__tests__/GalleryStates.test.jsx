import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Gallery from '../features/gallery/pages/Gallery';
import { useGallery } from '../features/gallery/hooks/useGallery';
import { useMediaViewer } from '../features/gallery/hooks/useMediaViewer';

vi.mock('../features/gallery/hooks/useGallery', () => ({
  useGallery: vi.fn(),
}));

vi.mock('../features/gallery/hooks/useMediaViewer', () => ({
  useMediaViewer: vi.fn(),
}));

const buildGalleryState = (overrides = {}) => ({
  path: '',
  items: [],
  loading: false,
  hasLoaded: true,
  error: '',
  page: 1,
  totalPages: 1,
  perPage: 30,
  kind: 'all',
  showHidden: false,
  recursive: false,
  query: '',
  crumbs: [],
  dirChips: [],
  filtered: [],
  mediaItems: [],
  setPage: vi.fn(),
  setPerPage: vi.fn(),
  setShowHidden: vi.fn(),
  setQuery: vi.fn(),
  setKind: vi.fn(),
  setRecursive: vi.fn(),
  goBack: vi.fn(),
  goRoot: vi.fn(),
  goToPath: vi.fn(),
  selectDir: vi.fn(),
  refresh: vi.fn(),
  ...overrides,
});

const baseViewerState = {
  viewerOpen: false,
  currentMedia: null,
  total: 0,
  canPrev: false,
  canNext: false,
  open: vi.fn(),
  close: vi.fn(),
  next: vi.fn(),
  prev: vi.fn(),
};

describe('Gallery states', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });
    useMediaViewer.mockReturnValue(baseViewerState);
  });

  it('shows an error state when loading fails', () => {
    useGallery.mockReturnValue(
      buildGalleryState({ error: 'Unable to load gallery right now.' })
    );

    render(<Gallery />);

    expect(screen.getByText('Gallery unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('shows skeletons during initial load', () => {
    useGallery.mockReturnValue(
      buildGalleryState({ loading: true, hasLoaded: false })
    );

    const { container } = render(<Gallery />);
    expect(container.querySelectorAll('.gallery-skeleton-item').length).toBeGreaterThan(0);
  });
});
