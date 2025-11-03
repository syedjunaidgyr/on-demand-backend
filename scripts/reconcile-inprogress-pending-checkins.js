/*
  One-time reconciliation:
  - Find JobAssignments with status IN_PROGRESS where the latest CheckIn is PENDING.
  - Current policy (strict): leave as-is and require HR to approve before checkout.
  - This script only reports inconsistencies; adjust to auto-fix if desired.
*/

const { JobAssignment, CheckIn, User, Job } = require('../models');

async function run() {
  try {
    const assignments = await JobAssignment.findAll({
      where: { status: 'IN_PROGRESS' },
      include: [
        { model: Job, as: 'job', attributes: ['id','title'] },
        { model: User, as: 'user', attributes: ['id','firstName','lastName'] }
      ]
    });

    let pendingCount = 0;
    for (const a of assignments) {
      const latest = await CheckIn.findOne({
        where: { jobAssignmentId: a.id },
        order: [['checkInTime', 'DESC']],
        attributes: ['id','approvalStatus','approvedAt','approvedBy']
      });
      if (latest && latest.approvalStatus === 'PENDING') {
        pendingCount += 1;
        console.log(`[PENDING] assignmentId=${a.id} job=${a.job?.title || ''} staff=${a.user?.firstName || ''} ${a.user?.lastName || ''} latestCheckInId=${latest.id}`);
      }
    }

    console.log(`Done. IN_PROGRESS with PENDING latest check-in: ${pendingCount}`);
    process.exit(0);
  } catch (e) {
    console.error('Reconciliation failed:', e);
    process.exit(1);
  }
}

run();


