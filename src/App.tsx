import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import './App.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';
if (!mapboxgl.accessToken) {
  // eslint-disable-next-line no-console
  console.error('Mapbox access token is missing. Please set VITE_MAPBOX_TOKEN in your .env file.');
}

function App() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [places, setPlaces] = useState<string[]>([]); // Start with empty places
  const [input, setInput] = useState('');
  const [coords, setCoords] = useState<[number, number][]>([]);
  const [animating, setAnimating] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [markers, setMarkers] = useState<mapboxgl.Marker[]>([]);
  const [highlightedIdx, setHighlightedIdx] = useState<number>(-1);

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

  return (
    <div className="app-container">
      <div className="input-bar">
        <input
          type="text"
          value={input}
          onChange={e => {
            setInput(e.target.value);
            setHighlightedIdx(-1);
          }}
          placeholder="Add a place (city, address, etc.)"
          disabled={animating}
          autoComplete="off"
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
        <button onClick={handleAddPlace} disabled={animating || !input.trim() || !suggestions.some(s => s.place_name === input.trim())}>
          Add
        </button>
      </div>
      {suggestions.length > 0 && (
        <ul className="suggestions-list">
          {suggestions.map((s, idx) => (
            <li
              key={s.id || idx}
              onClick={() => handleSuggestionClick(s.place_name)}
              style={highlightedIdx === idx ? { background: '#e0e7ff' } : {}}
              onMouseEnter={() => setHighlightedIdx(idx)}
            >
              {s.place_name}
            </li>
          ))}
        </ul>
      )}
      <div className="places-list">
        {places.map((place, idx) => (
          <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {place}
            <button
              aria-label={`Remove ${place}`}
              className="remove-btn"
              onClick={() => {
                setPlaces(places.filter((_, i) => i !== idx));
              }}
              disabled={animating}
              style={{ background: 'none', border: 'none', color: '#e11d48', cursor: 'pointer', fontSize: '1.1em', padding: 0 }}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div ref={mapContainer} className="map-container" />
    </div>
  );
}

export default App;
