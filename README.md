# Student Information Management System
### Three-tier cloud application: Netlify + Render + MongoDB Atlas

```
Browser  ->  Netlify (frontend)  ->  Render (Node/Express REST API)  ->  MongoDB Atlas (studentDB.students)
              Tier 1: Presentation       Tier 2: Application                Tier 3: Database
```

## Project structure
```
student-management-system/
├── backend/                  # Tier 2 - deploy on Render
│   ├── server.js             # Express app, CORS, error handling, health check
│   ├── config/database.js    # Mongoose connection (reads MONGODB_URI)
│   ├── models/Student.js     # Schema + validation
│   ├── routes/studentRoutes.js
│   ├── controllers/studentController.js   # CRUD logic
│   ├── seed.js               # optional sample data
│   ├── .env.example
│   └── package.json
├── frontend/                 # Tier 1 - deploy on Netlify (no build step)
│   ├── index.html  styles.css  app.js
│   ├── config.js             # <- put your Render URL here
│   └── netlify.toml
└── render.yaml               # optional Render blueprint
```

## REST API
| Operation | Method | Endpoint | Notes |
|---|---|---|---|
| Create | POST | `/api/students` | 201 on success, 409 if ID exists |
| Read all | GET | `/api/students` | `?search=text` filters by ID, name, email, department |
| Read one | GET | `/api/students/:id` | `:id` is the Student ID, e.g. `ST101` |
| Update | PUT | `/api/students/:id` | Student ID itself cannot change |
| Delete | DELETE | `/api/students/:id` | |
| Health | GET | `/health` | `200` only when the database is connected |

Student document:
```json
{ "studentId": "ST101", "name": "Rahul Sharma", "email": "rahul@example.com",
  "department": "Computer Science", "semester": 5, "contact": "9876543210" }
```

## Deployment (follow in this order)

### Step 1 - MongoDB Atlas (database tier)
1. Create a free account at mongodb.com/atlas and create a **free (M0) cluster**.
2. **Database Access** -> *Add New Database User*. Use a strong password and the role **Read and write to any database** (or restrict to `studentDB`). Avoid special characters in the password, or URL-encode them.
3. **Network Access** -> *Add IP Address*. Render's free tier has no fixed IP, so use `0.0.0.0/0` for this exercise (note this in your report as a trade-off; production would use a paid static-IP setup or private networking).
4. **Database -> Connect -> Drivers** and copy the connection string. Insert the database name before the `?`:
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/studentDB?retryWrites=true&w=majority`
   The `studentDB` database and `students` collection are created automatically on the first insert.

### Step 2 - Run the backend locally (optional but recommended)
```bash
cd backend
npm install
cp .env.example .env      # then edit MONGODB_URI
npm run seed              # optional sample students
npm start                 # http://localhost:5000/health
```

### Step 3 - Push to GitHub
Create a repository and push this whole folder (`.env` is git-ignored).

### Step 4 - Deploy the backend on Render
1. Render dashboard -> **New -> Web Service** -> connect your GitHub repo.
2. Settings:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/health`
3. **Environment** -> add:
   - `MONGODB_URI` = your Atlas string
   - `FRONTEND_URL` = leave a placeholder for now (e.g. `https://placeholder.netlify.app`); update in Step 7
4. Deploy. Copy the URL, e.g. `https://student-api.onrender.com`.
5. Test: open `https://student-api.onrender.com/health` -> `{"status":"ok","database":"connected"}`.

> Render's free tier sleeps after ~15 minutes idle; the first request can take 30-60 seconds. The UI's status indicator shows this.

### Step 5 - Connect the frontend to the backend
Edit `frontend/config.js`:
```js
window.APP_CONFIG = { API_BASE_URL: "https://student-api.onrender.com" };
```
Commit and push.

### Step 6 - Deploy the frontend on Netlify
1. Netlify -> **Add new site -> Import an existing project** -> pick the repo.
2. **Base directory:** `frontend` | **Build command:** *(empty)* | **Publish directory:** `frontend` (or `.` if base directory is set)
3. Deploy, then optionally rename the site (Site configuration -> Change site name) to get e.g. `https://student-management-system.netlify.app`.

### Step 7 - Lock down CORS
Back in Render -> Environment, set
`FRONTEND_URL=https://<your-site>.netlify.app` (no trailing slash; comma-separate multiple origins). Render redeploys automatically. Only this origin can now call the API from a browser.

## Testing checklist (matches the assignment's test cases)
| # | Test | Expected |
|---|---|---|
| 1 | Add student `ST101 / Rahul Sharma / CSE / sem 5` | "Student added successfully" |
| 2 | Student list / `GET /api/students` | All records shown |
| 3 | Edit ST101, semester 5 -> 6 | Updated; Atlas document shows `semester: 6` |
| 4 | Delete ST101 | Removed; gone from Atlas |
| 5 | Open Atlas -> Browse Collections -> `studentDB.students` | Matches what the UI did |
| 6 | Add `ST101` twice | "A student with this Student ID already exists" |
| 7 | Invalid email / semester 12 | Validation message, nothing saved |
| 8 | Call API from a different website origin | Blocked by CORS (403) |

curl examples:
```bash
API=https://student-api.onrender.com
curl -X POST $API/api/students -H "Content-Type: application/json" \
  -d '{"studentId":"ST101","name":"Rahul Sharma","email":"rahul@example.com","department":"Computer Science","semester":5,"contact":"9876543210"}'
curl $API/api/students
curl $API/api/students/ST101
curl -X PUT $API/api/students/ST101 -H "Content-Type: application/json" -d '{"semester":6}'
curl -X DELETE $API/api/students/ST101
```

## Security measures implemented
- Database URI only in Render environment variables; frontend contains no credentials.
- CORS restricted to `FRONTEND_URL`.
- HTTPS everywhere (Netlify and Render provide TLS by default).
- Server-side validation (Mongoose schema) in addition to browser-side checks.
- Whitelisted fields only; object values coerced to strings (blocks NoSQL operator injection); search input regex-escaped.
- `helmet` security headers, 10 KB body limit.
- Generic 500 messages - no stack traces or connection details leaked.
- 503 responses when the database is unreachable instead of hanging.
- Frontend renders data with `textContent` (no HTML injection).

## Optional extensions
JWT login for write operations, pagination, rate limiting (`express-rate-limit`), automated tests.
