# Locum Healthcare Staffing Backend API

A comprehensive Node.js backend API for healthcare locum staffing management system built with Express.js, Sequelize ORM, and MySQL database.

## 🚀 Features

### HR Management
- **Job Posting**: Create, edit, and manage job postings with location and department filtering
- **Direct Assignment**: Assign jobs directly to specific doctors/nurses
- **Status Tracking**: Monitor job assignments, acceptance rates, and completion status
- **Reports**: Generate comprehensive reports on job postings, assignments, staff performance, and financial data
- **Dashboard**: Real-time overview of jobs, assignments, and staff statistics

### Doctor/Nurse Features
- **Job Discovery**: Browse available jobs by location, department, and specialization
- **Job Acceptance**: Accept or reject job assignments with reason tracking
- **Check-in/Check-out**: Time tracking with location verification
- **Work Status**: View current assignments, work history, and earnings
- **Extension Requests**: Request additional hours for ongoing assignments

### System Features
- **Role-based Access Control**: Secure authentication with JWT tokens
- **Input Validation**: Comprehensive validation using Joi schemas
- **Error Handling**: Centralized error handling with detailed error messages
- **Database Relations**: Properly structured relationships between entities
- **API Documentation**: Well-documented RESTful API endpoints

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL with Sequelize ORM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Joi
- **Security**: Helmet, CORS, Rate Limiting
- **Utilities**: Moment.js, Bcryptjs, Axios

## 📋 Prerequisites

- Node.js (v14 or higher)
- MySQL (v8.0 or higher)
- npm or yarn package manager

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ondemand-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp env.example .env
   ```
   
   Update the `.env` file with your database credentials:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=locum_db
   DB_USER=your_username
   DB_PASSWORD=your_password
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRES_IN=24h
   PORT=3000
   NODE_ENV=development
   ```

4. **Database Setup**
   ```bash
   # Create MySQL database
   mysql -u root -p
   CREATE DATABASE locum_db;
   ```

5. **Setup Database (First Time Only)**
   ```bash
   # Create database schema (drops existing tables)
   npm run setup-db
   
   # Seed with sample data
   npm run seed
   ```

6. **Run the application**
   ```bash
   # Development mode (preserves existing data)
   npm run dev
   
   # Production mode
   npm start
   ```

## 🗄️ Database Commands

### **First Time Setup**
```bash
# Create database schema (WARNING: drops existing tables)
npm run setup-db

# Add sample data
npm run seed
```

### **Development (Data Preserved)**
```bash
# Start server (preserves existing data)
npm run dev
```

### **Reset Database**
```bash
# Clear all data and reseed
npm run reset-db
npm run seed

# Or force reseed (clears and reseeds)
npm run seed:force
```

### **Command Differences**
- **`npm run setup-db`** - Creates fresh schema (drops existing tables)
- **`npm run dev`** - Starts server with data preservation
- **`npm run seed`** - Adds data only if database is empty
- **`npm run seed:force`** - Clears all data and reseeds
- **`npm run reset-db`** - Drops and recreates all tables

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "DOCTOR",
  "department": "Emergency Medicine",
  "location": "New York",
  "specialization": "Emergency Medicine",
  "licenseNumber": "MD123456"
}
```

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### HR Endpoints

#### Create Job Posting
```http
POST /api/v1/hr/jobs
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Emergency Medicine Physician",
  "description": "Urgent need for emergency medicine physician",
  "department": "Emergency Medicine",
  "location": "New York General Hospital",
  "requiredRole": "DOCTOR",
  "specialization": "Emergency Medicine",
  "startDate": "2024-01-15",
  "endDate": "2024-01-15",
  "startTime": "22:00",
  "endTime": "06:00",
  "hourlyRate": 150.00,
  "priority": "URGENT",
  "facilityName": "New York General Hospital",
  "facilityAddress": {
    "street": "123 Medical Center Dr",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  }
}
```

#### Assign Job to User
```http
POST /api/v1/hr/jobs/:jobId/assign
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": 1,
  "hourlyRate": 150.00,
  "notes": "Direct assignment"
}
```

#### Get Dashboard Statistics
```http
GET /api/v1/hr/dashboard
Authorization: Bearer <token>
```

### Doctor/Nurse Endpoints

#### Get Available Jobs
```http
GET /api/v1/doctor/jobs/available?page=1&limit=10&department=Emergency Medicine
Authorization: Bearer <token>
```

#### Accept/Reject Job Assignment
```http
PATCH /api/v1/doctor/assignments/:id/respond
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "ACCEPT" // or "REJECT"
}
```

#### Check In
```http
POST /api/v1/doctor/checkin
Authorization: Bearer <token>
Content-Type: application/json

{
  "jobAssignmentId": 1,
  "checkInLocation": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "address": "New York General Hospital"
  },
  "notes": "Starting shift"
}
```

#### Check Out
```http
POST /api/v1/doctor/checkout
Authorization: Bearer <token>
Content-Type: application/json

