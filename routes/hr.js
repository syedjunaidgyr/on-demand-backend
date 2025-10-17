const express = require('express');
const { Op } = require('sequelize');
const { User, Job, JobAssignment, CheckIn } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

const router = express.Router();

// Apply authentication and HR authorization to all routes
router.use(authenticate);
router.use(authorize('HR', 'ADMIN'));

// Get all users (HR can view all staff)
router.get('/users', validate(schemas.pagination, 'query'), async (req, res) => {
  try {
    const { page, limit, sortBy = 'createdAt', sortOrder = 'DESC' } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows: users } = await User.findAndCountAll({
      attributes: { exclude: ['password'] },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder]],
      where: {
        role: {
          [Op.in]: ['DOCTOR', 'NURSE']
        }
      }
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

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Failed to fetch user',
      message: error.message
    });
  }
});

// Create new job posting
router.post('/jobs', validate(schemas.jobCreation), async (req, res) => {
  try {
    const jobData = {
      ...req.body,
      createdBy: req.userId
    };

    const job = await Job.create(jobData);

    res.status(201).json({
      message: 'Job posted successfully',
      job
    });
  } catch (error) {
    console.error('Job creation error:', error);
    res.status(500).json({
      error: 'Failed to create job',
      message: error.message
    });
  }
});

// Get all jobs with filters
router.get('/jobs', validate(schemas.pagination, 'query'), async (req, res) => {
  try {
    const { 
      page, 
      limit, 
      sortBy = 'createdAt', 
      sortOrder = 'DESC',
      department,
      location,
      requiredRole,
      status,
      priority,
      startDate,
      endDate,
      minRate,
      maxRate
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {};

    // Apply filters
    if (department) whereClause.department = department;
    if (location) whereClause.location = { [Op.like]: `%${location}%` };
    if (requiredRole) whereClause.requiredRole = requiredRole;
    if (status) whereClause.status = status;
    if (priority) whereClause.priority = priority;
    if (startDate) whereClause.startDate = { [Op.gte]: startDate };
    if (endDate) whereClause.endDate = { [Op.lte]: endDate };
    if (minRate) whereClause.hourlyRate = { [Op.gte]: minRate };
    if (maxRate) whereClause.hourlyRate = { ...whereClause.hourlyRate, [Op.lte]: maxRate };

    const { count, rows: jobs } = await Job.findAndCountAll({
      where: whereClause,
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
              attributes: ['id', 'firstName', 'lastName', 'email', 'role']
            }
          ]
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder]]
    });

    res.json({
      jobs,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
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
      assignedAt: new Date(),
      hourlyRate: hourlyRate || job.hourlyRate,
      notes,
      isDirectAssignment: true
    });

    // Job status remains ACTIVE until doctor starts working
    // The assignment status (PENDING, ACCEPTED, etc.) is tracked separately

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
      order: [['assignedAt', 'DESC']]
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
        assignedAt: a.assignedAt,
        acceptedAt: a.acceptedAt,
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
      order: [['assignedAt', 'DESC']],
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

module.exports = router;
