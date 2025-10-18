// Simple test script to click Start Conversation and capture errors
console.log('🧪 Testing voice agent...');

// Wait for page to load, then click the button
setTimeout(() => {
  console.log('🔍 Looking for Start Conversation button...');
  const button = document.querySelector('button:has-text("Start Conversation")') || 
                 document.querySelector('button[class*="Start"]') ||
                 Array.from(document.querySelectorAll('button')).find(b => 
                   b.textContent.includes('Start') || b.textContent.includes('Conversation'));
  
  if (button) {
    console.log('✅ Found button:', button.textContent);
    console.log('🖱️ Clicking Start Conversation...');
    button.click();
  } else {
    console.log('❌ Start Conversation button not found');
    console.log('📄 Available buttons:');
    document.querySelectorAll('button').forEach((btn, i) => {
      console.log(`  ${i}: "${btn.textContent.trim()}"`);
    });
  }
}, 3000);

// Capture any errors that occur
window.addEventListener('error', (e) => {
  console.error('🚨 JavaScript Error:', e.error);
  console.error('📍 File:', e.filename);
  console.error('📍 Line:', e.lineno);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('🚨 Unhandled Promise Rejection:', e.reason);
});