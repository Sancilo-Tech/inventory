import React, { useState, useEffect } from "react";
import {
  Users as UsersIcon,
  Plus,
  Edit2,
  Trash2,
  X,
  Mail,
  MapPin,
  Eye,
  KeyRound,
  Search,
} from "lucide-react";
import { userAPI, authAPI, locationAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useLoading } from "../context/LoadingContext";
import { toast } from "react-toastify";
import Pagination from "../components/Pagination";

interface Location {
  locationId: string;
  locationCode: string;
  locationName: string;
  city?: string;
}

interface User {
  userId: string;
  fullName: string;
  email: string;
  phone?: string;
  role?: string;
  isActive?: boolean;
  emailNotification?: boolean;
  locationIds?: string[];
}

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    role: "",
    location_ids: [] as string[],
  });
  const [addFormData, setAddFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    role: "staff",
    location_ids: [] as string[],
  });
  const [tempPassword, setTempPassword] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const { user: currentUser } = useAuth();
  const { showLoading, hideLoading } = useLoading();

  // Locations only need to load once.
  useEffect(() => { fetchLocations(); }, []);

  // Debounce the search box so we query the server at most once per pause.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => { setPage(1); }, [debouncedSearch, pageSize]);

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, debouncedSearch]);

  const fetchUsers = async () => {
    try {
      const response = await userAPI.getPaginatedUsers({
        page,
        limit: pageSize,
        search: debouncedSearch || undefined,
      });
      setUsers(response.data.users);
      setTotal(response.data.pagination.total);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await locationAPI.getAllLocation();
      setLocations(response.data);
    } catch (error) {
      console.error("Error fetching locations:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    showLoading("Updating user...");
    try {
      if (editingUser) {
        await userAPI.updateUser(editingUser.userId, formData);
      }
      await fetchUsers();
      closeModal();
    } catch (error) {
      console.error("Error saving user:", error);
    } finally {
      hideLoading();
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    showLoading("Creating user...");
    try {
      const response = await authAPI.createUser(addFormData);
      setTempPassword(response.data.tempPassword);
      await fetchUsers();
      setAddFormData({ full_name: "", email: "", phone: "", role: "staff", location_ids: [] });
      setIsAddModalOpen(false);
      toast.success("Create Successfully...");
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error("failed to create a user");
    } finally {
      hideLoading();
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      showLoading("Deleting user...");
      try {
        await userAPI.deleteUser(id);
        await fetchUsers();
        toast.success("Deleted Successfully");
      } catch (error) {
        console.error("Error deleting user:", error);
        toast.error("Failed to delete user");
      } finally {
        hideLoading();
      }
    }
  };
  const resetPassword = async (userId: string) => {
    try {
      showLoading("Reset Password ...");
      await authAPI.resetPassword( userId );
      toast.success("Password reset successfully");
    } catch (err) {
      console.log("password error ", err);
      toast.error("Failed to reset password");
    } finally {
      hideLoading();
    }
  };
  const openModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        fullName: user.fullName,
        email: user.email,
        phone: user.phone || "",
        role: user.role || "",
        location_ids: user.locationIds || [],
      });
    } else {
      setEditingUser(null);
      setFormData({ fullName: "", email: "", phone: "", role: "", location_ids: [] });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setFormData({ fullName: "", email: "", phone: "", role: "", location_ids: [] });
  };

  const toggleEditLocation = (locationId: string) => {
    setFormData((prev) => ({
      ...prev,
      location_ids: prev.location_ids.includes(locationId)
        ? prev.location_ids.filter((id) => id !== locationId)
        : [...prev.location_ids, locationId],
    }));
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setTempPassword("");
    setAddFormData({
      full_name: "",
      email: "",
      phone: "",
      role: "staff",
      location_ids: [],
    });
  };

  const toggleLocation = (locationId: string) => {
    setAddFormData((prev) => ({
      ...prev,
      location_ids: prev.location_ids.includes(locationId)
        ? prev.location_ids.filter((id) => id !== locationId)
        : [...prev.location_ids, locationId],
    }));
  };

  const getLocationNames = (locationIds: string[]) => {
    return (
      locationIds
        .map((id) => {
          const loc = locations.find((l) => l.locationId === id);
          return loc ? loc.locationCode : id;
        })
        .join(", ") || "-"
    );
  };

  return (
    <div className="">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        {currentUser?.role === "admin" && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus size={20} />
            <span>Add User</span>
          </button>
        )}
      </div>

      <div className="relative my-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, email or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {users.length === 0 ? (
          <div className="p-8 text-center">
            <UsersIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {debouncedSearch ? 'No matching users' : 'No Users Yet'}
            </h2>
            <p className="text-gray-600">
              {debouncedSearch ? 'Try a different search term.' : 'Users will appear here once created.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Locations
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.userId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {user.fullName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {user.phone || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 capitalize">
                      {user.role || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>{getLocationNames(user.locationIds || [])}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setViewingUser(user)}
                          className="text-green-600 hover:text-green-800 inline-flex items-center"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => openModal(user)}
                          className="text-blue-600 hover:text-blue-800 inline-flex items-center"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => resetPassword(user.userId)}
                          className="text-orange-600 hover:text-orange-800 inline-flex items-center"
                        >
                          <KeyRound size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(user.userId)}
                          className="text-red-600 hover:text-red-800 inline-flex items-center"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {total > 0 && (
          <Pagination
            page={page}
            pageSize={pageSize}
            totalItems={total}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            label="users"
          />
        )}
      </div>

      {viewingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">User Details</h2>
              <button
                onClick={() => setViewingUser(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Full Name
                </label>
                <p className="text-gray-900 font-medium">
                  {viewingUser.fullName}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Email
                </label>
                <p className="text-gray-900">{viewingUser.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Phone
                </label>
                <p className="text-gray-900">{viewingUser.phone || "-"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Role
                </label>
                <p className="text-gray-900 capitalize">
                  {viewingUser.role || "-"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Locations
                </label>
                <p className="text-gray-900">
                  {getLocationNames(viewingUser.locationIds || [])}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Status
                </label>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    viewingUser.isActive
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {viewingUser.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Email Notifications
                </label>
                <p className="text-gray-900">
                  {viewingUser.emailNotification ? "Enabled" : "Disabled"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Edit User</h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Select Role</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="staff">Staff</option>
                  <option value="analyzer">Analyzer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign Locations
                </label>
                <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
                  {locations.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No locations available
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {locations.map((location) => (
                        <label
                          key={location.locationId}
                          className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={formData.location_ids.includes(
                              location.locationId
                            )}
                            onChange={() =>
                              toggleEditLocation(location.locationId)
                            }
                            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                          />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-900">
                              {location.locationName}
                            </span>
                            <span className="text-xs text-gray-500 ml-2">
                              ({location.locationCode})
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.location_ids.length} location(s) selected
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Add New User</h2>
              <button
                onClick={closeAddModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            {tempPassword ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Mail className="w-5 h-5 text-green-600 mr-2" />
                    <h3 className="font-semibold text-green-900">
                      User Created Successfully!
                    </h3>
                  </div>
                  <p className="text-sm text-green-700 mb-3">
                    Temporary password has been generated. Share this with the
                    user:
                  </p>
                  <div className="bg-white border border-green-300 rounded p-3 mb-3">
                    <p className="text-xs text-gray-500 mb-1">
                      Temporary Password:
                    </p>
                    <p className="text-lg font-mono font-bold text-gray-900">
                      {tempPassword}
                    </p>
                  </div>
                  <p className="text-xs text-green-600">
                    ⚠️ User will be prompted to change password on first login.
                  </p>
                </div>
                <button
                  onClick={closeAddModal}
                  className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleAddUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={addFormData.full_name}
                    onChange={(e) =>
                      setAddFormData({
                        ...addFormData,
                        full_name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={addFormData.email}
                    onChange={(e) =>
                      setAddFormData({ ...addFormData, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={addFormData.phone}
                    onChange={(e) =>
                      setAddFormData({ ...addFormData, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role *
                  </label>
                  <select
                    required
                    value={addFormData.role}
                    onChange={(e) =>
                      setAddFormData({ ...addFormData, role: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="staff">Staff</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  <option value="analyzer">Analyzer</option>

                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign Locations
                  </label>
                  <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
                    {locations.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        No locations available
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {locations.map((location) => (
                          <label
                            key={location.locationId}
                            className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                          >
                            <input
                              type="checkbox"
                              checked={addFormData.location_ids.includes(
                                location.locationId
                              )}
                              onChange={() =>
                                toggleLocation(location.locationId)
                              }
                              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                            />
                            <div className="flex-1">
                              <span className="text-sm font-medium text-gray-900">
                                {location.locationName}
                              </span>
                              <span className="text-xs text-gray-500 ml-2">
                                ({location.locationCode})
                              </span>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {addFormData.location_ids.length} location(s) selected
                  </p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-700">
                    📧 A temporary password will be generated and displayed
                    after creation.
                  </p>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={closeAddModal}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                  >
                    Create User
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
