const express = require('express');
const { Op } = require('sequelize');
const { User, Job, JobAssignment, CheckIn, Report } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

const router = express.Router();

// Apply authentication and HR authorization to all routes
router.use(authenticate);
router.use(authorize('HR', 'ADMIN'));

// Generate job postings report
router.post('/job-postings', validate(schemas.reportGeneration), async (req, res) => {
  try {
    const { title, parameters, fileFormat = 'JSON' } = req.body;
    const { startDate, endDate, department, location, status, createdBy } = parameters || {};

    const whereClause = {};
    if (startDate) whereClause.createdAt = { [Op.gte]: startDate };
    if (endDate) whereClause.createdAt = { ...whereClause.createdAt, [Op.lte]: endDate };
    if (department) whereClause.department = department;
    if (location) whereClause.location = { [Op.like]: `%${location}%` };
    if (status) whereClause.status = status;
    if (createdBy) whereClause.createdBy = createdBy;

    const jobs = await Job.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['firstName', 'lastName', 'email']
        },
        {
          model: JobAssignment,
          as: 'assignments',
          attributes: ['id', 'status', 'assignedAt', 'acceptedAt', 'totalHours', 'totalPayment'],
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['firstName', 'lastName', 'email']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    const summary = {
      totalJobs: jobs.length,
      byStatus: {},
      byDepartment: {},
      byLocation: {},
      totalAssignments: 0,
      totalHours: 0,
      totalPayment: 0
    };

    jobs.forEach(job => {
      // Status summary
      summary.byStatus[job.status] = (summary.byStatus[job.status] || 0) + 1;
      
      // Department summary
      summary.byDepartment[job.department] = (summary.byDepartment[job.department] || 0) + 1;
      
      // Location summary
      summary.byLocation[job.location] = (summary.byLocation[job.location] || 0) + 1;
      
      // Assignment totals
      summary.totalAssignments += job.assignments.length;
      job.assignments.forEach(assignment => {
        summary.totalHours += assignment.totalHours || 0;
        summary.totalPayment += assignment.totalPayment || 0;
      });
    });

    const report = await Report.create({
      title,
      type: 'JOB_POSTINGS',
      generatedBy: req.userId,
      parameters,
      data: jobs,
      summary,
      status: 'COMPLETED',
      fileFormat,
      generatedAt: new Date()
    });

    res.json({
      message: 'Job postings report generated successfully',
      report: {
        id: report.id,
        title: report.title,
        type: report.type,
        summary,
        totalRecords: jobs.length,
        generatedAt: report.generatedAt
      }
    });
  } catch (error) {
    console.error('Job postings report error:', error);
    res.status(500).json({
      error: 'Failed to generate job postings report',
      message: error.message
    });
  }
});

// Generate job assignments report
router.post('/job-assignments', validate(schemas.reportGeneration), async (req, res) => {
  try {
    const { title, parameters, fileFormat = 'JSON' } = req.body;
    const { startDate, endDate, status, userId, jobId } = parameters || {};

    const whereClause = {};
    if (startDate) whereClause.assignedAt = { [Op.gte]: startDate };
    if (endDate) whereClause.assignedAt = { ...whereClause.assignedAt, [Op.lte]: endDate };
    if (status) whereClause.status = status;
    if (userId) whereClause.userId = userId;
    if (jobId) whereClause.jobId = jobId;

    const assignments = await JobAssignment.findAll({
      where: whereClause,
      include: [
        {
          model: Job,
          as: 'job',
          attributes: ['title', 'department', 'location', 'startDate', 'endDate', 'hourlyRate']
        },
        {
          model: User,
          as: 'user',
          attributes: ['firstName', 'lastName', 'email', 'role', 'department']
        },
        {
          model: User,
          as: 'assigner',
          attributes: ['firstName', 'lastName', 'email']
        },
        {
          model: CheckIn,
          as: 'checkIns',
          order: [['checkInTime', 'DESC']]
        }
      ],
      order: [['assignedAt', 'DESC']]
    });

    const summary = {
      totalAssignments: assignments.length,
      byStatus: {},
      byRole: {},
      byDepartment: {},
      totalHours: 0,
      totalPayment: 0,
      averageHours: 0,
      averagePayment: 0
    };

    assignments.forEach(assignment => {
      // Status summary
      summary.byStatus[assignment.status] = (summary.byStatus[assignment.status] || 0) + 1;
      
      // Role summary
      summary.byRole[assignment.user.role] = (summary.byRole[assignment.user.role] || 0) + 1;
      
      // Department summary
      summary.byDepartment[assignment.job.department] = (summary.byDepartment[assignment.job.department] || 0) + 1;
      
      // Totals
      summary.totalHours += assignment.totalHours || 0;
      summary.totalPayment += assignment.totalPayment || 0;
    });

    if (assignments.length > 0) {
      summary.averageHours = Math.round((summary.totalHours / assignments.length) * 100) / 100;
      summary.averagePayment = Math.round((summary.totalPayment / assignments.length) * 100) / 100;
    }

    const report = await Report.create({
      title,
      type: 'JOB_ASSIGNMENTS',
      generatedBy: req.userId,
      parameters,
      data: assignments,
      summary,
      status: 'COMPLETED',
      fileFormat,
      generatedAt: new Date()
    });

    res.json({
      message: 'Job assignments report generated successfully',
      report: {
        id: report.id,
        title: report.title,
        type: report.type,
        summary,
        totalRecords: assignments.length,
        generatedAt: report.generatedAt
      }
    });
  } catch (error) {
    console.error('Job assignments report error:', error);
    res.status(500).json({
      error: 'Failed to generate job assignments report',
      message: error.message
    });
  }
});

// Generate staff performance report
router.post('/staff-performance', validate(schemas.reportGeneration), async (req, res) => {
  try {
    const { title, parameters, fileFormat = 'JSON' } = req.body;
    const { startDate, endDate, userId, role, department } = parameters || {};

    const whereClause = {
      status: 'COMPLETED'
    };
    if (startDate) whereClause.completedAt = { [Op.gte]: startDate };
    if (endDate) whereClause.completedAt = { ...whereClause.completedAt, [Op.lte]: endDate };
    if (userId) whereClause.userId = userId;

    const assignments = await JobAssignment.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          where: {
            ...(role && { role }),
            ...(department && { department })
          },
          attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'department', 'location']
        },
        {
          model: Job,
          as: 'job',
          attributes: ['title', 'department', 'location', 'startDate', 'endDate']
        },
        {
          model: CheckIn,
          as: 'checkIns',
          order: [['checkInTime', 'DESC']]
        }
      ],
      order: [['completedAt', 'DESC']]
    });

    // Group by user
    const userPerformance = {};
    assignments.forEach(assignment => {
      const userId = assignment.user.id;
      if (!userPerformance[userId]) {
        userPerformance[userId] = {
          user: assignment.user,
          totalJobs: 0,
          totalHours: 0,
          totalPayment: 0,
          averageRating: 0,
          totalRatings: 0,
          jobs: []
        };
      }

      userPerformance[userId].totalJobs += 1;
      userPerformance[userId].totalHours += assignment.totalHours || 0;
      userPerformance[userId].totalPayment += assignment.totalPayment || 0;
      userPerformance[userId].totalRatings += assignment.rating || 0;
      userPerformance[userId].jobs.push({
        job: assignment.job,
        assignment: {
          id: assignment.id,
          totalHours: assignment.totalHours,
          totalPayment: assignment.totalPayment,
          rating: assignment.rating,
          feedback: assignment.feedback,
          completedAt: assignment.completedAt
        }
      });
    });

    // Calculate averages
    Object.values(userPerformance).forEach(perf => {
      perf.averageRating = perf.totalRatings > 0 ? Math.round((perf.totalRatings / perf.totalJobs) * 100) / 100 : 0;
    });

    const summary = {
      totalStaff: Object.keys(userPerformance).length,
      totalJobs: assignments.length,
      totalHours: assignments.reduce((sum, a) => sum + (a.totalHours || 0), 0),
      totalPayment: assignments.reduce((sum, a) => sum + (a.totalPayment || 0), 0),
      averageJobsPerStaff: Object.keys(userPerformance).length > 0 ? 
        Math.round((assignments.length / Object.keys(userPerformance).length) * 100) / 100 : 0,
      topPerformers: Object.values(userPerformance)
        .sort((a, b) => b.totalJobs - a.totalJobs)
        .slice(0, 10)
    };

    const report = await Report.create({
      title,
      type: 'STAFF_PERFORMANCE',
      generatedBy: req.userId,
      parameters,
      data: userPerformance,
      summary,
      status: 'COMPLETED',
      fileFormat,
      generatedAt: new Date()
    });

    res.json({
      message: 'Staff performance report generated successfully',
      report: {
        id: report.id,
        title: report.title,
        type: report.type,
        summary,
        totalRecords: Object.keys(userPerformance).length,
        generatedAt: report.generatedAt
      }
    });
  } catch (error) {
    console.error('Staff performance report error:', error);
    res.status(500).json({
      error: 'Failed to generate staff performance report',
      message: error.message
    });
  }
});

