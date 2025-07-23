import Sidebar from "../../../components/Layout/Sidebar";
import Header from "../../../components/Layout/Header";
import AccidentDetailsTable from "../../../components/Accidents/AccidentDetailsTable";

export default function AccidentDetails() {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar defaultActiveItem="accidents"/>
      <div className="flex flex-col flex-grow">
        <Header title="Accident Detail" />
        <div className="p-6 overflow-y-auto flex-grow">
          <AccidentDetailsTable />
        </div>
      </div>
    </div>
  );
}
