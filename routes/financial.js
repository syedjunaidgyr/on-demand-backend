const express = require('express');
const { Op } = require('sequelize');
const { User, Job, JobAssignment, CheckIn, Hospital } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

const router = express.Router();

// Apply authentication and HR authorization to all routes
router.use(authenticate);
router.use(authorize('HR', 'ADMIN'));

// Get financial dashboard overview
router.get('/dashboard', async (req, res) => {
  try {
    const { startDate, endDate, department, location } = req.query;
    
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    // Use provided dates or default to current month
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
            ...(department && { department }),
            ...(location && { location: { [Op.like]: `%${location}%` } })
          },
          attributes: ['id', 'title', 'department', 'location', 'hourlyRate', 'facilityName']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'department']
        }
      ],
      order: [['completedAt', 'DESC']]
    });

    // Calculate financial metrics
    const totalPayment = assignments.reduce((sum, a) => sum + (parseFloat(a.totalPayment) || 0), 0);
    const totalHours = assignments.reduce((sum, a) => sum + (parseFloat(a.totalHours) || 0), 0);
    const averageHourlyRate = totalHours > 0 ? totalPayment / totalHours : 0;

    // Department breakdown
    const departmentBreakdown = {};
    assignments.forEach(assignment => {
      const dept = assignment.job.department;
      if (!departmentBreakdown[dept]) {
        departmentBreakdown[dept] = {
          totalPayment: 0,
          totalHours: 0,
          assignmentCount: 0,
          averageRate: 0
        };
      }
      departmentBreakdown[dept].totalPayment += parseFloat(assignment.totalPayment) || 0;
      departmentBreakdown[dept].totalHours += parseFloat(assignment.totalHours) || 0;
      departmentBreakdown[dept].assignmentCount += 1;
    });

    // Calculate average rates for each department
    Object.keys(departmentBreakdown).forEach(dept => {
      const deptData = departmentBreakdown[dept];
      deptData.averageRate = deptData.totalHours > 0 ? deptData.totalPayment / deptData.totalHours : 0;
    });

    // Role breakdown
    const roleBreakdown = {};
    assignments.forEach(assignment => {
      const role = assignment.user.role;
      if (!roleBreakdown[role]) {
        roleBreakdown[role] = {
          totalPayment: 0,
          totalHours: 0,
          assignmentCount: 0,
          averageRate: 0
        };
      }
      roleBreakdown[role].totalPayment += parseFloat(assignment.totalPayment) || 0;
      roleBreakdown[role].totalHours += parseFloat(assignment.totalHours) || 0;
      roleBreakdown[role].assignmentCount += 1;
    });

    // Calculate average rates for each role
    Object.keys(roleBreakdown).forEach(role => {
      const roleData = roleBreakdown[role];
      roleData.averageRate = roleData.totalHours > 0 ? roleData.totalPayment / roleData.totalHours : 0;
    });

    // Monthly trends (last 6 months)
    const monthlyTrends = {};
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
      const monthKey = monthStart.toISOString().substring(0, 7); // YYYY-MM
      
      const monthAssignments = assignments.filter(a => {
        const completedDate = new Date(a.completedAt);
        return completedDate >= monthStart && completedDate <= monthEnd;
      });
      
      monthlyTrends[monthKey] = {
        totalPayment: monthAssignments.reduce((sum, a) => sum + (parseFloat(a.totalPayment) || 0), 0),
        totalHours: monthAssignments.reduce((sum, a) => sum + (parseFloat(a.totalHours) || 0), 0),
        assignmentCount: monthAssignments.length
      };
    }

    // Top earners
    const userEarnings = {};
    assignments.forEach(assignment => {
      const userId = assignment.user.id;
      if (!userEarnings[userId]) {
        userEarnings[userId] = {
          user: assignment.user,
          totalEarnings: 0,
          totalHours: 0,
          assignmentCount: 0
        };
      }
      userEarnings[userId].totalEarnings += parseFloat(assignment.totalPayment) || 0;
      userEarnings[userId].totalHours += parseFloat(assignment.totalHours) || 0;
      userEarnings[userId].assignmentCount += 1;
    });

    const topEarners = Object.values(userEarnings)
      .sort((a, b) => b.totalEarnings - a.totalEarnings)
      .slice(0, 10);

    // Cost per department
    const costPerDepartment = Object.keys(departmentBreakdown).map(dept => ({
      department: dept,
      totalCost: departmentBreakdown[dept].totalPayment,
      totalHours: departmentBreakdown[dept].totalHours,
      averageRate: departmentBreakdown[dept].averageRate,
      assignmentCount: departmentBreakdown[dept].assignmentCount
    })).sort((a, b) => b.totalCost - a.totalCost);

    const dashboard = {
      period: {
        startDate: queryStartDate,
        endDate: queryEndDate
      },
      summary: {
        totalAssignments: assignments.length,
        totalPayment: Math.round(totalPayment * 100) / 100,
        totalHours: Math.round(totalHours * 100) / 100,
        averageHourlyRate: Math.round(averageHourlyRate * 100) / 100,
        averagePaymentPerAssignment: assignments.length > 0 ? Math.round((totalPayment / assignments.length) * 100) / 100 : 0
      },
      breakdowns: {
        byDepartment: departmentBreakdown,
        byRole: roleBreakdown,
        costPerDepartment: costPerDepartment
      },
      trends: {
        monthly: monthlyTrends
      },
      topPerformers: {
        topEarners: topEarners
      },
      recentTransactions: assignments.slice(0, 10).map(a => ({
        id: a.id,
        user: a.user,
        job: a.job,
        totalPayment: a.totalPayment,
        totalHours: a.totalHours,
        completedAt: a.completedAt
      }))
    };

    res.json({
      message: 'Financial dashboard data retrieved successfully',
      dashboard
    });
  } catch (error) {
    console.error('Financial dashboard error:', error);
    res.status(500).json({
      error: 'Failed to fetch financial dashboard data',
      message: error.message
    });
  }
});

// Get payment summary by user
router.get('/payments/user/:userId', async (req, res) => {
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
          attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'department']
        }
      ],
      order: [['completedAt', 'DESC']]
    });

    const totalEarnings = assignments.reduce((sum, a) => sum + (parseFloat(a.totalPayment) || 0), 0);
    const totalHours = assignments.reduce((sum, a) => sum + (parseFloat(a.totalHours) || 0), 0);
    const averageHourlyRate = totalHours > 0 ? totalEarnings / totalHours : 0;

    // Monthly breakdown
    const monthlyBreakdown = {};
    assignments.forEach(assignment => {
      const month = new Date(assignment.completedAt).toISOString().substring(0, 7);
      if (!monthlyBreakdown[month]) {
        monthlyBreakdown[month] = {
          totalPayment: 0,
          totalHours: 0,
          assignmentCount: 0
        };
      }
      monthlyBreakdown[month].totalPayment += parseFloat(assignment.totalPayment) || 0;
      monthlyBreakdown[month].totalHours += parseFloat(assignment.totalHours) || 0;
      monthlyBreakdown[month].assignmentCount += 1;
    });

    res.json({
      message: 'User payment summary retrieved successfully',
      user: assignments[0]?.user || null,
      summary: {
        totalAssignments: assignments.length,
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        totalHours: Math.round(totalHours * 100) / 100,
        averageHourlyRate: Math.round(averageHourlyRate * 100) / 100
      },
      monthlyBreakdown,
      assignments: assignments.map(a => ({
        id: a.id,
        job: a.job,
        totalPayment: a.totalPayment,
        totalHours: a.totalHours,
        completedAt: a.completedAt,
        rating: a.rating,
        feedback: a.feedback
      }))
    });
  } catch (error) {
    console.error('User payment summary error:', error);
    res.status(500).json({
      error: 'Failed to fetch user payment summary',
      message: error.message
    });
  }
});

