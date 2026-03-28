/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { locationAPI } from '../services/api';
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
  const [selectedLocation, setSelectedLocationState] = useState<Location | null>(() => {
    const saved = localStorage.getItem('selectedLocation');
    return saved ? JSON.parse(saved) : null;
  });
  const { user } = useAuth();

  useEffect(() => {
    // Only load user location if user is authenticated
    if (user) {
      const loadUserLocation = async () => {
        try {
          const response = await locationAPI.getUserLocationById();
          if (response?.data?.location) {
            const userLocation = response.data.location;
            setSelectedLocationState(userLocation);
            localStorage.setItem('selectedLocation', JSON.stringify(userLocation));
          }
        } catch (error) {
          console.error('Error loading user location:', error);
          // Fallback to localStorage if API fails
          const saved = localStorage.getItem('selectedLocation');
          if (saved) {
            setSelectedLocationState(JSON.parse(saved));
          }
        }
      };
      loadUserLocation();
    }
  }, [user]);

  const setSelectedLocation = async (location: Location | null) => {
    setSelectedLocationState(location);
    try {
      if (location) {
        await locationAPI.assignLocation({ locationId: location.locationId });
        localStorage.setItem('selectedLocation', JSON.stringify(location));
        window.location.reload();
      } else {
        await locationAPI.assignLocation({ locationId: "" });
        localStorage.removeItem('selectedLocation');
      }
    } catch (error) {
      console.error('Error setting location:', error);
    }
  };

  const clearLocation = async () => {
    setSelectedLocationState(null);
    try {
      await locationAPI.assignLocation({ locationId: "" });
      localStorage.removeItem('selectedLocation');
    } catch (error) {
      console.error('Error clearing location:', error);
    }
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
