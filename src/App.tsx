import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import './App.css';

// Services
import { SoundService } from './services/SoundService';
import { VideoRecordingService } from './services/VideoRecordingService';

// Hooks
import { useTheme } from './hooks/useTheme';
import { useGeocoding, useGeocodedCoordinates, useSuggestions } from './hooks/useGeocoding';
import { useMapAnimation, useStaticMarkers } from './hooks/useMapAnimation';

// Components
import { AnimationControls } from './components/AnimationControls';
import { PlaceInput } from './components/PlaceInput';
import { SuggestionsList } from './components/SuggestionsList';
import { PlacesList } from './components/PlacesList';

// Utils
import { calculateTotalDistance, estimateTravelTime } from './utils/distance';
import { themes, getDefaultThemeIdx } from './utils/themes';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';
if (!mapboxgl.accessToken) {
  console.error('Mapbox access token is missing. Please set VITE_MAPBOX_TOKEN in your .env file.');
}

function App() {
  // Refs
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const placesEndRef = useRef<HTMLSpanElement | null>(null);
  const placesListRef = useRef<HTMLDivElement | null>(null);
  
  // Services
  const [soundService] = useState(() => new SoundService());
  const [videoService] = useState(() => new VideoRecordingService());
  const geocodingService = useGeocoding(mapboxgl.accessToken || undefined);

  // State
  const [places, setPlaces] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [highlightedIdx, setHighlightedIdx] = useState<number>(-1);
  const [themeIdx, setThemeIdx] = useState(getDefaultThemeIdx());
  const [animationRequested, setAnimationRequested] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [animationPaused, setAnimationPaused] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [currentSegment, setCurrentSegment] = useState(0);
  const [isRecording, setIsRecording] = useState(false);

  // Computed values
  const { coords } = useGeocodedCoordinates(places, geocodingService);
  const suggestions = useSuggestions(input, geocodingService);
  const totalDistance = calculateTotalDistance(coords);
  const estimatedTime = estimateTravelTime(totalDistance);

  // Apply theme
  useTheme(themes[themeIdx], themeIdx);

  // Update sound service
  useEffect(() => {
    soundService.setEnabled(soundEnabled);
  }, [soundEnabled, soundService]);

  // Initialize map
  useEffect(() => {
    if (mapContainer.current && !mapRef.current) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { longitude, latitude } = pos.coords;
          mapRef.current = new mapboxgl.Map({
            container: mapContainer.current!,
            style: 'mapbox://styles/mapbox/streets-v11',
            center: [longitude, latitude],
            zoom: 8,
            antialias: true,
          });
          mapRef.current.on('style.load', () => {
            mapRef.current?.resize();
          });
        },
        () => {
          mapRef.current = new mapboxgl.Map({
            container: mapContainer.current!,
            style: 'mapbox://styles/mapbox/streets-v11',
            center: [120, 23],
            zoom: 4,
            antialias: true,
          });
          mapRef.current.on('style.load', () => {
            mapRef.current?.resize();
          });
        }
      );
    }
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Use animation hook
  useMapAnimation(
    mapRef.current,
    coords,
    animationRequested,
    {
      speed: animationSpeed,
      isPaused: animationPaused,
      onSegmentComplete: (segment) => setCurrentSegment(segment),
      onComplete: () => {
        setAnimating(false);
        setAnimationRequested(false);
      },
    },
    soundService
  );

  // Use static markers when not animating
  useStaticMarkers(mapRef.current, coords, animating || animationRequested);

  // Update animating state when animation is requested
  useEffect(() => {
    if (animationRequested) {
      setAnimating(true);
      setCurrentSegment(0);
    }
  }, [animationRequested]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handlers
  const handleAddPlace = () => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    const match = suggestions.find(s => s.place_name === trimmedInput);
    if (match) {
      setPlaces([...places, match.place_name]);
      setInput('');
      setTimeout(() => inputRef.current?.focus(), 0);
      return;
    }

    if (!mapboxgl.accessToken || suggestions.length === 0) {
      setPlaces([...places, trimmedInput]);
      setInput('');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const handleSuggestionClick = (placeName: string) => {
    setPlaces([...places, placeName]);
    setInput('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIdx(idx => Math.min(idx + 1, suggestions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIdx(idx => Math.max(idx - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const idxToUse = highlightedIdx === -1 ? 0 : highlightedIdx;
        if (idxToUse >= 0 && idxToUse < suggestions.length) {
          handleSuggestionClick(suggestions[idxToUse].place_name);
        }
      }
    } else if (e.key === 'Enter') {
      handleAddPlace();
    }
  };

  const handleStartRecording = async () => {
    if (!mapRef.current) return;
    try {
      await videoService.startRecording(mapRef.current);
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Failed to start recording. Please try again.');
    }
  };

  const handleStopRecording = async () => {
    try {
      const blob = await videoService.stopRecording();
      videoService.downloadVideo(blob);
      setIsRecording(false);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      alert('Failed to stop recording. Please try again.');
    }
  };

  return (
    <div
      className="app-container"
      style={{
        background: 'var(--color-bg)',
        backgroundImage: 'var(--bg-texture)',
        backgroundSize: '340px 340px',
        backgroundBlendMode: 'soft-light',
        color: 'var(--color-on-bg)',
        padding: '0 12px',
        minHeight: '100vh',
        boxSizing: 'border-box'
      }}
    >
      {/* Theme Selector */}
      <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}>
        <select
          aria-label="Select theme"
          value={themeIdx}
          onChange={e => {
            setThemeIdx(Number(e.target.value));
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          style={{
            padding: '0.25em 1em 0.25em 0.6em',
            borderRadius: 6,
            border: '1px solid var(--color-accent)',
            background: 'var(--color-surface)',
            color: 'var(--color-on-surface)',
            fontWeight: 500,
            fontSize: '0.9em'
          }}
        >
          {themes.map((t, i) => (
            <option value={i} key={t.name}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* Title */}
      <h1
        style={{
          color: 'var(--color-primary)',
          fontWeight: 700,
          fontSize: 'clamp(1.5rem, 5vw, 2.1rem)',
          margin: '0.4em 0 0.3em 0',
          letterSpacing: '0.01em',
          textAlign: 'center'
        }}
      >
        Travel Marks
      </h1>

      {/* Mapbox Token Warning */}
      {!mapboxgl.accessToken && (
        <div
          style={{
            background: 'var(--color-accent)',
            color: 'var(--color-on-surface)',
            padding: '0.3em 0.6em',
            borderRadius: 6,
            fontSize: '0.85em',
            margin: '0 auto 0.5em auto',
            maxWidth: '100%',
            textAlign: 'center'
          }}
        >
          ⚠️ Mapbox token missing. Add VITE_MAPBOX_TOKEN to .env file for suggestions.
        </div>
      )}

      {/* Animation Controls */}
      <AnimationControls
        coords={coords}
        totalDistance={totalDistance}
        estimatedTime={estimatedTime}
        currentSegment={currentSegment}
        animating={animating}
        animationSpeed={animationSpeed}
        animationPaused={animationPaused}
        soundEnabled={soundEnabled}
        isRecording={isRecording}
        onSpeedChange={setAnimationSpeed}
        onPauseToggle={() => setAnimationPaused(!animationPaused)}
        onStartAnimation={() => setAnimationRequested(true)}
        onSoundToggle={() => setSoundEnabled(!soundEnabled)}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
      />

      {/* Place Input */}
      <PlaceInput
        input={input}
        disabled={animating}
        onInputChange={(value) => {
          setInput(value);
          setHighlightedIdx(-1);
        }}
        onAddPlace={handleAddPlace}
        onKeyDown={handleKeyDown}
        inputRef={inputRef}
      />

      {/* Suggestions List */}
      <SuggestionsList
        suggestions={suggestions}
        highlightedIdx={highlightedIdx}
        onSelect={handleSuggestionClick}
        onHighlight={setHighlightedIdx}
      />

      {/* Places List */}
      <PlacesList
        places={places}
        disabled={animating}
        onRemove={(idx) => setPlaces(places.filter((_, i) => i !== idx))}
        placesListRef={placesListRef}
        placesEndRef={placesEndRef}
      />

      {/* Map Container */}
      <div
        ref={mapContainer}
        className="map-container"
        style={{
          width: '100%',
          height: 'calc(100vh - 420px)',
          minHeight: '300px',
          margin: '0 auto',
          borderRadius: 12,
          boxShadow: '0 2px 12px #0002',
          border: '1px solid var(--color-accent)',
          maxWidth: '100%',
          boxSizing: 'border-box'
        }}
      />
    </div>
  );
}

export default App;
