import { Search, Car, Calendar, Clock, MapPin, Shield, Eye } from "lucide-react";
import { useState, useEffect } from "react";
import { Header, MobileDropdownMenu } from "../../components/Layout/Menu";
import Footer from "../../components/Layout/Footer";

interface Violation {
  id: number;
  camera_id: number;
  vehicle_id: number;
  user_id: number;
  licensePlate: string;
  violation_type_id: number;
  type_name: string;
  // Nếu có thêm trường location, time, fine thì thêm ở đây
  location?: string;
  time?: string;
  fine?: string;
  status?: string;
  image?: string;
}

// Dữ liệu "data" của bạn, giả sử import hoặc fetch
const data: Violation[] = [
  {
    id: 5,
    camera_id: 2,
    vehicle_id: 2,
    user_id: 7,
    licensePlate: "51B-67890",
    violation_type_id: 2,
    type_name: "overspeed"
  },
  {
    id: 6,
    camera_id: 2,
    vehicle_id: 3,
    user_id: 7,
    licensePlate: "51C-11111",
    violation_type_id: 3,
    type_name: "illegal park"
  },
  {
    id: 7,
    camera_id: 3,
    vehicle_id: 4,
    user_id: 5,
    licensePlate: "51D-22222",
    violation_type_id: 1,
    type_name: "red light"
  },
  // ...các dữ liệu khác
];

const USER_ID = 7; // user cố định

export default function CustomerHome() {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Violation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [userViolations, setUserViolations] = useState<Violation[]>([]);

  // Lọc vi phạm của user_id = 7 khi component mount
  useEffect(() => {
    const filtered = data.filter((v) => v.user_id === USER_ID);
    setUserViolations(filtered);
  }, []);

  const handleSearch = () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setHasSearched(true);

    setTimeout(() => {
      // Tìm trong mảng userViolations thôi
      const results = userViolations.filter((violation) =>
        violation.licensePlate.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(results);
      setIsSearching(false);
    }, 500);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header showMobileMenu={showMobileMenu} setShowMobileMenu={setShowMobileMenu} />
      <MobileDropdownMenu showMobileMenu={showMobileMenu} setShowMobileMenu={setShowMobileMenu} />

      <main>
        {/* Search input như cũ */}
        <div className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 overflow-hidden">
          {/* ... phần header gradient giống cũ, bạn giữ nguyên */}
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div className="text-center">
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
                Traffic Violation
                <span className="block text-blue-200">Search System</span>
              </h1>
              <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto">
                Enter your license plate number to check for traffic violations quickly and easily
              </p>

              <div className="max-w-2xl mx-auto">
                <div className="flex rounded-lg shadow-lg overflow-hidden bg-white">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="Enter license plate (e.g., 51B-67890)"
                      className="w-full px-6 py-4 text-lg border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={handleKeyPress}
                    />
                    <Car className="absolute right-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400" />
                  </div>
                  <button
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="bg-blue-600 text-white px-8 py-4 hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {isSearching ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Searching...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Search className="h-5 w-5 mr-2" />
                        Search
                      </div>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
          {/* Bạn giữ các phần icon như Shield, Eye nếu muốn */}
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {hasSearched ? (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Search Results for "{searchQuery}"
              </h2>

              {searchResults.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                  <Car className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Violations Found
                  </h3>
                  <p className="text-gray-500">
                    This license plate has no recorded traffic violations
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">
                      Violations for {searchQuery}
                    </h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            License Plate
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Violation Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Location
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Time
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Fine
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {searchResults.map((violation) => (
                          <tr key={violation.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                              {violation.licensePlate}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">{violation.type_name}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{violation.location || "-"}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{violation.time || "-"}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{violation.fine || "-"}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  violation.status === "Processed"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {violation.status || "Pending"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            // Hiển thị tất cả vi phạm của user_id = 7 nếu chưa search
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Recent Violations</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        License Plate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Violation Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fine
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {userViolations.map((violation) => (
                      <tr key={violation.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                          {violation.licensePlate}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{violation.type_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{violation.location || "-"}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{violation.time || "-"}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{violation.fine || "-"}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              violation.status === "Processed"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {violation.status || "Pending"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
