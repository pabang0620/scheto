import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { scheduleDrafts } from '../../services/api';
import { formatDate, formatTime } from '../../utils/dateFormatter';
import LoadingSpinner from '../shared/LoadingSpinner';
import ErrorMessage from '../shared/ErrorMessage';
import './ScheduleComparison.css';

const ScheduleComparison = ({ draftIds, onClose }) => {
  const { t } = useLanguage();
  const [drafts, setDrafts] = useState([]);
  const [comparisonData, setComparisonData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedView, setSelectedView] = useState('overview'); // overview, metrics, schedule, conflicts

  useEffect(() => {
    if (draftIds && draftIds.length === 2) {
      loadComparisonData();
    }
  }, [draftIds]);

  const loadComparisonData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load individual drafts
      const draftPromises = draftIds.map(id => scheduleDrafts.getById(id));
      const draftResponses = await Promise.all(draftPromises);
      const draftsData = draftResponses.map(response => response.data);

      // Load comparison analysis
      const comparisonResponse = await scheduleDrafts.compare(draftIds);
      
      setDrafts(draftsData);
      setComparisonData(comparisonResponse.data);
    } catch (err) {
      console.error('Error loading comparison data:', err);
      setError(t('scheduleManagement.comparison.loadError'));
    } finally {
      setIsLoading(false);
    }
  };

  const getMetricComparison = (metric, draft1Value, draft2Value) => {
    const diff = draft2Value - draft1Value;
    const percentage = draft1Value ? ((diff / draft1Value) * 100).toFixed(1) : 0;
    
    return {
      diff,
      percentage,
      isImprovement: diff > 0,
      isDifferent: Math.abs(diff) > 0.01
    };
  };

  if (isLoading) {
    return (
      <div className="schedule-comparison">
        <div className="comparison-header">
          <h2>{t('scheduleManagement.comparison.title')}</h2>
          <button className="btn btn-secondary" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="schedule-comparison">
        <div className="comparison-header">
          <h2>{t('scheduleManagement.comparison.title')}</h2>
          <button className="btn btn-secondary" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
        <ErrorMessage message={error} onDismiss={() => setError(null)} />
      </div>
    );
  }

  const [draft1, draft2] = drafts;

  return (
    <div className="schedule-comparison">
      <div className="comparison-header">
        <h2>{t('scheduleManagement.comparison.title')}</h2>
        <div className="comparison-tabs">
          <button
            className={`tab ${selectedView === 'overview' ? 'active' : ''}`}
            onClick={() => setSelectedView('overview')}
          >
            {t('scheduleManagement.comparison.tabs.overview')}
          </button>
          <button
            className={`tab ${selectedView === 'metrics' ? 'active' : ''}`}
            onClick={() => setSelectedView('metrics')}
          >
            {t('scheduleManagement.comparison.tabs.metrics')}
          </button>
          <button
            className={`tab ${selectedView === 'schedule' ? 'active' : ''}`}
            onClick={() => setSelectedView('schedule')}
          >
            {t('scheduleManagement.comparison.tabs.schedule')}
          </button>
          <button
            className={`tab ${selectedView === 'conflicts' ? 'active' : ''}`}
            onClick={() => setSelectedView('conflicts')}
          >
            {t('scheduleManagement.comparison.tabs.conflicts')}
          </button>
        </div>
        <button className="btn btn-secondary" onClick={onClose}>
          {t('common.close')}
        </button>
      </div>

      <div className="comparison-content">
        {selectedView === 'overview' && (
          <div className="overview-view">
            <div className="drafts-summary">
              <div className="draft-summary">
                <h3>{draft1.name}</h3>
                <div className="summary-stats">
                  <div className="stat">
                    <span className="label">{t('scheduleManagement.card.score')}</span>
                    <span className="value">{draft1.score}%</span>
                  </div>
                  <div className="stat">
                    <span className="label">{t('scheduleManagement.card.coverage')}</span>
                    <span className="value">{draft1.coverage}%</span>
                  </div>
                  <div className="stat">
                    <span className="label">{t('scheduleManagement.card.totalShifts')}</span>
                    <span className="value">{draft1.totalShifts}</span>
                  </div>
                </div>
              </div>

              <div className="vs-indicator">
                <span>VS</span>
              </div>

              <div className="draft-summary">
                <h3>{draft2.name}</h3>
                <div className="summary-stats">
                  <div className="stat">
                    <span className="label">{t('scheduleManagement.card.score')}</span>
                    <span className="value">{draft2.score}%</span>
                  </div>
                  <div className="stat">
                    <span className="label">{t('scheduleManagement.card.coverage')}</span>
                    <span className="value">{draft2.coverage}%</span>
                  </div>
                  <div className="stat">
                    <span className="label">{t('scheduleManagement.card.totalShifts')}</span>
                    <span className="value">{draft2.totalShifts}</span>
                  </div>
                </div>
              </div>
            </div>

            {comparisonData?.summary && (
              <div className="comparison-summary">
                <h4>{t('scheduleManagement.comparison.summary')}</h4>
                <div className="summary-cards">
                  {comparisonData.summary.map((item, index) => (
                    <div key={index} className={`summary-card ${item.type}`}>
                      <div className="card-icon">{item.icon}</div>
                      <div className="card-content">
                        <h5>{item.title}</h5>
                        <p>{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {selectedView === 'metrics' && (
          <div className="metrics-view">
            <div className="metrics-comparison">
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th>{t('scheduleManagement.comparison.metric')}</th>
                    <th>{draft1.name}</th>
                    <th>{draft2.name}</th>
                    <th>{t('scheduleManagement.comparison.difference')}</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData?.metrics?.map((metric, index) => {
                    const comparison = getMetricComparison(
                      metric.key,
                      metric.draft1Value,
                      metric.draft2Value
                    );
                    
                    return (
                      <tr key={index}>
                        <td className="metric-name">{metric.name}</td>
                        <td className="metric-value">{metric.draft1Display}</td>
                        <td className="metric-value">{metric.draft2Display}</td>
                        <td className={`metric-difference ${comparison.isImprovement ? 'positive' : 'negative'}`}>
                          {comparison.isDifferent && (
                            <>
                              <span className="diff-value">{comparison.diff > 0 ? '+' : ''}{comparison.diff}</span>
                              <span className="diff-percentage">({comparison.percentage}%)</span>
                            </>
                          )}
                          {!comparison.isDifferent && (
                            <span className="no-change">{t('scheduleManagement.comparison.noChange')}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedView === 'schedule' && (
          <div className="schedule-view">
            <div className="schedule-grid">
              <div className="schedule-column">
                <h4>{draft1.name}</h4>
                <div className="schedule-preview">
                  {comparisonData?.schedulePreview?.draft1?.map((day, index) => (
                    <div key={index} className="day-schedule">
                      <div className="day-header">{day.date}</div>
                      <div className="shifts">
                        {day.shifts.map((shift, shiftIndex) => (
                          <div key={shiftIndex} className="shift-item">
                            <span className="employee">{shift.employee}</span>
                            <span className="time">{formatTime(shift.startTime)} - {formatTime(shift.endTime)}</span>
                            <span className="position">{shift.position}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="schedule-column">
                <h4>{draft2.name}</h4>
                <div className="schedule-preview">
                  {comparisonData?.schedulePreview?.draft2?.map((day, index) => (
                    <div key={index} className="day-schedule">
                      <div className="day-header">{day.date}</div>
                      <div className="shifts">
                        {day.shifts.map((shift, shiftIndex) => (
                          <div key={shiftIndex} className="shift-item">
                            <span className="employee">{shift.employee}</span>
                            <span className="time">{formatTime(shift.startTime)} - {formatTime(shift.endTime)}</span>
                            <span className="position">{shift.position}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedView === 'conflicts' && (
          <div className="conflicts-view">
            <div className="conflicts-comparison">
              <div className="conflicts-column">
                <h4>{draft1.name} - {t('scheduleManagement.comparison.conflicts')}</h4>
                <div className="conflicts-list">
                  {comparisonData?.conflicts?.draft1?.map((conflict, index) => (
                    <div key={index} className={`conflict-item ${conflict.severity}`}>
                      <div className="conflict-header">
                        <span className="conflict-type">{conflict.type}</span>
                        <span className="conflict-severity">{conflict.severity}</span>
                      </div>
                      <div className="conflict-description">{conflict.description}</div>
                      {conflict.affectedEmployees && (
                        <div className="affected-employees">
                          {t('scheduleManagement.comparison.affectedEmployees')}: {conflict.affectedEmployees.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="conflicts-column">
                <h4>{draft2.name} - {t('scheduleManagement.comparison.conflicts')}</h4>
                <div className="conflicts-list">
                  {comparisonData?.conflicts?.draft2?.map((conflict, index) => (
                    <div key={index} className={`conflict-item ${conflict.severity}`}>
                      <div className="conflict-header">
                        <span className="conflict-type">{conflict.type}</span>
                        <span className="conflict-severity">{conflict.severity}</span>
                      </div>
                      <div className="conflict-description">{conflict.description}</div>
                      {conflict.affectedEmployees && (
                        <div className="affected-employees">
                          {t('scheduleManagement.comparison.affectedEmployees')}: {conflict.affectedEmployees.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScheduleComparison;