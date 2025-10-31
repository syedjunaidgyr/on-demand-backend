const express = require('express');
const { Op } = require('sequelize');
const { User, Job, JobAssignment, CheckIn, Hospital, Unit } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas, validateDepartmentSpecialization } = require('../middleware/validation');
const { findCompatibleStaff } = require('../utils/helpers');
const { sendNotifications, formatHuman } = require('../utils/notifications');

const router = express.Router();

// Public endpoint - Get accepted assignments for HR to review and select (NO AUTH REQUIRED)
router.get('/jobs/:id/accepted-assignments', async (req, res) => {
  try {
    const jobId = req.params.id;
    
    const acceptedAssignments = await JobAssignment.findAll({
      where: { 
        jobId: jobId,
        status: 'ACCEPTED'
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'role', 'department', 'specialization', 'location']
        },
        {
          model: User,
          as: 'assigner',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['createdAt', 'ASC']] // First to accept first
    });

    res.json({
      jobId: jobId,
      acceptedAssignments,
      totalAccepted: acceptedAssignments.length
    });
  } catch (error) {
    console.error('Get accepted assignments error:', error);
    res.status(500).json({
      error: 'Failed to fetch accepted assignments',
      message: error.message
    });
  }
});

// Public endpoint - Select final candidate from accepted assignments (NO AUTH REQUIRED)
router.post('/jobs/:id/select-candidate', async (req, res) => {
  try {
    const { assignmentId } = req.body;
    const jobId = req.params.id;

    // Verify the assignment exists and is accepted
    const selectedAssignment = await JobAssignment.findOne({
      where: { 
        id: assignmentId, 
        jobId: jobId,
        status: 'ACCEPTED'
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role']
        },
        {
          model: Job,
          as: 'job',
          attributes: ['id', 'title', 'maxAssignments']
        }
      ]
    });

    if (!selectedAssignment) {
      return res.status(404).json({
        error: 'Assignment not found',
        message: 'Assignment does not exist or is not accepted'
      });
    }

    // Check if job still has available slots
    const currentAcceptedAssignments = await JobAssignment.count({
      where: { 
        jobId: jobId, 
        status: 'ACCEPTED' 
      }
    });

    if (currentAcceptedAssignments > selectedAssignment.job.maxAssignments) {
      return res.status(400).json({
        error: 'Job is full',
        message: 'This job has already reached its maximum number of assignments'
      });
    }

    // Confirm the selected assignment - HR assigns the job
    await selectedAssignment.update({ 
      status: 'ASSIGNED',
      confirmedAt: new Date()
    });

    // Reject all other accepted assignments for this job
    await JobAssignment.update(
      { 
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectionReason: 'Another candidate was selected for this job'
      },
      { 
        where: { 
          jobId: jobId,
          status: 'ACCEPTED',
          id: { [Op.ne]: assignmentId }
        }
      }
    );

    // Update job status to ASSIGNED
    await Job.update(
      { status: 'ASSIGNED' },
      { where: { id: jobId }, validate: false }
    );

    // Notify selected staff
    try {
      await selectedAssignment.reload({ include: [{ model: Job, as: 'job', attributes: ['title','startDate','location'] }, { model: User, as: 'user', attributes: ['id','role','firstName','lastName'] }] });
      await sendNotifications('CandidateSelected_NotifyStaff', [{
        userId: String(selectedAssignment.user.id),
        userType: (selectedAssignment.user.role || '').toLowerCase(),
        placeholders: { jobTitle: selectedAssignment.job.title, startDate: formatHuman(selectedAssignment.job.startDate), location: selectedAssignment.job.location }
      }]);
    } catch (e) {}

    // Notify HR creator (if available)
    try {
      const job = await Job.findByPk(jobId);
      if (job?.createdBy) {
        const creator = await User.findByPk(job.createdBy);
        if (creator) {
          await sendNotifications('CandidateSelected_ConfirmHR', [{
            userId: String(creator.id),
            userType: (creator.role || 'hr').toLowerCase(),
            placeholders: { assigneeName: `${selectedAssignment.user.firstName} ${selectedAssignment.user.lastName}`, jobTitle: selectedAssignment.job.title }
          }]);
        }
      }
    } catch (e) {}

    res.json({
      message: 'Candidate assigned successfully. Staff can now check-in for the job.',
      selectedAssignment,
      jobStatus: 'ASSIGNED'
    });
  } catch (error) {
    console.error('Select candidate error:', error);
    res.status(500).json({
      error: 'Failed to select candidate',
      message: error.message
    });
  }
});

