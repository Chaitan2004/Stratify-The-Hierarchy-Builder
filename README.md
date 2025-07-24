# Stratify Community Platform

A modern, microservices-based community application built with React, Flask, and Neo4j, featuring secure JWT authentication, real-time notifications, and a beautiful, responsive UI.

---

## Features

- **User Management**
  - Registration, email verification, sign-in, sign-out
  - Username and password update, forgot/reset password
  - JWT-based authentication (Authorization header)
- **Community Features**
  - Register/search communities, join/leave/request membership
  - View your communities, see community trees (leader + `CHILD_OF` relationships)
  - Display all community members, delete communities (leader only)
  - Remove members or user nodes from the tree (leader or self)
  - Register new communities
  - Construct and visualize hierarchical community trees
  - View detailed information about other members in the community
- **Notifications**
  - Real-time join requests and system notifications
- **UI/UX**
  - Modern, responsive design with professional animations
  - Interactive SVG tree with panning, zoom, recenter, and relationship arrows
  - Node profile modal, context menus, and conditional button visibility
- **AI Assistant**
  - In-app CopilotKit AI assistant (OpenAI/Ollama/CopilotKit Cloud)
  - Context-aware suggestions based on current app tab
- **Microservices Architecture**
  - User, Community, and Notification services communicate via HTTP APIs
  - No direct DB access between services
- **Database**
  - Single Neo4j instance with unique node labels per service
  - Redis (Upstash) for temporary token storage (email/password reset)
- **Deployment**
  - Ready for Render.com (Docker support, environment variables)
  - Environment-based config for local and production

---

## Tech Stack

- **Frontend:** React, Tailwind CSS, Vite
- **Backend:** Flask (Python), Flask-CORS
- **Database:** Neo4j (graph), Redis (Upstash, for tokens)
- **Authentication:** JWT (Bearer tokens, no cookies)
- **Notifications:** Microservice with Neo4j
- **AI:** CopilotKit (OpenAI, Ollama, CopilotKit Cloud)
- **Deployment:** Docker, Render.com

---

## Project Structure

```
TCA/
  community-service/
    app.py
    community_routes.py
    requirements.txt
  notification-service/
    app.py
    notification_routes.py
    requirements.txt
    utils.py
  user-service/
    app.py
    user_routes.py
    auth_utils.py
    email_utils.py
    redis_store.py
    requirements.txt
  frontend-app/
    src/
      components/
      pages/
      App.jsx
      main.jsx
    public/
    package.json
    tailwind.config.js
  README.md
```

---

## Getting Started

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd TCA
```

### 2. Environment Variables

Create `.env` files in each backend service directory (`user-service`, `community-service`, `notification-service`) with:

```
NEO4J_URI=bolt://<your-neo4j-host>
NEO4J_USER=<neo4j-username>
NEO4J_PASSWORD=<neo4j-password>
SECRET_KEY=<your-jwt-secret>
COMMUNITY_URL=http://localhost:5001
USER_URL=http://localhost:5002
NOTIFY_URL=http://localhost:5003
FRONTEND_URL=http://localhost:5173
REDIS_URL=<your-upstash-redis-url>
REDIS_TOKEN=<your-upstash-redis-token>
```

For the frontend, use `.env` in `frontend-app/`:

```
VITE_COMMUNITY_SERVICE=http://localhost:5001
VITE_USER_SERVICE=http://localhost:5002
VITE_NOTIFICATION_SERVICE=http://localhost:5003
VITE_FRONTEND=http://localhost:5173
```

### 3. Install Dependencies

#### Backend (for each service):

```bash
cd user-service
pip install -r requirements.txt
cd ../community-service
pip install -r requirements.txt
cd ../notification-service
pip install -r requirements.txt
```

#### Frontend

```bash
cd frontend-app
npm install
```

### 4. Run the Services

#### Backend

```bash
# In separate terminals for each service:
cd user-service && flask run --port 5002
cd community-service && flask run --port 5001
cd notification-service && flask run --port 5003
```

#### Frontend

```bash
cd frontend-app
npm run dev
```

---

## API Authentication

All API requests require a JWT in the `Authorization` header:

```http
Authorization: Bearer <token>
```

---

## Important Note About Server Stability

- The backend servers are not always stable and may occasionally return server errors, especially if you access the web app from the Vercel domain.
- If you encounter a server error, simply retry your action. This is a known issue due to the current hosting setup.

---