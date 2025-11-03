const express = require('express');
const { Op } = require('sequelize');
const { User, Hospital, Job, JobAssignment, AgencyHospital, AgencyNurse, AssignmentSegment, CheckIn } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

const router = express.Router();
// List all agencies (ADMIN/HR). Optional status filter for hospital links summary.
router.get('/list', authenticate, authorize('ADMIN', 'HR'), async (req, res) => {
  try {
    const { includeHospitals, linkStatus } = req.query;

    const agencies = await User.findAll({
      where: { role: 'AGENCY', isActive: true },
      attributes: { exclude: ['password'] }
    });

    if (!includeHospitals) {
      return res.json({ agencies });
    }

    const agencyIds = agencies.map(a => a.id);
    const links = await AgencyHospital.findAll({
      where: {
        agencyId: { [Op.in]: agencyIds },
        ...(linkStatus ? { status: linkStatus } : {})
      },
      include: [{ model: Hospital, as: 'hospital' }]
    });

    const byAgencyId = links.reduce((acc, l) => {
      (acc[l.agencyId] = acc[l.agencyId] || []).push(l);
      return acc;
    }, {});

    const enriched = agencies.map(a => ({
      ...a.toJSON(),
      linkedHospitals: (byAgencyId[a.id] || []).map(x => ({ status: x.status, onboardedAt: x.onboardedAt, hospital: x.hospital }))
    }));

    return res.json({ agencies: enriched });
  } catch (error) {
    console.error('List agencies error:', error);
    return res.status(500).json({ error: 'Failed to list agencies', message: error.message });
  }
});

// Get agencies by hospital (default APPROVED)
router.get('/hospitals/:hospitalId/agencies', authenticate, authorize('ADMIN', 'HR', 'AGENCY', 'HOSPITAL_ADMIN'), async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const { status = 'APPROVED' } = req.query;

    // Scope enforcement for Hospital Admins: can only view their own hospital
    if (req.user.role === 'HOSPITAL_ADMIN' && req.user.hospitalId !== parseInt(hospitalId)) {
      return res.status(403).json({ error: 'Access denied', message: 'Cannot view other hospital' });
    }

    const links = await AgencyHospital.findAll({
      where: { hospitalId, ...(status ? { status } : {}) },
      include: [
        { model: User, as: 'agency', attributes: { exclude: ['password'] } },
        { model: Hospital, as: 'hospital' }
      ]
    });

    const agencies = links.map(l => l.agency);
    return res.json({ hospitalId, status, agencies, links });
  } catch (error) {
    console.error('Get agencies by hospital error:', error);
    return res.status(500).json({ error: 'Failed to fetch agencies for hospital', message: error.message });
  }
});

