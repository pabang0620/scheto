import React from 'react';
import './RankBadge.css';

const RankBadge = ({ rank, size = 'medium', className = '' }) => {
  const getRankConfig = (rank) => {
    switch (rank?.toUpperCase()) {
      case 'S':
        return {
          label: 'S',
          color: 'rank-s',
          icon: 'fas fa-crown'
        };
      case 'A':
        return {
          label: 'A',
          color: 'rank-a',
          icon: 'fas fa-star'
        };
      case 'B':
        return {
          label: 'B',
          color: 'rank-b',
          icon: 'fas fa-medal'
        };
      case 'C':
        return {
          label: 'C',
          color: 'rank-c',
          icon: 'fas fa-circle'
        };
      case 'D':
        return {
          label: 'D',
          color: 'rank-d',
          icon: 'fas fa-minus-circle'
        };
      default:
        return {
          label: '?',
          color: 'rank-unknown',
          icon: 'fas fa-question'
        };
    }
  };

  const config = getRankConfig(rank);

  return (
    <span className={`rank-badge ${config.color} rank-badge-${size} ${className}`}>
      <i className={config.icon}></i>
      <span className="rank-label">{config.label}</span>
    </span>
  );
};

export default RankBadge;