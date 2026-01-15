// Input bar component for adding places

import type { CSSProperties } from 'react';

interface PlaceInputProps {
  input: string;
  disabled: boolean;
  onInputChange: (value: string) => void;
  onAddPlace: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

const buttonStyle: CSSProperties = {
  border: 'none',
  borderRadius: 6,
  padding: '0.4em 0.8em',
  fontWeight: 600,
  fontSize: '0.9em',
  boxShadow: '0 1px 4px #0001',
  cursor: 'pointer',
  transition: 'background 0.2s, opacity 0.2s',
  marginRight: 6,
};

export function PlaceInput({
  input,
  disabled,
  onInputChange,
  onAddPlace,
  onKeyDown,
  inputRef,
}: PlaceInputProps) {
  return (
    <div
      className="input-bar"
      style={{
        background: 'var(--color-surface)',
        borderRadius: 8,
        boxShadow: '0 1px 4px #0001',
        padding: '0.4em',
        maxWidth: '100%',
        width: '100%',
        margin: '0 auto 0.6em auto',
        display: 'flex',
        alignItems: 'center',
        color: 'var(--color-on-surface)',
        overflow: 'hidden',
        gap: '6px'
      }}
    >
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={e => onInputChange(e.target.value)}
        placeholder="Add a place..."
        disabled={disabled}
        autoComplete="off"
        style={{
          flex: 1,
          minWidth: 0,
          maxWidth: '100%',
          padding: '0.4em 0.6em',
          borderRadius: 6,
          border: '1px solid var(--color-accent)',
          background: 'var(--color-bg)',
          color: 'var(--color-on-bg)',
          fontSize: '0.95em',
          height: 36,
          boxSizing: 'border-box'
        }}
        onKeyDown={onKeyDown}
      />
      <button
        onClick={onAddPlace}
        disabled={disabled || !input.trim()}
        style={{
          ...buttonStyle,
          background: 'var(--color-accent)',
          color: 'var(--color-on-surface)',
          opacity: disabled || !input.trim() ? 0.6 : 1,
          cursor: disabled || !input.trim() ? 'not-allowed' : 'pointer',
          height: 36,
          marginRight: 0,
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
          padding: '0.4em 0.7em',
          fontSize: '0.9em',
        }}
      >
        Add
      </button>
    </div>
  );
}
