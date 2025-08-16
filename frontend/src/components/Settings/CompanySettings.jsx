import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import './CompanySettings.css';

const CompanySettings = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [settings, setSettings] = useState({
    companyName: '',
    industry: 'general',
    companySize: 'small',
    address: '',
    phone: '',
    workType: 'flexible',
    workDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
    defaultStartTime: '09:00',
    defaultEndTime: '18:00',
    showLeaveInSchedule: false,
    minStaffRequired: 1
  });
  
  const [workTypes, setWorkTypes] = useState([]);
  
  // 권한 체크
  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [user, navigate]);
  
  useEffect(() => {
    fetchCompanySettings();
    fetchWorkTypes();
  }, []);
  
  const fetchCompanySettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/company/settings', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettings({
          companyName: data.companyName || '',
          industry: data.industry || 'general',
          companySize: data.companySize || 'small',
          address: data.address || '',
          phone: data.phone || '',
          workType: data.workType || 'flexible',
          workDays: data.workDays || ['mon', 'tue', 'wed', 'thu', 'fri'],
          defaultStartTime: data.defaultStartTime || '09:00',
          defaultEndTime: data.defaultEndTime || '18:00',
          showLeaveInSchedule: data.showLeaveInSchedule || false,
          minStaffRequired: data.minStaffRequired || 1
        });
      }
    } catch (err) {
      setError('설정을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchWorkTypes = async () => {
    try {
      const response = await fetch('/api/company/work-types');
      if (response.ok) {
        const data = await response.json();
        setWorkTypes(data);
      }
    } catch (err) {
      console.error('Failed to fetch work types:', err);
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const handleWorkDaysChange = (day) => {
    setSettings(prev => ({
      ...prev,
      workDays: prev.workDays.includes(day)
        ? prev.workDays.filter(d => d !== day)
        : [...prev.workDays, day]
    }));
  };
  
  const handleWorkTypeChange = (type) => {
    const workType = workTypes.find(wt => wt.value === type);
    setSettings(prev => ({
      ...prev,
      workType: type,
      showLeaveInSchedule: workType?.showLeaveInSchedule || false
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      const response = await fetch('/api/company/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(settings)
      });
      
      if (response.ok) {
        setSuccess('설정이 저장되었습니다');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await response.json();
        setError(data.message || '설정 저장에 실패했습니다');
      }
    } catch (err) {
      setError('설정 저장 중 오류가 발생했습니다');
    } finally {
      setSaving(false);
    }
  };
  
  const weekDays = [
    { value: 'mon', label: '월요일', labelEn: 'Monday' },
    { value: 'tue', label: '화요일', labelEn: 'Tuesday' },
    { value: 'wed', label: '수요일', labelEn: 'Wednesday' },
    { value: 'thu', label: '목요일', labelEn: 'Thursday' },
    { value: 'fri', label: '금요일', labelEn: 'Friday' },
    { value: 'sat', label: '토요일', labelEn: 'Saturday' },
    { value: 'sun', label: '일요일', labelEn: 'Sunday' }
  ];
  
  const industries = [
    { value: 'healthcare', label: '의료/병원' },
    { value: 'restaurant', label: '요식업' },
    { value: 'retail', label: '소매업' },
    { value: 'manufacturing', label: '제조업' },
    { value: 'education', label: '교육' },
    { value: 'it', label: 'IT/기술' },
    { value: 'finance', label: '금융' },
    { value: 'service', label: '서비스업' },
    { value: 'military', label: '군대/공공기관' },
    { value: 'general', label: '일반' }
  ];
  
  // 업종별 규모 옵션 커스터마이징 (등록 폼과 동일한 로직)
  const getCompanySizeOptions = () => {
    switch(settings.industry) {
      case 'healthcare':
        return [
          { value: 'clinic', label: '개인병원/의원 (1-10명)' },
          { value: 'small_hospital', label: '소형병원 (11-50명)' },
          { value: 'medium_hospital', label: '중형병원 (51-200명)' },
          { value: 'large_hospital', label: '종합병원 (201-500명)' },
          { value: 'university_hospital', label: '대학병원 (500명 이상)' }
        ];
      case 'restaurant':
        return [
          { value: 'micro', label: '소규모 (1-5명)' },
          { value: 'small', label: '일반음식점 (6-20명)' },
          { value: 'medium', label: '중형식당 (21-50명)' },
          { value: 'large', label: '대형식당 (51-100명)' },
          { value: 'franchise', label: '프랜차이즈 본사 (100명 이상)' }
        ];
      case 'military':
        return [
          { value: 'squad', label: '분대 (10-15명)' },
          { value: 'platoon', label: '소대 (30-40명)' },
          { value: 'company', label: '중대 (100-150명)' },
          { value: 'battalion', label: '대대 (300-500명)' },
          { value: 'regiment', label: '연대/여단 (1000명 이상)' }
        ];
      case 'education':
        return [
          { value: 'micro', label: '소규모 학원 (1-10명)' },
          { value: 'small', label: '중소형 학원 (11-30명)' },
          { value: 'medium', label: '중형 학교 (31-100명)' },
          { value: 'large', label: '대형 학교 (101-300명)' },
          { value: 'university', label: '대학교 (300명 이상)' }
        ];
      case 'retail':
        return [
          { value: 'micro', label: '소상공인 (1-5명)' },
          { value: 'small', label: '소형매장 (6-15명)' },
          { value: 'medium', label: '중형매장 (16-50명)' },
          { value: 'large', label: '대형매장 (51-200명)' },
          { value: 'department', label: '백화점/대형마트 (200명 이상)' }
        ];
      default:
        return [
          { value: 'micro', label: '스타트업 (1-10명)' },
          { value: 'small', label: '소기업 (11-50명)' },
          { value: 'medium', label: '중기업 (51-200명)' },
          { value: 'large', label: '중견기업 (201-500명)' },
          { value: 'enterprise', label: '대기업 (500명 이상)' }
        ];
    }
  };
  
  // 업종별 라벨 동적 변경 (등록 폼과 동일한 로직)
  const getCompanyLabel = () => {
    switch(settings.industry) {
      case 'healthcare': return '병원명';
      case 'restaurant': return '식당명';
      case 'retail': return '매장명';
      case 'manufacturing': return '공장명';
      case 'education': return '학교/학원명';
      case 'it': return '회사명';
      case 'finance': return '금융기관명';
      case 'service': return '업체명';
      case 'military': return '부대명';
      default: return '기관명';
    }
  };

  const getIndustrySpecificTitle = () => {
    switch(settings.industry) {
      case 'healthcare': return '병원';
      case 'restaurant': return '식당';
      case 'retail': return '매장';
      case 'manufacturing': return '공장';
      case 'education': return '교육기관';
      case 'it': return 'IT 기업';
      case 'finance': return '금융기관';
      case 'service': return '서비스업체';
      case 'military': return '군부대';
      default: return '기관';
    }
  };
  
  if (loading) {
    return (
      <div className="settings-container">
        <div className="loading-state">
          <div className="spinner"><span></span></div>
          <p>설정을 불러오는 중...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="settings-container">
      <div className="settings-header">
        <button 
          className="back-btn"
          onClick={() => navigate('/dashboard')}
        >
          <i className="fas fa-arrow-left"></i>
        </button>
        <h1>회사 설정</h1>
      </div>
      
      {error && (
        <div className="error-message">
          <i className="fas fa-exclamation-circle"></i>
          {error}
        </div>
      )}
      
      {success && (
        <div className="success-message">
          <i className="fas fa-check-circle"></i>
          {success}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="settings-form">
        {/* 기본 정보 섹션 */}
        <div className="settings-section">
          <h2 className="section-title">
            <i className="fas fa-building"></i>
            기본 정보
          </h2>
          
          <div className="form-group">
            <label htmlFor="companyName">{getCompanyLabel()} *</label>
            <input
              type="text"
              id="companyName"
              name="companyName"
              value={settings.companyName}
              onChange={handleInputChange}
              required
              placeholder={`${getCompanyLabel()}을 입력하세요`}
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="industry">업종</label>
              <select
                id="industry"
                name="industry"
                value={settings.industry}
                onChange={handleInputChange}
              >
                {industries.map(ind => (
                  <option key={ind.value} value={ind.value}>
                    {ind.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="companySize">인원 규모</label>
              <select
                id="companySize"
                name="companySize"
                value={settings.companySize}
                onChange={handleInputChange}
              >
                {getCompanySizeOptions().map(size => (
                  <option key={size.value} value={size.value}>
                    {size.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="address">주소</label>
            <input
              type="text"
              id="address"
              name="address"
              value={settings.address}
              onChange={handleInputChange}
              placeholder={`${getIndustrySpecificTitle()} 주소를 입력하세요`}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="phone">전화번호</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={settings.phone}
              onChange={handleInputChange}
              placeholder="02-1234-5678"
            />
          </div>
        </div>
        
        {/* 근무 형태 섹션 */}
        <div className="settings-section">
          <h2 className="section-title">
            <i className="fas fa-clock"></i>
            근무 형태
          </h2>
          
          <div className="form-group">
            <label className="work-type-label">
              <i className="fas fa-business-time"></i>
              근무 형태를 선택하세요
            </label>
            <div className="work-type-options">
              {workTypes.map(type => (
                <div
                  key={type.value}
                  className={`work-type-card ${settings.workType === type.value ? 'active' : ''}`}
                  data-type={type.value}
                  onClick={() => handleWorkTypeChange(type.value)}
                >
                  <div className="work-type-icon">
                    {type.value === 'fixed' && <i className="fas fa-calendar-check"></i>}
                    {type.value === 'flexible' && <i className="fas fa-clock"></i>}
                    {type.value === 'shift' && <i className="fas fa-exchange-alt"></i>}
                  </div>
                  <div className="work-type-content">
                    <div className="work-type-header">
                      <input
                        type="radio"
                        name="workType"
                        value={type.value}
                        checked={settings.workType === type.value}
                        onChange={() => {}}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <h3>{type.label}</h3>
                    </div>
                    <p className="work-type-desc">{type.description}</p>
                    {type.value === 'fixed' && (
                      <div className="work-type-features">
                        <span className="feature-tag">고정 요일</span>
                        <span className="feature-tag">정규 시간</span>
                      </div>
                    )}
                    {type.value === 'flexible' && (
                      <div className="work-type-features">
                        <span className="feature-tag">자유 스케줄</span>
                        <span className="feature-tag">유동적</span>
                      </div>
                    )}
                    {type.value === 'shift' && (
                      <div className="work-type-features">
                        <span className="feature-tag">교대 근무</span>
                        <span className="feature-tag">순환</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {settings.workType === 'fixed' && (
            <>
              <div className="form-group">
                <label>근무 요일</label>
                <div className="weekdays-selector">
                  {weekDays.map(day => (
                    <label key={day.value} className="weekday-checkbox">
                      <input
                        type="checkbox"
                        checked={settings.workDays.includes(day.value)}
                        onChange={() => handleWorkDaysChange(day.value)}
                      />
                      <span>{language === 'ko' ? day.label : day.labelEn}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="defaultStartTime">기본 출근 시간</label>
                  <input
                    type="time"
                    id="defaultStartTime"
                    name="defaultStartTime"
                    value={settings.defaultStartTime}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="defaultEndTime">기본 퇴근 시간</label>
                  <input
                    type="time"
                    id="defaultEndTime"
                    name="defaultEndTime"
                    value={settings.defaultEndTime}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </>
          )}
          
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="showLeaveInSchedule"
                checked={settings.showLeaveInSchedule}
                onChange={handleInputChange}
              />
              <span>스케줄에 휴가 중인 직원 표시</span>
            </label>
            <p className="field-hint">
              {settings.workType === 'fixed' 
                ? '고정 근무제에서는 휴가 중인 직원도 스케줄에 표시하는 것을 권장합니다.'
                : '시프트/유동 근무제에서는 실제 근무자만 표시하는 것을 권장합니다.'}
            </p>
          </div>
          
          <div className="form-group">
            <label htmlFor="minStaffRequired">최소 필요 인원</label>
            <input
              type="number"
              id="minStaffRequired"
              name="minStaffRequired"
              value={settings.minStaffRequired}
              onChange={handleInputChange}
              min="1"
              placeholder="일일 최소 근무 인원"
            />
            <p className="field-hint">
              휴가 승인 시 최소 인원 미달 경고를 표시합니다.
            </p>
          </div>
        </div>
        
        <div className="form-actions">
          <button
            type="button"
            className="cancel-btn"
            onClick={() => navigate('/dashboard')}
          >
            취소
          </button>
          <button
            type="submit"
            className="save-btn"
            disabled={saving}
          >
            {saving ? '저장 중...' : '설정 저장'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CompanySettings;