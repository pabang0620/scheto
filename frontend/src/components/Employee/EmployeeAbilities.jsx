import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getEmployeeAbility, updateEmployeeAbility, getEmployees } from '../../services/api';
import './EmployeeAbilities.css';

const EmployeeAbilities = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [abilities, setAbilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEmployeeData();
  }, [id]);

  const fetchEmployeeData = async () => {
    try {
      setLoading(true);
      
      // Fetch employee info
      const empResponse = await getEmployees();
      const employees = empResponse.data?.employees || empResponse.data || [];
      const currentEmployee = employees.find(emp => emp.id === parseInt(id));
      
      if (currentEmployee) {
        setEmployee(currentEmployee);
      }

      // Fetch abilities
      const abilityResponse = await getEmployeeAbility(id);
      const abilityData = abilityResponse.data;
      
      if (abilityData && abilityData.abilities) {
        setAbilities(abilityData.abilities);
      } else {
        // Initialize with default abilities if none exist
        setAbilities([
          { skill: '청소', rank: 'C' },
          { skill: '요리', rank: 'C' },
          { skill: '서빙', rank: 'C' },
          { skill: '계산', rank: 'C' },
          { skill: '재고관리', rank: 'C' }
        ]);
      }
    } catch (err) {
      console.error('Error fetching employee data:', err);
      setError('직원 정보를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleRankChange = (index, newRank) => {
    const updatedAbilities = [...abilities];
    updatedAbilities[index].rank = newRank;
    setAbilities(updatedAbilities);
  };

  const handleSkillChange = (index, newSkill) => {
    const updatedAbilities = [...abilities];
    updatedAbilities[index].skill = newSkill;
    setAbilities(updatedAbilities);
  };

  const addAbility = () => {
    setAbilities([...abilities, { skill: '', rank: 'C' }]);
  };

  const removeAbility = (index) => {
    const updatedAbilities = abilities.filter((_, i) => i !== index);
    setAbilities(updatedAbilities);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      
      await updateEmployeeAbility(id, { abilities });
      
      // Show success message
      alert('능력이 성공적으로 저장되었습니다');
      navigate('/employees');
    } catch (err) {
      console.error('Error saving abilities:', err);
      setError('능력 저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const calculateOverallRank = () => {
    if (abilities.length === 0) return 'D';
    
    const rankValues = { 'S': 5, 'A': 4, 'B': 3, 'C': 2, 'D': 1 };
    const totalValue = abilities.reduce((sum, ability) => 
      sum + (rankValues[ability.rank] || 1), 0
    );
    const avgValue = totalValue / abilities.length;
    
    if (avgValue >= 4.5) return 'S';
    if (avgValue >= 3.5) return 'A';
    if (avgValue >= 2.5) return 'B';
    if (avgValue >= 1.5) return 'C';
    return 'D';
  };

  if (loading) {
    return (
      <div className="abilities-container">
        <div className="loading-state">
          <div className="spinner"><span></span></div>
          <p>로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="abilities-container">
      <div className="abilities-header">
        <button 
          className="back-btn"
          onClick={() => navigate('/employees')}
        >
          <i className="fas fa-arrow-left"></i>
        </button>
        <div className="header-info">
          <h1>능력 관리</h1>
          {employee && (
            <p className="employee-info">
              {employee.name} • {employee.position || '직책 없음'}
            </p>
          )}
        </div>
        <div className={`overall-rank rank-${calculateOverallRank().toLowerCase()}`}>
          종합 {calculateOverallRank()}
        </div>
      </div>

      {error && (
        <div className="error-message">
          <i className="fas fa-exclamation-circle"></i>
          {error}
        </div>
      )}

      <div className="abilities-content">
        <div className="abilities-list">
          {abilities.map((ability, index) => (
            <div key={index} className="ability-item">
              <input
                type="text"
                className="skill-input"
                placeholder="능력 이름"
                value={ability.skill}
                onChange={(e) => handleSkillChange(index, e.target.value)}
              />
              
              <div className="rank-selector">
                {['S', 'A', 'B', 'C', 'D'].map(rank => (
                  <button
                    key={rank}
                    className={`rank-btn rank-${rank.toLowerCase()} ${
                      ability.rank === rank ? 'active' : ''
                    }`}
                    onClick={() => handleRankChange(index, rank)}
                  >
                    {rank}
                  </button>
                ))}
              </div>
              
              <button
                className="remove-btn"
                onClick={() => removeAbility(index)}
              >
                <i className="fas fa-trash"></i>
              </button>
            </div>
          ))}
        </div>

        <button 
          className="add-ability-btn"
          onClick={addAbility}
        >
          <i className="fas fa-plus"></i>
          능력 추가
        </button>
      </div>

      <div className="abilities-footer">
        <button 
          className="cancel-btn"
          onClick={() => navigate('/employees')}
        >
          취소
        </button>
        <button 
          className="save-btn"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
    </div>
  );
};

export default EmployeeAbilities;