# Backend Audit — Issues & Fixes

This document lists the issues found during a code review of the backend in `Brainly/src`, explains why each issue matters, and gives exact step‑by‑step changes, code snippets, files to edit, tests to run, and risks/notes. Apply fixes in the order recommended in the Action Plan section.

---

## Issue no 01) Unsafe JWT verification and header handling (middleware)
- **Location:** `src/middleware.ts`
- **Problem:** The code calls `jwt.verify(header as string, JWT_PASSWORD)` without checking that `header` exists, without try/catch, and it expects the raw token string (not `Bearer <token>`). An invalid or missing token will throw and crash the request or the app.
- **Impact:** Requests can crash; tokens in `Bearer <token>` format will fail; reliability and security issues.
- **Fix (stepwise):**
  1. Replace `JWT_PASSWORD` with `JWT_SECRET` read from env.
  2. Check the `authorization` header presence and type.
  3. Support both raw token and `Bearer <token>` formats.
  4. Wrap `jwt.verify` in `try/catch` and return `401` on failure.
  5. Add a typed `req.userId` declaration to avoid `@ts-ignore`.
- **Code to apply (replace file contents):**
```ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export const userMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const auth = req.headers["authorization"];
  if (!auth || typeof auth !== "string") {
    return res.status(401).json({ message: "Missing Authorization header" });
  }

  const token = auth.startsWith("Bearer ") ? auth.slice(7) : auth;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.userId = decoded.id;
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
```
- **Files to edit:** `src/middleware.ts`
- **Tests:**
  - Call a protected endpoint with `Authorization: <token>` and with `Authorization: Bearer <token>` — both should succeed with a valid token.
  - No header -> expect 401 `{ message: "Missing Authorization header" }`.
  - Invalid token -> expect 401 `{ message: "Invalid or expired token" }`.
- **Notes / Risk:** Ensure `JWT_SECRET` is set in `.env` (see Issue 04).

---

## Issue no 02) `POST /api/v1/content` does not await DB write and lacks validation
- **Location:** `src/index.ts` (route for `/api/v1/content`)
- **Problem:** `ContentModel.create(...)` is called without `await` or error handling; the handler returns success immediately even if DB write fails. No input validation is present for required fields.
- **Impact:** Silent data loss on DB errors; inconsistent API behavior.
- **Fix (stepwise):**
  1. Make the route handler `async`.
  2. Validate `title`, `link`, and `type` presence (and optionally format for `link`).
  3. `await` `ContentModel.create(...)` in a `try/catch` and return `201` with the created resource on success; return `500` on DB errors.
- **Code to apply (replace route implementation):**
```ts
app.post("/api/v1/content", userMiddleware, async (req, res) => {
  const { title, link, type } = req.body;
  if (!title || !link || !type) {
    return res.status(400).json({ message: "Missing required fields: title, link, type" });
  }

  try {
    const content = await ContentModel.create({
      title,
      link,
      type,
      userId: req.userId,
      tags: []
    });
    return res.status(201).json({ message: "Content created", content });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to save content", error: error.message });
  }
});
```
- **Files to edit:** `src/index.ts`
- **Tests:**
  - Valid payload -> expect 201 and returned content with `_id`.
  - Missing field -> 400 with message.
  - Simulate DB failure -> 500 and error message.

---

## Issue no 03) `tags` references `Tag` model that does not exist
- **Location:** `src/db.ts` (`ContentSchema` uses `ref: 'Tag'`)
- **Problem:** There is no `Tag` model defined in `db.ts`.
- **Impact:** `populate('tags')` or creating tag documents will fail / be inconsistent.
- **Fix options:**
  - Option A (recommended if tags are structured): Add a `Tag` model.
    ```ts
    const TagSchema = new Schema({ name: { type: String, unique: true, required: true } });
    export const TagModel = mongoose.model("Tag", TagSchema);
    ```
  - Option B (if tags are simple strings): Change `tags` to `tags: [String]`.
- **Files to edit:** `src/db.ts`
- **Tests:** Create a Tag, push its `_id` to Content.tags, then `populate('tags')` and verify the populated result.

---

## Issue no 04) JWT secret hard-coded and tokens have no expiry
- **Location:** `src/index.ts` (signing) and `src/middleware.ts` (verification)
- **Problem:** `JWT_PASSWORD`/`"Rohan"` is hard-coded; tokens have no expiry.
- **Impact:** Security risk; leaked tokens valid forever.
- **Fix (stepwise):**
  1. Add `JWT_SECRET` and optionally `JWT_EXPIRES_IN` to `.env` (e.g., `JWT_EXPIRES_IN=7d`).
  2. Use `jwt.sign(payload, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' })`.
  3. Update middleware to read `JWT_SECRET` from env (see Issue 01 code snippet).
- **Files to edit:** `src/index.ts`, `src/middleware.ts`, add `Brainly/.env.example`
- **Tests:**
  - `signin` returns a token with `exp` claim. `jwt.decode(token)` shows `exp`.
  - Short expiry tokens are rejected by middleware after expiry.

---

## Issue no 05) `connectDB` behavior on failure is abrupt; improve logging/control
- **Location:** `src/db.ts` (`connectDB`)
- **Problem:** On connection failure the function calls `process.exit(1)` immediately.
- **Impact:** Abrupt termination may be undesirable during tests/development.
- **Fix (options):**
  - Keep behavior (explicit exit) if desired.
  - Prefer throwing the error to the caller and let `index.ts` decide (enables retries or graceful shutdown).
    ```ts
    export const connectDB = async () => {
      const MONGO_URI = process.env.MONGO_URI;
      if (!MONGO_URI) throw new Error("MONGO_URI not set");
      await mongoose.connect(MONGO_URI);
      console.log("MongoDB connected");
    };
    ```
