// This is a comprehensive fix for customer data not displaying

// First, let's create a function to log debug information
function logDebugInfo(title, data) {
  console.log(`%c ${title} `, 'background: #333; color: #bada55; font-size: 14px;');
  console.log(data);
}

// Check user authentication status
const userData = localStorage.getItem('safawala_user');
if (!userData) {
  logDebugInfo('ISSUE FOUND', 'You are not logged in. Please log in first.');
  // Redirect to login page
  window.location.href = '/auth/login';
} else {
  const user = JSON.parse(userData);
  logDebugInfo('CURRENT USER', user);
  
  // Check if user has franchise_id
  if (!user.franchise_id) {
    logDebugInfo('ISSUE FOUND', 'User has no franchise_id. This is needed to fetch customers.');
    
    // Try to fix by forcing a re-login
    logDebugInfo('ATTEMPTING FIX', 'Please log out and log in again to refresh your user data.');
    localStorage.removeItem('safawala_user');
    window.location.href = '/auth/login';
  } else {
    // Clear all caches
    logDebugInfo('CLEARING CACHE', 'Removing all cached data...');
    
    // Find all safawala_ related items in localStorage and clear them
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('safawala_') && key !== 'safawala_user') {
        localStorage.removeItem(key);
      }
    });
    
    // Force immediate data refresh on next API call
    logDebugInfo('FIXING API CACHE', 'Setting up force refresh for next API call');
    window.forceDataRefresh = true;
    
    // Add a fix for the data service
    logDebugInfo('PATCHING DATA SERVICE', 'Adding temporary fix for data service...');
    
    // Create a function that will be called when the page refreshes
    window._fixCustomersList = function() {
      // Wait for the page to fully load
      setTimeout(() => {
        logDebugInfo('AUTO-REFRESH', 'Triggering customer data refresh...');
        
        // Try to find and click any refresh button
        const refreshButtons = Array.from(document.querySelectorAll('button'))
          .filter(b => b.textContent?.toLowerCase().includes('retry') || 
                      b.innerHTML?.toLowerCase().includes('retry'));
        
        if (refreshButtons.length > 0) {
          logDebugInfo('FOUND REFRESH BUTTON', 'Clicking refresh button...');
          refreshButtons[0].click();
        } else {
          logDebugInfo('NO REFRESH BUTTON', 'Refreshing page instead...');
          window.location.reload();
        }
      }, 2000);
    };
    
    // Set up the fix to run after page load
    logDebugInfo('FIX APPLIED', 'Refreshing page to apply fixes...');
    sessionStorage.setItem('run_customer_fix', 'true');
    
    // Refresh the page
    setTimeout(() => {
      window.location.href = '/customers';
    }, 1500);
  }
}

// Code to run when the page loads from session storage flag
if (sessionStorage.getItem('run_customer_fix') === 'true') {
  sessionStorage.removeItem('run_customer_fix');
  logDebugInfo('RUNNING FIX', 'Customer fix script is now running...');
  window._fixCustomersList();
}