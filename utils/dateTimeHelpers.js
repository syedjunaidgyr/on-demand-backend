/**
 * Utility functions for date and time operations
 */

/**
 * Combines a date and time string into a proper Date object
 * @param {Date|string} date - The date part
 * @param {string} timeString - The time string in HH:MM:SS format
 * @returns {Date} Combined date and time
 */
function combineDateTime(date, timeString) {
  const dateObj = new Date(date);
  const [hours, minutes, seconds] = timeString.split(':').map(Number);
  
  const combinedDate = new Date(dateObj);
  combinedDate.setHours(hours, minutes, seconds || 0, 0);
  
  return combinedDate;
}

/**
 * Calculates the difference in hours between two dates
 * @param {Date} startDate - The start date
 * @param {Date} endDate - The end date
 * @returns {number} Difference in hours
 */
function getHoursDifference(startDate, endDate) {
  const timeDiff = endDate.getTime() - startDate.getTime();
  return timeDiff / (1000 * 60 * 60);
}

/**
 * Checks if the current time is within the allowed check-in window
 * @param {Date} jobStartDate - Job start date
 * @param {string} jobStartTime - Job start time string
 * @param {number} allowedHoursBefore - Hours before job start when check-in is allowed (default: 2)
 * @returns {Object} Result object with isAllowed, hoursUntilStart, and message
 */
function isCheckInAllowed(jobStartDate, jobStartTime, allowedHoursBefore = 2) {
  const now = new Date();
  const jobStartDateTime = combineDateTime(jobStartDate, jobStartTime);
  const hoursUntilStart = getHoursDifference(now, jobStartDateTime);
  
  return {
    isAllowed: hoursUntilStart <= allowedHoursBefore,
    hoursUntilStart,
    jobStartDateTime: jobStartDateTime.toLocaleString(),
    currentTime: now.toLocaleString(),
    message: hoursUntilStart > allowedHoursBefore 
      ? `You can check in starting ${allowedHoursBefore} hours before your shift. Your shift starts at ${jobStartDateTime.toLocaleString()}`
      : 'Check-in is allowed'
  };
}

module.exports = {
  combineDateTime,
  getHoursDifference,
  isCheckInAllowed
};
