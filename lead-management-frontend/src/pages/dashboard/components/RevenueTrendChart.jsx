import React from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { TrendingUp, BarChart3 } from 'lucide-react';

const RevenueTrendChart = ({ data }) => {
  const { isDarkMode } = useTheme();

  if (!data || data.length === 0) {
    return (
      <div className="premium-card h-100 p-5 text-center bg-transparent border-0 d-flex flex-column align-items-center justify-content-center">
        <BarChart3 className="text-muted mb-3 opacity-25" size={48} />
        <h5 className="fw-bold text-muted text-uppercase mb-0 small tracking-widest">Synchronization Required</h5>
        <p className="text-muted small">Select a date range to visualize the revenue pipeline</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className={`p-3 rounded shadow-lg border-0 glass-panel`} style={{ zIndex: 1000, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <p className="fw-bold mb-2 small text-uppercase opacity-75" style={{ color: 'var(--text-muted)' }}>{new Date(label).toDateString()}</p>
          <div className="d-flex flex-column gap-1">
            <div className="d-flex align-items-center justify-content-between gap-4">
              <span className="small d-flex align-items-center gap-2" style={{ color: 'var(--text-main)' }}>
                <div className="rounded-circle" style={{ width: 8, height: 8, backgroundColor: '#6366f1' }}></div>
                Leads Pipeline
              </span>
              <span className="fw-black" style={{ color: '#6366f1' }}>{payload[0].value}</span>
            </div>
            <div className="d-flex align-items-center justify-content-between gap-4 border-top border-white border-opacity-10 pt-1 mt-1">
              <span className="small d-flex align-items-center gap-2" style={{ color: 'var(--text-main)' }}>
                <div className="rounded-circle" style={{ width: 8, height: 8, backgroundColor: '#f43f5e' }}></div>
                Lost Assets
              </span>
              <span className="fw-black" style={{ color: '#f43f5e' }}>{payload[1]?.value || 0}</span>
            </div>
            <div className="d-flex align-items-center justify-content-between gap-4 border-top border-white border-opacity-10 pt-1 mt-1">
              <span className="small d-flex align-items-center gap-2" style={{ color: 'var(--text-main)' }}>
                <div className="rounded-circle" style={{ width: 8, height: 8, backgroundColor: '#10b981' }}></div>
                Revenue Value
              </span>
              <span className="fw-black" style={{ color: '#10b981' }}>₹ {payload[2]?.value ? payload[2].value.toLocaleString() : 0}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <div className="w-100 bg-transparent" style={{ height: '350px', minHeight: '350px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart 
            data={data} 
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorLost" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: isDarkMode ? '#9ca3af' : '#64748b' }}
              tickFormatter={(date) => {
                try {
                  return new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
                } catch(e) { return date; }
              }}
              minTickGap={30}
            />
            <YAxis 
              yAxisId="left"
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: isDarkMode ? '#9ca3af' : '#64748b' }}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: isDarkMode ? '#9ca3af' : '#64748b' }}
              tickFormatter={(val) => `₹${val >= 1000 ? (val/1000).toFixed(1) + 'k' : val}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              yAxisId="left"
              type="monotone" 
              dataKey="leadsCount" 
              stroke="#6366f1" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorLeads)" 
              connectNulls
            />
            <Area 
              yAxisId="left"
              type="monotone" 
              dataKey="lostCount" 
              stroke="#f43f5e" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorLost)" 
              connectNulls
            />
            <Area 
              yAxisId="right"
              type="monotone" 
              dataKey="revenue" 
              stroke="#10b981" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorRev)" 
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="pt-2 pb-3 border-top border-white border-opacity-5">
        <div className="d-flex justify-content-center gap-4">
          <div className="d-flex align-items-center gap-2">
            <div className="rounded-circle" style={{ width: 8, height: 8, background: '#6366f1' }}></div>
            <span className="small fw-bold text-muted" style={{ fontSize: '10px' }}>Leads Pipeline</span>
          </div>
          <div className="d-flex align-items-center gap-2">
            <div className="rounded-circle" style={{ width: 8, height: 8, background: '#10b981' }}></div>
            <span className="small fw-bold text-muted" style={{ fontSize: '10px' }}>Revenue Value</span>
          </div>
          <div className="d-flex align-items-center gap-2">
            <div className="rounded-circle" style={{ width: 8, height: 8, background: '#f43f5e' }}></div>
            <span className="small fw-bold text-muted" style={{ fontSize: '10px' }}>Lost Assets</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default RevenueTrendChart;
