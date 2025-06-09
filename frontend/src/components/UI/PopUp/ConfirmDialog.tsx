// ConfirmDialog.tsx
import { AlertCircle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmButtonText?: string;
  confirmButtonColor?: string;
}

const ConfirmDialog = ({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel,
  confirmButtonText = "Confirm",
  confirmButtonColor = "bg-red-500 hover:bg-red-600"
}: ConfirmDialogProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
        <div className="flex items-center mb-4">
          <AlertCircle className="text-amber-500 mr-2" size={24} />
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        <p className="text-gray-700 mb-6">{message}</p>
        <div className="flex justify-end space-x-3">
          <button
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className={`px-4 py-2 text-white rounded-md ${confirmButtonColor}`}
            onClick={onConfirm}
          >
            {confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;