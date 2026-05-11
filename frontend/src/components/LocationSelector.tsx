import React, { useState, useEffect } from 'react';
import { MapPin, Check } from 'lucide-react';
import { locationAPI } from '../services/api';
import { useLocation } from '../context/LocationContext';

interface Location {
  locationId: string;
  locationCode: string;
  locationName: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
}

const LocationSelector: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const { setSelectedLocation } = useLocation();

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const response = await locationAPI.getUserLocation();
      const userLocations = response.data;
      setLocations(userLocations);
      
      if (userLocations.length === 1) {
        setSelectedLocation(userLocations[0]);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLocation = (location: Location) => {
    setSelectedLocation(location);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading locations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <MapPin className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Select Your Location</h1>
          <p className="text-gray-600">Choose a warehouse or branch to continue</p>
        </div>

        {locations.length === 0 ? (
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
            <p className="text-gray-600">No locations available. Please contact your administrator.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {locations.map((location) => (
              <button
                key={location.locationId}
                onClick={() => handleSelectLocation(location)}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:border-green-500 hover:shadow-md transition-all text-left group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="bg-green-100 p-2 rounded-lg group-hover:bg-green-500 transition-colors">
                    <MapPin className="w-6 h-6 text-green-600 group-hover:text-white" />
                  </div>
                  <Check className="w-5 h-5 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{location.locationName}</h3>
                <p className="text-sm text-gray-500 mb-2">Code: {location.locationCode}</p>
                {location.city && (
                  <p className="text-sm text-gray-600">{location.city}{location.state && `, ${location.state}`}</p>
                )}
                {location.address && (
                  <p className="text-xs text-gray-500 mt-2">{location.address}</p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationSelector;
