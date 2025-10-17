const Joi = require('joi');

// Validation schemas
const schemas = {
  // User validation
  userRegistration: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
      'any.only': 'Password confirmation does not match password'
    }),
    firstName: Joi.string().min(2).max(100).required(),
    lastName: Joi.string().min(2).max(100).required(),
    phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional(),
    role: Joi.string().valid('HR', 'DOCTOR', 'NURSE', 'ADMIN').required(),
    department: Joi.string().max(100).optional(),
    location: Joi.string().max(255).optional(),
    hospitalId: Joi.number().integer().positive().optional(),
    unitCode: Joi.string().max(50).optional(),
    specialization: Joi.string().max(255).optional(),
    licenseNumber: Joi.string().max(100).optional(),
    emergencyContact: Joi.object({
      name: Joi.string().required(),
      phone: Joi.string().required(),
      relationship: Joi.string().required()
    }).optional(),
    address: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      zipCode: Joi.string().required(),
      country: Joi.string().required()
    }).optional()
  }),

  userLogin: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  userUpdate: Joi.object({
    firstName: Joi.string().min(2).max(100).optional(),
    lastName: Joi.string().min(2).max(100).optional(),
    phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional(),
    department: Joi.string().max(100).optional(),
    location: Joi.string().max(255).optional(),
    hospitalId: Joi.number().integer().positive().optional(),
    unitCode: Joi.string().max(50).optional(),
    specialization: Joi.string().max(255).optional(),
    licenseNumber: Joi.string().max(100).optional(),
    emergencyContact: Joi.object({
      name: Joi.string().required(),
      phone: Joi.string().required(),
      relationship: Joi.string().required()
    }).optional(),
    address: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      zipCode: Joi.string().required(),
      country: Joi.string().required()
    }).optional()
  }),

  passwordChange: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).required(),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
      'any.only': 'Password confirmation does not match new password'
    })
  }),

  // Job validation
  jobCreation: Joi.object({
    title: Joi.string().min(5).max(255).required(),
    description: Joi.string().required(),
    department: Joi.string().max(100).required(),
    location: Joi.string().max(255).required(),
    requiredRole: Joi.string().valid('DOCTOR', 'NURSE').required(),
    specialization: Joi.string().max(255).required().messages({
      'any.required': 'Specialization is required and must match the department'
    }),
    startDate: Joi.date().greater('now').required(),
    endDate: Joi.date().greater(Joi.ref('startDate')).required(),
    startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    hourlyRate: Joi.number().positive().required(),
    priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'URGENT').optional(),
    maxAssignments: Joi.number().integer().min(1).optional(),
    requirements: Joi.object().optional(),
    benefits: Joi.object().optional(),
    hospitalId: Joi.number().integer().positive().required(),
    unitCode: Joi.string().max(50).required(),
    facilityName: Joi.string().max(255).required(),
    facilityAddress: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      zipCode: Joi.string().required(),
      country: Joi.string().required()
    }).required(),
    contactPerson: Joi.object({
      name: Joi.string().required(),
      phone: Joi.string().required(),
      email: Joi.string().email().required(),
      position: Joi.string().required()
    }).optional(),
    notes: Joi.string().optional(),
    isRecurring: Joi.boolean().optional(),
    recurringPattern: Joi.object().optional()
  }),

  jobUpdate: Joi.object({
    title: Joi.string().min(5).max(255).optional(),
    description: Joi.string().optional(),
    department: Joi.string().max(100).optional(),
    location: Joi.string().max(255).optional(),
    requiredRole: Joi.string().valid('DOCTOR', 'NURSE').optional(),
    specialization: Joi.string().max(255).optional(),
    startDate: Joi.date().greater('now').optional(),
    endDate: Joi.date().greater(Joi.ref('startDate')).optional(),
    startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    hourlyRate: Joi.number().positive().optional(),
    priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'URGENT').optional(),
    maxAssignments: Joi.number().integer().min(1).optional(),
    requirements: Joi.object().optional(),
    benefits: Joi.object().optional(),
    facilityName: Joi.string().max(255).optional(),
    facilityAddress: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      zipCode: Joi.string().required(),
      country: Joi.string().required()
    }).optional(),
    contactPerson: Joi.object({
      name: Joi.string().required(),
      phone: Joi.string().required(),
      email: Joi.string().email().required(),
      position: Joi.string().required()
    }).optional(),
    notes: Joi.string().optional(),
    isRecurring: Joi.boolean().optional(),
    recurringPattern: Joi.object().optional()
  }),

  // Job assignment validation
  jobAssignment: Joi.object({
    userId: Joi.number().integer().positive().required(),
    hourlyRate: Joi.number().positive().optional(),
    notes: Joi.string().optional()
  }),

  jobAcceptance: Joi.object({
    assignmentId: Joi.number().integer().positive().required(),
    action: Joi.string().valid('ACCEPT', 'REJECT').required(),
    rejectionReason: Joi.string().when('action', {
      is: 'REJECT',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
  }),

  // Check-in validation
  checkIn: Joi.object({
    jobAssignmentId: Joi.number().integer().positive().required(),
    location: Joi.object({
      latitude: Joi.number().required(),
      longitude: Joi.number().required(),
      address: Joi.string().optional()
    }).optional(),
    notes: Joi.string().optional()
  }),

  checkOut: Joi.object({
    jobAssignmentId: Joi.number().integer().positive().required(),
    location: Joi.object({
      latitude: Joi.number().required(),
      longitude: Joi.number().required(),
      address: Joi.string().optional()
    }).optional(),
    notes: Joi.string().optional()
  }),

  // Extension request validation
  extensionRequest: Joi.object({
    reason: Joi.string().min(10).max(500).required(),
    requestedHours: Joi.number().positive().optional()
  }),

  // Report validation
  reportGeneration: Joi.object({
    title: Joi.string().max(255).required(),
    type: Joi.string().valid(
      'JOB_POSTINGS',
      'JOB_ASSIGNMENTS',
      'STAFF_PERFORMANCE',
      'FINANCIAL',
      'ATTENDANCE',
      'UTILIZATION',
      'CUSTOM'
    ).required(),
    parameters: Joi.object().optional(),
    fileFormat: Joi.string().valid('JSON', 'CSV', 'PDF', 'EXCEL').optional()
  }),

  // Query parameters validation
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC')
  }),

  jobFilters: Joi.object({
    department: Joi.string().optional(),
    location: Joi.string().optional(),
    requiredRole: Joi.string().valid('DOCTOR', 'NURSE').optional(),
    status: Joi.string().valid('ACTIVE', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED').optional(),
    priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'URGENT').optional(),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    minRate: Joi.number().positive().optional(),
    maxRate: Joi.number().positive().optional()
  }),

  // Hospital creation schema
  hospitalCreation: Joi.object({
    name: Joi.string().min(2).max(255).required(),
    code: Joi.string().min(2).max(50).required(),
    address: Joi.string().max(500).optional(),
    city: Joi.string().max(100).optional(),
    state: Joi.string().max(50).optional(),
    zipCode: Joi.string().max(20).optional(),
    country: Joi.string().max(100).optional(),
    phone: Joi.string().max(20).optional(),
    email: Joi.string().email().optional(),
    website: Joi.string().uri().optional(),
    isActive: Joi.boolean().default(true)
  }),

  // Hospital update schema
  hospitalUpdate: Joi.object({
    name: Joi.string().min(2).max(255).optional(),
    code: Joi.string().min(2).max(50).optional(),
    address: Joi.string().max(500).optional(),
    city: Joi.string().max(100).optional(),
    state: Joi.string().max(50).optional(),
    zipCode: Joi.string().max(20).optional(),
    country: Joi.string().max(100).optional(),
    phone: Joi.string().max(20).optional(),
    email: Joi.string().email().optional(),
    website: Joi.string().uri().optional(),
    isActive: Joi.boolean().optional()
  }),

  // Unit creation schema
  unitCreation: Joi.object({
    unitCode: Joi.string().min(2).max(50).required(),
    unitName: Joi.string().min(2).max(255).required(),
    isActive: Joi.boolean().default(true)
  }),

  // Unit update schema
  unitUpdate: Joi.object({
    unitCode: Joi.string().min(2).max(50).optional(),
    unitName: Joi.string().min(2).max(255).optional(),
    isActive: Joi.boolean().optional()
  })
};

