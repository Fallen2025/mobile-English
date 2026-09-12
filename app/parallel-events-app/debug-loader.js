// Parallel Events debug loader
console.log('🔍 [Debug Loader] Starting Parallel Events load debug...');

// Environment
console.log('📋 [Debug Loader] Environment:');
console.log('  - URL:', window.location.href);
console.log('  - User agent:', navigator.userAgent);

// Expected paths
const expectedPaths = [
    './scripts/extensions/third-party/mobile/app/parallel-events-app/parallel-events-app.css',
    './scripts/extensions/third-party/mobile/app/parallel-events-app/parallel-events-styles.js',
    './scripts/extensions/third-party/mobile/app/parallel-events-app/parallel-events-app.js'
];

console.log('📁 [Debug Loader] Expected paths:');
expectedPaths.forEach((path, index) => {
    console.log(`  ${index + 1}. ${path}`);
});

// Probe whether files are reachable
async function testFileAccess() {
    console.log('🌐 [Debug Loader] Probing file access...');
    
    for (let i = 0; i < expectedPaths.length; i++) {
        const path = expectedPaths[i];
        try {
            const response = await fetch(path);
            console.log(`  ✅ ${path} - status: ${response.status}`);
        } catch (error) {
            console.log(`  ❌ ${path} - error: ${error.message}`);
        }
    }
}

// Watch globals
const checkGlobals = () => {
    const globals = {
        'ParallelEventsApp': window.ParallelEventsApp,
        'parallelEventsManager': window.parallelEventsManager,
        'parallelEventsStyles': window.parallelEventsStyles,
        'getParallelEventsAppContent': window.getParallelEventsAppContent,
        'bindParallelEventsAppEvents': window.bindParallelEventsAppEvents
    };
    
    console.log('🔍 [Debug Loader] 全局变量status:');
    Object.entries(globals).forEach(([name, value]) => {
        const type = typeof value;
        const exists = value !== undefined;
        console.log(`  - ${name}: ${exists ? '✅' : '❌'} (${type})`);
    });
    
    return globals;
};

// First pass
checkGlobals();

// Probe files
testFileAccess();

// Poll globals
let checkCount = 0;
const maxChecks = 20;
const checkInterval = setInterval(() => {
    checkCount++;
    console.log(`🔄 [Debug Loader] Check ${checkCount}/${maxChecks}:`);
    
    const globals = checkGlobals();
    
    // 如果所有变量都存在，停止Check
    const allExists = Object.values(globals).every(v => v !== undefined);
    if (allExists) {
        console.log('🎉 [Debug Loader] All globals ready');
        clearInterval(checkInterval);
        
        // 尝试调用调试函数
        if (window.debugParallelEventsApp) {
            console.log('🔧 [Debug Loader] Calling debug helper...');
            window.debugParallelEventsApp();
        }
    } else if (checkCount >= maxChecks) {
        console.log('⏰ [Debug Loader] Check超时，停止监控');
        clearInterval(checkInterval);
    }
}, 1000);

console.log('🔍 [Debug Loader] Debug loader running — watching globals...');
