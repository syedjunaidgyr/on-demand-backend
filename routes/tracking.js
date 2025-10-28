const express = require('express');
const { Op } = require('sequelize');
const { User, Job, JobAssignment, CheckIn, Hospital } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Get real-time staff locations (for HR/Admin)
router.get('/staff/locations', authorize('HR', 'ADMIN'), async (req, res) => {
  try {
    const activeCheckIns = await CheckIn.findAll({
      where: {
        status: 'CHECKED_IN',
        checkInTime: {
          [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'department']
        },
        {
          model: JobAssignment,
          as: 'jobAssignment',
          include: [
            {
              model: Job,
              as: 'job',
              attributes: ['id', 'title', 'department', 'location', 'facilityName', 'facilityAddress']
            }
          ]
        }
      ],
      order: [['checkInTime', 'DESC']]
    });

    const staffLocations = activeCheckIns.map(checkIn => ({
      userId: checkIn.user.id,
      userName: `${checkIn.user.firstName} ${checkIn.user.lastName}`,
      userRole: checkIn.user.role,
      userDepartment: checkIn.user.department,
      checkInTime: checkIn.checkInTime,
      location: checkIn.checkInLocation,
      jobId: checkIn.jobAssignment.job.id,
      jobTitle: checkIn.jobAssignment.job.title,
      facilityName: checkIn.jobAssignment.job.facilityName,
      facilityAddress: checkIn.jobAssignment.job.facilityAddress,
      department: checkIn.jobAssignment.job.department,
      status: checkIn.status,
      isLate: checkIn.isLate,
      lateMinutes: checkIn.lateMinutes
    }));

    res.json({
      message: 'Real-time staff locations retrieved successfully',
      totalActiveStaff: staffLocations.length,
      staffLocations
    });
  } catch (error) {
    console.error('Get staff locations error:', error);
    res.status(500).json({
      error: 'Failed to fetch staff locations',
      message: error.message
    });
  }
});

// Get current shift status for a specific staff member
router.get('/staff/:userId/current-shift', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user is requesting their own data or if requester is HR/Admin
    if (req.userId !== parseInt(userId) && !['HR', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only view your own shift status'
      });
    }

    const currentCheckIn = await CheckIn.findOne({
      where: {
        userId: userId,
        status: 'CHECKED_IN'
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'department']
        },
        {
          model: JobAssignment,
          as: 'jobAssignment',
          include: [
            {
              model: Job,
              as: 'job',
              attributes: ['id', 'title', 'department', 'location', 'facilityName', 'facilityAddress', 'startTime', 'endTime']
            }
          ]
        }
      ]
    });

    if (!currentCheckIn) {
      return res.json({
        message: 'No active shift found',
        isOnShift: false,
        currentShift: null
      });
    }

    const currentTime = new Date();
    const workTimeMinutes = Math.floor((currentTime - currentCheckIn.checkInTime) / (1000 * 60));
    const workTimeHours = Math.floor(workTimeMinutes / 60);
    const remainingMinutes = workTimeMinutes % 60;

    res.json({
      message: 'Current shift status retrieved successfully',
      isOnShift: true,
      currentShift: {
        checkInTime: currentCheckIn.checkInTime,
        currentTime: currentTime,
        workTimeMinutes: workTimeMinutes,
        workTimeFormatted: `${workTimeHours}h ${remainingMinutes}m`,
        location: currentCheckIn.checkInLocation,
        job: currentCheckIn.jobAssignment.job,
        user: currentCheckIn.user,
        isLate: currentCheckIn.isLate,
        lateMinutes: currentCheckIn.lateMinutes,
        breakTime: currentCheckIn.totalBreakTime || 0
      }
    });
  } catch (error) {
    console.error('Get current shift error:', error);
    res.status(500).json({
      error: 'Failed to fetch current shift status',
      message: error.message
    });
  }
});

