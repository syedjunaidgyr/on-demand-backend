const moment = require('moment-timezone');

/**
 * Utility functions for date and time operations
 */

/**
 * Combines a date and time string into a proper Date object in IST
 * @param {Date|string} date - The date part
 * @param {string} timeString - The time string in HH:MM:SS or HH:MM format
 * @returns {Date} Combined date and time
 */
function combineDateTime(date, timeString) {
  const base = moment.tz(date, 'Asia/Kolkata');
  const [hours = 0, minutes = 0, seconds = 0] = (timeString || '00:00:00')
    .split(':')
    .map((value) => Number(value) || 0);

  const combined = base.clone().set({
    hour: hours,
    minute: minutes,
    second: seconds,
    millisecond: 0
  });

  return combined.toDate();
}

/**
 * Calculates the difference in hours between two dates (IST-aware)
 * @param {Date|string} startDate - The start date
 * @param {Date|string} endDate - The end date
 * @returns {number} Difference in hours
 */
function getHoursDifference(startDate, endDate) {
  const start = moment.tz(startDate, 'Asia/Kolkata');
  const end = moment.tz(endDate, 'Asia/Kolkata');
  return end.diff(start, 'hours', true);
}

/**
 * Checks if the current time is within the allowed check-in window (IST)
 * @param {Date|string} jobStartDate - Job start date
 * @param {string} jobStartTime - Job start time string
 * @param {number} allowedHoursBefore - Hours before job start when check-in is allowed (default: 2)
 * @returns {Object} Result object with isAllowed, hoursUntilStart, and message
 */
function isCheckInAllowed(jobStartDate, jobStartTime, allowedHoursBefore = 2) {
  const now = moment.tz('Asia/Kolkata');
  const jobStartMoment = moment.tz(combineDateTime(jobStartDate, jobStartTime), 'Asia/Kolkata');
  const hoursUntilStart = jobStartMoment.diff(now, 'hours', true);

  return {
    isAllowed: hoursUntilStart <= allowedHoursBefore,
    hoursUntilStart,
    jobStartDateTime: jobStartMoment.format('DD MMM YYYY, hh:mm A'),
    currentTime: now.format('DD MMM YYYY, hh:mm A'),
    message:
      hoursUntilStart > allowedHoursBefore
        ? `You can check in starting ${allowedHoursBefore} hours before your shift. Your shift starts at ${jobStartMoment.format('DD MMM YYYY, hh:mm A')}`
        : 'Check-in is allowed'
  };
}

module.exports = {
  combineDateTime,
  getHoursDifference,
  isCheckInAllowed
};
