import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, X, Check, Loader } from 'lucide-react';

/**
 * LocationPicker — modal with a Leaflet map + place search
 * Props:
 *   initialLat, initialLng — pre-existing coords (optional)
 *   onSave(lat, lng)       — called when user confirms
 *   onClose()              — called when user cancels
 */
const LocationPicker = ({ initialLat, initialLng, onSave, onClose }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [leafletReady, setLeafletReady] = useState(!!window.L);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [coords, setCoords] = useState(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  );

  // Load Leaflet if not already loaded
  useEffect(() => {
    if (window.L) { setLeafletReady(true); return; }
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => setLeafletReady(true);
    document.head.appendChild(script);
  }, []);

  // Init map once Leaflet is ready and div is mounted
  useEffect(() => {
    if (!leafletReady || !mapRef.current || mapInstanceRef.current) return;
    const L = window.L;

    // Default center: India (or existing coords)
    const center = coords ? [coords.lat, coords.lng] : [20.5937, 78.9629];
    const zoom = coords ? 13 : 4;

    const map = L.map(mapRef.current, { zoomControl: true }).setView(center, zoom);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    // Place existing marker
    if (coords) {
      markerRef.current = L.marker([coords.lat, coords.lng], { draggable: true }).addTo(map);
      markerRef.current.on('dragend', (e) => {
        const pos = e.target.getLatLng();
        setCoords({ lat: pos.lat, lng: pos.lng });
      });
    }

    // Click to place / move marker
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      setCoords({ lat, lng });
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map);
        markerRef.current.on('dragend', (ev) => {
          const pos = ev.target.getLatLng();
          setCoords({ lat: pos.lat, lng: pos.lng });
        });
      }
    });

    // Fix tile loading on first render (common Leaflet issue in modals)
    setTimeout(() => map.invalidateSize(), 150);
  }, [leafletReady]);

  // Nominatim geocode search
  const doSearch = async () => {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(search)}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      if (data.length > 0) {
        const { lat, lon } = data[0];
        const latF = parseFloat(lat), lngF = parseFloat(lon);
        setCoords({ lat: latF, lng: lngF });
        const map = mapInstanceRef.current;
        const L = window.L;
        if (map) {
          map.setView([latF, lngF], 13);
          if (markerRef.current) {
            markerRef.current.setLatLng([latF, lngF]);
          } else {
            markerRef.current = L.marker([latF, lngF], { draggable: true }).addTo(map);
            markerRef.current.on('dragend', (ev) => {
              const pos = ev.target.getLatLng();
              setCoords({ lat: pos.lat, lng: pos.lng });
            });
          }
        }
      } else {
        alert('Place not found. Try a different search term.');
      }
    } catch (e) { console.error(e); }
    setSearching(false);
  };

  return (
    // Overlay
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'var(--bg-surface)', borderRadius: '20px',
        width: '100%', maxWidth: '680px', overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
        display: 'flex', flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <MapPin size={18} color="var(--accent-color)" />
          <span style={{ fontWeight: 600, fontSize: '1rem', flex: 1 }}>Set Location</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Search bar */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '8px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              autoFocus
              type="text"
              className="input-field"
              style={{ paddingLeft: '36px', height: '38px', fontSize: '0.875rem' }}
              placeholder="Search a place e.g. Mumbai, Paris, Tokyo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch()}
            />
          </div>
          <button onClick={doSearch} className="btn-primary" style={{ padding: '0 16px', height: '38px' }} disabled={searching}>
            {searching ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : 'Go'}
          </button>
        </div>

        {/* Map */}
        <div
          ref={mapRef}
          style={{ height: '360px', background: 'var(--bg-surface-hover)' }}
        />

        {/* Footer */}
        <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            {coords
              ? <><MapPin size={12} style={{ display: 'inline', marginRight: '4px' }} />{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</>
              : 'Click on the map or search to select a location'
            }
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button
              onClick={() => coords && onSave(coords.lat, coords.lng)}
              className="btn-primary"
              disabled={!coords}
            >
              <Check size={14} /> Save Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationPicker;
