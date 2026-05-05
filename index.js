import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import axios from 'axios';
import readline from 'readline';

const API_BASE = process.env.DOBBY_API_URL || 'https://dobby-ads-backend-fu75.onrender.com/api';

let authToken = process.env.DOBBY_AUTH_TOKEN || null;
let currentUser = null;

const rl = readline.createInterface({ input: process.stdin, output: process.stderr });

function askQuestion(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function authenticate() {
  console.error('\n╔════════════════════════════════╗');
  console.error('║     DOBBY ADS MCP SERVER      ║');
  console.error('╚════════════════════════════════╝');
  console.error('');
  
  const email = await askQuestion('Email: ');
  const password = await askQuestion('Password: ');
  
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, { email, password });
    if (response.data.success) {
      authToken = response.data.token;
      currentUser = response.data.user;
      console.error(`✓ Logged in as ${currentUser?.email || email}`);
      rl.close();
      return;
    }
  } catch (error) {
    console.error('Login failed:', error.response?.data?.message || error.message);
    process.exit(1);
  }
}

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  if (authToken) config.headers['x-auth-token'] = authToken;
  return config;
});

const tools = [
  {
    name: 'login',
    description: '🔐 Authenticate with Dobby Ads.',
    inputSchema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'Your email' },
        password: { type: 'string', description: 'Your password' }
      },
      required: ['email', 'password']
    }
  },
  {
    name: 'logout',
    description: '🔓 Logout and clear session.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'get_user_info',
    description: '👤 Get current user info.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'list_folders',
    description: '📁 List all folders.',
    inputSchema: {
      type: 'object',
      properties: { parentFolderId: { type: 'string', description: 'Parent folder ID' } }
    }
  },
  {
    name: 'create_folder',
    description: '➕ Create a new folder.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Folder name' },
        parentFolderId: { type: 'string', description: 'Parent folder ID' }
      },
      required: ['name']
    }
  },
  {
    name: 'rename_folder',
    description: '✏️ Rename a folder.',
    inputSchema: {
      type: 'object',
      properties: {
        folderId: { type: 'string', description: 'Folder ID' },
        name: { type: 'string', description: 'New name' }
      },
      required: ['folderId', 'name']
    }
  },
  {
    name: 'delete_folder',
    description: '🗑️ Delete a folder.',
    inputSchema: {
      type: 'object',
      properties: {
        folderId: { type: 'string', description: 'Folder ID' }
      },
      required: ['folderId']
    }
  },
  {
    name: 'list_images',
    description: '🖼️ List images in a folder.',
    inputSchema: {
      type: 'object',
      properties: { folderId: { type: 'string', description: 'Folder ID' } },
      required: ['folderId']
    }
  },
  {
    name: 'get_folder_size',
    description: '📊 Get folder size.',
    inputSchema: {
      type: 'object',
      properties: { folderId: { type: 'string', description: 'Folder ID' } },
      required: ['folderId']
    }
  }
];

function formatSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

async function handleTool(name, args) {
  try {
    switch (name) {
      case 'login': {
        const response = await api.post('/auth/login', { email: args.email, password: args.password });
        if (response.data.success) {
          authToken = response.data.token;
          currentUser = response.data.user;
          return { content: [{ type: 'text', text: `✅ Logged in as ${currentUser?.email || args.email}` }] };
        }
        throw new Error('Login failed');
      }
      case 'logout':
        authToken = null;
        currentUser = null;
        return { content: [{ type: 'text', text: '✅ Logged out' }] };
      case 'get_user_info': {
        const response = await api.get('/auth/me');
        const user = response.data.user;
        return { content: [{ type: 'text', text: `👤 ${user?.email}\nID: ${user?._id}\nJoined: ${formatDate(user?.createdAt)}` }] };
      }
      case 'list_folders': {
        const response = await api.get('/folders', { params: { parentFolderId: args.parentFolderId || null } });
        const folders = response.data.folders || [];
        if (folders.length === 0) return { content: [{ type: 'text', text: '📁 No folders found' }] };
        const text = folders.map(f => `📁 ${f.name} (ID: ${f._id})`).join('\n');
        return { content: [{ type: 'text', text }] };
      }
      case 'create_folder': {
        const response = await api.post('/folders', { name: args.name, parentFolderId: args.parentFolderId || null });
        const folder = response.data.folder;
        return { content: [{ type: 'text', text: `✅ Created "${folder.name}" (ID: ${folder._id})` }] };
      }
      case 'rename_folder':
        await api.put(`/folders/${args.folderId}`, { name: args.name });
        return { content: [{ type: 'text', text: `✅ Renamed to "${args.name}"` }] };
      case 'delete_folder':
        await api.delete(`/folders/${args.folderId}`);
        return { content: [{ type: 'text', text: '✅ Deleted folder' }] };
      case 'list_images': {
        const response = await api.get(`/images/folder/${args.folderId}`);
        const images = response.data.images || [];
        if (images.length === 0) return { content: [{ type: 'text', text: '🖼️ No images found' }] };
        const text = images.map(img => `🖼️ ${img.name} (${img.sizeFormatted})`).join('\n');
        return { content: [{ type: 'text', text }] };
      }
      case 'get_folder_size': {
        const response = await api.get(`/folders/${args.folderId}/size`);
        return { content: [{ type: 'text', text: `📊 Size: ${response.data.sizeFormatted}` }] };
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return { content: [{ type: 'text', text: `❌ ${error.response?.data?.message || error.message}` }] };
  }
}

class DobbyAdsServer {
  constructor() {
    this.server = new Server(
      { name: 'dobby-ads', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    this.setupHandlers();
  }

  setupHandlers() {
    this.server.setRequestHandler('tools/list', async () => ({ tools }));
    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;
      return await handleTool(name, args);
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

async function main() {
  await authenticate();
  const server = new DobbyAdsServer();
  await server.start();
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});