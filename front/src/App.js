import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import HomePage from "./pages/HomePage";
import ProblemPage from "./pages/ProblemPage";
import ArchivePage from "./pages/ArchivePage";
import CommunityPage from "./pages/CommunityPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import SlideSummary from "./pages/SlideSummary";
import ConceptMapPage from "./pages/ConceptMapPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/slide-summary" element={<SlideSummary />} />
          <Route path="/problems" element={<ProblemPage />} />
          <Route path="/concept-map" element={<ConceptMapPage />} />
          <Route path="/archive" element={<ArchivePage />} />
          <Route path="/community" element={<CommunityPage />} />
        </Route>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;