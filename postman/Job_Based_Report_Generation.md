# Job-Based Report Generation

## Overview
Automatically generate reports using job data (start date, end date, department, specialization) to auto-fill report fields.

---

## The Solution

### When You Create a Job
A job contains:
- **Start Date** & **End Date**
- **Department** & **Specialization**
- **Title** & **Location**
- **Hospital** & **Unit Code**

### When You Generate a Report
Instead of manually entering data, use the job's data:
1. Select the job (or use its dates)
2. System automatically maps job data to report fields
3. Generate report with auto-filled data

---

## How It Works

### Option 1: Fetch All Jobs (For Date-Based Filtering)

**API:** `GET /api/v1/hr/jobs`

**Important:** This endpoint returns **ALL jobs** in one response (no pagination), regardless of status by default.

**Query Parameters:**
- `sortBy` - Sort field (default: 'createdAt')
- `sortOrder` - 'ASC' or 'DESC' (default: 'DESC')
- `status` - **Optional** - Filter by status (ACTIVE, ASSIGNED, COMPLETED, CANCELLED, etc.)
- `department` - Filter by department
- `location` - Filter by location
- `requiredRole` - Filter by role (DOCTOR/NURSE)
- `priority` - Filter by priority
- `startDate` - Filter by start date
- `endDate` - Filter by end date
- `minRate` - Minimum hourly rate
- `maxRate` - Maximum hourly rate

**Examples:**
```
# Get ALL jobs (all statuses, no pagination)
GET /api/v1/hr/jobs

# Get only ACTIVE jobs
GET /api/v1/hr/jobs?status=ACTIVE

# Get only COMPLETED jobs
GET /api/v1/hr/jobs?status=COMPLETED

# Get jobs by department
GET /api/v1/hr/jobs?department=General Surgery

# Get jobs sorted by start date
GET /api/v1/hr/jobs?sortBy=startDate&sortOrder=ASC
```

**Response:**
```json
{
  "jobs": [
    {
      "id": 16,
      "title": "General Surgery Nurse - Day Shift",
      "startDate": "2025-10-27",
      "endDate": "2025-10-27",
      "department": "General Surgery",
      "location": "Apollo Hospitals",
      "specialization": "Operating Theatre",
      "status": "ACTIVE",
      "hospitalId": 3,
      "unitCode": "PGIMER_SURG01_23",
      "currentAssignments": 2,
      "assignmentStatus": {
        "PENDING": 0,
        "ACCEPTED": 0,
        "ASSIGNED": 0,
        "IN_PROGRESS": 1,
        "COMPLETED": 0,
        "REJECTED": 0,
        "CANCELLED": 0
      }
    }
  ],
  "total": 50,
  "summary": {
    "byJobStatus": {
      "ACTIVE": 3,
      "ASSIGNED": 7,
      "IN_PROGRESS": 0,
      "COMPLETED": 0,
      "CANCELLED": 1
    },
    "byAssignmentStatus": {
      "PENDING": 1,
      "ACCEPTED": 0,
      "ASSIGNED": 1,
      "IN_PROGRESS": 1,
      "COMPLETED": 6,
      "REJECTED": 0,
      "CANCELLED": 0
    }
  }
}
```

**Status Breakdown:**
- **Job Status** (summary.byJobStatus): ACTIVE, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED
- **Assignment Status** (summary.byAssignmentStatus): PENDING, ACCEPTED, ASSIGNED, IN_PROGRESS, COMPLETED, REJECTED, CANCELLED
- **Per Job** (assignmentStatus): Shows counts for each assignment status per job

**What Gets Mapped:**
- `startDate` → Report Start Date
- `endDate` → Report End Date
- `department` → Report Department Filter
- `location` → Report Location Filter
- `title` → Report Title

**User Workflow:**
1. Select a job from the list
2. Dates, department, location auto-fill
3. Click "Generate Report"

---

### Option 2: Use Job ID (Best Solution)

