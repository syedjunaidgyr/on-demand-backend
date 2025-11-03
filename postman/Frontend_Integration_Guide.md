# Frontend Integration Guide: Permissions, Onboarding & Maintenance APIs

This document outlines the permission system, hospital/unit onboarding APIs, and maintenance endpoints for frontend integration.

---

## Table of Contents
1. [Permission System Overview](#permission-system-overview)
2. [Hospital Onboarding (Admin)](#hospital-onboarding-admin)
3. [Unit Onboarding (Hospital Admin)](#unit-onboarding-hospital-admin)
4. [Permission Management APIs](#permission-management-apis)
5. [Agency Blacklisting (Hospital Admin)](#agency-blacklisting-hospital-admin)
6. [Maintenance & Health Check APIs](#maintenance--health-check-apis)

---

## Permission System Overview
a
### Permission Structure

The system uses a hierarchical permission model with three scopes:

- **GLOBAL** (StaffPermission): System-wide permissions (ADMIN role or explicit grants)
- **HOSPITAL** (HospitalPermission): Hospital-specific permissions
- **UNIT** (UnitPermission): Unit-specific permissions within a hospital

### Permission Model

Each permission has:
- `code`: Unique identifier (e.g., `CREATE_USER`, `ASSIGN_JOB`)
- `category`: USER_MANAGEMENT, JOB_MANAGEMENT, ASSIGNMENT_MANAGEMENT, REPORT_MANAGEMENT, HOSPITAL_MANAGEMENT, PERMISSION_MANAGEMENT, SYSTEM_MANAGEMENT
- `resource`: What it applies to (users, jobs, hospitals, etc.)
- `action`: CREATE, READ, UPDATE, DELETE, ASSIGN, APPROVE, REJECT, EXPORT, IMPORT
- `scope`: GLOBAL, HOSPITAL, UNIT, PERSONAL

### Checking Permissions

**Middleware Usage:**
```javascript
// In routes (backend)
router.post('/users', authenticate, checkPermission('CREATE_USER'), ...);

// Check multiple permissions (any)
router.get('/jobs', authenticate, checkPermission(['READ_JOB', 'READ_ALL_JOBS']), ...);

// Check multiple permissions (all required)
router.delete('/jobs/:id', authenticate, checkPermission(['DELETE_JOB', 'ADMIN_ACCESS'], { requireAll: true }), ...);
```

**Frontend:**
- Permissions are NOT in the JWT token. You must fetch them separately.
- Use `GET /api/v1/permissions/my-permissions` to get current user's permissions.
- Check permissions on the frontend for UI visibility/routing, but always rely on backend enforcement.

---

## Hospital Onboarding (Admin)

Only `ADMIN` role can onboard hospitals.

### Create Hospital

**Endpoint:** `POST /api/v1/admin/hospitals`

**Headers:**
- `Authorization: Bearer <ADMIN_TOKEN>`
- `Content-Type: multipart/form-data` (if logo) or `application/json`

**Body (JSON):**
```json
{
  "name": "City General Hospital",
  "code": "CGH001",
  "address": {
    "street": "123 Medical Center Dr",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  },
  "phone": "+1-555-0123",
  "email": "info@citygeneral.com",
  "website": "https://citygeneral.com",
  "description": "Leading healthcare provider",
  "contactInfo": {
    "phone": "+1-555-0123",
    "email": "info@citygeneral.com"
  },
  "units": [
    { "code": "ICU", "name": "Intensive Care Unit" },
    { "code": "ER", "name": "Emergency Room" }
  ]
}
```

**Body (Form-data for logo):**
- `logo`: File (image)
- Other fields same as JSON

**Response:**
```json
{
  "message": "Hospital created successfully",
  "hospital": { ... },
  "logo": "/uploads/hospitals/hospital-1234567890-1234.png",
  "logoUrl": "http://localhost:3000/uploads/hospitals/hospital-1234567890-1234.png"
}
```

### Update Hospital

**Endpoint:** `PUT /api/v1/admin/hospitals/:id`

**Body:** Same fields as create (all optional)

### Delete Hospital (Soft Delete)

**Endpoint:** `DELETE /api/v1/admin/hospitals/:id`

Sets `isActive: false`

### Upload Hospital Logo

**Endpoint:** `POST /api/v1/admin/hospitals/:id/logo`

**Headers:**
- `Authorization: Bearer <ADMIN_TOKEN>`

**Body:** Form-data with `logo` file

### Delete Hospital Logo

**Endpoint:** `DELETE /api/v1/admin/hospitals/:id/logo`

---

## Unit Onboarding (Hospital Admin)

Hospital Admins can manage units for their assigned hospital only.

### List Units

**Endpoint:** `GET /api/v1/hospital-admin/units`

**Headers:**
- `Authorization: Bearer <HOSPITAL_ADMIN_TOKEN>`

**Response:**
```json
{
  "units": [
    {
      "id": 1,
      "hospitalId": 1,
      "unitCode": "ICU",
      "unitName": "Intensive Care Unit",
      "isActive": true
    }
  ]
}
```

### Create Unit

**Endpoint:** `POST /api/v1/hospital-admin/units`

**Headers:**
- `Authorization: Bearer <HOSPITAL_ADMIN_TOKEN>`
- `Content-Type: application/json`

**Body:**
```json
{
  "unitCode": "ER",
  "unitName": "Emergency Room"
}
```

**Response:**
```json
{
  "message": "Unit created successfully",
  "unit": { ... }
}
```

**Note:** `hospitalId` is automatically set from the admin's `hospitalId`. The unit code must be unique per hospital.

### Update Unit

**Endpoint:** `PUT /api/v1/hospital-admin/units/:unitCode`

**Body:** Same fields as create (all optional)

### Delete Unit (Soft Delete)

**Endpoint:** `DELETE /api/v1/hospital-admin/units/:unitCode`

Sets `isActive: false`

---

## Permission Management APIs

### Get Current User's Permissions

**Endpoint:** `GET /api/v1/permissions/my-permissions`

**Headers:**
- `Authorization: Bearer <TOKEN>`

**Query Parameters:**
- `hospitalId` (optional): Filter for specific hospital
- `unitCode` (optional): Filter for specific unit

**Response:**
```json
{
  "userId": 27,
  "permissions": {
    "global": [
      { "id": 1, "code": "CREATE_USER", "name": "Create User", ... }
    ],
    "hospital": [
      { "id": 2, "code": "ASSIGN_JOB", "name": "Assign Job", ... }
    ],
    "unit": []
  }
}
```

### Get All Permissions (Admin Only)

**Endpoint:** `GET /api/v1/permissions`

**Query Parameters:**
- `page`, `limit` (pagination)
- `category`, `resource`, `action`, `scope` (filters)

### Get User Permissions (Admin/HR)

**Endpoint:** `GET /api/v1/permissions/users/:userId`

**Query Parameters:**
- `hospitalId` (optional)
- `unitCode` (optional)

**Response:**
```json
{
  "user": { ... },
  "permissions": { "global": [], "hospital": [], "unit": [] },
  "roleMasters": [ ... ]
}
```

### Grant Permission (Admin/HR)

**Endpoint:** `POST /api/v1/permissions/users/:userId/grant`

**Body:**
```json
{
  "permissionCode": "CREATE_USER",
  "hospitalId": 1,        // optional for hospital scope
  "unitCode": "ICU",      // optional for unit scope (requires hospitalId)
  "expiresAt": "2024-12-31T23:59:59Z",  // optional
  "notes": "Temporary access for project"
}
```

### Revoke Permission (Admin/HR)

**Endpoint:** `POST /api/v1/permissions/users/:userId/revoke`

**Body:**
```json
{
  "permissionCode": "CREATE_USER",
  "hospitalId": 1,    // optional
  "unitCode": "ICU"   // optional
}
```

### Apply Permission Master (Admin/HR)

**Endpoint:** `POST /api/v1/permissions/users/:userId/apply-master`

**Body:**
```json
{
  "masterId": 1,
  "hospitalId": 1,    // optional
  "unitCode": "ICU"   // optional
}
```

Applies all permissions from a permission master template to the user.

### Get Permission Masters (Admin Only)

**Endpoint:** `GET /api/v1/permissions/masters`

**Query Parameters:**
- `page`, `limit`
- `role` (filter)

### Create Permission Master (Admin Only)

**Endpoint:** `POST /api/v1/permissions/masters`

**Body:**
```json
{
  "name": "Senior Doctor Template",
  "code": "SENIOR_DOCTOR_TEMPLATE",
  "description": "Full access for senior doctors",
  "role": "DOCTOR",
  "permissions": [1, 2, 3],           // global permission IDs
  "hospitalPermissions": [4, 5],      // hospital permission IDs
  "unitPermissions": [6],             // unit permission IDs
  "isDefault": false
}
```

---

## Agency Blacklisting (Hospital Admin)

Hospital Admins can blacklist/restore agencies for their assigned hospital only.

**Note:** Currently these endpoints require ADMIN/HR, but Hospital Admins should have access scoped to their own hospital. Use `req.user.hospitalId` to auto-scope the `hospitalId` parameter.

### List Blacklisted Agencies for Hospital

**Endpoint:** `GET /api/v1/agency/hospitals/:hospitalId/blacklisted`

**Headers:**
- `Authorization: Bearer <HOSPITAL_ADMIN_TOKEN>`

**Query Parameters:**
- `q` (optional): Search in blacklist reasons
- `from` (optional): Filter from date (ISO format)
- `to` (optional): Filter to date (ISO format)

**Response:**
```json
{
  "hospitalId": 1,
  "count": 2,
  "links": [
    {
      "id": 5,
      "agencyId": 10,
      "hospitalId": 1,
      "status": "REVOKED",
      "blacklistReason": "NON_COMPLIANCE: Breach of shift coverage SLA twice in a month",
      "blacklistedBy": 27,
      "blacklistedAt": "2024-01-15T10:30:00.000Z",
      "agency": {
        "id": 10,
        "email": "agency@example.com",
        "firstName": "ACME",
        "lastName": "Agency",
        "role": "AGENCY"
      },
      "hospital": { ... }
    }
  ]
}
```

### Blacklist Agency for Hospital

**Endpoint:** `POST /api/v1/agency/:agencyId/hospitals/:hospitalId/blacklist`

**Headers:**
- `Authorization: Bearer <HOSPITAL_ADMIN_TOKEN>`
- `Content-Type: application/json`

**Body:**
```json
{
  "reasonCategory": "NON_COMPLIANCE",
  "reasonDetails": "Breach of shift coverage SLA twice in a month"
}
```

**reasonCategory Values:**
- `NON_COMPLIANCE`: Agency did not comply with policies
- `PERFORMANCE`: Poor performance issues
- `ATTENDANCE`: Attendance problems
- `NO_SHOW`: Nurses didn't show up for assigned shifts
- `RATE_DISPUTE`: Disputes over rates/payment
- `CONDUCT`: Unprofessional conduct
- `OTHER`: Other reasons (use reasonDetails to explain)

**Response:**
```json
{
  "message": "Agency blacklisted for hospital",
  "link": {
    "id": 5,
    "agencyId": 10,
    "hospitalId": 1,
    "status": "REVOKED",
    "blacklistReason": "NON_COMPLIANCE: Breach of shift coverage SLA twice in a month",
    "blacklistedBy": 27,
    "blacklistedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Behavior:**
- Sets the agency-hospital link status to `REVOKED`
- Agency can no longer view jobs or assign nurses for this hospital
- Blacklisted agencies are excluded from job listing and assignment

### Restore Agency for Hospital

**Endpoint:** `POST /api/v1/agency/:agencyId/hospitals/:hospitalId/restore`

**Headers:**
- `Authorization: Bearer <HOSPITAL_ADMIN_TOKEN>`

**Response:**
```json
{
  "message": "Agency restored for hospital",
  "link": {
    "id": 5,
    "agencyId": 10,
    "hospitalId": 1,
    "status": "APPROVED",
    "blacklistReason": null,
    "blacklistedBy": null,
    "blacklistedAt": null
  }
}
```

**Behavior:**
- Sets the agency-hospital link status back to `APPROVED`
- Clears blacklist reason and metadata
- Agency regains access to jobs for this hospital

---

## Maintenance & Health Check APIs

### Health Check (Public - No Auth)

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "Locum Backend API"
}
```

Use this to:
- Check if the server is running
- Monitor uptime
- Verify connectivity before making authenticated requests

### Get Admin Dashboard

**Endpoint:** `GET /api/v1/admin/dashboard`

**Headers:**
- `Authorization: Bearer <ADMIN_TOKEN>`

**Response:**
```json
{
  "statistics": {
    "hospitals": { "total": 10, "active": 9, "inactive": 1 },
    "users": { "total": 150, "active": 145, "byRole": [...] },
    "jobs": { "total": 500, "active": 50, "completed": 450 },
    "assignments": { "total": 1200, "active": 25 },
    "units": { "total": 45, "active": 43 }
  },
  "recentHospitals": [...],
  "topHospitals": [...]
}
```

### Get Hospital Admin Dashboard

**Endpoint:** `GET /api/v1/hospital-admin/dashboard`

**Headers:**
- `Authorization: Bearer <HOSPITAL_ADMIN_TOKEN>`

**Response:**
```json
{
  "hospital": { ... },
  "statistics": {
    "jobs": { "total": 50, "active": 5, "completed": 45 },
    "assignments": { "total": 120, "active": 3 },
    "users": { "total": 25, "active": 23 },
    "units": 5
  },
  "recentJobs": [...]
}
```

---

## Frontend Integration Checklist

### 1. Permission Handling
- [ ] Fetch user permissions on login: `GET /api/v1/permissions/my-permissions`
- [ ] Store permissions in app state (Redux/Context)
- [ ] Create permission check utility function
- [ ] Show/hide UI elements based on permissions
- [ ] Route guards based on permissions
- [ ] Always rely on backend enforcement (UI checks are for UX only)

### 2. Hospital Onboarding (Admin)
- [ ] Hospital creation form with validation
- [ ] Logo upload component
- [ ] Hospital list/management page
- [ ] Update/delete hospital functionality
- [ ] Handle `isActive` status

### 3. Unit Management (Hospital Admin)
- [ ] Unit list page
- [ ] Create/update/delete unit forms
- [ ] Handle soft delete (show inactive units separately)
- [ ] Validate unit code uniqueness per hospital

### 4. Health & Maintenance
- [ ] Health check on app startup
- [ ] Error handling for API failures
- [ ] Dashboard widgets showing statistics
- [ ] Real-time updates for active counts (if using WebSocket/polling)

### 5. Permission Management (Admin/HR)
- [ ] Permission list/grid with filters
- [ ] Grant/revoke permission dialogs
- [ ] Permission master templates UI
- [ ] Apply master template to users
- [ ] Show user permissions in user profile

### 6. Agency Blacklisting (Hospital Admin)
- [ ] List blacklisted agencies page
- [ ] Blacklist agency dialog with reason category dropdown
- [ ] Restore agency functionality
- [ ] Filter/search by reason or date range
- [ ] Show blacklist history in agency list

---

## Error Handling

All APIs return errors in this format:
```json
{
  "error": "Error type",
  "message": "Human-readable error message"
}
```

Common status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `500`: Internal Server Error

---

## Notes for Frontend Developers

1. **Permission Checks**: Always fetch permissions after login. Don't store them in JWT or assume they're static.

2. **Hospital Scoping**: Hospital Admin endpoints automatically scope to the admin's `hospitalId`. You don't need to pass it in requests. For agency blacklisting, ensure `hospitalId` in the URL matches the admin's assigned hospital.

3. **Soft Deletes**: `isActive: false` means "deleted" but data remains. Show inactive items in a separate section or filter.

4. **Logo URLs**: Logo paths are relative (`/uploads/hospitals/...`). Construct full URL using your base URL.

5. **Theme Support**: Hospital themes are managed by Hospital Admin. Users get effective theme from login/profile endpoints.

6. **Rate Limiting**: The backend has rate limiting (1000 requests/15min in dev, 100 in prod). Handle 429 responses gracefully.

7. **Pagination**: List endpoints support `page` and `limit` query parameters. Always handle pagination UI.

---

## Quick Reference: cURL Commands

### Health Check
```bash
curl http://localhost:3000/health
```

### Get User Permissions
```bash
curl -X GET "http://localhost:3000/api/v1/permissions/my-permissions" \
  -H "Authorization: Bearer <TOKEN>"
```

### Create Hospital (Admin)
```bash
curl -X POST "http://localhost:3000/api/v1/admin/hospitals" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Hospital",
    "code": "TH001",
    "address": {
      "street": "123 St",
      "city": "City",
      "state": "State",
      "zipCode": "12345",
      "country": "Country"
    }
  }'
```

### Create Unit (Hospital Admin)
```bash
curl -X POST "http://localhost:3000/api/v1/hospital-admin/units" \
  -H "Authorization: Bearer <HOSPITAL_ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "unitCode": "ICU",
    "unitName": "Intensive Care Unit"
  }'
```

### List Blacklisted Agencies (Hospital Admin)
```bash
curl -X GET "http://localhost:3000/api/v1/agency/hospitals/1/blacklisted" \
  -H "Authorization: Bearer <HOSPITAL_ADMIN_TOKEN>"
```

### Blacklist Agency (Hospital Admin)
```bash
curl -X POST "http://localhost:3000/api/v1/agency/10/hospitals/1/blacklist" \
  -H "Authorization: Bearer <HOSPITAL_ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "reasonCategory": "NON_COMPLIANCE",
    "reasonDetails": "Breach of shift coverage SLA twice in a month"
  }'
```

### Restore Agency (Hospital Admin)
```bash
curl -X POST "http://localhost:3000/api/v1/agency/10/hospitals/1/restore" \
  -H "Authorization: Bearer <HOSPITAL_ADMIN_TOKEN>"
```