// Validation middleware factory
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    req[property] = value;
    next();
  };
};

// Department-Specialization mapping (same as frontend)
const departmentSpecializations = {
  'Emergency Medicine': ['Trauma Care', 'Critical Care', 'Accident & Emergency', 'Emergency Surgery'],
  'General Medicine': ['Internal Medicine', 'Diabetology', 'Infectious Diseases', 'Geriatric Medicine'],
  'General Surgery': ['Laparoscopic Surgery', 'Gastrointestinal Surgery', 'Hernia Repair', 'Breast Surgery'],
  'Obstetrics & Gynecology': ['Obstetrics', 'Gynecology', 'Infertility', 'Maternal-Fetal Medicine'],
  'Pediatrics': ['Neonatology', 'Pediatric Neurology', 'Pediatric Cardiology', 'Child Development'],
  'Orthopedics': ['Joint Replacement', 'Sports Medicine', 'Spine Surgery', 'Trauma Orthopedics'],
  'Cardiology': ['Interventional Cardiology', 'Non-Invasive Cardiology', 'Pediatric Cardiology', 'Cardiac Rehabilitation'],
  'Neurology': ['Stroke', 'Epilepsy', 'Neurophysiology', 'Movement Disorders'],
  'Urology': ['Andrology', 'Endourology', 'Pediatric Urology', 'Uro-Oncology'],
  'Nephrology': ['Dialysis', 'Renal Transplant', 'Chronic Kidney Disease', 'Hypertension Management'],
  'Gastroenterology': ['Hepatology', 'Pancreatology', 'Endoscopy', 'Liver Transplant'],
  'Oncology': ['Medical Oncology', 'Radiation Oncology', 'Surgical Oncology', 'Hematologic Oncology'],
  'ENT': ['Otology (Ear)', 'Rhinology (Nose)', 'Laryngology (Throat)', 'Head & Neck Surgery'],
  'Ophthalmology': ['Cataract Surgery', 'Glaucoma', 'Retina', 'Cornea & Refractive Surgery'],
  'Dermatology': ['Cosmetic Dermatology', 'Trichology', 'Clinical Dermatology', 'Venereology'],
  'Psychiatry': ['Child Psychiatry', 'Addiction Psychiatry', 'Clinical Psychology', 'Geriatric Psychiatry'],
  'Radiology': ['MRI', 'CT Scan', 'Ultrasound', 'Interventional Radiology'],
  'Pathology': ['Histopathology', 'Cytopathology', 'Hematology', 'Clinical Pathology'],
  'Anesthesiology': ['Cardiac Anesthesia', 'Neuroanesthesia', 'Pain Management', 'Critical Care Anesthesia'],
  'Physiotherapy': ['Orthopedic Physiotherapy', 'Neurological Physiotherapy', 'Cardiopulmonary Physiotherapy', 'Sports Rehabilitation'],
};

// Custom validation functions
const validateDateRange = (startDate, endDate) => {
  if (new Date(startDate) >= new Date(endDate)) {
    throw new Error('End date must be after start date');
  }
};

const validateTimeRange = (startTime, endTime) => {
  const start = startTime.split(':').map(Number);
  const end = endTime.split(':').map(Number);
  
  if (start[0] > end[0] || (start[0] === end[0] && start[1] >= end[1])) {
    throw new Error('End time must be after start time');
  }
};

const validateDepartmentSpecialization = (department, specialization) => {
  if (!department || !specialization) {
    return; // Let Joi handle required field validation
  }
  
  const validSpecializations = departmentSpecializations[department];
  if (!validSpecializations) {
    throw new Error(`Invalid department: ${department}`);
  }
  
  if (!validSpecializations.includes(specialization)) {
    throw new Error(`Specialization "${specialization}" is not valid for department "${department}". Valid specializations are: ${validSpecializations.join(', ')}`);
  }
};

module.exports = {
  schemas,
  validate,
  validateDateRange,
  validateTimeRange,
  validateDepartmentSpecialization,
  departmentSpecializations
};
