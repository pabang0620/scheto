import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatDate } from '../../utils/dateFormatter';
import './ScheduleActivationModal.css';

const ScheduleActivationModal = ({
  draft,
  activeDraft,
  onConfirm,
  onCancel
}) => {
  const { t } = useLanguage();
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [activationOptions, setActivationOptions] = useState({
    notifyEmployees: true,
    sendScheduleUpdates: true,
    archiveCurrentSchedule: true,
    backupCurrentSchedule: true
  });

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm(activationOptions);
    } catch (error) {
      console.error('Activation failed:', error);
      setIsConfirming(false);
    }
  };

  const isValidConfirmation = confirmationText.toLowerCase() === draft?.name?.toLowerCase();

  const getImpactWarnings = () => {
    const warnings = [];
    
    if (activeDraft) {
      warnings.push({
        type: 'warning',
        message: t('scheduleManagement.activation.warnings.replaceActive')
      });
    }

    if (draft?.conflicts && draft.conflicts.length > 0) {
      warnings.push({
        type: 'error',
        message: t('scheduleManagement.activation.warnings.hasConflicts', { 
          count: draft.conflicts.length 
        })
      });
    }

    if (draft?.score && draft.score < 70) {
      warnings.push({
        type: 'warning',
        message: t('scheduleManagement.activation.warnings.lowScore', { 
          score: draft.score 
        })
      });
    }

    if (draft?.coverage && draft.coverage < 90) {
      warnings.push({
        type: 'caution',
        message: t('scheduleManagement.activation.warnings.lowCoverage', { 
          coverage: draft.coverage 
        })
      });
    }

    return warnings;
  };

  const warnings = getImpactWarnings();
  const hasBlockingWarnings = warnings.some(w => w.type === 'error');

  return (
    <div className="schedule-activation-modal-overlay">
      <div className="schedule-activation-modal">
        <div className="modal-header">
          <h2>{t('scheduleManagement.activation.title')}</h2>
          <button className="close-button" onClick={onCancel}>×</button>
        </div>

        <div className="modal-content">
          <div className="activation-summary">
            <h3>{t('scheduleManagement.activation.summary')}</h3>
            <div className="draft-info">
              <div className="info-row">
                <span className="label">{t('scheduleManagement.activation.draftName')}:</span>
                <span className="value">{draft?.name}</span>
              </div>
              <div className="info-row">
                <span className="label">{t('scheduleManagement.activation.period')}:</span>
                <span className="value">
                  {formatDate(draft?.startDate)} - {formatDate(draft?.endDate)}
                </span>
              </div>
              <div className="info-row">
                <span className="label">{t('scheduleManagement.activation.employees')}:</span>
                <span className="value">{draft?.employeeCount}</span>
              </div>
              <div className="info-row">
                <span className="label">{t('scheduleManagement.activation.totalShifts')}:</span>
                <span className="value">{draft?.totalShifts}</span>
              </div>
            </div>
          </div>

          {activeDraft && (
            <div className="current-schedule-info">
              <h3>{t('scheduleManagement.activation.currentSchedule')}</h3>
              <div className="current-draft-info">
                <p>
                  {t('scheduleManagement.activation.currentScheduleDescription', {
                    name: activeDraft.name,
                    activatedDate: formatDate(activeDraft.activatedAt)
                  })}
                </p>
              </div>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="activation-warnings">
              <h3>{t('scheduleManagement.activation.impactAnalysis')}</h3>
              <div className="warnings-list">
                {warnings.map((warning, index) => (
                  <div key={index} className={`warning-item ${warning.type}`}>
                    <div className="warning-icon">
                      {warning.type === 'error' && '❌'}
                      {warning.type === 'warning' && '⚠️'}
                      {warning.type === 'caution' && '⚡'}
                    </div>
                    <div className="warning-message">{warning.message}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="activation-options">
            <div className="options-header">
              <button
                className="btn btn-link"
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              >
                {showAdvancedOptions 
                  ? t('scheduleManagement.activation.hideAdvancedOptions')
                  : t('scheduleManagement.activation.showAdvancedOptions')
                }
              </button>
            </div>

            {showAdvancedOptions && (
              <div className="advanced-options">
                <div className="option-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={activationOptions.notifyEmployees}
                      onChange={(e) => setActivationOptions({
                        ...activationOptions,
                        notifyEmployees: e.target.checked
                      })}
                    />
                    {t('scheduleManagement.activation.options.notifyEmployees')}
                  </label>
                  <p className="option-description">
                    {t('scheduleManagement.activation.options.notifyEmployeesDesc')}
                  </p>
                </div>

                <div className="option-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={activationOptions.sendScheduleUpdates}
                      onChange={(e) => setActivationOptions({
                        ...activationOptions,
                        sendScheduleUpdates: e.target.checked
                      })}
                    />
                    {t('scheduleManagement.activation.options.sendScheduleUpdates')}
                  </label>
                  <p className="option-description">
                    {t('scheduleManagement.activation.options.sendScheduleUpdatesDesc')}
                  </p>
                </div>

                <div className="option-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={activationOptions.archiveCurrentSchedule}
                      onChange={(e) => setActivationOptions({
                        ...activationOptions,
                        archiveCurrentSchedule: e.target.checked
                      })}
                    />
                    {t('scheduleManagement.activation.options.archiveCurrentSchedule')}
                  </label>
                  <p className="option-description">
                    {t('scheduleManagement.activation.options.archiveCurrentScheduleDesc')}
                  </p>
                </div>

                <div className="option-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={activationOptions.backupCurrentSchedule}
                      onChange={(e) => setActivationOptions({
                        ...activationOptions,
                        backupCurrentSchedule: e.target.checked
                      })}
                    />
                    {t('scheduleManagement.activation.options.backupCurrentSchedule')}
                  </label>
                  <p className="option-description">
                    {t('scheduleManagement.activation.options.backupCurrentScheduleDesc')}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="confirmation-section">
            <h3>{t('scheduleManagement.activation.confirmation')}</h3>
            <p>{t('scheduleManagement.activation.confirmationInstructions', { draftName: draft?.name })}</p>
            <input
              type="text"
              className="confirmation-input"
              placeholder={t('scheduleManagement.activation.typeDraftName')}
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              disabled={isConfirming}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button 
            className="btn btn-secondary" 
            onClick={onCancel}
            disabled={isConfirming}
          >
            {t('common.cancel')}
          </button>
          
          <button 
            className="btn btn-danger" 
            onClick={handleConfirm}
            disabled={!isValidConfirmation || hasBlockingWarnings || isConfirming}
          >
            {isConfirming 
              ? t('scheduleManagement.activation.activating')
              : t('scheduleManagement.activation.confirmActivation')
            }
          </button>
        </div>

        {hasBlockingWarnings && (
          <div className="blocking-warning">
            <p>{t('scheduleManagement.activation.blockingWarning')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScheduleActivationModal;