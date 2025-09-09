"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const sqlite3_1 = require("sqlite3");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const google_auth_library_1 = require("google-auth-library");
// Try to load .env from multiple locations (system env takes priority)
const envPaths = [
    path_1.default.join(__dirname, '.env'), // dist/.env (built)
    path_1.default.join(__dirname, '..', '.env') // server/.env (development)
];
let envLoadedFrom = 'system environment';
for (const envPath of envPaths) {
    try {
        const result = dotenv_1.default.config({ path: envPath, override: false });
        if (!result.error) {
            envLoadedFrom = envPath;
            console.log(`📁 Loaded env from: ${envPath}`);
            break;
        }
    }
    catch (error) {
        // Silent fail, try next path
    }
}
// Validate required environment variables (fail-fast approach)
const requiredEnvVars = [
    'GOOGLE_CLIENT_ID',
    'JWT_SECRET',
    'OPENAI_API_KEY'
];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
    console.error('❌ CRITICAL: Missing required environment variables:');
    missingVars.forEach(varName => {
        console.error(`   - ${varName}: MISSING`);
    });
    console.error('💡 Set these via PM2 environment or .env file');
    process.exit(1);
}
// Log successful validation (without values for security)
console.log('✅ Environment validation passed:');
requiredEnvVars.forEach(varName => {
    console.log(`   - ${varName}: OK`);
});
console.log(`📍 Environment source: ${envLoadedFrom}`);
const aiService = require('./aiService');
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
// Google OAuth client
const client = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID);
// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_here';
async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        req.userEmail = decoded.email;
        next();
    }
    catch (error) {
        return res.status(403).json({ error: 'Invalid token' });
    }
}
// Middleware
app.use((0, cors_1.default)({
    origin: [
        'http://localhost:3000',
        'https://ai-todo-app-gh8l.vercel.app',
        /^https:\/\/.*\.vercel\.app$/, // 모든 Vercel 도메인 허용 (preview URLs)
        'http://43.203.188.214:2222'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express_1.default.json({
    limit: '200mb'
}));
app.use(express_1.default.urlencoded({
    limit: '200mb',
    parameterLimit: 500000,
    extended: true
}));
// Database setup
const dbPath = path_1.default.join(__dirname, 'database.sqlite');
const db = new sqlite3_1.Database(dbPath);
// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'AI Todo App Backend Server',
        version: '1.0.0',
        endpoints: {
            todos: '/api/todos',
            dailySummaries: '/api/daily-summaries'
        }
    });
});
// Initialize database tables
db.serialize(() => {
    // Users table
    db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      picture TEXT,
      google_id TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
    // Todos table (with user_id)
    db.run(`
    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      time TEXT,
      title TEXT NOT NULL,
      description TEXT,
      location TEXT,
      isFromCalendar BOOLEAN DEFAULT 0,
      progress INTEGER DEFAULT 0,
      deadline TEXT,
      parentTodoId TEXT,
      status TEXT DEFAULT 'active',
      date TEXT,
      estimatedDuration INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);
    // 기존 테이블에 새 컬럼들 추가
    db.run(`ALTER TABLE todos ADD COLUMN status TEXT DEFAULT 'active'`, function (err) {
        if (err && err.message.includes('duplicate column name')) {
            console.log('✅ Status column already exists');
        }
        else if (err) {
            console.log('⚠️  Status ALTER TABLE error:', err.message);
        }
        else {
            console.log('✅ Added status column to existing table');
        }
    });
    db.run(`ALTER TABLE todos ADD COLUMN date TEXT`, function (err) {
        if (err && err.message.includes('duplicate column name')) {
            console.log('✅ Date column already exists');
        }
        else if (err) {
            console.log('⚠️  Date ALTER TABLE error:', err.message);
        }
        else {
            console.log('✅ Added date column to existing table');
        }
    });
    db.run(`ALTER TABLE todos ADD COLUMN estimatedDuration INTEGER`, function (err) {
        if (err && err.message.includes('duplicate column name')) {
            console.log('✅ EstimatedDuration column already exists');
        }
        else if (err) {
            console.log('⚠️  EstimatedDuration ALTER TABLE error:', err.message);
        }
        else {
            console.log('✅ Added estimatedDuration column to existing table');
        }
    });
    db.run(`ALTER TABLE todos ADD COLUMN memo TEXT`, function (err) {
        if (err && err.message.includes('duplicate column name')) {
            console.log('✅ Memo column already exists');
        }
        else if (err) {
            console.log('⚠️  Memo ALTER TABLE error:', err.message);
        }
        else {
            console.log('✅ Added memo column to existing table');
        }
    });
    // Add user_id column to existing todos table
    db.run(`ALTER TABLE todos ADD COLUMN user_id TEXT`, function (err) {
        if (err && err.message.includes('duplicate column name')) {
            console.log('✅ User_id column already exists');
        }
        else if (err) {
            console.log('⚠️  User_id ALTER TABLE error:', err.message);
        }
        else {
            console.log('✅ Added user_id column to existing table');
        }
    });
    // Daily summaries table
    db.run(`
    CREATE TABLE IF NOT EXISTS daily_summaries (
      date TEXT PRIMARY KEY,
      completed_tasks INTEGER DEFAULT 0,
      total_tasks INTEGER DEFAULT 0,
      completion_rate INTEGER DEFAULT 0,
      badge TEXT DEFAULT 'rest',
      mood TEXT DEFAULT 'neutral',
      ai_comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});
// Google OAuth login endpoint
app.post('/api/auth/google', async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ error: 'Google token required' });
        }
        // Basic env validation
        if (!process.env.GOOGLE_CLIENT_ID) {
            console.error('Missing GOOGLE_CLIENT_ID in server environment');
            return res.status(500).json({ error: 'Server misconfiguration: GOOGLE_CLIENT_ID is not set' });
        }
        // Verify Google token
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (!payload) {
            return res.status(400).json({ error: 'Invalid Google token' });
        }
        const { sub: googleId, email, name, picture } = payload;
        if (!email || !name) {
            return res.status(400).json({ error: 'Missing user information' });
        }
        // Check if user exists
        const existingUser = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE google_id = ?', [googleId], (err, row) => {
                if (err)
                    reject(err);
                else
                    resolve(row);
            });
        });
        let userId;
        if (existingUser) {
            // Update existing user
            userId = existingUser.id;
            await new Promise((resolve, reject) => {
                db.run('UPDATE users SET email = ?, name = ?, picture = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [email, name, picture, userId], function (err) {
                    if (err)
                        reject(err);
                    else
                        resolve(this);
                });
            });
        }
        else {
            // Create new user
            userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            await new Promise((resolve, reject) => {
                db.run('INSERT INTO users (id, email, name, picture, google_id) VALUES (?, ?, ?, ?, ?)', [userId, email, name, picture, googleId], function (err) {
                    if (err)
                        reject(err);
                    else
                        resolve(this);
                });
            });
        }
        // Generate JWT token
        const jwtToken = jsonwebtoken_1.default.sign({ userId, email, name }, JWT_SECRET, { expiresIn: '30d' });
        res.json({
            success: true,
            user: { id: userId, email, name, picture },
            token: jwtToken
        });
    }
    catch (error) {
        console.error('Google auth error:', error?.message || error);
        // Try to expose a bit more context for local debugging only
        res.status(500).json({
            error: 'Authentication failed',
            message: error?.message || 'Unknown error',
            hint: 'Check GOOGLE_CLIENT_ID on server and REACT_APP_GOOGLE_CLIENT_ID on frontend; ensure OAuth client type is Web and localhost:3000 is authorized.'
        });
    }
});
// Get current user info
app.get('/api/auth/me', authenticateToken, (req, res) => {
    db.get('SELECT id, email, name, picture FROM users WHERE id = ?', [req.userId], (err, user) => {
        if (err) {
            console.error('Get user error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ user });
    });
});
// Todo API endpoints (now with authentication)
app.get('/api/todos', authenticateToken, (req, res) => {
    db.all('SELECT * FROM todos WHERE user_id = ? ORDER BY created_at DESC', [req.userId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});
app.post('/api/todos', authenticateToken, (req, res) => {
    console.log('📝 POST /api/todos - Received request:', req.body);
    const { id, time, title, description, location, isFromCalendar, progress, deadline, parentTodoId, status, date, estimatedDuration, memo } = req.body;
    if (!title) {
        console.error('❌ Missing title field');
        res.status(400).json({ error: 'Title is required' });
        return;
    }
    console.log('📋 Creating todo with data:', {
        id, time, title, description, location, isFromCalendar, progress, deadline, parentTodoId, status, date, estimatedDuration, memo, user_id: req.userId
    });
    db.run(`
    INSERT INTO todos (id, user_id, time, title, description, location, isFromCalendar, progress, deadline, parentTodoId, status, date, estimatedDuration, memo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, req.userId, time, title, description, location, isFromCalendar, progress, deadline, parentTodoId, status || 'active', date, estimatedDuration, memo], function (err) {
        if (err) {
            console.error('❌ Database error:', err.message);
            res.status(500).json({ error: err.message });
            return;
        }
        console.log('✅ Todo created successfully with id:', id);
        res.json({ id, message: 'Todo created successfully' });
    });
});
app.put('/api/todos/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    // 업데이트할 필드들과 값들을 동적으로 생성
    const updateFields = [];
    const updateValues = [];
    const allowedFields = ['time', 'title', 'description', 'location', 'progress', 'deadline', 'parentTodoId', 'status', 'date', 'estimatedDuration', 'memo'];
    for (const field of allowedFields) {
        if (updates[field] !== undefined) {
            updateFields.push(`${field} = ?`);
            updateValues.push(updates[field]);
        }
    }
    if (updateFields.length === 0) {
        res.status(400).json({ error: 'No valid fields to update' });
        return;
    }
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(id);
    updateValues.push(req.userId);
    const query = `UPDATE todos SET ${updateFields.join(', ')} WHERE id = ? AND user_id = ?`;
    db.run(query, updateValues, function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Todo updated successfully' });
    });
});
app.delete('/api/todos/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM todos WHERE id = ? AND user_id = ?', [id, req.userId], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Todo deleted successfully' });
    });
});
// Daily summary API endpoints
app.get('/api/daily-summaries', (req, res) => {
    db.all('SELECT * FROM daily_summaries ORDER BY date DESC', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});
app.get('/api/daily-summaries/:date', (req, res) => {
    const { date } = req.params;
    db.get('SELECT * FROM daily_summaries WHERE date = ?', [date], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(row || null);
    });
});
app.post('/api/daily-summaries', (req, res) => {
    const { date, completed_tasks, total_tasks, completion_rate, badge, mood, ai_comment } = req.body;
    db.run(`
    INSERT OR REPLACE INTO daily_summaries (date, completed_tasks, total_tasks, completion_rate, badge, mood, ai_comment, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `, [date, completed_tasks, total_tasks, completion_rate, badge, mood, ai_comment], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ date, message: 'Daily summary saved successfully' });
    });
});
// Calculate daily summary from todos
app.post('/api/calculate-daily-summary/:date', (req, res) => {
    const { date } = req.params;
    db.all(`
    SELECT * FROM todos 
    WHERE date(deadline) = ? OR date(created_at) = ?
  `, [date, date], (err, todos) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        const totalTasks = todos.length;
        const completedTasks = todos.filter((todo) => todo.progress === 100).length;
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        let badge = 'rest';
        let mood = 'neutral';
        if (completionRate === 100) {
            badge = 'perfect';
            mood = 'excellent';
        }
        else if (completionRate >= 80) {
            badge = 'great';
            mood = 'great';
        }
        else if (completionRate >= 60) {
            badge = 'good';
            mood = 'good';
        }
        else if (completionRate >= 30) {
            badge = 'progress';
            mood = 'okay';
        }
        else if (completionRate > 0) {
            badge = 'start';
            mood = 'needs_work';
        }
        const summary = {
            date,
            completed_tasks: completedTasks,
            total_tasks: totalTasks,
            completion_rate: completionRate,
            badge,
            mood
        };
        res.json(summary);
    });
});
// AI Task Analysis API endpoint
app.post('/api/analyze-task', async (req, res) => {
    try {
        console.log('📤 AI 분석 요청 받음:', req.body);
        const { mainTaskTitle, description, deadline, fileContents, webContents, userRequirements, difficultyLevel, userSchedule } = req.body;
        if (!mainTaskTitle) {
            return res.status(400).json({ error: 'mainTaskTitle is required' });
        }
        console.log('🎯 aiService.analyzeTask 호출 직전');
        const analysis = await aiService.analyzeTask(mainTaskTitle, description, deadline, fileContents || [], webContents || [], userRequirements || '', difficultyLevel || 'normal', userSchedule || null);
        console.log('✅ AI 분석 완료:', analysis.complexity);
        res.json(analysis);
    }
    catch (error) {
        console.error('❌ AI 분석 실패:', error);
        res.status(500).json({
            error: 'AI analysis failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Health check endpoint
app.get('/api/health', (_req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        port: port,
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
    });
});
app.listen(port, async () => {
    console.log(`🚀 Server running on port ${port}`);
    console.log(`📅 서버 시작 시간: ${new Date().toISOString()}`);
    // AI 워밍업 (백그라운드에서 실행)
    setImmediate(async () => {
        try {
            const warmupSuccess = await aiService.warmupAI();
            if (warmupSuccess) {
                console.log('🎉 서버 준비 완료! AI 서비스가 워밍업되었습니다.');
            }
            else {
                console.log('⚡ 서버 시작됨 (AI 워밍업 실패했지만 정상 작동)');
            }
        }
        catch (error) {
            console.log('⚡ 서버 시작됨 (AI 워밍업 중 오류 발생했지만 정상 작동)');
        }
    });
});
//# sourceMappingURL=server.js.map