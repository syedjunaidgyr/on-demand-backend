const express = require('express');
const { Op } = require('sequelize');
const { User, Job, JobAssignment, CheckIn, Hospital } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { sendNotifications, formatHuman } = require('../utils/notifications');
const { isStaffCompatibleWithJob } = require('../utils/helpers');
const { isCheckInAllowed } = require('../utils/dateTimeHelpers');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Get upcoming jobs for staff (today and tomorrow)
router.get('/jobs/upcoming', async (req, res) => {
  try {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfTomorrow = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 23, 59, 59);

    const upcomingJobs = await Job.findAll({
      where: {
        status: 'ACTIVE',
        startDate: {
          [Op.between]: [startOfToday, endOfTomorrow]
        },
        requiredRole: req.user.role
      },
      include: [
        {
          model: Hospital,
          as: 'hospital',
          attributes: ['name', 'address', 'contactInfo']
        }
      ],
      order: [['startDate', 'ASC'], ['startTime', 'ASC']],
      limit: 20
    });

    res.json(upcomingJobs);
  } catch (error) {
    console.error('Error fetching upcoming jobs:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming jobs' });
  }
});

// Get available jobs for staff (doctors and nurses)
router.get('/jobs/available', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      sortBy = 'startDate', 
      sortOrder = 'ASC',
      department,
      location,
      specialization,
      startDate,
      endDate,
      minRate,
      maxRate
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {
      requiredRole: req.user.role, // Filter by user's role (DOCTOR or NURSE)
      department: req.user.department, // Filter by user's department
      status: 'ACTIVE',
      startDate: {
        [Op.gte]: new Date() // Only future jobs
      }
    };
    // Exclude agency-created jobs from staff listings
    whereClause['$creator.role$'] = { [Op.ne]: 'AGENCY' };
    
    // For doctors, also filter by specialization
    if (req.user.role === 'DOCTOR' && req.user.specialization) {
      whereClause.specialization = req.user.specialization;
    }

    // Get user's hospital and unit preferences
    const user = await User.findByPk(req.userId, {
      attributes: ['hospitalId', 'unitCode', 'preferredHospitals']
    });

    // Filter by hospital - user can see jobs from their hospital or preferred hospitals
    const allowedHospitalIds = [];
    if (user.hospitalId) {
      allowedHospitalIds.push(user.hospitalId);
    }
    if (user.preferredHospitals && user.preferredHospitals.length > 0) {
      allowedHospitalIds.push(...user.preferredHospitals);
    }
    
    if (allowedHospitalIds.length > 0) {
      whereClause.hospitalId = { [Op.in]: [...new Set(allowedHospitalIds)] }; // Remove duplicates
    }

    // Note: We don't filter by unit code to allow staff to see jobs in different units
    // within their assigned/preferred hospitals

    // Apply additional filters
    if (department) whereClause.department = department;
    if (location) whereClause.location = { [Op.like]: `%${location}%` };
    if (specialization) whereClause.specialization = { [Op.like]: `%${specialization}%` };
    if (startDate) whereClause.startDate = { [Op.gte]: startDate };
    if (endDate) whereClause.endDate = { [Op.lte]: endDate };
    if (minRate) whereClause.hourlyRate = { [Op.gte]: minRate };
    if (maxRate) whereClause.hourlyRate = { ...whereClause.hourlyRate, [Op.lte]: maxRate };

    // Exclude jobs where user is currently working (IN_PROGRESS) or has completed (COMPLETED)
    // Allow users to see jobs they've ACCEPTED, PENDING, or CANCELLED (can apply for multiple jobs)
    const userAssignments = await JobAssignment.findAll({
      where: { 
        userId: req.userId,
        status: ['IN_PROGRESS', 'COMPLETED']
      },
      attributes: ['jobId']
    });
    const assignedJobIds = userAssignments.map(a => a.jobId);
    if (assignedJobIds.length > 0) {
      whereClause.id = { [Op.notIn]: assignedJobIds };
    }

    const { count, rows: jobs } = await Job.findAndCountAll({
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
          attributes: ['id', 'firstName', 'lastName', 'email', 'role']
        },
        {
          model: Hospital,
          as: 'hospital',
          attributes: ['id', 'name', 'code', 'address']
        },
        {
          model: JobAssignment,
          as: 'assignments',
          attributes: ['id', 'status', 'createdAt'],
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['firstName', 'lastName']
            }
          ]
        }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Transform jobs to include currentAssignments count
    const transformedJobs = jobs.map(job => {
      const jobData = job.toJSON();
      const currentAssignments = jobData.assignments.filter(assignment => 
        ['ACCEPTED', 'ASSIGNED', 'IN_PROGRESS'].includes(assignment.status)
      ).length;
      
      return {
        ...jobData,
        currentAssignments
      };
    });

    res.json({
      jobs: transformedJobs,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get available jobs error:', error);
    res.status(500).json({
      error: 'Failed to fetch available jobs',
      message: error.message
    });
  }
});

