import Sidebar from "../../../components/Layout/Sidebar";
import Header from "../../../components/Layout/Header";
import AccidentTable from "../../../components/Accidents/AccidentTable";

export default function AccidentDashboard() {
  return (
    <div className="flex h-screen">
      <Sidebar defaultActiveItem="accidents" />
      <div className="flex flex-col flex-grow overflow-hidden">
        <Header title="Traffic Accident Management" />
        <div className="flex-grow overflow-y-auto p-4">
          <AccidentTable />
        </div>
      </div>
    </div>
  );
}
