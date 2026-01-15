// Animation controls component

import type { CSSProperties } from 'react';

interface AnimationControlsProps {
  coords: [number, number][];
  totalDistance: number;
  estimatedTime: number;
  currentSegment: number;
  animating: boolean;
  animationSpeed: number;
  animationPaused: boolean;
  soundEnabled: boolean;
  isRecording: boolean;
  onSpeedChange: (speed: number) => void;
  onPauseToggle: () => void;
  onStartAnimation: () => void;
  onSoundToggle: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
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

export function AnimationControls({
  coords,
  totalDistance,
  estimatedTime,
  currentSegment,
  animating,
  animationSpeed,
  animationPaused,
  soundEnabled,
  isRecording,
  onSpeedChange,
  onPauseToggle,
  onStartAnimation,
  onSoundToggle,
  onStartRecording,
  onStopRecording,
}: AnimationControlsProps) {
  if (coords.length < 2) return null;

  return (
    <div style={{
      background: 'var(--color-surface)',
      borderRadius: 8,
      boxShadow: '0 1px 4px #0001',
      padding: '0.5em',
      margin: '0 auto 0.6em auto',
      maxWidth: '100%',
      border: '1px solid var(--color-accent)',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.4em'
    }}>
      {/* Trip Info */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.85em',
        color: 'var(--color-on-surface)'
      }}>
        <span>📏 {totalDistance.toFixed(1)} km</span>
        <span>⏱️ {(estimatedTime * 60).toFixed(0)} min</span>
        {animating && <span>📍 Stop {currentSegment}/{coords.length - 1}</span>}
      </div>

      {/* Animation Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.4em',
        flexWrap: 'wrap'
      }}>
        {/* Speed Control */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3em', flex: 1, minWidth: '120px' }}>
          <span style={{ fontSize: '0.8em', color: 'var(--color-on-surface)', whiteSpace: 'nowrap' }}>Speed:</span>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.5"
            value={animationSpeed}
            onChange={e => onSpeedChange(Number(e.target.value))}
            disabled={animating}
            style={{
              flex: 1,
              height: '4px',
              background: 'var(--color-accent)',
              borderRadius: '2px',
              outline: 'none',
              cursor: animating ? 'not-allowed' : 'pointer'
            }}
            aria-label="Animation speed"
          />
          <span style={{ fontSize: '0.8em', color: 'var(--color-accent)', minWidth: '24px' }}>
            {animationSpeed === 0.5 ? '🐌' : animationSpeed === 1 ? '🚶' : animationSpeed === 1.5 ? '🚗' : animationSpeed === 2 ? '🏃' : '🚀'}
          </span>
        </div>

        {/* Control Buttons */}
        <div style={{ display: 'flex', gap: '0.3em' }}>
          {/* Play/Pause Button */}
          {animating && (
            <button
              onClick={onPauseToggle}
              style={{
                ...buttonStyle,
                background: 'var(--color-accent)',
                color: 'var(--color-on-surface)',
                height: 32,
                padding: '0.3em 0.6em',
                fontSize: '0.8em',
                marginRight: 0,
              }}
              title={animationPaused ? 'Resume' : 'Pause'}
            >
              {animationPaused ? '▶️' : '⏸️'}
            </button>
          )}

          {/* Start Animation Button */}
          <button
            onClick={onStartAnimation}
            disabled={animating || coords.length < 2}
            style={{
              ...buttonStyle,
              background: 'var(--color-accent)',
              color: 'var(--color-on-surface)',
              opacity: animating || coords.length < 2 ? 0.6 : 1,
              cursor: animating || coords.length < 2 ? 'not-allowed' : 'pointer',
              height: 32,
              padding: '0.3em 0.6em',
              fontSize: '0.8em',
              marginRight: 0,
            }}
            title="Start Animation"
          >
            {animating ? '🎬' : '🎬 Start'}
          </button>

          {/* Recording Button */}
          <button
            onClick={isRecording ? onStopRecording : onStartRecording}
            disabled={coords.length < 2}
            style={{
              ...buttonStyle,
              background: isRecording ? '#ef4444' : 'var(--color-surface)',
              color: 'var(--color-on-surface)',
              height: 32,
              padding: '0.3em 0.6em',
              fontSize: '0.8em',
              marginRight: 0,
              border: '1px solid var(--color-accent)',
              opacity: coords.length < 2 ? 0.6 : 1,
              cursor: coords.length < 2 ? 'not-allowed' : 'pointer',
            }}
            title={isRecording ? 'Stop Recording' : 'Record Video'}
          >
            {isRecording ? '⏹️' : '📹'}
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onSoundToggle}
            style={{
              ...buttonStyle,
              background: soundEnabled ? 'var(--color-accent)' : 'var(--color-surface)',
              color: 'var(--color-on-surface)',
              height: 32,
              padding: '0.3em 0.6em',
              fontSize: '0.8em',
              marginRight: 0,
              border: '1px solid var(--color-accent)',
            }}
            title={soundEnabled ? 'Sound On' : 'Sound Off'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>
      </div>
    </div>
  );
}
