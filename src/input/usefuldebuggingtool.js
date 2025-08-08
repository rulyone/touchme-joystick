// Usage: just add to any class and start adding log("something"); (useful for mobile devices)

// //Create debug log display
// const debugLog = document.createElement('div');
// debugLog.style.cssText = 'position: fixed; top: 100px; left: 10px; background: rgba(0,0,0,0.8); color: #0f0; padding: 10px; font-family: monospace; font-size: 10px; max-width: 300px; max-height: 200px; overflow-y: auto; z-index: 1000;';
// document.body.appendChild(debugLog);

// let debugLines = [];
// function log(msg) {
//     debugLines.push(msg);
//     if (debugLines.length > 20) debugLines.shift(); // Keep last 20 lines
//     debugLog.innerHTML = debugLines.join('<br>');
// }