// Places list component

import { useLayoutEffect } from 'react';

interface PlacesListProps {
  places: string[];
  disabled: boolean;
  onRemove: (idx: number) => void;
  placesListRef: React.RefObject<HTMLDivElement | null>;
  placesEndRef: React.RefObject<HTMLSpanElement | null>;
}

export function PlacesList({
  places,
  disabled,
  onRemove,
  placesListRef,
  placesEndRef,
}: PlacesListProps) {
  // Auto-scroll to last place
  useLayoutEffect(() => {
    if (!placesListRef.current || !placesEndRef.current) return;
    const list = placesListRef.current;
    if (list.scrollHeight > list.clientHeight) {
      placesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [places, placesListRef, placesEndRef]);

  return (
    <div
      className="places-list"
      ref={placesListRef}
      style={{
        background: 'var(--color-surface)',
        color: 'var(--color-on-surface)',
        borderRadius: 8,
        boxShadow: '0 1px 4px #0001',
        maxWidth: '100%',
        width: '100%',
        margin: '0 auto 0.8em auto',
        padding: '0.4em 0.6em',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25em',
        maxHeight: '10em',
        overflowY: 'auto',
        boxSizing: 'border-box',
        border: '1px solid var(--color-accent)'
      }}
    >
      {places.map((place, idx) => (
        <span
          key={idx}
          ref={idx === places.length - 1 ? placesEndRef : undefined}
          tabIndex={-1}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.2em 0'
          }}
        >
          <span
            style={{
              flex: 1,
              color: 'var(--color-on-surface)',
              fontSize: '0.9em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {place}
          </span>
          <button
            aria-label={`Remove ${place}`}
            className="remove-btn"
            onClick={() => onRemove(idx)}
            disabled={disabled}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-accent)',
              cursor: 'pointer',
              fontSize: '1.2em',
              padding: '2px 4px',
              minWidth: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}
