# Backend Refactor Migration Plan

This plan maps the legacy backend layout to the new `/src` structure and outlines the sequencing for migrating code safely.

## Target structure
```
Backend/
  src/
    app.js
    server.js
    config/
      db.js
    middleware/
      errorHandler.js
    models/
      User.js
      Habit.js
      Schedule.js
      index.js
    services/
      BaseService.js
    routes/
      index.js
```

## Migration steps
1. **Database setup**
   - Replace `sequelize.js` with `src/config/db.js` and proxy the old entry so existing modules share a single connection.
   - Load environment variables once in the config layer.

2. **Models**
   - Move `User`, `Habit`, and `Schedule` into `src/models/` with consistent options (underscored columns, explicit timestamps, association-friendly foreign keys).
   - Update `models/index.js` to source these definitions and register associations centrally.
   - Keep legacy import paths working by re-exporting from the old `models/` directory until all callers are updated.

3. **Application bootstrap**
   - Create `src/app.js` to host Express configuration, middleware, health check, static assets, and route registration.
   - Create `src/server.js` to own startup (DB auth + sync, port binding) and import the model index for association wiring.

4. **Middleware and services**
   - Add a shared error-handling middleware in `src/middleware/errorHandler.js`.
   - Add a reusable `BaseService` in `src/services/BaseService.js` to standardize CRUD interactions.

5. **Routing**
   - Add `src/routes/index.js` that wires existing route modules under the new app; future refactors will migrate route files into `src/routes` with controllers/services.

6. **Cleanup (next phases)**
   - Gradually move controllers/services/routes into `/src`, removing legacy duplicates when references are updated.
   - Consolidate configuration (e.g., mailer, async helpers) under `src/config`/`src/utils` equivalents.
   - Replace direct model access in routes with service + controller layers built on `BaseService`.
