import React, { useState, useEffect, useRef } from 'react';
import { getGeotagged, getTimeline, updatePhotoLocation, getThumbnailUrl } from '../services/api';
import { MapPin, X, Pin, Layers, ChevronDown } from 'lucide-react';

const withToken = (url) => {
  const token = localStorage.getItem('token');
  return `${url}?token=${token}`;
};

const MapView = () => {
  const [photos, setPhotos] = useState([]);
  const [allPhotos, setAllPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [pinMode, _setPinMode] = useState(false);
  const [pinningPhoto, _setPinningPhoto] = useState(null);
  const [showPhotoList, setShowPhotoList] = useState(false);


  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const pinModeRef = useRef(false);
  const pinningPhotoRef = useRef(null);

  // Wrapped setters that keep refs in sync (Leaflet closures read refs, not state)
  const setPinMode = (v) => { pinModeRef.current = v; _setPinMode(v); };
  const setPinningPhoto = (v) => { pinningPhotoRef.current = v; _setPinningPhoto(v); };

  // Load geotagged photos
  const loadGeotagged = () => {
    getGeotagged()
      .then(res => setPhotos(res.data.photos || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  // Load all photos for the pin picker
  useEffect(() => {
    loadGeotagged();
    getTimeline(1, 100)
      .then(res => setAllPhotos(res.data.photos || []))
      .catch(console.error);
  }, []);

  // Inject Leaflet
  useEffect(() => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    if (!window.L) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => setMapReady(true);
      document.head.appendChild(script);
    } else {
      setMapReady(true);
    }
  }, []);

  // Init map once Leaflet is ready
  useEffect(() => {
    if (!mapReady || !mapRef.current || mapInstanceRef.current) return;

    const L = window.L;
    const map = L.map(mapRef.current, { zoomControl: true }).setView([20, 0], 2);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 19
    }).addTo(map);

    // Fix grey tiles: call invalidateSize after a brief delay
    setTimeout(() => map.invalidateSize(), 200);

    // Also fix on window resize
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(mapRef.current);

    // Click on map to drop a pin (when pin mode is on)
    map.on('click', (e) => {
      if (!pinModeRef.current || !pinningPhotoRef.current) return;
      const { lat, lng } = e.latlng;
      updatePhotoLocation(pinningPhotoRef.current.id, lat, lng).then(() => {
        setPinMode(false);
        setPinningPhoto(null);
        loadGeotagged();
      }).catch(console.error);
    });
  }, [mapReady]);

  // Re-draw markers when photos change
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    // Clear existing markers
    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};

    photos.forEach(photo => {
      if (!photo.latitude || !photo.longitude) return;

      const thumbUrl = withToken(getThumbnailUrl(photo.id, 'small'));
      const marker = L.marker([photo.latitude, photo.longitude], {
        icon: L.divIcon({
          className: '',
          html: `<div style="
            width: 44px; height: 44px; border-radius: 12px; overflow: hidden;
            border: 3px solid white; box-shadow: 0 3px 14px rgba(0,0,0,0.4);
            background: #e5e7eb; cursor: pointer;
            transition: transform 0.15s ease;
          " onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">
            <img src="${thumbUrl}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'" />
          </div>`,
          iconSize: [44, 44],
          iconAnchor: [22, 22]
        })
      });

      marker.on('click', () => setSelectedPhoto(photo));

      // Popup
      const dateStr = photo.canonical_date ? new Date(photo.canonical_date).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '';
      marker.bindPopup(`
        <div style="text-align:center;min-width:150px;font-family:system-ui,sans-serif">
          <img src="${thumbUrl}" style="width:140px;height:105px;object-fit:cover;border-radius:10px;display:block;margin-bottom:8px;"/>
          <div style="font-size:0.85rem;font-weight:600;color:#111827;margin-bottom:2px">${photo.filename}</div>
          <div style="font-size:0.75rem;color:#6b7280">${dateStr}</div>
          <div style="font-size:0.7rem;color:#9ca3af;margin-top:4px">${photo.latitude.toFixed(4)}, ${photo.longitude.toFixed(4)}</div>
        </div>
      `, { maxWidth: 180 });

      marker.addTo(map);
      markersRef.current[photo.id] = marker;
    });

    // Auto-fit to all markers
    if (photos.length > 0) {
      const latlngs = photos.filter(p => p.latitude && p.longitude).map(p => [p.latitude, p.longitude]);
      if (latlngs.length > 0) map.fitBounds(latlngs, { padding: [50, 50], maxZoom: 12 });
    }
  }, [photos, mapReady]);

  // Highlight marker when a photo is selected in sidebar
  useEffect(() => {
    if (!selectedPhoto || !markersRef.current[selectedPhoto.id]) return;
    const marker = markersRef.current[selectedPhoto.id];
    marker.openPopup();
    mapInstanceRef.current?.setView([selectedPhoto.latitude, selectedPhoto.longitude], 14, { animate: true });
  }, [selectedPhoto]);

  // Toggle pin cursor
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.getContainer().style.cursor = pinMode ? 'crosshair' : '';
  }, [pinMode]);

  const untaggedPhotos = allPhotos.filter(p => !p.latitude);

  return (
    <div style={{ height: 'calc(100vh - 112px)', display: 'flex', flexDirection: 'column', gap: '0' }}>
      {/* Header */}
      <div className="timeline-header" style={{ flexShrink: 0, marginBottom: '12px' }}>
        <div>
          <h1 className="timeline-title">Map</h1>
          <span className="timeline-count">{photos.length} geotagged photos</span>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Pin a photo button */}
          {untaggedPhotos.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowPhotoList(v => !v)}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Pin size={15} />
                Pin a Photo
                <ChevronDown size={13} />
              </button>

              {/* Dropdown to pick which photo to pin */}
              {showPhotoList && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: '6px',
                  background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
                  borderRadius: '14px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  width: '260px', maxHeight: '320px', overflowY: 'auto', zIndex: 1000,
                  padding: '8px'
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', padding: '4px 8px 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Photos without location
                  </div>
                  {untaggedPhotos.map(photo => (
                    <div
                      key={photo.id}
                      onClick={() => {
                        setPinningPhoto(photo);
                        setPinMode(true);
                        setShowPhotoList(false);
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '8px', borderRadius: '10px', cursor: 'pointer',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <img
                        src={withToken(getThumbnailUrl(photo.id, 'small'))}
                        style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0, background: 'var(--border-color)' }}
                        alt=""
                      />
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{photo.filename}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(photo.canonical_date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pin mode banner */}
      {pinMode && pinningPhoto && (
        <div style={{
          background: 'var(--accent-color)', color: 'white',
          padding: '10px 20px', borderRadius: '12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '10px', flexShrink: 0, fontWeight: 500, fontSize: '0.9rem'
        }}>
          <span>📍 Click anywhere on the map to place <strong>{pinningPhoto.filename}</strong></span>
          <button onClick={() => { setPinMode(false); setPinningPhoto(null); }} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '8px', padding: '4px 12px', cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      )}

      {/* Map + Sidebar */}
      <div style={{ flex: 1, display: 'flex', gap: '16px', minHeight: 0 }}>
        {/* Map */}
        <div
          ref={mapRef}
          style={{
            flex: 1,
            borderRadius: '16px',
            overflow: 'hidden',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-surface-hover)',
            minHeight: '400px'
          }}
        />

        {/* Selected photo details panel */}
        {selectedPhoto && (
          <div style={{
            width: '260px', flexShrink: 0,
            background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
            borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Photo Details</span>
              <button onClick={() => setSelectedPhoto(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={16} />
              </button>
            </div>
            <img
              src={withToken(getThumbnailUrl(selectedPhoto.id, 'medium'))}
              style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: '10px', background: 'var(--border-color)' }}
              alt=""
            />
            <div style={{ fontSize: '0.85rem', fontWeight: 600, wordBreak: 'break-all' }}>{selectedPhoto.filename}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {new Date(selectedPhoto.canonical_date).toLocaleDateString(undefined, { dateStyle: 'long' })}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', background: 'var(--bg-surface-hover)', padding: '8px 10px', borderRadius: '8px' }}>
              <MapPin size={12} style={{ display: 'inline', marginRight: '4px' }} />
              {selectedPhoto.latitude?.toFixed(5)}, {selectedPhoto.longitude?.toFixed(5)}
            </div>
            <a
              href={`https://maps.google.com/?q=${selectedPhoto.latitude},${selectedPhoto.longitude}`}
              target="_blank" rel="noreferrer"
              className="btn-secondary"
              style={{ textDecoration: 'none', justifyContent: 'center', fontSize: '0.85rem' }}
            >
              Open in Google Maps
            </a>
          </div>
        )}
      </div>

      {/* Empty map hint */}
      {!loading && photos.length === 0 && !pinMode && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
          borderRadius: '14px', padding: '20px 28px', textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)', zIndex: 500, pointerEvents: 'none'
        }}>
          <MapPin size={32} style={{ opacity: 0.3, marginBottom: '10px' }} />
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>No geotagged photos</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Use "Pin a Photo" to add locations manually</div>
        </div>
      )}
    </div>
  );
};

export default MapView;
