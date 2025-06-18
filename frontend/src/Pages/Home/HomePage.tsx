import { Search, Car, Calendar, Clock, MapPin, Shield, Eye } from "lucide-react";
import { useState } from "react";
import { Header, MobileDropdownMenu } from "../../components/Layout/Menu";
import Logo from "../../components/Logo/Logo";
import Footer from "../../components/Layout/Footer";


interface Violation {
  id: number;
  plateNumber: string;
  violationType: string;
  location: string;
  time: string;
  fine: string;
  status: string;
  image: string;
}

const mockViolations: Violation[] = [
  {
    id: 1,
    plateNumber: "30A-12345",
    violationType: "Red Light Violation",
    location: "Le Loi - Nguyen Hue Intersection",
    time: "2024-06-15 14:30:25",
    fine: "$45",
    status: "Pending",
    image: "/api/placeholder/300/200"
  },
  {
    id: 2,
    plateNumber: "30A-12345",
    violationType: "Speeding",
    location: "Vo Van Kiet Street",
    time: "2024-06-10 09:15:42",
    fine: "$35",
    status: "Processed",
    image: "/api/placeholder/300/200"
  },
  {
    id: 3,
    plateNumber: "51B-67890",
    violationType: "Illegal Parking",
    location: "Nguyen Hue Walking Street",
    time: "2024-06-08 16:45:18",
    fine: "$25",
    status: "Pending",
    image: "/api/placeholder/300/200"
  }
];

export default function CustomerHome() {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Violation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setHasSearched(true);

    setTimeout(() => {
      const results = mockViolations.filter(violation =>
        violation.plateNumber.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(results);
      setIsSearching(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header showMobileMenu={showMobileMenu} setShowMobileMenu={setShowMobileMenu} />
      <MobileDropdownMenu showMobileMenu={showMobileMenu} setShowMobileMenu={setShowMobileMenu} />

      <main>
        <div className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-blue-800 mix-blend-multiply" />
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-transparent opacity-90" />
          </div>

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
                      placeholder="Enter license plate (e.g., 30A-12345)"
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

          <div className="absolute top-0 right-0 -mt-4 opacity-20">
            <Eye className="h-32 w-32 text-blue-300" />
          </div>
          <div className="absolute bottom-0 left-0 -mb-4 opacity-20">
            <Shield className="h-24 w-24 text-blue-300" />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {hasSearched && (
            <div className="mb-12">
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
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {searchResults.map((violation) => (
                    <div key={violation.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                      <img
                        src={violation.image}
                        alt="Violation evidence"
                        className="w-full h-48 object-cover bg-gray-200"
                      />
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-lg font-bold text-blue-600">
                            {violation.plateNumber}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${violation.status === 'Processed'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                            }`}>
                            {violation.status}
                          </span>
                        </div>

                        <h3 className="font-semibold text-gray-900 mb-2">
                          {violation.violationType}
                        </h3>

                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-2" />
                            {violation.location}
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2" />
                            {violation.time}
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2" />
                            Fine: <span className="font-semibold text-red-600 ml-1">{violation.fine}</span>
                          </div>
                        </div>

                        <button className="w-full mt-4 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!hasSearched && (
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
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {mockViolations.map((violation) => (
                      <tr key={violation.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{violation.plateNumber}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{violation.violationType}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{violation.time}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${violation.status === 'Processed'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                            }`}>
                            {violation.status}
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