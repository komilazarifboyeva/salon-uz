import { useState, useEffect } from "react";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  getDocs,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import "./Report.css";

export default function Report({ user }) {
  const [allClients, setAllClients] = useState([]);
  const [masters, setMasters] = useState([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedMaster, setSelectedMaster] = useState("all");

  const getTashkentDateString = (dateInput) => {
    if (!dateInput) return "";
    const date = dateInput.seconds ? dateInput.toDate() : new Date(dateInput);
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tashkent",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  };

  const getTashkentDateTimeString = (dateInput) => {
    if (!dateInput) return "—";
    const date = dateInput.seconds ? dateInput.toDate() : new Date(dateInput);
    return new Intl.DateTimeFormat("uz-UZ", {
      timeZone: "Asia/Tashkent",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  };

  useEffect(() => {
    if (!user || !user.salonId) return;

    const fetchClients = async () => {
      try {
        const q = query(
          collection(db, "clients"),
          where("salonId", "==", user.salonId),
        );
        const querySnapshot = await getDocs(q);
        const clientsList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAllClients(clientsList);
      } catch (err) {
        console.error("Report fetch error:", err);
      }
    };

    fetchClients();

    const qMasters = query(
      collection(db, "masters"),
      where("salonId", "==", user.salonId),
    );
    const unsubMasters = onSnapshot(qMasters, (snapshot) => {
      setMasters(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubMasters();
    };
  }, [user]);

  const filteredClients =
    fromDate && toDate
      ? allClients.filter((c) => {
          if (!c.appointmentDate) return false;

          const clientDate = getTashkentDateString(c.appointmentDate);
          const dateMatch = clientDate >= fromDate && clientDate <= toDate;

          const masterMatch =
            selectedMaster === "all" || c.masterName === selectedMaster;

          return dateMatch && masterMatch;
        })
      : [];

  const totalClients = filteredClients.length;

  const completed = filteredClients.filter(
    (c) => c.status === "tugagan",
  ).length;

  const totalIncome = filteredClients
    .filter((c) => c.status === "tugagan")
    .reduce((sum, c) => sum + Number(c.price || 0), 0);

  const totalMinutes = filteredClients
    .filter((c) => c.status === "tugagan")
    .reduce((sum, c) => sum + Number(c.duration || 0), 0);

  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  return (
    <div className="container-fluid py-4">
      <div className="d-flex align-items-center mb-4">
        <div className="bg-pink-soft p-3 rounded-3 me-3">
          <i className="bi bi-graph-up-arrow text-pink fs-4"></i>
        </div>
        <h3 className="fw-bold m-0 text-dark">Hisobot</h3>
      </div>

      <div className="card border-0 shadow-sm rounded-4 p-4 mb-4">
        <div className="row g-3 align-items-end">
          <div className="col-12 col-md-3">
            <label className="small fw-bold text-secondary mb-2">DAN</label>
            <input
              type="date"
              className="form-control custom-input"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="col-12 col-md-3">
            <label className="small fw-bold text-secondary mb-2">GACHA</label>
            <input
              type="date"
              className="form-control custom-input"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>

          <div className="col-12 col-md-4">
            <label className="small fw-bold text-secondary mb-2">MASTER</label>
            <select
              className="form-select custom-input"
              value={selectedMaster}
              onChange={(e) => setSelectedMaster(e.target.value)}
            >
              <option value="all">Barcha masterlar</option>
              {masters.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-12 col-md-2">
            <button
              className="btn btn-pink w-100 py-2 fw-bold mb-1"
              onClick={() => {
                setFromDate("");
                setToDate("");
                setSelectedMaster("all");
              }}
            >
              Tozalash
            </button>
          </div>
        </div>
      </div>

      {filteredClients.length > 0 ? (
        <>
          <div className="row row-cols-2 row-cols-md-3 row-cols-lg-4 g-3 mb-4">
            <div className="col">
              <div className="card border-0 shadow-sm rounded-4 p-3 h-100 text-center">
                <h3 className="fw-bold text-primary mb-1">{totalClients}</h3>
                <span className="small text-muted fw-semibold uppercase">
                  Mijozlar
                </span>
              </div>
            </div>

            <div className="col">
              <div className="card border-0 shadow-sm rounded-4 p-3 h-100 text-center">
                <h3 className="fw-bold text-success mb-1">{completed}</h3>
                <span className="small text-muted fw-semibold uppercase">
                  Tugatilgan
                </span>
              </div>
            </div>

            <div className="col">
              <div className="card border-0 shadow-sm rounded-4 p-3 h-100 text-center bg-pink-soft">
                <h4 className="fw-bold text-pink mb-1">
                  {totalIncome.toLocaleString()}
                </h4>
                <span className="small text-pink fw-bold uppercase">
                  Jami Daromad
                </span>
              </div>
            </div>

            <div className="col">
              <div className="card border-0 shadow-sm rounded-4 p-3 h-100 text-center border-4 border-info">
                <h4 className="fw-bold text-info mb-1">
                  {totalHours} s {remainingMinutes} m
                </h4>
                <span className="small text-muted fw-semibold uppercase">
                  Jami ish vaqti
                </span>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
            <div className="p-4 bg-white border-bottom">
              <h5 className="fw-bold m-0">
                <i className="bi bi-list-check me-2 text-pink"></i>
                Ma'lumotlar
              </h5>
            </div>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="bg-light">
                  <tr>
                    <th className="py-3 ps-4">#</th>
                    <th className="py-3">Mijoz</th>
                    <th className="py-3">Master</th>
                    <th className="py-3">Xizmat</th>
                    <th className="py-3 text-center">Narxi</th>
                    <th className="py-3 text-center">Davomiyligi</th>
                    <th className="py-3 text-center">Vaqt</th>
                    <th className="py-3 text-center">Holati</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((c, i) => (
                    <tr key={c.id}>
                      <td className="ps-4 text-muted small">{i + 1}</td>
                      <td>
                        <div className="fw-bold">{c.name}</div>
                        <div className="small text-muted">{c.phone}</div>
                      </td>
                      <td>
                        <span className="badge bg-light text-primary border">
                          <i className="bi bi-person-badge me-1"></i>
                          {c.masterName || "Umumiy"}
                        </span>
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border">
                          {c.service}
                        </span>
                      </td>
                      <td className="text-center fw-bold text-secondary">
                        {Number(c.price).toLocaleString()} so'm
                      </td>
                      <td className="text-center fw-bold text-dark">
                        <span className="badge bg-light text-dark border">
                          <i className="bi bi-clock me-1"></i>
                          {c.duration ? `${c.duration} daqiqa` : "—"}
                        </span>
                      </td>
                      <td className="text-center">
                        <span className="badge bg-light text-dark border">
                          {getTashkentDateTimeString(c.appointmentDate)}
                        </span>
                      </td>
                      <td className="text-center">
                        <span
                          className={`badge rounded-pill ${
                            c.status === "tugagan"
                              ? "bg-success-light text-success"
                              : "bg-warning-light text-warning"
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        fromDate &&
        toDate && (
          <div className="text-center py-5 card border-0 shadow-sm rounded-4">
            <i className="bi bi-calendar-x fs-1 text-muted mb-3"></i>
            <h5 className="text-muted">
              Ushbu muddat oralig'ida ma'lumot topilmadi...
            </h5>
          </div>
        )
      )}
    </div>
  );
}
