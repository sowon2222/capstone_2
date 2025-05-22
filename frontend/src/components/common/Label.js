// src/components/common/Label.js
import React from "react";

export function Label({ children, className = "" }) {
  return (
    <label className={`text-sm font-medium ${className}`}>
      {children}
    </label>
  );
}

