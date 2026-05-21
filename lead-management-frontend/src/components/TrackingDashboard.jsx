import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Clock, CheckCircle, XCircle, Eye, Edit2, X, Save, Award, Zap, AlertCircle, FileType, Download, RefreshCw, Loader2 } from 'lucide-react';
import gyLogo from '../assets/gy1-png.png';
import isoNewBadge from '../assets/iso-new-badge.png';
import { STATUS, normalizeBackendRecord } from '../utils/statusUtils';
import { startScheduler, stopScheduler } from '../services/schedulerService';

import './TrackingDashboard.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://52.87.168.111:8080";

const TrackingDashboard = ({ searchQuery = '', templateFile }) => {
  // --- 1. STATE DEFINITIONS ---
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ total: 0, sent: 0, pending: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [templateUrl, setTemplateUrl] = useState(null);
  const [filter, setFilter] = useState('all');
  const [editingRecord, setEditingRecord] = useState(null);
  const [previewRecord, setPreviewRecord] = useState(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);

  // Fetch PDF as Blob to bypass iframe Auth issue
  useEffect(() => {
    if (!previewRecord) {
      if (previewPdfUrl) {
        URL.revokeObjectURL(previewPdfUrl);
        setPreviewPdfUrl(null);
      }
      return;
    }
    
    setIsPreviewLoading(true);
    let blobUrl = null;
    
    const fetchPdf = async () => {
      try {
        const token = localStorage.getItem('token');
        const url = `${API_BASE}/api/certificates/preview/${previewRecord.id || previewRecord.certificateId}`;
        const response = await fetch(url, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        
        if (!response.ok) throw new Error('Failed to load PDF');
        
        const blob = await response.blob();
        blobUrl = URL.createObjectURL(blob);
        setPreviewPdfUrl(blobUrl);
      } catch (err) {
        console.error("Error fetching PDF preview:", err);
        setPreviewPdfUrl(null);
      } finally {
        setIsPreviewLoading(false);
      }
    };
    
    fetchPdf();
    
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [previewRecord]);

  // Manage template preview URL
  useEffect(() => {
    if (templateFile && templateFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(templateFile);
      setTemplateUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setTemplateUrl(null);
  }, [templateFile]);

  const downloadCertificate = () => {
    if (!previewRecord || !previewPdfUrl) return;
    const link = document.createElement("a");
    link.href = previewPdfUrl;
    link.download = `Certificate_${previewRecord.name.replace(/\s+/g, '_')}.pdf`;
    link.click();
  };

  // Fetch data from backend
  const fetchData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
      };

      const [logsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/certificates`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/certificates/stats`, { headers: getAuthHeaders() })
      ]);

      // Read actual error body for better diagnostics on 500s
      if (!logsRes.ok) {
        const errText = await logsRes.text().catch(() => '');
        throw new Error(`Backend error ${logsRes.status} on /api/certificates${errText ? ': ' + errText.slice(0, 200) : ''}`);
      }
      if (!statsRes.ok) {
        const errText = await statsRes.text().catch(() => '');
        throw new Error(`Backend error ${statsRes.status} on /api/certificates/stats${errText ? ': ' + errText.slice(0, 200) : ''}`);
      }

      const logsData = await logsRes.json();
      const statsData = await statsRes.json();

      // Normalize array entries correctly
      const normalizedLogs = (Array.isArray(logsData) ? logsData : []).map(normalizeBackendRecord);

      // Sort logs to show recently generated certificates at the top
      normalizedLogs.sort((a, b) => {
        // Helper to parse dates including DD-MM-YYYY
        const parseDate = (dStr) => {
          if (!dStr || dStr === '-') return NaN;

          // Try standard parsing first
          let d = new Date(dStr);
          if (!isNaN(d)) return d.getTime();

          // Handle DD-MM-YYYY or DD/MM/YYYY
          const parts = dStr.split(/[-/]/);
          if (parts.length >= 3) {
            // Assume DD-MM-YYYY if the third part is 4 digits
            if (parts[2].length === 4) {
              d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
              if (!isNaN(d)) return d.getTime();
            }
            // Assume YYYY-MM-DD if the first part is 4 digits
            if (parts[0].length === 4) {
              d = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
              if (!isNaN(d)) return d.getTime();
            }
          }
          return NaN;
        };

        const dateA = parseDate(a.date);
        const dateB = parseDate(b.date);

        // If dates are valid and different, sort by date
        if (!isNaN(dateA) && !isNaN(dateB) && dateA !== dateB) {
          return dateB - dateA; // Newest first
        }

        // Fallback to numeric ID sort (extract numbers from string like 'GTAWP001' -> 1)
        const idAStr = String(a.id || '');
        const idBStr = String(b.id || '');
        const numA = parseInt(idAStr.replace(/[^0-9]/g, ''), 10);
        const numB = parseInt(idBStr.replace(/[^0-9]/g, ''), 10);

        if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
          return numB - numA; // Highest ID first (assuming sequential)
        }

        // Final fallback: string locale compare
        return idBStr.localeCompare(idAStr);
      });

      setLogs(normalizedLogs);

      // Update stats based on the summary object if provided, else use legacy keys
      if (statsData.summary) {
        setStats({
          total: statsData.summary.TOTAL || 0,
          sent: statsData.summary.SENT || 0,
          failed: statsData.summary.FAILED || 0,
          pending: statsData.summary.PENDING || 0,
          processing: statsData.summary.PROCESSING || 0,
          retry: statsData.summary.RETRY || 0
        });
      } else {
        setStats({
          total: statsData.totalCertificates || 0,
          sent: statsData.sentCertificates || 0,
          failed: statsData.failedCertificates || 0,
          pending: statsData.pending || 0,
          processing: statsData.processing || 0,
          retry: statsData.retry || 0
        });
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Auto-polling: Sync every 10 seconds to catch state transitions generally
    const pollInterval = setInterval(() => {
      fetchData(true);
    }, 10000);

    // Start the simulated scheduler (runs every 5 minutes / 300,000ms)
    const schedId = startScheduler(() => {
      fetchData(true);
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(pollInterval);
      stopScheduler();
    };
  }, []);

  const handleRetryFailed = async () => {
    setIsRetrying(true);
    try {
      const response = await fetch(`${API_BASE}/api/certificates/retry-failed`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Retry failed');
      await fetchData();
    } catch (err) {
      alert('Failed to retry: ' + err.message);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleRetrySingle = async (recordId) => {
    // Note: Using the retry-failed API as requested. 
    // If backend supports per-ID retry later, replace this URL.
    setIsRetrying(true);
    try {
      const response = await fetch(`${API_BASE}/api/certificates/retry-failed`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Retry failed');
      await fetchData();
    } catch (err) {
      console.error('Record retry failed:', err);
    } finally {
      setIsRetrying(false);
    }
  };

  // Modals state removal (moved to top)




  // --- 4. FILTERING & TOTALS CALCULATION ---
  // Step 1: Apply Global Filters (Time and Search) - These define the current "context"
  const baseFilteredLogs = logs.filter(log => {
    // Support multiple date formats (ISO: YYYY-MM-DD or standard display)
    const logDate = log.date || '';

    // Search Query Filter
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      if (!log.name.toLowerCase().includes(q) &&
        !log.email.toLowerCase().includes(q) &&
        !log.id.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  // Step 2: Calculate Totals based on the context defined above
  const totals = {
    all: baseFilteredLogs.length,
    sent: baseFilteredLogs.filter(l => l.status === STATUS.SENT).length,
    pending: baseFilteredLogs.filter(l => l.status === STATUS.PENDING).length,
    processing: baseFilteredLogs.filter(l => l.status === STATUS.PROCESSING).length,
    retry: baseFilteredLogs.filter(l => l.status === STATUS.RETRY).length,
    failed: baseFilteredLogs.filter(l => l.status === STATUS.FAILED).length
  };

  // Step 3: Apply Status Filter to get the actual visible rows
  const filteredLogs = baseFilteredLogs.filter(log => {
    if (filter === 'all') return true;
    return log.status === filter;
  });

  return (
    <div className="glass-panel" style={{ minHeight: '600px', display: 'flex', flexDirection: 'column' }}>
      {/* KPI Stats Bar */}
      <div className="stats-grid">
        {[
          { label: 'Total Records', value: totals.all, icon: Award, color: 'var(--accent-primary)', bg: 'rgba(59, 130, 246, 0.08)' },
          { label: 'Sent', value: totals.sent, icon: CheckCircle, color: 'var(--accent-success)', bg: 'rgba(16, 185, 129, 0.08)' },
          { label: 'Pending', value: totals.pending, icon: Clock, color: '#6b7280', bg: 'rgba(107, 114, 128, 0.08)' },
          { label: 'Processing', value: totals.processing, icon: Loader2, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)' },
          { label: 'Retry', value: totals.retry, icon: RefreshCw, color: 'var(--accent-secondary)', bg: 'rgba(139, 92, 246, 0.08)' },
          { label: 'Failed', value: totals.failed, icon: XCircle, color: 'var(--accent-danger)', bg: 'rgba(239, 68, 68, 0.08)' }
        ].map((item, index) => (
          <div key={index} className="glass-panel" style={{
            padding: '24px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            background: item.bg,
            border: `1px solid ${item.color}20`,
            borderRadius: '20px'
          }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
              color: item.color
            }}>
              <item.icon size={26} />
            </div>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '500', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</p>
              <h3 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: '1' }}>{item.value || 0}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Header & Filters */}
      <div className="dashboard-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '700' }}>Delivery Tracking</h2>
              <button
                onClick={() => fetchData()}
                title="Sync now"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent-primary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px',
                  borderRadius: '6px',
                  transition: 'background 0.2s',
                  marginTop: '2px'
                }}
                className="hover-bg"
              >
                <RefreshCw size={18} className={loading ? "spin-animation" : ""} />
              </button>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '99px',
                background: error ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                border: `1px solid ${error ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: error ? 'var(--accent-danger)' : 'var(--accent-success)',
                  boxShadow: `0 0 10px ${error ? 'var(--accent-danger)' : 'var(--accent-success)'}`
                }} />
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: error ? 'var(--accent-danger)' : 'var(--accent-success)', textTransform: 'uppercase' }}>
                  {error ? 'Disconnected' : 'Connected'}
                </span>
              </div>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={14} color="var(--accent-primary)" />
              Remote: <code style={{ background: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem' }}>{API_BASE.replace('http://', '')}</code>
            </p>
          </div>
        </div>

        <div className="dashboard-controls" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>



          {/* Status Filter Buttons */}
          <div className="filter-tabs" style={{ display: 'flex', gap: '6px', background: 'rgba(0,0,0,0.04)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.02)' }}>
            {[
              { id: 'all', label: 'All', color: 'var(--accent-primary)' },
              { id: STATUS.SENT, label: 'Sent', color: 'var(--accent-success)' },
              { id: STATUS.PENDING, label: 'Pending', color: '#6b7280' },
              { id: STATUS.PROCESSING, label: 'Processing', color: '#f59e0b' },
              { id: STATUS.RETRY, label: 'Retry', color: 'var(--accent-secondary)' },
              { id: STATUS.FAILED, label: 'Failed', color: 'var(--accent-danger)' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  transition: 'var(--transition-smooth)',
                  background: filter === tab.id ? '#ffffff' : 'transparent',
                  color: filter === tab.id ? tab.color : 'var(--text-secondary)',
                  boxShadow: filter === tab.id ? '0 4px 12px rgba(0,0,0,0.08)' : 'none',
                  border: filter === tab.id ? '1px solid rgba(0,0,0,0.05)' : '1px solid transparent'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px' }}>
            <Zap className="spin-animation" size={48} color="var(--accent-primary)" />
            <p style={{ color: 'var(--text-secondary)' }}>Syncing with backend...</p>
          </div>
        ) : error ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px', padding: '20px', textAlign: 'center' }}>
            <AlertCircle size={48} color="var(--accent-danger)" />
            <h3 style={{ color: 'var(--text-primary)' }}>Connection Error</h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '400px' }}>{error}</p>
            <button className="btn-secondary" onClick={fetchData}>Try Again</button>
          </div>
        ) : (
          <table className="tracking-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '500' }}>Cert ID</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '500' }}>Recipient</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '500' }}>Time & Date</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '500' }}>Status</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '500', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', transition: 'var(--transition-smooth)' }}>
                  <td data-label="Cert ID" style={{ padding: '16px', fontSize: '0.9rem', fontFamily: 'monospace' }}>{log.id}</td>
                  <td data-label="Recipient" style={{ padding: '16px' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: '500' }}>{log.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{log.email}</div>
                  </td>
                  <td data-label="Time & Date" style={{ padding: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{log.date}</div>
                    {log.time && <div style={{ fontSize: '0.8rem' }}>{log.time}</div>}
                  </td>
                  <td data-label="Status" style={{ padding: '16px' }}>
                    {log.status === STATUS.PENDING ? (
                      <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(107, 114, 128, 0.1)', color: '#4b5563' }}>
                        <Clock size={12} /> Pending
                      </span>
                    ) : log.status === STATUS.PROCESSING ? (
                      <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(245, 158, 11, 0.1)', color: '#d97706' }}>
                        <Loader2 size={12} className="spin-animation" /> Processing
                      </span>
                    ) : log.status === STATUS.SENT ? (
                      <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#10b981', color: '#ffffff', fontWeight: '700', padding: '6px 12px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(16, 185, 129, 0.2)' }}>
                        <CheckCircle size={14} /> Sent
                      </span>
                    ) : log.status === STATUS.FAILED ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#ef4444', color: '#ffffff', fontWeight: '700', padding: '6px 12px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(239, 68, 68, 0.2)', width: 'fit-content' }}>
                          <XCircle size={14} /> Failed
                        </span>
                        {log.errorMessage && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--accent-danger)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.errorMessage}>
                            {log.errorMessage}
                          </div>
                        )}
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Attempt 3/3</div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-secondary)', width: 'fit-content' }}>
                          <RefreshCw size={12} /> Retry
                        </span>
                        {log.errorMessage && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--accent-secondary)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.errorMessage}>
                            {log.errorMessage}
                          </div>
                        )}
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                          Attempt {Math.min(log.retryCount + 1, 3)}/3
                        </div>
                      </div>
                    )}
                  </td>
                  <td data-label="Actions" style={{ padding: '16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => setPreviewRecord(log)}
                        style={{ padding: '6px', background: 'rgba(0,0,0,0.05)', borderRadius: '6px', color: 'var(--text-primary)', transition: 'var(--transition-smooth)' }}
                        title="Preview Certificate"
                        className="hover-opacity"
                      >
                        <Eye size={16} />
                      </button>

                    </div>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No records found matching this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>



      {/* Preview Modal Overlay */}
      {previewRecord && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', overflowY: 'auto' }}>
          <button onClick={() => setPreviewRecord(null)} style={{ position: 'absolute', top: '24px', right: '32px', background: 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: '50%', color: 'white', display: 'flex', zIndex: 1001 }}>
            <X size={24} />
          </button>

          <h3 style={{ color: 'white', marginBottom: '24px', fontWeight: '500', letterSpacing: '1px', textAlign: 'center' }}>Certificate Preview for {previewRecord.email}</h3>

          {/* Actual Certificate Preview */}
          <div style={{
            width: 'min(95vw, calc(80vh * (900/656)))',
            aspectRatio: '900 / 656',
            borderRadius: '16px',
            position: 'relative',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            background: '#fff',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '12px',
            overflow: 'hidden'
          }}>
            {isPreviewLoading && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.8)', zIndex: 10 }}>
                <RefreshCw className="spin-animation" size={32} color="var(--accent-primary)" />
              </div>
            )}
            {previewPdfUrl ? (
              <iframe
                src={previewPdfUrl}
                title="Certificate PDF Preview"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  borderRadius: '8px'
                }}
              />
            ) : !isPreviewLoading ? (
              <div style={{ color: 'var(--accent-danger)' }}>Failed to load PDF preview.</div>
            ) : null}
          </div>
          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center', width: '100%', maxWidth: '1000px' }}>
            <button
              onClick={downloadCertificate}
              className="btn-primary"
              style={{ padding: '10px 24px', fontSize: '1rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Download size={18} /> Download Preview
            </button>
          </div>
        </div>,
        document.body
      )}

      <style>{`
        .hover-opacity:hover { opacity: 0.8; transform: translateY(-1px); }
        .hover-bg:hover { background: rgba(0,0,0,0.05); }
      `}</style>
    </div>
  );
};

export default TrackingDashboard;
