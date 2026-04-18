import React, { useState, useCallback, useEffect } from 'react';
import { searchPhotos } from '../services/api';
import PhotoGrid from '../components/PhotoGrid';
import Lightbox from '../components/Lightbox';
import { Search as SearchIcon, X, Filter } from 'lucide-react';

const FILTER_CHIPS = [
  { label: 'Photos', query: 'type:photo' },
  { label: 'Videos', query: 'type:video' },
  { label: 'Favourites', query: 'favourite:true' },
  { label: 'This Year', query: `taken:${new Date().getFullYear()}` },
];

const Search = () => {
  const [query, setQuery] = useState('');
  const [activeChips, setActiveChips] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [lightboxData, setLightboxData] = useState(null);

  const buildQuery = (text, chips) => {
    const parts = [text, ...chips.map(c => c.query)].filter(Boolean);
    return parts.join(' ').trim();
  };

  const doSearch = useCallback(async (text, chips) => {
    const q = buildQuery(text, chips);
    if (!q) { setResults([]); setSearched(false); return; }
    setLoading(true);
    try {
      const res = await searchPhotos(q);
      setResults(res.data.photos);
      setSearched(true);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => doSearch(query, activeChips), 300);
    return () => clearTimeout(timer);
  }, [query, activeChips, doSearch]);

  const toggleChip = (chip) => {
    setActiveChips(prev =>
      prev.find(c => c.label === chip.label)
        ? prev.filter(c => c.label !== chip.label)
        : [...prev, chip]
    );
  };

  return (
    <div style={{ paddingBottom: '80px', maxWidth: '1400px', margin: '0 auto' }}>
      <div className="timeline-header">
        <div>
          <h1 className="timeline-title">Search</h1>
          <span className="timeline-count">Find anything in your library</span>
        </div>
      </div>

      {/* Search bar */}
      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <SearchIcon size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          autoFocus
          type="text"
          className="input-field"
          style={{ paddingLeft: '48px', paddingRight: '48px', height: '52px', fontSize: '1rem', borderRadius: '14px' }}
          placeholder="Search photos, albums, tags... e.g. tag:holiday taken:2023"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '28px' }}>
        {FILTER_CHIPS.map(chip => {
          const active = !!activeChips.find(c => c.label === chip.label);
          return (
            <button
              key={chip.label}
              onClick={() => toggleChip(chip)}
              style={{
                padding: '6px 14px', borderRadius: '99px', fontSize: '0.85rem', fontWeight: 500,
                cursor: 'pointer', border: '1px solid',
                borderColor: active ? 'var(--accent-color)' : 'var(--border-hover)',
                background: active ? 'var(--accent-light)' : 'var(--bg-surface)',
                color: active ? 'var(--accent-color)' : 'var(--text-secondary)',
                transition: 'all 0.2s ease'
              }}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Search syntax hint */}
      {!searched && !loading && (
        <div style={{ background: 'var(--bg-surface-hover)', borderRadius: '12px', padding: '20px 24px', marginBottom: '24px' }}>
          <div style={{ fontWeight: 600, marginBottom: '10px', fontSize: '0.9rem' }}>Search Syntax</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '8px 24px' }}>
            {[
              ['type:photo', 'Only photos'],
              ['type:video', 'Only videos'],
              ['taken:2023', 'Photos from 2023'],
              ['taken:2023-01-01..2023-06-30', 'Date range'],
              ['tag:holiday', 'By tag'],
              ['camera:iPhone', 'By camera model'],
              ['album:Japan', 'Photos in album'],
              ['favourite:true', 'Favourited photos'],
            ].map(([syntax, desc]) => (
              <div key={syntax} style={{ display: 'flex', gap: '12px', alignItems: 'baseline' }}>
                <code style={{ background: 'var(--border-color)', padding: '2px 8px', borderRadius: '5px', fontSize: '0.8rem', flexShrink: 0 }}>{syntax}</code>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {loading && <div style={{ color: 'var(--text-secondary)', padding: '20px 0' }}>Searching...</div>}

      {!loading && searched && results.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
          <SearchIcon size={40} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '8px' }}>No results found</h2>
          <p>Try different keywords or filters.</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px', fontWeight: 500 }}>
            {results.length} result{results.length !== 1 ? 's' : ''}
          </div>
          <PhotoGrid photos={results} onPhotoClick={setLightboxData} onFavouriteToggle={() => {}} groupByMonth={false} />
        </>
      )}

      {lightboxData && (
        <Lightbox
          photo={lightboxData}
          photos={results}
          onClose={() => setLightboxData(null)}
          onFavouriteToggle={() => {}}
        />
      )}
    </div>
  );
};

export default Search;