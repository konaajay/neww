import React, { useState } from 'react';
import { Send, Zap, AlertCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://3.84.147.168:8080";

const ConfigurationPanel = ({ csvFile, setActiveTab }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorStatus, setErrorStatus] = useState(null);
  const [batchWebinarName, setBatchWebinarName] = useState('');

  const handleGenerate = async () => {
    if (!csvFile) {
      setErrorStatus("Please upload a CSV file to proceed.");
      return;
    }

    if (!batchWebinarName.trim()) {
      setErrorStatus("Please enter a Webinar Name/Topic.");
      return;
    }

    setIsGenerating(true);
    setErrorStatus(null);

    // Prepare FormData
    const formData = new FormData();
    formData.append('file', csvFile);
    formData.append('webinarName', batchWebinarName);

    try {
      const token = localStorage.getItem('token');
      // Using relative path to leverage Vite proxy or direct API_BASE
      const response = await fetch(`${API_BASE}/api/certificates/upload-csv`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: formData,
      });

      const responseText = await response.text();

      if (response.ok || responseText.includes("Processing started")) {
        // Automatically jump to tracking tab upon successful submission
        setActiveTab('tracking');
      } else {
        throw new Error(responseText || `Upload failed with status: ${response.status}`);
      }
    } catch (err) {
      setErrorStatus(err.message || "An error occurred connecting to the server.");
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', padding: '24px' }}>

      {/* Error Output */}
      {errorStatus && (
        <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-danger)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
          <AlertCircle size={18} />
          {errorStatus}
        </div>
      )}

      {/* Webinar Name Input */}
      <div style={{ marginBottom: '20px' }}>
        <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
          Webinar Name / Topic *
        </label>
        <input
          type="text"
          className="input-field"
          placeholder="e.g. Masterclass on AI Strategy"
          value={batchWebinarName}
          onChange={(e) => setBatchWebinarName(e.target.value)}
          style={{ width: '100%', padding: '12px 16px' }}
        />
        <p style={{ marginTop: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          This name will appear on all certificates generated from the uploaded CSV.
        </p>
      </div>

      {/* Action Button */}
      <div>
        <button
          className="btn-primary"
          style={{ width: '100%', padding: '16px', fontSize: '1.05rem', marginTop: '0' }}
          onClick={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
              <Zap className="spin-animation" size={20} />
              Processing Records...
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
              <Send size={20} />
              Generate & Send Emails
            </div>
          )}
        </button>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin-animation {
          animation: spin 2s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default ConfigurationPanel;
