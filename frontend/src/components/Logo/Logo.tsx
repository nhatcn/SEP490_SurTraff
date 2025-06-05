import React from "react";
import logo from "../../asset/logo/screenshot_1749087176-removebg-preview.png"
interface LogoProps {
  height?: number;
  expanded?: boolean;
}

export default function Logo({ height = 42, expanded = true }: LogoProps) {
  return (
    <img
      src={logo}
      alt="Logo"
      style={{ height: expanded ? `${height}px` : "42px" }}
      className="object-contain"
    />
  );
}
