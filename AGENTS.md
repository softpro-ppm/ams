# Agent Guide

## Starting the application

From the project root, run:

```bash
npm run dev
```

This starts both servers automatically:
- **Backend** (Laravel API): http://localhost:8000
- **Frontend** (Vite/React): http://localhost:5173

Use this command when you need to run or test the application.

## Deployment

When making changes that require deployment, **always end the response with the deployment command**:

- **Frontend-only changes** (UI, branding, styles): `npm run deploy:frontend`
- **Full deploy** (backend + frontend): `npm run deploy`
