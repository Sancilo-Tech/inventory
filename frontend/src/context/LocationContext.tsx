/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface Location {
  locationId: string;
  locationCode: string;
  locationName: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
}

interface LocationContextType {
  selectedLocation: Location | null;
  setSelectedLocation: (location: Location | null) => void;
  clearLocation: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedLocation, setSelectedLocationState] = useState<Location | null>(null);
  const { user } = useAuth();

  // Restore location from user-keyed localStorage whenever user changes
  useEffect(() => {
    if (!user) {
      setSelectedLocationState(null);
      return;
    }
    const key = `selectedLocation_${user.user_id}`;
    const saved = localStorage.getItem(key);
    setSelectedLocationState(saved ? JSON.parse(saved) : null);
  }, [user]);

  const storageKey = user ? `selectedLocation_${user.user_id}` : null;

  const setSelectedLocation = async (location: Location | null) => {
    setSelectedLocationState(location);
    if (location && storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(location));
    } else if (storageKey) {
      localStorage.removeItem(storageKey);
    }
  };

  const clearLocation = () => {
    setSelectedLocationState(null);
    if (storageKey) localStorage.removeItem(storageKey);
  };

  return (
    <LocationContext.Provider value={{ selectedLocation, setSelectedLocation, clearLocation }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within LocationProvider');
  }
  return context;
};