**API:** `GET /api/v1/hr/jobs/{jobId}`

**Example:** `GET /api/v1/hr/jobs/16`

**Response:**
```json
{
  "job": {
    "id": 16,
    "title": "General Surgery Nurse - Day Shift",
    "description": "We are looking for a skilled General Surgery Nurse...",
    "department": "General Surgery",
    "location": "Apollo Hospitals, Whitefield, Bengaluru",
    "startDate": "2025-10-27T00:00:00.000Z",
    "endDate": "2025-10-27T00:00:00.000Z",
    "startTime": "09:00",
    "endTime": "16:00",
    "specialization": "Operating Theatre",
    "hourlyRate": 190,
    "hospitalId": 3,
    "unitCode": "PGIMER_SURG01_23"
  }
}
```

**Auto-Map to Report:**
```json
{
  "title": "General Surgery Nurse - Day Shift Report",
  "parameters": {
    "jobId": 16,
    "startDate": "2025-10-27",
    "endDate": "2025-10-27",
    "department": "General Surgery",
    "location": "Apollo Hospitals",
    "specialization": "Operating Theatre"
  }
}
```

**User Workflow:**
1. Enter job ID (e.g., 16)
2. System fetches job details
3. Auto-fills all report fields
4. Click "Generate Report"

---

## Complete Workflow

### Step 1: Create Job
```
POST /api/v1/hr/jobs
{
  "title": "General Surgery Nurse - Day Shift",
  "startDate": "2025-10-27",
  "endDate": "2025-10-27",
  "department": "General Surgery",
  "location": "Apollo Hospitals",
  "specialization": "Operating Theatre"
}
→ Job created with ID: 16
```

### Step 2: Generate Report for That Job
```
Option A - Use Job ID:
User enters: jobId = 16
Auto-fills:
  - startDate: "2025-10-27"
  - endDate: "2025-10-27"
  - department: "General Surgery"
  - location: "Apollo Hospitals"

Option B - Use Job Dates:
User enters: startDate = "2025-10-27", endDate = "2025-10-27"
System fetches all jobs with those dates
Auto-fills department, location from matching jobs
```

### Step 3: Report Generated
```
POST /api/v1/reports/job-postings
{
  "title": "General Surgery Nurse Report",
  "parameters": {
    "jobId": 16,
    "startDate": "2025-10-27",
    "endDate": "2025-10-27",
    "department": "General Surgery"
  }
}
→ Report generated with all job data
```

---

## Benefits

### 1. **No Manual Data Entry**
- Job data already exists
- Just select the job or enter job ID
- All fields auto-fill

### 2. **Accurate Dates**
- Dates come directly from the job
- No typos or mismatches
- Always synchronized with job dates

### 3. **Automatic Mapping**
- Department → Auto-fills
- Location → Auto-fills
- Specialization → Auto-fills
- Title → Auto-fills

### 4. **Best Solution**
- Single source of truth (job data)
- No duplication of data
- Always consistent

### 5. **Works for Existing Jobs Too**
- Not just newly created jobs
- Any job with dates
- Historical reports too

---

## Summary

### The Solution
**Map job data to report fields automatically**

### APIs Needed
1. **Fetch Jobs:** `GET /api/v1/hr/jobs`
   - Returns all jobs with dates, department, location
   
2. **Fetch Single Job:** `GET /api/v1/hr/jobs/{jobId}`
   - Returns complete job details for auto-fill

3. **Generate Report:** `POST /api/v1/reports/job-postings`
   - Uses job ID or dates to filter
   - Auto-fills all parameters

### What Gets Auto-Filled
✅ Start Date (from job)
✅ End Date (from job)
✅ Department (from job)
✅ Location (from job)
✅ Specialization (from job)
✅ Title (from job)

### Result
- **Newly created job:** Available immediately
- **Existing jobs:** Also available
- **Report:** Auto-generated with job data
- **Best solution:** No manual data entry needed
