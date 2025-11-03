## Hospital Admin APIs

Use these endpoints with a Bearer token for a user having role `HOSPITAL_ADMIN`. All endpoints are scoped to the admin's assigned `hospitalId`.

- Base URL variable used below: `{{baseUrl}}` (e.g., `http://localhost:3000/api/v1`).

### Auth

- Register Hospital Admin
  - POST `{{baseUrl}}/auth/register`
  - Body: email, password, confirmPassword, firstName, lastName, role=`HOSPITAL_ADMIN`, hospitalId
  - Creates a hospital-scoped admin user.

- Login
  - POST `{{baseUrl}}/auth/login`
  - Body: email, password
  - Returns `token`, `user`, and `activeTheme`.

### Hospital Admin Dashboard

- GET `{{baseUrl}}/hospital-admin/dashboard`
  - Returns statistics for the admin's hospital:
    - jobs: total, active, completed
    - assignments: total, active
    - users: total, active
    - units: count
  - Also returns last 10 recent jobs for this hospital.

### Hospital Details

- GET `{{baseUrl}}/hospital-admin/hospital`
  - Returns hospital details including active units and active users.

### Users (Hospital-scoped)

- GET `{{baseUrl}}/hospital-admin/users?page=1&limit=50`
  - Lists users in this hospital with pagination and optional filters (`role`, `search`).

### Jobs (Hospital-scoped)

- GET `{{baseUrl}}/hospital-admin/jobs?page=1&limit=50`
  - Lists jobs created for this hospital with pagination and includes creator and assignments.

### Units

- GET `{{baseUrl}}/hospital-admin/units`
  - Lists all active units for the hospital.

### Hospital Logo

- POST `{{baseUrl}}/hospital-admin/logo`
  - Form-data: `logo` (file)
  - Uploads and sets the hospital's logo.

### Themes

- GET `{{baseUrl}}/hospital-admin/themes`
  - Returns the hospital's theme list and current default theme.

Notes:
- All requests (except register/login) require `Authorization: Bearer <token>` from a `HOSPITAL_ADMIN` login.
- The admin must have a valid `hospitalId`; access is restricted to that scope.



