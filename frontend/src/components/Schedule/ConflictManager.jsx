import React, { useState } from 'react';
import './ConflictManager.css';

const ConflictManager = ({ 
  employees, 
  conflicts, 
  onAddConflict, 
  onRemoveConflict, 
  isOpen, 
  onClose 
}) => {
  const [selectedEmp1, setSelectedEmp1] = useState('');
  const [selectedEmp2, setSelectedEmp2] = useState('');
  const [conflictReason, setConflictReason] = useState('');
  
  const reasons = [
    { value: 'family', label: '가족 관계 (육아 등)' },
    { value: 'conflict', label: '갈등 관계' },
    { value: 'skill', label: '동일 업무 (분산 필요)' },
    { value: 'other', label: '기타' }
  ];
  
  const handleAdd = () => {
    if (selectedEmp1 && selectedEmp2 && selectedEmp1 !== selectedEmp2) {
      const emp1 = employees.find(e => e.id === parseInt(selectedEmp1));
      const emp2 = employees.find(e => e.id === parseInt(selectedEmp2));
      
      onAddConflict({
        emp1Id: parseInt(selectedEmp1),
        emp2Id: parseInt(selectedEmp2),
        emp1Name: emp1?.name,
        emp2Name: emp2?.name,
        reason: conflictReason || 'other'
      });
      
      // Reset form
      setSelectedEmp1('');
      setSelectedEmp2('');
      setConflictReason('');
    } else {
      alert('서로 다른 두 직원을 선택해주세요.');
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="conflict-modal-overlay" onClick={onClose}>
      <div className="conflict-modal" onClick={(e) => e.stopPropagation()}>
        <div className="conflict-modal-header">
          <h3>
            <i className="fas fa-user-slash"></i>
            같이 근무 불가 설정
          </h3>
          <button className="modal-close-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="conflict-modal-body">
          <div className="conflict-info">
            <i className="fas fa-info-circle"></i>
            <p>같은 시간대에 근무하면 안 되는 직원들을 설정합니다.</p>
          </div>
          
          {/* Add New Conflict */}
          <div className="conflict-form">
            <h4>새로운 제약 추가</h4>
            
            <div className="form-row">
              <div className="form-group">
                <label>첫번째 직원</label>
                <select 
                  value={selectedEmp1}
                  onChange={(e) => setSelectedEmp1(e.target.value)}
                  className="form-select"
                >
                  <option value="">선택하세요</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.department})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="conflict-icon-separator">
                <i className="fas fa-times"></i>
              </div>
              
              <div className="form-group">
                <label>두번째 직원</label>
                <select 
                  value={selectedEmp2}
                  onChange={(e) => setSelectedEmp2(e.target.value)}
                  className="form-select"
                >
                  <option value="">선택하세요</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.department})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="form-group">
              <label>사유 (선택)</label>
              <select 
                value={conflictReason}
                onChange={(e) => setConflictReason(e.target.value)}
                className="form-select"
              >
                <option value="">선택하세요</option>
                {reasons.map(reason => (
                  <option key={reason.value} value={reason.value}>
                    {reason.label}
                  </option>
                ))}
              </select>
            </div>
            
            <button 
              className="btn-add-conflict"
              onClick={handleAdd}
              disabled={!selectedEmp1 || !selectedEmp2}
            >
              <i className="fas fa-plus"></i>
              추가하기
            </button>
          </div>
          
          {/* Current Conflicts */}
          <div className="conflict-list-section">
            <h4>현재 설정된 제약 ({conflicts.length}개)</h4>
            
            {conflicts.length === 0 ? (
              <div className="no-conflicts">
                <i className="fas fa-info-circle"></i>
                <p>설정된 제약이 없습니다.</p>
              </div>
            ) : (
              <div className="conflict-list">
                {conflicts.map((conflict, idx) => (
                  <div key={idx} className="conflict-item">
                    <div className="conflict-info-row">
                      <div className="conflict-employees">
                        <span className="emp-badge">{conflict.emp1Name}</span>
                        <i className="fas fa-arrows-alt-h"></i>
                        <span className="emp-badge">{conflict.emp2Name}</span>
                      </div>
                      {conflict.reason && (
                        <span className="conflict-reason">
                          {reasons.find(r => r.value === conflict.reason)?.label || conflict.reason}
                        </span>
                      )}
                    </div>
                    <button 
                      className="btn-remove-conflict"
                      onClick={() => onRemoveConflict(idx)}
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="conflict-modal-footer">
          <button className="btn-close" onClick={onClose}>
            완료
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConflictManager;