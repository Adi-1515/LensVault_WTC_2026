<div align="center">

# ◈ LensVault

### A privacy-first, self-hosted photo library that runs entirely on your own hardware.

<br/>





![Docker](https://img.shields.io/badge/Docker-v24.0+-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![FastAPI](https://img.shields.io/badge/FastAPI-Latest-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)

<br/>

*Built for **Watch The Code 2026** • Graphic Era Hill University, Haldwani Campus*

</div>

---

## 📸 Visual Demo

> **Hackathon Judges:** Please view our video demonstration below.

https://github.com/user-attachments/assets/0badd42e-cd03-44be-bd52-76d2d7cee030

---

## 🚀 Prerequisites

Because LensVault is **fully containerized**, you do not need to install any dependencies on your local machine. You only need:

| Tool | Version |
|------|---------|
| 🐳 Docker | v24.0+ |
| 🔧 Docker Compose | v2.20+ |
| 🌿 Git | Latest |

> **Note:** For local development *outside* of Docker, you would additionally need **Node.js v20+** and **Python 3.11+**.

---

## 🛠️ Installation & Setup

Get your personal photo vault running in seconds with a single command.

### 1. Clone the Repository

```bash
git clone https://github.com/WTC-Group-4/wtc-round-2-group-4-nextgen-solvers.git
```

### 2. Configure Environment Variables

Copy the template environment file. The default values are **pre-configured** for the Docker setup.

```bash
cp .env.example .env
```

### 3. Spin Up the Infrastructure

```bash
docker compose up --build
```

### 4. Access the Application

| Service | URL | Description |
|---------|-----|-------------|
| 🖥️ Frontend UI | [http://localhost:5173](http://localhost:5173) | Main application interface |
| 📡 Backend API Docs | [http://localhost:8000/docs](http://localhost:8000/docs) | Interactive Swagger UI |

---

## ✨ Features

LensVault is built to **rival cloud providers** while keeping you in complete control of your data.

| Feature | Description |
|---------|-------------|
| 🔒 **100% Private & Self-Hosted** | No data ever leaves your local network. No subscriptions. |
| 🧠 **Smart Deduplication** | Calculates SHA-256 hash on upload — identical photos are stored only once, saving disk space. |
| 📊 **Automatic Metadata Extraction** | Parses EXIF data to extract canonical date, camera make/model, and dimensions. |
| ⚡ **Asynchronous Processing** | Uploads are lightning-fast. Heavy tasks like WebP thumbnail generation run in the background via Celery and Redis. |
| 🎨 **Glassmorphism UI** | A sleek, responsive, frosted-glass interface built with Tailwind CSS. |
| 🔍 **Advanced Search Engine** | Query your vault with powerful syntax — e.g., `taken:2024-01-01..2024-12-31`, `camera:"iPhone"`, `favourite:true`. |
| 🗂️ **Dynamic Albums** | Organize memories into custom collections without duplicating files on disk. |

---

## 💻 Tech Stack

<details>
<summary><strong>🎨 Frontend</strong></summary>

| Technology | Purpose |
|-----------|---------|
| **React 18 + Vite** | Fast HMR and optimized builds |
| **Tailwind CSS** | Utility-first styling, custom Glassmorphism theme |
| **React Router v6** | Client-side routing |
| **Axios** | API client |

</details>

<details>
<summary><strong>⚙️ Backend</strong></summary>

| Technology | Purpose |
|-----------|---------|
| **Python 3.11** | Core language |
| **FastAPI** | High-performance, async-native API framework |
| **SQLAlchemy + Alembic** | ORM and database migrations |
| **Pillow & piexif** | Image processing and metadata extraction |

</details>

<details>
<summary><strong>🏗️ Infrastructure & Data</strong></summary>

| Technology | Purpose |
|-----------|---------|
| **PostgreSQL 15** | ACID-compliant database with JSONB for flexible metadata storage |
| **Redis 7** | In-memory message broker |
| **Celery** | Distributed task queue |
| **Docker & Docker Compose** | Containerization |

</details>

---

## ⚙️ Configuration

LensVault is configured via the `.env` file. For **production deployments**,update the following variables:

| Variable | Description | Default (Docker) |
|----------|-------------|-----------------|
| `DATABASE_URL` | Postgres connection string | `postgresql://lensvault:lensvault123@db:5432/lensvault` |
| `REDIS_URL` | Redis connection string | `redis://redis:6379/0` |
| `SECRET_KEY` | JWT signing key — **must be changed in production!** | `lensvault_auuv` |
| `STORAGE_PATH` | Path where physical files are stored | `/vault` |

> ⚠️ **Security Warning:** Always rotate the `SECRET_KEY` before deploying to a production environment.

---

## 👥 Team Contributions — NextGen Solvers

| Member | Role | Key Contributions |
|--------|------|------------------|
| **Uttam** | Backend Lead | Auth, Photo Upload, EXIF, Models |
| **Akshat** | DevOps + Backend | Docker, Celery, Albums, Search |
| **Ujjwal** | Frontend Lead | Timeline, Upload UI, Lightbox |
| **Vidhisha** | Frontend Features | Auth Pages, Albums UI, Search |

---

## 📈 Benchmarking & Performance Testing

LensVault was architected to handle **massive libraries** with minimal latency.

### 🎯 Expected Performance Targets

| Metric | Target |
|--------|--------|
| Timeline initial load *(10,000 photo library)* | **< 2 seconds** |
| Photo thumbnail load *(cache warm)* | **< 100 ms** |
| Search results *(metadata, 50,000 photos)* | **< 500 ms** |
| Photo upload API response | **< 200 ms** *(original saved; thumbnail async)* |

### 🧪 How to Run Load Tests

To validate our performance metrics, we include an industry-standard **Locust** load testing script.

**Step 1 —** Install Locust in your Python environment:

```bash
pip install locust
```

**Step 2 —** Start the LensVault containers:

```bash
docker compose up -d
```

**Step 3 —** Run the load test script from the project root:

```bash
locust -f load_test/locustfile.py
```

**Step 4 —** Open the Locust web interface at [http://localhost:8089](http://localhost:8089).

Enter the number of simulated users (e.g., `100`), the spawn rate (e.g., `10`), and set the host to `http://localhost:8000`. Click **Start Swarming** to view real-time latency and throughput charts!

---

<div align="center">

*Built from 🧠 for **Watch The Code 2026** • Graphic Era Hill University, Haldwani Campus*

</div>
