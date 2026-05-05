# 📁 Dobby Ads

A full-stack image management application with folder organization, secure authentication, and AI integration.

![Dobby Ads](https://img.shields.io/badge/version-1.0.0-blue) ![React](https://img.shields.io/badge/React-19.x-61dafb) ![Node.js](https://img.shields.io/badge/Node.js-18+-339933)

## 🚀 Features

- JWT Authentication (signup, login, logout)
- Nested Folders (recursive structure like Google Drive)
- Folder Size (includes all nested images)
- Image Upload (with name)
- User-specific access
- AI Chat Assistant (in-app natural language)
- MCP Server (Claude Desktop integration)

## 🛠️ Quick Start

### Backend
```bash
cd dobby-ads-backend
npm install
npm start
```

### Frontend
```bash
cd dobby-ads-frontend
npm install
npm start
```

## 🤖 AI Chat

Click **🤖 AI** button in header.

Commands:
- "Create folder [name]"
- "List folders"
- "Delete folder [name]"

## 📝 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/signup | Register |
| POST | /api/auth/login | Login |
| GET | /api/folders | List folders |
| POST | /api/folders | Create folder |
| DELETE | /api/folders/:id | Delete folder |
| POST | /api/images/upload | Upload image |
| GET | /api/images/folder/:id | List images |
| GET | /api/health | Health check |

## 🔗 Links

- **Live App**: https://dobby-ads-frontend.vercel.app
- **Frontend GitHub**: https://github.com/Snehaail11/dobby-ads-frontend
- **Backend GitHub**: https://github.com/Snehaail11/dobby-ads-backend

## 📊 Tech Stack

- Frontend: React 19 + React Router
- Backend: Express.js + MongoDB + Mongoose
- Auth: JWT + bcrypt
- Storage: Supabase

## 📄 License

ISC - Dobby Ads Team