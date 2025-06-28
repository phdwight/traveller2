import { useRef, useEffect, useState, useLayoutEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import './App.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';
if (!mapboxgl.accessToken) {
  // eslint-disable-next-line no-console
  console.error('Mapbox access token is missing. Please set VITE_MAPBOX_TOKEN in your .env file.');
}

const themes = [
  {
    name: 'Sunset Coast',
    colors: {
      '--color-bg': '#F79B72',
      '--color-surface': '#2A4759',
      '--color-primary': '#2A4759', // Dark for contrast
      '--color-accent': '#F3C623',
      '--color-on-surface': '#F3F3F3',
      '--color-on-bg': '#2A4759',
    },
  },
  {
    name: 'Citrus Sky',
    colors: {
      '--color-bg': '#F4F6FF',
      '--color-surface': '#F3C623',
      '--color-primary': '#10375C', // Dark for contrast
      '--color-accent': '#EB8317',
      '--color-on-surface': '#10375C',
      '--color-on-bg': '#10375C',
    },
  },
  {
    name: 'Vivid Night',
    colors: {
      '--color-bg': '#2A004E',
      '--color-surface': '#500073',
      '--color-primary': '#C62300',
      '--color-accent': '#F14A00',
      '--color-on-surface': '#FFF',
      '--color-on-bg': '#FFF',
    },
  },
  {
    name: 'Golden Sunrise',
    colors: {
      '--color-bg': '#FFF085',
      '--color-surface': '#FCB454',
      '--color-primary': '#FF9B17',
      '--color-accent': '#F16767',
      '--color-on-surface': '#10375C',
      '--color-on-bg': '#10375C',
    },
  },
  {
    name: 'Fresh Grove',
    colors: {
      '--color-bg': '#DDEB9D',
      '--color-surface': '#A0C878',
      '--color-primary': '#143D60',
      '--color-accent': '#EB5B00',
      '--color-on-surface': '#143D60',
      '--color-on-bg': '#143D60',
    },
  },
  {
    name: 'Spring Picnic',
    colors: {
      '--color-bg': '#C7DB9C',
      '--color-surface': '#FFF0BD',
      '--color-primary': '#E50046',
      '--color-accent': '#FDAB9E',
      '--color-on-surface': '#E50046',
      '--color-on-bg': '#143D60',
    },
  },
];

const getDefaultThemeIdx = () => {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const mins = h * 60 + m;
  // 5:01am = 301, 9:00am = 540, 9:01am = 541, 17:00 = 1020, 17:01 = 1021, 19:00 = 1140
  if (mins >= 301 && mins <= 540) return themes.findIndex(t => t.name === 'Golden Sunrise');
  if (mins >= 541 && mins <= 1020) return themes.findIndex(t => t.name === 'Citrus Sky');
  if (mins >= 1021 && mins <= 1140) return themes.findIndex(t => t.name === 'Sunset Coast');
  return themes.findIndex(t => t.name === 'Vivid Night');
};

function App() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const placesEndRef = useRef<HTMLSpanElement | null>(null);
  const placesListRef = useRef<HTMLDivElement | null>(null);
  const [places, setPlaces] = useState<string[]>([]); // Start with empty places
  const [input, setInput] = useState('');
  const [coords, setCoords] = useState<[number, number][]>([]);
  const [animating, setAnimating] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [markers, setMarkers] = useState<mapboxgl.Marker[]>([]);
  const [highlightedIdx, setHighlightedIdx] = useState<number>(-1);
  const [themeIdx, setThemeIdx] = useState(getDefaultThemeIdx());
  const [animationRequested, setAnimationRequested] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1); // 0.5 = slow, 1 = normal, 2 = fast
  const [animationPaused, setAnimationPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [totalDistance, setTotalDistance] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [currentSegment, setCurrentSegment] = useState(0);
  const animationStateRef = useRef<{
    isPaused: boolean;
    currentFrame: number | null;
  }>({ isPaused: false, currentFrame: null });

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (coord1: [number, number], coord2: [number, number]): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (coord2[1] - coord1[1]) * Math.PI / 180;
    const dLon = (coord2[0] - coord1[0]) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(coord1[1] * Math.PI / 180) * Math.cos(coord2[1] * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Play sound effect
  const playSound = (type: 'start' | 'segment' | 'complete') => {
    if (!soundEnabled) return;
    
    // Create audio context and generate simple tones
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Different frequencies for different events
    const frequencies = {
      start: 440,    // A note
      segment: 523,  // C note
      complete: 659  // E note
    };
    
    oscillator.frequency.setValueAtTime(frequencies[type], audioContext.currentTime);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  };

  // Geocode places to coordinates and calculate total distance
  useEffect(() => {
    async function fetchCoords() {
      const results: [number, number][] = [];
      for (const place of places) {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(place)}.json?access_token=${mapboxgl.accessToken}`
        );
        const data = await res.json();
        if (data.features && data.features[0]) {
          results.push(data.features[0].center);
        }
      }
      setCoords(results);
      
      // Calculate total distance and estimated time
      if (results.length > 1) {
        let totalDist = 0;
        for (let i = 0; i < results.length - 1; i++) {
          totalDist += calculateDistance(results[i], results[i + 1]);
        }
        setTotalDistance(totalDist);
        // Estimate travel time (assuming 60 km/h average speed)
        setEstimatedTime(totalDist / 60);
      } else {
        setTotalDistance(0);
        setEstimatedTime(0);
      }
    }
    fetchCoords();
  }, [places]);

  // Fetch suggestions as user types
  useEffect(() => {
    if (!input.trim()) {
      setSuggestions([]);
      return;
    }
    
    if (!mapboxgl.accessToken) {
      console.warn('Mapbox token is missing. Suggestions will not work.');
      setSuggestions([]);
      return;
    }
    
    let ignore = false;
    const fetchSuggestions = async () => {
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(input)}.json?autocomplete=true&access_token=${mapboxgl.accessToken}`
        );
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        console.log('Mapbox API response:', data); // Debug log
        
        if (!ignore) {
          setSuggestions(data.features || []);
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        if (!ignore) {
          setSuggestions([]);
        }
      }
    };
    
    // Debounce the API calls
    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => { 
      ignore = true; 
      clearTimeout(timeoutId);
    };
  }, [input]);

  // Initialize map
  useEffect(() => {
    if (mapContainer.current && !mapRef.current) {
      // Try to get user location
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
          // If denied or unavailable, center in Asia
          mapRef.current = new mapboxgl.Map({
            container: mapContainer.current!,
            style: 'mapbox://styles/mapbox/streets-v11',
            center: [120, 23], // Centered in Asia (Taiwan region)
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

  // Animate path
  useEffect(() => {
    if (!mapRef.current || coords.length < 2) return;
    const map = mapRef.current;
    map.on('load', () => {
      if (map.getSource('route')) map.removeLayer('route');
      if (map.getLayer('route')) map.removeSource('route');
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: coords,
          },
          properties: {}, // Fix: add empty properties object
        },
      });
      map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#3b82f6', 'line-width': 4 },
      });
      // Animate marker
      let i = 0;
      const marker = new mapboxgl.Marker().setLngLat(coords[0]).addTo(map);
      setAnimating(true);
      function animate() {
        if (i < coords.length - 1) {
          const [start, end] = [coords[i], coords[i + 1]];
          let t = 0;
          function step() {
            t += 0.02;
            if (t > 1) {
              i++;
              marker.setLngLat(end);
              if (i < coords.length - 1) {
                t = 0;
                requestAnimationFrame(step);
              } else {
                setAnimating(false);
              }
              return;
            }
            const lng = start[0] + (end[0] - start[0]) * t;
            const lat = start[1] + (end[1] - start[1]) * t;
            marker.setLngLat([lng, lat]);
            requestAnimationFrame(step);
          }
          step();
        }
      }
      animate();
    });
  }, [coords]);

  // Place marker and animate map to new place
  useEffect(() => {
    if (!mapRef.current || coords.length === 0) return;
    // Remove old markers
    markers.forEach(m => m.remove());
    const newMarkers: mapboxgl.Marker[] = coords.map((coord) => {
      const marker = new mapboxgl.Marker({ color: '#3b82f6' })
        .setLngLat(coord)
        .addTo(mapRef.current!);
      return marker;
    });
    setMarkers(newMarkers);
    // Animate map to last place
    const last = coords[coords.length - 1];
    mapRef.current.flyTo({ center: last, zoom: 10, speed: 1.2 });
  }, [coords]);

  const handleAddPlace = () => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;
    
    // If we have suggestions and the input matches one, use it
    const match = suggestions.find(s => s.place_name === trimmedInput);
    if (match) {
      setPlaces([...places, match.place_name]);
      setInput('');
      setSuggestions([]);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
      return;
    }
    
    // If no Mapbox token or no suggestions, allow manual entry
    if (!mapboxgl.accessToken || suggestions.length === 0) {
      setPlaces([...places, trimmedInput]);
      setInput('');
      setSuggestions([]);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
      return;
    }
  };

  const handleSuggestionClick = (place: string) => {
    setPlaces([...places, place]);
    setInput('');
    setSuggestions([]);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Apply theme colors and background texture to :root
  useEffect(() => {
    const root = document.documentElement;
    const theme = themes[themeIdx];
    Object.entries(theme.colors).forEach(([k, v]) => {
      root.style.setProperty(k, v);
    });
    // Subtle paper pulp texture using SVG + theme color
    const bgColor = theme.colors['--color-bg'];
    const accent = theme.colors['--color-accent'];
    // SVG: paper pulp effect with random speckles and fibers
    const svg = `
      <svg width='180' height='180' xmlns='http://www.w3.org/2000/svg'>
        <defs>
          <filter id='fibers' x='0' y='0'>
            <feTurbulence type='turbulence' baseFrequency='0.012' numOctaves='2' seed='${themeIdx + 7}'/>
            <feDisplacementMap in2='SourceGraphic' in='turb' scale='8' xChannelSelector='R' yChannelSelector='G'/>
          </filter>
          <filter id='speckle' x='0' y='0'>
            <feTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='3' seed='${themeIdx + 13}'/>
            <feColorMatrix type='matrix' values='0 0 0 0 0.7  0 0 0 0 0.7  0 0 0 0 0.7  0 0 0 0.13 0'/>
          </filter>
        </defs>
        <rect width='180' height='180' fill='${bgColor}'/>
        <rect width='180' height='180' filter='url(%23fibers)' fill='${accent}' fill-opacity='0.08'/>
        <rect width='180' height='180' filter='url(%23speckle)' fill='${accent}' fill-opacity='0.10'/>
      </svg>
    `;
    const encoded = `url('data:image/svg+xml;utf8,${encodeURIComponent(svg)}')`;
    root.style.setProperty('--bg-texture', encoded);
  }, [themeIdx]);

  // Enhanced animation with speed control and pause/resume
  useEffect(() => {
    if (!animationRequested || !mapRef.current || coords.length < 2) return;
    const map = mapRef.current;
    let animationFrame: number | null = null;
    let marker: mapboxgl.Marker | null = null;
    let routeLayerAdded = false;
    let routeSourceAdded = false;
    let cleanupDone = false;

    // Reset animation state
    setAnimationPaused(false);
    setCurrentSegment(0);
    animationStateRef.current = { isPaused: false, currentFrame: null };

    // Remove previous route and markers
    if (map.getLayer('route')) map.removeLayer('route');
    if (map.getSource('route')) map.removeSource('route');
    markers.forEach(m => m.remove());

    // Animated marker starts at the 1st place
    marker = new mapboxgl.Marker({ color: '#eab308' })
      .setLngLat(coords[0])
      .addTo(map);

    let progressCoords: [number, number][] = [coords[0]];
    let i = 0; // Start animating from the 1st place

    // Play start sound
    playSound('start');

    function cleanup() {
      if (cleanupDone) return;
      cleanupDone = true;
      if (animationFrame) cancelAnimationFrame(animationFrame);
      if (marker) marker.remove();
      if (routeLayerAdded && map.getLayer('route')) map.removeLayer('route');
      if (routeSourceAdded && map.getSource('route')) map.removeSource('route');
    }

    function animateSegment(start: [number, number], end: [number, number], onDone: () => void) {
      let t = 0;
      const baseDuration = 3500;
      const duration = baseDuration / animationSpeed; // Adjust duration based on speed
      const startTime = performance.now();
      
      function easeInOutCubic(x: number) {
        return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
      }
      
      function frame(now: number) {
        // Check if animation is paused
        if (animationStateRef.current.isPaused) {
          animationStateRef.current.currentFrame = requestAnimationFrame(frame);
          return;
        }
        
        t = Math.min((now - startTime) / duration, 1);
        const smoothT = easeInOutCubic(t);
        const lng = start[0] + (end[0] - start[0]) * smoothT;
        const lat = start[1] + (end[1] - start[1]) * smoothT;
        marker!.setLngLat([lng, lat]);
        (map.getSource('route') as mapboxgl.GeoJSONSource)?.setData({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [...progressCoords, [lng, lat]] },
          properties: {},
        });
        // Smooth zoom in at start, hold, then zoom out at end
        let zoom = 8;
        if (t < 0.18) {
          zoom = 8 + 2 * (t / 0.18); // 8 -> 10
        } else if (t > 0.82) {
          zoom = 10 - 2 * ((t - 0.82) / 0.18); // 10 -> 8
        } else {
          zoom = 10;
        }
        map.easeTo({ center: [lng, lat], zoom, duration: 100, essential: true });
        if (t < 1) {
          animationFrame = requestAnimationFrame(frame);
        } else {
          progressCoords.push(end);
          marker!.setLngLat(end);
          (map.getSource('route') as mapboxgl.GeoJSONSource)?.setData({
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: progressCoords },
            properties: {},
          });
          playSound('segment'); // Sound when reaching a destination
          onDone();
        }
      }
      animationFrame = requestAnimationFrame(frame);
    }
    
    function animateRoute() {
      if (i < coords.length - 1) {
        setCurrentSegment(i + 1);
        const start = coords[i];
        const end = coords[i + 1];
        animateSegment(start, end, () => {
          i++;
          if (i < coords.length - 1) {
            animateRoute();
          } else {
            setAnimating(false);
            setAnimationRequested(false);
            playSound('complete'); // Sound when animation completes
            showAllMarkersAndRoute();
          }
        });
      }
    }
    
    function showAllMarkersAndRoute() {
      if (marker) marker.remove();
      if (routeLayerAdded && map.getLayer('route')) map.removeLayer('route');
      if (routeSourceAdded && map.getSource('route')) map.removeSource('route');
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: coords },
          properties: {},
        },
      });
      map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#3b82f6',
          'line-width': 4,
          'line-dasharray': [2, 4], // Dashed line: 2px dash, 4px gap
        },
      });
      const newMarkers: mapboxgl.Marker[] = coords.map((coord) => {
        const m = new mapboxgl.Marker({ color: '#3b82f6' })
          .setLngLat(coord)
          .addTo(map);
        return m;
      });
      setMarkers(newMarkers);
      const bounds = coords.reduce((b, c) => b.extend(c), new mapboxgl.LngLatBounds(coords[0], coords[0]));
      map.fitBounds(bounds, { padding: 60, duration: 900 });
    }
    
    setAnimating(true);
    // Step 1: flyTo the starting point, then animate route after moveend
    map.flyTo({ center: coords[0], zoom: 10, speed: 1.2 });
    const onMoveEnd = () => {
      // Step 2: Add route source/layer and start animation
      if (map.getLayer('route')) map.removeLayer('route');
      if (map.getSource('route')) map.removeSource('route');
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: progressCoords },
          properties: {},
        },
      });
      routeSourceAdded = true;
      map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#3b82f6',
          'line-width': 4,
          'line-dasharray': [2, 3],
        },
      });
      routeLayerAdded = true;
      animateRoute();
      map.off('moveend', onMoveEnd);
    };
    map.on('moveend', onMoveEnd);
    return cleanup;
  }, [coords, animationRequested, animationSpeed]);

  // Handle pause/resume animation
  useEffect(() => {
    animationStateRef.current.isPaused = animationPaused;
  }, [animationPaused]);

  // Shared button style for Add and Start Animation
  const buttonStyle: React.CSSProperties = {
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

  // Scroll last place into view if list is scrollable (do not focus it)
  useLayoutEffect(() => {
    if (!placesListRef.current || !placesEndRef.current) return;
    const list = placesListRef.current;
    if (list.scrollHeight > list.clientHeight) {
      placesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [places]);

  return (
    <div className="app-container" style={{ background: 'var(--color-bg)', backgroundImage: 'var(--bg-texture)', backgroundSize: '340px 340px', backgroundBlendMode: 'soft-light', color: 'var(--color-on-bg)', padding: '0 12px', minHeight: '100vh', boxSizing: 'border-box' }}>
      <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}>
        <select
          aria-label="Select theme"
          value={themeIdx}
          onChange={e => {
            setThemeIdx(Number(e.target.value));
            setTimeout(() => {
              inputRef.current?.focus();
            }, 0);
          }}
          style={{ padding: '0.25em 1em 0.25em 0.6em', borderRadius: 6, border: '1px solid var(--color-accent)', background: 'var(--color-surface)', color: 'var(--color-on-surface)', fontWeight: 500, fontSize: '0.9em' }}
        >
          {themes.map((t, i) => (
            <option value={i} key={t.name} style={{ color: t.colors['--color-on-surface'] }}>{t.name}</option>
          ))}
        </select>
      </div>
      <h1 style={{ color: 'var(--color-primary)', fontWeight: 700, fontSize: 'clamp(1.5rem, 5vw, 2.1rem)', margin: '0.4em 0 0.3em 0', letterSpacing: '0.01em', textAlign: 'center' }}>
        Travel Marks
      </h1>
      {!mapboxgl.accessToken && (
        <div style={{ 
          background: 'var(--color-accent)', 
          color: 'var(--color-on-surface)', 
          padding: '0.3em 0.6em', 
          borderRadius: 6, 
          fontSize: '0.85em', 
          margin: '0 auto 0.5em auto', 
          maxWidth: '100%',
          textAlign: 'center'
        }}>
          ⚠️ Mapbox token missing. Add VITE_MAPBOX_TOKEN to .env file for suggestions.
        </div>
      )}
      {/* Enhanced Animation Controls */}
      {coords.length > 1 && (
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
                onChange={e => setAnimationSpeed(Number(e.target.value))}
                disabled={animating}
                style={{ 
                  flex: 1,
                  height: '4px',
                  background: 'var(--color-accent)',
                  borderRadius: '2px',
                  outline: 'none',
                  cursor: animating ? 'not-allowed' : 'pointer'
                }}
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
                  onClick={() => setAnimationPaused(!animationPaused)}
                  style={{
                    ...buttonStyle,
                    background: 'var(--color-accent)',
                    color: 'var(--color-on-surface)',
                    height: 32,
                    padding: '0.3em 0.6em',
                    fontSize: '0.8em',
                    marginRight: 0,
                  }}
                >
                  {animationPaused ? '▶️' : '⏸️'}
                </button>
              )}
              
              {/* Start Animation Button */}
              <button
                onClick={() => setAnimationRequested(true)}
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
              >
                {animating ? '🎬' : '🎬 Start'}
              </button>
              
              {/* Sound Toggle */}
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
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
      )}

      <div className="input-bar" style={{ background: 'var(--color-surface)', borderRadius: 8, boxShadow: '0 1px 4px #0001', padding: '0.4em', maxWidth: '100%', width: '100%', margin: '0 auto 0.6em auto', display: 'flex', alignItems: 'center', color: 'var(--color-on-surface)', overflow: 'hidden', gap: '6px' }}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => {
            setInput(e.target.value);
            setHighlightedIdx(-1);
          }}
          placeholder="Add a place..."
          disabled={animating}
          autoComplete="off"
          style={{ flex: 1, minWidth: 0, maxWidth: '100%', padding: '0.4em 0.6em', borderRadius: 6, border: '1px solid var(--color-accent)', background: 'var(--color-bg)', color: 'var(--color-on-bg)', fontSize: '0.95em', height: 36, boxSizing: 'border-box' }}
          onKeyDown={e => {
            if (suggestions.length > 0) {
              if (e.key === 'ArrowDown') {
                setHighlightedIdx(idx => Math.min(idx + 1, suggestions.length - 1));
              } else if (e.key === 'ArrowUp') {
                setHighlightedIdx(idx => Math.max(idx - 1, 0));
              } else if (e.key === 'Enter') {
                // If nothing is highlighted, treat the first suggestion as selected
                const idxToUse = highlightedIdx === -1 ? 0 : highlightedIdx;
                if (idxToUse >= 0 && idxToUse < suggestions.length) {
                  handleSuggestionClick(suggestions[idxToUse].place_name);
                  e.preventDefault();
                }
              }
            }
          }}
        />
        <button
          onClick={handleAddPlace}
          disabled={animating || !input.trim()}
          style={{
            ...buttonStyle,
            background: 'var(--color-accent)',
            color: 'var(--color-on-surface)',
            opacity: animating || !input.trim() ? 0.6 : 1,
            cursor: animating || !input.trim() ? 'not-allowed' : 'pointer',
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
      {suggestions.length > 0 && (
        <ul className="suggestions-list" style={{ background: 'var(--color-surface)', color: 'var(--color-on-surface)', borderRadius: 8, boxShadow: '0 2px 8px #0002', maxWidth: '100%', margin: '0 auto 0.5em auto', padding: 0, listStyle: 'none', position: 'relative', zIndex: 5 }}>
          {suggestions.map((s, idx) => (
            <li
              key={s.id || idx}
              onClick={() => handleSuggestionClick(s.place_name)}
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
              onMouseEnter={() => setHighlightedIdx(idx)}
            >
              {s.place_name}
            </li>
          ))}
        </ul>
      )}
      <div
        className="places-list"
        ref={placesListRef}
        style={{ background: 'var(--color-surface)', color: 'var(--color-on-surface)', borderRadius: 8, boxShadow: '0 1px 4px #0001', maxWidth: '100%', width: '100%', margin: '0 auto 0.8em auto', padding: '0.4em 0.6em', display: 'flex', flexDirection: 'column', gap: '0.25em', maxHeight: '10em', overflowY: 'auto', boxSizing: 'border-box', border: '1px solid var(--color-accent)' }}
      >
        {places.map((place, idx) => (
          <span
            key={idx}
            ref={idx === places.length - 1 ? placesEndRef : undefined}
            tabIndex={-1}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.2em 0' }}
          >
            <span style={{ flex: 1, color: 'var(--color-on-surface)', fontSize: '0.9em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{place}</span>
            <button
              aria-label={`Remove ${place}`}
              className="remove-btn"
              onClick={() => {
                setPlaces(places.filter((_, i) => i !== idx));
              }}
              disabled={animating}
              style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontSize: '1.2em', padding: '2px 4px', minWidth: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div ref={mapContainer} className="map-container" style={{ width: '100%', height: 'calc(100vh - 420px)', minHeight: '300px', margin: '0 auto', borderRadius: 12, boxShadow: '0 2px 12px #0002', border: '1px solid var(--color-accent)', maxWidth: '100%', boxSizing: 'border-box' }} />
    </div>
  );
}

export default App;