// Start break
router.post('/break/start', validate(schemas.breakStart), async (req, res) => {
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
        error: 'Active check-in not found',
        message: 'You must be checked in to start a break'
      });
    }

    if (checkIn.status === 'BREAK_START') {
      return res.status(400).json({
        error: 'Already on break',
        message: 'You are already on a break'
      });
    }

    await checkIn.update({
      status: 'BREAK_START',
      breakStartTime: new Date(),
      notes: notes || checkIn.notes
    });

    res.json({
      message: 'Break started successfully',
      breakStartTime: checkIn.breakStartTime,
      checkInId: checkIn.id
    });
  } catch (error) {
    console.error('Start break error:', error);
    res.status(500).json({
      error: 'Failed to start break',
      message: error.message
    });
  }
});

// End break
router.post('/break/end', validate(schemas.breakEnd), async (req, res) => {
  try {
    const { jobAssignmentId, location, notes } = req.body;

    // Find active check-in with break started
    const checkIn = await CheckIn.findOne({
      where: {
        jobAssignmentId,
        userId: req.userId,
        status: 'BREAK_START'
      }
    });

    if (!checkIn) {
      return res.status(404).json({
        error: 'Active break not found',
        message: 'You must be on a break to end it'
      });
    }

    const breakEndTime = new Date();
    const breakDuration = Math.round((breakEndTime - checkIn.breakStartTime) / (1000 * 60)); // minutes
    const totalBreakTime = (checkIn.totalBreakTime || 0) + breakDuration;

    await checkIn.update({
      status: 'CHECKED_IN',
      breakEndTime: breakEndTime,
      totalBreakTime: totalBreakTime,
      notes: notes || checkIn.notes
    });

    res.json({
      message: 'Break ended successfully',
      breakEndTime: breakEndTime,
      breakDuration: breakDuration,
      totalBreakTime: totalBreakTime,
      checkInId: checkIn.id
    });
  } catch (error) {
    console.error('End break error:', error);
    res.status(500).json({
      error: 'Failed to end break',
      message: error.message
    });
  }
});

// Get attendance summary for a date range
router.get('/attendance/summary', async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query;
    
    // If userId is provided, check permissions
    if (userId && req.userId !== parseInt(userId) && !['HR', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only view your own attendance data'
      });
    }

    const whereClause = {};
    if (userId) whereClause.userId = userId;
    if (startDate) whereClause.checkInTime = { [Op.gte]: startDate };
    if (endDate) whereClause.checkInTime = { ...whereClause.checkInTime, [Op.lte]: endDate };

    const checkIns = await CheckIn.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'department']
        },
        {
          model: JobAssignment,
          as: 'jobAssignment',
          include: [
            {
              model: Job,
              as: 'job',
              attributes: ['id', 'title', 'department', 'location', 'facilityName']
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
      byDate: {}
    };

    checkIns.forEach(checkIn => {
      const userId = checkIn.user.id;
      const department = checkIn.user.department;
      const date = checkIn.checkInTime.toISOString().split('T')[0];

      // Totals
      summary.totalWorkHours += checkIn.totalWorkTime || 0;
      summary.totalBreakTime += checkIn.totalBreakTime || 0;
      if (checkIn.isLate) summary.lateArrivals += 1;
      if (checkIn.isEarlyCheckout) summary.earlyDepartures += 1;

      // By user
      if (!summary.byUser[userId]) {
        summary.byUser[userId] = {
          user: checkIn.user,
          totalCheckIns: 0,
          totalWorkHours: 0,
          totalBreakTime: 0,
          lateArrivals: 0,
          earlyDepartures: 0
        };
      }
      summary.byUser[userId].totalCheckIns += 1;
      summary.byUser[userId].totalWorkHours += checkIn.totalWorkTime || 0;
      summary.byUser[userId].totalBreakTime += checkIn.totalBreakTime || 0;
      if (checkIn.isLate) summary.byUser[userId].lateArrivals += 1;
      if (checkIn.isEarlyCheckout) summary.byUser[userId].earlyDepartures += 1;

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
      summary.byDepartment[department].totalWorkHours += checkIn.totalWorkTime || 0;
      if (checkIn.isLate) summary.byDepartment[department].lateArrivals += 1;
      if (checkIn.isEarlyCheckout) summary.byDepartment[department].earlyDepartures += 1;

      // By date
      if (!summary.byDate[date]) {
        summary.byDate[date] = {
          totalCheckIns: 0,
          totalWorkHours: 0,
          lateArrivals: 0,
          earlyDepartures: 0
        };
      }
      summary.byDate[date].totalCheckIns += 1;
      summary.byDate[date].totalWorkHours += checkIn.totalWorkTime || 0;
      if (checkIn.isLate) summary.byDate[date].lateArrivals += 1;
      if (checkIn.isEarlyCheckout) summary.byDate[date].earlyDepartures += 1;
    });

    res.json({
      message: 'Attendance summary retrieved successfully',
      summary,
      checkIns: checkIns.map(ci => ({
        id: ci.id,
        checkInTime: ci.checkInTime,
        checkOutTime: ci.checkOutTime,
        totalWorkTime: ci.totalWorkTime,
        totalBreakTime: ci.totalBreakTime,
        isLate: ci.isLate,
        isEarlyCheckout: ci.isEarlyCheckout,
        user: ci.user,
        job: ci.jobAssignment.job
      }))
    });
  } catch (error) {
    console.error('Get attendance summary error:', error);
    res.status(500).json({
      error: 'Failed to fetch attendance summary',
      message: error.message
    });
  }
});

