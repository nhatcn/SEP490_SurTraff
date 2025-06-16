import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import GenericTable, { TableColumn, TableAction, FilterConfig } from '../../components/Table/GenericTable';
import ConfirmDialog from '../UI/PopUp/ConfirmDialog';
import DeleteButton from '../Button/DeleteButton';
import EditButton from '../Button/EditButton';

// Giữ nguyên interfaces từ code cũ
interface User {
  userId: number;
  avatar: string;
  userName: string;
  name: string;
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

export default function TableUser() {
  // Giữ nguyên tất cả states từ code cũ
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
  
  // Pagination states
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


  const API_BASE_URL = 'http://localhost:8081/api';
  const token = localStorage.getItem("token");
  const authHeader = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
  };

  const applyFilters = (userList: User[]) => {
    let filtered = userList;

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

    return filtered;
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
      const roleObj = roleObjects.find(role => role.name === newRole);

      if (!roleObj) {
        throw new Error(`Role ${newRole} not found`);
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

  // Giữ nguyên các useEffect fetch data
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
  }, []);

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

    if (roleObjects.length > 0) {
      fetchUsers();
    }
  }, [roleObjects]);

  // Định nghĩa columns cho GenericTable
  const columns: TableColumn<User>[] = [
    {
      key: 'avatar',
      title: 'AVATAR',
      render: (value, record) => (
        <img
          src={value || `https://ui-avatars.com/api/?name=${record.userName || "U"}&background=random`}
          alt={record.userName}
          className="h-9 w-9 rounded-full object-cover"
        />
      )
    },
    {
      key: 'userName',
      title: 'Username',
      render: (value) => (
        <span className="text-sm font-medium text-gray-900">{value || "(unknown)"}</span>
      )
    },
    {
      key: 'name',
      title: 'Name',
      render: (value) => (
        <span className="text-sm text-gray-900">{value}</span>
      )
    },
    {
      key: 'email',
      title: 'Email',
      render: (value) => (
        <span className="text-sm text-gray-900">{value}</span>
      )
    },
    {
      key: 'role',
      title: 'Role',
      render: (value, record) => (
        <select
          className="block w-full py-1.5 pl-3 pr-8 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={value}
          onChange={(e) => handleRoleChange(record.userId, e.target.value)}
        >
          {roles.map((role) => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
      )
    },
    {
      key: 'status',
      title: 'Status',
      render: (value, record, index) => (
        <div className="flex items-center">
          <button
            type="button"
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${value ? 'bg-green-500' : 'bg-gray-300'}`}
            role="switch"
            onClick={() => toggleUserActive(record.userId, value, index)}
          >
            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${value ? 'translate-x-5' : 'translate-x-0'}`}></span>
          </button>
          <span className="ml-2 text-sm">
            {value === true ? 'Active' : 'Inactive'}
          </span>
        </div>
      )
    }
  ];

const actions: TableAction<User>[] = [
  {
    key: 'delete',
    label: 'Delete Product',
    icon: (
      <DeleteButton
        onClick={() => {}}
        size="md"
        variant="icon"
        className="text-red-500 hover:text-red-700 hover:bg-red-100"
      />
    ),
    onClick: (record) => handleDeleteUser(record.userId)
  }
];

  // Định nghĩa filters cho GenericTable
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
  <>
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

    {/* Giữ nguyên ConfirmDialog */}
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
  </>
);
}