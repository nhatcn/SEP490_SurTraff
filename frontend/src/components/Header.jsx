import {  ChevronDown } from "lucide-react"
import "./Header.css"

function Header({ title }) {
  return (
    <div className="header">
      <div className="search-container position-relative">
       
      </div>

      <div className="user-profile">
        <div className="user-avatar">
          <img src="/placeholder.svg?height=40&width=40" alt="User" />
        </div>
        <div className="user-info">
          <div className="user-name">Moni Roy</div>
          <div className="user-role">Admin</div>
        </div>
        <ChevronDown size={16} className="dropdown-icon" />
      </div>
    </div>
  )
}

export default Header
