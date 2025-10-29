# Reports Dropdown Implementation Guide

## Overview
This document explains how to implement a dropdown that shows all previous report titles and auto-fills their details when selected.

---

## API to Call

### **GET /api/v1/reports**

#### Purpose
Fetch all previously generated reports including their titles and parameters.

#### URL
```
GET /api/v1/reports?page=1&limit=50
```

#### Query Parameters
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `page` | Integer | Page number | 1 |
| `limit` | Integer | Number of reports per page | 10 |
| `sortBy` | String | Sort field (generatedAt) | generatedAt |
| `sortOrder` | String | Sort order (ASC/DESC) | DESC |
| `type` | String | Filter by report type (JOB_POSTINGS, JOB_ASSIGNMENTS, etc.) | Optional |

#### Headers
```
Authorization: Bearer {token}
Content-Type: application/json
```

#### Response Structure
```json
{
  "reports": [
    {
      "id": 2,
      "title": "Monthly Job Postings Report",
      "type": "JOB_POSTINGS",
      "parameters": {
        "startDate": "2025-10-01",
        "endDate": "2025-10-27",
        "department": "General Surgery",
        "location": "Apollo Hospitals",
        "status": "ACTIVE"
      },
      "generatedAt": "2025-10-27T06:18:25.634Z",
      "status": "COMPLETED",
      "fileFormat": "JSON"
    },
    {
      "id": 3,
      "title": "Today's Jobs Report",
      "type": "JOB_POSTINGS",
      "parameters": {
        "status": "ACTIVE"
      },
      "generatedAt": "2025-10-27T08:15:30.123Z",
      "status": "COMPLETED",
      "fileFormat": "JSON"
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 50,
    "pages": 1
  }
}
```

---

## How It Works

### 1. **Fetch Previous Reports**

On the Reports Screen:

**API Call:**
```typescript
// Fetch all previous reports
const response = await fetch('http://your-api/api/v1/reports?page=1&limit=100', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const data = await response.json();
const reports = data.reports; // Array of all previous reports
```

### 2. **Show Titles in Dropdown**

Populate the dropdown with report titles:

**Dropdown Options:**
```
┌─────────────────────────────────────┐
│ ▼ Select a Previous Report         │
├─────────────────────────────────────┤
│ Monthly Job Postings Report        │ ← Previous report
│ Today's Jobs Report                │ ← Previous report
│ Weekly Attendance Report           │ ← Previous report
│ No-Show Jobs - October 2025        │ ← Previous report
│ [Create New Report]                │ ← Option to create new
└─────────────────────────────────────┘
```

### 3. **Auto-Fill Details**

When user selects a previous report from the dropdown:

**Example: User selects "Monthly Job Postings Report" (ID: 2)**

The form auto-fills with:
- **Title:** "Monthly Job Postings Report"
- **Start Date:** "2025-10-01"
- **End Date:** "2025-10-27"
- **Department:** "General Surgery"
- **Location:** "Apollo Hospitals"
- **Status:** "ACTIVE"
- **Report Type:** Job Postings
- **File Format:** JSON

### 4. **Generation**

User clicks "Generate Report" button and the report is generated with these pre-filled values.

---

## What Gets Auto-Filled

### From Previous Reports

Each previous report has:
- **Title** - The report name
- **Parameters** - All filters used
  - `startDate` → Auto-fill Start Date field
  - `endDate` → Auto-fill End Date field
  - `department` → Auto-fill Department field
  - `location` → Auto-fill Location field
  - `status` → Auto-fill Status field
  - `jobId` → Auto-fill Job ID field
  - `userId` → Auto-fill User ID field
- **Type** - Report type (Job Postings, Assignments, etc.)
- **File Format** - JSON, CSV, PDF, EXCEL

### Current Report

When you generate a new report:
- It gets saved with ID
- It appears in the dropdown immediately
- You can re-use it by selecting from dropdown

---

## Example Workflow

### Step 1: Generate Initial Report
```
User fills form manually:
- Title: "Monthly Job Postings Report"
- Start Date: "2025-10-01"
- End Date: "2025-10-27"
- Department: "General Surgery"
- Location: "Apollo Hospitals"
- Status: "ACTIVE"

Clicks "Generate Report"
→ Report ID 2 is created and saved
```

### Step 2: Report Appears in Dropdown
```
Dropdown now shows:
├─ Monthly Job Postings Report (ID: 2)
```

### Step 3: Re-use Report
```
User selects "Monthly Job Postings Report" from dropdown
→ Form auto-fills all the fields
→ User clicks "Generate Report"
→ New report with same parameters is generated
```

### Step 4: New Report Also Appears
```
New report (ID: 3) now appears in dropdown:
├─ Monthly Job Postings Report (ID: 2)
├─ Monthly Job Postings Report (ID: 3) ← New one
```

---

## Benefits

### 1. **Time Saving**
- No need to manually enter same filters repeatedly
- One click to reuse previous configuration

### 2. **Consistency**
- Same parameters used across multiple reports
- No typos or date mismatches

### 3. **Convenience**
- All previous reports accessible in one place
- Easy to regenerate reports with same criteria

### 4. **Both Previous & Current**
- Previous reports: Already in database
- Current report: Shows up immediately after generation

---

## Summary

### API to Call
**GET /api/v1/reports?page=1&limit=100**

### What It Returns
- All previous reports with ID, title, parameters
- New reports you just created
- Complete details for auto-filling

### What Gets Auto-Filled
- Title
- Start date
- End date
- Department
- Location
- Status
- All other filter parameters

### Result
✅ Previous reports: Yes, from database
✅ Current report: Yes, appears after creation
✅ Dropdown: Shows all report titles
✅ Auto-fill: Fills all form fields when selected
