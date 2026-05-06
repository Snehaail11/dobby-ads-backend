import axios from 'axios';
import readline from 'readline';

const API_BASE = process.env.DOBBY_API_URL || 'https://dobby-ads-backend-fu75.onrender.com/api';

let authToken = null;
let currentUser = null;

const rl = readline.createInterface({ input: process.stdin, output: process.stderr });

function askQuestion(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function authenticate() {
  console.error('\n=== DOBBY ADS MCP SERVER ===\n');
  const email = await askQuestion('Email: ');
  const password = await askQuestion('Password: ');
  
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, { email, password });
    if (response.data.success) {
      authToken = response.data.token;
      currentUser = response.data.user;
      console.error(`✓ Logged in as ${currentUser?.email || email}\n`);
      rl.close();
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
  { name: 'list_folders', description: 'List all folders', inputSchema: { type: 'object', properties: {} } },
  { name: 'create_folder', description: 'Create a folder', inputSchema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] } },
  { name: 'delete_folder', description: 'Delete a folder by name', inputSchema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] } },
  { name: 'list_images', description: 'List images in folder', inputSchema: { type: 'object', properties: { folderId: { type: 'string' } }, required: ['folderId'] } },
  { name: 'get_folder_size', description: 'Get folder size', inputSchema: { type: 'object', properties: { folderId: { type: 'string' } }, required: ['folderId'] } }
];

async function findFolderByName(name) {
  const response = await api.get('/folders', { params: { parentFolderId: null } });
  const folders = response.data.folders || [];
  return folders.find(f => f.name.toLowerCase() === name.toLowerCase());
}

async function handleTool(name, args) {
  try {
    switch (name) {
      case 'list_folders': {
        const response = await api.get('/folders', { params: { parentFolderId: null } });
        const folders = response.data.folders || [];
        if (folders.length === 0) return { content: [{ type: 'text', text: 'No folders found' }] };
        return { content: [{ type: 'text', text: folders.map(f => `📁 ${f.name} (ID: ${f.id})`).join('\n') }] };
      }
      case 'create_folder': {
        const response = await api.post('/folders', { name: args.name });
        return { content: [{ type: 'text', text: `✅ Created folder "${args.name}"` }] };
      }
      case 'delete_folder': {
        const folder = await findFolderByName(args.name);
        if (!folder) return { content: [{ type: 'text', text: `❌ Folder "${args.name}" not found` }] };
        await api.delete(`/folders/${folder.id}`);
        return { content: [{ type: 'text', text: `✅ Deleted folder "${args.name}"` }] };
      }
      case 'list_images': {
        const response = await api.get(`/images/folder/${args.folderId}`);
        const images = response.data.images || [];
        if (images.length === 0) return { content: [{ type: 'text', text: 'No images found' }] };
        return { content: [{ type: 'text', text: images.map(img => `🖼️ ${img.name} (${img.sizeFormatted})`).join('\n') }] };
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

process.stdin.on('data', async (buffer) => {
  const lines = buffer.toString().split('\n').filter(l => l.trim());
  for (const line of lines) {
    try {
      const msg = JSON.parse(line);
      if (msg.method === 'tools/list') {
        process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { tools } }) + '\n');
      } else if (msg.method === 'tools/call') {
        const { name, arguments: args } = msg.params;
        const result = await handleTool(name, args);
        process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result }) + '\n');
      }
    } catch (e) {}
  }
});

async function main() {
  await authenticate();
}

main();
console.error('MCP Server ready!');