// Get real-time dashboard data
router.get('/dashboard/realtime', authorize('HR', 'ADMIN'), async (req, res) => {
  try {
    const now = new Date();

    // Active staff currently on shift (all-time, no date constraint)
    const activeStaff = await CheckIn.findAll({
      where: {
        status: 'CHECKED_IN'
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'role', 'department', 'specialization', 'hospitalId', 'unitCode']
        },
        {
          model: JobAssignment,
          as: 'jobAssignment',
          include: [
            {
              model: Job,
              as: 'job',
              attributes: ['id', 'title', 'department', 'location', 'facilityName', 'hospitalId', 'unitCode', 'specialization']
            }
          ]
        }
      ]
    });

    // All-time totals
    const [
      totalCheckIns,
      totalLateArrivals,
      activeJobsAllTime,
      pendingAssignments
    ] = await Promise.all([
      CheckIn.count(),
      CheckIn.count({ where: { isLate: true } }),
      Job.count({ where: { status: ['ACTIVE', 'ASSIGNED', 'IN_PROGRESS'] } }),
      JobAssignment.count({ where: { status: 'PENDING' } })
    ]);

    const onTimeRate = totalCheckIns > 0
      ? Math.round(((totalCheckIns - totalLateArrivals) / totalCheckIns) * 100)
      : 100;

    // Full history list (could be large)
    const allCheckIns = await CheckIn.findAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'department', 'specialization', 'hospitalId', 'unitCode']
        },
        {
          model: JobAssignment,
          as: 'jobAssignment',
          include: [
            {
              model: Job,
              as: 'job',
              attributes: ['id', 'title', 'department', 'location', 'facilityName', 'hospitalId', 'unitCode', 'specialization']
            }
          ]
        }
      ],
      order: [['checkInTime', 'DESC']]
    });

    // All-time checkouts list
    const allCheckOuts = await CheckIn.findAll({
      where: { status: 'CHECKED_OUT' },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'department', 'specialization', 'hospitalId', 'unitCode']
        },
        {
          model: JobAssignment,
          as: 'jobAssignment',
          include: [
            {
              model: Job,
              as: 'job',
              attributes: ['id', 'title', 'department', 'location', 'facilityName', 'hospitalId', 'unitCode', 'specialization']
            }
          ]
        }
      ],
      order: [['checkOutTime', 'DESC']]
    });

    const totalCheckOuts = allCheckOuts.length;

    const realtimeData = {
      timestamp: now,
      activeStaff: activeStaff.length,
      activeStaffDetails: activeStaff.map(staff => ({
        userId: staff.user.id,
        userName: `${staff.user.firstName} ${staff.user.lastName}`,
        role: staff.user.role,
        department: staff.user.department,
        specialization: staff.user.specialization,
        hospitalId: staff.user.hospitalId,
        unitCode: staff.user.unitCode,
        checkInTime: staff.checkInTime,
        jobTitle: staff.jobAssignment.job.title,
        facilityName: staff.jobAssignment.job.facilityName,
        jobDepartment: staff.jobAssignment.job.department,
        jobSpecialization: staff.jobAssignment.job.specialization,
        jobHospitalId: staff.jobAssignment.job.hospitalId,
        jobUnitCode: staff.jobAssignment.job.unitCode,
        isLate: staff.isLate,
        workTimeMinutes: Math.floor((now - staff.checkInTime) / (1000 * 60))
      })),
      todayStats: {
        // Keeping the key for backward compatibility, but now these are all-time
        totalCheckIns: totalCheckIns,
        totalCheckOuts: totalCheckOuts,
        lateArrivals: totalLateArrivals,
        onTimeRate: onTimeRate,
        activeJobs: activeJobsAllTime,
        pendingAssignments: pendingAssignments
      },
      // New fields for clarity
      summary: {
        totalCheckIns: totalCheckIns,
        totalCheckOuts: totalCheckOuts,
        lateArrivals: totalLateArrivals,
        onTimeRate: onTimeRate,
        activeJobs: activeJobsAllTime,
        pendingAssignments: pendingAssignments
      },
      allCheckIns: allCheckIns.map(ci => ({
        id: ci.id,
        checkInTime: ci.checkInTime,
        checkOutTime: ci.checkOutTime,
        status: ci.status,
        totalWorkTime: ci.totalWorkTime,
        totalBreakTime: ci.totalBreakTime,
        isLate: ci.isLate,
        isEarlyCheckout: ci.isEarlyCheckout,
        notes: ci.notes,
        user: ci.user,
        job: ci.jobAssignment?.job || null,
        // convenience top-level fields
        department: ci.user?.department || ci.jobAssignment?.job?.department || null,
        specialization: ci.user?.specialization || ci.jobAssignment?.job?.specialization || null,
        hospitalId: ci.user?.hospitalId || ci.jobAssignment?.job?.hospitalId || null,
        unitCode: ci.user?.unitCode || ci.jobAssignment?.job?.unitCode || null
      }))
      ,
      allCheckOuts: allCheckOuts.map(ci => ({
        id: ci.id,
        checkInTime: ci.checkInTime,
        checkOutTime: ci.checkOutTime,
        status: ci.status,
        totalWorkTime: ci.totalWorkTime,
        totalBreakTime: ci.totalBreakTime,
        isLate: ci.isLate,
        isEarlyCheckout: ci.isEarlyCheckout,
        notes: ci.notes,
        user: ci.user,
        job: ci.jobAssignment?.job || null,
        department: ci.user?.department || ci.jobAssignment?.job?.department || null,
        specialization: ci.user?.specialization || ci.jobAssignment?.job?.specialization || null,
        hospitalId: ci.user?.hospitalId || ci.jobAssignment?.job?.hospitalId || null,
        unitCode: ci.user?.unitCode || ci.jobAssignment?.job?.unitCode || null
      }))
    };

    res.json({
      message: 'Real-time dashboard data retrieved successfully',
      data: realtimeData
    });
  } catch (error) {
    console.error('Get real-time dashboard error:', error);
    res.status(500).json({
      error: 'Failed to fetch real-time dashboard data',
      message: error.message
    });
  }
});

module.exports = router;
