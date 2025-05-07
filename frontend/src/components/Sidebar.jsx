import { Link } from "react-router-dom"
import {
  LayoutDashboard,
  Package,
  Heart,
  Inbox,
  Users,
  PackageOpen,
  Calendar,
  CheckSquare,
  FileText,
  LayoutGrid,
  Table,
  Settings,
  LogOut,
  Gift
} from "lucide-react"
import "./Sidebar.css"

function Sidebar() {
  const menuItems = [
    { id: "dashboard", icon: <LayoutDashboard size={18} />, label: "Dashboard" },
    { id: "products", icon: <Package size={18} />, label: "Products" },
    { id: "favorites", icon: <Heart size={18} />, label: "Favorites" },
    { id: "inbox", icon: <Inbox size={18} />, label: "Inbox" },
    { id: "user-management", icon: <Users size={18} />, label: "User management", highlight: true },
    { id: "product-stock", icon: <PackageOpen size={18} />, label: "Product Stock" },
  ]

  const pageItems = [
    { id: "pricing", icon: <Gift size={18} />, label: "Pricing" },
    { id: "calendar", icon: <Calendar size={18} />, label: "Calender" },
    { id: "todo", icon: <CheckSquare size={18} />, label: "To-Do" },
    { id: "contact", icon: <Users size={18} />, label: "Contact" },
    { id: "invoice", icon: <FileText size={18} />, label: "Invoice" },
    { id: "ui-elements", icon: <LayoutGrid size={18} />, label: "UI Elements" },
    { id: "team", icon: <Users size={18} />, label: "Team" },
    { id: "table", icon: <Table size={18} />, label: "Table" },
  ]

  const bottomItems = [
    { id: "settings", icon: <Settings size={18} />, label: "Settings" },
    { id: "logout", icon: <LogOut size={18} />, label: "Logout" },
  ]

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1 className="sidebar-brand">DashStack</h1>
      </div>

      <div className="sidebar-body">
        <ul className="nav flex-column">
          {menuItems.map((item) => (
            <li className="nav-item" key={item.id}>
              <Link
                to={`/${item.id === "dashboard" ? "" : item.id}`}
                className={`nav-link ${item.highlight ? "nav-link-highlight" : ""}`}
              >
                <span className="nav-icon">{item.icon} {item.label}</span>
               
              </Link>
            </li>
          ))}
        </ul>

        <div className="pages-header">PAGES</div>
        <ul className="nav flex-column">
          {pageItems.map((item) => (
            <li className="nav-item" key={item.id}>
              <Link to={`/${item.id}`} className="nav-link">
                <span className="nav-icon">{item.icon} {item.label}</span>
               
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="sidebar-footer">
        <ul className="nav flex-column">
          {bottomItems.map((item) => (
            <li className="nav-item" key={item.id}>
              <Link to={`/${item.id}`} className="nav-link">
                <span className="nav-icon">{item.icon} {item.label}</span>
              
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default Sidebar