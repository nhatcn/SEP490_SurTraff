import { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GenericTable, { TableColumn, TableAction, FilterConfig } from '../../components/Table/GenericTable';
import ConfirmDialog from '../UI/PopUp/ConfirmDialog';
import DeleteButton from '../Button/DeleteButton';
import API_URL_BE from '../Link/LinkAPI';


interface Vehicle {
  id: number;
  name: string;
  licensePlate: string;
  userId: number;
  vehicleTypeId: number;
  color: string;
  brand: string;
}

interface FilterState {
  name: string;
  brand: string;
  search: string;
}

export default function TableVehicle() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({ name: '', brand: '', search: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    confirmButtonText: 'Confirm',
    confirmButtonColor: 'bg-red-500 hover:bg-red-600'
  });

  const navigate = useNavigate();

  useEffect(() => {
    fetch(API_URL_BE+'api/vehicle')
      .then(res => res.json())
      .then(data => {
        setVehicles(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch vehicles:', err);
        setError('Unable to load vehicles');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const filtered = applyFilters(vehicles);
    setFilteredVehicles(filtered);
    setCurrentPage(1);
  });

  const applyFilters = (list: Vehicle[]) => {
    let filtered = list;
    const t = filters.search.toLowerCase();
    if (filters.search) {
      filtered = filtered.filter(v =>
        v.name.toLowerCase().includes(t) ||
        v.licensePlate.toLowerCase().includes(t) ||
        v.brand.toLowerCase().includes(t)
      );
    }
    if (filters.name) filtered = filtered.filter(v => v.name === filters.name);
    if (filters.brand) filtered = filtered.filter(v => v.brand === filters.brand);
    return filtered;
  };

  const paginatedData = () => {
    const start = (currentPage - 1) * pageSize;
    return filteredVehicles.slice(start, start + pageSize);
  };

  const handleDelete = (id: number) => {
    const v = vehicles.find(x => x.id === id);
    if (!v) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Vehicle',
      message: `Are you sure you want to delete vehicle "${v.name}"?`,
      onConfirm: () => confirmDelete(id),
      confirmButtonText: 'Delete',
      confirmButtonColor: 'bg-red-500 hover:bg-red-600'
    });
  };

  const confirmDelete = async (id: number) => {
    try {
      const res = await fetch(API_URL_BE+`api/vehicle/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setVehicles(prev => prev.filter(x => x.id !== id));
      setConfirmDialog(prev => ({ ...prev, isOpen: false }));
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleFilterChange = (key: string, value: string) =>
    setFilters(prev => ({ ...prev, [key]: value }));

  const resetFilters = () => setFilters({ name: '', brand: '', search: '' });

  const totalPages = Math.ceil(filteredVehicles.length / pageSize);

  const columns: TableColumn<Vehicle>[] = [
  {
    key: 'id',
    title: 'ID',
    render: val => <span className="inline-block w-16 pl-2">{val}</span>,
  },
  {
    key: 'name',
    title: 'Name',
    render: val => <span className="inline-block min-w-[140px]">{val}</span>,
  },
  {
    key: 'licensePlate',
    title: 'License Plate',
    render: val => <span className="inline-block min-w-[120px]">{val}</span>,
  },
  {
    key: 'userId',
    title: 'User ID',
    render: val => <span className="inline-block w-20 pl-2">{val}</span>,
  },
  {
    key: 'vehicleTypeId',
    title: 'Vehicle Type ID',
    render: val => <span className="inline-block w-24 pl-2">{val}</span>,
  },
  {
    key: 'color',
    title: 'Color',
    render: val => <span className="inline-block min-w-[100px]">{val}</span>,
  },
  {
    key: 'brand',
    title: 'Brand',
    render: val => <span className="inline-block min-w-[120px]">{val}</span>,
  }
];

const actions: TableAction<Vehicle>[] = [
  {
    key: 'view',
    label: 'View',
    icon: <Eye className="w-5 h-5 text-blue-500 hover:text-blue-700" />,
    onClick: record => navigate(`/vehicles/${record.id}`)
  },
  {
    key: 'delete',
    label: 'Delete',
    icon: <DeleteButton onClick={() => {}} size="md" variant="icon" className="text-red-500 hover:text-red-700" />,
    onClick: record => handleDelete(record.id)
  }
];


  const uniqueNames = Array.from(new Set(vehicles.map(v => v.name)));
  const uniqueBrands = Array.from(new Set(vehicles.map(v => v.brand)));

  const filterConfigs: FilterConfig[] = [
    { key: 'search', label: 'Search', type: 'text', placeholder: 'Search by name, plate, brand...' },
    { key: 'name', label: 'Vehicle Name', type: 'select', options: uniqueNames.map(n => ({ value: n, label: n })) },
    { key: 'brand', label: 'Brand', type: 'select', options: uniqueBrands.map(b => ({ value: b, label: b })) }
  ];

  return (
    <>
      <GenericTable<Vehicle>
        data={vehicles}
        filteredData={paginatedData()}
        columns={columns}
        rowKey="id"
        actions={actions}
        filters={filterConfigs}
        filterValues={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={resetFilters}
        loading={loading}
        error={error}
        onRetry={() => window.location.reload()}
        emptyMessage="No vehicles found"
        pagination={{
          enabled: true,
          currentPage,
          totalPages,
          pageSize,
          totalItems: filteredVehicles.length,
          onPageChange: setCurrentPage,
          onPageSizeChange: size => { setPageSize(size); setCurrentPage(1); }
        }}
      />
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        confirmButtonText={confirmDialog.confirmButtonText}
        confirmButtonColor={confirmDialog.confirmButtonColor}
      />
    </>
  );
}
