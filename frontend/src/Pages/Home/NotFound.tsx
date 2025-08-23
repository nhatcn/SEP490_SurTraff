import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Header from "../../components/Layout/Header";
import Sidebar from "../../components/Layout/Sidebar";

export default function NotFound() {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string | null>(null);

  // Get user role from localStorage on component mount
  useEffect(() => {
    const role = localStorage.getItem("role");
    setUserRole(role);
  }, []);

  // Check if user is admin or manager
  const isAdminOrManager = userRole === "admin" || userRole === "manager";

  const handleGoHome = () => {
    if (isAdminOrManager) {
      navigate("/cameras"); // Dashboard for admin/manager
    } else {
      navigate("/home"); // Home for other users
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="flex h-screen">
      {isAdminOrManager && <Sidebar />}
      <div className="flex flex-col flex-grow overflow-auto">
        {isAdminOrManager && <Header title="Page Not Found" />}

        <div className="flex-grow flex items-center justify-center p-6">
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-white rounded-lg shadow-lg p-8">
              {/* 404 Icon */}
              <div className="mb-8">
                <div className="inline-flex items-center justify-center w-32 h-32 bg-blue-100 rounded-full mb-6">
                  <svg
                    className="w-16 h-16 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>

                {/* 404 Text */}
                <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
                <h2 className="text-3xl font-semibold text-gray-700 mb-2">
                  Page Not Found
                </h2>
              </div>

              {/* Description */}
              <div className="mb-8">
                <p className="text-lg text-gray-600 mb-4">
                  Oops! The page you're looking for doesn't exist or has been moved.
                </p>
                <p className="text-gray-500">
                  {isAdminOrManager 
                    ? "It might have been deleted, renamed, or you entered an incorrect URL."
                    : "Please return to the home page to continue."
                  }
                </p>
              </div>

              {/* Suggestions - Only for Admin/Manager */}
              {isAdminOrManager && (
                <div className="bg-gray-50 rounded-lg p-6 mb-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    What you can do:
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center mt-0.5">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span>Check the URL for typing errors</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center mt-0.5">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span>Use the navigation menu</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center mt-0.5">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span>Go back to the previous page</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center mt-0.5">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span>Return to the dashboard</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handleGoHome}
                  className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                  <span>{isAdminOrManager ? "Go to Dashboard" : "Go to Home"}</span>
                </button>

                {isAdminOrManager && (
                  <button
                    onClick={handleGoBack}
                    className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors duration-200 flex items-center justify-center space-x-2"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 19l-7-7m0 0l7-7m-7 7h18"
                      />
                    </svg>
                    <span>Go Back</span>
                  </button>
                )}
              </div>

              {/* Additional Help */}
          

              {/* Quick Navigation - Only for Admin/Manager */}
              {isAdminOrManager && (
                <div className="mt-6">
                  <p className="text-sm text-gray-600 mb-3">Quick Navigation:</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <button
                      onClick={() => navigate("/cameras")}
                      className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 transition-colors"
                    >
                      📷 Cameras
                    </button>
                    <button
                      onClick={() => navigate("/violations")}
                      className="px-3 py-1 text-xs bg-red-100 text-red-800 rounded-full hover:bg-red-200 transition-colors"
                    >
                      ⚠️ Violations
                    </button>
                    <button
                      onClick={() => navigate("/violationstatistics")}
                      className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded-full hover:bg-green-200 transition-colors"
                    >
                      📊 Statistic
                    </button>
                 
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}