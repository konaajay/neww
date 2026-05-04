import React from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area 
} from 'recharts';
import { BarChart3 } from 'lucide-react';

const RevenueTrendChart = ({ data }) => {
  const { isDarkMode } = useTheme();

  if (!data || data.length === 0) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center h-100 py-5 opacity-50">
        <BarChart3 size={48} className="mb-2" />
        <p className="small fw-black text-uppercase tracking-widest">No Signal Detected</p>
      </div>
    );
  }

  // Senior dev tip: Use a custom tooltip that won't break the layout
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-3 rounded-3 shadow-xl border-0" style={{ 
          backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', 
          border: '1px solid var(--border-color)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}>
          <p className="fw-black mb-2 small text-uppercase tracking-wider opacity-50">
            {new Date(label).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
          </p>
          <div className="d-flex flex-column gap-2">
            {payload.map((entry, index) => (
              <div key={index} className="d-flex align-items-center justify-content-between gap-4">
                <span className="small d-flex align-items-center gap-2 fw-bold" style={{ color: entry.color }}>
                  <div className="rounded-circle" style={{ width: 6, height: 6, backgroundColor: entry.color }}></div>
                  {entry.name}
                </span>
                <span className="fw-black small">{entry.name.includes('Revenue') ? `₹${entry.value.toLocaleString()}` : entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-100 h-100 d-flex flex-column">
      <div className="flex-grow-1" style={{ minHeight: '320px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
            
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              minTickGap={30}
              tick={{ fontSize: 10, fill: 'var(--text-muted)', fontWeight: 600 }}
              tickFormatter={(d) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
            />
            
            {/* Left Axis: Units (Leads/Lost) */}
            <YAxis 
              yAxisId="left"
              axisLine={false} 
              tickLine={false} 
              domain={[0, 'dataMax + 2']}
              tick={{ fontSize: 10, fill: 'var(--text-muted)', fontWeight: 600 }}
            />
            
            {/* Right Axis: Revenue (INR) */}
            <YAxis 
              yAxisId="right"
              orientation="right"
              axisLine={false} 
              tickLine={false} 
              domain={[0, Math.max(20000, ...data.map(d => d.revenue || 0)) * 1.2]}
              ticks={[0, 1000, 2000, 3000, 5000, 10000, 20000]}
              tick={{ fontSize: 10, fill: 'var(--text-muted)', fontWeight: 600 }}
              tickFormatter={(v) => v >= 1000 ? `${v/1000}k` : v}
            />

            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border-color)', strokeWidth: 1 }} />
            
            <Area 
              yAxisId="left"
              name="Leads Pipeline"
              type="monotone" 
              dataKey="leadsCount" 
              stroke="#6366f1" 
              strokeWidth={3}
              fill="url(#colorLeads)"
              dot={{ r: 2, fill: '#6366f1', strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />

            <Area
              yAxisId="left"
              type="monotone"
              dataKey={(d) => d.convertedCount || d.convertedLeads || 0}
              name="Converted"
              stroke="#fbbf24"
              fillOpacity={0.15}
              fill="#fbbf24"
              strokeWidth={3}
            />

            <Area
              yAxisId="right"
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke="#10b981"
              fillOpacity={0.1}
              fill="url(#colorRev)"
              strokeWidth={3}
            />

            <Area
              yAxisId="left"
              type="monotone"
              dataKey={(d) => d.lostCount || d.lostLeads || 0}
              name="Lost"
              stroke="#ef4444"
              fillOpacity={0.05}
              fill="#ef4444"
              strokeDasharray="5 5"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend Refinement */}
      <div className="d-flex justify-content-center flex-wrap gap-4 mt-3 py-2 border-top border-white border-opacity-5">
        <div className="d-flex align-items-center gap-2">
          <div className="rounded-circle" style={{ width: 8, height: 8, background: '#6366f1' }}></div>
          <span className="small fw-black text-muted text-uppercase tracking-widest" style={{ fontSize: '9px' }}>Leads</span>
        </div>
        <div className="d-flex align-items-center gap-2">
          <div className="rounded-circle" style={{ width: 8, height: 8, background: '#fbbf24' }}></div>
          <span className="small fw-black text-muted text-uppercase tracking-widest" style={{ fontSize: '9px' }}>Converted</span>
        </div>
        <div className="d-flex align-items-center gap-2">
          <div className="rounded-circle" style={{ width: 8, height: 8, background: '#10b981' }}></div>
          <span className="small fw-black text-muted text-uppercase tracking-widest" style={{ fontSize: '9px' }}>Revenue</span>
        </div>
        <div className="d-flex align-items-center gap-2">
          <div className="rounded-circle" style={{ width: 8, height: 8, background: '#f43f5e' }}></div>
          <span className="small fw-black text-muted text-uppercase tracking-widest" style={{ fontSize: '9px' }}>Lost</span>
        </div>
      </div>
    </div>
  );
};

export default RevenueTrendChart;