// Apply authentication and HR authorization to all routes
router.use(authenticate);
router.use(authorize('HR', 'ADMIN', 'AGENCY'));

// Get all users (HR can view all staff)
router.get('/users', validate(schemas.pagination, 'query'), async (req, res) => {
  try {
    const { page, limit, sortBy = 'createdAt', sortOrder = 'DESC' } = req.query;
    const offset = (page - 1) * limit;

    const whereConditions = {};
    
    // Agencies can only view NURSE users
    if (req.user.role === 'AGENCY') {
      whereConditions.role = 'NURSE';
    } else {
      whereConditions.role = { [Op.in]: ['DOCTOR', 'NURSE'] };
    }

    const { count, rows: users } = await User.findAndCountAll({
      attributes: { exclude: ['password'] },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder]],
      where: whereConditions
    });

    res.json({
      users,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      error: 'Failed to fetch users',
      message: error.message
    });
  }
});

// Get user by ID
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User does not exist'
      });
    }

    // Agencies can only view NURSE users
    if (req.user.role === 'AGENCY' && user.role !== 'NURSE') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Agencies can only view NURSE users'
      });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Failed to fetch user',
      message: error.message
    });
  }
});

// Get all assignments (returns ALL assignments without pagination for HR/ADMIN)
router.get('/assignments', async (req, res) => {
  try {
    const { 
      status,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const whereClause = {};

    if (status) {
      whereClause.status = status;
    }

    const assignments = await JobAssignment.findAll({
      where: whereClause,
      include: [
        {
          model: Job,
          as: 'job',
          attributes: ['id', 'title', 'department', 'location', 'startDate', 'endDate', 'startTime', 'endTime', 'facilityName', 'facilityAddress', 'status', 'priority']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'role', 'department', 'specialization']
        },
        {
          model: User,
          as: 'assigner',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: CheckIn,
          as: 'checkIns',
          attributes: ['id', 'checkInTime', 'checkOutTime', 'status', 'totalWorkTime', 'isLate', 'isEarlyCheckout']
        }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]]
    });

    res.json({
      assignments,
      total: assignments.length
    });
  } catch (error) {
    console.error('Get all assignments error:', error);
    res.status(500).json({
      error: 'Failed to fetch assignments',
      message: error.message
    });
  }
});

// Create new job posting
router.post('/jobs', validate(schemas.jobCreation), async (req, res) => {
  try {
    const { hospitalId, unitCode, department, specialization } = req.body;
    
    // Validate hospitalId + unitCode pair exists and active
    const unit = await Unit.findOne({ where: { hospitalId, unitCode, isActive: true } });
    if (!unit) {
      return res.status(400).json({
        error: 'Invalid unit selection',
        message: 'Selected unitCode is not valid or inactive for the chosen hospital'
      });
    }

    // Validate department and specialization consistency
    try {
      validateDepartmentSpecialization(department, specialization, req.body.requiredRole);
    } catch (validationError) {
      return res.status(400).json({
        error: 'Invalid department/specialization combination',
        message: validationError.message
      });
    }

    const jobData = {
      ...req.body,
      createdBy: req.userId
    };
    console.log("jobData: ", jobData);

    const job = await Job.create(jobData);

    // Notify creator HR
    try {
      const creator = await User.findByPk(req.userId);
      if (creator) {
        await sendNotifications('JobCreated_Creator', [{
          userId: String(creator.id),
          userType: (creator.role || 'hr').toLowerCase(),
          placeholders: { jobTitle: job.title, department: job.department, location: job.location, startDate: formatHuman(job.startDate) }
        }]);
      }
    } catch (e) {}

    // Find compatible staff for this job
    const whereClause = {
      role: job.requiredRole,
      department: job.department,
      isActive: true
    };
    
    // For doctors, also match specialization
    if (job.requiredRole === 'DOCTOR' && job.specialization) {
      whereClause.specialization = job.specialization;
    }
    
    const compatibleStaff = await User.findAll({
      where: whereClause,
      attributes: ['id', 'firstName', 'lastName', 'email', 'department', 'specialization']
    });

    console.log('🔍 DEBUG: Job created:', {
      jobId: job.id,
      requiredRole: job.requiredRole,
      department: job.department,
      specialization: job.specialization,
      whereClause: whereClause,
      compatibleStaffCount: compatibleStaff.length,
      compatibleStaff: compatibleStaff.map(s => ({
        id: s.id,
        name: `${s.firstName} ${s.lastName}`,
        role: s.role,
        department: s.department,
        specialization: s.specialization
      }))
    });

    // Auto-create assignments for all compatible staff
    const assignments = [];
    if (compatibleStaff.length > 0) {
      const assignmentPromises = compatibleStaff.map(staff => 
        JobAssignment.create({
          jobId: job.id,
          userId: staff.id,
          assignedBy: req.userId,
          createdAt: new Date(),
          hourlyRate: job.hourlyRate,
          status: 'PENDING',
          isAutoAssigned: true
        })
      );
      
      const createdAssignments = await Promise.all(assignmentPromises);
      assignments.push(...createdAssignments);

      // Notify compatible staff pool by role
      try {
        const notifications = compatibleStaff.map(staff => ({
          userId: String(staff.id),
          userType: (staff.role || (job.requiredRole || '')).toLowerCase(),
          placeholders: { jobTitle: job.title, department: job.department, location: job.location, startDate: formatHuman(job.startDate) }
        }));
        if (job.requiredRole === 'DOCTOR') {
          await sendNotifications('JobCreated_Doctor', notifications);
        } else if (job.requiredRole === 'NURSE') {
          await sendNotifications('JobCreated_Nurse', notifications);
        }
      } catch (e) {}
      
      console.log('✅ DEBUG: Assignments created:', {
        jobId: job.id,
        assignmentsCreated: createdAssignments.length,
        assignments: createdAssignments.map(a => ({
          id: a.id,
          jobId: a.jobId,
          userId: a.userId,
          status: a.status
        }))
      });
    } else {
      console.log('❌ DEBUG: No compatible staff found for job:', job.id);
    }

    res.status(201).json({
      message: 'Job posted successfully and auto-assigned to compatible staff',
      job,
      compatibleStaffCount: compatibleStaff.length,
      assignmentsCreated: assignments.length,
      compatibleStaff: compatibleStaff.map(staff => ({
        id: staff.id,
        name: `${staff.firstName} ${staff.lastName}`,
        email: staff.email,
        department: staff.department,
        specialization: staff.specialization
      }))
    });
  } catch (error) {
    console.error('Job creation error:', error);
    res.status(500).json({
      error: 'Failed to create job',
      message: error.message
    });
  }
});

