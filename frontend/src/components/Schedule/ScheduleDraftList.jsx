import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import ScheduleDraftCard from './ScheduleDraftCard';
import './ScheduleDraftList.css';

const ScheduleDraftList = ({
  drafts,
  activeDraft,
  selectedDrafts,
  onDraftSelect,
  onActivateDraft,
  onDeleteDraft,
  maxSelections = 2
}) => {
  const { t } = useLanguage();

  const handleDraftSelect = (draft) => {
    // Check if we can select more drafts
    const isAlreadySelected = selectedDrafts.some(d => 
      typeof d === 'object' ? d.id === draft.id : d === draft.id
    );
    if (!isAlreadySelected && selectedDrafts.length >= maxSelections) {
      return; // Cannot select more drafts
    }
    onDraftSelect(draft);
  };

  const sortedDrafts = React.useMemo(() => {
    return [...drafts].sort((a, b) => {
      // Active draft first
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      
      // Then sort by creation date (newest first)
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [drafts]);

  if (drafts.length === 0) {
    return (
      <div className="draft-list-empty">
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <h3>{t('scheduleManagement.emptyState.title')}</h3>
          <p>{t('scheduleManagement.emptyState.description')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="schedule-draft-list">
      <div className="draft-list-header">
        <h2>{t('scheduleManagement.draftList.title')}</h2>
        <div className="list-stats">
          <span className="total-drafts">
            {t('scheduleManagement.draftList.totalDrafts', { count: drafts.length })}
          </span>
          {selectedDrafts.length > 0 && (
            <span className="selected-drafts">
              {t('scheduleManagement.draftList.selectedDrafts', { 
                count: selectedDrafts.length,
                max: maxSelections 
              })}
            </span>
          )}
        </div>
      </div>

      {maxSelections > 1 && (
        <div className="selection-info">
          <p>{t('scheduleManagement.draftList.selectionHint', { max: maxSelections })}</p>
        </div>
      )}

      <div className="draft-list-grid">
        {sortedDrafts.map((draft) => (
          <ScheduleDraftCard
            key={draft.id}
            draft={draft}
            isActive={draft.isActive}
            isSelected={selectedDrafts.some(d => 
              typeof d === 'object' ? d.id === draft.id : d === draft.id
            )}
            canSelect={selectedDrafts.some(d => 
              typeof d === 'object' ? d.id === draft.id : d === draft.id
            ) || selectedDrafts.length < maxSelections}
            onSelect={() => handleDraftSelect(draft)}
            onActivate={() => onActivateDraft(draft)}
            onDelete={() => onDeleteDraft(draft.id)}
            showActions={true}
          />
        ))}
      </div>

      {activeDraft && (
        <div className="active-draft-info">
          <div className="info-card">
            <h3>{t('scheduleManagement.activeDraft.title')}</h3>
            <p>
              {t('scheduleManagement.activeDraft.description', {
                name: activeDraft.name,
                date: new Date(activeDraft.activatedAt).toLocaleDateString()
              })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleDraftList;