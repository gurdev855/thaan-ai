import React, { useContext, useState } from "react";
import { AppContext, type Page } from "../App";
import { Menu, X } from "lucide-react";

interface NavProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const NAV_ITEMS: { id: Page; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "grade", label: "Grade" },
  { id: "compare", label: "Before vs After" },
  { id: "verify", label: "Verify" },
];

export function Nav({ currentPage, onNavigate }: NavProps) {
  const { demoMode, setDemoMode } = useContext(AppContext);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "rgba(16, 44, 38, 0.92)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--forest-3)",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 24px",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <button
          onClick={() => onNavigate("home")}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: 0,
          }}
        >
          <span
            style={{
              fontFamily: "'Unbounded', sans-serif",
              fontWeight: 800,
              fontSize: 20,
              color: "var(--champagne)",
              letterSpacing: "-0.02em",
            }}
          >
            thaan
            <span style={{ color: "var(--pass)" }}>.ai</span>
          </span>
        </button>

        {/* Desktop nav */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 32,
          }}
          className="desktop-nav"
        >
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`nav-link ${currentPage === item.id ? "active" : ""}`}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: currentPage === item.id ? "var(--champagne)" : "var(--champagne-dim)",
              }}
            >
              {item.label}
            </button>
          ))}

          {/* Demo mode toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontFamily: "'Unbounded', sans-serif",
                fontSize: 10,
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: demoMode ? "var(--pass)" : "var(--champagne-dim)",
              }}
            >
              Demo
            </span>
            <button
              onClick={() => setDemoMode(!demoMode)}
              style={{
                width: 40,
                height: 22,
                borderRadius: 11,
                border: "none",
                background: demoMode ? "var(--pass)" : "var(--forest-3)",
                cursor: "pointer",
                position: "relative",
                transition: "background 0.2s",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 2,
                  left: demoMode ? 20 : 2,
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: demoMode ? "var(--forest)" : "var(--champagne-dim)",
                  transition: "left 0.2s",
                }}
              />
            </button>
          </div>

          <button
            className="btn-primary"
            style={{ padding: "10px 20px", fontSize: 11 }}
            onClick={() => onNavigate("grade")}
          >
            Grade Now
          </button>
        </div>

        {/* Mobile menu button */}
        <button
          style={{
            background: "none",
            border: "none",
            color: "var(--champagne)",
            cursor: "pointer",
            display: "none",
          }}
          className="mobile-menu-btn"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          style={{
            background: "var(--forest-2)",
            borderTop: "1px solid var(--forest-3)",
            padding: "16px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                setMenuOpen(false);
              }}
              className={`nav-link ${currentPage === item.id ? "active" : ""}`}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                color: currentPage === item.id ? "var(--champagne)" : "var(--champagne-dim)",
              }}
            >
              {item.label}
            </button>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.1em", color: demoMode ? "var(--pass)" : "var(--champagne-dim)" }}>
              Demo Mode
            </span>
            <button
              onClick={() => setDemoMode(!demoMode)}
              style={{ width: 40, height: 22, borderRadius: 11, border: "none", background: demoMode ? "var(--pass)" : "var(--forest-3)", cursor: "pointer", position: "relative", transition: "background 0.2s" }}
            >
              <span style={{ position: "absolute", top: 2, left: demoMode ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: demoMode ? "var(--forest)" : "var(--champagne-dim)", transition: "left 0.2s" }} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: block !important; }
        }
      `}</style>
    </nav>
  );
}