{
  "checkInId": 1,
  "checkOutLocation": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "address": "New York General Hospital"
  },
  "notes": "Ending shift"
}
```

### Reports Endpoints

#### Generate Job Postings Report
```http
POST /api/v1/reports/job-postings
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Monthly Job Postings Report",
  "parameters": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "department": "Emergency Medicine"
  },
  "fileFormat": "JSON"
}
```

#### Generate Staff Performance Report
```http
POST /api/v1/reports/staff-performance
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Staff Performance Report",
  "parameters": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "role": "DOCTOR"
  }
}
```

## 🗄️ Database Schema

### Users Table
- `id` (Primary Key)
- `email` (Unique)
- `password` (Hashed)
- `firstName`, `lastName`
- `role` (HR, DOCTOR, NURSE, ADMIN)
- `department`, `location`, `specialization`
- `licenseNumber` (Unique for medical staff)
- `isActive`, `lastLogin`

### Jobs Table
- `id` (Primary Key)
- `title`, `description`
- `department`, `location`
- `requiredRole` (DOCTOR, NURSE)
- `specialization`
- `startDate`, `endDate`, `startTime`, `endTime`
- `hourlyRate`, `priority`
- `status` (ACTIVE, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED)
- `createdBy` (Foreign Key to Users)

### Job Assignments Table
- `id` (Primary Key)
- `jobId` (Foreign Key to Jobs)
- `userId` (Foreign Key to Users)
- `assignedBy` (Foreign Key to Users)
- `status` (PENDING, ACCEPTED, REJECTED, IN_PROGRESS, COMPLETED, CANCELLED)
- `assignedAt`, `acceptedAt`, `rejectedAt`
- `totalHours`, `totalPayment`
- `rating`, `feedback`

### Check-ins Table
- `id` (Primary Key)
- `jobAssignmentId` (Foreign Key to Job Assignments)
- `userId` (Foreign Key to Users)
- `checkInTime`, `checkOutTime`
- `checkInLocation`, `checkOutLocation`
- `status` (CHECKED_IN, CHECKED_OUT, BREAK_START, BREAK_END)
- `totalWorkTime`, `totalBreakTime`
- `isLate`, `isEarlyCheckout`

### Reports Table
- `id` (Primary Key)
- `title`, `type`
- `generatedBy` (Foreign Key to Users)
- `parameters`, `data`, `summary`
- `status` (GENERATING, COMPLETED, FAILED)
- `fileFormat`, `generatedAt`

## 🔐 Authentication & Authorization

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

### User Roles:
- **ADMIN**: Full system access
- **HR**: Job management, user management, reports
- **DOCTOR**: Job viewing, assignment acceptance, check-in/out
- **NURSE**: Job viewing, assignment acceptance, check-in/out

## 📊 Sample Data

The seeder creates sample data including:
- Admin user: `admin@locum.com` / `admin123`
- HR users: `hr1@locum.com` / `hr123456`
- Doctors: `dr.smith@locum.com` / `doctor123456`
- Nurses: `nurse.taylor@locum.com` / `nurse123456`
- Sample jobs in various departments
- Job assignments and check-ins

## 🚀 Deployment

### Environment Variables
```env
NODE_ENV=production
PORT=3000
DB_HOST=your-db-host
DB_PORT=3306
DB_NAME=locum_db
DB_USER=your-db-user
DB_PASSWORD=your-db-password
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h
```

### Production Considerations
- Use environment variables for sensitive data
- Set up proper database backups
- Configure SSL/TLS certificates
- Set up monitoring and logging
- Use a process manager like PM2
- Configure reverse proxy (nginx)

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 📝 API Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

## 🔧 Development

### Project Structure
```
ondemand-backend/
├── config/
│   └── database.js
├── middleware/
│   ├── auth.js
│   └── validation.js
├── models/
│   ├── User.js
│   ├── Job.js
│   ├── JobAssignment.js
│   ├── CheckIn.js
│   ├── Report.js
│   └── index.js
├── routes/
│   ├── auth.js
│   ├── hr.js
│   ├── doctor.js
│   ├── nurse.js
│   ├── jobs.js
│   └── reports.js
├── seeders/
│   └── seed.js
├── utils/
│   ├── helpers.js
│   └── constants.js
├── server.js
├── package.json
└── README.md
```

### Adding New Features
1. Create/update models in `models/` directory
2. Add validation schemas in `middleware/validation.js`
3. Create route handlers in `routes/` directory
4. Update database associations in `models/index.js`
5. Add tests for new functionality

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the API documentation

## 🔄 Version History

- **v1.0.0** - Initial release with core functionality
  - User authentication and authorization
  - Job posting and management
  - Assignment system
  - Check-in/check-out functionality
  - Reporting system
  - Dashboard analytics
