import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, CheckCircle2, LayoutTemplate, Image as ImageIcon, RefreshCw, Download } from 'lucide-react';
import Papa from 'papaparse';
import gyLogo from '../assets/gy1-png.png';
import GLogoCertificateTemplate from './GLogoCertificateTemplate';

const UploadSection = ({ csvFile, setCsvFile, templateFile, setTemplateFile }) => {
  const [templateUrl, setTemplateUrl] = useState(null);
  const [csvData, setCsvData] = useState([]);

  const templateInputRef = useRef(null);
  const csvInputRef = useRef(null);

  useEffect(() => {
    if (templateFile && templateFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(templateFile);
      setTemplateUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setTemplateUrl(null);
  }, [templateFile]);

  const handleTemplateSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setTemplateFile(e.target.files[0]);
    }
  };

  const handleCsvSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCsvFile(file);
      
      // Parse CSV locally for validation/stats
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setCsvData(results.data);
          console.log("Parsed CSV Data:", results.data);
        },
        error: (error) => {
          console.error("CSV Parse Error:", error);
        }
      });
    }
  };

  // Helper to find field value regardless of case or common aliases
  const getField = (row, ...aliases) => {
    if (!row) return '-';
    const keys = Object.keys(row);
    for (const alias of aliases) {
      const match = keys.find(k => k.trim().toLowerCase() === alias.trim().toLowerCase());
      if (match && row[match]) return row[match];
    }
    return '-';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top Header & Buttons */}
      <div className="upload-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '4px' }}>Designer Workspace</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Required CSV columns: <code style={{ color: 'var(--accent-primary)', fontWeight: '600' }}>Timestamp, Email Address, FULL NAME FOR CERTIFICATE</code>
            <br />
            <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>(Note: Webinar Name is entered separately below)</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }} className="upload-buttons">
          <button 
            onClick={() => templateInputRef.current?.click()}
            className="btn-secondary"
            style={{ padding: '10px 16px', fontSize: '0.9rem', background: '#ffffff', color: 'var(--text-primary)', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}
          >
            <ImageIcon size={16} color="var(--accent-primary)" />
            Upload Template
          </button>
          
          <a 
            href="/sample.csv" 
            download="sample.csv"
            className="btn-secondary"
            style={{ padding: '10px 16px', fontSize: '0.9rem', background: '#ffffff', color: 'var(--text-primary)', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Download size={16} color="var(--accent-primary)" />
            Sample CSV
          </a>

          <button 
            onClick={() => csvInputRef.current?.click()}
            className="btn-secondary"
            style={{ padding: '10px 16px', fontSize: '0.9rem', background: '#ffffff', color: 'var(--text-primary)', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}
          >
            <FileText size={16} color="var(--accent-secondary)" />
            Upload CSV
          </button>

          {/* Hidden Inputs */}
          <input 
            type="file" 
            ref={templateInputRef} 
            onChange={handleTemplateSelect} 
            accept="image/*,.pdf" 
            style={{ display: 'none' }} 
          />
          <input 
            type="file" 
            ref={csvInputRef} 
            onChange={handleCsvSelect} 
            accept=".csv, text/csv, application/vnd.ms-excel, application/csv, text/x-csv, application/x-csv, text/comma-separated-values, text/x-comma-separated-values, .txt, text/plain" 
            style={{ display: 'none' }} 
          />
        </div>
      </div>

      {/* CSV Data Preview Card */}
      {csvFile && csvData.length > 0 && (
        <div className="glass-panel" style={{ padding: '20px', background: 'rgba(255,255,255,0.4)', borderRadius: '12px', border: '1px dotted var(--accent-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} color="var(--accent-primary)" />
              <h3 style={{ fontSize: '0.95rem', fontWeight: '700' }}>CSV Contents ({csvData.length} records)</h3>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {[
                { label: 'Timestamp', aliases: ['Timestamp', 'Date', 'Time'] },
                { label: 'Email Address', aliases: ['Email Address', 'Email', 'Mail'] },
                { label: 'FULL NAME FOR CERTIFICATE', aliases: ['FULL NAME FOR CERTIFICATE', 'Name', 'Full Name'] }
              ].map(col => {
                const exists = Object.keys(csvData[0]).some(k => 
                  col.aliases.some(a => k.trim().toLowerCase() === a.trim().toLowerCase() || k.trim().toLowerCase().includes(a.trim().toLowerCase()))
                );
                return (
                  <span key={col.label} className="badge" style={{ 
                    fontSize: '0.7rem', 
                    background: exists ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: exists ? 'var(--accent-success)' : 'var(--accent-danger)',
                    border: `1px solid ${exists ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                  }}>
                    {exists ? '✓' : '✗'} {col.label}
                  </span>
                )
              })}
            </div>
          </div>
          
          <div style={{ maxHeight: '180px', overflowY: 'auto', borderRadius: '8px', background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(0,0,0,0.05)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)' }}>
                <tr>
                  <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>Full Name</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>Email</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>Timestamp</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>College</th>
                </tr>
              </thead>
              <tbody>
                {csvData.slice(0, 3).map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.02)' }}>
                    <td style={{ padding: '10px 12px' }}>{getField(row, 'FULL NAME FOR CERTIFICATE', 'fullname', 'name')}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{getField(row, 'Email Address', 'email', 'mail')}</td>
                    <td style={{ padding: '10px 12px', fontStyle: 'italic' }}>{getField(row, 'Timestamp', 'date')}</td>
                    <td style={{ padding: '10px 12px' }}>{getField(row, 'COLLEGE NAME', 'college')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {csvData.length > 3 && (
              <div style={{ textAlign: 'center', padding: '8px', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(0,0,0,0.02)' }}>
                + {csvData.length - 3} more records...
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default UploadSection;
