# 📁 Dobby Ads

A full-stack image management application with folder organization, secure authentication, and AI integration via MCP (Model Context Protocol).

![Dobby Ads](https://img.shields.io/badge/version-1.0.0-blue) ![React](https://img.shields.io/badge/React-19.x-61dafb) ![Node.js](https://img.shields.io/badge/Node.js-18+-339933)

## 🚀 Features

### Backend (Express + MongoDB)
- **Secure Authentication** - JWT-based auth with bcrypt password hashing
- **Folder Organization** - Nested folder structure with breadcrumb navigation
- **Image Management** - Upload, view, delete images via Supabase storage
- **Rate Limiting** - Protection against brute-force attacks
- **CORS Security** - Configurable allowed origins
- **Health Checks** - API health endpoint with system metrics
- **Request Logging** - Morgan logging in development
- **MCP Server** - Claude Desktop integration for AI commands

### Frontend (React 19)
- **Modern UI** - Clean, responsive dashboard with Inter font
- **Drag & Drop** - Move images between folders
- **Context Menus** - Right-click actions on folders
- **Lightbox** - Full-screen image viewing
- **Loading States** - Visual feedback during operations
- **Error Handling** - Toast notifications for errors
- **AI Chat Assistant** - Built-in AI for natural language commands

### AI Chat (In-App)
- **Natural Language** - Type commands in plain English
- **Easy Access** - Click 🤖 AI button in header
- **Commands** - Create folders, list files, delete items
- **Real-time** - Executes immediately via API

### MCP Server (Claude Desktop)
- **AI Integration** - Natural language folder management
- **Session Management** - Persistent authentication
- **Comprehensive Tools** - Full API coverage
- **Rich Responses** - Formatted output for AI understanding

## 📁 Project Structure

```
dobby-ads/
├── dobby-ads-backend/      # Express API server + MCP
│   ├── controllers/       # Route handlers
│   ├── middleware/       # Auth, validation
│   ├── models/           # Mongoose schemas
│   ├── routes/          # API endpoints
│   ├── index.js         # MCP server entry
│   └── server.js        # REST API entry
│
├── dobby-ads-frontend/    # React web app
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── context/     # Auth context
│   │   └── services/   # API client
│   └── public/          # Static assets
│
└── docker-compose.yml    # Docker deployment
```

## 🛠️ Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Supabase account (for image storage)

### Backend Setup

```bash
cd dobby-ads-backend
cp .env.example .env
# Edit .env with your credentials

npm install
npm start        # REST API
# or
npm run mcp     # MCP server for Claude Desktop
```

Backend runs at `http://localhost:5000`

### Frontend Setup

```bash
cd dobby-ads-frontend
npm install
npm start
```

Frontend runs at `http://localhost:3000`

## 🤖 MCP Integration

## 🤖 AI Integration

### Option 1: In-App AI Chat (Recommended)

Open the app and click the **🤖 AI** button in the header to open the chat assistant.

**Available Commands:**
| Command | Example |
|---------|---------|
| Create folder | "Create folder Marketing" |
| List folders | "List folders" |
| Delete folder | "Delete folder Old" |
| Show images | "Show images in [folder]" |

### Option 2: MCP Server (Claude Desktop)

Add to `%APPDATA%\Claude\mcp.json`:

```json
{
  "mcpServers": {
    "dobby-ads": {
      "command": "node",
      "args": ["path/to/dobby-ads-backend/index.mjs"],
      "env": {
        "DOBBY_API_URL": "https://dobby-ads-backend-fu75.onrender.com/api"
      }
    }
  }
}
```

### Terminal MCP

Run locally:
```bash
cd dobby-ads-backend
npm run mcp
```

### Available Tools

| Tool | Description |
|------|-------------|
| `login` | Authenticate with email/password |
| `list_folders` | Browse directory structure |
| `create_folder` | Create new folder |
| `rename_folder` | Rename folder |
| `delete_folder` | Delete folder and contents |
| `list_images` | View images in folder |
| `get_folder_size` | Check storage usage |
| `search_files` | Find files by name |

### Example Commands

- "Create a folder called Marketing inside Projects"
- "Show me all images in the Campaigns folder"
- "What's the total size of my Marketing folder?"

## 📝 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/signup | Register new user |
| POST | /api/auth/login | Login user |
| GET | /api/auth/me | Get current user |

### Folders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/folders | List folders |
| POST | /api/folders | Create folder |
| PUT | /api/folders/:id | Rename folder |
| DELETE | /api/folders/:id | Delete folder |

### Images
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/images/upload | Upload image |
| GET | /api/images/folder/:folderId | List images |
| DELETE | /api/images/:id | Delete image |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/health | System health |
| GET | /api | API documentation |

## 🔧 Environment Variables

### Backend (.env)
```env
MONGODB_URI=mongodb://localhost:27017/dobby-ads
JWT_SECRET=your-secret-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
PORT=5000
```

## 🐳 Docker Deployment

```bash
docker-compose up -d
```

## 📊 Tech Stack

- Express.js 5.x + MongoDB + JWT + Supabase
- React 19 + Axios + React Router
- @modelcontextprotocol/sdk
