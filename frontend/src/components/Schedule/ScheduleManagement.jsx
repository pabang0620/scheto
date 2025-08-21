import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { scheduleDrafts } from '../../services/api';
import ScheduleDraftList from './ScheduleDraftList';
import ScheduleComparison from './ScheduleComparison';
import ScheduleActivationModal from './ScheduleActivationModal';
import ScheduleMergeModal from './ScheduleMergeModal';
import LoadingSpinner from '../shared/LoadingSpinner';
import ErrorMessage from '../shared/ErrorMessage';
import './ScheduleManagement.css';

const ScheduleManagement = () => {
  const { t } = useLanguage();
  const [drafts, setDrafts] = useState([]);
  const [selectedDrafts, setSelectedDrafts] = useState([]);
  const [activeDraft, setActiveDraft] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isComparing, setIsComparing] = useState(false);
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [draftToActivate, setDraftToActivate] = useState(null);
  const [showMergeModal, setShowMergeModal] = useState(false);

  // Load drafts on component mount
  useEffect(() => {
    loadDrafts();
  }, []);

  const loadDrafts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await scheduleDrafts.getAll();
      setDrafts(response.data);
      
      // Find the active draft
      const active = response.data.find(draft => draft.isActive);
      setActiveDraft(active);
    } catch (err) {
      console.error('Error loading drafts:', err);
      setError(t('scheduleManagement.errors.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDraftSelect = (draft) => {
    const draftId = draft.id;
    if (selectedDrafts.find(d => d.id === draftId)) {
      setSelectedDrafts(selectedDrafts.filter(d => d.id !== draftId));
    } else if (selectedDrafts.length < 10) { // 최대 10개까지 선택 가능
      setSelectedDrafts([...selectedDrafts, draft]);
    }
  };

  const handleCompare = () => {
    if (selectedDrafts.length === 2) {
      setIsComparing(true);
    }
  };

  const handleStopComparing = () => {
    setIsComparing(false);
    setSelectedDrafts([]);
  };

  const handleActivateDraft = (draft) => {
    setDraftToActivate(draft);
    setShowActivationModal(true);
  };

  const confirmActivation = async () => {
    try {
      await scheduleDrafts.activate(draftToActivate.id);
      await loadDrafts(); // Reload to get updated active status
      setShowActivationModal(false);
      setDraftToActivate(null);
    } catch (err) {
      console.error('Error activating draft:', err);
      setError(t('scheduleManagement.errors.activationFailed'));
    }
  };

  const handleDeleteDraft = async (draftId) => {
    if (window.confirm(t('scheduleManagement.confirmDelete'))) {
      try {
        await scheduleDrafts.delete(draftId);
        await loadDrafts();
      } catch (err) {
        console.error('Error deleting draft:', err);
        setError(t('scheduleManagement.errors.deleteFailed'));
      }
    }
  };

  const handleMerge = () => {
    if (selectedDrafts.length >= 2) {
      setShowMergeModal(true);
    }
  };

  const handleMergeComplete = (mergedDraft) => {
    // 병합 완료 후 드래프트 목록 새로고침
    loadDrafts();
    setSelectedDrafts([]);
    setShowMergeModal(false);
  };

  const handleRefresh = () => {
    loadDrafts();
  };

  if (isLoading) {
    return (
      <div className="schedule-management">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="schedule-management">
      <div className="schedule-management-header">
        <h1>{t('scheduleManagement.title')}</h1>
        <div className="header-actions">
          <button 
            className="btn btn-secondary"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            {t('common.refresh')}
          </button>
          
          {selectedDrafts.length === 2 && !isComparing && (
            <button 
              className="btn btn-primary"
              onClick={handleCompare}
            >
              {t('scheduleManagement.actions.compare')}
            </button>
          )}
          
          {selectedDrafts.length >= 2 && !isComparing && (
            <button 
              className="btn btn-success"
              onClick={handleMerge}
            >
              {t('scheduleManagement.actions.merge')} ({selectedDrafts.length})
            </button>
          )}
          
          {isComparing && (
            <button 
              className="btn btn-secondary"
              onClick={handleStopComparing}
            >
              {t('scheduleManagement.actions.stopComparing')}
            </button>
          )}
        </div>
      </div>

      {error && (
        <ErrorMessage 
          message={error} 
          onDismiss={() => setError(null)} 
        />
      )}

      <div className="schedule-management-content">
        {!isComparing ? (
          <ScheduleDraftList
            drafts={drafts}
            activeDraft={activeDraft}
            selectedDrafts={selectedDrafts}
            onDraftSelect={handleDraftSelect}
            onActivateDraft={handleActivateDraft}
            onDeleteDraft={handleDeleteDraft}
            maxSelections={2}
          />
        ) : (
          <ScheduleComparison
            draftIds={selectedDrafts.map(draft => draft.id)}
            onClose={handleStopComparing}
          />
        )}
      </div>

      {showActivationModal && (
        <ScheduleActivationModal
          draft={draftToActivate}
          activeDraft={activeDraft}
          onConfirm={confirmActivation}
          onCancel={() => {
            setShowActivationModal(false);
            setDraftToActivate(null);
          }}
        />
      )}

      {showMergeModal && (
        <ScheduleMergeModal
          isOpen={showMergeModal}
          onClose={() => setShowMergeModal(false)}
          selectedDrafts={selectedDrafts}
          onMergeComplete={handleMergeComplete}
        />
      )}
    </div>
  );
};

export default ScheduleManagement;