"use client"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Download, Loader2 } from "lucide-react" // Using Lucide icons for consistency
import type { HookData } from "jspdf-autotable" // Explicitly import HookData type

// Import the logo image from the public directory
import logoImage from "../../asset/logo/screenshot_1749087176-removebg-preview.png"

// Define the AccidentType interface here or import it if it's in a shared types file
interface AccidentType {
  id: number
  cameraId: number
  cameraName: string
  cameraLocation: string
  location: string
  status: string
  accidentTime: string
}

interface ExportAccidentPDFProps {
  accidents: AccidentType[]
}

// Define RGBColor type for better type safety with jspdf-autotable
type RGBColor = [number, number, number]

const ExportAccidentPDF = ({ accidents }: ExportAccidentPDFProps) => {
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [logoBase64, setLogoBase64] = useState<string | null>(null) // State to store base64 logo
  const title = "List of Accident Incidents"

  // Effect to load and convert the logo image to base64
  useEffect(() => {
    const convertImageToBase64 = (url: string) => {
      return new Promise<string>((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = "anonymous" // Set crossOrigin to anonymous to avoid CORS issues [^vercel_knowledge_base]
        img.onload = () => {
          const canvas = document.createElement("canvas")
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext("2d")
          ctx?.drawImage(img, 0, 0)
          resolve(canvas.toDataURL("image/png")) // Convert to PNG base64
        }
        img.onerror = (error) => reject(error)
        img.src = url
      })
    }

    if (logoImage) {
      convertImageToBase64(logoImage)
        .then(setLogoBase64)
        .catch((error) => console.error("Error loading logo:", error))
    }
  }, [])

  const handleExportPDF = async () => {
    setIsExporting(true)
    setExportProgress(0)

    if (!logoBase64) {
      alert("Logo is still loading. Please wait a moment and try again.")
      setIsExporting(false)
      setExportProgress(0)
      return
    }

    try {
      // Simulate loading progress
      const progressInterval = setInterval(() => {
        setExportProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 100)

      // Dynamic imports for better performance
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ])

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      })

      // Enhanced styling with explicit RGBColor type
      const colors: {
        primary: RGBColor
        secondary: RGBColor
        accent: RGBColor
        text: RGBColor
        lightText: RGBColor
        border: RGBColor
        background: RGBColor
      } = {
        primary: [34, 197, 94], // Green-500
        secondary: [16, 185, 129], // Emerald-500
        accent: [6, 182, 212], // Cyan-500
        text: [31, 41, 55], // Gray-800
        lightText: [107, 114, 128], // Gray-500
        border: [209, 213, 219], // Gray-300
        background: [249, 250, 251], // Gray-50
      }

      const currentDate = new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(new Date())

      const addWatermark = () => {
        doc.saveGraphicsState()
        doc.setGState((doc as any).GState({ opacity: 0.1 })) // Cast doc to any for GState
        doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
        doc.setFontSize(60)
        doc.text("CONFIDENTIAL", 105, 150, {
          align: "center",
          angle: 45,
        })
        doc.restoreGraphicsState()
      }

      const addHeader = (pageNumber: number) => {
        // Header background
        doc.setFillColor(255, 255, 255) // Change header background to white
        doc.rect(0, 0, 210, 45, "F")

        // Logo image
        if (logoBase64) {
          doc.addImage(logoBase64, "PNG", 15, 12, 25, 20) // Adjust position and size as needed
        }

        // Title and system info
        doc.setTextColor(0, 0, 0) // Set text color to black
        doc.setFontSize(20)
        doc.setFont("helvetica", "bold")
        doc.text(title, 50, 20)
        doc.setFontSize(12)
        doc.setFont("helvetica", "normal")
        doc.text("Accident Incident Management System", 50, 28)
        doc.setFontSize(10)
        doc.text(`Generated: ${currentDate}`, 50, 35)

        // Page number with modern styling
        doc.setFillColor(255, 255, 255)
        doc.roundedRect(170, 8, 25, 12, 2, 2, "F")
        doc.setTextColor(0, 0, 0) // Set page number text color to black
        doc.setFontSize(10)
        doc.setFont("helvetica", "bold")
        doc.text(`Page ${pageNumber}`, 182.5, 16, { align: "center" })
      }

      const addFooter = (pageNumber: number, totalPages: number) => {
        // Footer line
        doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2])
        doc.setLineWidth(0.5)
        doc.line(15, 280, 195, 280)

        // Footer content
        doc.setTextColor(colors.lightText[0], colors.lightText[1], colors.lightText[2])
        doc.setFontSize(9)
        doc.setFont("helvetica", "normal")
        doc.text("© 2025 Accident Incident Management System", 15, 285)
        doc.text("Confidential - For Official Use Only", 15, 290)
        doc.text(`${pageNumber} of ${totalPages}`, 195, 285, { align: "right" })
        doc.text("support@accident-system.com", 195, 290, { align: "right" })
      }

      // Prepare table data with enhanced formatting
      const tableData = accidents.map((accident, index) => {
        const accidentTime = accident.accidentTime
          ? new Intl.DateTimeFormat("en-GB", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }).format(new Date(accident.accidentTime))
          : "N/A"
        return [
          (index + 1).toString().padStart(3, "0"),
          accident.cameraName || "N/A",
          accident.cameraLocation || "N/A",
          accident.location || "N/A",
          accidentTime,
          accident.status || "Pending",
        ]
      })

      // Add summary statistics
      const totalAccidents = accidents.length
      const uniqueCameras = new Set(accidents.map((a) => a.cameraId)).size
      const locationStats = Array.from(
        accidents.reduce((acc, accident) => {
          acc.set(accident.location, (acc.get(accident.location) || 0) + 1)
          return acc
        }, new Map<string, number>()),
      )
        .map(([location, count]) => ({ location, count }))
        .sort((a, b) => b.count - a.count)
      const mostCommonLocation = locationStats[0]?.location || "N/A"
      const mostCommonLocationCount = locationStats[0]?.count || 0

      // Summary box
      doc.setFillColor(colors.background[0], colors.background[1], colors.background[2])
      doc.roundedRect(15, 50, 180, 25, 3, 3, "F")
      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2])
      doc.roundedRect(15, 50, 180, 25, 3, 3, "S")
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2])
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.text("Summary Statistics", 20, 58)
      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")
      doc.text(`Total Accidents: ${totalAccidents}`, 20, 65)
      doc.text(`Unique Cameras Involved: ${uniqueCameras}`, 20, 70)
      doc.text(`Most Common Location: ${mostCommonLocation} (${mostCommonLocationCount} cases)`, 100, 65)
      doc.text(`Report Generated: ${currentDate}`, 100, 70)

      setExportProgress(50)

      // Enhanced table
      autoTable(doc, {
        startY: 85,
        head: [["No.", "Camera Name", "Camera Location", "Location", "Date & Time", "Status"]],
        body: tableData,
        theme: "striped",
        headStyles: {
          fillColor: [255, 255, 255], // Change table header background to white
          textColor: [0, 0, 0], // Change table header text color to black
          fontSize: 10,
          fontStyle: "bold",
          halign: "center",
          valign: "middle",
        },
        bodyStyles: {
          fontSize: 9,
          cellPadding: 4,
          textColor: colors.text,
          lineColor: colors.border,
          lineWidth: 0.1,
        },
        alternateRowStyles: {
          fillColor: colors.background,
        },
        columnStyles: {
          0: { halign: "center", cellWidth: 15 },
          1: { halign: "center", cellWidth: 30 },
          2: { cellWidth: 40 },
          3: { cellWidth: 35 },
          4: { halign: "center", cellWidth: 30 },
          5: { halign: "center", cellWidth: 25 }, // Increased width for Status column
        },
        margin: { top: 85, left: 15, right: 15 },
        didDrawPage: (data: HookData) => {
          const pageNumber = (doc as any).internal.getNumberOfPages() // Cast doc to any
          const totalPages = Math.ceil(accidents.length / 25) + 1 // Rough estimate, adjust as needed
          addHeader(pageNumber)
          addFooter(pageNumber, totalPages)
          addWatermark()
        },
      })

      setExportProgress(80)

      // Add notes section
      const finalY = (doc as any).lastAutoTable?.finalY || 85 // Cast doc to any
      if (finalY < 250) {
        doc.setFillColor(colors.background[0], colors.background[1], colors.background[2])
        doc.roundedRect(15, finalY + 10, 180, 30, 3, 3, "F")
        doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2])
        doc.roundedRect(15, finalY + 10, 180, 30, 3, 3, "S")
        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2])
        doc.setFontSize(11)
        doc.setFont("helvetica", "bold")
        doc.text("Important Notes:", 20, finalY + 18)
        doc.setFontSize(9)
        doc.setFont("helvetica", "normal")
        doc.text("• This report contains confidential accident incident data", 20, finalY + 25)
        doc.text("• All timestamps are in local time zone", 20, finalY + 30)
        doc.text("• For inquiries, contact: support@accident-system.com", 20, finalY + 35)
      }

      setExportProgress(100)

      // Generate filename with timestamp
      const filename = `${title.replace(/\s+/g, "_").toLowerCase()}_${new Date().toISOString().slice(0, 19).replace(/[:-]/g, "")}.pdf`

      // Save the PDF
      doc.save(filename)

      // Success notification
      setTimeout(() => {
        setIsExporting(false)
        setExportProgress(0)
      }, 500)
    } catch (error) {
      console.error("Error generating PDF:", error)
      setIsExporting(false)
      setExportProgress(0)
      alert("Error generating PDF. Please try again.")
    }
  }

  return (
    <div className="relative">
      <motion.button
        onClick={handleExportPDF}
        disabled={isExporting || !accidents?.length || !logoBase64} // Disable if logo is not loaded
        className="group relative overflow-hidden px-6 py-3 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed"
        whileHover={{ scale: isExporting ? 1 : 1.02 }}
        whileTap={{ scale: isExporting ? 1 : 0.98 }}
      >
        {/* Background animation */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        {/* Content */}
        <div className="relative z-10 flex items-center space-x-3">
          {isExporting ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                className="w-5 h-5"
              >
                <Loader2 className="w-5 h-5 animate-spin" />
              </motion.div>
              <span>Exporting... {exportProgress}%</span>
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              <span>Export PDF</span>
              <div className="bg-white bg-opacity-20 px-2 py-1 rounded-md text-xs">
                {accidents?.length || 0} records
              </div>
            </>
          )}
        </div>
        {/* Progress bar */}
        {isExporting && (
          <motion.div
            className="absolute bottom-0 left-0 h-1 bg-white bg-opacity-30 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${exportProgress}%` }}
            transition={{ duration: 0.3 }}
          />
        )}
      </motion.button>
      {/* Export info tooltip */}
      {!isExporting && accidents?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full left-0 mt-2 bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg max-w-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20"
        >
          <div className="flex items-center space-x-2 mb-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium">Export Details</span>
          </div>
          <ul className="text-xs space-y-1">
            <li>• {accidents.length} accident records</li>
            <li>• Includes summary statistics</li>
            <li>• Professional formatting</li>
            <li>• Watermarked for security</li>
          </ul>
          <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 transform rotate-45" />
        </motion.div>
      )}
    </div>
  )
}

export default ExportAccidentPDF
