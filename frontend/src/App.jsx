import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Timeline from './pages/Timeline';
import Albums from './pages/Albums';
import AlbumDetail from './pages/AlbumDetail';
import Search from './pages/Search';
import Favourites from './pages/Favourites';
import Videos from './pages/Videos';
import Settings from './pages/Settings';
import MapView from './pages/MapView';
import ProtectedRoute from './components/ProtectedRoute';
import People from './pages/People';
import PersonDetail from './pages/PersonDetail';
import SlideshowViewer from './pages/SlideshowViewer';
import AlbumSlideshow from './pages/AlbumSlideshow';

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/share/album/:token" element={<SlideshowViewer />} />

      {/* Protected routes */}
      <Route path="/timeline" element={<ProtectedRoute><Timeline /></ProtectedRoute>} />
      <Route path="/albums" element={<ProtectedRoute><Albums /></ProtectedRoute>} />
      <Route path="/albums/:id" element={<ProtectedRoute><AlbumDetail /></ProtectedRoute>} />
      <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
      <Route path="/favourites" element={<ProtectedRoute><Favourites /></ProtectedRoute>} />
      <Route path="/videos" element={<ProtectedRoute><Videos /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/map" element={<ProtectedRoute><MapView /></ProtectedRoute>} />
      <Route path="/people" element={<ProtectedRoute><People /></ProtectedRoute>} />
      <Route path="/person/:id" element={<ProtectedRoute><PersonDetail /></ProtectedRoute>} />
      <Route path="/slideshow" element={<ProtectedRoute><AlbumSlideshow /></ProtectedRoute>} />
      <Route path="/slideshow/:albumId" element={<ProtectedRoute><AlbumSlideshow /></ProtectedRoute>} />
      <Route path="/" element={<Navigate to="/timeline" replace />} />
    </Routes>
  );
}

export default App;