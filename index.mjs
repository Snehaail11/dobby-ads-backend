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
  { name: 'list_folders', description: 'List all folders' },
  { name: 'create_folder', description: 'Create a folder' },
  { name: 'list_images', description: 'List images in folder' },
  { name: 'get_folder_size', description: 'Get folder size' }
];

async function handleTool(name, args) {
  try {
    switch (name) {
      case 'list_folders': {
        const response = await api.get('/folders', { params: { parentFolderId: null } });
        return { content: [{ type: 'text', text: JSON.stringify(response.data.folders || []) }] };
      }
      case 'create_folder': {
        const response = await api.post('/folders', { name: args.name });
        return { content: [{ type: 'text', text: `Created: ${response.data.folder?.name}` }] };
      }
      case 'list_images': {
        const response = await api.get(`/images/folder/${args.folderId}`);
        return { content: [{ type: 'text', text: JSON.stringify(response.data.images || []) }] };
      }
      case 'get_folder_size': {
        const response = await api.get(`/folders/${args.folderId}/size`);
        return { content: [{ type: 'text', text: response.data.sizeFormatted }] };
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error.response?.data?.message || error.message}` }] };
  }
}

// Simple JSON-RPC over STDIO
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