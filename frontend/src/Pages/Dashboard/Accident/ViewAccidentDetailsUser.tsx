"use client";

import { useState } from "react";
import { Header, MobileDropdownMenu } from "../../../components/Layout/Menu";
import Footer from "../../../components/Layout/Footer";
import AccidentDetailsUserTable from "../../../components/Accidents/AccidentDetailsUserTable";

export default function ViewAccidentDetails() {
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex">

      {/* Main */}
      <div className="flex flex-col flex-grow w-full">
        <Header
          showMobileMenu={showMobileMenu}
          setShowMobileMenu={setShowMobileMenu}
        />

        <MobileDropdownMenu
          showMobileMenu={showMobileMenu}
          setShowMobileMenu={setShowMobileMenu}
        />

        <main className="flex-grow p-6 overflow-y-auto">
          <h1 className="text-2xl font-semibold text-gray-800 mb-6">
            Accident Details
          </h1>

          <AccidentDetailsUserTable />
        </main>

        <Footer />
      </div>
    </div>
  );
}
