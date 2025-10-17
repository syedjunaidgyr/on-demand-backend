const moment = require('moment');

// Date and time utilities
const formatDate = (date, format = 'YYYY-MM-DD') => {
  return moment(date).format(format);
};

const formatDateTime = (date, format = 'YYYY-MM-DD HH:mm:ss') => {
  return moment(date).format(format);
};

const isToday = (date) => {
  return moment(date).isSame(moment(), 'day');
};

const isTomorrow = (date) => {
  return moment(date).isSame(moment().add(1, 'day'), 'day');
};

const isPast = (date) => {
  return moment(date).isBefore(moment());
};

const isFuture = (date) => {
  return moment(date).isAfter(moment());
};

// Time calculation utilities
const calculateHoursBetween = (startTime, endTime) => {
  const start = moment(startTime);
  const end = moment(endTime);
  return end.diff(start, 'hours', true);
};

const calculateMinutesBetween = (startTime, endTime) => {
  const start = moment(startTime);
  const end = moment(endTime);
  return end.diff(start, 'minutes');
};

const formatDuration = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

// Validation utilities
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPhone = (phone) => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone);
};

const isValidTime = (time) => {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
};

// String utilities
const capitalizeFirst = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

const formatName = (firstName, lastName) => {
  return `${capitalizeFirst(firstName)} ${capitalizeFirst(lastName)}`;
};

const generateSlug = (text) => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Array utilities
const groupBy = (array, key) => {
  return array.reduce((groups, item) => {
    const group = item[key];
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {});
};

const sortBy = (array, key, order = 'asc') => {
  return array.sort((a, b) => {
    if (order === 'desc') {
      return b[key] > a[key] ? 1 : -1;
    }
    return a[key] > b[key] ? 1 : -1;
  });
};

const uniqueBy = (array, key) => {
  const seen = new Set();
  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
};

// Pagination utilities
const paginate = (array, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const total = array.length;
  const pages = Math.ceil(total / limit);
  const data = array.slice(offset, offset + limit);

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      pages,
      hasNext: page < pages,
      hasPrev: page > 1
    }
  };
};

// Error handling utilities
const createError = (message, statusCode = 500, code = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) error.code = code;
  return error;
};

const handleAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Response utilities
const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

const sendError = (res, message = 'Error', statusCode = 500, errors = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors })
  });
};

// File utilities
const getFileExtension = (filename) => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
};

const isValidFileType = (filename, allowedTypes) => {
  const extension = getFileExtension(filename).toLowerCase();
  return allowedTypes.includes(extension);
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Location utilities
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return distance;
};

const isWithinRadius = (lat1, lon1, lat2, lon2, radiusKm) => {
  const distance = calculateDistance(lat1, lon1, lat2, lon2);
  return distance <= radiusKm;
};

// Job utilities
const getJobStatusColor = (status) => {
  const colors = {
    'ACTIVE': '#28a745',
    'ASSIGNED': '#17a2b8',
    'IN_PROGRESS': '#ffc107',
    'COMPLETED': '#6c757d',
    'CANCELLED': '#dc3545'
  };
  return colors[status] || '#6c757d';
};

const getPriorityColor = (priority) => {
  const colors = {
    'LOW': '#28a745',
    'MEDIUM': '#ffc107',
    'HIGH': '#fd7e14',
    'URGENT': '#dc3545'
  };
  return colors[priority] || '#6c757d';
};

const getRoleColor = (role) => {
  const colors = {
    'HR': '#6f42c1',
    'DOCTOR': '#007bff',
    'NURSE': '#28a745',
    'ADMIN': '#dc3545'
  };
  return colors[role] || '#6c757d';
};

// Notification utilities
const generateNotificationMessage = (type, data) => {
  const messages = {
    'JOB_ASSIGNED': `You have been assigned to a new job: ${data.jobTitle}`,
    'JOB_ACCEPTED': `${data.userName} has accepted the job: ${data.jobTitle}`,
    'JOB_REJECTED': `${data.userName} has rejected the job: ${data.jobTitle}`,
    'JOB_COMPLETED': `Job completed: ${data.jobTitle}`,
    'CHECK_IN': `${data.userName} has checked in for: ${data.jobTitle}`,
    'CHECK_OUT': `${data.userName} has checked out from: ${data.jobTitle}`,
    'JOB_CANCELLED': `Job cancelled: ${data.jobTitle}`,
    'EXTENSION_REQUEST': `${data.userName} has requested an extension for: ${data.jobTitle}`
  };
  return messages[type] || 'New notification';
};

module.exports = {
  // Date and time
  formatDate,
  formatDateTime,
  isToday,
  isTomorrow,
  isPast,
  isFuture,
  calculateHoursBetween,
  calculateMinutesBetween,
  formatDuration,
  
  // Validation
  isValidEmail,
  isValidPhone,
  isValidTime,
  
  // String
  capitalizeFirst,
  formatName,
  generateSlug,
  
  // Array
  groupBy,
  sortBy,
  uniqueBy,
  paginate,
  
  // Error handling
  createError,
  handleAsync,
  
  // Response
  sendSuccess,
  sendError,
  
  // File
  getFileExtension,
  isValidFileType,
  formatFileSize,
  
  // Location
  calculateDistance,
  isWithinRadius,
  
  // Job
  getJobStatusColor,
  getPriorityColor,
  getRoleColor,
  
  // Notification
  generateNotificationMessage
};
