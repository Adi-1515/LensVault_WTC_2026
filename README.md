# 🔐 LensVault

> **A self-hosted, privacy-first photo and video library** — a full alternative to Google Photos and Apple Photos that *you* own and control.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)](docker-compose.yml)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)](backend/)
[![React](https://img.shields.io/badge/Frontend-React%2018-61DAFB?logo=react)](frontend/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791?logo=postgresql)](docker-compose.yml)

---

## 📸 What is LensVault?

LensVault is a **self-hosted photo and video library** that runs entirely on your own hardware — a home server, NAS, VPS, or spare laptop. No cloud. No subscriptions. No data mining.

It delivers the **Google Photos experience** — automatic organization, smart categories, fast search, albums, map view, and a beautiful web UI — while keeping every pixel on your own infrastructure.

---

## ✨ Features

### 📁 Media Management
- **Drag & drop upload** for photos and videos (JPEG, PNG, WEBP, HEIC, MP4, MOV, AVI, MKV)
- **Automatic deduplication** — same file uploaded twice? Only stored once (SHA-256 hash)
- **EXIF metadata extraction** — date, GPS, camera model, aperture, ISO, shutter speed
- **Background thumbnail generation** — Small / Medium / Large WebP via Celery workers
- **Non-destructive** — originals are never modified

### 🗂️ Organization
- **Timeline view** — chronological grid grouped by month/year
- **Albums** — create, edit, share, and delete photo collections
- **Smart Categories** — Favourites, Videos, Screenshots, Recently Added
- **Album sharing** — generate public share links, revoke anytime
- **Drag photo into albums** — multi-select & batch add

### 🔍 Search
- **Full-text search** — filename, title, description, tags
- **Syntax search** — `type:video`, `taken:2023`, `tag:holiday`, `camera:iPhone`, `album:Japan`
- **Date range** — `taken:2023-01-01..2023-06-30`
- **Filter chips** — one-click filters for Photos, Videos, Favourites, This Year

### 🗺️ Map View
- Interactive **Leaflet.js map** with OpenStreetMap tiles
- All geotagged photos as clickable photo markers
- Click a marker → see thumbnail popup with date

### 💡 Smart Features
- **"On This Day" memories** — horizontal strip of past photos taken on today's date
- **Favourites** — heart any photo, browse your starred collection
- **Inline metadata editing** — edit title and tags directly in the lightbox
- **Video preview cards** — native browser-rendered first frame + play button overlay

### 🎨 UI / UX
- **Apple Photos + Vercel aesthetic** — clean, minimal, premium design
- **Collapsible sidebar** — icon-only mode with smooth animation
- **Dark/Light mode** — auto-detected from OS preference
- **Lightbox viewer** — fullscreen, zoom, keyboard navigation (←/→/Esc), EXIF panel
- **Video playback** in lightbox
- **GPS link** — click coordinates to open in Google Maps
- **Context-aware uploads** — Videos page opens video-only file picker

### 🔐 Security
- **JWT authentication** — secure login/register
- **Per-user isolation** — users only see their own photos
- **Token-authenticated thumbnails** — images require valid session

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      LensVault                          │
│                                                         │
│   ┌──────────┐    ┌──────────┐    ┌────────────────┐   │
│   │  React   │───▶│ FastAPI  │───▶│  PostgreSQL 15 │   │
│   │  Vite    │    │  Python  │    │                │   │
│   └──────────┘    └────┬─────┘    └────────────────┘   │
│                        │                                │
│              ┌─────────┴──────────┐                     │
│              │                    │                     │
│         ┌────▼────┐          ┌────▼────┐               │
│         │  Redis  │◀────────▶│ Celery  │               │
│         │ (Queue) │          │(Workers)│               │
│         └─────────┘          └────┬────┘               │
│                                   │                     │
│                         ┌─────────▼──────────┐          │
│                         │   /vault/ Storage   │         │
│                         │  originals/         │         │
│                         │  thumbnails/        │         │
│                         └────────────────────┘          │
└─────────────────────────────────────────────────────────┘
```

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Vanilla CSS |
| Backend | FastAPI (Python 3.11) |
| Database | PostgreSQL 15 |
| Job Queue | Celery + Redis |
| Thumbnails | Pillow → WebP (240px / 720px / 1440px) |
| Auth | JWT (python-jose + passlib bcrypt) |
| Map | Leaflet.js + OpenStreetMap |

---

## 🚀 Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) + [Docker Compose](https://docs.docker.com/compose/)
- Git

### 1. Clone the repository

```bash
git clone https://github.com/WTC-final-round/final-round-team-explorers.git
cd final-round-team-explorers
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL=postgresql://lensvault:lensvault@db:5432/lensvault
REDIS_URL=redis://redis:6379/0
SECRET_KEY=your-secret-key-change-this-in-production
STORAGE_PATH=/vault
CORS_ORIGINS=http://localhost:5173
```

> **Tip:** Generate a strong secret key with `openssl rand -hex 32`

### 3. Start LensVault

```bash
docker compose up --build
```

First run takes 2–3 minutes to pull images and build containers.

### 4. Open the app

| Service | URL |
|---|---|
| **LensVault Web UI** | http://localhost:5173 |
| **API Docs (Swagger)** | http://localhost:8000/docs |
| **API Health Check** | http://localhost:8000/health |

Register your account and start uploading photos! 🎉

---

## 📂 Project Structure

```
lensvault/
├── backend/
│   ├── app/
│   │   ├── api/            # Route handlers
│   │   │   ├── auth.py     # Login, register, JWT
│   │   │   ├── photos.py   # Upload, list, smart filters, stats
│   │   │   ├── albums.py   # CRUD, share tokens
│   │   │   └── search.py   # Full-text + metadata search
│   │   ├── models/         # SQLAlchemy ORM models
│   │   ├── schemas/        # Pydantic response schemas
│   │   ├── utils/          # EXIF, hashing, storage helpers
│   │   └── workers/        # Celery thumbnail tasks
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Timeline.jsx    # Main photo grid + memories
│       │   ├── Albums.jsx      # Album list
│       │   ├── AlbumDetail.jsx # Album view + share
│       │   ├── Favourites.jsx  # Starred photos
│       │   ├── Videos.jsx      # Video smart category
│       │   ├── Search.jsx      # Search + filter chips
│       │   ├── MapView.jsx     # Leaflet map
│       │   ├── Settings.jsx    # Stats + system info
│       │   ├── Login.jsx
│       │   └── Register.jsx
│       ├── components/
│       │   ├── Navbar.jsx      # Collapsible sidebar
│       │   ├── ProtectedRoute.jsx  # Layout + upload panel
│       │   ├── Lightbox.jsx    # Fullscreen viewer
│       │   ├── PhotoGrid.jsx   # Month-grouped grid
│       │   ├── PhotoCard.jsx   # Individual photo/video card
│       │   └── UploadZone.jsx  # Drag & drop upload
│       ├── services/
│       │   └── api.js          # Axios API client
│       └── index.css           # Design system (CSS variables)
│
└── docker-compose.yml
```

---

## 🔌 API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/token` | Login → JWT token |
| `GET` | `/api/auth/me` | Get current user |

### Photos
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/photos/upload` | Upload photo/video |
| `GET` | `/api/photos/` | List photos (paginated) |
| `GET` | `/api/photos/?filter=favourites` | Smart filter |
| `GET` | `/api/photos/memories` | "On This Day" |
| `GET` | `/api/photos/geotagged` | GPS-tagged photos |
| `GET` | `/api/photos/stats` | Library statistics |
| `GET` | `/api/photos/{id}/thumbnail/{size}` | WebP thumbnail |
| `GET` | `/api/photos/{id}/original` | Download original |
| `PATCH` | `/api/photos/{id}/favourite` | Toggle favourite |
| `PATCH` | `/api/photos/{id}/metadata` | Edit title/tags |
| `DELETE` | `/api/photos/{id}` | Delete photo |

### Albums
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/albums/` | List albums |
| `POST` | `/api/albums/` | Create album |
| `GET` | `/api/albums/{id}` | Album + photos |
| `PATCH` | `/api/albums/{id}` | Update album |
| `DELETE` | `/api/albums/{id}` | Delete album |
| `POST` | `/api/albums/{id}/photos` | Add photos (batch) |
| `DELETE` | `/api/albums/{id}/photos/{photoId}` | Remove photo |
| `POST` | `/api/albums/{id}/share` | Generate/revoke share link |

### Search
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/search/?q=...` | Search with query |

**Search syntax examples:**
```
tag:holiday
type:video
taken:2023
taken:2023-01-01..2023-06-30
camera:iPhone
album:Japan
favourite:true
sunset beach        ← free text (filename, title, description)
```

---

## 🔧 Configuration

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://...` | PostgreSQL connection string |
| `REDIS_URL` | `redis://redis:6379/0` | Redis for Celery |
| `SECRET_KEY` | — | JWT signing secret (**change in production!**) |
| `STORAGE_PATH` | `/vault` | Where originals and thumbnails are stored |
| `CORS_ORIGINS` | `http://localhost:5173` | Allowed frontend origins |

---

## 🗺️ Roadmap

| Feature | Status |
|---|---|
| Photo & Video Upload | ✅ Done |
| EXIF Extraction | ✅ Done |
| Thumbnail Generation | ✅ Done |
| Timeline View | ✅ Done |
| Albums with Sharing | ✅ Done |
| Smart Categories | ✅ Done |
| Full-Text Search | ✅ Done |
| Map View (Leaflet) | ✅ Done |
| "On This Day" Memories | ✅ Done |
| Lightbox with Metadata Edit | ✅ Done |
| Collapsible Sidebar | ✅ Done |
| OCR Text Search | 🔜 Planned |
| AI Face Grouping | 🔜 Planned (opt-in) |
| Semantic Search (CLIP) | 🔜 Planned |
| Mobile PWA | 🔜 Planned |

---

## 📄 License

MIT License — see [LICENSE](LICENSE)

---

<div align="center">
  <sub>Built with ❤️ for Watch The Code 2026 · Team Explorers</sub>
</div>
