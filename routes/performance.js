const express = require('express');
const { Op } = require('sequelize');
const { User, Job, JobAssignment, CheckIn, Hospital } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

const router = express.Router();

// Apply authentication and HR authorization to all routes
router.use(authenticate);
router.use(authorize('HR', 'ADMIN'));

// Get performance dashboard overview
router.get('/dashboard', async (req, res) => {
  try {
    const { startDate, endDate, department, role } = req.query;
    
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    const queryStartDate = startDate ? new Date(startDate) : startOfMonth;
    const queryEndDate = endDate ? new Date(endDate) : endOfMonth;

    const whereClause = {
      status: 'COMPLETED',
      completedAt: {
        [Op.between]: [queryStartDate, queryEndDate]
      }
    };

    const assignments = await JobAssignment.findAll({
      where: whereClause,
      include: [
        {
          model: Job,
          as: 'job',
          where: {
            ...(department && { department })
          },
          attributes: ['id', 'title', 'department', 'location', 'facilityName']
        },
        {
          model: User,
          as: 'user',
          where: {
            ...(role && { role })
          },
          attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'department', 'specialization']
        },
        {
          model: CheckIn,
          as: 'checkIns',
          attributes: ['id', 'checkInTime', 'checkOutTime', 'totalWorkTime', 'isLate', 'isEarlyCheckout']
        }
      ],
      order: [['completedAt', 'DESC']]
    });

    // Calculate overall performance metrics
    const totalAssignments = assignments.length;
    const totalHours = assignments.reduce((sum, a) => sum + (parseFloat(a.totalHours) || 0), 0);
    const totalPayment = assignments.reduce((sum, a) => sum + (parseFloat(a.totalPayment) || 0), 0);
    const averageRating = assignments.reduce((sum, a) => sum + (a.rating || 0), 0) / totalAssignments;

    // Group by user for individual performance
    const userPerformance = {};
    assignments.forEach(assignment => {
      const userId = assignment.user.id;
      if (!userPerformance[userId]) {
        userPerformance[userId] = {
          user: assignment.user,
          totalAssignments: 0,
          totalHours: 0,
          totalPayment: 0,
          totalRatings: 0,
          ratingCount: 0,
          averageRating: 0,
          lateArrivals: 0,
          earlyDepartures: 0,
          assignments: []
        };
      }

      userPerformance[userId].totalAssignments += 1;
      userPerformance[userId].totalHours += parseFloat(assignment.totalHours) || 0;
      userPerformance[userId].totalPayment += parseFloat(assignment.totalPayment) || 0;
      userPerformance[userId].totalRatings += assignment.rating || 0;
      if (assignment.rating) userPerformance[userId].ratingCount += 1;
      
      userPerformance[userId].assignments.push({
        id: assignment.id,
        job: assignment.job,
        totalHours: assignment.totalHours,
        totalPayment: assignment.totalPayment,
        rating: assignment.rating,
        feedback: assignment.feedback,
        completedAt: assignment.completedAt
      });

      // Check for late arrivals and early departures
      assignment.checkIns.forEach(checkIn => {
        if (checkIn.isLate) userPerformance[userId].lateArrivals += 1;
        if (checkIn.isEarlyCheckout) userPerformance[userId].earlyDepartures += 1;
      });
    });

    // Calculate average ratings for each user
    Object.values(userPerformance).forEach(perf => {
      perf.averageRating = perf.ratingCount > 0 ? Math.round((perf.totalRatings / perf.ratingCount) * 100) / 100 : 0;
    });

    // Top performers by different metrics
    const topPerformers = {
      byRating: Object.values(userPerformance)
        .filter(p => p.ratingCount > 0)
        .sort((a, b) => b.averageRating - a.averageRating)
        .slice(0, 10),
      byHours: Object.values(userPerformance)
        .sort((a, b) => b.totalHours - a.totalHours)
        .slice(0, 10),
      byAssignments: Object.values(userPerformance)
        .sort((a, b) => b.totalAssignments - a.totalAssignments)
        .slice(0, 10),
      byEarnings: Object.values(userPerformance)
        .sort((a, b) => b.totalPayment - a.totalPayment)
        .slice(0, 10)
    };

    // Department performance
    const departmentPerformance = {};
    assignments.forEach(assignment => {
      const dept = assignment.job.department;
      if (!departmentPerformance[dept]) {
        departmentPerformance[dept] = {
          totalAssignments: 0,
          totalHours: 0,
          totalPayment: 0,
          totalRatings: 0,
          ratingCount: 0,
          averageRating: 0,
          staffCount: new Set()
        };
      }
      
      departmentPerformance[dept].totalAssignments += 1;
      departmentPerformance[dept].totalHours += parseFloat(assignment.totalHours) || 0;
      departmentPerformance[dept].totalPayment += parseFloat(assignment.totalPayment) || 0;
      departmentPerformance[dept].totalRatings += assignment.rating || 0;
      if (assignment.rating) departmentPerformance[dept].ratingCount += 1;
      departmentPerformance[dept].staffCount.add(assignment.user.id);
    });

    // Calculate department averages
    Object.keys(departmentPerformance).forEach(dept => {
      const data = departmentPerformance[dept];
      data.averageRating = data.ratingCount > 0 ? Math.round((data.totalRatings / data.ratingCount) * 100) / 100 : 0;
      data.staffCount = data.staffCount.size;
    });

    // Role performance
    const rolePerformance = {};
    assignments.forEach(assignment => {
      const role = assignment.user.role;
      if (!rolePerformance[role]) {
        rolePerformance[role] = {
          totalAssignments: 0,
          totalHours: 0,
          totalPayment: 0,
          totalRatings: 0,
          ratingCount: 0,
          averageRating: 0,
          staffCount: new Set()
        };
      }
      
      rolePerformance[role].totalAssignments += 1;
      rolePerformance[role].totalHours += parseFloat(assignment.totalHours) || 0;
      rolePerformance[role].totalPayment += parseFloat(assignment.totalPayment) || 0;
      rolePerformance[role].totalRatings += assignment.rating || 0;
      if (assignment.rating) rolePerformance[role].ratingCount += 1;
      rolePerformance[role].staffCount.add(assignment.user.id);
    });

    // Calculate role averages
    Object.keys(rolePerformance).forEach(role => {
      const data = rolePerformance[role];
      data.averageRating = data.ratingCount > 0 ? Math.round((data.totalRatings / data.ratingCount) * 100) / 100 : 0;
      data.staffCount = data.staffCount.size;
    });

    // Monthly trends
    const monthlyTrends = {};
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
      const monthKey = monthStart.toISOString().substring(0, 7);
      
      const monthAssignments = assignments.filter(a => {
        const completedDate = new Date(a.completedAt);
        return completedDate >= monthStart && completedDate <= monthEnd;
      });
      
      const monthRatings = monthAssignments.filter(a => a.rating).map(a => a.rating);
      const averageMonthRating = monthRatings.length > 0 ? 
        Math.round((monthRatings.reduce((sum, r) => sum + r, 0) / monthRatings.length) * 100) / 100 : 0;
      
      monthlyTrends[monthKey] = {
        totalAssignments: monthAssignments.length,
        totalHours: monthAssignments.reduce((sum, a) => sum + (parseFloat(a.totalHours) || 0), 0),
        totalPayment: monthAssignments.reduce((sum, a) => sum + (parseFloat(a.totalPayment) || 0), 0),
        averageRating: averageMonthRating,
        ratingCount: monthRatings.length
      };
    }

    const dashboard = {
      period: {
        startDate: queryStartDate,
        endDate: queryEndDate
      },
      summary: {
        totalStaff: Object.keys(userPerformance).length,
        totalAssignments: totalAssignments,
        totalHours: Math.round(totalHours * 100) / 100,
        totalPayment: Math.round(totalPayment * 100) / 100,
        averageRating: Math.round(averageRating * 100) / 100,
        averageHoursPerStaff: Object.keys(userPerformance).length > 0 ? 
          Math.round((totalHours / Object.keys(userPerformance).length) * 100) / 100 : 0,
        averageAssignmentsPerStaff: Object.keys(userPerformance).length > 0 ? 
          Math.round((totalAssignments / Object.keys(userPerformance).length) * 100) / 100 : 0
      },
      topPerformers,
      breakdowns: {
        byDepartment: departmentPerformance,
        byRole: rolePerformance
      },
      trends: {
        monthly: monthlyTrends
      },
      individualPerformance: Object.values(userPerformance).map(perf => ({
        ...perf,
        totalHours: Math.round(perf.totalHours * 100) / 100,
        totalPayment: Math.round(perf.totalPayment * 100) / 100,
        averageRating: Math.round(perf.averageRating * 100) / 100
      }))
    };

    res.json({
      message: 'Performance dashboard data retrieved successfully',
      dashboard
    });
  } catch (error) {
    console.error('Performance dashboard error:', error);
    res.status(500).json({
      error: 'Failed to fetch performance dashboard data',
      message: error.message
    });
  }
});

// Get individual staff performance details
router.get('/staff/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    const whereClause = {
      userId: userId,
      status: 'COMPLETED'
    };

    if (startDate || endDate) {
      whereClause.completedAt = {};
      if (startDate) whereClause.completedAt[Op.gte] = new Date(startDate);
      if (endDate) whereClause.completedAt[Op.lte] = new Date(endDate);
    }

    const assignments = await JobAssignment.findAll({
      where: whereClause,
      include: [
        {
          model: Job,
          as: 'job',
          attributes: ['id', 'title', 'department', 'location', 'facilityName', 'hourlyRate']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'department', 'specialization']
        },
        {
          model: CheckIn,
          as: 'checkIns',
          attributes: ['id', 'checkInTime', 'checkOutTime', 'totalWorkTime', 'isLate', 'isEarlyCheckout', 'totalBreakTime']
        }
      ],
      order: [['completedAt', 'DESC']]
    });

    if (assignments.length === 0) {
      return res.json({
        message: 'No performance data found for this staff member',
        staff: null,
        performance: null
      });
    }

    const staff = assignments[0].user;
    const totalAssignments = assignments.length;
    const totalHours = assignments.reduce((sum, a) => sum + (parseFloat(a.totalHours) || 0), 0);
    const totalPayment = assignments.reduce((sum, a) => sum + (parseFloat(a.totalPayment) || 0), 0);
    const totalRatings = assignments.reduce((sum, a) => sum + (a.rating || 0), 0);
    const ratingCount = assignments.filter(a => a.rating).length;
    const averageRating = ratingCount > 0 ? totalRatings / ratingCount : 0;

    // Attendance metrics
    let totalLateArrivals = 0;
    let totalEarlyDepartures = 0;
    let totalBreakTime = 0;
    
    assignments.forEach(assignment => {
      assignment.checkIns.forEach(checkIn => {
        if (checkIn.isLate) totalLateArrivals += 1;
        if (checkIn.isEarlyCheckout) totalEarlyDepartures += 1;
        totalBreakTime += checkIn.totalBreakTime || 0;
      });
    });

    // Department breakdown
    const departmentBreakdown = {};
    assignments.forEach(assignment => {
      const dept = assignment.job.department;
      if (!departmentBreakdown[dept]) {
        departmentBreakdown[dept] = {
          totalAssignments: 0,
          totalHours: 0,
          totalPayment: 0,
          totalRatings: 0,
          ratingCount: 0,
          averageRating: 0
        };
      }
      
      departmentBreakdown[dept].totalAssignments += 1;
      departmentBreakdown[dept].totalHours += parseFloat(assignment.totalHours) || 0;
      departmentBreakdown[dept].totalPayment += parseFloat(assignment.totalPayment) || 0;
      departmentBreakdown[dept].totalRatings += assignment.rating || 0;
      if (assignment.rating) departmentBreakdown[dept].ratingCount += 1;
    });

    // Calculate department averages
    Object.keys(departmentBreakdown).forEach(dept => {
      const data = departmentBreakdown[dept];
      data.averageRating = data.ratingCount > 0 ? Math.round((data.totalRatings / data.ratingCount) * 100) / 100 : 0;
    });

    // Monthly performance trends
    const monthlyTrends = {};
    assignments.forEach(assignment => {
      const month = new Date(assignment.completedAt).toISOString().substring(0, 7);
      if (!monthlyTrends[month]) {
        monthlyTrends[month] = {
          totalAssignments: 0,
          totalHours: 0,
          totalPayment: 0,
          totalRatings: 0,
          ratingCount: 0,
          averageRating: 0
        };
      }
      
      monthlyTrends[month].totalAssignments += 1;
      monthlyTrends[month].totalHours += parseFloat(assignment.totalHours) || 0;
      monthlyTrends[month].totalPayment += parseFloat(assignment.totalPayment) || 0;
      monthlyTrends[month].totalRatings += assignment.rating || 0;
      if (assignment.rating) monthlyTrends[month].ratingCount += 1;
    });

    // Calculate monthly averages
    Object.keys(monthlyTrends).forEach(month => {
      const data = monthlyTrends[month];
      data.averageRating = data.ratingCount > 0 ? Math.round((data.totalRatings / data.ratingCount) * 100) / 100 : 0;
    });

    // Performance metrics
    const performanceMetrics = {
      reliability: {
        onTimeRate: totalAssignments > 0 ? Math.round(((totalAssignments - totalLateArrivals) / totalAssignments) * 100) : 100,
        completionRate: 100, // All assignments are completed
        averageHoursPerAssignment: totalAssignments > 0 ? Math.round((totalHours / totalAssignments) * 100) / 100 : 0
      },
      quality: {
        averageRating: Math.round(averageRating * 100) / 100,
        ratingCount: ratingCount,
        ratingPercentage: totalAssignments > 0 ? Math.round((ratingCount / totalAssignments) * 100) : 0
      },
      productivity: {
        totalHours: Math.round(totalHours * 100) / 100,
        totalAssignments: totalAssignments,
        averageHoursPerMonth: Object.keys(monthlyTrends).length > 0 ? 
          Math.round((totalHours / Object.keys(monthlyTrends).length) * 100) / 100 : 0
      },
      attendance: {
        lateArrivals: totalLateArrivals,
        earlyDepartures: totalEarlyDepartures,
        totalBreakTime: totalBreakTime,
        punctualityScore: totalAssignments > 0 ? 
          Math.round(((totalAssignments - totalLateArrivals - totalEarlyDepartures) / totalAssignments) * 100) : 100
      }
    };

    const performance = {
      summary: {
        totalAssignments: totalAssignments,
        totalHours: Math.round(totalHours * 100) / 100,
        totalPayment: Math.round(totalPayment * 100) / 100,
        averageRating: Math.round(averageRating * 100) / 100,
        ratingCount: ratingCount
      },
      metrics: performanceMetrics,
      breakdowns: {
        byDepartment: departmentBreakdown
      },
      trends: {
        monthly: monthlyTrends
      },
      recentAssignments: assignments.slice(0, 10).map(a => ({
        id: a.id,
        job: a.job,
        totalHours: a.totalHours,
        totalPayment: a.totalPayment,
        rating: a.rating,
        feedback: a.feedback,
        completedAt: a.completedAt
      }))
    };

    res.json({
      message: 'Staff performance details retrieved successfully',
      staff,
      performance
    });
  } catch (error) {
    console.error('Staff performance details error:', error);
    res.status(500).json({
      error: 'Failed to fetch staff performance details',
      message: error.message
    });
  }
});

