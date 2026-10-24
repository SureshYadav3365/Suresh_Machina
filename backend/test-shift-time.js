const { _testUtils } = require('./controllers/productionController');
const { computeShiftTimeDetails, computeShiftMetrics, normalizeTime } = _testUtils;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

console.log('\n--- 1. Testing normalizeTime ---');
assert(normalizeTime('8:00') === '08:00', 'Normalizes 8:00 to 08:00');
assert(normalizeTime('09:30') === '09:30', 'Preserves 09:30');
assert(normalizeTime('invalid') === '08:00', 'Falls back to 08:00 on invalid input');

console.log('\n--- 2. Testing 8-hour shift calculation starting at 09:30 ---');
const shift930 = computeShiftTimeDetails('09:30', 8);
assert(shift930.startTime === '09:30', 'Start time is 09:30');
assert(shift930.endTime === '17:30', '8-hour end time is 17:30');
assert(shift930.slots.length === 8, 'Generates exactly 8 slots');
assert(shift930.slots[0].hourTime === '09:30 - 10:30', 'Slot 1 is 09:30 - 10:30');
assert(shift930.slots[1].hourTime === '10:30 - 11:30', 'Slot 2 is 10:30 - 11:30');
assert(shift930.slots[7].hourTime === '16:30 - 17:30', 'Slot 8 is 16:30 - 17:30');

console.log('\n--- 3. Testing 8-hour shift calculation starting at 07:15 ---');
const shift715 = computeShiftTimeDetails('07:15', 8);
assert(shift715.startTime === '07:15', 'Start time is 07:15');
assert(shift715.endTime === '15:15', '8-hour end time is 15:15');
assert(shift715.slots[0].hourTime === '07:15 - 08:15', 'Slot 1 is 07:15 - 08:15');
assert(shift715.slots[7].hourTime === '14:15 - 15:15', 'Slot 8 is 14:15 - 15:15');

console.log('\n--- 4. Testing night shift crossing midnight (21:00) ---');
const shiftNight = computeShiftTimeDetails('21:00', 8);
assert(shiftNight.startTime === '21:00', 'Start time is 21:00');
assert(shiftNight.endTime === '05:00', '8-hour end time is 05:00 next day');
assert(shiftNight.slots[0].hourTime === '21:00 - 22:00', 'Slot 1 is 21:00 - 22:00');
assert(shiftNight.slots[2].hourTime === '23:00 - 00:00', 'Slot 3 is 23:00 - 00:00');
assert(shiftNight.slots[3].hourTime === '00:00 - 01:00', 'Slot 4 is 00:00 - 01:00');
assert(shiftNight.slots[7].hourTime === '04:00 - 05:00', 'Slot 8 is 04:00 - 05:00');

console.log('\n--- 5. Testing elapsed and remaining shift metrics ---');
// Test case: Date 2026-10-24, shift starts at 09:00.
// Mock current time: 11:30 (2h 30m elapsed, 5h 30m remaining)
const mockNow = new Date(2026, 9, 24, 11, 30, 0, 0);
const metrics = computeShiftMetrics('2026-10-24', '09:00', 8, mockNow);
assert(metrics.status === 'ongoing', 'Shift is ongoing');
assert(metrics.elapsedMinutes === 150, '150 minutes elapsed');
assert(metrics.remainingMinutes === 330, '330 minutes remaining');
assert(metrics.elapsedFormatted === '2h 30m', 'Elapsed formatted is 2h 30m');
assert(metrics.remainingFormatted === '5h 30m', 'Remaining formatted is 5h 30m');
assert(metrics.progressPercent === 31, 'Progress is 31%');
assert(metrics.currentSlotNumber === 3, 'Hour 3 is current active slot (11:00 - 12:00)');
assert(metrics.slotMetrics[0].timeStatus === 'completed', 'Slot 1 is completed');
assert(metrics.slotMetrics[1].timeStatus === 'completed', 'Slot 2 is completed');
assert(metrics.slotMetrics[2].timeStatus === 'ongoing', 'Slot 3 is ongoing');
assert(metrics.slotMetrics[3].timeStatus === 'upcoming', 'Slot 4 is upcoming');

console.log('\n--- 6. Testing before shift start ---');
const mockBefore = new Date(2026, 9, 24, 8, 0, 0, 0);
const metricsBefore = computeShiftMetrics('2026-10-24', '09:00', 8, mockBefore);
assert(metricsBefore.status === 'upcoming', 'Status is upcoming');
assert(metricsBefore.elapsedMinutes === 0, '0 minutes elapsed');
assert(metricsBefore.remainingMinutes === 480, '480 minutes remaining');
assert(metricsBefore.currentSlotNumber === null, 'No active ongoing slot');
assert(metricsBefore.slotMetrics.every(s => s.timeStatus === 'upcoming'), 'All slots upcoming');

console.log('\n--- 7. Testing after shift end ---');
const mockAfter = new Date(2026, 9, 24, 18, 0, 0, 0);
const metricsAfter = computeShiftMetrics('2026-10-24', '09:00', 8, mockAfter);
assert(metricsAfter.status === 'completed', 'Status is completed');
assert(metricsAfter.elapsedMinutes === 480, '480 minutes elapsed');
assert(metricsAfter.remainingMinutes === 0, '0 minutes remaining');
assert(metricsAfter.progressPercent === 100, 'Progress is 100%');
assert(metricsAfter.slotMetrics.every(s => s.timeStatus === 'completed'), 'All slots completed');

console.log('\n🎉 ALL TIME CALCULATION TESTS PASSED!\n');