// Get all jobs with filters (returns ALL jobs without pagination)
router.get('/jobs', async (req, res) => {
  try {
    const { 
      sortBy = 'createdAt', 
      sortOrder = 'DESC',
      department,
      location,
      requiredRole,
      status, // Only filter by status if explicitly provided
      priority,
      startDate,
      endDate,
      minRate,
      maxRate
    } = req.query;

    const whereClause = {}; // No default filters - returns ALL jobs

    // Apply filters ONLY if explicitly provided
    if (department) whereClause.department = department;
    if (location) whereClause.location = { [Op.like]: `%${location}%` };
    if (requiredRole) whereClause.requiredRole = requiredRole;
    if (status) whereClause.status = status;
    if (priority) whereClause.priority = priority;
    if (startDate) whereClause.startDate = { [Op.gte]: startDate };
    if (endDate) whereClause.endDate = { [Op.lte]: endDate };
    if (minRate) whereClause.hourlyRate = { [Op.gte]: minRate };
    if (maxRate) whereClause.hourlyRate = { ...whereClause.hourlyRate, [Op.lte]: maxRate };

    const jobs = await Job.findAll({
      where: whereClause,
      attributes: [
        'id', 'title', 'description', 'department', 'location', 'requiredRole', 
        'specialization', 'startDate', 'endDate', 'startTime', 'endTime', 
        'hourlyRate', 'status', 'priority', 'maxAssignments', 'facilityName', 
        'facilityAddress', 'createdBy', 'hospitalId', 'unitCode', 'createdAt', 'updatedAt'
      ],
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false // LEFT JOIN - include jobs even if creator is missing
        },
        {
          model: JobAssignment,
          as: 'assignments',
          required: false, // LEFT JOIN - include jobs without assignments
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName', 'email', 'role'],
              required: false
            }
          ]
        }
      ],
      order: [[sortBy, sortOrder]]
    });

    // Transform jobs to include assignment status breakdown
    const transformedJobs = jobs.map(job => {
      const jobData = job.toJSON();
      
      // Count assignments by status
      const assignmentsByStatus = {
        PENDING: jobData.assignments.filter(a => a.status === 'PENDING').length,
        ACCEPTED: jobData.assignments.filter(a => a.status === 'ACCEPTED').length,
        ASSIGNED: jobData.assignments.filter(a => a.status === 'ASSIGNED').length,
        IN_PROGRESS: jobData.assignments.filter(a => a.status === 'IN_PROGRESS').length,
        COMPLETED: jobData.assignments.filter(a => a.status === 'COMPLETED').length,
        REJECTED: jobData.assignments.filter(a => a.status === 'REJECTED').length,
        CANCELLED: jobData.assignments.filter(a => a.status === 'CANCELLED').length
      };
      
      const currentAssignments = jobData.assignments.filter(assignment => 
        ['ACCEPTED', 'ASSIGNED', 'IN_PROGRESS'].includes(assignment.status)
      ).length;
      
      return {
        ...jobData,
        currentAssignments,
        assignmentStatus: assignmentsByStatus
      };
    });

    // Calculate summary statistics
    const summary = {
      byJobStatus: {
        ACTIVE: transformedJobs.filter(j => j.status === 'ACTIVE').length,
        ASSIGNED: transformedJobs.filter(j => j.status === 'ASSIGNED').length,
        IN_PROGRESS: transformedJobs.filter(j => j.status === 'IN_PROGRESS').length,
        COMPLETED: transformedJobs.filter(j => j.status === 'COMPLETED').length,
        CANCELLED: transformedJobs.filter(j => j.status === 'CANCELLED').length
      },
      byAssignmentStatus: {
        PENDING: transformedJobs.reduce((sum, j) => sum + j.assignmentStatus.PENDING, 0),
        ACCEPTED: transformedJobs.reduce((sum, j) => sum + j.assignmentStatus.ACCEPTED, 0),
        ASSIGNED: transformedJobs.reduce((sum, j) => sum + j.assignmentStatus.ASSIGNED, 0),
        IN_PROGRESS: transformedJobs.reduce((sum, j) => sum + j.assignmentStatus.IN_PROGRESS, 0),
        COMPLETED: transformedJobs.reduce((sum, j) => sum + j.assignmentStatus.COMPLETED, 0),
        REJECTED: transformedJobs.reduce((sum, j) => sum + j.assignmentStatus.REJECTED, 0),
        CANCELLED: transformedJobs.reduce((sum, j) => sum + j.assignmentStatus.CANCELLED, 0)
      }
    };

    res.json({
      jobs: transformedJobs,
      total: transformedJobs.length,
      summary
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({
      error: 'Failed to fetch jobs',
      message: error.message
    });
  }
});

// Get job by ID with assignments
router.get('/jobs/:id', async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: JobAssignment,
          as: 'assignments',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'phone']
            },
            {
              model: User,
              as: 'assigner',
              attributes: ['id', 'firstName', 'lastName', 'email']
            },
            {
              model: CheckIn,
              as: 'checkIns',
              order: [['checkInTime', 'DESC']]
            }
          ]
        }
      ]
    });

    if (!job) {
      return res.status(404).json({
        error: 'Job not found',
        message: 'Job does not exist'
      });
    }

    res.json({ job });
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({
      error: 'Failed to fetch job',
      message: error.message
    });
  }
});

// Update job
router.put('/jobs/:id', validate(schemas.jobUpdate), async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.id);

    if (!job) {
      return res.status(404).json({
        error: 'Job not found',
        message: 'Job does not exist'
      });
    }

    // Check if job can be updated (not completed or cancelled)
    if (['COMPLETED', 'CANCELLED'].includes(job.status)) {
      return res.status(400).json({
        error: 'Cannot update job',
        message: 'Cannot update completed or cancelled jobs'
      });
    }

    await job.update(req.body);

    // Notify assigned staff about job update
    try {
      const assignments = await JobAssignment.findAll({ where: { jobId: job.id }, include: [{ model: User, as: 'user', attributes: ['id','role'] }] });
      const notifications = assignments
        .filter(a => ['PENDING','ACCEPTED','IN_PROGRESS','ASSIGNED'].includes(a.status))
        .map(a => ({
          userId: String(a.user.id),
          userType: (a.user.role || '').toLowerCase(),
          placeholders: { jobTitle: job.title, changeSummary: 'Job details updated' }
        }));
      if (notifications.length > 0) {
        await sendNotifications('JobUpdated_AssignedStaff', notifications);
      }
    } catch (e) {}

    // Notify job creator (HR)
    try {
      if (job.createdBy) {
        const creator = await User.findByPk(job.createdBy);
        if (creator) {
          await sendNotifications('JobUpdated_Creator', [{
            userId: String(creator.id),
            userType: (creator.role || 'hr').toLowerCase(),
            placeholders: { jobTitle: job.title, changeSummary: 'Job details updated' }
          }]);
        }
      }
    } catch (e) {}

    res.json({
      message: 'Job updated successfully',
      job
    });
  } catch (error) {
    console.error('Job update error:', error);
    res.status(500).json({
      error: 'Failed to update job',
      message: error.message
    });
  }
});

// Cancel job
router.patch('/jobs/:id/cancel', async (req, res) => {
  try {
    const { reason } = req.body;
    const job = await Job.findByPk(req.params.id);

    if (!job) {
      return res.status(404).json({
        error: 'Job not found',
        message: 'Job does not exist'
      });
    }

    if (job.status === 'CANCELLED') {
      return res.status(400).json({
        error: 'Job already cancelled',
        message: 'This job is already cancelled'
      });
    }

    // Update job status
    await job.update({ 
      status: 'CANCELLED',
      notes: job.notes ? `${job.notes}\n\nCancelled: ${reason}` : `Cancelled: ${reason}`
    });

    // Cancel all pending assignments
    await JobAssignment.update(
      { 
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason: reason
      },
      { 
        where: { 
          jobId: job.id,
          status: ['PENDING', 'ACCEPTED']
        }
      }
    );

    // Notify other accepted candidates they were not selected
    try {
      const others = await JobAssignment.findAll({
        where: { jobId: jobId, status: 'REJECTED' },
        include: [{ model: User, as: 'user', attributes: ['id','role'] }]
      });
      const job = await Job.findByPk(jobId);
      const notifications = others.map(o => ({
        userId: String(o.user.id),
        userType: (o.user.role || '').toLowerCase(),
        placeholders: { jobTitle: job?.title || '' }
      }));
      if (notifications.length > 0) {
        await sendNotifications('CandidateRejected_AfterSelection', notifications);
      }
    } catch (e) {}

    // Notify assigned staff about cancellation
    try {
      const assignments = await JobAssignment.findAll({ where: { jobId: job.id }, include: [{ model: User, as: 'user', attributes: ['id','role'] }] });
      const notifications = assignments
        .filter(a => ['PENDING','ACCEPTED','IN_PROGRESS','ASSIGNED'].includes(a.status))
        .map(a => ({
          userId: String(a.user.id),
          userType: (a.user.role || '').toLowerCase(),
          placeholders: { jobTitle: job.title, reason: reason || 'No reason provided' }
        }));
      if (notifications.length > 0) {
        await sendNotifications('JobCancelled_AssignedStaff', notifications);
      }
    } catch (e) {}

    // Notify job creator
    try {
      if (job.createdBy) {
        const creator = await User.findByPk(job.createdBy);
        if (creator) {
          await sendNotifications('JobCancelled_Creator', [{
            userId: String(creator.id),
            userType: (creator.role || 'hr').toLowerCase(),
            placeholders: { jobTitle: job.title, reason: reason || 'No reason provided' }
          }]);
        }
      }
    } catch (e) {}

    res.json({
      message: 'Job cancelled successfully',
      job
    });
  } catch (error) {
    console.error('Job cancellation error:', error);
    res.status(500).json({
      error: 'Failed to cancel job',
      message: error.message
    });
  }
});

// Assign job to user
router.post('/jobs/:id/assign', validate(schemas.jobAssignment), async (req, res) => {
  try {
    const { userId, hourlyRate, notes } = req.body;
    const jobId = req.params.id;

    // Check if job exists
    const job = await Job.findByPk(jobId);
    if (!job) {
      return res.status(404).json({
        error: 'Job not found',
        message: 'Job does not exist'
      });
    }

    // Check if user exists and has correct role
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User does not exist'
      });
    }

    if (user.role !== job.requiredRole) {
      return res.status(400).json({
        error: 'Role mismatch',
        message: `User role (${user.role}) does not match job requirement (${job.requiredRole})`
      });
    }

    // Check department compatibility
    if (user.department !== job.department) {
      return res.status(400).json({
        error: 'Department mismatch',
        message: `User department (${user.department}) does not match job department (${job.department})`
      });
    }

    // Check specialization compatibility (only for doctors)
    if (job.requiredRole === 'DOCTOR' && user.specialization !== job.specialization) {
      return res.status(400).json({
        error: 'Specialization mismatch',
        message: `User specialization (${user.specialization}) does not match job specialization (${job.specialization})`
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(400).json({
        error: 'User inactive',
        message: 'Cannot assign job to inactive user'
      });
    }

    // Check if already assigned
    const existingAssignment = await JobAssignment.findOne({
      where: { jobId, userId }
    });

    if (existingAssignment) {
      return res.status(400).json({
        error: 'Already assigned',
        message: 'User is already assigned to this job'
      });
    }

    // Check max assignments
    const currentAssignments = await JobAssignment.count({
      where: { jobId, status: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'] }
    });

    if (currentAssignments >= job.maxAssignments) {
      return res.status(400).json({
        error: 'Maximum assignments reached',
        message: 'This job has reached its maximum number of assignments'
      });
    }

    // Create assignment
    const assignment = await JobAssignment.create({
      jobId,
      userId,
      assignedBy: req.userId,
      createdAt: new Date(),
      hourlyRate: hourlyRate || job.hourlyRate,
      notes,
      isDirectAssignment: true
    });

    // Job status remains ACTIVE until doctor starts working
    // The assignment status (PENDING, ACCEPTED, etc.) is tracked separately

    // Notify assigned user
    try {
      await sendNotifications('JobAssigned_AssignedUser', [{
        userId: String(user.id),
        userType: (user.role || '').toLowerCase(),
        placeholders: { jobTitle: job.title, startDate: formatHuman(job.startDate), location: job.location }
      }]);
    } catch (e) {}

    // Notify assigner confirmation
    try {
      const assigner = await User.findByPk(req.userId);
      if (assigner) {
        await sendNotifications('JobAssigned_ConfToAssigner', [{
          userId: String(assigner.id),
          userType: (assigner.role || 'hr').toLowerCase(),
          placeholders: { assigneeName: `${user.firstName} ${user.lastName}` , jobTitle: job.title }
        }]);
      }
    } catch (e) {}

    res.status(201).json({
      message: 'Job assigned successfully',
      assignment
    });
  } catch (error) {
    console.error('Job assignment error:', error);
    res.status(500).json({
      error: 'Failed to assign job',
      message: error.message
    });
  }
});

// Get job assignments
router.get('/jobs/:id/assignments', async (req, res) => {
  try {
    const assignments = await JobAssignment.findAll({
      where: { jobId: req.params.id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'role']
        },
        {
          model: User,
          as: 'assigner',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: CheckIn,
          as: 'checkIns',
          order: [['checkInTime', 'DESC']]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ assignments });
  } catch (error) {
    console.error('Get assignments error:', error);
    res.status(500).json({
      error: 'Failed to fetch assignments',
      message: error.message
    });
  }
});

// Get assignment by ID (HR can access any assignment)
router.get('/assignments/:id', async (req, res) => {
  try {
    const assignmentId = req.params.id;

    const assignment = await JobAssignment.findByPk(assignmentId, {
      include: [
        {
          model: Job,
          as: 'job',
          attributes: ['id', 'title', 'description', 'department', 'location', 'requiredRole', 'specialization', 'startDate', 'endDate', 'startTime', 'endTime', 'hourlyRate', 'status', 'priority', 'maxAssignments', 'facilityName', 'facilityAddress', 'hospitalId', 'unitCode', 'createdBy']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'role', 'department', 'specialization', 'location']
        },
        {
          model: User,
          as: 'assigner',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: CheckIn,
          as: 'checkIns',
          order: [['checkInTime', 'DESC']]
        }
      ]
    });

    if (!assignment) {
      return res.status(404).json({
        error: 'Assignment not found',
        message: 'Assignment does not exist'
      });
    }

    res.json({ assignment });
  } catch (error) {
    console.error('Get assignment error:', error);
    res.status(500).json({
      error: 'Failed to fetch assignment',
      message: error.message
    });
  }
});

// Get job status summary
router.get('/jobs/:id/status', async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.id);
    if (!job) {
      return res.status(404).json({
        error: 'Job not found',
        message: 'Job does not exist'
      });
    }

    const assignments = await JobAssignment.findAll({
      where: { jobId: job.id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    const statusSummary = {
      totalAssignments: assignments.length,
      pending: assignments.filter(a => a.status === 'PENDING').length,
      accepted: assignments.filter(a => a.status === 'ACCEPTED').length,
      inProgress: assignments.filter(a => a.status === 'IN_PROGRESS').length,
      completed: assignments.filter(a => a.status === 'COMPLETED').length,
      cancelled: assignments.filter(a => a.status === 'CANCELLED').length,
      assignments: assignments.map(a => ({
        id: a.id,
        user: a.user,
        status: a.status,
        assignedAt: a.createdAt,
        acceptedAt: a.createdAt,
        totalHours: a.totalHours,
        totalPayment: a.totalPayment
      }))
    };

    res.json({ statusSummary });
  } catch (error) {
    console.error('Get job status error:', error);
    res.status(500).json({
      error: 'Failed to fetch job status',
      message: error.message
    });
  }
});

