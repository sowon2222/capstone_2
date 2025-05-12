import React from "react";

export function ScrollArea({ children, className = "" }) {
  return (
    <div className={`overflow-auto ${className}`}>
      {children}
    </div>
  );
}

export function ScrollBar({ className = "" }) {
    return (
      <div className={`scrollbar ${className}`}>
        {/* ScrollBar 내용 */}
      </div>
    );
  }