/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, Eye, EyeOff, MapPin, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { authAPI, userAPI, locationAPI } from '../services/api';
import { useLoading } from '../context/LoadingContext';
import { toast } from 'react-toastify';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const { selectedLocation, setSelectedLocation } = useLocation();
  const { showLoading, hideLoading } = useLoading();
  const [emailNotification, setEmailNotification] = useState(user?.email_notification || false);
  const [showPassword, setShowPassword] = useState({ old: false, new: false, confirm: false });
  const [passwordData, setPasswordData] = useState({ password: '', new_password: '', confirm_password: '' });
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [availableLocations, setAvailableLocations] = useState<any[]>([]);

  useEffect(() => {
    fetchUserLocations();
  }, []);

  const fetchUserLocations = async () => {
    try {
      const response = await locationAPI.getUserLocation();
      setAvailableLocations(response.data);
    } catch (error) {
      console.error('Error fetching user locations:', error);
    }
  };

  const handleLocationChange = (location: any) => {
    setSelectedLocation(location);
    setShowLocationDropdown(false);
    toast.success(`Switched to ${location.locationName}`);
  };

  const handleEmailNotificationToggle = async () => {
    showLoading('Updating notification settings...');
    try {
      await userAPI.updateUserEmailNotification(!emailNotification);
      setEmailNotification(!emailNotification);
      toast.success('Email notification settings updated');
    } catch (error) {
      console.error('Error updating notification:', error);
      toast.error('Failed to update notification settings');
    } finally {
      hideLoading();
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }
    showLoading('Changing password...');
    try {
      await authAPI.updatePassword({
        user_id: user?.user_id,
        password: passwordData.password,
        new_password: passwordData.new_password
      });
      toast.success('Password changed successfully');
      setPasswordData({ password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Failed to change password');
    } finally {
      hideLoading();
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Location Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <MapPin className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Location</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">Current Location</label>
            <div className="relative">
              <button
                onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                className="w-full md:w-auto flex items-center justify-between bg-green-50 px-4 py-3 rounded-lg hover:bg-green-100 transition-colors border border-green-200"
              >
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 text-green-600 mr-3" />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-green-700">{selectedLocation?.locationName}</p>
                    <p className="text-xs text-green-600">{selectedLocation?.locationCode}</p>
                  </div>
                </div>
                <ChevronDown className="w-5 h-5 text-green-600 ml-4" />
              </button>
              {showLocationDropdown && (
                <div className="absolute top-full mt-2 left-0 bg-white rounded-lg shadow-lg border border-gray-200 py-2 w-full md:min-w-[300px] z-50">
                  {availableLocations.filter(loc => loc.locationId !== selectedLocation?.locationId).length === 0 ? (
                    <div className="px-4 py-2 text-sm text-gray-500">No other locations</div>
                  ) : (
                    availableLocations
                      .filter(loc => loc.locationId !== selectedLocation?.locationId)
                      .map((loc) => (
                      <button
                        key={loc.locationId}
                        onClick={() => handleLocationChange(loc)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="font-medium text-gray-900">{loc.locationName}</div>
                        <div className="text-xs text-gray-500">{loc.locationCode}</div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <User className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Full Name</label>
              <p className="text-gray-900 font-medium">{user?.full_name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
              <p className="text-gray-900">{user?.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Phone</label>
              <p className="text-gray-900">{user?.phone || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Role</label>
              <p className="text-gray-900 capitalize">{user?.role}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications Section */}
      {user?.role!='staff'&&<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Mail className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">Email Notifications</p>
            <p className="text-sm text-gray-500">Receive email notifications for updates</p>
          </div>
          <button
            onClick={handleEmailNotificationToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              emailNotification ? 'bg-green-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                emailNotification ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>}

      {/* Change Password Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Lock className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
        </div>
        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password *</label>
            <div className="relative">
              <input
                type={showPassword.old ? 'text' : 'password'}
                required
                value={passwordData.password}
                onChange={(e) => setPasswordData({ ...passwordData, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPassword({ ...showPassword, old: !showPassword.old })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              >
                {showPassword.old ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password *</label>
            <div className="relative">
              <input
                type={showPassword.new ? 'text' : 'password'}
                required
                value={passwordData.new_password}
                onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              >
                {showPassword.new ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password *</label>
            <div className="relative">
              <input
                type={showPassword.confirm ? 'text' : 'password'}
                required
                value={passwordData.confirm_password}
                onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              >
                {showPassword.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Change Password
          </button>
        </form>
      </div>
    </div>
  );
};

export default Settings;
