import Sidebar from "../../../components/Layout/Sidebar";
import Header from "../../../components/Layout/Header";
import UserProfile from "../../../components/User/UserProfile";

export default function UserProfileDashboard() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-col flex-grow overflow-hidden">
        <Header title="Hồ sơ cá nhân" />
        
        <div className="flex-grow overflow-y-auto p-4 bg-gray-50">
          <UserProfile />
        </div>
      </div>
    </div>
  );
}