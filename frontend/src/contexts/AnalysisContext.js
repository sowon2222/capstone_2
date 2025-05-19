import { createContext, useContext, useState } from "react";

const AnalysisContext = createContext();

export function useAnalysis() {
  return useContext(AnalysisContext);
}

export function AnalysisProvider({ children }) {
  const [analysisResult, setAnalysisResult] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  return (
    <AnalysisContext.Provider value={{ analysisResult, setAnalysisResult, uploadedFile, setUploadedFile }}>
      {children}
    </AnalysisContext.Provider>
  );
} 