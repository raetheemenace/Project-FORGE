---
inclusion: always
---

# Project Structure

## Repository Organization

Monorepo structure with separate frontend and backend applications.

```
/
├── backend/              # Node.js/Express backend service
│   ├── index.js         # Main server entry point
│   ├── package.json     # Backend dependencies
│   ├── .env             # Environment variables (not committed)
│   └── node_modules/    # Backend dependencies
│
├── frontend/            # React/Vite frontend application
│   ├── src/
│   │   ├── App.jsx      # Main React component
│   │   ├── main.jsx     # React entry point
│   │   ├── App.css      # Component styles
│   │   ├── index.css    # Global styles
│   │   └── assets/      # Images and static assets
│   ├── public/          # Public static files (favicon, icons)
│   ├── index.html       # HTML entry point
│   ├── vite.config.js   # Vite configuration
│   ├── package.json     # Frontend dependencies
│   └── node_modules/    # Frontend dependencies
│
├── docs/                # Documentation files
├── .kiro/               # Kiro AI assistant configuration
│   └── steering/        # AI steering rules
├── .env.example         # Example environment variables
├── .gitignore           # Git ignore rules
└── README.md            # Project documentation
```

## Key Conventions

### Backend Structure
- **CommonJS modules:** Backend uses `require()` and `module.exports`
- **Single entry point:** All server logic in `index.js` (will expand as project grows)
- **Environment-based config:** All secrets and config in `.env` file
- **API routes:** Prefixed with `/api/` (e.g., `/api/health`, `/api/forge`)

### Frontend Structure
- **ES modules:** Frontend uses `import`/`export` syntax
- **Component-based:** React components in `/src` directory
- **Tailwind utility-first:** Styling uses Tailwind CSS classes
- **Vite dev server:** Fast HMR during development
- **Public assets:** Static files in `/public`, imported assets in `/src/assets`

### Code Organization Patterns

- Backend API endpoints defined directly in `index.js` (currently minimal)
- Frontend components currently in single `App.jsx` (will modularize as features grow)
- Shared configuration at root level (`.env.example`, `.gitignore`)
- Separate `node_modules` for frontend and backend (independent dependency management)

## Development Workflow

1. Backend runs on port 5000 (configurable via PORT env var)
2. Frontend dev server proxies API calls to backend
3. Both services run independently during development
4. Frontend makes HTTP requests to backend via axios

## Future Structure Considerations

As the project grows, expect:
- Backend: Route handlers, controllers, models, middleware folders
- Frontend: Components, hooks, services, utils folders
- Shared: Types/interfaces if TypeScript is adopted
- Database: SQL migration scripts and seed data
