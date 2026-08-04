// Fix for customers not showing in the UI
// This script fixes a potential client-side caching issue

// 1. Clear browser storage
localStorage.removeItem('safawala_data_cache');

// 2. Refresh the page to get fresh data
window.location.reload();