// Get job details by ID for staff
router.get('/jobs/:id', async (req, res) => {
  try {
    const jobId = req.params.id;
    
    const job = await Job.findByPk(jobId, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Hospital,
          as: 'hospital',
          attributes: ['id', 'name', 'code', 'address']
        },
        {
          model: JobAssignment,
          as: 'assignments',
          attributes: ['id', 'status', 'createdAt', 'acceptedAt', 'rejectedAt'],
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['firstName', 'lastName']
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

    // Check if job is compatible with user's profile
    const isCompatible = job.requiredRole === req.user.role && 
                        job.department === req.user.department &&
                        (job.requiredRole !== 'DOCTOR' || job.specialization === req.user.specialization);

    res.json({
      job,
      isCompatible,
      userRole: req.user.role,
      userDepartment: req.user.department,
      userSpecialization: req.user.specialization
    });
  } catch (error) {
    console.error('Get job details error:', error);
    res.status(500).json({
      error: 'Failed to fetch job details',
      message: error.message
    });
  }
});

// Get user's job assignments
// Get all assignments (returns ALL assignments without pagination)
router.get('/assignments', async (req, res) => {
  try {
    const { 
      status,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const whereClause = { userId: req.userId };

    if (status) {
      whereClause.status = status;
    }

    const assignments = await JobAssignment.findAll({
      where: whereClause,
      include: [
        {
          model: Job,
          as: 'job',
          // Include all job fields - no attributes restriction
          include: [
            {
              model: Hospital,
              as: 'hospital',
              attributes: ['id', 'name', 'code', 'address']
            },
            {
              model: User,
              as: 'creator',
              attributes: ['id', 'firstName', 'lastName', 'email']
            }
          ]
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
    console.error('Get assignments error:', error);
    res.status(500).json({
      error: 'Failed to fetch assignments',
      message: error.message
    });
  }
});

// Get assignment by ID
router.get('/assignments/:id', async (req, res) => {
  try {
    const assignmentId = req.params.id;

    const assignment = await JobAssignment.findOne({
      where: { 
        id: assignmentId,
        userId: req.userId // Ensure user can only access their own assignments
      },
      include: [
        {
          model: Job,
          as: 'job',
          attributes: ['id', 'title', 'description', 'department', 'location', 'requiredRole', 'specialization', 'startDate', 'endDate', 'startTime', 'endTime', 'hourlyRate', 'status', 'priority', 'maxAssignments', 'facilityName', 'facilityAddress', 'hospitalId', 'unitCode']
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
          order: [['checkInTime', 'DESC']]
        }
      ]
    });

    if (!assignment) {
      return res.status(404).json({
        error: 'Assignment not found',
        message: 'Assignment does not exist or you do not have access to it'
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

// Accept or reject job assignment
router.post('/assignments/:id/respond', validate(schemas.jobAcceptance), async (req, res) => {
  try {
    const { action, rejectionReason } = req.body;
    const assignmentId = req.params.id;

    console.log('🔍 DEBUG: Assignment response request:', {
      assignmentId,
      userId: req.userId,
      action,
      rejectionReason
    });

    const assignment = await JobAssignment.findOne({
      where: { 
        id: assignmentId, 
        userId: req.userId,
        status: 'PENDING'
      },
      include: [
        {
          model: Job,
          as: 'job',
          attributes: ['id', 'title', 'startDate', 'endDate', 'startTime', 'endTime']
        }
      ]
    });

    console.log('🔍 DEBUG: Assignment found:', assignment ? {
      id: assignment.id,
      jobId: assignment.jobId,
      userId: assignment.userId,
      status: assignment.status,
      jobTitle: assignment.job?.title
    } : 'No assignment found');

    if (!assignment) {
      // Let's check if assignment exists but with different status
      const anyAssignment = await JobAssignment.findOne({
        where: { 
          id: assignmentId, 
          userId: req.userId
        }
      });
      
      console.log('🔍 DEBUG: Any assignment found:', anyAssignment ? {
        id: anyAssignment.id,
        status: anyAssignment.status
      } : 'No assignment found at all');

      return res.status(404).json({
        error: 'Assignment not found',
        message: 'Assignment does not exist or is not pending'
      });
    }

    if (action === 'ACCEPT') {
      // Accept the assignment
      await assignment.update({ 
        status: 'ACCEPTED',
        acceptedAt: new Date()
      });

      // Confirm to staff
      try {
      await sendNotifications('AssignmentAccepted_ConfirmUser', [{
          userId: String(req.userId),
          userType: (req.user.role || '').toLowerCase(),
          placeholders: { jobTitle: assignment.job.title }
        }]);
      } catch (e) {}

      // Notify assigner (HR)
      try {
        const assigner = await JobAssignment.findByPk(assignment.id, { include: [{ model: User, as: 'assigner', attributes: ['id','role'] }, { model: Job, as: 'job', attributes: ['title'] }] });
        if (assigner?.assigner) {
          const currentUser = await User.findByPk(req.userId);
          await sendNotifications('AssignmentAccepted_NotifyHR', [{
            userId: String(assigner.assigner.id),
            userType: (assigner.assigner.role || 'hr').toLowerCase(),
            placeholders: { staffName: `${currentUser.firstName} ${currentUser.lastName}`, jobTitle: assigner.job.title }
          }]);
        }
      } catch (e) {}

      res.json({
        message: 'Job assignment accepted successfully. HR will review and assign the final candidate.',
        assignment
      });
    } else if (action === 'REJECT') {
      await assignment.update({ 
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectionReason
      });

      // Confirm to staff
      try {
      await sendNotifications('AssignmentRejected_ConfirmUser', [{
          userId: String(req.userId),
          userType: (req.user.role || '').toLowerCase(),
          placeholders: { jobTitle: assignment.job.title, rejectionReason: rejectionReason || '' }
        }]);
      } catch (e) {}

      // Notify assigner (HR)
      try {
        const assigner = await JobAssignment.findByPk(assignment.id, { include: [{ model: User, as: 'assigner', attributes: ['id','role'] }, { model: Job, as: 'job', attributes: ['title'] }] });
        if (assigner?.assigner) {
          const currentUser = await User.findByPk(req.userId);
          await sendNotifications('AssignmentRejected_NotifyHR', [{
            userId: String(assigner.assigner.id),
            userType: (assigner.assigner.role || 'hr').toLowerCase(),
            placeholders: { staffName: `${currentUser.firstName} ${currentUser.lastName}`, jobTitle: assigner.job.title, rejectionReason: rejectionReason || '' }
          }]);
        }
      } catch (e) {}

      res.json({
        message: 'Job assignment rejected successfully',
        assignment
      });
    }
  } catch (error) {
    console.error('Respond to assignment error:', error);
    res.status(500).json({
      error: 'Failed to respond to assignment',
      message: error.message
    });
  }
});

// Get current active assignments
router.get('/assignments/active', async (req, res) => {
  try {
    const activeAssignments = await JobAssignment.findAll({
      where: { 
        userId: req.userId,
        status: ['ASSIGNED', 'IN_PROGRESS']
      },
      include: [
        {
          model: Job,
          as: 'job',
          attributes: ['id', 'title', 'department', 'location', 'startDate', 'endDate', 'startTime', 'endTime', 'facilityName', 'facilityAddress']
        }
      ]
    });

    res.json({ assignments: activeAssignments });
  } catch (error) {
    console.error('Get active assignments error:', error);
    res.status(500).json({
      error: 'Failed to fetch active assignments',
      message: error.message
    });
  }
});

// Check in for job
router.post('/check-in', validate(schemas.checkIn), async (req, res) => {
  try {
    const { jobAssignmentId, location, notes } = req.body;
    
    console.log('🔍 DEBUG: Check-in request:', {
      jobAssignmentId,
      location,
      notes,
      userId: req.userId
    });

    // Verify assignment belongs to user and is eligible (ASSIGNED or ACCEPTED)
    const assignment = await JobAssignment.findOne({
      where: { 
        id: jobAssignmentId, 
        userId: req.userId,
        status: ['ASSIGNED', 'ACCEPTED']
      },
      include: [
        {
          model: Job,
          as: 'job',
          attributes: ['id', 'title', 'status', 'startDate', 'endDate', 'startTime', 'endTime', 'facilityName', 'location', 'facilityAddress', 'department', 'specialization']
        }
      ]
    });

    if (!assignment) {
      console.log('🔍 DEBUG: Assignment not found for check-in:', {
        jobAssignmentId,
        userId: req.userId,
        status: 'ASSIGNED'
      });
      return res.status(404).json({
        error: 'Assignment not found',
        message: 'Assignment does not exist or is not assigned by HR'
      });
    }

    // Job status validation removed - allow check-in for any job status

    // Check if it's time to check in (job should be starting soon or has started)
    // TODO: Temporarily disabled for testing - allow check-in at any time
    // const checkInResult = isCheckInAllowed(assignment.job.startDate, assignment.job.startTime, 2);
    
    // if (!checkInResult.isAllowed) {
    //   console.log('🔍 DEBUG: Too early to check in:', {
    //     hoursUntilStart: checkInResult.hoursUntilStart,
    //     jobStartTime: checkInResult.jobStartDateTime,
    //     currentTime: checkInResult.currentTime
    //   });
    //   return res.status(400).json({
    //     error: 'Too early to check in',
    //     message: checkInResult.message
    //   });
    // }

    // Check if already checked in
    const existingCheckIn = await CheckIn.findOne({
      where: { 
        jobAssignmentId,
        userId: req.userId,
        status: 'CHECKED_IN'
      }
    });

    if (existingCheckIn) {
      return res.status(400).json({
        error: 'Already checked in',
        message: 'You are already checked in for this assignment'
      });
    }

    // Get user information for storing in check-in data
    const user = await User.findByPk(req.userId, {
      attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'department']
    });

    // Create check-in with facility information from job and user information
    const checkIn = await CheckIn.create({
      jobAssignmentId,
      userId: req.userId,
      checkInTime: new Date(),
      checkInLocation: {
        // User information
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        userEmail: user.email,
        userRole: user.role,
        userDepartment: user.department,
        // Facility information
        facilityName: assignment.job.facilityName,
        location: assignment.job.location,
        facilityAddress: assignment.job.facilityAddress,
        department: assignment.job.department,
        specialization: assignment.job.specialization,
        jobTitle: assignment.job.title,
        userLocation: location // Keep user's GPS location if provided
      },
      status: 'CHECKED_IN',
      // approvalStatus defaults to PENDING by model definition
      notes
    });

    // Do NOT update assignment status here. It will be flipped to IN_PROGRESS upon approval by HR/Admin.

    // Confirm to staff
    try {
      await sendNotifications('CheckIn_ConfirmUser', [{
        userId: String(req.userId),
        userType: (req.user.role || '').toLowerCase(),
        placeholders: { jobTitle: assignment.job.title, checkInTime: formatHuman(checkIn.checkInTime) }
      }]);
    } catch (e) {}

    // Notify assigner (HR) about check-in
    try {
      const assignmentWithAssigner = await JobAssignment.findByPk(jobAssignmentId, { include: [{ model: User, as: 'assigner', attributes: ['id','role'] }] });
      if (assignmentWithAssigner?.assigner) {
        await sendNotifications('CheckIn_NotifyHR', [{
          userId: String(assignmentWithAssigner.assigner.id),
          userType: (assignmentWithAssigner.assigner.role || 'hr').toLowerCase(),
          placeholders: { staffName: `${user.firstName} ${user.lastName}`, jobTitle: assignment.job.title, checkInTime: formatHuman(checkIn.checkInTime) }
        }]);
      }
    } catch (e) {}

    res.status(201).json({
      message: 'Check-in submitted',
      checkIn,
      userInfo: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        department: user.department
      },
      jobContext: {
        facilityName: assignment.job.facilityName,
        location: assignment.job.location,
        department: assignment.job.department,
        specialization: assignment.job.specialization,
        jobTitle: assignment.job.title,
        facilityAddress: assignment.job.facilityAddress
      }
    });
  } catch (error) {
    console.error('🔍 DEBUG: Check in error:', error);
    console.error('🔍 DEBUG: Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({
      error: 'Failed to check in',
      message: error.message
    });
  }
});

// Check out from job
router.post('/check-out', validate(schemas.checkOut), async (req, res) => {
  try {
    const { jobAssignmentId, location, notes } = req.body;

    // Find active check-in
    const checkIn = await CheckIn.findOne({
      where: { 
        jobAssignmentId,
        userId: req.userId,
        status: 'CHECKED_IN'
      }
    });

    if (!checkIn) {
      return res.status(404).json({
        error: 'Check-in not found',
        message: 'You are not currently checked in'
      });
    }

    // Verify latest check-in is APPROVED
    const latestCheckIn = await CheckIn.findOne({
      where: { jobAssignmentId, userId: req.userId },
      order: [['checkInTime', 'DESC']]
    });

    if (!latestCheckIn || latestCheckIn.approvalStatus !== 'APPROVED') {
      return res.status(409).json({
        error: 'Pending approval',
        message: 'Checkout requires an approved check-in.'
      });
    }

    // Verify assignment is in IN_PROGRESS status
    const assignment = await JobAssignment.findOne({
      where: { 
        id: jobAssignmentId, 
        userId: req.userId,
        status: 'IN_PROGRESS'
      },
      include: [
        {
          model: Job,
          as: 'job',
          attributes: ['id', 'title', 'facilityName', 'location', 'facilityAddress', 'department', 'specialization']
        }
      ]
    });

    if (!assignment) {
      return res.status(400).json({
        error: 'Invalid assignment status',
        message: 'Cannot check out. Assignment is not in progress.'
      });
    }

    const checkOutTime = new Date();
    const workTime = Math.round((checkOutTime - checkIn.checkInTime) / (1000 * 60)); // minutes

    // Get user information for storing in check-out data
    const userForCheckOut = await User.findByPk(req.userId, {
      attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'department']
    });

    await checkIn.update({
      checkOutTime,
      checkOutLocation: {
        // User information
        userId: userForCheckOut.id,
        userName: `${userForCheckOut.firstName} ${userForCheckOut.lastName}`,
        userEmail: userForCheckOut.email,
        userRole: userForCheckOut.role,
        userDepartment: userForCheckOut.department,
        // Facility information
        facilityName: assignment.job.facilityName,
        location: assignment.job.location,
        facilityAddress: assignment.job.facilityAddress,
        department: assignment.job.department,
        specialization: assignment.job.specialization,
        jobTitle: assignment.job.title,
        userLocation: location // Keep user's GPS location if provided
      },
      status: 'CHECKED_OUT',
      totalWorkTime: workTime,
      notes: notes || checkIn.notes
    });

    // Update assignment (we already have it from validation above)
    await assignment.update({
      status: 'COMPLETED',
      completedAt: checkOutTime,
      actualEndTime: checkOutTime
    });

    // Confirm to staff
    try {
      await sendNotifications('CheckOut_ConfirmUser', [{
        userId: String(req.userId),
        userType: (req.user.role || '').toLowerCase(),
        placeholders: { jobTitle: assignment.job.title, checkOutTime: formatHuman(checkOutTime), totalWorkTime: String(workTime) }
      }]);
    } catch (e) {}

    // Notify assigner (HR) about check-out
    try {
      const assignmentWithAssigner = await JobAssignment.findByPk(jobAssignmentId, { include: [{ model: User, as: 'assigner', attributes: ['id','role'] }] });
      if (assignmentWithAssigner?.assigner) {
        await sendNotifications('CheckOut_NotifyHR', [{
          userId: String(assignmentWithAssigner.assigner.id),
          userType: (assignmentWithAssigner.assigner.role || 'hr').toLowerCase(),
          placeholders: { staffName: `${userForCheckOut.firstName} ${userForCheckOut.lastName}`, jobTitle: assignment.job.title, checkOutTime: formatHuman(checkOutTime), totalWorkTime: String(workTime) }
        }]);
      }
    } catch (e) {}

    res.json({
      message: 'Checked out successfully',
      checkIn,
      workTime: workTime,
      userInfo: {
        id: userForCheckOut.id,
        firstName: userForCheckOut.firstName,
        lastName: userForCheckOut.lastName,
        email: userForCheckOut.email,
        role: userForCheckOut.role,
        department: userForCheckOut.department
      },
      jobContext: {
        facilityName: assignment.job.facilityName,
        location: assignment.job.location,
        department: assignment.job.department,
        specialization: assignment.job.specialization,
        jobTitle: assignment.job.title,
        facilityAddress: assignment.job.facilityAddress
      }
    });
  } catch (error) {
    console.error('Check out error:', error);
    res.status(500).json({
      error: 'Failed to check out',
      message: error.message
    });
  }
});

// Staff-safe: get latest check-in approval status for an assignment (owned by requesting user)
router.get('/assignments/:id/latest-checkin', async (req, res) => {
  try {
    const assignmentId = req.params.id;

    // Ensure assignment belongs to the user
    const assignment = await JobAssignment.findOne({
      where: { id: assignmentId, userId: req.userId },
      attributes: ['id', 'status']
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Not found', message: 'Assignment not found' });
    }

    const latest = await CheckIn.findOne({
      where: { jobAssignmentId: assignmentId, userId: req.userId },
      order: [['checkInTime', 'DESC']],
      attributes: ['id', 'approvalStatus', 'approvedBy', 'approvedAt', 'rejectionReason']
    });

    if (!latest) {
      // No check-in yet for this assignment by this user
      return res.json({
        jobAssignmentId: Number(assignmentId),
        checkInId: null,
        approvalStatus: 'pending',
        approvedBy: null,
        approvedAt: null,
        rejectionReason: null
      });
    }

    let normalized = typeof latest.approvalStatus === 'string'
      ? String(latest.approvalStatus).toLowerCase()
      : 'pending';
    if (!['pending', 'approved', 'rejected'].includes(normalized)) {
      normalized = 'pending';
    }

    return res.json({
      jobAssignmentId: Number(assignmentId),
      checkInId: latest.id,
      approvalStatus: normalized,
      approvedBy: latest.approvedBy || null,
      approvedAt: latest.approvedAt || null,
      rejectionReason: latest.rejectionReason || null
    });
  } catch (error) {
    console.error('Latest check-in status error:', error);
    res.status(500).json({ error: 'Failed to fetch check-in status', message: error.message });
  }
});

// Get work status and statistics
router.get('/status', async (req, res) => {
  try {
    const userId = req.userId;

    // Get user info
    const user = await User.findByPk(userId, {
      attributes: ['id', 'firstName', 'lastName', 'role', 'department', 'specialization']
    });

    // Get assignment statistics
    const totalAssignments = await JobAssignment.count({ where: { userId } });
    const activeAssignments = await JobAssignment.count({ 
      where: { userId, status: ['ACCEPTED', 'IN_PROGRESS'] } 
    });
    const completedAssignments = await JobAssignment.count({ 
      where: { userId, status: 'COMPLETED' } 
    });

    // Get current active assignments
    const currentAssignments = await JobAssignment.findAll({
      where: { 
        userId,
        status: ['ACCEPTED', 'IN_PROGRESS']
      },
      include: [
        {
          model: Job,
          as: 'job',
          attributes: ['id', 'title', 'department', 'location', 'startDate', 'endDate', 'startTime', 'endTime']
        }
      ]
    });

    // Get monthly earnings
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    endOfMonth.setHours(23, 59, 59, 999);

    const monthlyEarnings = await JobAssignment.findAll({
      where: { 
        userId,
        status: 'COMPLETED',
        completedAt: {
          [Op.between]: [startOfMonth, endOfMonth]
        }
      },
      attributes: ['totalHours', 'totalPayment']
    });

    const totalEarnings = monthlyEarnings.reduce((sum, assignment) => 
      sum + (parseFloat(assignment.totalPayment) || 0), 0
    );

    // Get today's check-ins
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayCheckIns = await CheckIn.findAll({
      where: { 
        userId,
        checkInTime: {
          [Op.between]: [today, tomorrow]
        }
      },
      include: [
        {
          model: JobAssignment,
          as: 'jobAssignment',
          include: [
            {
              model: Job,
              as: 'job',
              attributes: ['title', 'department', 'location']
            }
          ]
        }
      ]
    });

    res.json({
      user,
      statistics: {
        totalAssignments,
        activeAssignments,
        completedAssignments,
        monthlyEarnings: totalEarnings
      },
      currentAssignments,
      todayCheckIns
    });
  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({
      error: 'Failed to fetch status',
      message: error.message
    });
  }
});

// Request job extension
router.post('/assignments/:id/request-extension', validate(schemas.extensionRequest), async (req, res) => {
  try {
    const { reason, requestedHours } = req.body;
    const assignmentId = req.params.id;

    const assignment = await JobAssignment.findOne({
      where: { 
        id: assignmentId, 
        userId: req.userId,
        status: 'IN_PROGRESS'
      }
    });

    if (!assignment) {
      return res.status(404).json({
        error: 'Assignment not found',
        message: 'Assignment does not exist or is not in progress'
      });
    }

    await assignment.update({
      requestForExtension: true,
      extensionRequestReason: reason
    });

    // Confirm to staff
    try {
      await sendNotifications('ExtensionRequested_ConfirmUser', [{
        userId: String(req.userId),
        userType: (req.user.role || '').toLowerCase(),
        placeholders: { jobTitle: assignment.job?.title || '', requestedHours: String(requestedHours || ''), reason: reason || '' }
      }]);
    } catch (e) {}

    // Notify assigner (HR) about extension request
    try {
      const assignmentWithAssigner = await JobAssignment.findByPk(assignmentId, { include: [{ model: User, as: 'assigner', attributes: ['id','role'] }, { model: Job, as: 'job', attributes: ['title'] }] });
      const currentUser = await User.findByPk(req.userId);
      if (assignmentWithAssigner?.assigner) {
        await sendNotifications('ExtensionRequested_NotifyHR', [{
          userId: String(assignmentWithAssigner.assigner.id),
          userType: (assignmentWithAssigner.assigner.role || 'hr').toLowerCase(),
          placeholders: { staffName: `${currentUser.firstName} ${currentUser.lastName}`, jobTitle: assignmentWithAssigner.job.title, requestedHours: String(requestedHours || ''), reason: reason || '' }
        }]);
      }
    } catch (e) {}

    res.json({
      message: 'Extension request submitted successfully',
      assignment
    });
  } catch (error) {
    console.error('Request extension error:', error);
    res.status(500).json({
      error: 'Failed to request extension',
      message: error.message
    });
  }
});

module.exports = router;
