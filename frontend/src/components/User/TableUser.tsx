import { useState, useEffect, ReactNode } from 'react';
import GenericTable, { TableColumn, FilterConfig } from '../../components/Table/GenericTable';
import ConfirmDialog from '../UI/PopUp/ConfirmDialog';
import DeleteButton from '../Button/DeleteButton';
import API_URL_BE from '../Link/LinkAPI';

// Hàm helper để lấy cookie
const getCookie = (name: string) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return null;
};

interface User {
  userId: number;
  avatar: string;
  userName: string;
  fullName: string;
  email: string;
  status: boolean;
  role: string;
  roleId: number;
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

// Define TableAction interface to match the expected type
interface TableAction<T> {
  key: string;
  label: string;
  icon?: ReactNode;
  onClick: (record: T) => void;
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    confirmButtonText: 'Confirm',
    confirmButtonColor: 'bg-red-500 hover:bg-red-600'
  });

  // Lấy userId từ cookie
  const currentUserId = getCookie('userId') && !isNaN(parseInt(getCookie('userId')!)) ? parseInt(getCookie('userId')!) : null;

  const API_BASE_URL = API_URL_BE ;
  const token = localStorage.getItem("token");
  const authHeader = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
  };

  const sortUsersByUserName = (userList: User[]) => {
    return [...userList].sort((a, b) => {
      const userNameA = (a.userName || '').toLowerCase();
      const userNameB = (b.userName || '').toLowerCase();
      return userNameA.localeCompare(userNameB);
    });
  };

  const applyFilters = (userList: User[]) => {
    let filtered = userList;

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(user => {
        const fullName = user.fullName || '';
        const userName = user.userName || '';
        const email = user.email || '';

        return fullName.toLowerCase().includes(searchTerm) ||
          userName.toLowerCase().includes(searchTerm) ||
          email.toLowerCase().includes(searchTerm);
      });
    }

    if (filters.role) {
      filtered = filtered.filter(user => user.role === filters.role);
    }

    if (filters.status) {
      if (filters.status === 'active') {
        filtered = filtered.filter(user => user.status === true);
      } else if (filters.status === 'inactive') {
        filtered = filtered.filter(user => user.status === false);
      }
    }

    return sortUsersByUserName(filtered);
  };

  const getPaginatedData = (data: User[]) => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return data.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredUsers.length / pageSize);

  useEffect(() => {
    const filtered = applyFilters(users);
    setFilteredUsers(filtered);
    setCurrentPage(1);
  }, [users, filters]);

  const handleFilterChange = (type: string, value: string) => {
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

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  const toggleUserActive = async (userId: number, currentStatus: boolean, index: number) => {
    try {
      const updatedUsers = [...users];
      const newStatus = !currentStatus;
      const actualIndex = users.findIndex(user => user.userId === userId);
      if (actualIndex !== -1) {
        updatedUsers[actualIndex].status = newStatus;
        setUsers(updatedUsers);
      }

      const response = await fetch(
        `${API_BASE_URL}api/users/${userId}`,
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
      message: `Are you sure you want to delete user "${userToDelete.fullName}"?`,
      onConfirm: () => confirmDeleteUser(userId),
      confirmButtonText: 'Delete',
      confirmButtonColor: 'bg-red-500 hover:bg-red-600'
    });
  };

  const confirmDeleteUser = async (userId: number) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}api/users/${userId}`,
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
    }
  };

  const handleRoleChange = (userId: number, newRole: string) => {
    const userToUpdate = users.find(user => user.userId === userId);
    if (!userToUpdate) return;

    setConfirmDialog({
      isOpen: true,
      title: "Change User Role",
      message: `Are you sure you want to change ${userToUpdate.fullName}'s role to ${newRole}?`,
      onConfirm: () => confirmRoleChange(userId, newRole),
      confirmButtonText: 'Change Role',
      confirmButtonColor: 'bg-blue-500 hover:bg-blue-600'
    });
  };

  const confirmRoleChange = async (userId: number, newRole: string) => {
    try {
      const roleObj = roleObjects.find(role => role.name === newRole);

      if (!roleObj) {
        throw new Error(`Role ${newRole} not found`);
      }

      const response = await fetch(
        `${API_BASE_URL}api/users/${userId}`,
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

      const updatedUsers = users.map(user =>
        user.userId === userId
          ? { ...user, role: newRole, roleId: roleObj.id }
          : user
      );
      setUsers(updatedUsers);

      setConfirmDialog(prev => ({ ...prev, isOpen: false }));
    } catch (err) {
      console.error('Error updating user role:', err);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    const colors = {
      'Admin': 'bg-red-100 text-red-800 border-red-200',
      'Moderator': 'bg-purple-100 text-purple-800 border-purple-200',
      'Editor': 'bg-blue-100 text-blue-800 border-blue-200',
      'User': 'bg-gray-100 text-gray-800 border-gray-200',
      'Viewer': 'bg-green-100 text-green-800 border-green-200'
    };
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}api/roles`, {
          headers: authHeader.headers
        });

        if (!response.ok) {
          throw new Error('Failed to fetch roles');
        }

        const rolesData = await response.json();
        console.log('Roles data:', rolesData);

        setRoleObjects(rolesData);
        const roleNames = rolesData.map((role: Role) => role.name);
        setRoles(roleNames);
      } catch (err) {
        console.error('Error fetching roles:', err);
        setRoles(["User", "Admin", "Moderator", "Editor", "Viewer"]);
      }
    };

    fetchRoles();
  }, [API_BASE_URL,token]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}api/users`, {
          headers: authHeader.headers
        });

        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }

        const data = await response.json();
        console.log('Users data:', data);

        const usersWithRoles = data.map((user: any) => {
          let roleName = "User";
          let roleId = user.roleId || 1;

          if (user.roleId && roleObjects.length > 0) {
            const roleObj = roleObjects.find(role => role.id === user.roleId);
            if (roleObj) {
              roleName = roleObj.name;
            }
          } else if (user.role && typeof user.role === 'object' && user.role.name) {
            roleName = user.role.name;
            roleId = user.role.id;
          } else if (user.role && typeof user.role === 'string') {
            roleName = user.role;
          }

          return {
            userId: user.userId,
            avatar: user.avatar || '',
            userName: user.userName || '',
            fullName: user.fullName || '',
            email: user.email || '',
            status: user.status,
            role: roleName,
            roleId: roleId
          } as User;
        });

        const sortedUsers = sortUsersByUserName(usersWithRoles);
        setUsers(sortedUsers);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError('Failed to load users');
        setLoading(false);
      }
    };

    if (roleObjects.length > 0) {
      fetchUsers();
    }
  }, [roleObjects,API_BASE_URL,token]);

  const columns: TableColumn<User>[] = [
    {
      key: 'avatar',
      title: 'PROFILE',
      render: (value, record) => (
        <div className="flex items-center space-x-4">
          <div className="relative">
            <img
              src={value || `https://ui-avatars.com/api/?name=${record.userName || "U"}&background=4F46E5&color=fff&bold=true`}
              alt={record.userName}
              className="h-12 w-12 rounded-full object-cover ring-2 ring-white shadow-lg"
            />
            <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white ${record.status ? 'bg-green-400' : 'bg-gray-400'}`}></div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {record.fullName || "(unknown)"}
              {record.userId === currentUserId && (
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  You
                </span>
              )}
            </p>
            <p className="text-sm text-gray-500 truncate">
              @{record.userName || "unknown"}
            </p>
          </div>
        </div>
      )
    },
    {
      key: 'email',
      title: 'CONTACT',
      render: (value, record) => (
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
            </svg>
            <span className="text-sm text-gray-900">{value}</span>
          </div>
        </div>
      )
    },
    {
      key: 'role',
      title: 'ROLE',
      render: (value, record) => (
        <div className="space-y-3">
          {record.userId === currentUserId ? (
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(value)}`}>
              {value}
            </span>
          ) : (
            <div className="relative">
              <select
                className="appearance-none block w-full py-2.5 pl-4 pr-10 text-sm border border-gray-200 rounded-xl bg-white hover:border-blue-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 cursor-pointer shadow-sm"
                value={value}
                onChange={(e) => handleRoleChange(record.userId, e.target.value)}
              >
                {roles.map((role) => (
                  <option key={role} value={role} className="py-2">{role}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          )}
        </div>
      )
    },
    {
      key: 'status',
      title: 'STATUS',
      render: (value, record, index) => (
        <div className="flex flex-col items-start space-y-2">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
            value 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            <div className={`h-2 w-2 rounded-full mr-2 ${value ? 'bg-green-400' : 'bg-red-400'}`}></div>
            {value ? 'Active' : 'Inactive'}
          </span>
          <button
            type="button"
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              value ? 'bg-gradient-to-r from-green-400 to-green-500 shadow-lg' : 'bg-gray-300'
            }`}
            role="switch"
            onClick={() => toggleUserActive(record.userId, value, index)}
          >
            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition-all duration-300 ease-in-out ${
              value ? 'translate-x-5 shadow-lg' : 'translate-x-0'
            }`}>
              {value && (
                <svg className="h-3 w-3 text-green-600 absolute top-1 left-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </span>
          </button>
        </div>
      )
    }
  ];

  const actions: TableAction<User>[] = [
    {
      key: 'delete',
      label: 'Delete User',
      icon: (
        <div className="p-2 rounded-lg hover:bg-red-50 transition-colors duration-200 group">
          <DeleteButton
            onClick={() => {}} // Placeholder onClick to satisfy DeleteButtonProps
            size="md"
            variant="icon"
            className="text-red-500 hover:text-red-700 group-hover:scale-110 transition-transform duration-200"
          />
        </div>
      ),
      onClick: (record) => {
        if (record.userId !== currentUserId) {
          handleDeleteUser(record.userId);
        }
      }
    }
  ];

  const filterConfigs: FilterConfig[] = [
    {
      key: 'search',
      label: 'Search',
      type: 'text',
      placeholder: 'Search users...'
    },
    {
      key: 'role',
      label: 'Role',
      type: 'select',
      options: roles.map(role => ({ value: role, label: role }))
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <GenericTable<User>
        data={users}
        filteredData={getPaginatedData(filteredUsers)}
        columns={columns}
        rowKey="userId"
        actions={actions}
        filters={filterConfigs}
        filterValues={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={resetFilters}
        loading={loading}
        error={error}
        onRetry={() => window.location.reload()}
        emptyMessage="No users found"
        pagination={{
          enabled: true,
          currentPage,
          totalPages,
          pageSize,
          totalItems: filteredUsers.length,
          onPageChange: handlePageChange,
          onPageSizeChange: handlePageSizeChange
        }}
      
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() =>
          setConfirmDialog((prev) => ({
            ...prev,
            isOpen: false,
          }))
        }
        confirmButtonText={confirmDialog.confirmButtonText}
        confirmButtonColor={confirmDialog.confirmButtonColor}
      />
    </div>
  );
}
