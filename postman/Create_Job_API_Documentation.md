# Create Job API Documentation

## Endpoint
**POST** `/api/v1/hr/jobs`

## Authentication
**Required:** Bearer Token (HR or ADMIN role)

**Header:**
```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

---

## Request Body Structure

### Required Fields

```json
{
  "title": "Emergency Medicine Physician - Night Shift",
  "description": "Urgent need for experienced emergency medicine physician for night shift. Must have ACLS certification.",
  "department": "Emergency Medicine",
  "location": "New York General Hospital",
  "requiredRole": "DOCTOR",
  "specialization": "Accident & Emergency",
  "startDate": "2025-02-01",
  "endDate": "2025-02-01",
  "startTime": "22:00",
  "endTime": "06:00",
  "hourlyRate": 175.50,
  "priority": "URGENT",
  "hospitalId": 1,
  "unitCode": "ED-001",
  "facilityName": "New York General Hospital",
  "facilityAddress": {
    "street": "123 Medical Center Drive",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  }
}
```

**⚠️ IMPORTANT:** `hospitalId` and `unitCode` are **REQUIRED** fields that MUST be included in every request!

### Optional Fields

```json
{
  "maxAssignments": 2,
  "requirements": {
    "certifications": ["ACLS", "BLS", "PALS"],
    "experienceYears": 3,
    "languages": ["English", "Spanish"]
  },
  "benefits": {
    "transportation": true,
    "mealAllowance": true,
    "overtimeAvailable": true
  },
  "contactPerson": {
    "name": "Dr. Sarah Johnson",
    "phone": "+1-555-0123",
    "email": "sarah.johnson@hospital.com",
    "position": "Department Head"
  },
  "notes": "Preferred candidate with trauma center experience",
  "isRecurring": false,
  "recurringPattern": {
    "type": "WEEKLY",
    "daysOfWeek": [1, 3, 5],
    "repeatUntil": "2025-12-31"
  }
}
```

---

## Field Descriptions

### Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `title` | String (5-255 chars) | Job posting title | "Emergency Medicine Physician" |
| `description` | String | Detailed job description | "Need experienced emergency doctor..." |
| `department` | String (max 100) | Department name | "Emergency Medicine" |
| `location` | String (max 255) | Job location | "New York General Hospital" |
| `requiredRole` | Enum | **'DOCTOR'** or **'NURSE'** | "DOCTOR" |
| `specialization` | String (max 255) | Required if role is DOCTOR | "Emergency Medicine" |
| `startDate` | Date | Job start date | "2025-02-01" |
| `endDate` | Date | Job end date | "2025-02-01" |
| `startTime` | Time (HH:mm) | Shift start time | "22:00" |
| `endTime` | Time (HH:mm) | Shift end time | "06:00" |
| `hourlyRate` | Decimal | Hourly payment rate | 175.50 |
| `priority` | Enum | **'LOW'**, **'MEDIUM'**, **'HIGH'**, **'URGENT'** | "URGENT" |
| `hospitalId` | Integer | Hospital ID | 1 |
| `unitCode` | String (max 50) | Unit code identifier | "ED-001" |
| `facilityName` | String (max 255) | Facility/hospital name | "New York General Hospital" |
| `facilityAddress` | Object | Facility address details | See below |

#### facilityAddress Object (Required)
```json
{
  "street": "123 Medical Center Drive",
  "city": "New York",
  "state": "NY",
  "zipCode": "10001",
  "country": "USA"
}
```

### Optional Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `maxAssignments` | Integer (min: 1) | Max staff for this job | 2 |
| `requirements` | Object | Job requirements | See below |
| `benefits` | Object | Job benefits | See below |
| `contactPerson` | Object | Contact information | See below |
| `notes` | String | Additional notes | "Preferred trauma experience" |
| `isRecurring` | Boolean | Is recurring job | false |
| `recurringPattern` | Object | Recurring job pattern | See below |

#### requirements Object (Optional)
```json
{
  "certifications": ["ACLS", "BLS"],
  "experienceYears": 3,
  "education": "MD Degree",
  "languages": ["English", "Spanish"],
  "shiftAvailability": "Overnight",
  "otherRequirements": "Must have valid state license"
}
```

#### benefits Object (Optional)
```json
{
  "transportation": true,
  "mealAllowance": true,
  "overtimeAvailable": true,
  "bonusAvailable": false,
  "signingBonus": 1000
}
```

#### contactPerson Object (Optional)
```json
{
  "name": "Dr. Sarah Johnson",
  "phone": "+1-555-0123",
  "email": "sarah.johnson@hospital.com",
  "position": "Department Head"
}
```

#### recurringPattern Object (Optional)
```json
{
  "type": "WEEKLY",  // DAILY, WEEKLY, MONTHLY
  "daysOfWeek": [1, 3, 5],  // 0=Sunday, 1=Monday, etc.
  "repeatUntil": "2025-12-31"
}
```

---

## Complete Example Request

```bash
curl --location 'http://192.168.1.79:3000/api/v1/hr/jobs' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
--data '{
  "title": "Emergency Medicine Physician - Night Shift",
  "description": "Urgent need for experienced emergency medicine physician for night shift. Must have ACLS certification and trauma center experience.",
     "department": "Emergency Medicine",
   "location": "New York General Hospital - Emergency Department",
   "requiredRole": "DOCTOR",
   "specialization": "Accident & Emergency",
   "startDate": "2025-02-01",
  "endDate": "2025-02-01",
  "startTime": "22:00",
  "endTime": "06:00",
  "hourlyRate": 175.50,
  "priority": "URGENT",
  "hospitalId": 1,
  "unitCode": "ED-001",
  "facilityName": "New York General Hospital",
  "facilityAddress": {
    "street": "123 Medical Center Drive",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  },
  "maxAssignments": 2,
  "requirements": {
    "certifications": ["ACLS", "BLS", "PALS"],
    "experienceYears": 3,
    "languages": ["English", "Spanish"],
    "shiftAvailability": "Overnight"
  },
  "benefits": {
    "transportation": true,
    "mealAllowance": true,
    "overtimeAvailable": true
  },
  "contactPerson": {
    "name": "Dr. Sarah Johnson",
    "phone": "+1-555-0123",
    "email": "sarah.johnson@hospital.com",
    "position": "Emergency Department Head"
  },
  "notes": "Preferred candidate with Level 1 trauma center experience"
}'
```

---

## Response

### Success Response (201 Created)

```json
{
  "message": "Job posted successfully and auto-assigned to compatible staff",
  "job": {
    "id": 123,
    "title": "Emergency Medicine Physician - Night Shift",
    "description": "Urgent need for experienced emergency medicine physician...",
    "department": "Emergency Medicine",
    "location": "New York General Hospital - Emergency Department",
    "requiredRole": "DOCTOR",
    "specialization": "Emergency Medicine",
    "startDate": "2025-02-01T00:00:00.000Z",
    "endDate": "2025-02-01T00:00:00.000Z",
    "startTime": "22:00:00",
    "endTime": "06:00:00",
    "hourlyRate": "175.50",
    "priority": "URGENT",
    "status": "ACTIVE",
    "maxAssignments": 2,
    "hospitalId": 1,
    "unitCode": "ED-001",
    "facilityName": "New York General Hospital",
    "createdBy": 14,
    "createdAt": "2025-01-20T10:30:00.000Z",
    "updatedAt": "2025-01-20T10:30:00.000Z"
  },
  "compatibleStaffCount": 5,
  "assignmentsCreated": 5,
  "compatibleStaff": [
    {
      "id": 10,
      "name": "Dr. John Smith",
      "email": "john.smith@example.com",
      "department": "Emergency Medicine",
      "specialization": "Emergency Medicine"
    },
    {
      "id": 15,
      "name": "Dr. Mary Johnson",
      "email": "mary.johnson@example.com",
      "department": "Emergency Medicine",
      "specialization": "Emergency Medicine"
    }
  ]
}
```

### Error Response (400 Bad Request)

```json
{
  "error": "Validation error",
  "message": "Specialization is required for doctor jobs and must match the department"
}
```

### Error Response (401 Unauthorized)

```json
{
  "error": "Unauthorized",
  "message": "Access token required"
}
```

### Error Response (403 Forbidden)

```json
{
  "error": "Forbidden",
  "message": "HR or ADMIN role required"
}
```

---

## Important Notes

1. **Auto-Assignment**: When a job is created, the system automatically:
   - Finds all compatible staff matching the job requirements
   - Creates pending assignments for each compatible staff member
   - The staff will see the job in their "Available Jobs" list

2. **Compatibility Matching**:
   - Matches by `requiredRole` (DOCTOR or NURSE)
   - Matches by `department`
   - For doctors, also matches by `specialization`

3. **Hospital and Unit Validation**:
   - `hospitalId`: Must be a valid hospital ID that exists in the database
   - `unitCode`: Must be a valid unit code that exists for the specified hospital
   - The `hospitalId` + `unitCode` combination must exist and be active in the database
   - These are **REQUIRED** fields and validation will fail if invalid
   
   **Example:**
   - If hospitalId = 1, the unitCode must belong to hospital with ID = 1
   - Common unit codes: "ED-001" (Emergency Department), "ICU-01" (ICU Unit), etc.
   - Check with your database for valid hospital IDs and their associated unit codes

4. **Date and Time Format**:
   - Dates: `YYYY-MM-DD` (e.g., "2025-02-01")
   - Times: `HH:mm` (24-hour format, e.g., "22:00")

5. **Specialization Required**:
   - If `requiredRole` is "DOCTOR", `specialization` is **required**
   - If `requiredRole` is "NURSE", `specialization` is optional
   - **Important**: The `specialization` must match one of the valid values for that `department`
   - Example valid specializations for "Emergency Medicine" department:
     - "Trauma Care"
     - "Critical Care"
     - "Accident & Emergency"
     - "Emergency Surgery"
   - If you use an invalid specialization, you'll get an error message with the valid options

---

## Frontend Implementation Example

```javascript
const createJob = async (jobData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/hr/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(jobData)
    });

    const result = await response.json();

    if (response.ok) {
      console.log('Job created successfully!');
      console.log(`Job ID: ${result.job.id}`);
      console.log(`Assignments created: ${result.assignmentsCreated}`);
      return result.job;
    } else {
      console.error('Error creating job:', result.message);
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Create job error:', error);
    throw error;
  }
};

// Usage
const newJob = {
  title: "Emergency Medicine Physician - Night Shift",
  description: "Need experienced emergency doctor...",
  department: "Emergency Medicine",
  location: "New York General Hospital",
  requiredRole: "DOCTOR",
  specialization: "Emergency Medicine",
  startDate: "2025-02-01",
  endDate: "2025-02-01",
  startTime: "22:00",
  endTime: "06:00",
  hourlyRate: 175.50,
  priority: "URGENT",
  hospitalId: 1,
  unitCode: "ED-001",
  facilityName: "New York General Hospital",
  facilityAddress: {
    street: "123 Medical Center Drive",
    city: "New York",
    state: "NY",
    zipCode: "10001",
    country: "USA"
  }
};

await createJob(newJob);
```