// Generate financial report
router.post('/financial', validate(schemas.reportGeneration), async (req, res) => {
  try {
    const { title, parameters, fileFormat = 'JSON' } = req.body;
    const { startDate, endDate, department, location } = parameters || {};

    const whereClause = {
      status: 'COMPLETED'
    };
    if (startDate) whereClause.completedAt = { [Op.gte]: startDate };
    if (endDate) whereClause.completedAt = { ...whereClause.completedAt, [Op.lte]: endDate };

    const assignments = await JobAssignment.findAll({
      where: whereClause,
      include: [
        {
          model: Job,
          as: 'job',
          where: {
            ...(department && { department }),
            ...(location && { location: { [Op.like]: `%${location}%` } })
          },
          attributes: ['title', 'department', 'location', 'hourlyRate']
        },
        {
          model: User,
          as: 'user',
          attributes: ['firstName', 'lastName', 'email', 'role']
        }
      ],
      order: [['completedAt', 'DESC']]
    });

    const summary = {
      totalAssignments: assignments.length,
      totalPayment: 0,
      totalHours: 0,
      averageHourlyRate: 0,
      byDepartment: {},
      byRole: {},
      byMonth: {},
      topEarners: []
    };

    const userEarnings = {};

    assignments.forEach(assignment => {
      const payment = assignment.totalPayment || 0;
      const hours = assignment.totalHours || 0;
      const department = assignment.job.department;
      const role = assignment.user.role;
      const month = new Date(assignment.completedAt).toISOString().substring(0, 7);

      // Totals
      summary.totalPayment += payment;
      summary.totalHours += hours;

      // By department
      if (!summary.byDepartment[department]) {
        summary.byDepartment[department] = { total: 0, count: 0 };
      }
      summary.byDepartment[department].total += payment;
      summary.byDepartment[department].count += 1;

      // By role
      if (!summary.byRole[role]) {
        summary.byRole[role] = { total: 0, count: 0 };
      }
      summary.byRole[role].total += payment;
      summary.byRole[role].count += 1;

      // By month
      if (!summary.byMonth[month]) {
        summary.byMonth[month] = { total: 0, count: 0 };
      }
      summary.byMonth[month].total += payment;
      summary.byMonth[month].count += 1;

      // User earnings
      const userId = assignment.user.id;
      if (!userEarnings[userId]) {
        userEarnings[userId] = {
          user: assignment.user,
          totalEarnings: 0,
          totalHours: 0,
          jobCount: 0
        };
      }
      userEarnings[userId].totalEarnings += payment;
      userEarnings[userId].totalHours += hours;
      userEarnings[userId].jobCount += 1;
    });

    // Calculate averages
    if (assignments.length > 0) {
      summary.averageHourlyRate = Math.round((summary.totalPayment / summary.totalHours) * 100) / 100;
    }

    // Top earners
    summary.topEarners = Object.values(userEarnings)
      .sort((a, b) => b.totalEarnings - a.totalEarnings)
      .slice(0, 10);

    const report = await Report.create({
      title,
      type: 'FINANCIAL',
      generatedBy: req.userId,
      parameters,
      data: {
        assignments,
        userEarnings,
        departmentBreakdown: summary.byDepartment,
        roleBreakdown: summary.byRole,
        monthlyBreakdown: summary.byMonth
      },
      summary,
      status: 'COMPLETED',
      fileFormat,
      generatedAt: new Date()
    });

    res.json({
      message: 'Financial report generated successfully',
      report: {
        id: report.id,
        title: report.title,
        type: report.type,
        summary,
        totalRecords: assignments.length,
        generatedAt: report.generatedAt
      }
    });
  } catch (error) {
    console.error('Financial report error:', error);
    res.status(500).json({
      error: 'Failed to generate financial report',
      message: error.message
    });
  }
});

