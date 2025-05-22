import React from "react";

export function Separator({ className = "" }) {
  return <div className={`h-px w-full bg-gray-300 ${className}`} />;
}
