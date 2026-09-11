module.exports = {
  apps: [
    {
      name: "company-connect-server",
      cwd: "./server",
      script: "src/server.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: 5009,
      },
      env_development: {
        NODE_ENV: "development",
        PORT: 5009,
      },
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      merge_logs: true,
      time: true,
    },
  ],
};
