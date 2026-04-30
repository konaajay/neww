import React from 'react';

export const StatSkeleton = () => (
  <div className="premium-card h-100 border border-white border-opacity-10 shadow-lg overflow-hidden" 
       style={{ borderRadius: '24px', background: 'rgba(255, 255, 255, 0.03)', minHeight: '160px' }}>
    <div className="p-4 d-flex flex-column h-100">
      <div className="shimmer mb-3" style={{ width: '40%', height: '10px' }}></div>
      <div className="flex-grow-1 d-flex align-items-center justify-content-between my-2">
        <div className="shimmer" style={{ width: '60%', height: '32px' }}></div>
        <div className="p-3 rounded-4 shimmer" style={{ width: '45px', height: '45px' }}></div>
      </div>
      <div className="mt-auto pt-3 border-top border-white border-opacity-5">
        <div className="shimmer" style={{ width: '30%', height: '8px' }}></div>
      </div>
    </div>
  </div>
);

export const ChartSkeleton = () => (
  <div className="premium-card h-100 border border-white border-opacity-10 shadow-lg overflow-hidden" 
       style={{ borderRadius: '24px', background: 'rgba(255, 255, 255, 0.03)', minHeight: '400px' }}>
    <div className="card-header bg-transparent p-4 border-0 border-bottom border-white border-opacity-5">
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

export const TableSkeleton = ({ rows = 5 }) => (
  <div className="w-100">
    {[...Array(rows)].map((_, i) => (
      <div key={i} className="p-3 d-flex gap-4 border-bottom border-white border-opacity-5">
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
