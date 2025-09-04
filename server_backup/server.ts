import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { Database } from 'sqlite3';

dotenv.config({ path: path.join(__dirname, '.env') });
const aiService = require('./aiService');

const app = express();
const port = process.env.PORT || 3001;


// Middleware
app.use(cors());
app.use(express.json({ 
  limit: '200mb'
}));
app.use(express.urlencoded({ 
  limit: '200mb', 
  parameterLimit: 500000,
  extended: true 
}));

// Database setup
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

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
  // Todos table
  db.run(`
    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
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
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 기존 테이블에 새 컬럼들 추가
  db.run(`ALTER TABLE todos ADD COLUMN status TEXT DEFAULT 'active'`, function(err) {
    if (err && err.message.includes('duplicate column name')) {
      console.log('✅ Status column already exists');
    } else if (err) {
      console.log('⚠️  Status ALTER TABLE error:', err.message);
    } else {
      console.log('✅ Added status column to existing table');
    }
  });

  db.run(`ALTER TABLE todos ADD COLUMN date TEXT`, function(err) {
    if (err && err.message.includes('duplicate column name')) {
      console.log('✅ Date column already exists');
    } else if (err) {
      console.log('⚠️  Date ALTER TABLE error:', err.message);
    } else {
      console.log('✅ Added date column to existing table');
    }
  });

  db.run(`ALTER TABLE todos ADD COLUMN estimatedDuration INTEGER`, function(err) {
    if (err && err.message.includes('duplicate column name')) {
      console.log('✅ EstimatedDuration column already exists');
    } else if (err) {
      console.log('⚠️  EstimatedDuration ALTER TABLE error:', err.message);
    } else {
      console.log('✅ Added estimatedDuration column to existing table');
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

// Todo API endpoints
app.get('/api/todos', (req, res) => {
  db.all('SELECT * FROM todos ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/todos', (req, res) => {
  console.log('📝 POST /api/todos - Received request:', req.body);
  
  const { id, time, title, description, location, isFromCalendar, progress, deadline, parentTodoId, status, date, estimatedDuration } = req.body;
  
  if (!title) {
    console.error('❌ Missing title field');
    res.status(400).json({ error: 'Title is required' });
    return;
  }
  
  console.log('📋 Creating todo with data:', {
    id, time, title, description, location, isFromCalendar, progress, deadline, parentTodoId, status, date, estimatedDuration
  });
  
  db.run(`
    INSERT INTO todos (id, time, title, description, location, isFromCalendar, progress, deadline, parentTodoId, status, date, estimatedDuration)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, time, title, description, location, isFromCalendar, progress, deadline, parentTodoId, status || 'active', date, estimatedDuration], function(err) {
    if (err) {
      console.error('❌ Database error:', err.message);
      res.status(500).json({ error: err.message });
      return;
    }
    console.log('✅ Todo created successfully with id:', id);
    res.json({ id, message: 'Todo created successfully' });
  });
});

app.put('/api/todos/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  // 업데이트할 필드들과 값들을 동적으로 생성
  const updateFields = [];
  const updateValues = [];
  
  const allowedFields = ['time', 'title', 'description', 'location', 'progress', 'deadline', 'parentTodoId', 'status', 'date', 'estimatedDuration'];
  
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
  
  const query = `UPDATE todos SET ${updateFields.join(', ')} WHERE id = ?`;
  
  db.run(query, updateValues, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Todo updated successfully' });
  });
});

app.delete('/api/todos/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM todos WHERE id = ?', [id], function(err) {
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
  `, [date, completed_tasks, total_tasks, completion_rate, badge, mood, ai_comment], function(err) {
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
  `, [date, date], (err, todos: any[]) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    const totalTasks = todos.length;
    const completedTasks = todos.filter((todo: any) => todo.progress === 100).length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    let badge = 'rest';
    let mood = 'neutral';
    
    if (completionRate === 100) {
      badge = 'perfect';
      mood = 'excellent';
    } else if (completionRate >= 80) {
      badge = 'great';
      mood = 'great';
    } else if (completionRate >= 60) {
      badge = 'good';
      mood = 'good';
    } else if (completionRate >= 30) {
      badge = 'progress';
      mood = 'okay';
    } else if (completionRate > 0) {
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
    
    const { 
      mainTaskTitle, 
      description, 
      deadline, 
      fileContents, 
      webContents 
    } = req.body;
    
    if (!mainTaskTitle) {
      return res.status(400).json({ error: 'mainTaskTitle is required' });
    }
    
    console.log('🎯 aiService.analyzeTask 호출 직전');
    const analysis = await aiService.analyzeTask(
      mainTaskTitle,
      description,
      deadline,
      fileContents || [],
      webContents || []
    );
    
    console.log('✅ AI 분석 완료:', analysis.complexity);
    res.json(analysis);
    
  } catch (error) {
    console.error('❌ AI 분석 실패:', error);
    res.status(500).json({ 
      error: 'AI analysis failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});