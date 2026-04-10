import React from 'react';
import { Virtuoso } from 'react-virtuoso';
import PhotoCard from './PhotoCard';

const PhotoGrid = ({ photos, onPhotoClick, onFavouriteToggle, groupByMonth = true }) => {
  if (!photos.length) return null;

  if (!groupByMonth) {
    return (
      <div className="grid-layout animate-fade-in">
        {photos.map(p => <PhotoCard key={p.id} photo={p} onClick={onPhotoClick} onFavouriteToggle={onFavouriteToggle} />)}
      </div>
    );
  }

  const groupedObj = photos.reduce((acc, photo) => {
    const d = new Date(photo.canonical_date);
    const key = `${d.toLocaleString('default', { month: 'long' })} ${d.getFullYear()}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(photo);
    return acc;
  }, {});
  
  const groupedArray = Object.entries(groupedObj);

  return (
    <div className="photo-grid-container animate-fade-in">
      <Virtuoso
        useWindowScroll
        data={groupedArray}
        itemContent={(index, [monthYear, groupPhotos]) => (
          <div key={monthYear} style={{ paddingBottom: '32px' }}>
            <div className="month-header">
              <span className="month-header-main">{monthYear}</span>
              <span className="month-header-sub">{groupPhotos.length} photos</span>
            </div>
            <div className="grid-layout">
              {groupPhotos.map(p => (
                <PhotoCard key={p.id} photo={p} onClick={onPhotoClick} onFavouriteToggle={onFavouriteToggle} />
              ))}
            </div>
          </div>
        )}
      />
    </div>
  );
};

export default PhotoGrid;