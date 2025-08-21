import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatDate, formatTimeRange } from '../../utils/dateFormatter';
import './ScheduleDraftCard.css';

const ScheduleDraftCard = ({
  draft,
  isActive,
  isSelected,
  canSelect,
  onSelect,
  onActivate,
  onDelete,
  showActions = true
}) => {
  const { t } = useLanguage();
  const [showDetails, setShowDetails] = useState(false);

  const handleCardClick = (e) => {
    e.preventDefault();
    if (canSelect && showActions) {
      onSelect();
    }
  };

  const handleActivate = (e) => {
    e.stopPropagation();
    onActivate();
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete();
  };

  const toggleDetails = (e) => {
    e.stopPropagation();
    setShowDetails(!showDetails);
  };

  const getStatusBadge = () => {
    if (isActive) {
      return <span className="status-badge active">{t('scheduleManagement.status.active')}</span>;
    }
    
    switch (draft.status) {
      case 'pending':
        return <span className="status-badge pending">{t('scheduleManagement.status.pending')}</span>;
      case 'approved':
        return <span className="status-badge approved">{t('scheduleManagement.status.approved')}</span>;
      case 'rejected':
        return <span className="status-badge rejected">{t('scheduleManagement.status.rejected')}</span>;
      default:
        return <span className="status-badge draft">{t('scheduleManagement.status.draft')}</span>;
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 70) return 'fair';
    return 'poor';
  };

  return (
    <div 
      className={`schedule-draft-card ${isSelected ? 'selected' : ''} ${!canSelect ? 'disabled' : ''} ${isActive ? 'active-draft' : ''}`}
      onClick={handleCardClick}
    >
      <div className="card-header">
        <div className="card-title-section">
          <h3 className="draft-title">{draft.name}</h3>
          {getStatusBadge()}
        </div>
        
        {showActions && canSelect && (
          <div className="selection-checkbox">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => {}}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>

      <div className="card-content">
        <div className="draft-meta">
          <div className="meta-item">
            <span className="meta-label">{t('scheduleManagement.card.createdAt')}:</span>
            <span className="meta-value">{formatDate(draft.createdAt)}</span>
          </div>
          
          <div className="meta-item">
            <span className="meta-label">{t('scheduleManagement.card.period')}:</span>
            <span className="meta-value">
              {formatDate(draft.startDate)} - {formatDate(draft.endDate)}
            </span>
          </div>
          
          <div className="meta-item">
            <span className="meta-label">{t('scheduleManagement.card.employees')}:</span>
            <span className="meta-value">{draft.employeeCount}</span>
          </div>
        </div>

        {draft.score && (
          <div className="draft-score">
            <div className="score-label">{t('scheduleManagement.card.score')}</div>
            <div className={`score-value ${getScoreColor(draft.score)}`}>
              {draft.score}%
            </div>
          </div>
        )}

        {draft.description && (
          <div className="draft-description">
            {draft.description}
          </div>
        )}

        <div className="draft-stats">
          <div className="stat-item">
            <span className="stat-label">{t('scheduleManagement.card.totalShifts')}</span>
            <span className="stat-value">{draft.totalShifts || 0}</span>
          </div>
          
          <div className="stat-item">
            <span className="stat-label">{t('scheduleManagement.card.coverage')}</span>
            <span className="stat-value">{draft.coverage || 0}%</span>
          </div>
        </div>

        {showDetails && (
          <div className="draft-details">
            <div className="details-section">
              <h4>{t('scheduleManagement.card.generationSettings')}</h4>
              <div className="settings-grid">
                {draft.settings?.map((setting, index) => (
                  <div key={index} className="setting-item">
                    <span className="setting-name">{setting.name}:</span>
                    <span className="setting-value">{setting.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {draft.conflicts && draft.conflicts.length > 0 && (
              <div className="details-section">
                <h4>{t('scheduleManagement.card.conflicts')}</h4>
                <div className="conflict-list">
                  {draft.conflicts.slice(0, 3).map((conflict, index) => (
                    <div key={index} className="conflict-item">
                      <span className="conflict-type">{conflict.type}:</span>
                      <span className="conflict-description">{conflict.description}</span>
                    </div>
                  ))}
                  {draft.conflicts.length > 3 && (
                    <div className="conflict-more">
                      +{draft.conflicts.length - 3} {t('scheduleManagement.card.moreConflicts')}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card-footer">
        <button
          className="btn btn-link details-toggle"
          onClick={toggleDetails}
        >
          {showDetails ? t('common.showLess') : t('common.showMore')}
        </button>

        {showActions && (
          <div className="card-actions">
            {!isActive && draft.status !== 'rejected' && (
              <button
                className="btn btn-primary btn-sm"
                onClick={handleActivate}
                disabled={!draft.canActivate}
              >
                {t('scheduleManagement.actions.activate')}
              </button>
            )}
            
            {!isActive && (
              <button
                className="btn btn-danger btn-sm"
                onClick={handleDelete}
              >
                {t('scheduleManagement.actions.delete')}
              </button>
            )}
          </div>
        )}
      </div>

      {isActive && (
        <div className="active-indicator">
          <span className="active-icon">✓</span>
          <span className="active-text">{t('scheduleManagement.status.currentlyActive')}</span>
        </div>
      )}
    </div>
  );
};

export default ScheduleDraftCard;