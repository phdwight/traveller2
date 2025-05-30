import { useRef, useEffect, useState } from 'react';
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
  const [places, setPlaces] = useState<string[]>([]); // Start with empty places
  const [input, setInput] = useState('');
  const [coords, setCoords] = useState<[number, number][]>([]);
  const [animating, setAnimating] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [markers, setMarkers] = useState<mapboxgl.Marker[]>([]);
  const [highlightedIdx, setHighlightedIdx] = useState<number>(-1);
  const [themeIdx, setThemeIdx] = useState(getDefaultThemeIdx());
  const [animationRequested, setAnimationRequested] = useState(false);

  // Geocode places to coordinates
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
    }
    fetchCoords();
  }, [places]);

  // Fetch suggestions as user types
  useEffect(() => {
    if (!input.trim()) {
      setSuggestions([]);
      return;
    }
    let ignore = false;
    const fetchSuggestions = async () => {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(input)}.json?autocomplete=true&access_token=${mapboxgl.accessToken}`
      );
      const data = await res.json();
      if (!ignore) {
        setSuggestions(data.features || []);
      }
    };
    fetchSuggestions();
    return () => { ignore = true; };
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
    // Only allow adding if the input matches a suggestion
    const match = suggestions.find(s => s.place_name === input.trim());
    if (match) {
      setPlaces([...places, match.place_name]);
      setInput('');
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = (place: string) => {
    setPlaces([...places, place]);
    setInput('');
    setSuggestions([]);
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

  // Animate path and marker from place 1 to end, then show all markers and path
  useEffect(() => {
    if (!animationRequested || !mapRef.current || coords.length < 2) return;
    const map = mapRef.current;
    let animationFrame: number | null = null;
    let marker: mapboxgl.Marker | null = null;
    let routeLayerAdded = false;
    let routeSourceAdded = false;

    // Remove previous route and markers
    if (map.getLayer('route')) map.removeLayer('route');
    if (map.getSource('route')) map.removeSource('route');
    markers.forEach(m => m.remove());

    // Animated marker starts at the 1st place
    marker = new mapboxgl.Marker({ color: '#eab308' })
      .setLngLat(coords[0])
      .addTo(map);
    map.flyTo({ center: coords[0], zoom: 10, speed: 1.2 });
    let progressCoords: [number, number][] = [coords[0]];
    let i = 0; // Start animating from the 1st place
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
        'line-dasharray': [2, 3], // Dashed line: 2px dash, 3px gap
      },
    });
    routeLayerAdded = true;
    function animateSegment(start: [number, number], end: [number, number], onDone: () => void) {
      let t = 0;
      const duration = 3500;
      const startTime = performance.now();
      function easeInOutCubic(x: number) {
        return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
      }
      function frame(now: number) {
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
          onDone();
        }
      }
      animationFrame = requestAnimationFrame(frame);
    }
    function animateRoute() {
      if (i < coords.length - 1) {
        const start = coords[i];
        const end = coords[i + 1];
        animateSegment(start, end, () => {
          i++;
          if (i < coords.length - 1) {
            animateRoute();
          } else {
            setAnimating(false);
            setAnimationRequested(false);
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
    animateRoute();
    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      if (marker) marker.remove();
      if (routeLayerAdded) map.removeLayer('route');
      if (routeSourceAdded) map.removeSource('route');
    };
  }, [coords, animationRequested]);

  // Shared button style for Add and Start Animation
  const buttonStyle: React.CSSProperties = {
    border: 'none',
    borderRadius: 7,
    padding: '0.5em 1.1em',
    fontWeight: 700,
    fontSize: '1em',
    boxShadow: '0 1px 4px #0001',
    cursor: 'pointer',
    transition: 'background 0.2s, opacity 0.2s',
    marginRight: 8,
  };

  return (
    <div className="app-container" style={{ background: 'var(--color-bg)', backgroundImage: 'var(--bg-texture)', backgroundSize: '340px 340px', backgroundBlendMode: 'soft-light', color: 'var(--color-on-bg)' }}>
      <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
        <select
          aria-label="Select theme"
          value={themeIdx}
          onChange={e => {
            setThemeIdx(Number(e.target.value));
            setTimeout(() => {
              inputRef.current?.focus();
            }, 0);
          }}
          style={{ padding: '0.3em 1.2em 0.3em 0.7em', borderRadius: 6, border: '1px solid var(--color-accent)', background: 'var(--color-surface)', color: 'var(--color-on-surface)', fontWeight: 500 }}
        >
          {themes.map((t, i) => (
            <option value={i} key={t.name} style={{ color: t.colors['--color-on-surface'] }}>{t.name}</option>
          ))}
        </select>
      </div>
      <h1 style={{ color: 'var(--color-primary)', fontWeight: 700, fontSize: '2.1rem', margin: '0.5em 0 0.2em 0', letterSpacing: '0.01em' }}>
        Travel Marks
      </h1>
      <div className="input-bar" style={{ background: 'var(--color-surface)', borderRadius: 8, boxShadow: '0 1px 4px #0001', padding: '0.5em', maxWidth: 420, width: '100%', margin: '0 auto 0.7em auto', display: 'flex', alignItems: 'center', color: 'var(--color-on-surface)', overflow: 'hidden' }}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => {
            setInput(e.target.value);
            setHighlightedIdx(-1);
          }}
          placeholder="Add a place (city, address, etc.)"
          disabled={animating}
          autoComplete="off"
          style={{ flex: 1, minWidth: 0, maxWidth: '100%', padding: '0.5em 0.7em', borderRadius: 7, border: '1px solid var(--color-accent)', background: 'var(--color-bg)', color: 'var(--color-on-bg)', fontSize: '1em', marginRight: 8, height: 40, boxSizing: 'border-box' }}
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
          disabled={animating || !input.trim() || !suggestions.some(s => s.place_name === input.trim())}
          style={{
            ...buttonStyle,
            background: 'var(--color-accent)',
            color: 'var(--color-on-surface)',
            opacity: animating || !input.trim() || !suggestions.some(s => s.place_name === input.trim()) ? 0.6 : 1,
            cursor: animating || !input.trim() || !suggestions.some(s => s.place_name === input.trim()) ? 'not-allowed' : 'pointer',
            height: 40,
            marginRight: 8,
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
            padding: '0.5em 0.9em',
          }}
        >
          Add
        </button>
        <button
          onClick={() => setAnimationRequested(true)}
          disabled={animating || coords.length < 2}
          style={{
            ...buttonStyle,
            background: 'var(--color-accent)',
            color: 'var(--color-on-surface)',
            opacity: animating || coords.length < 2 ? 0.6 : 1,
            cursor: animating || coords.length < 2 ? 'not-allowed' : 'pointer',
            height: 40,
            marginRight: 0,
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
            padding: '0.5em 0.9em',
          }}
        >
          Start Animation
        </button>
      </div>
      {suggestions.length > 0 && (
        <ul className="suggestions-list" style={{ background: 'var(--color-surface)', color: 'var(--color-on-surface)', borderRadius: 8, boxShadow: '0 2px 8px #0002', maxWidth: 420, margin: '0 auto', padding: 0, listStyle: 'none', position: 'relative', zIndex: 5 }}>
          {suggestions.map((s, idx) => (
            <li
              key={s.id || idx}
              onClick={() => handleSuggestionClick(s.place_name)}
              style={{
                background: highlightedIdx === idx ? 'var(--color-accent)' : 'transparent',
                color: highlightedIdx === idx ? 'var(--color-bg)' : 'var(--color-on-surface)',
                padding: '0.5em 0.8em',
                cursor: 'pointer',
                borderRadius: 6,
                fontWeight: highlightedIdx === idx ? 600 : 400,
              }}
              onMouseEnter={() => setHighlightedIdx(idx)}
            >
              {s.place_name}
            </li>
          ))}
        </ul>
      )}
      <div className="places-list" style={{ background: 'var(--color-surface)', color: 'var(--color-on-surface)', borderRadius: 8, boxShadow: '0 1px 4px #0001', maxWidth: 420, width: '100%', margin: '0.7em auto', padding: '0.5em 0.7em', display: 'flex', flexDirection: 'column', gap: '0.3em', maxHeight: '12em', overflowY: 'auto', boxSizing: 'border-box', border: '2px solid var(--color-surface)' }}>
        {places.map((place, idx) => (
          <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ flex: 1, color: 'var(--color-on-surface)' }}>{place}</span>
            <button
              aria-label={`Remove ${place}`}
              className="remove-btn"
              onClick={() => {
                setPlaces(places.filter((_, i) => i !== idx));
              }}
              disabled={animating}
              style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontSize: '1.1em', padding: 0 }}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div ref={mapContainer} className="map-container" style={{ width: 'min(98vw, 900px)', height: '60vh', margin: '1.2em auto 0 auto', borderRadius: 14, boxShadow: '0 2px 12px #0002', border: '2px solid var(--color-surface)', maxWidth: '100%' }} />
    </div>
  );
}

export default App;
