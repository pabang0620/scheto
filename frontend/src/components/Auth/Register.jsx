import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { register } from '../../services/api';
import './Register.css';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'admin', // 관리자만 회원가입 가능
    companyName: '',
    industry: 'healthcare',
    companySize: 'micro',
    address: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [success, setSuccess] = useState('');
  
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    // 필드가 수정되면 touched 상태 업데이트
    setTouched({
      ...touched,
      [name]: true
    });
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched({
      ...touched,
      [name]: true
    });
  };

  // 업종별 라벨 동적 변경
  const getCompanyLabel = () => {
    switch(formData.industry) {
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
    switch(formData.industry) {
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

  // 업종별 규모 옵션 커스터마이징
  const getCompanySizeOptions = () => {
    switch(formData.industry) {
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

  // 실시간 유효성 검사
  useEffect(() => {
    const newErrors = {};
    
    // 이름 검증
    if (touched.name && !formData.name) {
      newErrors.name = '관리자 이름을 입력해주세요.';
    }
    
    // 이메일 검증
    if (touched.email) {
      if (!formData.email) {
        newErrors.email = '이메일을 입력해주세요.';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = '올바른 이메일 형식이 아닙니다.';
      }
    }
    
    // 회사명 검증
    if (touched.companyName && !formData.companyName) {
      newErrors.companyName = `${getCompanyLabel()}을 입력해주세요.`;
    }
    
    // 비밀번호 검증
    if (touched.password) {
      if (!formData.password) {
        newErrors.password = '비밀번호를 입력해주세요.';
      } else if (formData.password.length < 6) {
        newErrors.password = '비밀번호는 최소 6자 이상이어야 합니다.';
      }
    }
    
    // 비밀번호 확인 검증
    if (touched.confirmPassword) {
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = '비밀번호 확인을 입력해주세요.';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = '비밀번호가 일치하지 않습니다.';
      }
    }
    
    setErrors(newErrors);
  }, [formData, touched, getCompanyLabel]);

  const validateForm = () => {
    const allErrors = {};
    
    if (!formData.name) allErrors.name = '관리자 이름을 입력해주세요.';
    if (!formData.email) allErrors.email = '이메일을 입력해주세요.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) allErrors.email = '올바른 이메일 형식이 아닙니다.';
    if (!formData.companyName) allErrors.companyName = `${getCompanyLabel()}을 입력해주세요.`;
    if (!formData.password) allErrors.password = '비밀번호를 입력해주세요.';
    if (formData.password.length < 6) allErrors.password = '비밀번호는 최소 6자 이상이어야 합니다.';
    if (!formData.confirmPassword) allErrors.confirmPassword = '비밀번호 확인을 입력해주세요.';
    if (formData.password !== formData.confirmPassword) allErrors.confirmPassword = '비밀번호가 일치하지 않습니다.';
    
    setErrors(allErrors);
    setTouched({
      name: true,
      email: true,
      companyName: true,
      password: true,
      confirmPassword: true
    });
    
    return Object.keys(allErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      const { confirmPassword, ...submitData } = formData;
      console.log('회원가입 데이터:', submitData);
      
      const response = await register(submitData);
      console.log('회원가입 성공:', response.data);
      
      setSuccess('관리자 계정이 성공적으로 생성되었습니다.');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      console.error('회원가입 오류:', err);
      console.error('오류 응답:', err.response?.data);
      
      // validation 에러 처리
      if (err.response?.data?.errors) {
        const validationErrors = {};
        err.response.data.errors.forEach(error => {
          console.error(`필드 오류 - ${error.path}: ${error.msg}`);
          // path를 프론트엔드 필드명으로 매핑
          if (error.path === 'username') {
            validationErrors.name = error.msg;
          } else {
            validationErrors[error.path] = error.msg;
          }
        });
        setErrors(validationErrors);
        setTouched({
          name: true,
          email: true,
          companyName: true,
          password: true,
          confirmPassword: true
        });
      } else {
        setErrors({ submit: err.response?.data?.message || '회원가입 중 오류가 발생했습니다.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-header">
          <h2>관리자 계정 등록</h2>
          <p>스케줄 자동화 시스템에 {getIndustrySpecificTitle()}을 등록하세요</p>
        </div>
        
        <form onSubmit={handleSubmit} className="register-form">
          {success && <div className="success-message">{success}</div>}
          {errors.submit && <div className="error-message">{errors.submit}</div>}
          
          <div className="form-group">
            <label htmlFor="name">관리자 이름</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="관리자 이름을 입력하세요"
              className={errors.name && touched.name ? 'error' : ''}
            />
            {errors.name && touched.name && (
              <span className="field-error">{errors.name}</span>
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor="email">이메일</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="이메일을 입력하세요"
              className={errors.email && touched.email ? 'error' : ''}
            />
            {errors.email && touched.email && (
              <span className="field-error">{errors.email}</span>
            )}
          </div>
          
          {/* Industry selection first to determine labels */}
          <div className="form-group">
            <label htmlFor="industry">업종 *</label>
            <select
              id="industry"
              name="industry"
              value={formData.industry}
              onChange={handleChange}
              required
            >
              <option value="healthcare">의료/병원</option>
              <option value="restaurant">요식업</option>
              <option value="retail">소매업</option>
              <option value="manufacturing">제조업</option>
              <option value="education">교육</option>
              <option value="it">IT/기술</option>
              <option value="finance">금융</option>
              <option value="service">서비스업</option>
              <option value="military">군대/공공기관</option>
              <option value="general">일반</option>
            </select>
          </div>
          
          {/* Company specific fields */}
          <>
              <div className="form-group">
                <label htmlFor="companyName">{getCompanyLabel()} *</label>
                <input
                  type="text"
                  id="companyName"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder={`${getCompanyLabel()}을 입력하세요`}
                  className={errors.companyName && touched.companyName ? 'error' : ''}
                />
                {errors.companyName && touched.companyName && (
                  <span className="field-error">{errors.companyName}</span>
                )}
              </div>
              
              <div className="form-group">
                <label htmlFor="companySize">인원 규모 *</label>
                <select
                  id="companySize"
                  name="companySize"
                  value={formData.companySize}
                  onChange={handleChange}
                  required
                >
                  {getCompanySizeOptions().map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="address">주소</label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder={`${getIndustrySpecificTitle()} 주소를 입력하세요`}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="phone">전화번호</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="전화번호를 입력하세요"
                />
              </div>
            </>
          
          <div className="form-group">
            <label htmlFor="password">비밀번호</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="비밀번호 (6자 이상)"
              className={errors.password && touched.password ? 'error' : ''}
            />
            {errors.password && touched.password && (
              <span className="field-error">{errors.password}</span>
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">비밀번호 확인</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="비밀번호를 다시 입력하세요"
              className={errors.confirmPassword && touched.confirmPassword ? 'error' : ''}
            />
            {errors.confirmPassword && touched.confirmPassword && (
              <span className="field-error">{errors.confirmPassword}</span>
            )}
          </div>
          
          <button 
            type="submit" 
            className="register-button"
            disabled={loading}
          >
            {loading ? '계정 생성 중...' : '관리자 계정 생성'}
          </button>
        </form>
        
        <div className="register-footer">
          <p>
            이미 계정이 있으신가요?
            <button 
              type="button" 
              className="link-button"
              onClick={() => navigate('/login')}
            >
              로그인하기
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;