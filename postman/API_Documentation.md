# Locum Healthcare Backend API Documentation

## Overview
Complete API collection for the Locum Healthcare Staffing Backend System with all endpoints, request/response examples, and authentication details.

## Setup Instructions

### 1. Import Collection and Environment
1. Import `Locum_Healthcare_Backend_API.postman_collection.json` into Postman
2. Import `Locum_Healthcare_Environment.postman_environment.json` into Postman
3. Select the "Locum Healthcare Environment" in Postman

### 2. Authentication Setup
1. First, run the **Login** request under Authentication
2. The JWT token will be automatically saved to the environment variable
3. All subsequent requests will use this token for authentication

## API Endpoints

### Authentication APIs

#### Register User
- **Method:** POST
- **URL:** `/api/v1/auth/register`
- **Body:** User registration data with role, department, etc.
- **Response:** User object and JWT token

#### Login
- **Method:** POST
- **URL:** `/api/v1/auth/login`
- **Body:** Email and password
- **Response:** User object and JWT token (auto-saved to environment)

#### Get Profile
- **Method:** GET
- **URL:** `/api/v1/auth/profile`
- **Headers:** Authorization: Bearer {token}
- **Response:** Current user profile

#### Update Profile
- **Method:** PUT
- **URL:** `/api/v1/auth/profile`
- **Headers:** Authorization: Bearer {token}
- **Body:** Updated profile fields
- **Response:** Updated user profile

#### Change Password
- **Method:** PUT
- **URL:** `/api/v1/auth/change-password`
- **Headers:** Authorization: Bearer {token}
- **Body:** Current and new password
- **Response:** Success message

#### Logout
- **Method:** POST
- **URL:** `/api/v1/auth/logout`
- **Headers:** Authorization: Bearer {token}
- **Response:** Success message

#### Refresh Token
- **Method:** POST
- **URL:** `/api/v1/auth/refresh`
- **Headers:** Authorization: Bearer {token}
- **Response:** New JWT token

### HR Management APIs

#### Get All Users
- **Method:** GET
- **URL:** `/api/v1/hr/users`
- **Headers:** Authorization: Bearer {token}
- **Query Parameters:**
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Items per page (default: 10)
  - `sortBy` (optional): Sort field (default: createdAt)
  - `sortOrder` (optional): ASC or DESC (default: DESC)
- **Response:** Paginated list of users

#### Get User by ID
- **Method:** GET
- **URL:** `/api/v1/hr/users/{userId}`
- **Headers:** Authorization: Bearer {token}
- **Response:** User details

#### Create Job Posting
- **Method:** POST
- **URL:** `/api/v1/hr/jobs`
- **Headers:** Authorization: Bearer {token}
- **Body:** Complete job posting data
- **Response:** Created job object (ID auto-saved to environment)

#### Get All Jobs
- **Method:** GET
- **URL:** `/api/v1/hr/jobs`
- **Headers:** Authorization: Bearer {token}
- **Query Parameters:**
  - `page`, `limit`, `sortBy`, `sortOrder` (pagination)
  - `department`, `location`, `requiredRole`, `status`, `priority` (filters)
  - `startDate`, `endDate`, `minRate`, `maxRate` (date/rate filters)
- **Response:** Paginated list of jobs with assignments

#### Get Job by ID
- **Method:** GET
- **URL:** `/api/v1/hr/jobs/{jobId}`
- **Headers:** Authorization: Bearer {token}
- **Response:** Job details with assignments and check-ins

#### Update Job
- **Method:** PUT
- **URL:** `/api/v1/hr/jobs/{jobId}`
- **Headers:** Authorization: Bearer {token}
- **Body:** Updated job fields
- **Response:** Updated job object

#### Cancel Job
- **Method:** PATCH
- **URL:** `/api/v1/hr/jobs/{jobId}/cancel`
- **Headers:** Authorization: Bearer {token}
- **Body:** Cancellation reason
- **Response:** Updated job object

#### Assign Job to User
- **Method:** POST
- **URL:** `/api/v1/hr/jobs/{jobId}/assign`
- **Headers:** Authorization: Bearer {token}
- **Body:** User ID, hourly rate, notes
- **Response:** Created assignment object (ID auto-saved to environment)

#### Get Job Assignments
- **Method:** GET
- **URL:** `/api/v1/hr/jobs/{jobId}/assignments`
- **Headers:** Authorization: Bearer {token}
- **Response:** List of assignments for the job

#### Get Job Status Summary
- **Method:** GET
- **URL:** `/api/v1/hr/jobs/{jobId}/status`
- **Headers:** Authorization: Bearer {token}
- **Response:** Status summary with assignment counts

#### Get HR Dashboard
- **Method:** GET
- **URL:** `/api/v1/hr/dashboard`
- **Headers:** Authorization: Bearer {token}
- **Response:** Dashboard statistics and recent activities

### Doctor APIs

#### Get Available Jobs
- **Method:** GET
- **URL:** `/api/v1/doctor/jobs/available`
- **Headers:** Authorization: Bearer {token}
- **Query Parameters:**
  - `page`, `limit`, `sortBy`, `sortOrder` (pagination)
  - `department`, `location`, `specialization` (filters)
  - `startDate`, `endDate`, `minRate`, `maxRate` (filters)
- **Response:** Available jobs for doctors

#### Get Upcoming Jobs
- **Method:** GET
- **URL:** `/api/v1/doctor/jobs/upcoming`
- **Headers:** Authorization: Bearer {token}
- **Response:** Today's and tomorrow's jobs

#### Get My Assignments
- **Method:** GET
- **URL:** `/api/v1/doctor/assignments`
- **Headers:** Authorization: Bearer {token}
- **Query Parameters:**
  - `page`, `limit`, `sortBy`, `sortOrder` (pagination)
  - `status` (filter by assignment status)
- **Response:** Doctor's job assignments

#### Accept Job Assignment
- **Method:** PATCH
- **URL:** `/api/v1/doctor/assignments/{assignmentId}/respond`
- **Headers:** Authorization: Bearer {token}
- **Body:** Action: "ACCEPT"
- **Response:** Updated assignment

#### Reject Job Assignment
- **Method:** PATCH
- **URL:** `/api/v1/doctor/assignments/{assignmentId}/respond`
- **Headers:** Authorization: Bearer {token}
- **Body:** Action: "REJECT", rejectionReason
- **Response:** Updated assignment

#### Check In
- **Method:** POST
- **URL:** `/api/v1/doctor/checkin`
- **Headers:** Authorization: Bearer {token}
- **Body:** Job assignment ID, location, notes
- **Response:** Check-in record

#### Check Out
- **Method:** POST
- **URL:** `/api/v1/doctor/checkout`
- **Headers:** Authorization: Bearer {token}
- **Body:** Check-in ID, location, notes
- **Response:** Check-out record with work time calculations

#### Get My Work Status
- **Method:** GET
- **URL:** `/api/v1/doctor/status`
- **Headers:** Authorization: Bearer {token}
- **Response:** Current assignments, monthly stats, today's check-ins

#### Request Job Extension
- **Method:** POST
- **URL:** `/api/v1/doctor/assignments/{assignmentId}/request-extension`
- **Headers:** Authorization: Bearer {token}
- **Body:** Reason, requested hours
- **Response:** Updated assignment with extension request

### Nurse APIs

#### Get Available Jobs
- **Method:** GET
- **URL:** `/api/v1/nurse/jobs/available`
- **Headers:** Authorization: Bearer {token}
- **Query Parameters:** Same as doctor available jobs
- **Response:** Available jobs for nurses

#### Get Upcoming Jobs
- **Method:** GET
- **URL:** `/api/v1/nurse/jobs/upcoming`
- **Headers:** Authorization: Bearer {token}
- **Response:** Today's and tomorrow's jobs

#### Get My Assignments
- **Method:** GET
- **URL:** `/api/v1/nurse/assignments`
- **Headers:** Authorization: Bearer {token}
- **Query Parameters:** Same as doctor assignments
- **Response:** Nurse's job assignments

#### Accept Job Assignment
- **Method:** PATCH
- **URL:** `/api/v1/nurse/assignments/{assignmentId}/respond`
- **Headers:** Authorization: Bearer {token}
- **Body:** Action: "ACCEPT"
- **Response:** Updated assignment

#### Reject Job Assignment
- **Method:** PATCH
- **URL:** `/api/v1/nurse/assignments/{assignmentId}/respond`
- **Headers:** Authorization: Bearer {token}
- **Body:** Action: "REJECT", rejectionReason
- **Response:** Updated assignment

#### Check In
- **Method:** POST
- **URL:** `/api/v1/nurse/checkin`
- **Headers:** Authorization: Bearer {token}
- **Body:** Job assignment ID, location, notes
- **Response:** Check-in record

#### Check Out
- **Method:** POST
- **URL:** `/api/v1/nurse/checkout`
- **Headers:** Authorization: Bearer {token}
- **Body:** Check-in ID, location, notes
- **Response:** Check-out record with work time calculations

#### Get My Work Status
- **Method:** GET
- **URL:** `/api/v1/nurse/status`
- **Headers:** Authorization: Bearer {token}
- **Response:** Current assignments, monthly stats, today's check-ins

#### Request Job Extension
- **Method:** POST
- **URL:** `/api/v1/nurse/assignments/{assignmentId}/request-extension`
- **Headers:** Authorization: Bearer {token}
- **Body:** Reason, requested hours
- **Response:** Updated assignment with extension request

### General Jobs APIs

#### Search Jobs
- **Method:** GET
- **URL:** `/api/v1/jobs/search`
- **Headers:** Optional Authorization: Bearer {token}
- **Query Parameters:**
  - `page`, `limit`, `sortBy`, `sortOrder` (pagination)
  - `search` (text search in title, description, department, location)
  - `department`, `location`, `requiredRole`, `specialization` (filters)
  - `startDate`, `endDate`, `minRate`, `maxRate` (filters)
