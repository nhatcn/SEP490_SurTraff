import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DeleteButton from "../Button/DeleteButton";
import ViewButton from "../Button/ViewButton";
import ConfirmDialog from "../UI/PopUp/ConfirmDialog";
import GenericTable, {
  TableColumn,
  TableAction,
  FilterConfig,
} from "../Table/GenericTable";

interface CameraType {
  id: number;
  name: string;
  location: string;
  stream_url: string;
  status: boolean;
  latitude: number;
  longitude: number;
  thumbnail: string | null;
  created_at: string;
}

interface AccidentType {
  id: number;
  camera_id: number;
  location: string;
  status: string;
  accident_time: string;
}

export default function AccidentTable() {
  const [accidents, setAccidents] = useState<AccidentType[]>([]);
  const [cameras, setCameras] = useState<CameraType[]>([]);
  const [statusOptions, setStatusOptions] = useState<{ value: string; label: string }[]>([]);
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    status: "",
  });
  const [modalDeleteId, setModalDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch accident data
    fetch("http://localhost:8081/api/accident")
      .then((res) => res.json())
      .then((data: AccidentType[]) => {
        setAccidents(data);

        // Extract unique statuses
        const uniqueStatuses = Array.from(new Set(data.map((acc) => acc.status)));
        const options = uniqueStatuses.map((status) => ({
          value: status,
          label: status,
        }));
        setStatusOptions(options);
      })
      .catch(console.error);

    // Fetch camera data
    fetch("http://localhost:8000/api/cameras")
      .then((res) => res.json())
      .then(setCameras)
      .catch(console.error);
  }, []);

  const handleFilterChange = (key: string, value: any) => {
    setFilterValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const resetFilters = () => {
    setFilterValues({
      status: "",
    });
  };

  const filters: FilterConfig[] = [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: statusOptions,
    },
  ];

  const filteredAccidents = accidents.filter((acc) => {
    const matchStatus = !filterValues.status || acc.status === filterValues.status;
    return matchStatus;
  });

  const columns: TableColumn<AccidentType>[] = [
    {
      key: "camera_id",
      title: "Camera",
      render: (value) =>
        cameras.find((cam) => cam.id === value)?.name || "Unknown",
    },
    { key: "location", title: "Location" },
    {
      key: "accident_time",
      title: "Time",
      render: (value) => new Date(value).toLocaleString(),
    },
    { key: "status", title: "Status" },
  ];

  const actions: TableAction<AccidentType>[] = [
    {
      key: "view",
      label: "View",
      icon: <ViewButton size="sm" onClick={() => {}} />,
      onClick: (record) => navigate(`/accidents/${record.id}`),
    },
    {
      key: "delete",
      label: "Delete",
      icon: <DeleteButton size="sm" variant="icon" onClick={() => {}} />,
      onClick: (record) => setModalDeleteId(record.id),
    },
  ];

  const handleDelete = async () => {
    if (modalDeleteId === null) return;

    setIsDeleting(true);

    try {
      const res = await fetch(`http://localhost:8081/api/accident/${modalDeleteId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setAccidents((prev) => prev.filter((acc) => acc.id !== modalDeleteId));
        alert("Deleted successfully.");
      } else {
        alert("Failed to delete accident.");
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred while deleting the accident.");
    } finally {
      setIsDeleting(false);
      setModalDeleteId(null);
    }
  };

  return (
    <>
      <GenericTable<AccidentType>
        data={accidents}
        filteredData={filteredAccidents}
        columns={columns}
        rowKey="id"
        actions={actions}
        emptyMessage="No accident data available"
        filters={filters}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        onResetFilters={resetFilters}
      />

      <ConfirmDialog
        isOpen={modalDeleteId !== null}
        title="Confirm Deletion"
        message="Are you sure you want to delete this accident?"
        onConfirm={handleDelete}
        onCancel={() => setModalDeleteId(null)}
        confirmButtonText={isDeleting ? "Deleting..." : "Confirm"}
        confirmButtonColor="bg-red-500 hover:bg-red-600"
      />
    </>
  );
}
