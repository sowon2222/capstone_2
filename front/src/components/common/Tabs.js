// src/components/common/Tabs.js
import React from "react";

export function Tabs({ children, defaultValue, className = "" }) {
  return (
    <div className={`tabs ${className}`}>
      {children}
    </div>
  );
}

export function TabsList({ children, className = "" }) {
  return (
    <div className={`tabs-list ${className}`}>
      {children}
    </div>
  );
}

export function TabsTrigger({ children, value, className = "" }) {
  return (
    <button className={`tabs-trigger ${className}`} data-value={value}>
      {children}
    </button>
  );
}

export function TabsContent({ children, value, className = "" }) {
  return (
    <div className={`tabs-content ${className}`} data-value={value}>
      {children}
    </div>
  );
}