/**
 * SCROLL TO TOP COMPONENT
 * 
 * Ensures that users always start at the top of pages when navigating.
 * This component automatically scrolls to the top whenever the route changes,
 * providing consistent initialization behavior across the application.
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll to top immediately when route changes
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant' // Use 'instant' for immediate scroll without animation
    });
    
    // Also ensure document body scroll is reset
    if (document.body.scrollTop !== 0) {
      document.body.scrollTop = 0;
    }
    
    // Reset document element scroll as well (for different browsers)
    if (document.documentElement.scrollTop !== 0) {
      document.documentElement.scrollTop = 0;
    }
    
    console.log('📍 ScrollToTop: Reset scroll position for route:', pathname);
  }, [pathname]);

  return null; // This component doesn't render anything
};

export default ScrollToTop;