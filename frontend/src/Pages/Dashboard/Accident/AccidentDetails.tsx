"use client"

import { useState, useEffect } from "react"
import AccidentDetailsTable from "../../../components/Accidents/AccidentDetailsTable";


// Mock BounceLoadingComponent since it's referenced in the original files
function BounceLoadingComponent({ fullScreen, size }: { fullScreen: boolean; size: string }) {
  return (
    <div className={`flex items-center justify-center ${fullScreen ? "fixed inset-0 bg-white/80 z-50" : ""}`}>
      <div className="flex space-x-2">
        <div className={`${size === "sm" ? "w-2 h-2" : "w-4 h-4"} bg-blue-600 rounded-full animate-bounce`}></div>
        <div
          className={`${size === "sm" ? "w-2 h-2" : "w-4 h-4"} bg-blue-600 rounded-full animate-bounce`}
          style={{ animationDelay: "0.1s" }}
        ></div>
        <div
          className={`${size === "sm" ? "w-2 h-2" : "w-4 h-4"} bg-blue-600 rounded-full animate-bounce`}
          style={{ animationDelay: "0.2s" }}
        ></div>
      </div>
    </div>
  )
}

// Mock components that were referenced in the original files
function Sidebar({ defaultActiveItem }: { defaultActiveItem: string }) {
  return (
    <div className="w-64 bg-gray-900 text-white p-4">
      <h2 className="text-xl font-bold mb-4">Navigation</h2>
      <nav>
        <div className={`p-2 rounded ${defaultActiveItem === "accidents" ? "bg-blue-600" : "hover:bg-gray-700"}`}>
          Accidents
        </div>
      </nav>
    </div>
  )
}

function Header({ title }: { title: string }) {
  return (
    <header className="bg-white shadow-sm border-b p-4">
      <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
    </header>
  )
}

export default function Page() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => {
      setLoading(false)
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar defaultActiveItem="accidents" />

      {/* Main content area */}
      <div className="flex flex-col flex-grow">
        <Header title="Accident Detail" />

        <div className="relative p-6 overflow-y-auto flex-grow">
          {loading && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/70">
              <BounceLoadingComponent fullScreen={false} size="sm" />
            </div>
          )}

          {!loading && <AccidentDetailsTable />}
        </div>
      </div>
    </div>
  )
}
