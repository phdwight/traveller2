// Suggestions list component

interface SuggestionsListProps {
  suggestions: Array<{ id: string; place_name: string }>;
  highlightedIdx: number;
  onSelect: (placeName: string) => void;
  onHighlight: (idx: number) => void;
}

export function SuggestionsList({
  suggestions,
  highlightedIdx,
  onSelect,
  onHighlight,
}: SuggestionsListProps) {
  if (suggestions.length === 0) return null;

  return (
    <ul
      className="suggestions-list"
      style={{
        background: 'var(--color-surface)',
        color: 'var(--color-on-surface)',
        borderRadius: 8,
        boxShadow: '0 2px 8px #0002',
        maxWidth: '100%',
        margin: '0 auto 0.5em auto',
        padding: 0,
        listStyle: 'none',
        position: 'relative',
        zIndex: 5
      }}
    >
      {suggestions.map((s, idx) => (
        <li
          key={s.id || idx}
          onClick={() => onSelect(s.place_name)}
          style={{
            background: highlightedIdx === idx ? 'var(--color-accent)' : 'transparent',
            color: highlightedIdx === idx ? 'var(--color-bg)' : 'var(--color-on-surface)',
            padding: '0.4em 0.7em',
            cursor: 'pointer',
            borderRadius: 6,
            fontWeight: highlightedIdx === idx ? 600 : 400,
            fontSize: '0.9em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={() => onHighlight(idx)}
        >
          {s.place_name}
        </li>
      ))}
    </ul>
  );
}
