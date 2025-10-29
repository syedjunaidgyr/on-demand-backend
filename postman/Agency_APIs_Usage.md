Agency Feature - API Usage Guide
================================

This document explains how to use the Agency APIs, test with Postman, and the key business rules enforced by the backend.

Prerequisites
-------------
- Backend running locally (default `http://localhost:3000`).
- JWT tokens for roles as required (ADMIN/HR/AGENCY/NURSE).
- Import `postman/Agency_Apis.postman_collection.json` into Postman.
- Set collection variables:
  - `baseUrl` (e.g., `http://localhost:3000`)
  - `token` (Bearer JWT)
  - Optional: `agencyId`, `hospitalId`, `nurseId`, `nurseId2`, `jobId`.

Core Concepts
-------------
- Agencies (users with role `AGENCY`) can be onboarded by HR/ADMIN to hospitals.
- Agencies maintain a pool of nurses (users with role `NURSE`).
- Agencies can accept and assign nurse jobs (FULL duration or SEGMENTS per date ranges).

Business Rules (Critical)
-------------------------
- Agency-hospital link must be `APPROVED` for job listing and assignment.
- Nurse can have at most ONE active agency membership at a time (`PENDING` or `APPROVED`).
- If nurse has an active hospital job (`ASSIGNED`/`IN_PROGRESS`), they cannot:
  - Submit new agency join requests.
  - Be directly onboarded to an agency (unless already a member).
- Nurses currently `IN_PROGRESS` on any job cannot receive new agency job offers.
- SEGMENTS must be within job start/end dates and must not overlap for the same nurse.
- Assignment checks for overlaps against nurse’s existing `ACCEPTED`/`ASSIGNED`/`IN_PROGRESS` assignments and any existing assignment segments.

Typical Flows
-------------

1) Create and Onboard an Agency (ADMIN/HR)
   - Create agency user: POST `/api/v1/agency/create`
   - Onboard agency to hospitals (approve link): POST `/api/v1/agency/:agencyId/hospitals`
   - Verify links: GET `/api/v1/agency/:agencyId/hospitals`

2) Build Nurse Pool
   - Option A (Top-down onboarding):
     - POST `/api/v1/agency/:agencyId/nurses` (AGENCY/HR/ADMIN)
     - Immediate `APPROVED` memberships; nurses on active jobs or already active in another agency are skipped.
   - Option B (Nurse-initiated):
     - POST `/api/v1/agency/:agencyId/join` (NURSE)
     - Creates `PENDING` membership; blocks if nurse has active job or belongs to another agency.
     - Approve with POST `/api/v1/agency/:agencyId/nurses/:nurseId/approve` (AGENCY/HR/ADMIN)

3) Browse and Assign Jobs (AGENCY)
   - List eligible jobs (NURSE-only, ACTIVE, linked hospitals): GET `/api/v1/agency/jobs`
   - Assign jobs:
     - FULL duration (single nurse): POST `/api/v1/agency/jobs/:jobId/assign` with `mode=FULL`.
     - SEGMENTS (multiple nurses with date ranges): POST `/api/v1/agency/jobs/:jobId/assign` with `mode=SEGMENTS`.

Postman Requests
----------------
The collection includes pre-configured requests for:
- Create Agency, Onboard Hospitals, Get Hospitals
- Nurse Join, Approve Nurse, Revoke Nurse
- Add Nurses, List Nurses (with status)
- List Jobs, Assign Job (FULL/SEGMENTS)

Update collection variables for `agencyId`, `hospitalId`, `nurseId`, `jobId` as needed.

Error Cases You May Encounter
-----------------------------
- `409 Already in agency`: nurse already has an active (PENDING/APPROVED) membership in another agency.
- `409 Active job`: nurse is currently on a job; cannot join/reinstate membership now.
- `409 Nurse busy`: nurse is currently `IN_PROGRESS`; cannot receive new offers.
- `400 Invalid segment`: segment dates are outside job window or end before start.
- `409 Schedule conflict`: overlaps with existing assignments/segments.
- `403 Access denied`: missing privileges or agency not linked to the hospital.

Response Enrichment
-------------------
- Agency Jobs: includes `hospital` and `currentAssignments` count.
- Nurse Pool: returns both `pool` (membership records) and `nurses` (user profiles).
- Assignments: includes `user`, `agency`, `job`, and `segments` when created.

Notes
-----
- Existing HR/Staff job acceptance flow remains unchanged; the agency feature layers on top.
- For production, ensure `JWT_SECRET` and DB credentials are set via environment variables.