// Agency dashboard (for agency user)
router.get('/dashboard', authenticate, authorize('AGENCY'), async (req, res) => {
  try {
    const agencyId = req.user.id;

    // Linked hospitals (approved)
    const links = await AgencyHospital.findAll({ where: { agencyId, status: 'APPROVED' }, include: [{ model: Hospital, as: 'hospital' }] });
    const hospitalIds = links.map(l => l.hospitalId);

    // Nurse pool by status
    const poolApproved = await AgencyNurse.count({ where: { agencyId, status: 'APPROVED' } });
    const poolPending = await AgencyNurse.count({ where: { agencyId, status: 'PENDING' } });
    const poolRevoked = await AgencyNurse.count({ where: { agencyId, status: 'REVOKED' } });

    // Assignments overview (current and recent)
    const activeAssignments = await JobAssignment.count({ where: { agencyId, status: ['ASSIGNED', 'IN_PROGRESS'] } });
    const completed30Days = await JobAssignment.count({
      where: {
        agencyId,
        status: 'COMPLETED',
        completedAt: { [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }
    });

    // Upcoming jobs from linked hospitals
    let upcomingJobs = 0;
    if (hospitalIds.length > 0) {
      upcomingJobs = await Job.count({ where: { hospitalId: { [Op.in]: hospitalIds }, requiredRole: 'NURSE', status: 'ACTIVE', startDate: { [Op.gte]: new Date() } } });
    }

    // Blacklisted count for this agency
    const blacklistedCount = await AgencyHospital.count({ where: { agencyId, status: 'REVOKED' } });

    return res.json({
      hospitals: { total: links.length, items: links.map(l => l.hospital) },
      pool: { approved: poolApproved, pending: poolPending, revoked: poolRevoked },
      assignments: { active: activeAssignments, completed30Days },
      jobs: { upcoming: upcomingJobs },
      blacklist: { blacklistedHospitals: blacklistedCount }
    });
  } catch (error) {
    console.error('Agency dashboard error:', error);
    return res.status(500).json({ error: 'Failed to load agency dashboard', message: error.message });
  }
});

// Admin/HR dashboard for agencies
router.get('/admin/dashboard', authenticate, authorize('ADMIN', 'HR'), async (req, res) => {
  try {
    const totalAgencies = await User.count({ where: { role: 'AGENCY', isActive: true } });
    const approvedLinks = await AgencyHospital.count({ where: { status: 'APPROVED' } });
    const pendingLinks = await AgencyHospital.count({ where: { status: 'PENDING' } });
    const blacklistedLinks = await AgencyHospital.count({ where: { status: 'REVOKED' } });

    const poolApproved = await AgencyNurse.count({ where: { status: 'APPROVED' } });
    const poolPending = await AgencyNurse.count({ where: { status: 'PENDING' } });

    const activeAssignments = await JobAssignment.count({ where: { status: ['ASSIGNED', 'IN_PROGRESS'] } });
    const completed30Days = await JobAssignment.count({ where: { status: 'COMPLETED', completedAt: { [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } });

    return res.json({
      agencies: { total: totalAgencies },
      hospitalLinks: { approved: approvedLinks, pending: pendingLinks, blacklisted: blacklistedLinks },
      pool: { approved: poolApproved, pending: poolPending },
      assignments: { active: activeAssignments, completed30Days }
    });
  } catch (error) {
    console.error('Agency admin dashboard error:', error);
    return res.status(500).json({ error: 'Failed to load admin agency dashboard', message: error.message });
  }
});

// Blacklist agency for a hospital (ADMIN/HR/HOSPITAL_ADMIN)
router.post('/:agencyId/hospitals/:hospitalId/blacklist', authenticate, authorize('ADMIN', 'HR', 'HOSPITAL_ADMIN'), validate(schemas.agencyBlacklist), async (req, res) => {
  try {
    const { agencyId, hospitalId } = req.params;
    const { reasonCategory, reasonDetails } = req.body;

    // Scope enforcement for Hospital Admins: can only act on their own hospital
    if (req.user.role === 'HOSPITAL_ADMIN' && req.user.hospitalId !== parseInt(hospitalId)) {
      return res.status(403).json({ error: 'Access denied', message: 'Cannot modify other hospital' });
    }

    const link = await AgencyHospital.findOne({ where: { agencyId, hospitalId } });
    if (!link) {
      return res.status(404).json({ error: 'Not found', message: 'Agency-hospital link not found' });
    }

    const finalReason = reasonDetails ? `${reasonCategory}: ${reasonDetails}` : reasonCategory;
    await link.update({ status: 'REVOKED', blacklistReason: finalReason, blacklistedBy: req.user.id, blacklistedAt: new Date() });

    return res.json({ message: 'Agency blacklisted for hospital', link });
  } catch (error) {
    console.error('Blacklist agency error:', error);
    return res.status(500).json({ error: 'Failed to blacklist agency', message: error.message });
  }
});

// Restore agency for a hospital (ADMIN/HR/HOSPITAL_ADMIN)
router.post('/:agencyId/hospitals/:hospitalId/restore', authenticate, authorize('ADMIN', 'HR', 'HOSPITAL_ADMIN'), async (req, res) => {
  try {
    const { agencyId, hospitalId } = req.params;
    // Scope enforcement for Hospital Admins: can only act on their own hospital
    if (req.user.role === 'HOSPITAL_ADMIN' && req.user.hospitalId !== parseInt(hospitalId)) {
      return res.status(403).json({ error: 'Access denied', message: 'Cannot modify other hospital' });
    }
    const link = await AgencyHospital.findOne({ where: { agencyId, hospitalId } });
    if (!link) {
      return res.status(404).json({ error: 'Not found', message: 'Agency-hospital link not found' });
    }
    await link.update({ status: 'APPROVED', blacklistReason: null, blacklistedBy: null, blacklistedAt: null });
    return res.json({ message: 'Agency restored for hospital', link });
  } catch (error) {
    console.error('Restore agency error:', error);
    return res.status(500).json({ error: 'Failed to restore agency', message: error.message });
  }
});

// Get blacklisted agencies for a hospital (ADMIN/HR/HOSPITAL_ADMIN)
router.get('/hospitals/:hospitalId/blacklisted', authenticate, authorize('ADMIN', 'HR', 'HOSPITAL_ADMIN'), async (req, res) => {
  try {
    const { hospitalId } = req.params;
    // Scope enforcement for Hospital Admins: can only view their own hospital
    if (req.user.role === 'HOSPITAL_ADMIN' && req.user.hospitalId !== parseInt(hospitalId)) {
      return res.status(403).json({ error: 'Access denied', message: 'Cannot view other hospital' });
    }
    const { q, from, to } = req.query;
    const where = { hospitalId, status: 'REVOKED' };
    if (q) where.blacklistReason = { [Op.like]: `%${q}%` };
    if (from || to) {
      where.blacklistedAt = {};
      if (from) where.blacklistedAt[Op.gte] = new Date(from);
      if (to) where.blacklistedAt[Op.lte] = new Date(to);
    }
    const links = await AgencyHospital.findAll({
      where,
      include: [
        { model: User, as: 'agency', attributes: { exclude: ['password'] } },
        { model: Hospital, as: 'hospital' }
      ],
      order: [['blacklistedAt', 'DESC']]
    });
    return res.json({ hospitalId, count: links.length, links });
  } catch (error) {
    console.error('Get blacklisted agencies by hospital error:', error);
    return res.status(500).json({ error: 'Failed to fetch blacklisted agencies', message: error.message });
  }
});

// Get blacklisted hospitals for an agency (AGENCY/HR/ADMIN)
router.get('/:agencyId/blacklisted-hospitals', authenticate, authorize('ADMIN', 'HR', 'AGENCY'), async (req, res) => {
  try {
    const { agencyId } = req.params;
    const { q, from, to } = req.query;
    if (req.user.role === 'AGENCY' && req.user.id !== parseInt(agencyId)) {
      return res.status(403).json({ error: 'Access denied', message: 'Cannot view other agency' });
    }
    const where = { agencyId, status: 'REVOKED' };
    if (q) where.blacklistReason = { [Op.like]: `%${q}%` };
    if (from || to) {
      where.blacklistedAt = {};
      if (from) where.blacklistedAt[Op.gte] = new Date(from);
      if (to) where.blacklistedAt[Op.lte] = new Date(to);
    }
    const links = await AgencyHospital.findAll({
      where,
      include: [{ model: Hospital, as: 'hospital' }],
      order: [['blacklistedAt', 'DESC']]
    });
    return res.json({ agencyId, count: links.length, links, hospitals: links.map(l => l.hospital) });
  } catch (error) {
    console.error('Get blacklisted hospitals for agency error:', error);
    return res.status(500).json({ error: 'Failed to fetch blacklisted hospitals', message: error.message });
  }
});

// Get all blacklisted links (ADMIN/HR) with filters
router.get('/blacklisted', authenticate, authorize('ADMIN', 'HR'), async (req, res) => {
  try {
    const { hospitalId, agencyId, q, from, to } = req.query;
    const where = { status: 'REVOKED' };
    if (hospitalId) where.hospitalId = hospitalId;
    if (agencyId) where.agencyId = agencyId;
    if (q) where.blacklistReason = { [Op.like]: `%${q}%` };
    if (from || to) {
      where.blacklistedAt = {};
      if (from) where.blacklistedAt[Op.gte] = new Date(from);
      if (to) where.blacklistedAt[Op.lte] = new Date(to);
    }
    const links = await AgencyHospital.findAll({
      where,
      include: [
        { model: User, as: 'agency', attributes: { exclude: ['password'] } },
        { model: Hospital, as: 'hospital' }
      ],
      order: [['blacklistedAt', 'DESC']]
    });
    return res.json({ count: links.length, links });
  } catch (error) {
    console.error('Get all blacklisted links error:', error);
    return res.status(500).json({ error: 'Failed to fetch blacklisted links', message: error.message });
  }
});
// Nurse-initiated join request to an agency (creates PENDING membership)
router.post('/:agencyId/join', authenticate, authorize('NURSE', 'ADMIN', 'HR'), async (req, res) => {
  try {
    const { agencyId } = req.params;
    // Nurses can only request for themselves
    if (req.user.role === 'NURSE' && !req.user.isActive) {
      return res.status(403).json({ error: 'Access denied', message: 'Inactive user' });
    }

    const agency = await User.findByPk(agencyId);
    if (!agency || agency.role !== 'AGENCY') {
      return res.status(404).json({ error: 'Not found', message: 'Agency not found' });
    }

    // Restrict nurse to a single active agency (PENDING/APPROVED) across all agencies
    const existingActiveMembership = await AgencyNurse.findOne({
      where: {
        nurseId: req.user.id,
        agencyId: { [Op.ne]: agency.id },
        status: ['PENDING', 'APPROVED']
      }
    });
    if (existingActiveMembership) {
      return res.status(409).json({ error: 'Already in agency', message: 'Nurse already has an active membership with another agency' });
    }

    // Block creating new agency membership if nurse has an active hospital job
    const activeCount = await JobAssignment.count({ where: { userId: req.user.id, status: ['ASSIGNED', 'IN_PROGRESS'] } });

    const [record, created] = await AgencyNurse.findOrCreate({
      where: { agencyId: agency.id, nurseId: req.user.id },
      defaults: { agencyId: agency.id, nurseId: req.user.id, status: 'PENDING', addedBy: req.user.id }
    });

    if (created) {
      if (activeCount > 0) {
        // Rollback newly created membership and block while on a job
        await record.destroy();
        return res.status(409).json({ error: 'Active job', message: 'Cannot join a new agency while on a job' });
      }
      return res.status(201).json({ message: 'Join request submitted', membership: record });
    }

    // Existing membership remains as is
    if (record.status === 'REVOKED') {
      if (activeCount > 0) {
        return res.status(409).json({ error: 'Active job', message: 'Cannot reinstate agency membership while on a job' });
      }
      await record.update({ status: 'PENDING' });
    }
    return res.status(200).json({ message: 'Membership exists', membership: record });
  } catch (error) {
    console.error('Join agency request error:', error);
    return res.status(500).json({ error: 'Failed to submit join request', message: error.message });
  }
});

// Agency approves a nurse request
router.post('/:agencyId/nurses/:nurseId/approve', authenticate, authorize('AGENCY', 'ADMIN', 'HR'), async (req, res) => {
  try {
    const { agencyId, nurseId } = req.params;
    if (req.user.role === 'AGENCY' && req.user.id !== parseInt(agencyId)) {
      return res.status(403).json({ error: 'Access denied', message: 'Cannot approve for other agency' });
    }
    const membership = await AgencyNurse.findOne({ where: { agencyId, nurseId } });
    if (!membership) {
      return res.status(404).json({ error: 'Not found', message: 'Membership not found' });
    }
    // Enforce single active agency per nurse
    const otherActive = await AgencyNurse.findOne({ where: { nurseId, agencyId: { [Op.ne]: agencyId }, status: ['PENDING', 'APPROVED'] } });
    if (otherActive) {
      return res.status(409).json({ error: 'Already in agency', message: 'Nurse already has active membership with another agency' });
    }
    await membership.update({ status: 'APPROVED', approvedBy: req.user.id, approvedAt: new Date() });
    return res.json({ message: 'Nurse approved', membership });
  } catch (error) {
    console.error('Approve nurse error:', error);
    return res.status(500).json({ error: 'Failed to approve nurse', message: error.message });
  }
});

// Agency revokes a nurse membership
router.post('/:agencyId/nurses/:nurseId/revoke', authenticate, authorize('AGENCY', 'ADMIN', 'HR'), async (req, res) => {
  try {
    const { agencyId, nurseId } = req.params;
    if (req.user.role === 'AGENCY' && req.user.id !== parseInt(agencyId)) {
      return res.status(403).json({ error: 'Access denied', message: 'Cannot revoke for other agency' });
    }
    const membership = await AgencyNurse.findOne({ where: { agencyId, nurseId } });
    if (!membership) {
      return res.status(404).json({ error: 'Not found', message: 'Membership not found' });
    }
    await membership.update({ status: 'REVOKED' });
    return res.json({ message: 'Nurse revoked', membership });
  } catch (error) {
    console.error('Revoke nurse error:', error);
    return res.status(500).json({ error: 'Failed to revoke nurse', message: error.message });
  }
});

// Create an agency user (ADMIN or HR)
router.post('/create', authenticate, authorize('ADMIN', 'HR'), validate(schemas.agencyCreate), async (req, res) => {
  try {
    const { email, password, name, phone, address } = req.body;

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Agency exists', message: 'Email already in use' });
    }

    const agency = await User.create({
      email,
      password,
      firstName: name,
      lastName: 'Agency',
      phone: phone || null,
      role: 'AGENCY',
      address: address || null
    });

    return res.status(201).json({ message: 'Agency created', agency: agency.toJSON() });
  } catch (error) {
    console.error('Create agency error:', error);
    return res.status(500).json({ error: 'Failed to create agency', message: error.message });
  }
});

// Link (onboard) agency to multiple hospitals (HR/ADMIN only)
router.post('/:agencyId/hospitals', authenticate, authorize('ADMIN', 'HR'), validate(schemas.agencyLinkHospitals), async (req, res) => {
  try {
    const { agencyId } = req.params;
    const { hospitalIds } = req.body;

    const agency = await User.findByPk(agencyId);
    if (!agency || agency.role !== 'AGENCY') {
      return res.status(404).json({ error: 'Not found', message: 'Agency not found' });
    }

    const hospitals = await Hospital.findAll({ where: { id: { [Op.in]: hospitalIds } } });
    if (hospitals.length !== hospitalIds.length) {
      return res.status(400).json({ error: 'Invalid hospitals', message: 'One or more hospitals not found' });
    }

    const now = new Date();
    const rows = hospitalIds.map(hospitalId => ({ 
      agencyId: agency.id, 
      hospitalId,
      status: 'APPROVED',
      onboardedBy: req.user.id,
      onboardedAt: now
    }));
    await AgencyHospital.bulkCreate(rows, { ignoreDuplicates: true });

    const linked = await AgencyHospital.findAll({ where: { agencyId: agency.id }, include: [{ model: Hospital, as: 'hospital' }] });
    return res.json({ message: 'Hospitals onboarded', linked });
  } catch (error) {
    console.error('Link hospitals error:', error);
    return res.status(500).json({ error: 'Failed to link hospitals', message: error.message });
  }
});

router.get('/:agencyId/hospitals', authenticate, authorize('ADMIN', 'HR', 'AGENCY'), async (req, res) => {
  try {
    const { agencyId } = req.params;
    if (req.user.role === 'AGENCY' && req.user.id !== parseInt(agencyId)) {
      return res.status(403).json({ error: 'Access denied', message: 'Cannot view other agency' });
    }
    const where = { agencyId };
    // Agencies only see approved links
    if (req.user.role === 'AGENCY') where.status = 'APPROVED';
    const linked = await AgencyHospital.findAll({ where, include: [{ model: Hospital, as: 'hospital' }] });
    return res.json({ hospitals: linked.map(r => r.hospital), links: linked });
  } catch (error) {
    console.error('Get linked hospitals error:', error);
    return res.status(500).json({ error: 'Failed to fetch hospitals', message: error.message });
  }
});

// Manage agency nurse pool (direct onboarding by AGENCY/HR/ADMIN -> APPROVED immediately)
router.post('/:agencyId/nurses', authenticate, authorize('ADMIN', 'HR', 'AGENCY'), validate(schemas.agencyManageNurses), async (req, res) => {
  try {
    const { agencyId } = req.params;
    const { nurseIds } = req.body;

    if (req.user.role === 'AGENCY' && req.user.id !== parseInt(agencyId)) {
      return res.status(403).json({ error: 'Access denied', message: 'Cannot modify other agency' });
    }

    const agency = await User.findByPk(agencyId);
    if (!agency || agency.role !== 'AGENCY') {
      return res.status(404).json({ error: 'Not found', message: 'Agency not found' });
    }

    const nurses = await User.findAll({ where: { id: { [Op.in]: nurseIds }, role: 'NURSE', isActive: true } });
    if (nurses.length !== nurseIds.length) {
      return res.status(400).json({ error: 'Invalid nurses', message: 'One or more nurse ids invalid' });
    }

    const now = new Date();
    const results = { added: [], skipped: [] };
    for (const nurseId of nurseIds) {
      // Restrict nurse to a single active agency (PENDING/APPROVED)
      const otherActive = await AgencyNurse.findOne({ where: { nurseId, agencyId: { [Op.ne]: agency.id }, status: ['PENDING', 'APPROVED'] } });
      if (otherActive) {
        results.skipped.push({ nurseId, reason: 'Nurse already has active membership with another agency' });
        continue;
      }

      // If already a member (any status), allow update to APPROVED; else block if nurse on active job
      const activeCount = await JobAssignment.count({ where: { userId: nurseId, status: ['ASSIGNED', 'IN_PROGRESS'] } });
      const existing = await AgencyNurse.findOne({ where: { agencyId: agency.id, nurseId } });
      if (!existing && activeCount > 0) {
        results.skipped.push({ nurseId, reason: 'Nurse is currently on a job' });
        continue;
      }
      if (existing) {
        await existing.update({ status: 'APPROVED', approvedBy: req.user.id, approvedAt: now });
        results.added.push({ nurseId, membershipId: existing.id });
      } else {
        const created = await AgencyNurse.create({ agencyId: agency.id, nurseId, status: 'APPROVED', addedBy: req.user.id, approvedBy: req.user.id, approvedAt: now });
        results.added.push({ nurseId, membershipId: created.id });
      }
    }

    const pool = await AgencyNurse.findAll({ where: { agencyId: agency.id }, include: [{ model: User, as: 'nurse', attributes: { exclude: ['password'] } }] });
    return res.json({ message: 'Nurses processed', results, pool });
  } catch (error) {
    console.error('Manage nurse pool error:', error);
    return res.status(500).json({ error: 'Failed to add nurses', message: error.message });
  }
});

router.get('/:agencyId/nurses', authenticate, authorize('ADMIN', 'HR', 'AGENCY'), async (req, res) => {
  try {
    const { agencyId } = req.params;
    const { status } = req.query;
    if (req.user.role === 'AGENCY' && req.user.id !== parseInt(agencyId)) {
      return res.status(403).json({ error: 'Access denied', message: 'Cannot view other agency' });
    }
    const where = { agencyId };
    if (status) where.status = status;
    const pool = await AgencyNurse.findAll({ where, include: [{ model: User, as: 'nurse', attributes: { exclude: ['password'] } }] });
    return res.json({ pool, nurses: pool.map(p => p.nurse) });
  } catch (error) {
    console.error('Get nurse pool error:', error);
    return res.status(500).json({ error: 'Failed to fetch nurses', message: error.message });
  }
});

// List all nurses available for onboarding (not in any agency and not currently on a job)
router.get('/:agencyId/nurses/available', authenticate, authorize('ADMIN', 'HR', 'AGENCY'), async (req, res) => {
  try {
    const { agencyId } = req.params;
    if (req.user.role === 'AGENCY' && req.user.id !== parseInt(agencyId)) {
      return res.status(403).json({ error: 'Access denied', message: 'Cannot view other agency' });
    }

    // Get all nurse IDs who are in any active agency membership
    const activeMemberships = await AgencyNurse.findAll({
      where: { status: ['PENDING', 'APPROVED'] },
      attributes: ['nurseId']
    });
    const inactiveNurseIds = activeMemberships.map(m => m.nurseId);

    // Get all nurse IDs who are currently on a job
    const activeJobs = await JobAssignment.findAll({
      where: { status: ['ASSIGNED', 'IN_PROGRESS'] },
      attributes: ['userId']
    });
    const busyNurseIds = activeJobs.map(j => j.userId);

    // Combine excluded nurse IDs
    const excludedNurseIds = [...new Set([...inactiveNurseIds, ...busyNurseIds])];

    // Get all available nurses (NURSE role, active, not in excluded list)
    const where = {
      role: 'NURSE',
      isActive: true
    };
    
    if (excludedNurseIds.length > 0) {
      where.id = { [Op.notIn]: excludedNurseIds };
    }

    const availableNurses = await User.findAll({
      where,
      attributes: { exclude: ['password'] },
      order: [['firstName', 'ASC'], ['lastName', 'ASC']]
    });

    return res.json({
      availableNurses,
      count: availableNurses.length,
      excludedCount: excludedNurseIds.length
    });
  } catch (error) {
    console.error('Get available nurses error:', error);
    return res.status(500).json({ error: 'Failed to fetch available nurses', message: error.message });
  }
});

// List available jobs for agency (linked hospitals, nurses only, active)
router.get('/jobs', authenticate, authorize('AGENCY'), async (req, res) => {
  try {
    const links = await AgencyHospital.findAll({ where: { agencyId: req.user.id } });
    const hospitalIds = links.filter(l => l.status === 'APPROVED').map(l => l.hospitalId);
    if (hospitalIds.length === 0) {
      return res.json({ jobs: [] });
    }
  const jobs = await Job.findAll({
      where: {
        hospitalId: { [Op.in]: hospitalIds },
        requiredRole: { [Op.in]: ['NURSE', 'AGENCY'] },
        status: 'ACTIVE'
      },
      include: [
        { model: Hospital, as: 'hospital', attributes: ['id', 'name', 'code'] },
        { model: JobAssignment, as: 'assignments', attributes: ['id', 'status'] }
      ],
      order: [['startDate', 'ASC'], ['startTime', 'ASC']]
    });
    const enriched = jobs.map(j => {
      const data = j.toJSON();
      const currentAssignments = (data.assignments || []).filter(a => ['ACCEPTED', 'ASSIGNED', 'IN_PROGRESS'].includes(a.status)).length;
      return { ...data, currentAssignments };
    });
    return res.json({ jobs: enriched });
  } catch (error) {
    console.error('List agency jobs error:', error);
    return res.status(500).json({ error: 'Failed to list jobs', message: error.message });
  }
});

// Accept and assign job via agency
router.post('/jobs/:jobId/assign', authenticate, authorize('AGENCY'), validate(schemas.agencyAssignJob), async (req, res) => {
  try {
    const { jobId } = req.params;
    const { mode, assignments, hourlyRate } = req.body;

    const job = await Job.findByPk(jobId);
    if (!job || (job.requiredRole !== 'NURSE' && job.requiredRole !== 'AGENCY')) {
      return res.status(404).json({ error: 'Job not found', message: 'Job not found or not a nurse/agency job' });
    }

    // Check agency is linked to hospital
    const link = await AgencyHospital.findOne({ where: { agencyId: req.user.id, hospitalId: job.hospitalId, status: 'APPROVED' } });
    if (!link) {
      return res.status(403).json({ error: 'Access denied', message: 'Agency not linked to this hospital' });
    }

    // For AGENCY jobs, check if the agency has already accepted the assignment
    if (job.requiredRole === 'AGENCY') {
      const agencyAssignment = await JobAssignment.findOne({
        where: { jobId: job.id, userId: req.user.id, agencyId: req.user.id }
      });
      if (!agencyAssignment || agencyAssignment.status !== 'ACCEPTED') {
        return res.status(403).json({ 
          error: 'Assignment not accepted', 
          message: 'You must first accept the AGENCY job assignment before assigning nurses' 
        });
      }
    }

    // Validate nurses are in pool
    const nurseIds = [...new Set(assignments.map(a => a.userId))];
    const pool = await AgencyNurse.findAll({ where: { agencyId: req.user.id, nurseId: { [Op.in]: nurseIds } } });
    if (pool.length !== nurseIds.length) {
      return res.status(400).json({ error: 'Invalid nurse pool', message: 'One or more nurses are not in agency pool' });
    }

    // Conflict check helper
    const timeRanges = mode === 'FULL'
      ? [{ startDate: job.startDate, endDate: job.endDate }]
      : assignments.map(a => ({ startDate: a.startDate, endDate: a.endDate }));

    const rangesOverlap = (aStart, aEnd, bStart, bEnd) => {
      const as = new Date(aStart).getTime();
      const ae = new Date(aEnd).getTime();
      const bs = new Date(bStart).getTime();
      const be = new Date(bEnd).getTime();
      return as <= be && bs <= ae;
    };

    // Check each nurse for overlapping active assignments or segments
    for (const nurseId of nurseIds) {
      const existing = await JobAssignment.findAll({
        where: {
          userId: nurseId,
          status: ['ACCEPTED', 'ASSIGNED', 'IN_PROGRESS']
        },
        include: [
          { model: Job, as: 'job', attributes: ['startDate', 'endDate'] },
          { model: AssignmentSegment, as: 'segments', attributes: ['startDate', 'endDate'] }
        ]
      });

      // If nurse is currently IN_PROGRESS on any job, block new offers from agency regardless of future dates
      const hasInProgress = existing.some(e => e.status === 'IN_PROGRESS');
      if (hasInProgress) {
        return res.status(409).json({ error: 'Nurse busy', message: `Nurse ${nurseId} is currently on a job and cannot receive new offers` });
      }

      // Build existing ranges for this nurse
      const existingRanges = [];
      for (const rec of existing) {
        const recJson = rec.toJSON();
        if (recJson.segments && recJson.segments.length > 0) {
          for (const seg of recJson.segments) {
            existingRanges.push({ startDate: seg.startDate, endDate: seg.endDate });
          }
        } else if (recJson.job) {
          existingRanges.push({ startDate: recJson.job.startDate, endDate: recJson.job.endDate });
        }
      }

      // For FULL mode, all timeRanges is single job range; for SEGMENTS, filter the nurse's own requested segments
      const requestedRanges = mode === 'FULL'
        ? timeRanges
        : assignments.filter(a => a.userId === nurseId).map(a => ({ startDate: a.startDate, endDate: a.endDate }));

      for (const reqRange of requestedRanges) {
        for (const exRange of existingRanges) {
          if (rangesOverlap(reqRange.startDate, reqRange.endDate, exRange.startDate, exRange.endDate)) {
            return res.status(409).json({
              error: 'Schedule conflict',
              message: `Nurse ${nurseId} has a conflicting assignment between ${new Date(exRange.startDate).toISOString()} and ${new Date(exRange.endDate).toISOString()}`
            });
          }
        }
      }
    }

    // Validate segments are within job window and not inverted
    const withinJob = (s, e) => new Date(s) >= new Date(job.startDate) && new Date(e) <= new Date(job.endDate) && new Date(s) <= new Date(e);
    if (mode === 'SEGMENTS') {
      for (const seg of assignments) {
        if (!withinJob(seg.startDate, seg.endDate)) {
          return res.status(400).json({ error: 'Invalid segment', message: 'Segment dates must be within job start/end and end after start' });
        }
      }
      // Check no overlaps within requested segments per nurse
      const byNurse = {};
      for (const seg of assignments) {
        byNurse[seg.userId] = byNurse[seg.userId] || [];
        byNurse[seg.userId].push({ startDate: seg.startDate, endDate: seg.endDate });
      }
      const overlap = (a, b) => new Date(a.startDate) <= new Date(b.endDate) && new Date(b.startDate) <= new Date(a.endDate);
      for (const nurseId of Object.keys(byNurse)) {
        const ranges = byNurse[nurseId];
        ranges.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        for (let i = 1; i < ranges.length; i++) {
          if (overlap(ranges[i - 1], ranges[i])) {
            return res.status(400).json({ error: 'Invalid segments', message: `Overlapping segments for nurse ${nurseId}` });
          }
        }
      }
    }

    const created = [];
    if (mode === 'FULL') {
      const nurseId = assignments[0].userId;
      const assn = await JobAssignment.create({
        jobId: job.id,
        userId: nurseId,
        agencyId: req.user.id,
        assignedBy: req.user.id,
        status: 'ASSIGNED',
        hourlyRate: hourlyRate || job.hourlyRate
      });
      created.push(assn);
    } else {
      // SEGMENTS: create per-nurse assignment and segment records
      for (const seg of assignments) {
        const assn = await JobAssignment.create({
          jobId: job.id,
          userId: seg.userId,
          agencyId: req.user.id,
          assignedBy: req.user.id,
          status: 'ASSIGNED',
          hourlyRate: hourlyRate || job.hourlyRate
        });
        await AssignmentSegment.create({ jobAssignmentId: assn.id, startDate: seg.startDate, endDate: seg.endDate });
        created.push(assn);
      }
    }

    // Optionally, set job status to ASSIGNED
    if (job.status === 'ACTIVE') {
      job.status = 'ASSIGNED';
      await job.save();
    }

    const result = await JobAssignment.findAll({ 
      where: { id: { [Op.in]: created.map(c => c.id) } }, 
      include: [
        { model: User, as: 'user', attributes: { exclude: ['password'] } },
        { model: User, as: 'agency', attributes: { exclude: ['password'] } },
        { model: Job, as: 'job', attributes: ['id', 'title', 'department', 'startDate', 'endDate', 'startTime', 'endTime', 'hospitalId'] },
        { model: AssignmentSegment, as: 'segments' }
      ]
    });
    return res.status(201).json({ message: 'Job assigned', job: job, assignments: result });
  } catch (error) {
    console.error('Agency assign job error:', error);
    return res.status(500).json({ error: 'Failed to assign job', message: error.message });
  }
});

// Agency accepts an AGENCY job assignment
router.post('/assignments/:assignmentId/accept', authenticate, authorize('AGENCY'), async (req, res) => {
  try {
    const { assignmentId } = req.params;
    
    const assignment = await JobAssignment.findOne({
      where: { id: assignmentId, userId: req.user.id, status: 'PENDING' },
      include: [{ model: Job, as: 'job' }]
    });
    
    if (!assignment) {
      return res.status(404).json({ 
        error: 'Assignment not found',
        message: 'Assignment does not exist or is not pending' 
      });
    }
    
    // Verify this is an AGENCY job
    if (assignment.job.requiredRole !== 'AGENCY') {
      return res.status(400).json({ 
        error: 'Invalid job type',
        message: 'This assignment is not for an AGENCY job' 
      });
    }
    
    assignment.status = 'ACCEPTED';
    assignment.acceptedAt = new Date();
    await assignment.save();
    
    res.json({ 
      message: 'Assignment accepted successfully', 
      assignment 
    });
  } catch (error) {
    console.error('Accept assignment error:', error);
    return res.status(500).json({ 
      error: 'Failed to accept assignment', 
      message: error.message 
    });
  }
});

// Agency rejects an AGENCY job assignment
router.post('/assignments/:assignmentId/reject', authenticate, authorize('AGENCY'), async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { reason } = req.body;
    
    const assignment = await JobAssignment.findOne({
      where: { id: assignmentId, userId: req.user.id, status: 'PENDING' },
      include: [{ model: Job, as: 'job' }]
    });
    
    if (!assignment) {
      return res.status(404).json({ 
        error: 'Assignment not found',
        message: 'Assignment does not exist or is not pending' 
      });
    }
    
    // Verify this is an AGENCY job
    if (assignment.job.requiredRole !== 'AGENCY') {
      return res.status(400).json({ 
        error: 'Invalid job type',
        message: 'This assignment is not for an AGENCY job' 
      });
    }
    
    assignment.status = 'REJECTED';
    assignment.rejectedAt = new Date();
    assignment.rejectionReason = reason;
    await assignment.save();
    
    res.json({ 
      message: 'Assignment rejected successfully', 
      assignment 
    });
  } catch (error) {
    console.error('Reject assignment error:', error);
    return res.status(500).json({ 
      error: 'Failed to reject assignment', 
      message: error.message 
    });
  }
});

// Get job assignments for a specific job (agency view)
router.get('/jobs/:jobId/assignments', authenticate, authorize('AGENCY', 'ADMIN', 'HR'), async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const job = await Job.findByPk(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found', message: 'Job does not exist' });
    }
    
    // Check agency is linked to hospital (skip for ADMIN/HR)
    if (req.user.role === 'AGENCY') {
      const link = await AgencyHospital.findOne({ where: { agencyId: req.user.id, hospitalId: job.hospitalId, status: 'APPROVED' } });
      if (!link) {
        return res.status(403).json({ error: 'Access denied', message: 'Agency not linked to this hospital' });
      }
    }
    
    const assignments = await JobAssignment.findAll({
      where: { jobId: jobId },
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
    console.error('Get job assignments error:', error);
    res.status(500).json({
      error: 'Failed to fetch assignments',
      message: error.message
    });
  }
});

module.exports = router;


