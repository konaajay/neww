import api, { safeRequest } from '../api/api';

const ticketService = {
  raiseTicket: (ticket) => safeRequest(api.post('/tickets/raise', ticket)),
  getMyTickets: () => safeRequest(api.get('/tickets/my')),
  getAllTickets: () => safeRequest(api.get('/tickets/all')),
  updateStatus: (id, status) => safeRequest(api.patch(`/tickets/${id}/status`, null, { params: { status } }))
};

export default ticketService;
