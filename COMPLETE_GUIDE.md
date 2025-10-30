# Complete Guide - Theme Management & Admin System

## 📋 Table of Contents
1. [Quick Start](#quick-start)
2. [Admin Roles](#admin-roles)
3. [Setup & Installation](#setup--installation)
4. [Theme Management](#theme-management)
5. [API Endpoints](#api-endpoints)
6. [Database Scripts](#database-scripts)
7. [Troubleshooting](#troubleshooting)

---

## Quick Start

### One-Command Setup
```bash
# For new database
npm run setup-themes

# For existing database
npm run setup-all

# Start server
npm start
```

### Available NPM Scripts
- `npm run setup-themes` - Theme migrations (new DB)
- `npm run setup-all` - All migrations + fixes (existing DB)
- `npm run add-theme-columns` - Add theme columns only
- `npm run add-hospital-admin-role` - Add HOSPITAL_ADMIN role only
- `npm run fix-themes` - Fix existing themes

---

## Admin Roles

### ADMIN (System-wide Admin)
**Scope:** Entire application  
**Dashboard:** System-wide statistics

**Can Do:**
- ✅ Create/update/delete hospitals
- ✅ Manage themes for any hospital
- ✅ Manage units for any hospital
- ✅ View all users across all hospitals
- ✅ View all jobs across all hospitals
- ✅ View system-wide dashboard
- ✅ Full system control

**Cannot Do:**
- ❌ Nothing! Full access

**Endpoints:** `/api/v1/admin/*`

---

### HOSPITAL_ADMIN (Hospital-specific Admin)
**Scope:** Only their assigned hospital  
**Dashboard:** Hospital-specific statistics

**Can Do:**
- ✅ View hospital dashboard
- ✅ Manage themes for their hospital
- ✅ Manage units within their hospital
- ✅ View users in their hospital
- ✅ View jobs in their hospital
- ✅ Upload/delete hospital logo

**Cannot Do:**
- ❌ Create hospitals
- ❌ Delete hospitals
- ❌ Access other hospitals

**Endpoints:** `/api/v1/hospital-admin/*`

---

## Setup & Installation

### Step 1: Database Setup

#### Option A: NPM Scripts (Recommended)
```bash
npm run setup-themes    # New database
npm run setup-all      # Existing database
```

#### Option B: Individual Scripts
```bash
node scripts/add-theme-columns.js
node scripts/add-hospital-admin-role.js
node scripts/fix-themes-and-set-defaults.js  # Optional
```

### Step 2: Environment Configuration
Create `.env` file:
```env
DB_HOST=localhost
DB_USER=root
DB_PASS=yourpassword
DB_NAME=yourdatabase
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=24h
```

### Step 3: Start Server
```bash
npm start        # Production
npm run dev      # Development (with nodemon)
```

---

## Theme Management

### How It Works

1. **Hospital defines themes** (HOSPITAL_ADMIN or ADMIN)
2. **Hospital sets default theme** (HOSPITAL_ADMIN or ADMIN)
3. **Users select themes** (any user)
4. **JWT includes theme ID** (automatically)

### Theme Object Structure
```json
{
  "id": "theme_1",
  "name": "Professional Blue",
  "primaryColor": "#2563eb",
  "secondaryColor": "#3b82f6",
  "backgroundColor": "#f8fafc",
  "textColor": "#1e293b",
  "accentTextColor": "#ffffff"
}
```

### User Theme Selection Flow

1. User logs in → receives JWT with `themeId`
2. User can view available themes
3. User selects theme → JWT updated with new `themeId`
4. User resets theme → uses hospital default

---

## API Endpoints

### ADMIN Endpoints (`/api/v1/admin`)

#### Dashboard
```
GET /dashboard                          # System-wide dashboard
```

#### Hospitals
```
POST   /hospitals                       # Create hospital
GET    /hospitals/:id                   # Get hospital
PUT    /hospitals/:id                   # Update hospital
DELETE /hospitals/:id                   # Delete hospital
POST   /hospitals/:id/logo             # Upload logo
DELETE /hospitals/:id/logo             # Delete logo
```

#### Themes (Any Hospital)
```
GET    /hospitals/:id/themes            # Get themes
POST   /hospitals/:id/themes            # Create theme
PUT    /hospitals/:id/themes/:themeId   # Update theme
DELETE /hospitals/:id/themes/:themeId   # Delete theme
PUT    /hospitals/:id/themes/default/:themeId  # Set default
```

#### Units (Any Hospital)
```
POST   /hospitals/:hospitalId/units     # Create unit
PUT    /hospitals/:hospitalId/units/:unitCode  # Update unit
DELETE /hospitals/:hospitalId/units/:unitCode  # Delete unit
```

---

### HOSPITAL_ADMIN Endpoints (`/api/v1/hospital-admin`)

#### Dashboard
```
GET /dashboard                          # Hospital dashboard
GET /hospital                          # Hospital details
```

#### Themes (Their Hospital Only)
```
GET    /themes                          # Get themes
POST   /themes                          # Create theme
PUT    /themes/:themeId                 # Update theme
DELETE /themes/:themeId                 # Delete theme
PUT    /themes/default/:themeId         # Set default
```

#### Units (Their Hospital Only)
```
GET    /units                           # Get units
POST   /units                           # Create unit
PUT    /units/:unitCode                 # Update unit
DELETE /units/:unitCode                 # Delete unit
```

#### Logo
```
POST   /logo                            # Upload logo
DELETE /logo                            # Delete logo
```

#### Users & Jobs
```
GET /users                              # Get users (their hospital)
GET /jobs                               # Get jobs (their hospital)
```

---

### User Endpoints (`/api/v1/auth`)

#### Theme Selection
```
GET    /profile/themes                  # View available themes
PUT    /profile/theme                   # Select theme
DELETE /profile/theme                   # Reset to default
GET    /profile                         # Get profile with active theme
```

---

## Database Scripts

### 1. add-theme-columns.js
**Purpose:** Adds theme-related columns

**What it adds:**
- `themes` (JSON) to `hospitals` table
- `defaultThemeId` (VARCHAR) to `hospitals` table
- `selectedThemeId` (VARCHAR) to `users` table

**Run:**
```bash
npm run add-theme-columns
```

---

### 2. add-hospital-admin-role.js
**Purpose:** Adds HOSPITAL_ADMIN role

**What it adds:**
- `HOSPITAL_ADMIN` to role ENUM in `users` table

**Run:**
```bash
npm run add-hospital-admin-role
```

---

### 3. fix-themes-and-set-defaults.js
**Purpose:** Fixes existing data and adds default themes

**What it does:**
- Validates existing themes
- Adds 4 default themes to each hospital
- Sets default theme for each hospital

**Run:**
```bash
npm run fix-themes
```

---

## Dashboard Data

### ADMIN Dashboard (`GET /api/v1/admin/dashboard`)

Returns system-wide statistics:
```json
{
  "statistics": {
    "hospitals": { "total": 10, "active": 9, "inactive": 1 },
    "users": { "total": 500, "active": 480, "byRole": [...] },
    "jobs": { "total": 1500, "active": 250, "completed": 1250 },
    "assignments": { "total": 2000, "active": 150 },
    "units": { "total": 60, "active": 55 }
  },
  "recentHospitals": [...],
  "topHospitals": [...]
}
```

---

### HOSPITAL_ADMIN Dashboard (`GET /api/v1/hospital-admin/dashboard`)

Returns hospital-specific statistics:
```json
{
  "hospital": { ... },
  "statistics": {
    "jobs": { "total": 150, "active": 25, "completed": 125 },
    "assignments": { "total": 200, "active": 15 },
    "users": { "total": 50, "active": 48 },
    "units": 6
  },
  "recentJobs": [...]
}
```

---

## Feature Comparison

| Feature | ADMIN | HOSPITAL_ADMIN |
|---------|-------|----------------|
| **Create hospitals** | ✅ | ❌ |
| **Delete hospitals** | ✅ | ❌ |
| **Dashboard** | ✅ System-wide | ✅ Hospital-only |
| **Manage themes** | ✅ Any hospital | ✅ Their hospital only |
| **Manage units** | ✅ Any hospital | ✅ Their hospital only |
| **View users** | ✅ All users | ✅ Their hospital only |
| **View jobs** | ✅ All jobs | ✅ Their hospital only |
| **Upload logo** | ✅ Any hospital | ✅ Their hospital only |

---

## Database Relationships

### Complete Hierarchy
```
Hospital (1)
├── Unit (Many) - linked via hospitalId
│   ├── User (Many) - linked via hospitalId + unitCode
│   └── Job (Many) - linked via hospitalId + unitCode
├── User (Many) - linked via hospitalId (hospital-level users)
├── Job (Many) - linked via hospitalId (hospital-level jobs)
└── HOSPITAL_ADMIN (1 or Many) - linked via hospitalId only
```

### Hospital-Unit Relationship
✅ **Confirmed: Hospitals can have multiple units**

**Database Schema:**
- `Unit` table has `hospitalId` column (foreign key to `hospitals.id`)
- Unique constraint: `(hospitalId, unitCode)` - prevents duplicate unit codes within a hospital
- Association: `Hospital.hasMany(Unit)` (One-to-Many relationship)

**Example:**
```
Hospital (ID: 1) "City General Hospital"
├── Unit (ID: 1) - hospitalId: 1, unitCode: "ICU"
├── Unit (ID: 2) - hospitalId: 1, unitCode: "ER"
├── Unit (ID: 3) - hospitalId: 1, unitCode: "SURGERY"
└── Unit (ID: 4) - hospitalId: 1, unitCode: "PEDIATRICS"
```

**Verified Features:**
- ✅ One hospital can have multiple units
- ✅ Units are properly linked via `hospitalId`
- ✅ Unit codes must be unique within a hospital
- ✅ Hospital admin can manage all units in their hospital
- ✅ Units can be filtered by hospitalId

### User Relationships (Role-Based Linking)
✅ **User linking is MANDATORY based on role**

**Database Schema:**
- `User` table has `hospitalId` (foreign key to `hospitals.id`)
- `User` table has `unitCode` (references unit code within the hospital)

**Role-Based Requirements:**

#### ✅ DOCTOR, NURSE, HR (MANDATORY Hospital + Unit)
- **MUST** have `hospitalId` - Required
- **MUST** have `unitCode` - Required
- Linked to BOTH Hospital AND Unit

#### ✅ HOSPITAL_ADMIN (MANDATORY Hospital, NO Unit)
- **MUST** have `hospitalId` - Required
- **MUST NOT** have `unitCode` - Forbidden
- Linked to Hospital ONLY (not unit)

#### ✅ ADMIN (NO Hospital, NO Unit)
- **MUST NOT** have `hospitalId` - Forbidden
- **MUST NOT** have `unitCode` - Forbidden
- System-wide access, no hospital/unit assignment

#### ✅ AGENCY (NO Hospital, NO Unit at creation)
- **MUST NOT** have `hospitalId` - Forbidden (onboarded via AgencyHospital table)
- **MUST NOT** have `unitCode` - Forbidden
- Initial creation: No hospital assignment
- Onboarding: Multiple hospitals via AgencyHospital table (many-to-many relationship)
- Jobs assigned by AGENCY can be to specific units

**Example:**
```
Hospital (ID: 1) "City General Hospital"
├── Unit (ID: 1) - hospitalId: 1, unitCode: "ICU"
│   ├── User (ID: 1) - hospitalId: 1, unitCode: "ICU", role: "DOCTOR" ✅
│   ├── User (ID: 2) - hospitalId: 1, unitCode: "ICU", role: "NURSE" ✅
│   └── User (ID: 3) - hospitalId: 1, unitCode: "ICU", role: "HR" ✅
│   └── Job (ID: 1) - hospitalId: 1, unitCode: "ICU", createdBy: agencyUserId ✅
├── Unit (ID: 2) - hospitalId: 1, unitCode: "ER"
│   ├── User (ID: 4) - hospitalId: 1, unitCode: "ER", role: "DOCTOR" ✅
│   └── User (ID: 5) - hospitalId: 1, unitCode: "ER", role: "NURSE" ✅
└── User (ID: 6) - hospitalId: 1, unitCode: null, role: "HOSPITAL_ADMIN" ✅

User (ID: 7) - hospitalId: null, unitCode: null, role: "ADMIN" ✅ (System-wide)
User (ID: 9) - hospitalId: null, unitCode: null, role: "AGENCY" ✅ (Onboarded to hospitals via AgencyHospital table)

// Agency-Hospital Onboarding (many-to-many)
AgencyHospital:
- agencyId: 9, hospitalId: 1, status: "APPROVED" ✅
- agencyId: 9, hospitalId: 2, status: "APPROVED" ✅
```

**Validation:**
- ✅ Model-level validation in `User.js`
- ✅ API-level validation in `validation.js`
- ✅ Registration enforces role-based requirements
- ✅ Clear error messages for violations

**Verified Features:**
- ✅ DOCTOR/NURSE/HR MUST have hospital + unit
- ✅ HOSPITAL_ADMIN MUST have hospital (no unit)
- ✅ ADMIN must NOT have hospital/unit
- ✅ AGENCY must NOT have hospital/unit at creation
- ✅ AGENCY onboarded to hospitals via AgencyHospital table (many-to-many)
- ✅ AGENCY can be onboarded to multiple hospitals
- ✅ AGENCY jobs can be assigned to specific units
- ✅ Users can be filtered by hospitalId
- ✅ Users can be filtered by unitCode
- ✅ Hospital admin can view all users in their hospital

### Job Relationships
✅ **Jobs are MANDATORY linked to both Hospital AND Unit**

**Database Schema:**
- `Job` table has `hospitalId` - **Required** (allowNull: false)
- `Job` table has `unitCode` - **Required** (allowNull: false)
- Jobs belong to a specific hospital AND unit combination
- Both fields are MANDATORY

**Example:**
```
Hospital (ID: 1) "City General Hospital"
├── Unit (ID: 1) - hospitalId: 1, unitCode: "ICU"
│   ├── Job (ID: 1) - hospitalId: 1, unitCode: "ICU"
│   └── Job (ID: 2) - hospitalId: 1, unitCode: "ICU"
└── Unit (ID: 2) - hospitalId: 1, unitCode: "ER"
    └── Job (ID: 3) - hospitalId: 1, unitCode: "ER"
```

**Verified Features:**
- ✅ Jobs belong to a specific hospital
- ✅ Jobs are assigned to specific units within that hospital
- ✅ Hospital admin can view all jobs in their hospital
- ✅ Jobs can be filtered by hospitalId and unitCode
- ✅ Dashboard statistics include job counts per hospital

---

## Usage Examples

### Create System Admin
```bash
POST /api/v1/auth/register
{
  "email": "admin@system.com",
  "password": "admin123",
  "firstName": "System",
  "lastName": "Admin",
  "role": "ADMIN"
}
```

### Create Hospital Admin
```bash
POST /api/v1/auth/register
{
  "email": "admin@hospital.com",
  "password": "admin123",
  "firstName": "Hospital",
  "lastName": "Admin",
  "role": "HOSPITAL_ADMIN",
  "hospitalId": 1
}
```

### View Dashboards
```bash
# ADMIN dashboard
GET /api/v1/admin/dashboard

# HOSPITAL_ADMIN dashboard
GET /api/v1/hospital-admin/dashboard
```

### Manage Themes
```bash
# Hospital admin creates theme
POST /api/v1/hospital-admin/themes
{
  "name": "Modern Blue",
  "primaryColor": "#0284c7",
  "secondaryColor": "#7dd3fc",
  "backgroundColor": "#f0f9ff",
  "textColor": "#0c4a6e",
  "accentTextColor": "#ffffff"
}

# User selects theme
PUT /api/v1/auth/profile/theme
{
  "themeId": "theme_1"
}
```

---

## Troubleshooting

### Error: "Cannot connect to database"
**Solution:** Check `.env` file for correct database credentials

### Error: "Column already exists"
**Solution:** Normal! Scripts are idempotent and skip existing columns

### Error: "ENUM value already exists"
**Solution:** Normal! Role already added

### Error: "Theme validation failed"
**Solution:** Run `npm run fix-themes` to fix invalid themes

### Dashboard shows no data
**Solution:** Ensure hospitals and users exist in the database

---

## Summary

✅ **Complete System:**
- Theme management with user selection
- Two-tier admin system
- Dashboards for both admin types
- JWT integration
- Database migration scripts
- Role-based validation

✅ **One-Command Setup:**
- New DB: `npm run setup-themes`
- Existing DB: `npm run setup-all`

✅ **Production Ready:**
- All endpoints implemented
- Proper access control
- Comprehensive documentation

---

## Role Linking Requirements Summary

| Role | Hospital Required? | Unit Required? | Validation |
|------|-------------------|----------------|------------|
| **DOCTOR** | ✅ Yes (Mandatory) | ✅ Yes (Mandatory) | Model + API |
| **NURSE** | ✅ Yes (Mandatory) | ✅ Yes (Mandatory) | Model + API |
| **HR** | ✅ Yes (Mandatory) | ✅ Yes (Mandatory) | Model + API |
| **HOSPITAL_ADMIN** | ✅ Yes (Mandatory) | ❌ No (Forbidden) | Model + API |
| **ADMIN** | ❌ No (Forbidden) | ❌ No (Forbidden) | Model + API |
| **AGENCY** | ❌ No (Onboarded via AgencyHospital) | ❌ No (Forbidden) | Model + API |
| **Job** | ✅ Yes (Mandatory) | ✅ Yes (Mandatory) | Model |

---

## Documentation Files

1. **COMPLETE_GUIDE.md** - This file (complete reference)
2. **postman/Theme_Management.postman_collection.json** - Postman collection

---

**Status:** ✅ **Ready for Production!**

For Postman collection, see: `postman/Theme_Management.postman_collection.json`