// Get dashboard statistics
router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Job statistics
    const totalJobs = await Job.count();
    const activeJobs = await Job.count({ where: { status: 'ACTIVE' } });
    const assignedJobs = await Job.count({ where: { status: 'ASSIGNED' } });
    const inProgressJobs = await Job.count({ where: { status: 'IN_PROGRESS' } });
    const completedJobs = await Job.count({ where: { status: 'COMPLETED' } });
    const cancelledJobs = await Job.count({ where: { status: 'CANCELLED' } });

    // Assignment statistics
    const totalAssignments = await JobAssignment.count();
    const pendingAssignments = await JobAssignment.count({ where: { status: 'PENDING' } });
    const acceptedAssignments = await JobAssignment.count({ where: { status: 'ACCEPTED' } });
    const assignedAssignments = await JobAssignment.count({ where: { status: 'ASSIGNED' } });
    const inProgressAssignments = await JobAssignment.count({ where: { status: 'IN_PROGRESS' } });
    const completedAssignments = await JobAssignment.count({ where: { status: 'COMPLETED' } });

    // Staff statistics
    const totalDoctors = await User.count({ where: { role: 'DOCTOR', isActive: true } });
    const totalNurses = await User.count({ where: { role: 'NURSE', isActive: true } });
    const totalStaff = totalDoctors + totalNurses;

    // Monthly statistics
    const monthlyJobs = await Job.count({
      where: {
        createdAt: {
          [Op.between]: [startOfMonth, endOfMonth]
        }
      }
    });

    const monthlyAssignments = await JobAssignment.count({
      where: {
        createdAt: {
          [Op.between]: [startOfMonth, endOfMonth]
        }
      }
    });

    // Recent activities
    const recentJobs = await Job.findAll({
      limit: 5,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['firstName', 'lastName']
        }
      ]
    });

    const recentAssignments = await JobAssignment.findAll({
      limit: 5,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['firstName', 'lastName', 'role']
        },
        {
          model: Job,
          as: 'job',
          attributes: ['title', 'department', 'location']
        }
      ]
    });

    const dashboard = {
      jobs: {
        total: totalJobs,
        active: activeJobs,
        assigned: assignedJobs,
        inProgress: inProgressJobs,
        completed: completedJobs,
        cancelled: cancelledJobs
      },
      assignments: {
        total: totalAssignments,
        pending: pendingAssignments,
        accepted: acceptedAssignments,
        assigned: assignedAssignments,
        inProgress: inProgressAssignments,
        completed: completedAssignments
      },
      staff: {
        total: totalStaff,
        doctors: totalDoctors,
        nurses: totalNurses
      },
      monthly: {
        jobs: monthlyJobs,
        assignments: monthlyAssignments
      },
      recent: {
        jobs: recentJobs,
        assignments: recentAssignments
      }
    };

    res.json({ dashboard });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard data',
      message: error.message
    });
  }
});