// Get performance comparison between staff
router.get('/comparison', async (req, res) => {
  try {
    const { userIds, startDate, endDate, metric } = req.query;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length < 2) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'At least 2 user IDs are required for comparison'
      });
    }

    const whereClause = {
      userId: { [Op.in]: userIds },
      status: 'COMPLETED'
    };

    if (startDate || endDate) {
      whereClause.completedAt = {};
      if (startDate) whereClause.completedAt[Op.gte] = new Date(startDate);
      if (endDate) whereClause.completedAt[Op.lte] = new Date(endDate);
    }

    const assignments = await JobAssignment.findAll({
      where: whereClause,
      include: [
        {
          model: Job,
          as: 'job',
          attributes: ['id', 'title', 'department', 'location']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'department']
        }
      ]
    });

    // Group by user
    const userComparison = {};
    assignments.forEach(assignment => {
      const userId = assignment.user.id;
      if (!userComparison[userId]) {
        userComparison[userId] = {
          user: assignment.user,
          totalAssignments: 0,
          totalHours: 0,
          totalPayment: 0,
          totalRatings: 0,
          ratingCount: 0,
          averageRating: 0
        };
      }

      userComparison[userId].totalAssignments += 1;
      userComparison[userId].totalHours += parseFloat(assignment.totalHours) || 0;
      userComparison[userId].totalPayment += parseFloat(assignment.totalPayment) || 0;
      userComparison[userId].totalRatings += assignment.rating || 0;
      if (assignment.rating) userComparison[userId].ratingCount += 1;
    });

    // Calculate averages
    Object.values(userComparison).forEach(user => {
      user.averageRating = user.ratingCount > 0 ? Math.round((user.totalRatings / user.ratingCount) * 100) / 100 : 0;
      user.totalHours = Math.round(user.totalHours * 100) / 100;
      user.totalPayment = Math.round(user.totalPayment * 100) / 100;
    });

    // Sort by specified metric
    const comparisonData = Object.values(userComparison);
    if (metric === 'rating') {
      comparisonData.sort((a, b) => b.averageRating - a.averageRating);
    } else if (metric === 'hours') {
      comparisonData.sort((a, b) => b.totalHours - a.totalHours);
    } else if (metric === 'assignments') {
      comparisonData.sort((a, b) => b.totalAssignments - a.totalAssignments);
    } else if (metric === 'payment') {
      comparisonData.sort((a, b) => b.totalPayment - a.totalPayment);
    }

    res.json({
      message: 'Staff performance comparison retrieved successfully',
      comparison: comparisonData,
      metric: metric || 'rating'
    });
  } catch (error) {
    console.error('Performance comparison error:', error);
    res.status(500).json({
      error: 'Failed to fetch performance comparison',
      message: error.message
    });
  }
});

module.exports = router;
