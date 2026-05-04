import api, { safeRequest } from '../../../api/api';

const callApi = {
  startCall: (data) => safeRequest(api.post('/calls/start', data)),
  endCall: (callId, data) => safeRequest(api.post(`/calls/end/${callId}`, data)),
  fetchMyLogs: (filters) => safeRequest(api.get('/call-records/my', { params: filters })),
  fetchTodayReport: () => safeRequest(api.get('/calls/today'))
};

export default callApi;