- **Files to edit:** `src/db.ts`, optionally `src/index.ts`
- **Tests:** Start with a bad `MONGO_URI` and confirm behavior.

---

## Issue no 06) Missing input validation and sanitization across endpoints
- **Location:** `src/index.ts` (multiple endpoints)
- **Problem:** Minimal or no validation; no sanitization.
- **Impact:** Bad or malicious data may be stored; security risks.
- **Fix (recommendation):**
  - Add a validation library (e.g., `zod`, `express-validator`) and validate input shapes on every endpoint.
  - At minimum, validate:
    - `signup`: username (allowed chars, length), password (min length)
    - `signin`: presence checks only
    - `content`: `link` is a valid URL; `title` length
    - `delete`: `contentId` is a valid MongoDB ObjectId
- **Files to edit:** `src/index.ts` (+ install chosen validation lib)
- **Tests:** Send invalid inputs and expect 400 responses with helpful messages.

---

## Issue no 07) Inconsistent response codes and shapes
- **Location:** `src/index.ts` (throughout)
- **Problem:** Success and error responses are inconsistent (status codes and JSON shape).
- **Impact:** Harder for frontend to parse responses and handle errors.
- **Fix:**
  - Use `201` for created resources.
  - Use consistent error envelope, e.g.: `{ error: { code?: string, message: string } }` or a consistent `{ message, error? }` structure.
  - Update endpoints to follow the chosen pattern.
- **Files to edit:** `src/index.ts`

---

## Issue no 08) No CORS configuration
- **Location:** `src/index.ts`
- **Problem:** No CORS middleware; cross-origin requests will be blocked when frontend is on a different origin.
- **Fix:**
  - Install `cors` and add `app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }))` early in `index.ts`.
- **Files to edit:** `src/index.ts`

---

## Issue no 09) Dead/commented raw `mongodb` client code and duplicate dependency
- **Location:** `src/db.ts`, `package.json`
- **Problem:** The code contains commented raw `mongodb` client code; both `mongodb` and `mongoose` are listed in `package.json` dependencies.
- **Impact:** Extra dependency and code clutter.
- **Fix:**
  - Remove commented raw client code (or move to a separate note file if you want to keep it as reference).
  - Remove `mongodb` dependency if you only use `mongoose`.
- **Files to edit:** `src/db.ts`, `package.json` (optional)

---

## Issue no 10) `req.userId` typed with `@ts-ignore`
- **Location:** `src/middleware.ts` and call sites that use `req.userId`
- **Problem:** Using `@ts-ignore` hides type errors.
- **Fix:**
  - Add a global Express `Request` extension (see Issue 01 snippet `declare global`) or create `src/types/express.d.ts` with the declaration.
- **Files to edit:** `src/middleware.ts` (or add `src/types/express.d.ts`)

---

## Issue no 11) Not implemented endpoints
- **Location:** `src/index.ts` endpoints:
  - `POST /api/v1/brain/share` — returns `501`
  - `GET /api/v1/brain/:shareLink` — returns `501`
- **Problem:** Not implemented.
- **Fix (design required):**
  - Define the contract: what does sharing a brain store? Example model `Share`:
    ```ts
    const ShareSchema = new Schema({
      ownerId: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
      contentIds: [{ type: mongoose.Types.ObjectId, ref: 'Content' }],
      shareLink: { type: String, unique: true },
      createdAt: { type: Date, default: Date.now }
    });
    export const ShareModel = mongoose.model('Share', ShareSchema);
    ```
  - Implement create and get handlers to persist and fetch shared brains.
- **Files to edit:** `src/index.ts`, `src/db.ts`

---

## Action Plan (recommended sequence)
1. Fix middleware (`src/middleware.ts`) — prevent crashes and accept `Bearer ` tokens.
2. Move to env-based JWT secret and add expiry (`src/index.ts` + `src/middleware.ts`).
3. Fix `POST /api/v1/content` to `await` and validate inputs (`src/index.ts`).
4. Add `Tag` model or change `tags` schema (`src/db.ts`).
5. Add input validation library and apply to all endpoints (`src/index.ts`).
6. Standardize response shapes and status codes.
7. Add CORS if frontend runs on another origin.
8. Clean up commented raw driver code and optional dependency removal.
9. Implement `brain/share` endpoints or add TODOs.
10. Add `.env.example`, update `README.md` and add test commands.

## Commit messages / PR notes (examples)
- `fix(auth): handle missing/invalid authorization header and support Bearer token`
- `feat(auth): use JWT_SECRET from env and add token expiry`
- `fix(content): await DB create, add validation and proper 201 response`
- `chore(db): add Tag model and cleanup commented mongodb code`

## Verification commands and quick tests
```powershell
cd e:\100xdev\week-15\week_15.1_Building2ndbrain\Brainly
npm install
npm run dev

# Typecheck
npx tsc --noEmit

# Example API tests (replace <token>)
curl -X POST http://localhost:3000/api/v1/signup -H "Content-Type: application/json" -d '{"username":"alice","password":"secret"}'
curl -X POST http://localhost:3000/api/v1/signin -H "Content-Type: application/json" -d '{"username":"alice","password":"secret"}'
# Create content
curl -X POST http://localhost:3000/api/v1/content -H "Content-Type: application/json" -H "Authorization: Bearer <token>" -d '{"title":"Note","link":"http://example.com","type":"note"}'
```

---

## Next steps I can take for you
- Apply the top-priority fixes automatically (middleware, JWT env, content create). I will make small commits and run `tsc --noEmit` to verify types.
- Or provide the exact patch diffs for you to apply manually.

Please tell me whether you want me to apply the fixes now (I will patch the files and run a typecheck), or only produce the patches for manual application.
