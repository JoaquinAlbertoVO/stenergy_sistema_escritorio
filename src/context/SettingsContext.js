import React, { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

export function SettingsProvider({ children }) {
  const [theme, setTheme] = useState(localStorage.getItem('app_theme') || 'dark');
  const [fontSize, setFontSize] = useState(localStorage.getItem('app_fontSize') || 'medium');
  const [language, setLanguage] = useState(localStorage.getItem('app_language') || 'es');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  useEffect(() => {
    // Apply font size logic by modifying the HTML root element
    let rootFontSize = '16px'; // default (medium)
    if (fontSize === 'small') rootFontSize = '14px';
    if (fontSize === 'large') rootFontSize = '18px';
    
    document.documentElement.style.fontSize = rootFontSize;
    localStorage.setItem('app_fontSize', fontSize);
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('app_language', language);
  }, [language]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <SettingsContext.Provider value={{ 
      theme, setTheme, toggleTheme,
      fontSize, setFontSize,
      language, setLanguage
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
