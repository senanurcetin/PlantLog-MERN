# Industrial E-Logbook & Asset Registry Platform 🏭⚙️

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![React](https://img.shields.io/badge/React-18-blue)
![Node.js](https://img.shields.io/badge/Node.js-18-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Docker](https://img.shields.io/badge/Docker-Enabled-blue)
![License](https://img.shields.io/badge/License-MIT-green)

A production-ready, highly scalable, and containerized **MERN Stack** application designed for industrial environments to manage asset registries and track maintenance logs. 

Built from the ground up with a focus on modern UI/UX, robust state management, and strict TypeScript integration.

## 🌟 Key Features

*   **Asset Management**: Register, track, and manage industrial machinery, vehicles, and equipment.
*   **Maintenance Logs**: Detailed chronological logging of maintenance, operations, incident reports, and safety inspections.
*   **Real-time Dashboard**: Overview of system status and quick access to operational metrics.
*   **Role-Based Access Control (RBAC)**: Secure authentication and authorization (Admin vs. Operator views).
*   **Fully Containerized**: Seamlessly run the entire stack (Frontend, Backend, Database) using Docker Compose.
*   **Modern UI**: Built with React, Tailwind CSS, and Lucide React icons for a premium user experience.

## 🛠️ Technology Stack

### Frontend (Client)
*   **Framework**: React (Vite)
*   **Language**: TypeScript
*   **State Management**: Zustand (Persisted Auth Store, Asset Store, Log Store)
*   **Styling**: Tailwind CSS
*   **Icons**: Lucide React
*   **Routing**: React Router DOM v6
*   **HTTP Client**: Axios (with Interceptors)

### Backend (Server)
*   **Environment**: Node.js
*   **Framework**: Express.js
*   **Language**: TypeScript
*   **Database**: MongoDB (via Mongoose ODM)
*   **Authentication**: JSON Web Tokens (JWT) & bcryptjs
*   **Security**: Helmet, CORS

### Infrastructure
*   **Containerization**: Docker & Docker Compose
*   **Web Server**: Nginx (for serving the optimized frontend build)

## 🏗️ Project Architecture

```
industrial-elogbook/
├── backend/               # Node.js Express API
│   ├── src/
│   │   ├── controllers/   # Business logic
│   │   ├── middlewares/   # Auth & Error handling
│   │   ├── models/        # Mongoose schemas (Asset, LogEntry, User)
│   │   ├── routes/        # API endpoints
│   │   ├── utils/         # Helpers (e.g., JWT generator)
│   │   └── app.ts         # Express server setup
│   ├── Dockerfile         # Multi-stage build for backend
│   └── package.json
├── frontend/              # React Vite Application
│   ├── src/
│   │   ├── components/    # Reusable UI (Layout, Modals)
│   │   ├── pages/         # Route views (Dashboard, Assets, Logs, Login)
│   │   ├── services/      # Axios API configuration
│   │   ├── store/         # Zustand state slices
│   │   └── App.tsx        # App entry
│   ├── nginx.conf         # Nginx production config
│   ├── Dockerfile         # Multi-stage build (Node builder -> Nginx server)
│   └── package.json
└── docker-compose.yml     # Orchestration for MongoDB, Backend, and Frontend
```

## 🚀 Getting Started

### Prerequisites
*   [Docker](https://docs.docker.com/get-docker/) installed and running.
*   [Docker Compose](https://docs.docker.com/compose/install/) installed.

### Installation & Running

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/industrial-elogbook.git
   cd industrial-elogbook
   ```

2. **Start the application using Docker Compose:**
   ```bash
   docker-compose up -d --build
   ```

3. **Access the Application:**
   *   **Frontend**: `http://localhost:8081`
   *   **Backend API**: `http://localhost:5000/api`

### Default Credentials
To access the pre-seeded admin account (if you ran the seed script):
*   **Email**: `senanur.cetin.work@gmail.com`
*   **Password**: `senanur123.`

## 🛡️ Security & Best Practices
*   **Passwords**: Hashed securely using `bcryptjs` before storage.
*   **Tokens**: Secure JWT-based authentication on protected routes.
*   **Interceptors**: Axios interceptors automatically handle token injection and `401 Unauthorized` responses.
*   **TypeScript**: Strict typing across both backend and frontend to catch errors at compile-time.

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

---
*Architected and developed as a complete Full-Stack solution.*
