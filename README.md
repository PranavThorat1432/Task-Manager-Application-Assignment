# Task Management Application

A production-ready Task Management Application built with the MERN stack (MongoDB, Express.js, React, Node.js) demonstrating best practices in backend architecture, authentication, security, and deployment.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Security Features](#security-features)
- [Setup Instructions](#setup-instructions)
- [API Documentation](#api-documentation)
- [Frontend Routes](#frontend-routes)
- [Deployment](#deployment)
- [Environment Variables](#environment-variables)
- [License](#license)

## Overview

This application provides a complete task management solution with role-based access control (Admin/User roles), secure authentication using JWT and HTTP-only cookies, and full CRUD operations for tasks with pagination, filtering, and search capabilities.

## Features

### Core Features
- **User Registration & Login** with JWT-based authentication
- **Role-based Access Control** (Admin and User roles)
- **Task Management** (Create, Read, Update, Delete tasks)
- **Task Assignment** (Admin can assign tasks to multiple users)
- **Todo Checklist** within each task with progress tracking
- **File Attachments** support for tasks
- **Dashboard Analytics** with charts and statistics
- **Export Reports** to Excel format

### Security Features
- Password hashing with bcrypt
- HTTP-only, Secure, SameSite cookies
- Input validation and sanitization
- NoSQL injection prevention
- XSS attack prevention
- Proper HTTP status codes
- JWT token expiration handling

### Functional Features
- Pagination in task listing
- Filter tasks by status (Pending, In Progress, Completed)
- Search tasks by title
- Protected frontend routes
- Responsive UI with TailwindCSS

## Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Multer** - File uploads
- **ExcelJS** - Excel report generation

### Frontend
- **React 19** - UI library
- **Redux Toolkit** - State management
- **React Router v7** - Routing
- **TailwindCSS** - Styling
- **Axios** - HTTP client
- **Recharts** - Charts and visualizations
- **React Hot Toast** - Notifications

## Architecture

### Project Structure

```
Task-Manager/
├── backend/
│   ├── controller/         # Route controllers
│   │   ├── auth.controller.js
│   │   ├── task.controller.js
│   │   └── user.controller.js
│   ├── models/             # Mongoose models
│   │   ├── user.model.js
│   │   └── task.model.js
│   ├── routes/             # API routes
│   │   ├── auth.route.js
│   │   ├── task.route.js
│   │   └── user.route.js
│   ├── utils/              # Utility functions
│   │   ├── verifyUser.js   # JWT verification
│   │   ├── error.js        # Error handling
│   │   └── multer.js       # File upload config
│   ├── uploads/            # Uploaded files storage
│   ├── index.js            # Entry point
│   └── .env                # Environment variables
│
└── frontend/
    ├── src/
    │   ├── components/     # Reusable components
    │   ├── pages/          # Page components
    │   │   ├── admin/      # Admin pages
    │   │   ├── user/       # User pages
    │   │   └── auth/       # Auth pages
    │   ├── routes/         # Route components
    │   ├── redux/          # Redux store & slices
    │   └── utils/          # Utility functions
    ├── public/
    └── package.json
```

### Authentication Flow

1. **Registration**: User provides name, email, password → Password hashed with bcrypt → User stored in MongoDB
2. **Login**: Credentials validated → JWT token generated → Token stored in HTTP-only cookie
3. **Protected Routes**: Middleware verifies JWT from cookie → User info attached to request
4. **Logout**: Cookie cleared from browser

### Authorization Model

- **Admin**: Full access to all tasks, can create/assign tasks, view all dashboards
- **User**: Can only view/update tasks assigned to them, access personal dashboard

### Database Schema

**User Schema:**
```javascript
{
  name: String (required),
  email: String (required, unique),
  password: String (required, hashed),
  profileImageUrl: String,
  role: String (enum: ["admin", "user"], default: "user"),
  timestamps: true
}
```

**Task Schema:**
```javascript
{
  title: String (required),
  description: String,
  priority: String (enum: ["Low", "Medium", "High"], default: "Low"),
  status: String (enum: ["Pending", "In Progress", "Completed"], default: "Pending"),
  dueDate: Date (required),
  assignedTo: [ObjectId] (references User),
  createdBy: ObjectId (references User),
  attachments: [String],
  todoChecklist: [{ text: String, completed: Boolean }],
  progress: Number (default: 0),
  timestamps: true
}
```

## Security Features

### Authentication & Authorization
- **JWT Tokens**: Signed with secret key, stored in HTTP-only cookies
- **Cookie Security**: 
  - `httpOnly: true` - Prevents XSS access to token
  - `secure: true` in production - HTTPS only
  - `sameSite: strict` in production - CSRF protection
- **Role-based Access**: Middleware checks user role for admin-only routes

### Input Validation
- All inputs validated for correct data types
- String sanitization to remove `<` and `>` characters (XSS prevention)
- Email format validation with regex
- ObjectId format validation for MongoDB IDs
- Status and priority value validation against enums

### Password Security
- Passwords hashed with bcrypt (salt rounds: 10)
- Minimum password length enforced (6 characters)

### NoSQL Injection Prevention
- Input type checking before database queries
- Mongoose schema validation

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or MongoDB Atlas)
- Git

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create .env file:**
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/task-manager?retryWrites=true&w=majority
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   PORT=3000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:5173
   ADMIN_JOIN_CODE=admin123
   ```

4. **Start the server:**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

   Server will run on `http://localhost:3000`

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

   Frontend will run on `http://localhost:5173`

### Creating Admin User

During registration, include the `adminJoinCode` field with the value matching `ADMIN_JOIN_CODE` from your environment variables to create an admin account.

## API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication Endpoints

#### 1. User Registration
**Endpoint:** `POST /auth/sign-up`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123",
  "profileImageUrl": "https://example.com/image.jpg",
  "adminJoinCode": "admin123"
}
```

**Success Response (201):**
```json
"Signup successful"
```

**Error Response (400):**
```json
{
  "success": false,
  "statusCode": 400,
  "message": "User already exists"
}
```

#### 2. User Login
**Endpoint:** `POST /auth/sign-in`

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Success Response (200):**
```json
{
  "_id": "65abc123...",
  "name": "John Doe",
  "email": "john@example.com",
  "profileImageUrl": "https://...",
  "role": "user"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Wrong Credentials"
}
```

#### 3. Get User Profile
**Endpoint:** `GET /auth/user-profile`

**Headers:** Cookie with `access_token`

**Success Response (200):**
```json
{
  "_id": "65abc123...",
  "name": "John Doe",
  "email": "john@example.com",
  "profileImageUrl": "https://...",
  "role": "user"
}
```

#### 4. Update Profile
**Endpoint:** `PUT /auth/update-profile`

**Headers:** Cookie with `access_token`

**Request Body:**
```json
{
  "name": "Updated Name",
  "email": "newemail@example.com",
  "password": "newpassword123"
}
```

#### 5. Logout
**Endpoint:** `POST /auth/sign-out`

**Success Response (200):**
```json
"User has been loggedout successfully!"
```

### Task Endpoints

#### 1. Create Task (Admin Only)
**Endpoint:** `POST /tasks/create`

**Headers:** Cookie with `access_token`

**Request Body:**
```json
{
  "title": "Complete Project Documentation",
  "description": "Write comprehensive README and API docs",
  "priority": "High",
  "dueDate": "2024-12-31",
  "assignedTo": ["65abc123...", "65def456..."],
  "attachments": ["https://example.com/file.pdf"],
  "todoChecklist": [
    { "text": "Setup project structure", "completed": true },
    { "text": "Write API documentation", "completed": false }
  ]
}
```

**Success Response (201):**
```json
{
  "message": "Task created successfully",
  "task": {
    "_id": "65xyz789...",
    "title": "Complete Project Documentation",
    "description": "Write comprehensive README and API docs",
    "priority": "High",
    "status": "Pending",
    "dueDate": "2024-12-31T00:00:00.000Z",
    "assignedTo": [...],
    "createdBy": "65admin...",
    "progress": 50,
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
}
```

#### 2. Get All Tasks (Paginated, Filtered)
**Endpoint:** `GET /tasks?status=Pending&search=documentation&page=1&limit=10`

**Query Parameters:**
- `status` (optional): Filter by status (Pending, In Progress, Completed)
- `search` (optional): Search by title (case-insensitive)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)

**Success Response (200):**
```json
{
  "tasks": [
    {
      "_id": "65xyz789...",
      "title": "Complete Project Documentation",
      "description": "Write comprehensive README and API docs",
      "priority": "High",
      "status": "Pending",
      "dueDate": "2024-12-31T00:00:00.000Z",
      "assignedTo": [
        {
          "_id": "65abc123...",
          "name": "John Doe",
          "email": "john@example.com",
          "profileImageUrl": "https://..."
        }
      ],
      "completedCount": 1
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalTasks": 48,
    "limit": 10,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "statusSummary": {
    "all": 48,
    "pendingTasks": 20,
    "inProgressTasks": 15,
    "completedTasks": 13
  }
}
```

#### 3. Get Task by ID
**Endpoint:** `GET /tasks/:id`

**Success Response (200):**
```json
{
  "_id": "65xyz789...",
  "title": "Complete Project Documentation",
  "description": "Write comprehensive README and API docs",
  "priority": "High",
  "status": "Pending",
  "dueDate": "2024-12-31T00:00:00.000Z",
  "assignedTo": [...],
  "createdBy": [...],
  "attachments": ["https://example.com/file.pdf"],
  "todoChecklist": [
    { "text": "Setup project structure", "completed": true },
    { "text": "Write API documentation", "completed": false }
  ],
  "progress": 50,
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T12:00:00.000Z"
}
```

#### 4. Update Task
**Endpoint:** `PUT /tasks/:id`

**Request Body:**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "priority": "Medium",
  "dueDate": "2024-12-25",
  "assignedTo": ["65abc123..."],
  "attachments": ["https://example.com/newfile.pdf"],
  "todoChecklist": [
    { "text": "Updated checklist item", "completed": true }
  ]
}
```

**Success Response (200):**
```json
{
  "updatedTask": { ... },
  "message": "Task updated successfully!"
}
```

#### 5. Delete Task (Admin Only or Assigned User)
**Endpoint:** `DELETE /tasks/:id`

**Success Response (200):**
```json
{
  "message": "Task deleted successfully!"
}
```

#### 6. Update Task Status
**Endpoint:** `PUT /tasks/:id/status`

**Request Body:**
```json
{
  "status": "Completed"
}
```

**Success Response (200):**
```json
{
  "message": "Task status updated",
  "task": { ... }
}
```

#### 7. Update Task Checklist
**Endpoint:** `PUT /tasks/:id/todo`

**Request Body:**
```json
{
  "todoChecklist": [
    { "text": "Setup project structure", "completed": true },
    { "text": "Write API documentation", "completed": true }
  ]
}
```

**Success Response (200):**
```json
{
  "message": "Task checklist updated",
  "task": { ... }
}
```

#### 8. Get Admin Dashboard Data
**Endpoint:** `GET /tasks/dashboard-data`

**Success Response (200):**
```json
{
  "statistics": {
    "totalTasks": 100,
    "pendingTasks": 30,
    "completedTasks": 50,
    "overdueTasks": 20
  },
  "charts": {
    "taskDistribution": {
      "Pending": 30,
      "InProgress": 20,
      "Completed": 50,
      "All": 100
    },
    "taskPriorityLevel": {
      "Low": 40,
      "Medium": 35,
      "High": 25
    }
  },
  "recentTasks": [...]
}
```

#### 9. Get User Dashboard Data
**Endpoint:** `GET /tasks/user-dashboard-data`

**Success Response (200):**
```json
{
  "statistics": {
    "totalTasks": 10,
    "pendingTasks": 3,
    "completedTasks": 5,
    "overdueTasks": 2
  },
  "charts": {
    "taskDistribution": { ... },
    "taskPriorityLevel": { ... }
  },
  "recentTasks": [...]
}
```

### User Endpoints

#### 1. Get All Users (Admin Only)
**Endpoint:** `GET /users`

#### 2. Get Dashboard Data
**Endpoint:** `GET /users/dashboard-data`

### Report Endpoints

#### 1. Export Tasks Report (Excel)
**Endpoint:** `GET /reports/export/tasks`

**Query Parameters:**
- `status`: Filter by status
- `search`: Search by title

**Response:** Excel file download

## Frontend Routes

### Public Routes
- `/login` - User login page
- `/signup` - User registration page

### Admin Routes (Protected)
- `/admin/dashboard` - Admin dashboard with analytics
- `/admin/tasks` - Manage all tasks
- `/admin/users` - Manage users
- `/admin/create-task` - Create new task

### User Routes (Protected)
- `/user/dashboard` - User dashboard with personal analytics
- `/user/tasks` - View assigned tasks
- `/user/task-details/:id` - View task details

## Deployment

### Backend Deployment

1. **Environment Setup:**
   Set `NODE_ENV=production` and configure all environment variables securely.

2. **Security Checklist:**
   - Use strong JWT_SECRET
   - Configure `secure: true` for cookies
   - Set proper CORS origin
   - Use MongoDB Atlas for database



### Frontend Deployment

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Deploy to:**
   - **Vercel:** Connect GitHub, auto-deploys on push
   

3. **Configure:**
   - Update API base URL to backend URL
   - Set up environment variables if needed

## Environment Variables

### Backend (.env)
```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# JWT
JWT_SECRET=your-super-secret-jwt-key

# Server
PORT=3000
NODE_ENV=development

# CORS
FRONTEND_URL=http://localhost:5173

# Admin
ADMIN_JOIN_CODE=your-admin-join-code
```

### Frontend (.env - if needed)
```env
VITE_BACKEND_URL=http://localhost:3000/api
```

## Error Handling

The application uses a centralized error handling middleware that returns consistent error responses:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Error message here"
}
```

**Common Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Development Guidelines

### Adding New Features
1. Create route in appropriate route file
2. Add controller function in controller file
3. Add validation and error handling
4. Test with Postman or similar tool
5. Update frontend if needed

### Code Style
- Use async/await for asynchronous operations
- Validate all inputs before processing
- Use proper HTTP status codes
- Add comments for complex logic
- Follow REST API conventions

### Security Checklist
- [ ] All inputs validated
- [ ] Authentication middleware applied
- [ ] Authorization checks in place
- [ ] No sensitive data in logs
- [ ] Environment variables not exposed



