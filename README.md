# Persistent To-Do Application 🚀

A full-stack To-Do web application built using **Python (Flask)**, **Node.js (Express)**, and **Supabase Cloud Storage** persistence.

---

## 🌟 Key Features

- **End-to-End Cloud Persistence**: All task changes are saved directly to your Supabase Storage bucket (`To-Do data`) in real-time. If you stop, restart, or reboot your server, all your tasks remain safely stored and immediately re-synced!
- **Dual Server Architecture**:
  - **Backend (Python & Flask)**: Exposes REST APIs, manages business logic, validates inputs, and connects to Supabase Storage.
  - **Frontend (Node.js & Express)**: Serves static assets, proxies `/api` calls to Flask, and powers the client-side experience.
- **Rich Task Attributes**:
  - Task Title & Multiline Description / Notes
  - Priority levels with color-coded badges (`Urgent`, `High`, `Medium`, `Low`)
  - Categories (`Work`, `Personal`, `Shopping`, `Health`, `Learning`, `Finance`, `General`)
  - Due date tracking with automatic overdue indicators
  - Custom tag labels (`#tag`)
- **Dashboard & Productivity Stats**:
  - Dynamic progress bar tracking task completion rate
  - Live count of Total, Pending, and Completed tasks
- **Search & Filtering**:
  - Real-time instant search across titles, descriptions, and tags
  - Status tabs (`All`, `Active`, `Completed`)
  - Dropdown filter by Category and Priority
  - Clear Completed bulk action
- **Supabase Cloud Sync Pill**:
  - Real-time indicator displaying the connected Supabase bucket (`To-Do data`)
  - Manual "Sync Now" button to pull cloud state anytime

---

## 🛠️ Project Structure

```
To-do Application/
├── backend/
│   ├── .env                    # Supabase credentials & configuration
│   ├── app.py                  # Flask REST API server (Port 5000)
│   ├── supabase_service.py     # Supabase Storage client & bucket synchronization
│   ├── requirements.txt        # Python dependencies
│   └── data/                   # Local cache directory (resilience fallback)
├── frontend/
│   ├── package.json            # Node.js dependencies (Express, CORS)
│   ├── server.js               # Node.js frontend server & API proxy (Port 3000)
│   └── public/
│       ├── index.html          # Web application UI markup
│       ├── style.css           # Modern styles & animations
│       └── app.js              # Client state, API interactions & Lucide icons
├── package.json                # Root package for running npm scripts
├── run.py                      # Multi-server launcher (Flask + Node.js)
├── start.bat                   # Windows batch file for 1-click startup
└── README.md                   # Documentation
```

---

## 🚀 Quick Start

### 1. Requirements
- Python 3.10+
- Node.js 18+

### 2. Start the Application
Run one of the following commands from the root directory:

**Using Python:**
```bash
python run.py
```

**Or using npm:**
```bash
npm start
```

**Or on Windows:**
Double-click `start.bat`.

### 3. Open in Browser
Visit **[http://localhost:3000](http://localhost:3000)** in your browser!

---

## 🔒 Supabase Configuration

Configured in `backend/.env`:
- **Project URL**: `https://umpbqnhegxtwigkstzvv.supabase.co`
- **Bucket**: `To-Do data`
- **Key**: Secret service key used for authenticated read/write access to the storage bucket.
