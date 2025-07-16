
import React, { useState } from 'react'
import { motion } from 'framer-motion'

const ExportViolationsPDF = ({ violations}) => {
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const title = "List of traffic violations"
  const handleExportPDF = async () => {
    setIsExporting(true)
    setExportProgress(0)

    try {
      // Simulate loading progress
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 100)

      // Dynamic imports for better performance
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable')
      ])

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      // Enhanced styling
      const colors = {
        primary: [34, 197, 94],    // Green-500
        secondary: [16, 185, 129], // Emerald-500
        accent: [6, 182, 212],     // Cyan-500
        text: [31, 41, 55],        // Gray-800
        lightText: [107, 114, 128], // Gray-500
        border: [209, 213, 219],   // Gray-300
        background: [249, 250, 251] // Gray-50
      }

      const currentDate = new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(new Date())

      const addWatermark = () => {
        doc.saveGraphicsState()
        doc.setGState(doc.GState({ opacity: 0.1 }))
        doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
        doc.setFontSize(60)
        doc.text('CONFIDENTIAL', 105, 150, { 
          align: 'center', 
          angle: 45 
        })
        doc.restoreGraphicsState()
      }

      const addHeader = (pageNumber) => {
        // Header background
        doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2])
        doc.rect(0, 0, 210, 45, 'F')
        
        // Logo placeholder with modern design
        doc.setFillColor(255, 255, 255)
        doc.roundedRect(15, 12, 25, 20, 3, 3, 'F')
        doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('LOGO', 27.5, 25, { align: 'center' })

        // Title and system info
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(20)
        doc.setFont('helvetica', 'bold')
        doc.text(title, 50, 20)
        
        doc.setFontSize(12)
        doc.setFont('helvetica', 'normal')
        doc.text('Traffic Violation Management System', 50, 28)
        
        doc.setFontSize(10)
        doc.text(`Generated: ${currentDate}`, 50, 35)
        
        // Page number with modern styling
        doc.setFillColor(255, 255, 255)
        doc.roundedRect(170, 8, 25, 12, 2, 2, 'F')
        doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text(`Page ${pageNumber}`, 182.5, 16, { align: 'center' })
      }

      const addFooter = (pageNumber, totalPages) => {
        // Footer line
        doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2])
        doc.setLineWidth(0.5)
        doc.line(15, 280, 195, 280)
        
        // Footer content
        doc.setTextColor(colors.lightText[0], colors.lightText[1], colors.lightText[2])
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.text('© 2025 Traffic Violation Management System', 15, 285)
        doc.text('Confidential - For Official Use Only', 15, 290)
        doc.text(`${pageNumber} of ${totalPages}`, 195, 285, { align: 'right' })
        doc.text('support@traffic-system.com', 195, 290, { align: 'right' })
      }

      // Prepare table data with enhanced formatting
      const tableData = violations.map((violation, index) => {
        const detail = violation.violationDetails?.[0] || {}
        const violationTime = detail.violationTime 
          ? new Intl.DateTimeFormat('en-GB', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }).format(new Date(detail.violationTime))
          : 'N/A'

        return [
          (index + 1).toString().padStart(3, '0'),
          violation.vehicle?.licensePlate || 'N/A',
          detail.violationType?.typeName || 'N/A',
          detail.location || 'N/A',
          detail.speed ? `${detail.speed} km/h` : 'N/A',
          violationTime,
          violation.status || 'Pending'
        ]
      })

      // Add summary statistics
      const totalViolations = violations.length
      const uniqueVehicles = new Set(violations.map(v => v.vehicle?.licensePlate).filter(Boolean)).size
      const avgSpeed = violations.reduce((sum, v) => {
        const speed = v.violationDetails?.[0]?.speed
        return speed ? sum + speed : sum
      }, 0) / violations.filter(v => v.violationDetails?.[0]?.speed).length || 0

      // Summary box
      doc.setFillColor(colors.background[0], colors.background[1], colors.background[2])
      doc.roundedRect(15, 50, 180, 25, 3, 3, 'F')
      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2])
      doc.roundedRect(15, 50, 180, 25, 3, 3, 'S')

      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2])
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Summary Statistics', 20, 58)

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Total Violations: ${totalViolations}`, 20, 65)
      doc.text(`Unique Vehicles: ${uniqueVehicles}`, 20, 70)
      doc.text(`Average Speed: ${avgSpeed.toFixed(1)} km/h`, 120, 65)
      doc.text(`Report Generated: ${currentDate}`, 120, 70)

      setExportProgress(50)

      // Enhanced table
      autoTable(doc, {
        startY: 85,
        head: [[
          'No.',
          'License Plate',
          'Violation Type',
          'Location',
          'Speed',
          'Date & Time',
          'Status'
        ]],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: colors.primary,
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle'
        },
        bodyStyles: {
          fontSize: 9,
          cellPadding: 4,
          textColor: colors.text,
          lineColor: colors.border,
          lineWidth: 0.1
        },
        alternateRowStyles: { 
          fillColor: colors.background 
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 15 },
          1: { halign: 'center', cellWidth: 25 },
          2: { cellWidth: 35 },
          3: { cellWidth: 40 },
          4: { halign: 'center', cellWidth: 20 },
          5: { halign: 'center', cellWidth: 30 },
          6: { halign: 'center', cellWidth: 20 }
        },
        margin: { top: 85, left: 15, right: 15 },
        didDrawPage: (data) => {
          const pageNumber = doc.internal.getNumberOfPages()
          const totalPages = Math.ceil(violations.length / 25) + 1
          addHeader(pageNumber)
          addFooter(pageNumber, totalPages)
          addWatermark()
        },
        didParseCell: (data) => {
          // Highlight critical violations
          if (data.column.index === 6 && data.cell.text[0] === 'Critical') {
            data.cell.styles.textColor = [220, 38, 38] // Red-600
            data.cell.styles.fontStyle = 'bold'
          }
        }
      })

      setExportProgress(80)

      // Add notes section
      const finalY = doc.lastAutoTable?.finalY || 85
      if (finalY < 250) {
        doc.setFillColor(colors.background[0], colors.background[1], colors.background[2])
        doc.roundedRect(15, finalY + 10, 180, 30, 3, 3, 'F')
        doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2])
        doc.roundedRect(15, finalY + 10, 180, 30, 3, 3, 'S')

        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2])
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text('Important Notes:', 20, finalY + 18)

        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.text('• This report contains confidential traffic violation data', 20, finalY + 25)
        doc.text('• All timestamps are in local time zone', 20, finalY + 30)
        doc.text('• For inquiries, contact: support@traffic-system.com', 20, finalY + 35)
      }

      setExportProgress(100)

      // Generate filename with timestamp
      const filename = `${title.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')}.pdf`
      
      // Save the PDF
      doc.save(filename)

      // Success notification
      setTimeout(() => {
        setIsExporting(false)
        setExportProgress(0)
      }, 500)

    } catch (error) {
      console.error('Error generating PDF:', error)
      setIsExporting(false)
      setExportProgress(0)
      alert('Error generating PDF. Please try again.')
    }
  }

  return (
    <div className="relative">
      <motion.button
        onClick={handleExportPDF}
        disabled={isExporting || !violations?.length}
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
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="60" strokeDashoffset="60" opacity="0.3"/>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="60" strokeDashoffset={60 - (exportProgress * 0.6)} className="transition-all duration-300"/>
                </svg>
              </motion.div>
              <span>Exporting... {exportProgress}%</span>
            </>
          ) : (
            <>
              <motion.svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                whileHover={{ y: -1 }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </motion.svg>
              <span>Export PDF</span>
              <div className="bg-white bg-opacity-20 px-2 py-1 rounded-md text-xs">
                {violations?.length || 0} records
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
      {!isExporting && violations?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full left-0 mt-2 bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg max-w-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20"
        >
          <div className="flex items-center space-x-2 mb-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Export Details</span>
          </div>
          <ul className="text-xs space-y-1">
            <li>• {violations.length} violation records</li>
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

export default ExportViolationsPDF