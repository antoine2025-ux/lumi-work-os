// Force workspace ID to be set on page load to prevent redirect loops
if (typeof window !== 'undefined') {
  // Check if redirects are stopped
  if (sessionStorage.getItem('__redirect_stopped__') === 'true') {
    const workspaceId = sessionStorage.getItem('__workspace_id__') || 'ws_1765020555_4662b211'
    sessionStorage.setItem('__workspace_id__', workspaceId)
    sessionStorage.setItem('__has_workspace__', 'true')
  }
  
  // If redirect count is high, stop redirects
  const redirectCount = parseInt(sessionStorage.getItem('__redirect_count__') || '0')
  if (redirectCount >= 2) {
    sessionStorage.setItem('__redirect_stopped__', 'true')
    sessionStorage.setItem('__workspace_id__', 'ws_1765020555_4662b211')
    sessionStorage.setItem('__has_workspace__', 'true')
  }
}

