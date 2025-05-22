import React, { useState } from "react";
import NetworkGraph from './components/concept/NetworkGraph';
import FreqTable from './components/concept/FreqTable';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import HomePage from "./pages/HomePage";
import ProblemSolving from "./pages/ProblemSolving";
import ArchivePage from "./pages/ArchivePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DocumentAnalysis from "./pages/DocumentAnalysis";
import WrongAnswerNote from "./components/problem-solving/WrongAnswerNote";
import AdditionalPractice from "./components/problem-solving/AdditionalPractice";
import { AuthProvider } from "./contexts/AuthContext";
import { AnalysisProvider } from "./contexts/AnalysisContext";

function App() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [freqTable, setFreqTable] = useState([]);
  const [mainTitle, setMainTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 파일 유효성 검사
    if (file.type !== "application/pdf") {
      setError("PDF 파일만 업로드 가능합니다.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB 제한
      setError("파일 크기는 10MB를 초과할 수 없습니다.");
      return;
    }

    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const res = await fetch("http://localhost:8000/analyze-pdf", {
        method: "POST",
        body: formData
      });
      if (!res.ok) throw new Error("서버 오류");
      const data = await res.json();
      setNodes(data.nodes);
      setEdges(data.edges);
      setFreqTable(data.freq_table);
      setMainTitle(data.main_title);
    } catch (err) {
      setError(err.message || "분석 중 오류가 발생했습니다.");
      setNodes([]);
      setEdges([]);
      setFreqTable([]);
      setMainTitle("");
    }
    setLoading(false);
  };

  return (
    <AuthProvider>
      <AnalysisProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/document-analysis" element={<DocumentAnalysis />} />
              <Route path="/problem-solving" element={<ProblemSolving />} />
              <Route path="/archive" element={<ArchivePage />} />
              <Route path="/wrong-answers" element={<WrongAnswerNote />} />
              <Route path="/additional-practice" element={<AdditionalPractice />} />
            </Route>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Routes>
        </BrowserRouter>
      </AnalysisProvider>
    </AuthProvider>
  );
}

export default App;