- **Response:** Search results with job details

#### Get Job by ID
- **Method:** GET
- **URL:** `/api/v1/jobs/{jobId}`
- **Headers:** Optional Authorization: Bearer {token}
- **Response:** Job details (includes user assignment if authenticated)

#### Get Departments
- **Method:** GET
- **URL:** `/api/v1/jobs/categories/departments`
- **Response:** List of all departments

#### Get Locations
- **Method:** GET
- **URL:** `/api/v1/jobs/categories/locations`
- **Response:** List of all locations

#### Get Specializations
- **Method:** GET
- **URL:** `/api/v1/jobs/categories/specializations`
- **Response:** List of all specializations

#### Get Urgent Jobs
- **Method:** GET
- **URL:** `/api/v1/jobs/featured/urgent`
- **Response:** List of urgent priority jobs

#### Get Recent Jobs
- **Method:** GET
- **URL:** `/api/v1/jobs/featured/recent`
- **Response:** List of recently posted jobs

#### Get Job Statistics
- **Method:** GET
- **URL:** `/api/v1/jobs/stats/overview`
- **Response:** Job statistics overview

### Reports APIs

#### Generate Job Postings Report
- **Method:** POST
- **URL:** `/api/v1/reports/job-postings`
- **Headers:** Authorization: Bearer {token}
- **Body:** Report title, type, parameters, file format
- **Response:** Generated report details

#### Generate Job Assignments Report
- **Method:** POST
- **URL:** `/api/v1/reports/job-assignments`
- **Headers:** Authorization: Bearer {token}
- **Body:** Report configuration
- **Response:** Generated report details

#### Generate Staff Performance Report
- **Method:** POST
- **URL:** `/api/v1/reports/staff-performance`
- **Headers:** Authorization: Bearer {token}
- **Body:** Report configuration
- **Response:** Generated report details

#### Generate Financial Report
- **Method:** POST
- **URL:** `/api/v1/reports/financial`
- **Headers:** Authorization: Bearer {token}
- **Body:** Report configuration
- **Response:** Generated report details

#### Generate Attendance Report
- **Method:** POST
- **URL:** `/api/v1/reports/attendance`
- **Headers:** Authorization: Bearer {token}
- **Body:** Report configuration
- **Response:** Generated report details

#### Get All Reports
- **Method:** GET
- **URL:** `/api/v1/reports`
- **Headers:** Authorization: Bearer {token}
- **Query Parameters:**
  - `page`, `limit`, `sortBy`, `sortOrder` (pagination)
  - `type` (filter by report type)
- **Response:** Paginated list of reports

#### Get Report by ID
- **Method:** GET
- **URL:** `/api/v1/reports/{reportId}`
- **Headers:** Authorization: Bearer {token}
- **Response:** Report details and data

#### Delete Report
- **Method:** DELETE
- **URL:** `/api/v1/reports/{reportId}`
- **Headers:** Authorization: Bearer {token}
- **Response:** Success message

### System APIs

#### Health Check
- **Method:** GET
- **URL:** `/health`
- **Response:** System health status

## Sample Data

The system comes with pre-seeded data:

### Login Credentials
- **Admin:** `admin@locum.com` / `admin123`
- **HR:** `hr1@locum.com` / `hr123456`
- **Doctor:** `dr.smith@locum.com` / `doctor123456`
- **Nurse:** `nurse.taylor@locum.com` / `nurse123456`

### Sample Jobs
- Emergency Medicine Physician - Night Shift
- ICU Nurse - Day Shift
- General Surgery Assistant
- Pediatric Nurse - Weekend Coverage

## Environment Variables

The Postman collection uses these environment variables:
- `base_url`: API base URL (default: http://localhost:3000)
- `jwt_token`: JWT authentication token (auto-populated)
- `user_id`: Current user ID (auto-populated)
- `job_id`: Current job ID (auto-populated)
- `assignment_id`: Current assignment ID (auto-populated)
- `checkin_id`: Current check-in ID (auto-populated)
- `report_id`: Current report ID (auto-populated)

## Error Handling

All APIs return consistent error responses:
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "fieldName",
      "message": "Field-specific error message"
    }
  ]
}
```

## Success Responses

All successful operations return:
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

## Testing Workflow

1. **Start the server:** `npm run dev`
2. **Seed the database:** `npm run seed:force`
3. **Import Postman collection and environment**
4. **Login** to get JWT token
5. **Test HR APIs** (create jobs, assign to users)
6. **Test Doctor/Nurse APIs** (view jobs, accept assignments, check-in/out)
7. **Test Reports** (generate various reports)
8. **Test General APIs** (search, categories, statistics)

## Notes

- All timestamps are in ISO 8601 format
- Location coordinates use latitude/longitude
- Time formats are in HH:MM (24-hour format)
- Date formats are in YYYY-MM-DD
- All monetary values are in decimal format
- Pagination starts from page 1
- Default page size is 10 items
- Maximum page size is 100 items
