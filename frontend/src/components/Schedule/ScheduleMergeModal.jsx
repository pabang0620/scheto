import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { scheduleDrafts } from '../../services/api';
import LoadingSpinner from '../shared/LoadingSpinner';
import ErrorMessage from '../shared/ErrorMessage';
import './ScheduleMergeModal.css';

const ScheduleMergeModal = ({ 
  isOpen, 
  onClose, 
  selectedDrafts, 
  onMergeComplete 
}) => {
  const { t } = useLanguage();
  const [mergeOptions, setMergeOptions] = useState({
    name: 'Merged Schedule Draft',
    description: 'Merged from multiple schedule drafts',
    conflictResolution: 'priority',
    priorityOrder: [],
    mergeStrategy: 'combine',
    preserveMetadata: true
  });
  const [previewData, setPreviewData] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [error, setError] = useState(null);
  const [currentStep, setCurrentStep] = useState('options'); // options, preview, conflicts

  useEffect(() => {
    if (isOpen && selectedDrafts.length >= 2) {
      loadPreview();
    }
  }, [isOpen, selectedDrafts, mergeOptions.conflictResolution]);

  const loadPreview = async () => {
    try {
      setIsLoadingPreview(true);
      setError(null);
      
      const response = await scheduleDrafts.previewMerge({
        draftIds: selectedDrafts.map(draft => draft.id),
        mergeOptions
      });
      
      setPreviewData(response.data);
    } catch (err) {
      console.error('Error loading merge preview:', err);
      setError(t('scheduleMerge.errors.previewFailed'));
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleMergeOptionChange = (option, value) => {
    setMergeOptions(prev => ({
      ...prev,
      [option]: value
    }));
  };

  const handlePriorityOrderChange = (draftId, newIndex) => {
    const newOrder = [...mergeOptions.priorityOrder];
    const currentIndex = newOrder.indexOf(draftId);
    
    if (currentIndex !== -1) {
      newOrder.splice(currentIndex, 1);
    }
    
    newOrder.splice(newIndex, 0, draftId);
    
    setMergeOptions(prev => ({
      ...prev,
      priorityOrder: newOrder
    }));
  };

  const handleMerge = async () => {
    try {
      setIsMerging(true);
      setError(null);
      
      const response = await scheduleDrafts.merge({
        draftIds: selectedDrafts.map(draft => draft.id),
        mergeOptions
      });
      
      onMergeComplete(response.data);
      onClose();
    } catch (err) {
      console.error('Error merging drafts:', err);
      setError(t('scheduleMerge.errors.mergeFailed'));
    } finally {
      setIsMerging(false);
    }
  };

  const renderOptionsStep = () => (
    <div className="merge-options">
      <h3>{t('scheduleMerge.options.title')}</h3>
      
      <div className="form-group">
        <label>{t('scheduleMerge.options.name')}</label>
        <input
          type="text"
          value={mergeOptions.name}
          onChange={(e) => handleMergeOptionChange('name', e.target.value)}
          className="form-control"
        />
      </div>

      <div className="form-group">
        <label>{t('scheduleMerge.options.description')}</label>
        <textarea
          value={mergeOptions.description}
          onChange={(e) => handleMergeOptionChange('description', e.target.value)}
          className="form-control"
          rows="3"
        />
      </div>

      <div className="form-group">
        <label>{t('scheduleMerge.options.conflictResolution')}</label>
        <select
          value={mergeOptions.conflictResolution}
          onChange={(e) => handleMergeOptionChange('conflictResolution', e.target.value)}
          className="form-control"
        >
          <option value="priority">{t('scheduleMerge.resolution.priority')}</option>
          <option value="latest">{t('scheduleMerge.resolution.latest')}</option>
          <option value="combine">{t('scheduleMerge.resolution.combine')}</option>
        </select>
      </div>

      {mergeOptions.conflictResolution === 'priority' && (
        <div className="form-group">
          <label>{t('scheduleMerge.options.priorityOrder')}</label>
          <div className="priority-list">
            {selectedDrafts.map((draft, index) => (
              <div key={draft.id} className="priority-item">
                <span className="priority-number">{index + 1}</span>
                <span className="draft-name">{draft.name}</span>
                <div className="priority-controls">
                  <button
                    type="button"
                    onClick={() => handlePriorityOrderChange(draft.id, Math.max(0, index - 1))}
                    disabled={index === 0}
                    className="btn btn-sm btn-secondary"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePriorityOrderChange(draft.id, Math.min(selectedDrafts.length - 1, index + 1))}
                    disabled={index === selectedDrafts.length - 1}
                    className="btn btn-sm btn-secondary"
                  >
                    ↓
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="form-group">
        <label>{t('scheduleMerge.options.mergeStrategy')}</label>
        <select
          value={mergeOptions.mergeStrategy}
          onChange={(e) => handleMergeOptionChange('mergeStrategy', e.target.value)}
          className="form-control"
        >
          <option value="combine">{t('scheduleMerge.strategy.combine')}</option>
          <option value="overwrite">{t('scheduleMerge.strategy.overwrite')}</option>
          <option value="selective">{t('scheduleMerge.strategy.selective')}</option>
        </select>
      </div>

      <div className="form-group checkbox-group">
        <label>
          <input
            type="checkbox"
            checked={mergeOptions.preserveMetadata}
            onChange={(e) => handleMergeOptionChange('preserveMetadata', e.target.checked)}
          />
          {t('scheduleMerge.options.preserveMetadata')}
        </label>
      </div>
    </div>
  );

  const renderPreviewStep = () => {
    if (isLoadingPreview) {
      return <LoadingSpinner />;
    }

    if (!previewData) {
      return <div>{t('scheduleMerge.preview.noData')}</div>;
    }

    return (
      <div className="merge-preview">
        <h3>{t('scheduleMerge.preview.title')}</h3>
        
        <div className="preview-summary">
          <div className="summary-item">
            <span className="label">{t('scheduleMerge.preview.totalDrafts')}</span>
            <span className="value">{previewData.summary.totalDrafts}</span>
          </div>
          <div className="summary-item">
            <span className="label">{t('scheduleMerge.preview.totalItems')}</span>
            <span className="value">{previewData.summary.totalItems}</span>
          </div>
          <div className="summary-item">
            <span className="label">{t('scheduleMerge.preview.totalConflicts')}</span>
            <span className="value">{previewData.summary.totalConflicts}</span>
          </div>
        </div>

        {previewData.summary.draftSummary && (
          <div className="draft-summary">
            <h4>{t('scheduleMerge.preview.draftDetails')}</h4>
            {previewData.summary.draftSummary.map(draft => (
              <div key={draft.id} className="draft-summary-item">
                <div className="draft-info">
                  <span className="draft-name">{draft.name}</span>
                  <span className="item-count">{draft.itemCount} items</span>
                </div>
                <div className="draft-period">
                  {new Date(draft.periodStart).toLocaleDateString()} - {new Date(draft.periodEnd).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}

        {previewData.conflicts && previewData.conflicts.length > 0 && (
          <div className="conflicts-section">
            <h4>{t('scheduleMerge.preview.conflicts')}</h4>
            <div className="conflicts-list">
              {previewData.conflicts.map((conflict, index) => (
                <div key={index} className="conflict-item">
                  <div className="conflict-header">
                    <span className="employee-name">{conflict.employeeName}</span>
                    <span className="conflict-date">{new Date(conflict.date).toLocaleDateString()}</span>
                  </div>
                  <div className="conflicting-items">
                    {conflict.conflictingItems.map((item, itemIndex) => (
                      <div key={itemIndex} className="conflicting-item">
                        <span className="draft-name">{item.draftName}</span>
                        <span className="time-range">{item.startTime} - {item.endTime}</span>
                        <span className="shift-type">{item.shiftType}</span>
                        {item.hasTimeOverlap && (
                          <span className="overlap-warning">{t('scheduleMerge.preview.timeOverlap')}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="schedule-merge-modal">
        <div className="modal-header">
          <h2>{t('scheduleMerge.title')}</h2>
          <button 
            className="close-button"
            onClick={onClose}
            disabled={isMerging}
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <ErrorMessage 
              message={error} 
              onDismiss={() => setError(null)} 
            />
          )}

          <div className="step-navigation">
            <button
              className={`step-button ${currentStep === 'options' ? 'active' : ''}`}
              onClick={() => setCurrentStep('options')}
              disabled={isMerging}
            >
              {t('scheduleMerge.steps.options')}
            </button>
            <button
              className={`step-button ${currentStep === 'preview' ? 'active' : ''}`}
              onClick={() => setCurrentStep('preview')}
              disabled={isMerging}
            >
              {t('scheduleMerge.steps.preview')}
            </button>
          </div>

          <div className="step-content">
            {currentStep === 'options' && renderOptionsStep()}
            {currentStep === 'preview' && renderPreviewStep()}
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isMerging}
          >
            {t('common.cancel')}
          </button>
          
          {currentStep === 'options' && (
            <button
              className="btn btn-primary"
              onClick={() => setCurrentStep('preview')}
              disabled={isMerging || selectedDrafts.length < 2}
            >
              {t('scheduleMerge.actions.preview')}
            </button>
          )}
          
          {currentStep === 'preview' && (
            <button
              className="btn btn-primary"
              onClick={handleMerge}
              disabled={isMerging || !previewData?.canMerge}
            >
              {isMerging ? (
                <>
                  <LoadingSpinner size="sm" />
                  {t('scheduleMerge.actions.merging')}
                </>
              ) : (
                t('scheduleMerge.actions.merge')
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScheduleMergeModal;