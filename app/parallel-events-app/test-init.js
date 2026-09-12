// Parallel Events init test
console.log('=== Parallel Events init test ===');

// Check that modules loaded
console.log('1. Globals:');
console.log('   - ParallelEventsApp:', typeof ParallelEventsApp);
console.log('   - parallelEventsManager:', typeof window.parallelEventsManager);
console.log('   - parallelEventsStyles:', typeof window.parallelEventsStyles);
console.log('   - getParallelEventsAppContent:', typeof window.getParallelEventsAppContent);
console.log('   - bindParallelEventsAppEvents:', typeof window.bindParallelEventsAppEvents);

// Manager state
if (window.parallelEventsManager) {
    console.log('2. Manager:');
    console.log('   - isInitialized:', window.parallelEventsManager.isInitialized);
    console.log('   - isListening:', window.parallelEventsManager.isListening);
    console.log('   - currentSettings:', window.parallelEventsManager.currentSettings);
    console.log('   - eventQueue length:', window.parallelEventsManager.eventQueue?.length);
} else {
    console.log('2. Manager not created');
}

// Style manager
if (window.parallelEventsStyles) {
    console.log('3. Style manager:');
    console.log('   - available styles:', window.parallelEventsStyles.getAvailableStyles());
    console.log('   - custom prefix:', window.parallelEventsStyles.getCustomPrefix());
} else {
    console.log('3. Style manager not created');
}

// Dependencies
console.log('4. Dependencies:');
console.log('   - mobileContextEditor:', typeof window.mobileContextEditor);
console.log('   - mobileCustomAPIConfig:', typeof window.mobileCustomAPIConfig);

console.log('=== Test done ===');
