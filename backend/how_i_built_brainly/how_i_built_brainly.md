# How I Built Brainly: A Step-by-Step History

This document serves as a living history of the Brainly project. It details every step taken from initialization to the current state. As the project evolves, new steps will be added here.

---

## Phase 1: Project Initialization and Setup

### Step 1: Node.js Project Initialization

The project was started as a standard Node.js project.

```bash
npm init -y
```

### Step 2: TypeScript Setup

TypeScript was added as a development dependency to enable static typing.

```bash
npm install -D typescript
```

A `tsconfig.json` file was generated to manage TypeScript compiler options.

```bash
npx tsc --init
```

### Step 3: Configuring `tsconfig.json`

The `tsconfig.json` file was configured to define the project's structure and compiler settings:

-   `rootDir`: `./src` (All source code lives here)
-   `outDir`: `./dist` (Compiled JavaScript output goes here)

```json
{
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

### Step 4: Installing Core Dependencies

Express was chosen as the web framework and Mongoose as the MongoDB object modeling tool.

```bash
npm install express mongoose dotenv
```

Type definitions for these libraries were also installed:

```bash
npm install -D @types/express @types/mongoose
```

### Step 5: Creating the Project Structure

A `src` directory was created to hold the source files:

-   `src/index.ts`: The main application entry point.
-   `src/db.ts`: For database schema and connection.
-   `src/middleware.ts`: For custom Express middleware.

### Step 6: Adding a Build Script

A `build` script was added to `package.json` to compile the TypeScript code.

```json
"scripts": {
  "build": "tsc"
}
```

---

## Phase 2: Database and Authentication

### Step 7: Defining the User Schema

In `src/db.ts`, the Mongoose schema for a `User` was defined. It includes `username` and `password` fields. The `UserModel` was correctly exported using `mongoose.model`.

```typescript
// src/db.ts
import mongoose, { Schema } from "mongoose";

const UserSchema = new Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
});

export const UserModel = mongoose.model("User", UserSchema);
```

### Step 8: Setting up Password Hashing

For security, `bcrypt` was added to the project to hash user passwords before storing them.

```bash
npm install bcrypt
npm install -D @types/bcrypt
```

### Step 9: Connecting to the Database

In `src/index.ts`, `mongoose.connect()` was added to establish a connection with the MongoDB Atlas cluster.

```typescript
// src/index.ts
import mongoose from 'mongoose';

const MONGO_URI = "your_mongodb_connection_string"; // Should be stored in a .env file

mongoose.connect(MONGO_URI)
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.error("MongoDB connection error:", err));
```

### Step 10: Implementing the Signup Route

The `/api/v1/signup` endpoint was implemented in `src/index.ts`.

1.  It uses the `express.json()` middleware to parse JSON bodies.
2.  It checks if a user with the given username already exists.
3.  It hashes the incoming password using `bcrypt`.
4.  It creates and saves the new user with the hashed password.

```typescript
// src/index.ts
app.post("/api/v1/signup", async (req, res) => {
    const { username, password } = req.body;

    const existingUser = await UserModel.findOne({ username });
    if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new UserModel({
        username: username,
        password: hashedPassword
    });
    await user.save();

    res.status(201).json({
        message: "User created successfully"
    });
});
```

---

## Phase 3: Improving Development Workflow & Documentation

### Step 11: Enhancing the Local Development Server

To speed up development, `ts-node` and `nodemon` were introduced.

```bash
npm install -D ts-node nodemon
```

A `dev` script was added to `package.json` to automatically re-compile and restart the server on file changes.

```json
"scripts": {
  "dev": "nodemon src/index.ts"
}
```

### Step 12: Documenting Local Database Setup

A `docs/TODO/local_mongodb_setup.md` file was created to document how to set up a local MongoDB instance using Docker for future development.

### Step 13: Creating the Project History Document

This file, `how_i_built_brainly/how_i_built_brainly.md`, was created to track the project's history.
