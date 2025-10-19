// User roles
const USER_ROLES = {
  HR: 'HR',
  DOCTOR: 'DOCTOR',
  NURSE: 'NURSE',
  ADMIN: 'ADMIN'
};

// Job statuses
const JOB_STATUS = {
  ACTIVE: 'ACTIVE',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

// Assignment statuses
const ASSIGNMENT_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  ASSIGNED: 'ASSIGNED',
  REJECTED: 'REJECTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

// Check-in statuses
const CHECKIN_STATUS = {
  CHECKED_IN: 'CHECKED_IN',
  CHECKED_OUT: 'CHECKED_OUT',
  BREAK_START: 'BREAK_START',
  BREAK_END: 'BREAK_END'
};

// Job priorities
const JOB_PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT'
};

// Report types
const REPORT_TYPES = {
  JOB_POSTINGS: 'JOB_POSTINGS',
  JOB_ASSIGNMENTS: 'JOB_ASSIGNMENTS',
  STAFF_PERFORMANCE: 'STAFF_PERFORMANCE',
  FINANCIAL: 'FINANCIAL',
  ATTENDANCE: 'ATTENDANCE',
  UTILIZATION: 'UTILIZATION',
  CUSTOM: 'CUSTOM'
};

// Report statuses
const REPORT_STATUS = {
  GENERATING: 'GENERATING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
};

// File formats
const FILE_FORMATS = {
  JSON: 'JSON',
  CSV: 'CSV',
  PDF: 'PDF',
  EXCEL: 'EXCEL'
};

// HTTP status codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500
};

// Error codes
const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  CONFLICT_ERROR: 'CONFLICT_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR'
};

// Pagination defaults
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100
};

// Time constants
const TIME_CONSTANTS = {
  JWT_EXPIRES_IN: '24h',
  PASSWORD_RESET_EXPIRES_IN: '1h',
  EMAIL_VERIFICATION_EXPIRES_IN: '24h',
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX: 100
};

// File upload limits
const FILE_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['jpg', 'jpeg', 'png', 'gif'],
  ALLOWED_DOCUMENT_TYPES: ['pdf', 'doc', 'docx', 'txt'],
  ALLOWED_VIDEO_TYPES: ['mp4', 'avi', 'mov', 'wmv']
};

// Location constants
const LOCATION = {
  DEFAULT_RADIUS_KM: 50,
  MAX_RADIUS_KM: 500,
  EARTH_RADIUS_KM: 6371
};

// Job constants
const JOB_CONSTANTS = {
  MAX_ASSIGNMENTS_DEFAULT: 1,
  MIN_HOURLY_RATE: 0,
  MAX_HOURLY_RATE: 1000,
  DEFAULT_PRIORITY: 'MEDIUM',
  MAX_TITLE_LENGTH: 255,
  MAX_DESCRIPTION_LENGTH: 5000
};

// User constants
const USER_CONSTANTS = {
  MIN_PASSWORD_LENGTH: 6,
  MAX_PASSWORD_LENGTH: 255,
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 100,
  MAX_EMAIL_LENGTH: 255,
  MAX_PHONE_LENGTH: 20
};

// Check-in constants
const CHECKIN_CONSTANTS = {
  LATE_THRESHOLD_MINUTES: 15,
  EARLY_CHECKOUT_THRESHOLD_MINUTES: 15,
  MAX_BREAK_TIME_MINUTES: 60,
  MIN_WORK_TIME_MINUTES: 30
};

// Notification types
const NOTIFICATION_TYPES = {
  JOB_ASSIGNED: 'JOB_ASSIGNED',
  JOB_ACCEPTED: 'JOB_ACCEPTED',
  JOB_REJECTED: 'JOB_REJECTED',
  JOB_COMPLETED: 'JOB_COMPLETED',
  JOB_CANCELLED: 'JOB_CANCELLED',
  CHECK_IN: 'CHECK_IN',
  CHECK_OUT: 'CHECK_OUT',
  EXTENSION_REQUEST: 'EXTENSION_REQUEST',
  SYSTEM_ANNOUNCEMENT: 'SYSTEM_ANNOUNCEMENT'
};

// API endpoints
const API_ENDPOINTS = {
  AUTH: {
    REGISTER: '/api/v1/auth/register',
    LOGIN: '/api/v1/auth/login',
    PROFILE: '/api/v1/auth/profile',
    REFRESH: '/api/v1/auth/refresh',
    LOGOUT: '/api/v1/auth/logout'
  },
  HR: {
    USERS: '/api/v1/hr/users',
    JOBS: '/api/v1/hr/jobs',
    ASSIGNMENTS: '/api/v1/hr/assignments',
    DASHBOARD: '/api/v1/hr/dashboard'
  },
  DOCTOR: {
    AVAILABLE_JOBS: '/api/v1/doctor/jobs/available',
    ASSIGNMENTS: '/api/v1/doctor/assignments',
    CHECKIN: '/api/v1/doctor/checkin',
    CHECKOUT: '/api/v1/doctor/checkout',
    STATUS: '/api/v1/doctor/status'
  },
  NURSE: {
    AVAILABLE_JOBS: '/api/v1/nurse/jobs/available',
    ASSIGNMENTS: '/api/v1/nurse/assignments',
    CHECKIN: '/api/v1/nurse/checkin',
    CHECKOUT: '/api/v1/nurse/checkout',
    STATUS: '/api/v1/nurse/status'
  },
  JOBS: {
    SEARCH: '/api/v1/jobs/search',
    CATEGORIES: '/api/v1/jobs/categories',
    FEATURED: '/api/v1/jobs/featured',
    STATS: '/api/v1/jobs/stats'
  },
  REPORTS: {
    GENERATE: '/api/v1/reports',
    LIST: '/api/v1/reports',
    GET: '/api/v1/reports/:id'
  }
};

