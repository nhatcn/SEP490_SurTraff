import { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Filter, Trash2, AlertCircle, X } from 'lucide-react';
import ConfirmDialog from '../UI/PopUp/ConfirmDialog';

// Define interfaces
interface User {
  userId: number;
  avatar: string;
  userName: string;
  name: string;
  email: string;
  status: boolean;
  role: string;
  roleId: number; // Add roleId to track the actual role ID
}

interface Role {
  id: number;
  name: string;
}

interface FilterState {
  role: string;
  status: string;
  search: string;
}

export default function TableUser() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [roleObjects, setRoleObjects] = useState<Role[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    role: '',
    status: '',
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    confirmButtonText: 'Confirm',
    confirmButtonColor: 'bg-red-500 hover:bg-red-600'
  });

  // Get API base URL and token
  const API_BASE_URL = 'http://localhost:8081/api';
  const token = localStorage.getItem("token");

  // Create auth header with proper template literal syntax
  const authHeader = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
  };

  // Filter users based on current filter state
  const applyFilters = (userList: User[]) => {
    let filtered = userList;

    // Search filter
    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(user => {
        const name = user.name || '';
        const userName = user.userName || '';
        const email = user.email || '';

        return name.toLowerCase().includes(searchTerm) ||
          userName.toLowerCase().includes(searchTerm) ||
          email.toLowerCase().includes(searchTerm);
      });
    }

    // Role filter
    if (filters.role) {
      filtered = filtered.filter(user => user.role === filters.role);
    }

    // Status filter
    if (filters.status) {
      if (filters.status === 'active') {
        filtered = filtered.filter(user => user.status === true);
      } else if (filters.status === 'inactive') {
        filtered = filtered.filter(user => user.status === false);
      }
    }

    return filtered;
  };

  // Update filtered users when users or filters change
  useEffect(() => {
    setFilteredUsers(applyFilters(users));
  }, [users, filters]);

  const handleFilterChange = (type: keyof FilterState, value: string) => {
    setFilters(prev => ({
      ...prev,
      [type]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      role: '',
      status: '',
      search: ''
    });
  };

  const toggleUserActive = async (userId: number, currentStatus: boolean, index: number) => {
    try {
      const updatedUsers = [...users];
      const newStatus = !currentStatus;
      // Find the actual user index in the original users array
      const actualIndex = users.findIndex(user => user.userId === userId);
      if (actualIndex !== -1) {
        updatedUsers[actualIndex].status = newStatus;
        setUsers(updatedUsers);
      }

      const response = await fetch(
        `${API_BASE_URL}/users/${userId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            userId: userId,
            status: newStatus
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update user status');
      }
    } catch (err) {
      console.error('Error updating user status:', err);
      // Revert status on error
      const revertedUsers = [...users];
      const actualIndex = users.findIndex(user => user.userId === userId);
      if (actualIndex !== -1) {
        revertedUsers[actualIndex].status = currentStatus;
        setUsers(revertedUsers);
      }
    }
  };

  const handleDeleteUser = (userId: number) => {
    const userToDelete = users.find(user => user.userId === userId);
    if (!userToDelete) return;

    setConfirmDialog({
      isOpen: true,
      title: "Delete User",
      message: `Are you sure you want to delete user "${userToDelete.name}"?`,
      onConfirm: () => confirmDeleteUser(userId),
      confirmButtonText: 'Delete',
      confirmButtonColor: 'bg-red-500 hover:bg-red-600'
    });
  };

  const confirmDeleteUser = async (userId: number) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/users/${userId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      const updatedUsers = users.filter(user => user.userId !== userId);
      setUsers(updatedUsers);

      setConfirmDialog(prev => ({ ...prev, isOpen: false }));
    } catch (err) {
      console.error('Error deleting user:', err);
      // Show error toast or notification here
    }
  };

  const handleRoleChange = (userId: number, newRole: string) => {
    const userToUpdate = users.find(user => user.userId === userId);
    if (!userToUpdate) return;

    setConfirmDialog({
      isOpen: true,
      title: "Change User Role",
      message: `Are you sure you want to change ${userToUpdate.name}'s role to ${newRole}?`,
      onConfirm: () => confirmRoleChange(userId, newRole),
      confirmButtonText: 'Change Role',
      confirmButtonColor: 'bg-blue-500 hover:bg-blue-600'
    });
  };

  const confirmRoleChange = async (userId: number, newRole: string) => {
    try {
      // Find the role ID by name
      const roleObj = roleObjects.find(role => role.name === newRole);

      if (!roleObj) {
        throw new Error(`Role ${newRole} not found`);
      }

      // Update the user's role using the endpoint and properly formatted data
      const response = await fetch(
        `${API_BASE_URL}/users/${userId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            userId: userId,
            roleId: roleObj.id
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update user role');
      }

      // Update the user in the state
      const updatedUsers = users.map(user =>
        user.userId === userId
          ? { ...user, role: newRole, roleId: roleObj.id }
          : user
      );
      setUsers(updatedUsers);

      setConfirmDialog(prev => ({ ...prev, isOpen: false }));
    } catch (err) {
      console.error('Error updating user role:', err);
      // Show error toast or notification here
    }
  };

  // Fetch roles from API
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/roles`, {
          headers: authHeader.headers
        });

        if (!response.ok) {
          throw new Error('Failed to fetch roles');
        }

        const rolesData = await response.json();
        console.log('Roles data:', rolesData); // Debug log

        // Store the complete role objects
        setRoleObjects(rolesData);
        // Extract role names for the dropdown
        const roleNames = rolesData.map((role: Role) => role.name);
        setRoles(roleNames);
      } catch (err) {
        console.error('Error fetching roles:', err);
        // Set default roles as fallback
        setRoles(["User", "Admin", "Moderator", "Editor", "Viewer"]);
      }
    };

    fetchRoles();
  }, []);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/users`, {
          headers: authHeader.headers
        });

        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }

        const data = await response.json();
        console.log('Users data:', data); // Debug log

        // Process users and map role names correctly
        const usersWithRoles = data.map((user: any) => {
          // If user has roleId, find the corresponding role name
          let roleName = "User"; // Default role
          let roleId = user.roleId || 1; // Default roleId

          if (user.roleId && roleObjects.length > 0) {
            const roleObj = roleObjects.find(role => role.id === user.roleId);
            if (roleObj) {
              roleName = roleObj.name;
            }
          } else if (user.role && typeof user.role === 'object' && user.role.name) {
            // If role is an object with name property
            roleName = user.role.name;
            roleId = user.role.id;
          } else if (user.role && typeof user.role === 'string') {
            // If role is already a string
            roleName = user.role;
          }

          return {
            userId: user.userId,
            avatar: user.avatar || '',
            userName: user.userName || '',
            name: user.name || '',
            email: user.email || '',
            status: user.status,
            role: roleName,
            roleId: roleId
          } as User;
        });

        setUsers(usersWithRoles);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError('Failed to load users');
        setLoading(false);
      }
    };

    // Only fetch users after roles are loaded
    if (roleObjects.length > 0) {
      fetchUsers();
    }
  }, [roleObjects]); // Depend on roleObjects to ensure proper role mapping

  return (
    <div className="p-2 bg-white rounded-lg shadow-sm">
      {/* Filter Section */}
      <div className="flex flex-wrap mb-6 gap-2">
        <div
          className="border rounded-lg p-2 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={20} className="text-gray-600" />
        </div>

        {/* Search Filter */}
        <div className="border rounded-lg bg-gray-50 hover:bg-gray-100 flex-grow max-w-xs">
          <div className="flex items-center px-4 py-2">
            <input
              type="text"
              placeholder="Search users..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="bg-transparent outline-none text-gray-700 placeholder-gray-500 w-full"
            />
          </div>
        </div>

        {/* Role Filter */}
        <div className="border rounded-lg bg-gray-50 hover:bg-gray-100 flex-grow max-w-xs">
          <select
            value={filters.role}
            onChange={(e) => handleFilterChange('role', e.target.value)}
            className="w-full px-4 py-2 bg-transparent outline-none text-gray-700"
          >
            <option value="">All Roles</option>
            {roles.map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="border rounded-lg bg-gray-50 hover:bg-gray-100 flex-grow max-w-xs">
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full px-4 py-2 bg-transparent outline-none text-gray-700"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Reset Filters Button */}
        {(filters.role || filters.status || filters.search) && (
          <button
            className="flex items-center text-red-500 hover:text-red-600 px-3 py-2 transition-colors"
            onClick={resetFilters}
          >
            <X size={16} className="mr-1" />
            Reset Filters
          </button>
        )}
      </div>

      {/* Active Filters Display */}
      {(filters.role || filters.status || filters.search) && (
        <div className="mb-4 flex flex-wrap gap-2">
          {filters.search && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
              Search: {filters.search}
              <button
                onClick={() => handleFilterChange('search', '')}
                className="ml-2 hover:text-blue-600"
              >
                <X size={14} />
              </button>
            </span>
          )}
          {filters.role && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
              Role: {filters.role}
              <button
                onClick={() => handleFilterChange('role', '')}
                className="ml-2 hover:text-green-600"
              >
                <X size={14} />
              </button>
            </span>
          )}
          {filters.status && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
              Status: {filters.status}
              <button
                onClick={() => handleFilterChange('status', '')}
                className="ml-2 hover:text-purple-600"
              >
                <X size={14} />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-hidden shadow-sm">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-3 text-gray-600">Loading users...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">
            <AlertCircle className="mx-auto mb-2" size={32} />
            <p className="font-medium">{error}</p>
            <button
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No users found{(filters.role || filters.status || filters.search) ? ' matching your filters' : ''}</p>
          </div>
        ) : (
          <table className="min-w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-xs font-semibold text-gray-600 uppercase px-6 py-3 text-left tracking-wider">AVATAR</th>
                <th className="text-xs font-semibold text-gray-600 uppercase px-6 py-3 text-left tracking-wider">Username</th>
                <th className="text-xs font-semibold text-gray-600 uppercase px-6 py-3 text-left tracking-wider">Name</th>
                <th className="text-xs font-semibold text-gray-600 uppercase px-6 py-3 text-left tracking-wider">Email</th>
                <th className="text-xs font-semibold text-gray-600 uppercase px-6 py-3 text-left tracking-wider">Role</th>
                <th className="text-xs font-semibold text-gray-600 uppercase px-6 py-3 text-left tracking-wider">Status</th>
                <th className="text-xs font-semibold text-gray-600 uppercase px-6 py-3 text-left tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user, index) => (
                <tr key={user.userId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <img
                      src={user.avatar || `https://ui-avatars.com/api/?name=${user.userName || "U"}&background=random`}
                      alt={user.userName}
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900">{user.userName || "(unknown)"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      className="block w-full py-1.5 pl-3 pr-8 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.userId, e.target.value)}
                    >
                      {roles.map((role) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <button
                        type="button"
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${user.status ? 'bg-green-500' : 'bg-gray-300'}`}
                        role="switch"
                        onClick={() => toggleUserActive(user.userId, user.status, index)}
                      >
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${user.status ? 'translate-x-5' : 'translate-x-0'}`}></span>
                      </button>
                      <span className="ml-2 text-sm">
                        {user.status === true ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <button
                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full transition-colors"
                      onClick={() => handleDeleteUser(user.userId)}
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6">
        <div className="text-sm text-gray-700">
          Showing <span className="font-medium">{filteredUsers.length}</span> of <span className="font-medium">{users.length}</span> users
        </div>

        <div className="flex items-center space-x-2">
          <button className="flex items-center px-4 py-2 text-sm rounded border hover:bg-gray-50 transition-colors">
            <ChevronLeft size={16} className="mr-1" />
            Previous
          </button>

          <button className="flex items-center px-4 py-2 text-sm rounded border bg-blue-500 text-white hover:bg-blue-600 transition-colors">
            1
          </button>

          <button className="flex items-center px-4 py-2 text-sm rounded border hover:bg-gray-50 transition-colors">
            Next
            <ChevronRight size={16} className="ml-1" />
          </button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        confirmButtonText={confirmDialog.confirmButtonText}
        confirmButtonColor={confirmDialog.confirmButtonColor}
      />
    </div>
  );
}