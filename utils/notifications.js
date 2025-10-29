const axios = require('axios');

// Map template names used in code to template IDs from the notification service
const TEMPLATE_IDS = {
  PasswordChanged_User: '07358509-10be-436b-a39b-45abb31faaeb',
  JobUpdated_AssignedStaff: '07aca159-3730-4e8a-93a9-415e06f35961',
  CheckIn_NotifyHR: '07cd8860-6025-4042-bc40-0b53e53a48ee',
  JobAssigned_ConfToAssigner: '17002f04-f495-4af9-8101-2daf9251e255',
  JobCancelled_Creator: '1e057e12-151a-4041-b9cf-d0cff98ad5b5',
  JobUpdated_Creator: '281c39ed-c0d4-4c8a-829f-3ab17222ea7e',
  JobCreated_Doctor: '41f189d3-cb99-4ab0-8724-399c5a0d06a5',
  PermissionMasterApplied_User: '4200d72a-078f-4c8a-9bce-360361e70af9',
  PasswordChanged_AdminAudit: '77497635-5f64-4c33-882b-d36180a642dd',
  JobCreated_Creator: 'eb19d6e9-16b7-495a-8243-c9c5c635ee24',
  UserRegistered_Staff: '5eea473a-9c3a-4936-a253-71d184af57f3',
  ReportGenerated_AdminTeam: '7684504e-d52d-49a2-9fcb-f533af147e22',
  JobAssigned_AssignedUser: '7d639376-93fb-4c96-95c3-5af258339e38',
  JobCreated_Nurse: '7d93d86d-38f9-42ec-9a29-1ae2c70d72d9',
  AssignmentRejected_NotifyHR: 'a03dfa53-d55e-4d78-b87c-25ecc18ddc13',
  JobCancelled_AssignedStaff: 'a5a5d7ad-89e8-42bf-905a-c8abf8406349',
  PermissionRevoked_User: 'b16842f2-4a95-4d7a-ba50-42d0c3c3a9b2',
  PermissionGranted_User: 'bdff9d71-14e4-4e29-83de-e65cd35b8d98',
  AssignmentAccepted_NotifyHR: 'dd35c3e3-0e6a-4591-a7df-3a186ec00991',
  UserRegistered_AdminTeam: 'e5d688f7-d330-4503-99eb-65b169c27bdf',
  CheckOut_NotifyHR: 'e915d594-5baf-4c2b-ac42-ee59dbf7c23f',
  ExtensionRequested_NotifyHR: 'ed92e4d4-ada2-4f73-8179-1f5b7764390e',
  AssignmentAccepted_ConfirmUser: 'b003c869-8fa8-4e7d-a0a5-571a03362b5b',
  AssignmentRejected_ConfirmUser: 'edde6db8-c048-4165-8ccc-057b107adbc9',
  CheckIn_ConfirmUser: 'd5c50bd7-58d7-4cba-b7c3-c32dd2fc45cf',
  CheckOut_ConfirmUser: '91fee397-0f6e-4be4-973c-1d7a51a75c4a',
  ExtensionRequested_ConfirmUser: '443b073a-8b7c-4d7e-9591-a48fcfce86ef',
  CandidateSelected_ConfirmHR: '0e5494d7-f988-43f1-be4d-25173c648128',
  CandidateSelected_NotifyStaff: 'eaaea536-a31c-44f5-ab98-267617cfdd1f',
  CandidateRejected_AfterSelection: 'fab02e8a-cc41-495c-bf4b-ad431c91c63f'
};

const NOTIFICATION_BASE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://192.168.1.52:3020';

async function sendNotifications(templateName, notificationsPayload) {
  const templateId = TEMPLATE_IDS[templateName];
  if (!templateId) {
    console.warn(`Notification template not found: ${templateName}`);
    return;
  }
  const url = `${NOTIFICATION_BASE_URL}/api/sendBulkNotification`;
  const payload = {
    template_id: templateId,
    title: templateName,
    notifications: notificationsPayload.map((n) => ({
      user_id: n.userId,
      user_type: (n.userType || '').toLowerCase(),
      placeholders_used: n.placeholders || {}
    }))
  };
  try {
    await axios.post(url, payload, { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.warn('Failed to send notifications', { templateName, error: error.message });
  }
}

module.exports = {
  sendNotifications
};


