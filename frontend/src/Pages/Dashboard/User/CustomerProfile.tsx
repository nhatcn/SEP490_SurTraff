import { useState } from "react";
import { Header, MobileDropdownMenu } from "../../../components/Layout/Menu";
import UserProfile from "../../../components/User/UserProfile";
import Footer from "../../../components/Layout/Footer";

// Interface for violation object
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

// Mock data for violations
const mockViolations: Violation[] = [
  {
    id: 1,
    plateNumber: "30A-12345",
    violationType: "Red Light Violation",
    location: "Le Loi - Nguyen Hue Intersection",
    time: "2024-06-15 14:30:25",
    fine: "45",
    status: "Pending",
    image: "/api/placeholder/300/200"
  },
  {
    id: 2,
    plateNumber: "30A-12345",
    violationType: "Speeding",
    location: "Vo Van Kiet Street",
    time: "2024-06-10 09:15:42",
    fine: "35",
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

export default function CustomerProfile() {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header showMobileMenu={showMobileMenu} setShowMobileMenu={setShowMobileMenu} />
      <MobileDropdownMenu showMobileMenu={showMobileMenu} setShowMobileMenu={setShowMobileMenu} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <UserProfile />
        
        {/* Search Section */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Search Violations</h3>
          <div className="flex gap-4 mb-6">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter plate number..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSearching ? "Searching..." : "Search"}
            </button>
          </div>
          
          {/* Search Results */}
          {hasSearched && (
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">
                Search Results ({searchResults.length} found)
              </h4>
              {searchResults.length > 0 ? (
                <div className="space-y-4">
                  {searchResults.map((violation) => (
                    <div key={violation.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="font-semibold">{violation.plateNumber}</h5>
                          <p className="text-sm text-gray-600">{violation.violationType}</p>
                          <p className="text-sm text-gray-500">{violation.location}</p>
                          <p className="text-sm text-gray-500">{violation.time}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">${violation.fine}</p>
                          <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                            violation.status === 'Pending' 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {violation.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No violations found for the search query.</p>
              )}
            </div>
          )}
        </div>
      </div>
      
      <Footer />
    </div>
  );
}