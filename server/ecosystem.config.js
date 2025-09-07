// PM2 Configuration for AI Todo App
module.exports = {
  apps: [
    {
      name: 'ai-todo-backend',
      script: 'server.js',
      cwd: '/app/server',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: '/app/logs/backend-error.log',
      out_file: '/app/logs/backend-out.log',
      log_file: '/app/logs/backend-combined.log',
      time: true,
      max_memory_restart: '500M',
      node_args: '--max-old-space-size=512'
    },
    {
      name: 'ai-todo-frontend',
      script: 'serve',
      args: '-s ../build -l 3000',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/app/logs/frontend-error.log',
      out_file: '/app/logs/frontend-out.log',
      log_file: '/app/logs/frontend-combined.log',
      time: true
    }
  ]
};