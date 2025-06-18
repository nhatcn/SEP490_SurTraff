import { Search, Car, Calendar, Clock, MapPin, Shield, Eye } from "lucide-react";
import { useState } from "react";
import { Header, MobileDropdownMenu } from "../../../components/Layout/Menu";
import Logo from "../../../components/Logo/Logo";
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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header  showMobileMenu={showMobileMenu} setShowMobileMenu={setShowMobileMenu} />
      <MobileDropdownMenu showMobileMenu={showMobileMenu} setShowMobileMenu={setShowMobileMenu} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 "> 
        <UserProfile />
      </div>
    
    <Footer/>
    </div>
  );
}