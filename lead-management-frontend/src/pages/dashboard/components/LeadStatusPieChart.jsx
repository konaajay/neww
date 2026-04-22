import React from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';

const LeadStatusPieChart = ({ leads, distribution, isDarkMode }) => {
  const hasData = (leads && leads.length > 0) || (distribution && Object.keys(distribution).length > 0);

  if (!hasData) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center h-100 opacity-20">
        <PieIcon size={48} className="mb-2" />
        <p className="fw-black text-uppercase small tracking-widest">No Pipeline Data</p>
      </div>
    );
  }

  // Use provided distribution or aggregate from leads
  const finalDistribution = distribution || leads.reduce((acc, lead) => {
    const status = lead.status || 'NEW';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const totalCount = Object.values(finalDistribution).reduce((sum, v) => sum + v, 0);

  const data = Object.keys(finalDistribution).map(status => ({
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
    'FOLLOW UP': '#ec4899'
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
      <div className="flex-grow-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getStatusColor(entry.name)} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="p-3 border-top border-white border-opacity-5 d-flex flex-wrap justify-content-center gap-3">
        {data.slice(0, 4).map((entry, index) => (
          <div key={index} className="d-flex align-items-center gap-2">
            <div className="rounded-circle" style={{ width: 8, height: 8, backgroundColor: getStatusColor(entry.name) }}></div>
            <span className="fw-black text-muted text-uppercase" style={{ fontSize: '9px' }}>{entry.name} ({entry.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeadStatusPieChart;
