// pm2 process config for the ADR frontend (production).
//
// Deploy on the VPS:
//   1. echo 'NEXT_PUBLIC_API_URL=http://79.143.191.22:1906/api/v1' > .env.local
//   2. pnpm install
//   3. pnpm build                            # NEXT_PUBLIC_API_URL is baked in here
//   4. PORT=1908 pm2 start ecosystem.config.js   # pick a FREE port (1905 is taken
//                                                #  by another container on this VPS)
//   5. pm2 save                              # persist across reboots
//
// Port: set via the PORT env var (defaults to 1905). next start reads PORT.
// NOTE: NEXT_PUBLIC_API_URL is inlined at build time — re-run `pnpm build`
// (then `pm2 reload adr-frontend`) whenever the backend URL changes.
module.exports = {
  apps: [
    {
      name: "adr-frontend",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || "1905",
      },
    },
  ],
};
