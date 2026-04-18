import React from 'react';
import { IndianRupee, Phone, Zap, TrendingUp } from 'lucide-react';
import StatCard from '../../../components/StatCard';

const StatsCards = ({ stats }) => {
  return (
    <div className="row g-4 mb-4">
      <div className="col-12 col-sm-6 col-md-3">
        <StatCard 
          title="Revenue" 
          value={`₹ ${stats?.totalRevenue?.toLocaleString() || 0}`} 
          sub="Confirmed Transmission" 
          icon={<IndianRupee />} 
          color="primary" 
        />
      </div>
      
      <div className="col-12 col-sm-6 col-md-3">
        <StatCard 
          title="Activity" 
          value={stats?.callsToday || 0} 
          sub="Operational Outbox Today" 
          icon={<Phone />} 
          color="info" 
        />
      </div>

      <div className="col-12 col-sm-6 col-md-3">
        <StatCard 
          title="Interest" 
          value={stats?.interestedToday || 0} 
          sub="High Intensity Leads" 
          icon={<Zap />} 
          color="success" 
        />
      </div>

      <div className="col-12 col-sm-6 col-md-3">
        <StatCard 
          title="Termination" 
          value={stats?.notInterestedToday || 0} 
          sub="Strategic Gap / Lost" 
          icon={<TrendingUp />} 
          color="danger" 
        />
      </div>
    </div>
  );
};

export default StatsCards;
