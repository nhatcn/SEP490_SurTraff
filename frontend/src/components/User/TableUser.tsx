import { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Filter, Trash2, AlertCircle } from 'lucide-react';
import ConfirmDialog from '../UI/ConfirmDialog';

// Define interfaces
interface User {
  userId: number;
  avatar: string;
  userName: string;
  name: string;
  email: string;
  status: boolean;
  role: string;
}

interface Role {
  id: number;
  name: string;
}

export default function TableUser() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [roleObjects, setRoleObjects] = useState<Role[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
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

  const toggleUserActive = async (userId: number, currentStatus: boolean, index: number) => {
    try {
      const updatedUsers = [...users];
      const newStatus = !currentStatus;
      updatedUsers[index].status = newStatus;
      setUsers(updatedUsers);

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
      revertedUsers[index].status = currentStatus;
      setUsers(revertedUsers);
    }
  };

  const handleDeleteUser = (userId: number, index: number) => {
    setConfirmDialog({
      isOpen: true,
      title: "Delete User",
      message: `Are you sure you want to delete user "${users[index].name}"?`,
      onConfirm: () => confirmDeleteUser(userId, index),
      confirmButtonText: 'Delete',
      confirmButtonColor: 'bg-red-500 hover:bg-red-600'
    });
  };

  const confirmDeleteUser = async (userId: number, index: number) => {
    try {
      // Updated to use the correct API endpoint
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
      
      const updatedUsers = users.filter((_, i) => i !== index);
      setUsers(updatedUsers);
      
      setConfirmDialog(prev => ({ ...prev, isOpen: false }));
    } catch (err) {
      console.error('Error deleting user:', err);
      // Show error toast or notification here
    }
  };

  const handleRoleChange = (userId: number, index: number, newRole: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Change User Role",
      message: `Are you sure you want to change ${users[index].name}'s role to ${newRole}?`,
      onConfirm: () => confirmRoleChange(userId, index, newRole),
      confirmButtonText: 'Change Role',
      confirmButtonColor: 'bg-blue-500 hover:bg-blue-600'
    });
  };

  const confirmRoleChange = async (userId: number, index: number, newRole: string) => {
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
          method: 'PUT', // Using PUT as specified in the backend endpoint
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ 
            // Using proper structure for UserDTO as expected by backend
            userId: userId,
            roleId: roleObj.id
          }),
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to update user role');
      }
      
      const updatedUsers = [...users];
      updatedUsers[index].role = newRole;
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
        // Use the correct API endpoint
        const response = await fetch(`${API_BASE_URL}/users`, {
          headers: authHeader.headers
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }
        
        const data = await response.json();
        // Add role property if it doesn't exist
        const usersWithRoles = data.map((user: User) => ({
          ...user,
          role: user.role || "User" // Default role
        }));
        setUsers(usersWithRoles);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError('Failed to load users');
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return (
    <div className="p-2 bg-white rounded-lg shadow-sm">
      {/* Filter Section */}
      <div className="flex flex-wrap mb-6 gap-2">
        <div className="border rounded-lg p-2 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors">
          <Filter size={20} className="text-gray-600" />
        </div>
        <div className="border rounded-lg bg-gray-50 hover:bg-gray-100 flex-grow max-w-xs">
          <div className="flex items-center px-4 py-2">
            <span className="text-gray-700 font-medium">Filter</span>
          </div>
        </div>
        <div className="border rounded-lg bg-gray-50 hover:bg-gray-100 flex-grow max-w-xs">
          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-gray-700">Date Range</span>
            <ChevronRight size={16} className="text-gray-500" />
          </div>
        </div>
        <div className="border rounded-lg bg-gray-50 hover:bg-gray-100 flex-grow max-w-xs">
          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-gray-700">Role</span>
            <ChevronRight size={16} className="text-gray-500" />
          </div>
        </div>
        <div className="border rounded-lg bg-gray-50 hover:bg-gray-100 flex-grow max-w-xs">
          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-gray-700">Status</span>
            <ChevronRight size={16} className="text-gray-500" />
          </div>
        </div>
        <button className="flex items-center text-red-500 hover:text-red-600 px-3 py-2 transition-colors">
          Reset Filters
        </button>
      </div>
      
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
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No users found</p>
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
              {users.map((user, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
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
                      onChange={(e) => handleRoleChange(user.userId, index, e.target.value)}
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
                      onClick={() => handleDeleteUser(user.userId, index)}
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
          Showing <span className="font-medium">{users.length}</span> users
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