// Database table names
const TABLE_NAMES = {
  USERS: 'users',
  JOBS: 'jobs',
  JOB_ASSIGNMENTS: 'job_assignments',
  CHECK_INS: 'check_ins',
  REPORTS: 'reports'
};

// Validation messages
const VALIDATION_MESSAGES = {
  REQUIRED: 'This field is required',
  INVALID_EMAIL: 'Please provide a valid email address',
  INVALID_PHONE: 'Please provide a valid phone number',
  INVALID_PASSWORD: 'Password must be at least 6 characters long',
  INVALID_DATE: 'Please provide a valid date',
  INVALID_TIME: 'Please provide a valid time format (HH:MM)',
  INVALID_ROLE: 'Please provide a valid role',
  INVALID_STATUS: 'Please provide a valid status',
  INVALID_PRIORITY: 'Please provide a valid priority',
  DATE_MUST_BE_FUTURE: 'Date must be in the future',
  END_DATE_AFTER_START: 'End date must be after start date',
  END_TIME_AFTER_START: 'End time must be after start time',
  MIN_LENGTH: (min) => `Must be at least ${min} characters long`,
  MAX_LENGTH: (max) => `Must be no more than ${max} characters long`,
  MIN_VALUE: (min) => `Must be at least ${min}`,
  MAX_VALUE: (max) => `Must be no more than ${max}`
};

// Success messages
const SUCCESS_MESSAGES = {
  USER_REGISTERED: 'User registered successfully',
  USER_LOGGED_IN: 'Login successful',
  USER_LOGGED_OUT: 'Logout successful',
  PROFILE_UPDATED: 'Profile updated successfully',
  PASSWORD_CHANGED: 'Password changed successfully',
  JOB_CREATED: 'Job posted successfully',
  JOB_UPDATED: 'Job updated successfully',
  JOB_CANCELLED: 'Job cancelled successfully',
  JOB_ASSIGNED: 'Job assigned successfully',
  ASSIGNMENT_ACCEPTED: 'Job accepted successfully',
  ASSIGNMENT_REJECTED: 'Job rejected successfully',
  CHECKED_IN: 'Checked in successfully',
  CHECKED_OUT: 'Checked out successfully',
  REPORT_GENERATED: 'Report generated successfully',
  REPORT_DELETED: 'Report deleted successfully'
};

// Error messages
const ERROR_MESSAGES = {
  INTERNAL_SERVER_ERROR: 'Something went wrong!',
  UNAUTHORIZED: 'Access denied',
  FORBIDDEN: 'You do not have permission to perform this action',
  NOT_FOUND: 'Resource not found',
  VALIDATION_FAILED: 'Validation failed',
  USER_NOT_FOUND: 'User not found',
  JOB_NOT_FOUND: 'Job not found',
  ASSIGNMENT_NOT_FOUND: 'Assignment not found',
  INVALID_CREDENTIALS: 'Invalid email or password',
  USER_ALREADY_EXISTS: 'User with this email already exists',
  JOB_ALREADY_ASSIGNED: 'User is already assigned to this job',
  MAX_ASSIGNMENTS_REACHED: 'Maximum assignments reached for this job',
  JOB_CANNOT_BE_UPDATED: 'Cannot update completed or cancelled jobs',
  ALREADY_CHECKED_IN: 'You are already checked in to this job',
  ALREADY_CHECKED_OUT: 'You are already checked out from this job',
  INVALID_CHECKIN_TIME: 'You can only check in on the job date',
  DATABASE_CONNECTION_FAILED: 'Database connection failed',
  TOKEN_EXPIRED: 'Token has expired',
  TOKEN_INVALID: 'Invalid token'
};

module.exports = {
  USER_ROLES,
  JOB_STATUS,
  ASSIGNMENT_STATUS,
  CHECKIN_STATUS,
  JOB_PRIORITY,
  REPORT_TYPES,
  REPORT_STATUS,
  FILE_FORMATS,
  HTTP_STATUS,
  ERROR_CODES,
  PAGINATION,
  TIME_CONSTANTS,
  FILE_LIMITS,
  LOCATION,
  JOB_CONSTANTS,
  USER_CONSTANTS,
  CHECKIN_CONSTANTS,
  NOTIFICATION_TYPES,
  API_ENDPOINTS,
  TABLE_NAMES,
  VALIDATION_MESSAGES,
  SUCCESS_MESSAGES,
  ERROR_MESSAGES
};
