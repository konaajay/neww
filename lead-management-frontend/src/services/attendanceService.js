import api from '../api/api';

export const attendanceService = {
  clockIn: async (lat, lng, accuracy, deviceId) => {
    const response = await api.post('/attendance/clock-in', {
      lat, lng, accuracy, deviceId
    });
    return response.data;
  },

  trackLocation: async (lat, lng, accuracy, deviceId) => {
    const response = await api.post('/attendance/track', {
      lat, lng, accuracy, deviceId
    });
    return response.data;
  },

  clockOut: async () => {
    const response = await api.put('/attendance/clock-out', {});
    return response.data;
  },

  getStatus: async () => {
    const response = await api.get('/attendance/status');
    return response.data;
  },

  getMyLogs: async () => {
    const response = await api.get('/attendance/my-logs');
    return response.data;
  },

  getAdminSummaries: async (startDate, userId, endDate) => {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    // Fallback for legacy backend if it uses 'date'
    if (startDate && !params.startDate) params.date = startDate;
    
    if (userId) params.userId = userId;
    const response = await api.get('/admin/attendance/summaries', { params });
    return response.data;
  },
  
  startBreak: async (type = 'SHORT') => {
    const response = await api.post(`/attendance/break/start?type=${type}`, {});
    return response.data;
  },

  endBreak: async () => {
    const response = await api.post('/attendance/break/end', {});
    return response.data;
  },

  forceClockOut: async (userId) => {
    const response = await api.post(`/admin/attendance/force-clock-out/${userId}`);
    return response.data;
  }
};

export default attendanceService;

