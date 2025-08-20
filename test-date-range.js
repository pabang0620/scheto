// Test the date range calculation
const currentDate = new Date();

function getScheduleStartDate() {
  const date = new Date(currentDate);
  // Always get the first day of the current month
  date.setDate(1);
  return date.toISOString().split('T')[0];
}

function getScheduleEndDate() {
  const date = new Date(currentDate);
  // Always get the last day of the current month
  date.setMonth(date.getMonth() + 1, 0);
  return date.toISOString().split('T')[0];
}

// Test for multiple months
const testMonths = [
  new Date('2025-07-15'),
  new Date('2025-08-15'),
  new Date('2025-09-15')
];

testMonths.forEach(testDate => {
  currentDate.setTime(testDate.getTime());
  console.log(`\nTesting for date: ${testDate.toISOString().split('T')[0]}`);
  console.log(`Start Date: ${getScheduleStartDate()}`);
  console.log(`End Date: ${getScheduleEndDate()}`);
});

// Check what dates the user mentioned
console.log('\n\nUser mentioned dates:');
console.log('Start: 2025-07-27');
console.log('End: 2025-09-06');
console.log('This spans multiple months, which is unusual for a month view...');