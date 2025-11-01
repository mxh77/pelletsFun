module.exports = {
  apps: [
    {
      name: 'pelletsfun-backend',
      cwd: '/home/pelletsfun/pelletsFun/backend',
      script: 'server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      instances: 1,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      error_file: '/home/pelletsfun/logs/backend-error.log',
      out_file: '/home/pelletsfun/logs/backend-out.log',
      log_file: '/home/pelletsfun/logs/backend-combined.log',
      time: true
    }
  ]
};
