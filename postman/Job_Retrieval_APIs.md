# Job Retrieval APIs

## Overview
This document explains how to retrieve job details and information from the system.

---

## 1. Get Single Job Details

### Endpoint
```
GET /api/v1/hr/jobs/:jobId
```

### Authentication
- **Required**: Yes
- **Method**: Bearer Token (JWT)
- **Roles**: HR, ADMIN

### Description
Retrieves complete details of a specific job including all assignments, staff information, and check-in history.

### URL Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `jobId` | Integer | Yes | The ID of the job to retrieve |

### Response
**Success (200 OK)**
```json
{
  "job": {
    "id": 16,
    "title": "General Surgery Nurse - Day Shift",
    "description": "We are looking for a skilled General Surgery Nurse...",
    "department": "General Surgery",
    "location": "Apollo Hospitals, Whitefield, Bengaluru",
    "requiredRole": "NURSE",
    "startDate": "2025-10-27T00:00:00.000Z",
    "endDate": "2025-10-27T00:00:00.000Z",
    "startTime": "09:00",
    "endTime": "16:00",
    "hourlyRate": 190,
    "status": "ACTIVE",
    "hospitalId": 3,
    "unitCode": "PGIMER_SURG01_23",
    "creator": {
      "id": 14,
      "firstName": "Admin",
      "lastName": "User",
      "email": "admin@example.com"
    },
    "assignments": [
      {
        "id": 45,
        "status": "PENDING",
        "hourlyRate": 190,
        "createdAt": "2025-10-27T06:15:16.000Z",
        "user": {
          "id": 8,
          "firstName": "Nurse",
          "lastName": "Smith",
          "email": "nurse@example.com",
          "role": "NURSE"
        },
        "checkIns": []
      }
    ]
  }
}
```

### cURL Example
```bash
curl --location 'http://192.168.1.79:3000/api/v1/hr/jobs/16' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN'
```

---

## 2. Get All Jobs

### Endpoint
```
GET /api/v1/hr/jobs
```

### Authentication
- **Required**: Yes
- **Method**: Bearer Token (JWT)
- **Roles**: HR, ADMIN

### Query Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | Integer | No | 1 | Page number for pagination |
| `limit` | Integer | No | 10 | Number of results per page |
| `status` | String | No | - | Filter by status (ACTIVE, ASSIGNED, COMPLETED, etc.) |
| `department` | String | No | - | Filter by department |
| `location` | String | No | - | Filter by location |

### Response
**Success (200 OK)**
```json
{
  "jobs": [
    {
      "id": 16,
      "title": "General Surgery Nurse - Day Shift",
      "status": "ACTIVE",
      "department": "General Surgery",
      "location": "Apollo Hospitals, Whitefield, Bengaluru",
      "startDate": "2025-10-27T00:00:00.000Z",
      "hourlyRate": 190
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalItems": 1,
    "itemsPerPage": 10
  }
}
```

### cURL Example
```bash
curl --location 'http://192.168.1.79:3000/api/v1/hr/jobs?status=ACTIVE&limit=20' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN'
```

---

## 3. Get Job Assignments

### Endpoint
```
GET /api/v1/hr/jobs/:jobId/assignments
```

### Authentication
- **Required**: Yes
- **Method**: Bearer Token (JWT)
- **Roles**: HR, ADMIN

### Description
Gets all assignments for a specific job with detailed staff information.

### Response
**Success (200 OK)**
```json
{
  "jobId": 16,
  "assignments": [
    {
      "id": 45,
      "status": "PENDING",
      "hourlyRate": 190,
      "createdAt": "2025-10-27T06:15:16.000Z",
      "user": {
        "id": 8,
        "firstName": "Nurse",
        "lastName": "Smith",
        "email": "nurse@example.com",
        "role": "NURSE"
      },
      "totalHours": 0,
      "totalPayment": 0
    }
  ],
  "totalAssignments": 1
}
```

### cURL Example
```bash
curl --location 'http://192.168.1.79:3000/api/v1/hr/jobs/16/assignments' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN'
```

---

## 4. Get Job Status

### Endpoint
```
GET /api/v1/hr/jobs/:jobId/status
```

### Authentication
- **Required**: Yes
- **Method**: Bearer Token (JWT)
- **Roles**: HR, ADMIN

### Description
Quick status check for a job including assignment count and summary.

### Response
**Success (200 OK)**
```json
{
  "jobId": 16,
  "status": "ACTIVE",
  "totalAssignments": 0,
  "acceptedAssignments": 0,
  "assignedAssignments": 0,
  "completedAssignments": 0
}
```

### cURL Example
```bash
curl --location 'http://192.168.1.79:3000/api/v1/hr/jobs/16/status' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN'
```

---

## How to Use in Reports

### Step 1: Generate Report
Use the reports API to get a list of jobs:
```bash
POST /api/v1/reports/job-postings
```

### Step 2: Get Detailed Job Information
For each job ID in the report, call:
```bash
GET /api/v1/hr/jobs/:jobId
```

This gives you the complete job details including:
- All assignments
- Staff information
- Check-in/check-out history
- Payment details

### Example Workflow
```javascript
// 1. Generate report
const report = await fetch('/api/v1/reports/job-postings', {
  method: 'POST',
  body: JSON.stringify({
    title: "All Active Jobs",
    parameters: { status: "ACTIVE" }
  })
});

const reportData = await report.json();

// 2. Get details for each job
for (const job of reportData.report.data) {
  const jobDetails = await fetch(`/api/v1/hr/jobs/${job.id}`);
  const details = await jobDetails.json();
  console.log('Full job details:', details.job);
}
```

---

## Quick Reference for Frontend

### Display Job in Reports Table
```javascript
// Show job in reports
const columns = [
  'Job ID',
  'Title',
  'Department',
  'Location',
  'Status',
  'Hourly Rate',
  'Actions'
];

// On row click, fetch full details
const handleRowClick = async (jobId) => {
  const response = await fetch(`/api/v1/hr/jobs/${jobId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const { job } = await response.json();
  // Display full details in modal or new page
};
```

### Get Job After Creation
```javascript
// After creating job
const createJob = async (jobData) => {
  const response = await fetch('/api/v1/hr/jobs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(jobData)
  });
  
  const result = await response.json();
  const jobId = result.job.id;
  
  // Immediately fetch full details
  const detailsResponse = await fetch(`/api/v1/hr/jobs/${jobId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const { job } = await detailsResponse.json();
  
  return job;
};
```
