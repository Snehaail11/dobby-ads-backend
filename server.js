require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

const app = express();

// ===========================================
// SECURITY MIDDLEWARE
// ===========================================

// Helmet - security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
const corsOptions = {
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://dobby-ads-frontend.vercel.app',
      'https://dobby-ads-frontend-git-main-snehailtalentcorner-4594s-projects.vercel.app',
      'https://*.vercel.app'
    ];
    
    // Allow requests with no origin (mobile apps, postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.some(allowed => 
      origin === allowed || origin.endsWith(allowed.replace('https://', '')))
    ) {
      callback(null, true);
    } else {
      console.log('CORS blocked:', origin);
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { message: 'Too many requests, please try again later' }
});
app.use('/api/', limiter);

// Auth rate limiting (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 10 login attempts per 15 minutes
  message: { message: 'Too many login attempts, please try again later' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);

// Body parser with size limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Morgan - HTTP request logging
const isProduction = process.env.NODE_ENV === 'production';
app.use(morgan(isProduction ? 'combined' : 'dev'));

// ===========================================
// ENVIRONMENT & CONFIGURATION
// ===========================================

console.log('\n╔═══════════════════════════════════════╗');
console.log('║       DOBBY ADS API SERVER          ║');
console.log('╚═══════════════════════════════════════╝');
console.log('');
console.log('🔧 Environment Configuration:');

const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'SUPABASE_URL', 'SUPABASE_ANON_KEY'];
let missingVars = [];

requiredEnvVars.forEach(varName => {
  const isSet = !!process.env[varName];
  console.log(`   ${isSet ? '✓' : '✗'} ${varName}: ${isSet ? 'Set' : 'Missing'}`);
  if (!isSet) missingVars.push(varName);
});

if (missingVars.length > 0) {
  console.log('\n⚠️  Warning: Missing required environment variables:', missingVars.join(', '));
}
console.log('');

// ===========================================
// DATABASE CONNECTION
// ===========================================

const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    console.log('⚠️  MongoDB URI not configured - running without database');
    return false;
  }
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected Successfully');
    return true;
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    return false;
  }
};

// ===========================================
// API ROUTES
// ===========================================

// Import routes
const authRoutes = require('./routes/authRoutes');
const folderRoutes = require('./routes/folderRoutes');
const imageRoutes = require('./routes/imageRoutes');

// Health check (unauthenticated)
app.get('/api/health', (req, res) => {
  const status = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
  };
  res.json(status);
});

// API info (unauthenticated)
app.get('/api', (req, res) => {
  res.json({
    name: 'Dobby Ads API',
    version: '1.0.0',
    description: 'Image management API with folder organization',
    endpoints: {
      auth: {
        'POST /api/auth/signup': 'Register new user',
        'POST /api/auth/login': 'Login user',
        'GET /api/auth/me': 'Get current user (protected)'
      },
      folders: {
        'GET /api/folders': 'List folders (protected)',
        'POST /api/folders': 'Create folder (protected)',
        'PUT /api/folders/:id': 'Rename folder (protected)',
        'DELETE /api/folders/:id': 'Delete folder (protected)',
        'GET /api/folders/:id/size': 'Get folder size (protected)'
      },
      images: {
        'POST /api/images/upload': 'Upload image (protected)',
        'GET /api/images/folder/:folderId': 'List images (protected)',
        'DELETE /api/images/:id': 'Delete image (protected)'
      }
    }
  });
});

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/images', imageRoutes);

// Test endpoint (for debugging)
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Dobby Ads API is running!',
    timestamp: new Date().toISOString(),
    ip: req.ip
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    message: 'Endpoint not found',
    path: req.path
  });
});

// ===========================================
// ERROR HANDLING
// ===========================================

// Global error handler
app.use((err, req, res, next) => {
  console.error('╔═══════════════════════════════════════╗');
  console.error('║           SERVER ERROR              ║');
  console.error('╚═══════════════════════════════════════╝');
  console.error('Time:', new Date().toISOString());
  console.error('Path:', req.path);
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  
  // Don't expose internal errors in production
  const message = isProduction && err.message.includes('MongoDB') 
    ? 'Database error' 
    : err.message;
  
  res.status(err.status || 500).json({ 
    message,
    ...(isProduction ? {} : { stack: err.stack })
  });
});

// ===========================================
// SERVER STARTUP
// ===========================================

const PORT = process.env.PORT || 5000;

async function startServer() {
  // Connect to database
  await connectDB();
  
  // Start HTTP server
  app.listen(PORT, () => {
    console.log('');
    console.log('╔═══════════════════════════════════════╗');
    console.log('║       SERVER STARTED SUCCESSFULLY     ║');
    console.log('╚═══════════════════════════════════════╝');
    console.log('');
    console.log(`   🚀 Server:     http://localhost:${PORT}`);
    console.log(`   📡 Health:    http://localhost:${PORT}/api/health`);
    console.log(`   📚 API Docs:   http://localhost:${PORT}/api`);
    console.log(`   🧪 Test:      http://localhost:${PORT}/api/test`);
    console.log('');
    console.log(`   Environment: ${isProduction ? 'Production' : 'Development'}`);
    console.log(`   Node:      ${process.version}`);
    console.log('');
  });
}

startServer();

module.exports = app; // For testing