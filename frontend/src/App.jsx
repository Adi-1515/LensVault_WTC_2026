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

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/timeline" element={<ProtectedRoute><Timeline /></ProtectedRoute>} />
      <Route path="/albums" element={<ProtectedRoute><Albums /></ProtectedRoute>} />
      <Route path="/albums/:id" element={<ProtectedRoute><AlbumDetail /></ProtectedRoute>} />
      <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
      <Route path="/favourites" element={<ProtectedRoute><Favourites /></ProtectedRoute>} />
      <Route path="/videos" element={<ProtectedRoute><Videos /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/map" element={<ProtectedRoute><MapView /></ProtectedRoute>} />
      <Route path="/" element={<Navigate to="/timeline" replace />} />
    </Routes>
  );
}

export default App;