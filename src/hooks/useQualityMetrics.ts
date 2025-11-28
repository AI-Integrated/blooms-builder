import { useEffect } from 'react';
import { automatedMetrics } from '@/services/quality/automatedMetrics';

/**
 * Hook to initialize automated metrics collection
 * Call this once at app startup
 */
export function useQualityMetrics() {
  useEffect(() => {
    // Only run metrics in production, not during development
    if (import.meta.env.DEV) {
      console.log('⏭️ Skipping automated metrics in development mode');
      return;
    }
    
    // Start automated metrics collection (every 30 minutes to reduce load)
    automatedMetrics.start(30);

    // Cleanup on unmount
    return () => {
      automatedMetrics.stop();
    };
  }, []);
}

/**
 * Hook to track API calls
 */
export function useApiTracking() {
  const trackApiCall = async (
    endpoint: string,
    apiCall: () => Promise<any>
  ) => {
    const startTime = Date.now();
    let success = true;
    let statusCode = 200;

    try {
      const result = await apiCall();
      return result;
    } catch (error) {
      success = false;
      statusCode = 500;
      throw error;
    } finally {
      await automatedMetrics.trackApiCall(endpoint, startTime, success, statusCode);
    }
  };

  return { trackApiCall };
}
