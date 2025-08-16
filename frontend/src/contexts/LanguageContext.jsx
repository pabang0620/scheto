import React, { createContext, useContext, useState, useEffect } from 'react';
import ko from '../translations/ko';
import en from '../translations/en';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  // 기본 언어를 한국어('ko')로 설정
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    const saved = localStorage.getItem('language');
    return saved || 'ko';
  });

  const translations = {
    ko,
    en
  };

  // 언어 설정을 localStorage에 저장
  useEffect(() => {
    localStorage.setItem('language', currentLanguage);
  }, [currentLanguage]);

  const changeLanguage = (languageCode) => {
    if (translations[languageCode]) {
      setCurrentLanguage(languageCode);
    }
  };

  const t = (key) => {
    const keys = key.split('.');
    let translation = translations[currentLanguage];
    
    for (const k of keys) {
      translation = translation?.[k];
    }
    
    // 한국어 번역이 없을 경우 영어로 대체
    if (!translation && currentLanguage !== 'en') {
      translation = translations['en'];
      for (const k of keys) {
        translation = translation?.[k];
      }
    }
    
    // 번역을 찾을 수 없으면 키를 반환
    return translation || key;
  };

  const value = {
    currentLanguage,
    changeLanguage,
    t,
    isKorean: currentLanguage === 'ko',
    isEnglish: currentLanguage === 'en'
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageContext;