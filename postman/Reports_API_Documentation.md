# Reports API Documentation for Frontend

## Base URL
```
http://localhost:3000/api/v1/reports
```

## Authentication
All APIs require JWT Bearer token authentication. Include in headers:
```
Authorization: Bearer {your_jwt_token}
```

---

## 📋 API Endpoints Summary

### **POST Endpoints (Generate Reports)**
1. `POST /job-postings` - Generate Job Postings Report
2. `POST /job-assignments` - Generate Job Assignments Report
3. `POST /staff-performance` - Generate Staff Performance Report
4. `POST /financial` - Generate Financial Report
5. `POST /attendance` - Generate Attendance Report

### **GET Endpoints (Retrieve Reports)**
6. `GET /` - Get All Reports
7. `GET /{reportId}` - Get Report by ID

### **DELETE Endpoint**
8. `DELETE /{reportId}` - Delete Report

---

## 🔧 Detailed API Reference

### 1. Generate Job Postings Report

**Endpoint:** `POST /api/v1/reports/job-postings`

**Request Body:**
```json
{
  "title": "Monthly Job Postings Report",
  "parameters": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "department": "Emergency Medicine",
    "location": "New York",
    "status": "ACTIVE",
    "createdBy": 1
  },
  "fileFormat": "JSON"
}
```

**Required Fields:**
- `title`: Report title (string, max 255 characters)

**Optional Fields:**
- `type`: Report type (automatically inferred from endpoint, so optional)
- `parameters`: Filter parameters (all optional):
  - `startDate`: Start date (YYYY-MM-DD)
  - `endDate`: End date (YYYY-MM-DD)
  - `department`: Filter by department
  - `location`: Filter by location (partial match)
  - `status`: Job status (ACTIVE, COMPLETED, CANCELLED, etc.)
  - `createdBy`: User ID who created the job
- `fileFormat`: JSON, CSV, PDF, or EXCEL (default: JSON)

**Response:**
```json
{
  "message": "Job postings report generated successfully",
  "report": {
    "id": 1,
    "title": "Monthly Job Postings Report",
    "type": "JOB_POSTINGS",
    "summary": {
      "totalJobs": 50,
      "byStatus": { "ACTIVE": 30, "COMPLETED": 20 },
      "byDepartment": { "Emergency Medicine": 25 },
      "byLocation": { "New York": 50 },
      "totalAssignments": 45,
      "totalHours": 450,
      "totalPayment": 67500
    },
    "totalRecords": 50,
    "generatedAt": "2024-01-31T10:30:00.000Z"
  }
}
```

---

### 2. Generate Job Assignments Report

**Endpoint:** `POST /api/v1/reports/job-assignments`

**Request Body:**
```json
{
  "title": "Job Assignments Report",
  "parameters": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "status": "COMPLETED",
    "userId": 5,
    "jobId": 10
  },
  "fileFormat": "CSV"
}
```

**Response:**
```json
{
  "message": "Job assignments report generated successfully",
  "report": {
    "id": 2,
    "title": "Job Assignments Report",
    "type": "JOB_ASSIGNMENTS",
    "summary": {
      "totalAssignments": 120,
      "byStatus": { "COMPLETED": 100 },
      "byRole": { "DOCTOR": 60, "NURSE": 60 },
      "byDepartment": { "Emergency Medicine": 80 },
      "totalHours": 960,
      "totalPayment": 144000,
      "averageHours": 8,
      "averagePayment": 1200
    },
    "totalRecords": 120,
    "generatedAt": "2024-01-31T11:00:00.000Z"
  }
}
```

---

### 3. Generate Staff Performance Report

**Endpoint:** `POST /api/v1/reports/staff-performance`

**Request Body:**
```json
{
  "title": "Staff Performance Report",
  "parameters": {
    "startDate": "2024-01-01",
    "endDate": "2024-03-31",
    "userId": null,
    "role": "DOCTOR",
    "department": "Emergency Medicine"
  },
  "fileFormat": "PDF"
}
```

**Response:**
```json
{
  "message": "Staff performance report generated successfully",
  "report": {
    "id": 3,
    "title": "Staff Performance Report",
    "type": "STAFF_PERFORMANCE",
    "summary": {
      "totalStaff": 25,
      "totalJobs": 300,
      "totalHours": 2400,
      "totalPayment": 360000,
      "averageJobsPerStaff": 12,
      "topPerformers": [
        {
          "user": { "id": 5, "firstName": "John", "lastName": "Doe" },
          "totalJobs": 20,
          "totalHours": 160,
          "totalPayment": 24000
        }
      ]
    },
    "totalRecords": 25,
    "generatedAt": "2024-01-31T11:30:00.000Z"
  }
}
```

---

### 4. Generate Financial Report

**Endpoint:** `POST /api/v1/reports/financial`

**Request Body:**
```json
{
  "title": "Financial Report",
  "parameters": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "department": "Emergency Medicine",
    "location": "New York"
  },
  "fileFormat": "EXCEL"
}
```

**Response:**
```json
{
  "message": "Financial report generated successfully",
  "report": {
    "id": 4,
    "title": "Financial Report",
    "type": "FINANCIAL",
    "summary": {
      "totalAssignments": 200,
      "totalPayment": 300000,
      "totalHours": 1600,
      "averageHourlyRate": 187.5,
      "byDepartment": {
        "Emergency Medicine": { "total": 200000, "count": 120 }
      },
      "byRole": {
        "DOCTOR": { "total": 180000, "count": 100 }
      },
      "byMonth": {
        "2024-01": { "total": 300000, "count": 200 }
      },
      "topEarners": [
        {
          "user": { "firstName": "Jane", "lastName": "Smith" },
          "totalEarnings": 15000
        }
      ]
    },
    "totalRecords": 200,
    "generatedAt": "2024-01-31T12:00:00.000Z"
  }
}
```

---

### 5. Generate Attendance Report

**Endpoint:** `POST /api/v1/reports/attendance`

**Request Body:**
```json
{
  "title": "Attendance Report",
  "parameters": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "userId": 5,
    "department": "Emergency Medicine"
  },
  "fileFormat": "JSON"
}
```

**Response:**
```json
{
  "message": "Attendance report generated successfully",
  "report": {
    "id": 5,
    "title": "Attendance Report",
    "type": "ATTENDANCE",
    "summary": {
      "totalCheckIns": 500,
      "totalWorkHours": 4000,
      "totalBreakTime": 250,
      "lateArrivals": 20,
      "earlyDepartures": 15,
      "byDepartment": {
        "Emergency Medicine": {
          "totalCheckIns": 300,
          "totalWorkHours": 2400,
          "lateArrivals": 12,
          "earlyDepartures": 8
        }
      },
      "attendanceRate": 1.0
    },
    "totalRecords": 500,
    "generatedAt": "2024-01-31T12:30:00.000Z"
  }
}
```

---

### 6. Get All Reports

**Endpoint:** `GET /api/v1/reports`

**Query Parameters:**
- `page` (default: 1) - Page number
- `limit` (default: 10) - Items per page
- `sortBy` (default: generatedAt) - Field to sort by
- `sortOrder` (default: DESC) - ASC or DESC
- `type` (optional) - Filter by report type

**Example:**
```
GET /api/v1/reports?page=1&limit=10&sortBy=generatedAt&sortOrder=DESC&type=JOB_POSTINGS
```

**Response:**
```json
{
  "reports": [
    {
      "id": 1,
      "title": "Monthly Job Postings Report",
      "type": "JOB_POSTINGS",
      "generatedBy": 2,
      "status": "COMPLETED",
      "fileFormat": "JSON",
      "generatedAt": "2024-01-31T10:30:00.000Z",
      "generator": {
        "firstName": "Admin",
        "lastName": "User",
        "email": "admin@locum.com"
      }
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "pages": 3
  }
}
```

---

### 7. Get Report by ID

**Endpoint:** `GET /api/v1/reports/{reportId}`

**Example:**
```
GET /api/v1/reports/1
```

**Response:**
```json
{
  "report": {
    "id": 1,
    "title": "Monthly Job Postings Report",
    "type": "JOB_POSTINGS",
    "generatedBy": 2,
    "parameters": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-31"
    },
    "data": { /* Full report data */ },
    "summary": { /* Summary statistics */ },
    "status": "COMPLETED",
    "fileFormat": "JSON",
    "generatedAt": "2024-01-31T10:30:00.000Z",
    "generator": {
      "firstName": "Admin",
      "lastName": "User",
      "email": "admin@locum.com"
    }
  }
}
```

---

### 8. Delete Report

**Endpoint:** `DELETE /api/v1/reports/{reportId}`

**Example:**
```
DELETE /api/v1/reports/1
```

**Response:**
```json
{
  "message": "Report deleted successfully"
}
```

---

## 🎨 Frontend Implementation Guide

### React/JavaScript Example

```javascript
// API Configuration
const API_BASE_URL = 'http://localhost:3000/api/v1/reports';

// Generate Report Function
async function generateReport(reportType, parameters) {
  try {
    const response = await fetch(`${API_BASE_URL}/${reportType}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        title: `${reportType} Report - ${new Date().toLocaleDateString()}`,
        parameters: parameters,
        fileFormat: 'JSON'
      })
    });

    if (!response.ok) throw new Error('Failed to generate report');
    
    const data = await response.json();
    return data.report;
  } catch (error) {
    console.error('Error generating report:', error);
    throw error;
  }
}

// Get All Reports
async function getAllReports(page = 1, limit = 10, type = null) {
  try {
    let url = `${API_BASE_URL}?page=${page}&limit=${limit}`;
    if (type) url += `&type=${type}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) throw new Error('Failed to fetch reports');
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching reports:', error);
    throw error;
  }
}

// Get Report by ID
async function getReportById(reportId) {
  try {
    const response = await fetch(`${API_BASE_URL}/${reportId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) throw new Error('Failed to fetch report');
    
    const data = await response.json();
    return data.report;
  } catch (error) {
    console.error('Error fetching report:', error);
    throw error;
  }
}

// Delete Report
async function deleteReport(reportId) {
  try {
    const response = await fetch(`${API_BASE_URL}/${reportId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) throw new Error('Failed to delete report');
    
    return await response.json();
  } catch (error) {
    console.error('Error deleting report:', error);
    throw error;
  }
}

// Usage Examples
// Generate job postings report
const jobReport = await generateReport('job-postings', {
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  department: 'Emergency Medicine'
});

// Get all reports
const reports = await getAllReports(1, 10, 'JOB_POSTINGS');

// Get specific report
const report = await getReportById(1);

// Delete report
await deleteReport(1);
```

---

## 📝 Report Types Enum

```javascript
const REPORT_TYPES = {
  JOB_POSTINGS: 'JOB_POSTINGS',
  JOB_ASSIGNMENTS: 'JOB_ASSIGNMENTS',
  STAFF_PERFORMANCE: 'STAFF_PERFORMANCE',
  FINANCIAL: 'FINANCIAL',
  ATTENDANCE: 'ATTENDANCE'
};
```

## 📄 File Formats

```javascript
const FILE_FORMATS = {
  JSON: 'JSON',
  CSV: 'CSV',
  PDF: 'PDF',
  EXCEL: 'EXCEL'
};
```

---

## ⚠️ Error Responses

All APIs return consistent error responses:

```json
{
  "error": "Failed to generate job postings report",
  "message": "Error details here"
}
```

**HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## 🔑 Important Notes

1. **All endpoints require HR or ADMIN role**
2. **File format affects response structure** (JSON returns data, others may return file)
3. **Reports are stored permanently** until deleted
4. **Large date ranges may take time to process**
5. **Summary statistics are always included** in response
6. **Full report data is stored** and can be retrieved via GET

---

## 📊 Frontend UI Recommendations

1. **Report Generation Form:**
   - Date range picker (start/end dates)
   - Dropdown filters (department, location, status, etc.)
   - File format selector
   - Generate button

2. **Reports List View:**
   - Pagination controls
   - Sort by date/type
   - Filter by report type
   - View/Delete actions

3. **Report Details View:**
   - Summary cards (totals, averages, breakdowns)
   - Charts/graphs for visualizations
   - Export options
   - Print functionality

4. **Report Types Dashboard:**
   - Quick stats for each report type
   - Most recent reports
   - Generate new report buttons
