const express = require('express');
const { Op } = require('sequelize');
const { CheckIn, JobAssignment, Job, User } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes here require HR or ADMIN
router.use(authenticate);
router.use(authorize('HR', 'ADMIN'));

// GET /api/v1/check-ins?approvalStatus=pending
router.get('/check-ins', async (req, res) => {
  try {
    const { approvalStatus } = req.query;

    const where = {};
    if (approvalStatus) {
      // Normalize to uppercase for storage enums
      where.approvalStatus = String(approvalStatus).toUpperCase();
    }

    const checkIns = await CheckIn.findAll({
      where,
      order: [['checkInTime', 'DESC']],
      include: [
        {
          model: JobAssignment,
          as: 'jobAssignment',
          attributes: ['id', 'jobId', 'userId'],
          include: [
            {
              model: Job,
              as: 'job',
              attributes: ['id', 'title', 'facilityName', 'location']
            },
            {
              model: User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName']
            }
          ]
        }
      ]
    });

    const data = (checkIns || []).map(ci => {
      const plain = ci.toJSON();
      return {
        id: plain.id,
        jobAssignmentId: plain.jobAssignmentId,
        checkInTime: plain.checkInTime,
        approvalStatus: plain.approvalStatus,
        approvedBy: plain.approvedBy || null,
        approvedAt: plain.approvedAt || null,
        rejectionReason: plain.rejectionReason || null,
        job: plain.jobAssignment?.job || null,
        user: plain.jobAssignment?.user || null
      };
    });

    res.json(data);
  } catch (error) {
    console.error('List check-ins error:', error);
    res.status(500).json({ error: 'Failed to fetch check-ins', message: error.message });
  }
});

// POST /api/v1/check-ins/:checkInId/approve
router.post('/check-ins/:checkInId/approve', async (req, res) => {
  try {
    const { checkInId } = req.params;
    const { note } = req.body || {};

    const checkIn = await CheckIn.findByPk(checkInId, {
      include: [
        { model: JobAssignment, as: 'jobAssignment', include: [
          { model: Job, as: 'job', attributes: ['id','title','facilityName','location'] },
          { model: User, as: 'user', attributes: ['id','firstName','lastName'] }
        ]}
      ]
    });

    if (!checkIn) {
      return res.status(404).json({ error: 'Not found', message: 'Check-in not found' });
    }

    // If already approved/rejected, make idempotent
    if (checkIn.approvalStatus === 'APPROVED') {
      return res.json({
        id: checkIn.id,
        jobAssignmentId: checkIn.jobAssignmentId,
        checkInTime: checkIn.checkInTime,
        approvalStatus: checkIn.approvalStatus,
        approvedBy: checkIn.approvedBy,
        approvedAt: checkIn.approvedAt,
        rejectionReason: checkIn.rejectionReason || null,
        job: checkIn.jobAssignment?.job || null,
        user: checkIn.jobAssignment?.user || null
      });
    }

    checkIn.approvalStatus = 'APPROVED';
    checkIn.approvedBy = req.userId;
    checkIn.approvedAt = new Date();
    if (note) {
      const existing = checkIn.supervisorNotes || '';
      checkIn.supervisorNotes = existing ? `${existing}\n${note}` : note;
    }
    await checkIn.save();

  // On approval, mark related job assignment as IN_PROGRESS and set startedAt if not already
  if (checkIn.jobAssignment) {
    const assignment = checkIn.jobAssignment;
    if (assignment.status !== 'IN_PROGRESS') {
      await assignment.update({ status: 'IN_PROGRESS', startedAt: new Date() });
    } else if (!assignment.startedAt) {
      await assignment.update({ startedAt: new Date() });
    }
  }

    return res.json({
      id: checkIn.id,
      jobAssignmentId: checkIn.jobAssignmentId,
      checkInTime: checkIn.checkInTime,
      approvalStatus: checkIn.approvalStatus,
      approvedBy: checkIn.approvedBy,
      approvedAt: checkIn.approvedAt,
      rejectionReason: checkIn.rejectionReason || null,
      job: checkIn.jobAssignment?.job || null,
      user: checkIn.jobAssignment?.user || null
    });
  } catch (error) {
    console.error('Approve check-in error:', error);
    res.status(500).json({ error: 'Failed to approve check-in', message: error.message });
  }
});

// POST /api/v1/check-ins/:checkInId/reject
router.post('/check-ins/:checkInId/reject', async (req, res) => {
  try {
    const { checkInId } = req.params;
    const { rejectionReason } = req.body || {};

    if (!rejectionReason || String(rejectionReason).trim().length === 0) {
      return res.status(400).json({ error: 'Invalid input', message: 'rejectionReason is required' });
    }

    const checkIn = await CheckIn.findByPk(checkInId, {
      include: [
        { model: JobAssignment, as: 'jobAssignment', include: [
          { model: Job, as: 'job', attributes: ['id','title','facilityName','location'] },
          { model: User, as: 'user', attributes: ['id','firstName','lastName'] }
        ]}
      ]
    });

    if (!checkIn) {
      return res.status(404).json({ error: 'Not found', message: 'Check-in not found' });
    }

    // If already rejected, idempotent response
    if (checkIn.approvalStatus === 'REJECTED') {
      return res.json({
        id: checkIn.id,
        jobAssignmentId: checkIn.jobAssignmentId,
        checkInTime: checkIn.checkInTime,
        approvalStatus: checkIn.approvalStatus,
        approvedBy: checkIn.approvedBy,
        approvedAt: checkIn.approvedAt,
        rejectionReason: checkIn.rejectionReason || null,
        job: checkIn.jobAssignment?.job || null,
        user: checkIn.jobAssignment?.user || null
      });
    }

    checkIn.approvalStatus = 'REJECTED';
    checkIn.rejectionReason = rejectionReason;
    await checkIn.save();

    return res.json({
      id: checkIn.id,
      jobAssignmentId: checkIn.jobAssignmentId,
      checkInTime: checkIn.checkInTime,
      approvalStatus: checkIn.approvalStatus,
      approvedBy: checkIn.approvedBy,
      approvedAt: checkIn.approvedAt,
      rejectionReason: checkIn.rejectionReason || null,
      job: checkIn.jobAssignment?.job || null,
      user: checkIn.jobAssignment?.user || null
    });
  } catch (error) {
    console.error('Reject check-in error:', error);
    res.status(500).json({ error: 'Failed to reject check-in', message: error.message });
  }
});

module.exports = router;


