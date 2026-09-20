import React, { useEffect, useState } from "react";
import "./index.css";
import { Nav } from "./components/Nav";
import { LandingPage } from "./pages/LandingPage";
import { GradePage } from "./pages/GradePage";
import { ReportPage } from "./pages/ReportPage";
import { VerifyPage } from "./pages/VerifyPage";
import { BeforeAfterPage } from "./pages/BeforeAfterPage";
import { getHistory, type HistoryEntry } from "./utils/history";

export type Page = "home" | "grade" | "report" | "verify" | "compare";

function pageFromLocation(): Page {
  const path = window.location.pathname.replace(/\/$/, "");
  if (path === "/grade") return "grade";
  if (path === "/report") return "report";
  if (path === "/verify" || new URLSearchParams(window.location.search).has("cert")) return "verify";
  if (path === "/compare") return "compare";
  return "home";
}

export const AppContext = React.createContext<{
  navigate: (page: Page) => void;
  currentReport: HistoryEntry | null;
  setCurrentReport: (r: HistoryEntry | null) => void;
  demoMode: boolean;
  setDemoMode: (v: boolean) => void;
}>({
  navigate: () => {},
  currentReport: null,
  setCurrentReport: () => {},
  demoMode: false,
  setDemoMode: () => {},
});

export function App() {
  const [page, setPage] = useState<Page>(pageFromLocation);
  const [currentReport, setCurrentReport] = useState<HistoryEntry | null>(() => getHistory()[0] ?? null);
  const [demoMode, setDemoMode] = useState(false);

  const navigate = (p: Page) => {
    setPage(p);
    const paths: Record<Page, string> = {
      home: "/",
      grade: "/grade",
      report: "/report",
      verify: "/verify",
      compare: "/compare",
    };
    window.history.pushState({}, "", paths[p]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const handlePopState = () => setPage(pageFromLocation());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return (
    <AppContext.Provider
      value={{ navigate, currentReport, setCurrentReport, demoMode, setDemoMode }}
    >
      <Nav currentPage={page} onNavigate={navigate} />
      <main>
        {page === "home" && <LandingPage />}
        {page === "grade" && <GradePage />}
        {page === "report" && <ReportPage />}
        {page === "verify" && <VerifyPage />}
        {page === "compare" && <BeforeAfterPage />}
      </main>
    </AppContext.Provider>
  );
}

export default App;