// Get compatible staff for a job
router.get('/jobs/:id/compatible-staff', async (req, res) => {
  try {
    const jobId = req.params.id;
    const job = await Job.findByPk(jobId);
    
    if (!job) {
      return res.status(404).json({
        error: 'Job not found',
        message: 'Job does not exist'
      });
    }

    // Find all staff compatible with this job
    const whereClause = {
      role: job.requiredRole,
      department: job.department,
      isActive: true
    };
    
    // For doctors, also match specialization
    if (job.requiredRole === 'DOCTOR' && job.specialization) {
      whereClause.specialization = job.specialization;
    }
    
    const compatibleStaff = await User.findAll({
      where: whereClause,
      attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'department', 'specialization', 'location'],
      order: [['firstName', 'ASC']]
    });

    // Check which staff are already assigned to this job
    const existingAssignments = await JobAssignment.findAll({
      where: { jobId },
      attributes: ['userId', 'status']
    });

    const assignedUserIds = existingAssignments.map(a => a.userId);
    const assignmentStatuses = {};
    existingAssignments.forEach(a => {
      assignmentStatuses[a.userId] = a.status;
    });

    // Add assignment status to each staff member
    const staffWithStatus = compatibleStaff.map(staff => ({
      ...staff.toJSON(),
      isAssigned: assignedUserIds.includes(staff.id),
      assignmentStatus: assignmentStatuses[staff.id] || null
    }));

    res.json({
      job: {
        id: job.id,
        title: job.title,
        department: job.department,
        specialization: job.specialization,
        requiredRole: job.requiredRole
      },
      compatibleStaff: staffWithStatus,
      totalCompatible: staffWithStatus.length,
      available: staffWithStatus.filter(s => !s.isAssigned).length,
      assigned: staffWithStatus.filter(s => s.isAssigned).length
    });
  } catch (error) {
    console.error('Get compatible staff error:', error);
    res.status(500).json({
      error: 'Failed to get compatible staff',
      message: error.message
    });
  }
});

  // Minimal payout report
  router.get('/reports/payout', async (req, res) => {
    try {
      const { startDate, endDate, userId, jobId } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          error: 'Missing required parameters',
          message: 'startDate and endDate are required (YYYY-MM-DD)'
        });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      // Include entire end day
      end.setHours(23, 59, 59, 999);

      // Fetch jobs in period (by job startDate overlap) with assignments and check-ins
      const jobs = await Job.findAll({
        where: {
          startDate: { [Op.lte]: end },
          endDate: { [Op.gte]: start },
          ...(jobId ? { id: jobId } : {})
        },
        attributes: ['id', 'title', 'hourlyRate', 'startDate', 'endDate'],
        include: [
          {
            model: JobAssignment,
            as: 'assignments',
            attributes: ['id', 'userId', 'createdAt'],
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['id', 'firstName', 'lastName']
              },
              {
                model: CheckIn,
                as: 'checkIns',
                attributes: ['id', 'checkInTime', 'checkOutTime']
              }
            ],
            ...(userId ? { where: { userId } } : {})
          }
        ],
        order: [['id', 'ASC']]
      });

      const lines = [];

      for (const job of jobs) {
        for (const assignment of job.assignments || []) {
          const validCheckIns = (assignment.checkIns || []).filter(ci => ci.checkInTime && ci.checkOutTime);

          // Consider only check-ins that intersect the requested range
          const inRange = validCheckIns.filter(ci => {
            const ciStart = new Date(ci.checkInTime);
            const ciEnd = new Date(ci.checkOutTime);
            return ciEnd >= start && ciStart <= end;
          });

          if (inRange.length === 0) continue;

          // Sum minutes of intersection with range
          let minutesWorked = 0;
          for (const ci of inRange) {
            const ciStart = new Date(ci.checkInTime);
            const ciEnd = new Date(ci.checkOutTime);
            const segStart = ciStart < start ? start : ciStart;
            const segEnd = ciEnd > end ? end : ciEnd;
            const diffMs = segEnd - segStart;
            if (diffMs > 0) minutesWorked += Math.floor(diffMs / 60000);
          }

          if (minutesWorked <= 0) continue;

          const hoursWorked = minutesWorked / 60;
          const hourlyRate = Number(job.hourlyRate) || 0;
          const amount = Number((hoursWorked * hourlyRate).toFixed(2));

          const shiftDates = Array.from(new Set(inRange.map(ci => new Date(ci.checkInTime).toISOString().slice(0, 10))));

          lines.push({
            jobId: job.id,
            jobTitle: job.title,
            assignmentId: assignment.id,
            userId: assignment.user?.id,
            staffName: assignment.user ? `${assignment.user.firstName} ${assignment.user.lastName}` : '',
            shiftDates,
            minutesWorked,
            hoursWorked,
            hourlyRate,
            amount
          });
        }
      }

      // Totals by user and grand total
      const totalsByUser = {};
      let grandTotal = 0;
      for (const line of lines) {
        grandTotal += line.amount;
        const key = String(line.userId || 'unknown');
        if (!totalsByUser[key]) {
          totalsByUser[key] = {
            userId: line.userId,
            staffName: line.staffName,
            amount: 0
          };
        }
        totalsByUser[key].amount = Number((totalsByUser[key].amount + line.amount).toFixed(2));
      }

      res.json({
        period: { startDate, endDate },
        filters: { userId: userId || null, jobId: jobId || null },
        lines,
        totals: {
          byUser: Object.values(totalsByUser),
          grandTotal: Number(grandTotal.toFixed(2))
        }
      });
    } catch (error) {
      console.error('Payout report error:', error);
      res.status(500).json({
        error: 'Failed to generate payout report',
        message: error.message
      });
    }
  });

module.exports = router;
