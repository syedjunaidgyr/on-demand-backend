const express = require('express');
const { Op } = require('sequelize');
const { User, Job, JobAssignment, CheckIn } = require('../models');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

const router = express.Router();

// Public job search (with optional authentication for personalized results)
router.get('/search', optionalAuth, validate(schemas.pagination, 'query'), async (req, res) => {
  try {
    const { 
      page, 
      limit, 
      sortBy = 'startDate', 
      sortOrder = 'ASC',
      department,
      location,
      requiredRole,
      specialization,
      startDate,
      endDate,
      minRate,
      maxRate,
      search
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {
      status: 'ACTIVE',
      startDate: {
        [Op.gte]: new Date() // Only future jobs
      }
    };

    // Apply filters
    if (department) whereClause.department = department;
    if (location) whereClause.location = { [Op.like]: `%${location}%` };
    if (requiredRole) whereClause.requiredRole = requiredRole;
    if (specialization) whereClause.specialization = { [Op.like]: `%${specialization}%` };
    if (startDate) whereClause.startDate = { [Op.gte]: startDate };
    if (endDate) whereClause.endDate = { [Op.lte]: endDate };
    if (minRate) whereClause.hourlyRate = { [Op.gte]: minRate };
    if (maxRate) whereClause.hourlyRate = { ...whereClause.hourlyRate, [Op.lte]: maxRate };

    // Search in title and description
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { department: { [Op.like]: `%${search}%` } },
        { location: { [Op.like]: `%${search}%` } }
      ];
    }

    // If user is authenticated, exclude their assigned jobs
    if (req.user) {
      const userAssignments = await JobAssignment.findAll({
        where: { userId: req.userId },
        attributes: ['jobId']
      });
      const assignedJobIds = userAssignments.map(a => a.jobId);
      if (assignedJobIds.length > 0) {
        whereClause.id = { [Op.notIn]: assignedJobIds };
      }
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
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: JobAssignment,
          as: 'assignments',
          attributes: ['id', 'status', 'assignedAt'],
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['firstName', 'lastName']
            }
          ]
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder]]
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
    console.error('Job search error:', error);
    res.status(500).json({
      error: 'Failed to search jobs',
      message: error.message
    });
  }
});

// Get job by ID (public)
router.get('/:id', optionalAuth, async (req, res) => {
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
          attributes: ['id', 'status', 'assignedAt'],
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

    // If user is authenticated, check if they're assigned to this job
    let userAssignment = null;
    if (req.user) {
      userAssignment = await JobAssignment.findOne({
        where: { 
          jobId: job.id, 
          userId: req.userId 
        }
      });
    }

    res.json({ 
      job,
      userAssignment: userAssignment ? {
        id: userAssignment.id,
        status: userAssignment.status,
        assignedAt: userAssignment.assignedAt,
        acceptedAt: userAssignment.acceptedAt
      } : null
    });
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({
      error: 'Failed to fetch job',
      message: error.message
    });
  }
});

// Get job categories/departments
router.get('/categories/departments', async (req, res) => {
  try {
    const departments = await Job.findAll({
      attributes: ['department'],
      group: ['department'],
      order: [['department', 'ASC']]
    });

    const departmentList = departments.map(d => d.department);

    res.json({ departments: departmentList });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({
      error: 'Failed to fetch departments',
      message: error.message
    });
  }
});

// Get job locations
router.get('/categories/locations', async (req, res) => {
  try {
    const locations = await Job.findAll({
      attributes: ['location'],
      group: ['location'],
      order: [['location', 'ASC']]
    });

    const locationList = locations.map(l => l.location);

    res.json({ locations: locationList });
  } catch (error) {
    console.error('Get locations error:', error);
    res.status(500).json({
      error: 'Failed to fetch locations',
      message: error.message
    });
  }
});

// Get job specializations
router.get('/categories/specializations', async (req, res) => {
  try {
    const specializations = await Job.findAll({
      attributes: ['specialization'],
      where: {
        specialization: {
          [Op.not]: null
        }
      },
      group: ['specialization'],
      order: [['specialization', 'ASC']]
    });

    const specializationList = specializations.map(s => s.specialization);

    res.json({ specializations: specializationList });
  } catch (error) {
    console.error('Get specializations error:', error);
    res.status(500).json({
      error: 'Failed to fetch specializations',
      message: error.message
    });
  }
});

// Get featured/urgent jobs
router.get('/featured/urgent', async (req, res) => {
  try {
    const urgentJobs = await Job.findAll({
      where: {
        priority: 'URGENT',
        status: 'ACTIVE',
        startDate: {
          [Op.gte]: new Date()
        }
      },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['firstName', 'lastName']
        }
      ],
      order: [['startDate', 'ASC']],
      limit: 10
    });

    res.json({ urgentJobs });
  } catch (error) {
    console.error('Get urgent jobs error:', error);
    res.status(500).json({
      error: 'Failed to fetch urgent jobs',
      message: error.message
    });
  }
});

// Get recent jobs
router.get('/featured/recent', async (req, res) => {
  try {
    const recentJobs = await Job.findAll({
      where: {
        status: 'ACTIVE',
        startDate: {
          [Op.gte]: new Date()
        }
      },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['firstName', 'lastName']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    res.json({ recentJobs });
  } catch (error) {
    console.error('Get recent jobs error:', error);
    res.status(500).json({
      error: 'Failed to fetch recent jobs',
      message: error.message
    });
  }
});

// Get job statistics (public)
router.get('/stats/overview', async (req, res) => {
  try {
    const totalJobs = await Job.count({
      where: {
        status: 'ACTIVE',
        startDate: {
          [Op.gte]: new Date()
        }
      }
    });

    const jobsByRole = await Job.findAll({
      attributes: [
        'requiredRole',
        [Job.sequelize.fn('COUNT', Job.sequelize.col('id')), 'count']
      ],
      where: {
        status: 'ACTIVE',
        startDate: {
          [Op.gte]: new Date()
        }
      },
      group: ['requiredRole']
    });

    const jobsByDepartment = await Job.findAll({
      attributes: [
        'department',
        [Job.sequelize.fn('COUNT', Job.sequelize.col('id')), 'count']
      ],
      where: {
        status: 'ACTIVE',
        startDate: {
          [Op.gte]: new Date()
        }
      },
      group: ['department'],
      order: [[Job.sequelize.fn('COUNT', Job.sequelize.col('id')), 'DESC']],
      limit: 10
    });

    const avgHourlyRate = await Job.findOne({
      attributes: [
        [Job.sequelize.fn('AVG', Job.sequelize.col('hourlyRate')), 'avgRate']
      ],
      where: {
        status: 'ACTIVE',
        startDate: {
          [Op.gte]: new Date()
        }
      }
    });

    const stats = {
      totalActiveJobs: totalJobs,
      jobsByRole: jobsByRole.map(j => ({
        role: j.requiredRole,
        count: parseInt(j.dataValues.count)
      })),
      topDepartments: jobsByDepartment.map(j => ({
        department: j.department,
        count: parseInt(j.dataValues.count)
      })),
      averageHourlyRate: avgHourlyRate ? Math.round(avgHourlyRate.dataValues.avgRate * 100) / 100 : 0
    };

    res.json({ stats });
  } catch (error) {
    console.error('Get job stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch job statistics',
      message: error.message
    });
  }
});

module.exports = router;
