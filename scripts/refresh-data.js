// Script to fix customer data loading by updating the cache settings
// To apply this fix, run the script in the browser console when on the customers page

// Force refresh all data immediately
(() => {
  // Clear all local storage cache
  console.log('Clearing local storage cache...');
  localStorage.removeItem('safawala_data_cache');
  
  // Recreate the user authentication data to ensure it's properly set
  const userData = localStorage.getItem('safawala_user');
  if (userData) {
    console.log('User data found, refreshing authentication...');
    const user = JSON.parse(userData);
    
    // Check if we have the franchise_id
    if (!user.franchise_id) {
      console.warn('User is missing franchise_id! This could cause data loading issues.');
    } else {
      console.log('User has franchise_id:', user.franchise_id);
    }
    
    // Refresh the localStorage item to update timestamp
    localStorage.setItem('safawala_user', JSON.stringify({
      ...user,
      lastRefreshed: new Date().toISOString()
    }));
  } else {
    console.error('No user data found in local storage! Please log in again.');
  }
  
  console.log('Cache cleared, refreshing page in 2 seconds...');
  setTimeout(() => {
    window.location.reload();
  }, 2000);
})();