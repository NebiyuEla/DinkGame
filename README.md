# Dink Game

Live quiz mini app with a React frontend and a small Node backend for Render.

## Local Development

```bash
npm install
npm run dev
```

Vite dev uses browser local storage for quick iteration.

## Production / Render

This app should be deployed on Render as a Node web service, not a static site.

```bash
npm run build
npm run start
```

Render can use the included `render.yaml`.

Default admin:

```text
username: admin
password: admin123
```

Production data is stored in `data/dink-data.json` by default. On Render, the included disk config mounts that path so game/admin data can persist across deploys.
