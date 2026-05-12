import React from 'react';
import { 
  BarChart, 
  Bar, 
  Cell, 
  XAxis,
  YAxis,
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid
} from 'recharts';
import { BarChart as BarIcon } from 'lucide-react';

const LeadStatusPieChart = ({ leads, distribution, isDarkMode }) => {
  const hasData = (leads && leads.length > 0) || (distribution && Object.keys(distribution).length > 0);

  if (!hasData) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center h-100 opacity-20">
        <BarIcon size={48} className="mb-2" />
        <p className="fw-black text-uppercase small tracking-widest">No Pipeline Data</p>
      </div>
    );
  }

  // Prioritize the pre-calculated distribution from the backend for absolute consistency
  const finalDistribution = (distribution && Object.keys(distribution).length > 0) ? distribution : {};

  const totalCount = Object.values(finalDistribution).reduce((sum, v) => sum + v, 0);

  const data = Object.keys(finalDistribution)
    .filter(status => finalDistribution[status] > 0) // Only show statuses with data
    .map(status => ({
      name: status.replace(/_/g, ' '),
      value: finalDistribution[status]
    })).sort((a, b) => b.value - a.value);

  const COLORS = {
    'NEW': '#6366f1',
    'INTERESTED': '#f59e0b',
    'PAID': '#10b981',
    'CONVERTED': '#10b981',
    'LOST': '#f43f5e',
    'WORKING': '#0ea5e9',
    'EMI': '#8b5cf6',
    'FOLLOW UP': '#ec4899',
    'SUCCESS': '#10b981',
    'PENDING': '#f59e0b'
  };

  const getStatusColor = (status) => COLORS[status.toUpperCase()] || '#94a3b8';

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-3 rounded shadow-lg border-0" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <p className="fw-black mb-1 small text-uppercase" style={{ color: payload[0].payload.fill }}>{payload[0].name}</p>
          <p className="fw-bold mb-0 text-main">{payload[0].value} Leads</p>
          <p className="text-muted mb-0 fw-bold" style={{ fontSize: '10px' }}>{((payload[0].value / totalCount) * 100).toFixed(1)}% of Pipeline</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-100 h-100 d-flex flex-column">
      <div className="flex-grow-1 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data} 
            layout="vertical" 
            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
            <XAxis type="number" hide />
            <YAxis 
              dataKey="name" 
              type="category" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 9, fontWeight: 900, fill: isDarkMode ? '#a0aec0' : '#64748b' }}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
            <Bar 
              dataKey="value" 
              radius={[0, 4, 4, 0]} 
              barSize={12}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getStatusColor(entry.name)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="p-3 border-top border-white border-opacity-5 d-flex flex-wrap justify-content-center gap-3">
        {data.map((entry, index) => (
          <div key={index} className="d-flex align-items-center gap-2">
            <div className="rounded-circle" style={{ width: 8, height: 8, backgroundColor: getStatusColor(entry.name) }}></div>
            <span className="fw-black text-uppercase" style={{ fontSize: '9px', color: isDarkMode ? '#a0aec0' : '#64748b' }}>{entry.name} ({entry.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeadStatusPieChart;
