import React from 'react';
import { useTheme } from '../../../context/ThemeContext';

export const StatSkeleton = () => {
  const { isDarkMode } = useTheme();
  return (
    <div className="p-4 d-flex flex-column gap-1 overflow-hidden" 
         style={{ borderRadius: '24px', background: isDarkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)', minHeight: '120px', border: '1px solid var(--border-color)' }}>
        <div className="shimmer mb-1" style={{ width: '60%', height: '32px' }}></div>
        <div className="shimmer" style={{ width: '40%', height: '10px' }}></div>
    </div>
  );
};

export const MetricSkeletonRow = ({ count = 3 }) => (
  <div className="row g-4">
    {[...Array(count)].map((_, i) => (
      <div key={i} className={`col-12 col-md-${12/count}`}>
        <StatSkeleton />
      </div>
    ))}
  </div>
);

export const ChartSkeleton = () => {
  const { isDarkMode } = useTheme();
  return (
    <div className="premium-card h-100 border border-opacity-10 shadow-lg overflow-hidden" 
         style={{ borderRadius: '24px', background: isDarkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)', minHeight: '400px', borderColor: isDarkMode ? 'white' : 'black' }}>
      <div className="card-header bg-transparent p-4 border-0 border-bottom border-opacity-5" style={{ borderColor: isDarkMode ? 'white' : 'black' }}>
        <div className="shimmer mb-2" style={{ width: '30%', height: '12px' }}></div>
        <div className="shimmer" style={{ width: '20%', height: '8px' }}></div>
      </div>
      <div className="card-body p-4 d-flex align-items-end gap-3 justify-content-between">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="shimmer rounded-top" style={{ flex: 1, height: `${Math.random() * 60 + 20}%` }}></div>
        ))}
      </div>
    </div>
  );
};

export const TableSkeleton = ({ rows = 5 }) => {
  const { isDarkMode } = useTheme();
  return (
    <div className="w-100 p-4" style={{ background: isDarkMode ? 'transparent' : 'rgba(0,0,0,0.01)', borderRadius: '24px' }}>
      <div className="d-flex gap-4 mb-4">
        <div className="shimmer" style={{ width: '150px', height: '10px' }}></div>
        <div className="shimmer ms-auto" style={{ width: '100px', height: '10px' }}></div>
      </div>
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="p-3 d-flex gap-4 border-bottom border-opacity-5" style={{ borderColor: isDarkMode ? 'white' : 'black' }}>
        <div className="shimmer rounded-circle" style={{ width: '32px', height: '32px', flexShrink: 0 }}></div>
        <div className="flex-grow-1">
          <div className="shimmer mb-2" style={{ width: '40%', height: '10px' }}></div>
          <div className="shimmer" style={{ width: '25%', height: '8px' }}></div>
        </div>
        <div className="shimmer align-self-center" style={{ width: '15%', height: '10px' }}></div>
      </div>
    ))}
  </div>
  );
};
