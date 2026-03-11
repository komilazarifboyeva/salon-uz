import { Routes, Route, NavLink, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth, db } from "./firebase/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import AddClient from "./components/AddClient";
import ClientsTable from "./components/ClientsTable";
import Services from "./components/Services";
import Report from "./components/Report";
import Cabinet from "./components/Cabinet";
import Login from "./components/Login";
import Register from "./components/Register";
import Navbat from "./components/Navbat";
import ClientDashboard from "./components/ClientDashboard";
import MasterDashboard from "./components/MasterDashboard";
import MasterReport from "./components/MasterReport";
import MasterServices from "./components/MasterServices"; 
import ProtectedRoute from "./ProtectedRoute";

import "./App.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            setUser({
              uid: currentUser.uid,
              email: currentUser.email,
              ...userData,
            });
          } else {
            setUser(currentUser);
          }
        } catch (error) {
          console.error("Foydalanuvchi ma'lumotlarini olishda xatolik:", error);
          setUser(currentUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100 bg-soft-pink">
        <div className="spinner-border text-pink" role="status">
          <span className="visually-hidden">Yuklanmoqda...</span>
        </div>
      </div>
    );
  }

  const getNavLinkClass = ({ isActive }) =>
    isActive ? "custom-nav-link custom-active" : "custom-nav-link";

  const isAdmin = user?.role === "admin" || user?.role === "owner";
  const isClient = user?.role === "client";
  const isMaster = user?.role === "master";

  return (
    <div className="min-vh-100 bg-soft-pink app-wrapper">
      <nav className="custom-navbar bg-dark-pink d-flex justify-content-between align-items-center">
        <NavLink to="/" className="brand-logo">
          <i className="bi bi-gem me-2"></i> Women's Beauty Salon
        </NavLink>

        <div className="nav-menu">
          {user ? (
            <>
              <NavLink className={getNavLinkClass} to="/navbat">
                <i className="bi bi-clock"></i>{" "}
                <span className="nav-text">Navbat</span>
              </NavLink>

              {isAdmin && (
                <>
                  <NavLink className={getNavLinkClass} to="/clients">
                    <i className="bi bi-people"></i>{" "}
                    <span className="nav-text">Mijozlar</span>
                  </NavLink>
                  <NavLink className={getNavLinkClass} to="/services">
                    <i className="bi bi-scissors"></i>{" "}
                    <span className="nav-text">Xizmatlar</span>
                  </NavLink>
                  <NavLink className={getNavLinkClass} to="/report">
                    <i className="bi bi-bar-chart-line-fill"></i>{" "}
                    <span className="nav-text">Hisobot</span>
                  </NavLink>
                </>
              )}

              {isClient && (
                <NavLink className={getNavLinkClass} to="/" end>
                  <i className="bi bi-pencil-square"></i>{" "}
                  <span className="nav-text">Navbatga yozilish</span>
                </NavLink>
              )}

              {isMaster && (
                <>
                  <NavLink className={getNavLinkClass} to="/" end>
                    <i className="bi bi-scissors"></i>{" "}
                    <span className="nav-text">Mijozlar</span>
                  </NavLink>
                  <NavLink className={getNavLinkClass} to="/master-add-client">
                    <i className="bi bi-person-plus"></i>{" "}
                    <span className="nav-text">Mijoz qo'shish</span>
                  </NavLink>
                  <NavLink className={getNavLinkClass} to="/master-services">
                    <i className="bi bi-scissors"></i>{" "}
                    <span className="nav-text">Xizmatlar</span>
                  </NavLink>
                  <NavLink className={getNavLinkClass} to="/master-report">
                    <i className="bi bi-graph-up-arrow"></i>{" "}
                    <span className="nav-text">Hisobot</span>
                  </NavLink>
                </>
              )}

              <NavLink className={getNavLinkClass} to="/cabinet">
                <i className="bi bi-person-circle"></i>{" "}
                <span className="nav-text">Profil</span>
              </NavLink>
            </>
          ) : (
            <>
              <NavLink className={getNavLinkClass} to="/navbat">
                <i className="bi bi-clock-history"></i>{" "}
                <span className="nav-text">Navbat</span>
              </NavLink>
              <NavLink className={getNavLinkClass} to="/login">
                <i className="bi bi-file-person"></i>{" "}
                <span className="nav-text">Login</span>
              </NavLink>
              <NavLink className={getNavLinkClass} to="/register">
                <i className="bi bi-file-text"></i>{" "}
                <span className="nav-text">Register</span>
              </NavLink>
            </>
          )}
        </div>
      </nav>

      <main className="container pb-5 pt-4">
        <div className="row justify-content-center">
          <div className="col-12 col-lg-11 shadow-sm rounded-4 bg-white p-3 p-md-4">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/navbat" element={<Navbat user={user} />} />

              <Route element={<ProtectedRoute user={user} />}>
                <Route
                  path="/"
                  element={
                    isAdmin ? (
                      <AddClient user={user} />
                    ) : isClient ? (
                      <ClientDashboard user={user} />
                    ) : isMaster ? (
                      <MasterDashboard user={user} />
                    ) : null
                  }
                />

                {isAdmin ? (
                  <>
                    <Route
                      path="/clients"
                      element={<ClientsTable user={user} />}
                    />
                    <Route
                      path="/services"
                      element={<Services user={user} />}
                    />
                    <Route path="/report" element={<Report user={user} />} />
                  </>
                ) : (
                  <>
                    <Route
                      path="/clients"
                      element={<Navigate to="/" replace />}
                    />
                    <Route
                      path="/services"
                      element={<Navigate to="/" replace />}
                    />
                    <Route
                      path="/report"
                      element={<Navigate to="/" replace />}
                    />
                  </>
                )}

                {/* 🔥 Master hisoboti uchun yopiq yo'nalish */}
                <Route
                  path="/master-report"
                  element={
                    isMaster ? (
                      <MasterReport user={user} />
                    ) : (
                      <Navigate to="/" replace />
                    )
                  }
                />
                <Route
                  path="/master-services"
                  element={
                    isMaster ? (
                      <MasterServices user={user} />
                    ) : (
                      <Navigate to="/" replace />
                    )
                  }
                />
                <Route
                  path="/master-add-client"
                  element={
                    isMaster ? (
                      <AddClient user={user} />
                    ) : (
                      <Navigate to="/" replace />
                    )
                  }
                />

                <Route path="/cabinet" element={<Cabinet user={user} />} />
              </Route>
            </Routes>
          </div>
        </div>
      </main>
    </div>
  );
}
