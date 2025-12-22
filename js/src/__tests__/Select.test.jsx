import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Select from '../ui/primitives/Select';

describe('Select', () => {
  it('calls onChange with the selected value', () => {
    const handleChange = vi.fn();
    render(
      <Select
        value=""
        onChange={handleChange}
        options={['One', 'Two']}
        placeholder="Pick one"
      />
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Two' } });
    expect(handleChange).toHaveBeenCalledWith('Two');
  });

  it('filters options when searchable', () => {
    render(
      <Select
        value=""
        options={[
          { value: 'alpha', label: 'Alpha' },
          { value: 'beta', label: 'Beta' },
        ]}
        searchable
        emptyLabel="No matches"
      />
    );

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzz' } });
    expect(screen.getByText('No matches')).toBeInTheDocument();
  });
});
