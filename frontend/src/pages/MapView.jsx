import React, { useState, useEffect, useRef } from 'react';
import { getGeotagged } from '../services/api';
import { getThumbnailUrl } from '../services/api';
import { MapPin } from 'lucide-react';

const MapView = () => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    getGeotagged()
      .then(res => setPhotos(res.data.photos))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Dynamically load Leaflet CSS + JS
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

  useEffect(() => {
    if (!mapReady || !mapRef.current || loading || mapInstanceRef.current) return;

    const L = window.L;
    const map = L.map(mapRef.current).setView([20, 0], 2);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18
    }).addTo(map);

    photos.forEach(photo => {
      if (!photo.latitude || !photo.longitude) return;

      const thumbUrl = getThumbnailUrl(photo.id, 'small');
      const marker = L.marker([photo.latitude, photo.longitude], {
        icon: L.divIcon({
          className: '',
          html: `<div style="width:40px;height:40px;border-radius:10px;overflow:hidden;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);background:#e5e7eb">
            <img src="${thumbUrl}" style="width:100%;height:100%;object-fit:cover" />
          </div>`,
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        })
      });

      const dateStr = photo.canonical_date ? new Date(photo.canonical_date).toLocaleDateString() : '';
      marker.bindPopup(`
        <div style="text-align:center;min-width:140px">
          <img src="${thumbUrl}" style="width:130px;height:100px;object-fit:cover;border-radius:8px;display:block;margin-bottom:8px"/>
          <div style="font-size:0.8rem;font-weight:600;color:#111827">${photo.filename}</div>
          <div style="font-size:0.75rem;color:#6b7280">${dateStr}</div>
        </div>
      `);

      marker.addTo(map);
    });

    // Fit map to markers if any
    if (photos.length > 0) {
      const latlngs = photos
        .filter(p => p.latitude && p.longitude)
        .map(p => [p.latitude, p.longitude]);
      if (latlngs.length > 0) {
        map.fitBounds(latlngs, { padding: [40, 40] });
      }
    }
  }, [mapReady, photos, loading]);

  return (
    <div style={{ paddingBottom: '0', height: 'calc(100vh - 112px)', display: 'flex', flexDirection: 'column' }}>
      <div className="timeline-header" style={{ marginBottom: '16px', flexShrink: 0 }}>
        <div>
          <h1 className="timeline-title">Map</h1>
          <span className="timeline-count">
            {photos.length} geotagged photos
          </span>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '40px', color: 'var(--text-secondary)' }}>Loading map data...</div>
      ) : photos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', background: 'var(--bg-surface-hover)', borderRadius: '16px' }}>
          <MapPin size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '8px' }}>No geotagged photos</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Photos with GPS data will appear on the map.</p>
        </div>
      ) : (
        <div
          ref={mapRef}
          style={{
            flex: 1,
            borderRadius: '16px',
            overflow: 'hidden',
            border: '1px solid var(--border-color)'
          }}
        />
      )}
    </div>
  );
};

export default MapView;
