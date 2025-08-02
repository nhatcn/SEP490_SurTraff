import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Layout/Sidebar";
import Header from "../../components/Layout/Header";
import CardLineChartViolations from "../../components/Cards/CardLineChartViolations";
import CardBarChartViolations from "../../components/Cards/CardBarChartViolations";
import CardLineChartViolations2 from "../../components/Cards/CardLineChartViolations2";
import CardBarChartViolations2 from "../../components/Cards/CardBarChartViolations2";
import CardLineChartViolations3 from "../../components/Cards/CardLineChartViolations3";
import CardDonutChart from "../../components/Cards/CardDonutChartViolations";
import CardDonutChartMonth from "../../components/Cards/CardDonutChartViolations2";
import CardDonutChartYear from "../../components/Cards/CardDonutChartViolations3";

interface Violation {
  id: number;
  createdAt: string;
  vehicleId: number | null;
}

interface ViolationDetails {
  id: number;
  violationId: number;
  violationTypeId: number | null;
  imageUrl: string | null;
  videoUrl: string | null;
  location: string | null;
  violationTime: string | null;
  speed: number | null;
  additionalNotes: string | null;
  createdAt: string | null;
}

const ViolationStatistics: React.FC = () => {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [violationDetails, setViolationDetails] = useState<ViolationDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(true);

  useEffect(() => {
    const fetchViolations = async () => {
      try {
        const response = await fetch("http://localhost:8081/api/violations");
        const data = await response.json();
        setViolations(data);
      } catch (error) {
        console.error("Error fetching violations:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchViolations();
  }, []);

  useEffect(() => {
    const fetchViolationDetails = async () => {
      try {
        const response = await fetch("http://localhost:8081/api/violationdetail/all");
        const data = await response.json();
        setViolationDetails(data);
      } catch (error) {
        console.error("Error fetching violation details:", error);
      } finally {
        setLoadingDetails(false);
      }
    };
    fetchViolationDetails();
  }, []);

  const chartContainerClass = "relative h-96 mb-6";

  return (
    <div className="flex h-screen">
      <Sidebar defaultActiveItem="statistics"/>
      <div className="flex flex-col flex-1">
        <Header title="Violation Statistics Dashboard" />
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 min-h-full">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-8">
              <div className="xl:col-span-4">
                <div className={chartContainerClass}>
                  <CardDonutChart violationDetails={violationDetails} />
                </div>
              </div>
              <div className="xl:col-span-4">
                <div className={chartContainerClass}>
                  <CardDonutChartMonth violationDetails={violationDetails} />
                </div>
              </div>
              <div className="xl:col-span-4">
                <div className={chartContainerClass}>
                  <CardDonutChartYear violationDetails={violationDetails} />
                </div>
              </div>
            </div>    
            {/* First Row */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-8">
              <div className="xl:col-span-7">
                <div className={chartContainerClass}>
                  <CardLineChartViolations violations={violations} />
                </div>
              </div>
              <div className="xl:col-span-5">
                <div className={chartContainerClass}>
                  <CardBarChartViolations violations={violations} />
                </div>
              </div>
            </div>

            {/* Second Row */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-8">
              <div className="xl:col-span-8">
                <div className={chartContainerClass}>
                  <CardLineChartViolations2 violations={violations} />
                </div>
              </div>
              <div className="xl:col-span-4">
                <div className={chartContainerClass}>
                  <CardBarChartViolations2 violations={violations} />
                </div>
              </div>
            </div>

            {/* Third Row - Full Width */}
            <div className="w-full">
              <div className={chartContainerClass}>
                <CardLineChartViolations3 violationDetails={violationDetails} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViolationStatistics;