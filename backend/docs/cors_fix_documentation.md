# CORS Error Fix Documentation

## Issue
The frontend application (running on a different origin, e.g., `http://localhost:5173`) was unable to make requests to the backend API (running on `http://localhost:3000`) due to Cross-Origin Resource Sharing (CORS) policy enforced by web browsers. This resulted in blocked network requests.

## Solution
To resolve the CORS error, the following steps were taken:

1.  **Install `cors` package in the backend:**
    The `cors` npm package was installed in the `Brainly` backend directory to provide an Express middleware for enabling CORS with various options.
    ```bash
    npm install cors
    npm install @types/cors # For TypeScript type definitions
    ```

2.  **Apply `cors` middleware in `index.ts`:**
    The `cors` middleware was imported and applied to the Express application in `Brainly/src/index.ts`. For development purposes, it was configured to allow all origins.

    **Before:**
    ```typescript
    import express, { Request, Response } from 'express';
    // ... other imports

    const app = express();
    app.use(express.json());
    // ...
    ```

    **After:**
    ```typescript
    import express, { Request, Response } from 'express';
    import cors from 'cors'; // Import cors
    // ... other imports

    const app = express();
    app.use(cors()); // Use cors middleware
    app.use(express.json());
    // ...
    ```

## Verification
After these changes, the frontend should now be able to successfully make requests to the backend API without encountering CORS errors.

**Note:** For production environments, it is recommended to configure CORS with a more restrictive `origin` option to only allow requests from trusted domains. For example:
```typescript
app.use(cors({ origin: 'https://your-frontend-domain.com' }));
```