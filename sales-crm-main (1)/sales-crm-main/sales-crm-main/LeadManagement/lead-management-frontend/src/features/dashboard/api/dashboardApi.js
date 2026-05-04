import api, { cleanParams, safeRequest } from '../../../api/api';

const dashboardApi = {
  /**
   * Primary Dashboard Endpoint
   * Fetches summary, trends, and performance in a single call.
   */
  fetchSummary: (filters, signal) => {
    return safeRequest(
      api.get('/dashboard/summary', { 
        params: cleanParams(filters), 
        signal 
      })
    );
  },
  
  fetchTrend: (filters, signal) => {
    return safeRequest(
      api.get('/reports/trend', { 
        params: cleanParams(filters),
        signal 
      })
    );
  },
  

  fetchMemberPerformance: (filters, signal) => {
    return safeRequest(
      api.get('/admin/reports/member-performance', { 
        params: cleanParams(filters),
        signal 
      })
    );
  }
};

export default dashboardApi;
