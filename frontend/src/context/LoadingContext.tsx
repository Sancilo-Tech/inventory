/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import Loading from '../components/Loading';

interface LoadingContextType {
  showLoading: (message?: string) => void;
  hideLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('Loading...');
  const counter = useRef(0);

  const showLoading = (msg = 'Loading...') => {
    counter.current += 1;
    setMessage(msg);
    setIsLoading(true);
  };

  const hideLoading = () => {
    counter.current = Math.max(0, counter.current - 1);
    if (counter.current === 0) {
      setIsLoading(false);
    }
  };

  return (
    <LoadingContext.Provider value={{ showLoading, hideLoading }}>
      {children}
      {isLoading && <Loading message={message} />}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within LoadingProvider');
  }
  return context;
};
