import { Clock, Check, X, AlertCircle } from "lucide-react"
import { Badge } from "../UI/AccidentUI/badge"

export const getStatusBadge = (status: string) => {
  const normalizedStatus = status.toLowerCase()
  const statusConfig = {
    pending: {
      className:
        "bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border border-amber-200 animate-pulse shadow-lg",
      icon: <Clock className="w-4 h-4 mr-1 animate-spin" />,
      text: "Pending Review",
    },
    approved: {
      className: "bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200 shadow-lg",
      icon: <Check className="w-4 h-4 mr-1 animate-bounce" />,
      text: "Approved",
    },
    rejected: {
      className: "bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border border-red-200 shadow-lg",
      icon: <X className="w-4 h-4 mr-1 animate-pulse" />,
      text: "Rejected",
    },
    processed: {
      className: "bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200 shadow-lg",
      icon: <Check className="w-4 h-4 mr-1 animate-bounce" />,
      text: "Processed",
    },
  }

  const config = statusConfig[normalizedStatus as keyof typeof statusConfig] || {
    className: "bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border border-gray-200 shadow-lg",
    icon: <AlertCircle className="w-4 h-4 mr-1" />,
    text: normalizedStatus,
  }

  return (
    <Badge className={`${config.className} font-semibold`}>
      {config.icon}
      {config.text}
    </Badge>
  )
}