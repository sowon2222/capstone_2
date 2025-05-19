// src/components/common/Radio-group.js
import React from "react";

export function RadioGroup({ children, className = "" }) {
  return (
    <div className={`radio-group ${className}`}>
      {children}
    </div>
  );
}

export function RadioGroupItem({ children, value, className = "" }) {
  return (
    <div className={`radio-group-item ${className}`} data-value={value}>
      {children}
    </div>
  );
}