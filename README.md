# PlantLog-MERN: Industrial E-Logbook & Asset Registry 🏭⚙️

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](#)
[![React](https://img.shields.io/badge/React-18-blue)](#)
[![Node.js](https://img.shields.io/badge/Node.js-18-green)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](#)
[![Docker](https://img.shields.io/badge/Docker-Enabled-blue)](#)
[![License](https://img.shields.io/badge/License-MIT-green)](#)

A production-ready, highly scalable, and containerized **MERN Stack** application designed specifically for industrial environments. PlantLog-MERN helps manufacturing plants and factories manage their asset registries and track maintenance, operations, and incident logs with precision.

---

## 📸 Application Demo

See the full platform in action! This walkthrough demonstrates secure authentication, the real-time statistical dashboard, the comprehensive asset registry, and detailed maintenance logging capabilities.

https://github.com/user-attachments/assets/demo.mp4  *(Note: Replace with standard GitHub video upload when published)*

> 💡 **Tip:** You can view the raw `.mp4` demo video located at `docs/demo.mp4` in this repository.

---

## 🌟 Key Features

*   **Asset Management**: Register, track, and manage industrial machinery, vehicles, and precision equipment.
*   **Maintenance Logs**: Detailed chronological logging of maintenance, daily operations, critical incident reports, and safety inspections.
*   **Real-time Dashboard**: Actionable overview of system status and quick access to operational metrics.
*   **Role-Based Access Control (RBAC)**: Secure authentication and authorization (Admin vs. Operator views).
*   **Fully Containerized**: Seamlessly run the entire stack (Frontend, Backend, Database) using Docker Compose.
*   **Modern UI**: Built with React, Tailwind CSS, and Lucide React icons for a premium user experience.

---

## 🖼️ System Walkthrough

### 1. Unified Dashboard
A high-level overview providing instant insights into system health, total active assets, and pending maintenance tasks.
![Dashboard View](docs/dashboard.png)

### 2. Asset Registry
A comprehensive catalog of all industrial equipment, complete with dynamic filtering, real-time status badges, and precise location tracking.
![Asset Registry View](docs/assets.png)

### 3. Maintenance & Incident Logs
Detailed, chronological records of all factory floor activities, enabling rapid response to incidents and proactive maintenance tracking.
![Maintenance Logs View](docs/logs.png)

---

## 🛠️ Technology Stack

### Frontend (Client)
*   **Framework**: React (Vite)
*   **Language**: TypeScript
*   **State Management**: Zustand (Persisted Auth Store, Asset Store, Log Store)
*   **Styling**: Tailwind CSS
*   **Icons**: Lucide React
*   **HTTP Client**: Axios (with Interceptors)

### Backend (Server)
*   **Environment**: Node.js
*   **Framework**: Express.js
*   **Language**: TypeScript
*   **Database**: MongoDB (via Mongoose ODM)
*   **Authentication**: JSON Web Tokens (JWT) & `bcryptjs`
*   **Security**: Helmet, CORS

### Infrastructure
*   **Containerization**: Docker & Docker Compose
*   **Web Server**: Nginx (for serving the optimized frontend build)

---

## 🚀 Getting Started

### Prerequisites
*   [Docker](https://docs.docker.com/get-docker/) installed and running.
*   [Docker Compose](https://docs.docker.com/compose/install/) installed.

### Installation & Running

1. **Clone the repository:**
   ```bash
   git clone https://github.com/senanurcetin/PlantLog-MERN.git
   cd PlantLog-MERN
   ```

2. **Start the application using Docker Compose:**
   ```bash
   docker-compose up -d --build
   ```

3. **Access the Application:**
   *   **Frontend**: `http://localhost:8081`
   *   **Backend API**: `http://localhost:5000/api`

### Default Admin Credentials
To access the pre-seeded admin account (if you ran the included seed script):
*   **Email**: `senanur.cetin.work@gmail.com`
*   **Password**: `senanur123.`

---

## 🛡️ Security & Best Practices
*   **Passwords**: Hashed securely using `bcryptjs` before storage.
*   **Tokens**: Secure JWT-based authentication on protected routes.
*   **Interceptors**: Axios interceptors automatically handle token injection and `401 Unauthorized` responses.
*   **TypeScript**: Strict typing across both backend and frontend to catch errors at compile-time.

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

---
*Architected and developed as a complete Full-Stack industrial solution.*
