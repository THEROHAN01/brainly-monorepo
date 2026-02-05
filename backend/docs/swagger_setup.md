# How to Add Swagger UI to Your Express.js Application

This guide will walk you through the process of adding Swagger UI to your existing Node.js Express application to visualize and interact with your API endpoints.

## 1. Install Dependencies

First, you need to install `swagger-ui-express` to serve the Swagger UI and `swagger-jsdoc` to generate the Swagger specification from your JSDoc comments. You will also need the TypeScript types for these packages.

Open your terminal and run the following command:

```bash
npm install swagger-ui-express swagger-jsdoc
npm install -D @types/swagger-ui-express @types/swagger-jsdoc
```

## 2. Configure Swagger

It's a good practice to keep your Swagger configuration in a separate file.

Create a new file named `swagger.ts` in your `src` directory (`src/swagger.ts`).

```typescript
// src/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Brainly API',
      version: '1.0.0',
      description: 'API documentation for the Brainly application',
    },
    servers: [
      {
        url: 'http://localhost:3000',
      },
    ],
  },
  apis: ['./src/index.ts'], // files containing annotations as above
};

export const swaggerSpec = swaggerJsdoc(options);
```

This configuration sets up the basic information for your API and tells `swagger-jsdoc` to look for API definitions in your `src/index.ts` file.

## 3. Integrate Swagger UI with Express

Now, you need to modify your main application file (`src/index.ts`) to serve the Swagger UI.

Import `swagger-ui-express` and the `swaggerSpec` you just created. Then, add a new route to serve the documentation.

```typescript
// src/index.ts
import express, { Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger'; // Import the swaggerSpec
// ... other imports

const app = express();
app.use(express.json());

// ... your other app setup

// Add the Swagger UI route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ... your routes

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## 4. Add JSDoc Annotations to Your Routes

To generate the documentation, you need to add JSDoc comments to your API routes in `src/index.ts`. Here's how you can document the `/api/v1/signup` route as an example. You can follow the same pattern for your other routes.

```typescript
// src/index.ts

// ... imports

/**
 * @swagger
 * /api/v1/signup:
 *   post:
 *     summary: Register a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: The user's username.
 *               password:
 *                 type: string
 *                 description: The user's password.
 *     responses:
 *       201:
 *         description: User created successfully.
 *       400:
 *         description: Bad request, username or password missing, or user already exists.
 *       500:
 *         description: Internal server error.
 */
app.post("/api/v1/signup", async (req: Request, res: Response) => {
  // ... route logic
});

/**
 * @swagger
 * /api/v1/signin:
 *   post:
 *     summary: Sign in a user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful login, returns a JWT token.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *       400:
 *         description: User not found.
 *       403:
 *         description: Incorrect credentials.
 */
app.post("/api/v1/signin",async (req,res) => {
    // ... route logic
});

// ... Add similar JSDoc comments to all your other routes ...

```

Here is an example for a route that requires authentication:

```typescript
/**
 * @swagger
 * /api/v1/content:
 *   post:
 *     summary: Add new content
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               link:
 *                 type: string
 *               type:
 *                 type: string
 *     responses:
 *       200:
 *         description: Content added successfully.
 */
app.post("/api/v1/content",userMiddleware, (req,res) => {
    // ... route logic
});
```

To support JWT authentication, you also need to add a security definition in your `swagger.ts` file.

Update `src/swagger.ts` like this:

```typescript
// src/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Brainly API',
      version: '1.0.0',
      description: 'API documentation for the Brainly application',
    },
    servers: [
      {
        url: 'http://localhost:3000',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/index.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
```

## 5. Start the Application and View the Docs

Now, you can start your application as usual.

```bash
npm run dev
```

Once the server is running, open your web browser and navigate to `http://localhost:3000/api-docs`. You should see the Swagger UI with all your documented routes.

By following these steps, you will have a fully functional and interactive API documentation for your Brainly project.