// Generate attendance report
router.post('/attendance', validate(schemas.reportGeneration), async (req, res) => {
  try {
    const { title, parameters, fileFormat = 'JSON' } = req.body;
    const { startDate, endDate, userId, department } = parameters || {};

    const whereClause = {};
    if (startDate) whereClause.checkInTime = { [Op.gte]: startDate };
    if (endDate) whereClause.checkInTime = { ...whereClause.checkInTime, [Op.lte]: endDate };
    if (userId) whereClause.userId = userId;

    const checkIns = await CheckIn.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          where: {
            ...(department && { department })
          },
          attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'department']
        },
        {
          model: JobAssignment,
          as: 'jobAssignment',
          include: [
            {
              model: Job,
              as: 'job',
              attributes: ['title', 'department', 'location', 'startTime', 'endTime', 'facilityName', 'facilityAddress', 'specialization']
            }
          ]
        }
      ],
      order: [['checkInTime', 'DESC']]
    });

    const summary = {
      totalCheckIns: checkIns.length,
      totalWorkHours: 0,
      totalBreakTime: 0,
      lateArrivals: 0,
      earlyDepartures: 0,
      byUser: {},
      byDepartment: {},
      attendanceRate: 0
    };

    const userAttendance = {};

    checkIns.forEach(checkIn => {
      const userId = checkIn.user.id;
      const department = checkIn.user.department;
      const workTime = checkIn.totalWorkTime || 0;
      const breakTime = checkIn.totalBreakTime || 0;

      // Totals
      summary.totalWorkHours += workTime;
      summary.totalBreakTime += breakTime;
      if (checkIn.isLate) summary.lateArrivals += 1;
      if (checkIn.isEarlyCheckout) summary.earlyDepartures += 1;

      // By user
      if (!userAttendance[userId]) {
        userAttendance[userId] = {
          user: checkIn.user,
          totalCheckIns: 0,
          totalWorkHours: 0,
          totalBreakTime: 0,
          lateArrivals: 0,
          earlyDepartures: 0,
          checkIns: []
        };
      }

      userAttendance[userId].totalCheckIns += 1;
      userAttendance[userId].totalWorkHours += workTime;
      userAttendance[userId].totalBreakTime += breakTime;
      if (checkIn.isLate) userAttendance[userId].lateArrivals += 1;
      if (checkIn.isEarlyCheckout) userAttendance[userId].earlyDepartures += 1;
      userAttendance[userId].checkIns.push(checkIn);

      // By department
      if (!summary.byDepartment[department]) {
        summary.byDepartment[department] = {
          totalCheckIns: 0,
          totalWorkHours: 0,
          lateArrivals: 0,
          earlyDepartures: 0
        };
      }
      summary.byDepartment[department].totalCheckIns += 1;
      summary.byDepartment[department].totalWorkHours += workTime;
      if (checkIn.isLate) summary.byDepartment[department].lateArrivals += 1;
      if (checkIn.isEarlyCheckout) summary.byDepartment[department].earlyDepartures += 1;
    });

    // Calculate attendance rate (assuming 8 hours per day as standard)
    const totalExpectedHours = checkIns.length * 8;
    summary.attendanceRate = totalExpectedHours > 0 ? 
      Math.round((summary.totalWorkHours / totalExpectedHours) * 100) / 100 : 0;

    const report = await Report.create({
      title,
      type: 'ATTENDANCE',
      generatedBy: req.userId,
      parameters,
      data: {
        checkIns,
        userAttendance,
        departmentBreakdown: summary.byDepartment
      },
      summary,
      status: 'COMPLETED',
      fileFormat,
      generatedAt: new Date()
    });

    res.json({
      message: 'Attendance report generated successfully',
      report: {
        id: report.id,
        title: report.title,
        type: report.type,
        summary,
        totalRecords: checkIns.length,
        generatedAt: report.generatedAt
      }
    });
  } catch (error) {
    console.error('Attendance report error:', error);
    res.status(500).json({
      error: 'Failed to generate attendance report',
      message: error.message
    });
  }
});

// Get all reports
router.get('/', validate(schemas.pagination, 'query'), async (req, res) => {
  try {
    const { page, limit, sortBy = 'generatedAt', sortOrder = 'DESC', type } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (type) whereClause.type = type;

    const { count, rows: reports } = await Report.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'generator',
          attributes: ['firstName', 'lastName', 'email']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder]]
    });

    res.json({
      reports,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({
      error: 'Failed to fetch reports',
      message: error.message
    });
  }
});

// Get report by ID
router.get('/:id', async (req, res) => {
  try {
    const report = await Report.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'generator',
          attributes: ['firstName', 'lastName', 'email']
        }
      ]
    });

    if (!report) {
      return res.status(404).json({
        error: 'Report not found',
        message: 'Report does not exist'
      });
    }

    res.json({ report });
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({
      error: 'Failed to fetch report',
      message: error.message
    });
  }
});

// Delete report
router.delete('/:id', async (req, res) => {
  try {
    const report = await Report.findByPk(req.params.id);

    if (!report) {
      return res.status(404).json({
        error: 'Report not found',
        message: 'Report does not exist'
      });
    }

    await report.destroy();

    res.json({
      message: 'Report deleted successfully'
    });
  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({
      error: 'Failed to delete report',
      message: error.message
    });
  }
});

module.exports = router;
