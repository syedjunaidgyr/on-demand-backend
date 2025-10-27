# Reports API - Requirements Mapping

## Required Reports and API Mapping

### 1. **Job Postings Report** ✅
**API:** `POST /api/v1/reports/job-postings`

**What it shows:**
- All job postings with filters (department, location, status, date range)
- Each job includes: creator, assignments count, total hours, total payment
- Summary: Total jobs by status, department, location
- Assignment details for each job

**How to filter:**
```json
{
  "title": "All Job Postings",
  "parameters": {
    "startDate": "2025-01-01",
    "endDate": "2025-01-31",
    "department": "Cardiology",
    "location": "India",
    "status": "ACTIVE",
    "createdBy": 5
  }
}
```

**Data Returned:**
```json
{
  "report": {
    "summary": {
      "totalJobs": 50,
      "byStatus": { "ACTIVE": 30, "COMPLETED": 15, "CANCELLED": 5 },
      "byDepartment": { "Cardiology": 20, "Neurology": 15, "Orthopedics": 15 },
      "byLocation": { "Mumbai": 25, "Delhi": 15, "Bangalore": 10 },
      "totalAssignments": 75,
      "totalHours": 450,
      "totalPayment": 45000
    },
    "totalRecords": 50
  }
}
```

---

### 2. **Pending Jobs Report** ✅
**API:** `POST /api/v1/reports/job-postings`

**What it shows:**
- Jobs with status = "ACTIVE" (not yet assigned)
- Jobs that have been created but no one has accepted yet

**How to filter:**
```json
{
  "title": "Pending Jobs Report",
  "parameters": {
    "status": "ACTIVE"
  }
}
```

**Data Returned:**
- All active jobs that are waiting for assignment
- Jobs with 0 or fewer assignments than required

---

### 3. **Completed Jobs Report** ✅
**API:** `POST /api/v1/reports/job-postings`

**What it shows:**
- Jobs with status = "COMPLETED"
- All completed jobs with their final statistics

**How to filter:**
```json
{
  "title": "Completed Jobs Report",
  "parameters": {
    "status": "COMPLETED",
    "startDate": "2025-01-01",
    "endDate": "2025-01-31"
  }
}
```

**Data Returned:**
- All completed jobs
- Summary showing total completed, by department, by location
- Total hours worked and payments made

---

### 4. **No-Show Jobs Report** ✅
**API:** `POST /api/v1/reports/no-show-jobs`

**What it shows:**
- Jobs where staff accepted but never checked in
- Assignments with status ACCEPTED/ASSIGNED but no check-in records
- Expected payment loss due to no-shows

**How to filter:**
```json
{
  "title": "No-Show Jobs Report",
  "parameters": {
    "startDate": "2025-01-01",
    "endDate": "2025-01-31",
    "department": "Cardiology",
    "location": "Mumbai"
  }
}
```

**Data Returned:**
```json
{
  "report": {
    "summary": {
      "totalNoShows": 12,
      "byDepartment": { "Cardiology": 7, "Neurology": 5 },
      "byRole": { "DOCTOR": 8, "NURSE": 4 },
      "totalExpectedPayment": 48000,
      "averageHoursMissed": 40
    },
    "totalRecords": 12
  }
}
```

---

### 5. **Ongoing Jobs Report** ✅
**API:** `POST /api/v1/reports/job-assignments`

**What it shows:**
- Jobs currently in progress
- Filter by status = "IN_PROGRESS"

**How to filter:**
```json
{
  "title": "Ongoing Jobs Report",
  "parameters": {
    "status": "IN_PROGRESS"
  }
}
```

**Data Returned:**
- All assignments currently in progress
- User details, job details, hours worked so far
- Check-in/check-out times

---

### 6. **Check In/Check Out Report (Timesheet)** ✅
**API:** `POST /api/v1/reports/attendance`

**What it shows:**
- All check-ins and check-outs
- Total work hours, break time
- Late arrivals, early departures
- Grouped by user and department

**How to filter:**
```json
{
  "title": "Timesheet Report - January 2025",
  "parameters": {
    "startDate": "2025-01-01",
    "endDate": "2025-01-31",
    "userId": 10,
    "department": "Cardiology"
  }
}
```

**Data Returned:**
```json
{
  "report": {
    "summary": {
      "totalCheckIns": 150,
      "totalWorkHours": 1200,
      "totalBreakTime": 75,
      "lateArrivals": 5,
      "earlyDepartures": 3,
      "attendanceRate": 95.5,
      "byDepartment": {
        "Cardiology": {
          "totalCheckIns": 80,
          "totalWorkHours": 640,
          "lateArrivals": 2
        }
      }
    }
  }
}
```

**User-level details:**
- For each user: total check-ins, work hours, break time, late arrivals
- Individual check-in/check-out records with timestamps and locations

---

### 7. **Payout Report** ⚠️ (Future Enhancement)
**Status:** Placeholder endpoint exists

**Note:** This will be implemented later. The framework is ready for it.

**Planned Features:**
- Financial summary by user
- Payment breakdown
- Pending payments
- Payment history

---

## Summary of APIs by Your Requirements

| Your Requirement | API Endpoint | Method | Status |
|-----------------|--------------|--------|--------|
| Job Postings | `/job-postings` | POST | ✅ Ready |
| Pending Jobs | `/job-postings` (status=ACTIVE) | POST | ✅ Ready |
| Completed Jobs | `/job-postings` (status=COMPLETED) | POST | ✅ Ready |
| No-Show Jobs | `/no-show-jobs` | POST | ✅ Ready |
| Ongoing Jobs | `/job-assignments` (status=IN_PROGRESS) | POST | ✅ Ready |
| Timesheet | `/attendance` | POST | ✅ Ready |
| Payout | (Future) | POST | ⏳ Planned |

---

## How the Data is Displayed

### 1. **Immediate Response (Quick Summary)**
When you call any report API, you get:
```json
{
  "message": "Report generated successfully",
  "report": {
    "id": 123,
    "title": "Monthly Report",
    "type": "JOB_POSTINGS",
    "summary": { /* Key statistics */ },
    "totalRecords": 150,
    "generatedAt": "2025-01-20T10:30:00Z"
  }
}
```

### 2. **Full Report Data (Detailed View)**
To get the complete report with all data, call:
```
GET /api/v1/reports/:id
```

This returns the full report including:
- **summary**: Aggregated statistics
- **data**: Complete list of records (jobs, assignments, check-ins, etc.)
- **parameters**: Filters used to generate the report
- **generator**: Who created the report
- **generatedAt**: When it was created

---

## Example: Complete Flow

### Step 1: Generate Report
```bash
POST /api/v1/reports/job-postings
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Q1 Job Postings",
  "parameters": {
    "startDate": "2025-01-01",
    "endDate": "2025-03-31",
    "department": "Cardiology"
  }
}
```

### Step 2: Receive Report Summary
```json
{
  "message": "Job postings report generated successfully",
  "report": {
    "id": 45,
    "title": "Q1 Job Postings",
    "type": "JOB_POSTINGS",
    "summary": {
      "totalJobs": 127,
      "byStatus": {
        "ACTIVE": 45,
        "COMPLETED": 72,
        "CANCELLED": 10
      },
      "byDepartment": {
        "Cardiology": 127
      },
      "totalAssignments": 203,
      "totalHours": 1218,
      "totalPayment": 121800
    },
    "totalRecords": 127,
    "generatedAt": "2025-01-20T10:30:00Z"
  }
}
```

### Step 3: Get Full Report (Optional)
```bash
GET /api/v1/reports/45
Authorization: Bearer <token>
```

This gives you all the detailed records in the `data` field.

---

## Frontend Implementation Suggestions

### 1. **Dashboard Widget**
Use the summary data to show quick stats:
```javascript
// Show summary stats on dashboard
const summary = report.summary;
console.log(`Total Jobs: ${summary.totalJobs}`);
console.log(`Completed: ${summary.byStatus.COMPLETED}`);
```

### 2. **Report List Page**
```javascript
// List all generated reports
GET /api/v1/reports?page=1&limit=20&type=JOB_POSTINGS
```

### 3. **Detailed Report View**
```javascript
// Show full report with filters and export options
const fullReport = await fetch(`/api/v1/reports/${reportId}`);
const { data, summary, parameters } = fullReport.report;

// Display data in a table
// Show filters used in generation
// Allow export as CSV, PDF, Excel
```

### 4. **Report Generation Form**
```javascript
const generateReport = async (type, filters) => {
  const response = await fetch(`/api/v1/reports/${type}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      title: `${type} Report - ${new Date().toLocaleDateString()}`,
      parameters: filters,
      fileFormat: 'JSON'
    })
  });
  
  const result = await response.json();
  return result.report;
};
```

---

## Additional Notes

1. **All reports are stored** in the database, so you can retrieve them later
2. **Reports can be exported** in different formats (JSON, CSV, PDF, Excel)
3. **Filters are flexible** - use only what you need
4. **Reports require HR or ADMIN** role to generate
5. **Reports are paginated** when listing all reports
6. **Old reports can be deleted** using `DELETE /api/v1/reports/:id`