// Get cost analysis by department
router.get('/cost-analysis/department', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    const queryStartDate = startDate ? new Date(startDate) : startOfMonth;
    const queryEndDate = endDate ? new Date(endDate) : endOfMonth;

    const assignments = await JobAssignment.findAll({
      where: {
        status: 'COMPLETED',
        completedAt: {
          [Op.between]: [queryStartDate, queryEndDate]
        }
      },
      include: [
        {
          model: Job,
          as: 'job',
          attributes: ['id', 'title', 'department', 'location', 'facilityName', 'hourlyRate']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'role', 'department']
        }
      ]
    });

    const departmentAnalysis = {};
    
    assignments.forEach(assignment => {
      const dept = assignment.job.department;
      if (!departmentAnalysis[dept]) {
        departmentAnalysis[dept] = {
          totalCost: 0,
          totalHours: 0,
          assignmentCount: 0,
          staffCount: new Set(),
          averageRate: 0,
          costPerAssignment: 0,
          topStaff: {}
        };
      }
      
      departmentAnalysis[dept].totalCost += parseFloat(assignment.totalPayment) || 0;
      departmentAnalysis[dept].totalHours += parseFloat(assignment.totalHours) || 0;
      departmentAnalysis[dept].assignmentCount += 1;
      departmentAnalysis[dept].staffCount.add(assignment.user.id);
      
      // Track top staff in department
      const userId = assignment.user.id;
      if (!departmentAnalysis[dept].topStaff[userId]) {
        departmentAnalysis[dept].topStaff[userId] = {
          user: assignment.user,
          totalEarnings: 0,
          totalHours: 0,
          assignmentCount: 0
        };
      }
      departmentAnalysis[dept].topStaff[userId].totalEarnings += parseFloat(assignment.totalPayment) || 0;
      departmentAnalysis[dept].topStaff[userId].totalHours += parseFloat(assignment.totalHours) || 0;
      departmentAnalysis[dept].topStaff[userId].assignmentCount += 1;
    });

    // Calculate derived metrics
    Object.keys(departmentAnalysis).forEach(dept => {
      const data = departmentAnalysis[dept];
      data.staffCount = data.staffCount.size;
      data.averageRate = data.totalHours > 0 ? data.totalCost / data.totalHours : 0;
      data.costPerAssignment = data.assignmentCount > 0 ? data.totalCost / data.assignmentCount : 0;
      
      // Convert topStaff to array and sort
      data.topStaff = Object.values(data.topStaff)
        .sort((a, b) => b.totalEarnings - a.totalEarnings)
        .slice(0, 5);
    });

    const analysis = Object.keys(departmentAnalysis).map(dept => ({
      department: dept,
      ...departmentAnalysis[dept],
      totalCost: Math.round(departmentAnalysis[dept].totalCost * 100) / 100,
      averageRate: Math.round(departmentAnalysis[dept].averageRate * 100) / 100,
      costPerAssignment: Math.round(departmentAnalysis[dept].costPerAssignment * 100) / 100
    })).sort((a, b) => b.totalCost - a.totalCost);

    res.json({
      message: 'Department cost analysis retrieved successfully',
      period: {
        startDate: queryStartDate,
        endDate: queryEndDate
      },
      analysis
    });
  } catch (error) {
    console.error('Department cost analysis error:', error);
    res.status(500).json({
      error: 'Failed to fetch department cost analysis',
      message: error.message
    });
  }
});

// Get budget vs actual spending
router.get('/budget-analysis', async (req, res) => {
  try {
    const { startDate, endDate, budget } = req.query;
    
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    const queryStartDate = startDate ? new Date(startDate) : startOfMonth;
    const queryEndDate = endDate ? new Date(endDate) : endOfMonth;
    const budgetAmount = budget ? parseFloat(budget) : null;

    const assignments = await JobAssignment.findAll({
      where: {
        status: 'COMPLETED',
        completedAt: {
          [Op.between]: [queryStartDate, queryEndDate]
        }
      },
      include: [
        {
          model: Job,
          as: 'job',
          attributes: ['id', 'title', 'department', 'location', 'facilityName']
        }
      ]
    });

    const actualSpending = assignments.reduce((sum, a) => sum + (parseFloat(a.totalPayment) || 0), 0);
    const totalHours = assignments.reduce((sum, a) => sum + (parseFloat(a.totalHours) || 0), 0);

    const budgetAnalysis = {
      period: {
        startDate: queryStartDate,
        endDate: queryEndDate
      },
      budget: {
        allocated: budgetAmount,
        actual: Math.round(actualSpending * 100) / 100,
        variance: budgetAmount ? Math.round((actualSpending - budgetAmount) * 100) / 100 : null,
        variancePercentage: budgetAmount ? Math.round(((actualSpending - budgetAmount) / budgetAmount) * 100 * 100) / 100 : null,
        isOverBudget: budgetAmount ? actualSpending > budgetAmount : null
      },
      metrics: {
        totalAssignments: assignments.length,
        totalHours: Math.round(totalHours * 100) / 100,
        averageCostPerHour: totalHours > 0 ? Math.round((actualSpending / totalHours) * 100) / 100 : 0,
        averageCostPerAssignment: assignments.length > 0 ? Math.round((actualSpending / assignments.length) * 100) / 100 : 0
      },
      dailySpending: {}
    };

    // Calculate daily spending
    assignments.forEach(assignment => {
      const date = new Date(assignment.completedAt).toISOString().split('T')[0];
      if (!budgetAnalysis.dailySpending[date]) {
        budgetAnalysis.dailySpending[date] = 0;
      }
      budgetAnalysis.dailySpending[date] += parseFloat(assignment.totalPayment) || 0;
    });

    // Convert daily spending to array format
    budgetAnalysis.dailySpending = Object.keys(budgetAnalysis.dailySpending).map(date => ({
      date,
      amount: Math.round(budgetAnalysis.dailySpending[date] * 100) / 100
    })).sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({
      message: 'Budget analysis retrieved successfully',
      analysis: budgetAnalysis
    });
  } catch (error) {
    console.error('Budget analysis error:', error);
    res.status(500).json({
      error: 'Failed to fetch budget analysis',
      message: error.message
    });
  }
});

module.exports = router;
