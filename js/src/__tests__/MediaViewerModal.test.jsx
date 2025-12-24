import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../features/studio/contexts/StudioContext', () => ({
  useStudioContext: () => ({
    aliasCatalog: [],
    aliasLoading: false,
    aliasError: null,
  }),
}));

import MediaViewerModal from '../features/gallery/components/MediaViewerModal';

describe('MediaViewerModal', () => {
  it('toggles metadata and closes on escape', async () => {
    const onClose = vi.fn();
    const media = {
      filename: 'test.png',
      subfolder: '',
      type: 'output',
      meta: {
        model: 'Model A',
        prompt: 'A prompt',
        loras: ['Lora One'],
      },
    };

    render(
      <MediaViewerModal
        isOpen
        media={media}
        onClose={onClose}
        total={1}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    expect(screen.queryByText('Model')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /metadata/i }));
    expect(screen.getByText('Model')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
