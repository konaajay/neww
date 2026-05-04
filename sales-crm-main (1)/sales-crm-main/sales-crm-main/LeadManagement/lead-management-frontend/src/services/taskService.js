import api from '../api/api';
import { safeRequest } from '../api/api';

const taskService = {
  /**
   * Fetches tasks across the hierarchy (Manager -> TL -> Associate)
   * @param {Object} filters { from, to, userId, teamId }
   */
  fetchTasks: (filters = {}, signal) => 
    safeRequest(api.get('/tasks', { params: filters, signal })),

  /**
   * Updates the status of a specific task
   */
  updateTaskStatus: (taskId, status) => 
    safeRequest(api.put(`/tasks/${taskId}/status`, null, { params: { status } })),

  /**
   * Creates a new manual task for a lead
   */
  createTask: (leadId, taskData) => 
    safeRequest(api.post('/tasks', { leadId, ...taskData })),

  /**
   * Deletes a task
   */
  deleteTask: (taskId) => 
    safeRequest(api.delete(`/tasks/${taskId}`))
};

export default taskService;
