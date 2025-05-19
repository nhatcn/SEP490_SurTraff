import { useState, useEffect } from 'react';
import axios from 'axios';
import { ChevronRight, ChevronLeft, Filter } from 'lucide-react';

interface User {
  id: number;
  avatar: string;
  username: string;
  name: string;
  email: string;
  active: boolean;
}

export default function TableUser() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const token = localStorage.getItem("token");
  const authHeader = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const toggleUserActive = async (userId: number, currentStatus: boolean, index: number) => {
    try {
      const updatedUsers = [...users];
      updatedUsers[index].active = !currentStatus;
      setUsers(updatedUsers);

      await axios.patch(
        `http://localhost:8080/api/users/${userId}`,
        { active: !currentStatus },
        authHeader
      );
    } catch (err) {
      console.error('Error updating user status:', err);
      const revertedUsers = [...users];
      revertedUsers[index].active = currentStatus;
      setUsers(revertedUsers);
    }
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get('http://localhost:8080/api/users', authHeader);
        setUsers(response.data);
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
    <div className="p-6 bg-white rounded-lg">
      <h1 className="text-2xl font-semibold mb-6">User List</h1>
      
      {/* Filter Section */}
      <div className="flex mb-6">
        <div className="border rounded-lg p-2 mr-2">
          <Filter size={20} />
        </div>
        <div className="border rounded-lg flex-grow mr-2">
          <div className="flex items-center px-4">
            <span className="text-gray-700">Filter By</span>
          </div>
        </div>
        <div className="border rounded-lg flex-grow mr-2">
          <div className="flex items-center justify-between px-4">
            <span className="text-gray-700">14 Feb 2019</span>
            <ChevronRight size={16} className="text-gray-500" />
          </div>
        </div>
        <div className="border rounded-lg flex-grow mr-2">
          <div className="flex items-center justify-between px-4">
            <span className="text-gray-700">Order Type</span>
            <ChevronRight size={16} className="text-gray-500" />
          </div>
        </div>
        <div className="border rounded-lg flex-grow mr-2">
          <div className="flex items-center justify-between px-4">
            <span className="text-gray-700">Order Status</span>
            <ChevronRight size={16} className="text-gray-500" />
          </div>
        </div>
        <div className="flex items-center text-red-500">
          <span>Reset Filter</span>
        </div>
      </div>
      
      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading users...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">
            <p>{error}</p>
            <button 
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No users found</p>
          </div>
        ) : (
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-sm font-medium text-gray-900 px-6 py-4 text-left">ID</th>
                <th className="text-sm font-medium text-gray-900 px-6 py-4 text-left">USERNAME</th>
                <th className="text-sm font-medium text-gray-900 px-6 py-4 text-left">NAME</th>
                <th className="text-sm font-medium text-gray-900 px-6 py-4 text-left">EMAIL</th>
                <th className="text-sm font-medium text-gray-900 px-6 py-4 text-left">ACTIVE</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <img className="h-8 w-8 rounded-full bg-purple-500" 
                           src={user.avatar || "/api/placeholder/32/32"} 
                           alt="User avatar" 
                           onError={(e) => {
                             const target = e.target as HTMLImageElement;
                             target.src = "/api/placeholder/32/32";
                           }}
                      />
                      <span className="ml-2 text-sm text-gray-900">{user.username}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="relative inline-block w-10 h-5 rounded-full bg-gray-200">
                      <input 
                        type="checkbox" 
                        className="absolute opacity-0 w-0 h-0"
                        checked={user.active}
                        onChange={() => toggleUserActive(user.id, user.active, index)}
                      />
                      <div className={`absolute inset-0 rounded-full transition-all duration-300 ${user.active ? 'bg-blue-600' : 'bg-gray-300'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all duration-300 ${user.active ? 'left-5' : 'left-0.5'}`}></div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      
      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <button className="flex items-center px-4 py-2 text-sm rounded border">
          <ChevronLeft size={16} className="mr-1" />
          Prev. Date
        </button>
        
        <button className="flex items-center px-4 py-2 text-sm rounded border">
          Next Date
          <ChevronRight size={16} className="ml-1" />
        </button>
      </div>
    </div>
  );
}