import { useState, useEffect } from "react";
import { db } from "../firebase/firebaseConfig";
import { collection, onSnapshot, query, where } from "firebase/firestore";

export default function Navbat({ user }) {
  const [mijozlar, setMijozlar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hozirgiVaqt, setHozirgiVaqt] = useState(new Date());

  const [salons, setSalons] = useState([]);
  const [selectedSalonId, setSelectedSalonId] = useState("");

  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [tanlanganSana, setTanlanganSana] = useState(getTodayString());

  const oylar = [
    "Yanvar",
    "Fevral",
    "Mart",
    "Aprel",
    "May",
    "Iyun",
    "Iyul",
    "Avgust",
    "Sentyabr",
    "Oktyabr",
    "Noyabr",
    "Dekabr",
  ];

  const formatSana = (date) => {
    const kun = date.getDate();
    const oy = oylar[date.getMonth()];
    const yil = date.getFullYear();
    return `${kun}-${oy}, ${yil}`;
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setHozirgiVaqt(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getDisplayTime = (mijoz) => {
    const vaqtData = mijoz.appointmentDate;
    if (!vaqtData) return "--:--";
    if (vaqtData.seconds) {
      return vaqtData.toDate().toLocaleTimeString("uz-UZ", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }
    if (typeof vaqtData === "string") {
      if (vaqtData.includes("T") || vaqtData.includes(" ")) {
        const date = new Date(vaqtData);
        if (!isNaN(date)) {
          return date.toLocaleTimeString("uz-UZ", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });
        }
      }
      return vaqtData;
    }
    return "--:--";
  };

  useEffect(() => {
    if (
      user?.role === "admin" ||
      user?.role === "owner" ||
      user?.role === "master"
    ) {
      setSelectedSalonId(user.salonId);
    } else {
      const unsubSalons = onSnapshot(collection(db, "salons"), (snapshot) => {
        setSalons(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      });
      return () => unsubSalons();
    }
  }, [user]);

  useEffect(() => {
    if (!selectedSalonId) {
      setMijozlar([]);
      if (user?.role === "admin" || user?.role === "master") setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, "clients"),
      where("salonId", "==", selectedSalonId),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let users = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
        };
      });

      users = users.filter((u) => {
        const s = u.status ? u.status.toLowerCase().trim() : "";
        const statusMos = s === "kelmoqda" || s === "jarayonda";

        let sanaMos = false;
        if (u.appointmentDate) {
          let userDateString = "";
          if (u.appointmentDate.seconds) {
            const d = u.appointmentDate.toDate();
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            userDateString = `${year}-${month}-${day}`;
          } else if (typeof u.appointmentDate === "string") {
            userDateString = u.appointmentDate.split("T")[0];
          }
          sanaMos = userDateString === tanlanganSana;
        }
        return statusMos && sanaMos;
      });

      users.sort((a, b) => {
        const timeA = getDisplayTime(a);
        const timeB = getDisplayTime(b);
        return timeA.localeCompare(timeB);
      });

      const activeUsers = users.map((u, index) => ({
        ...u,
        tartib: index + 1,
      }));

      setMijozlar(activeUsers);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedSalonId, tanlanganSana]);

  const renderStatusBadge = (status) => {
    const s = status ? status.toLowerCase().trim() : "kelmoqda";
    if (s === "kelmoqda") {
      return (
        <span className="badge rounded-pill bg-primary px-3 py-2 shadow-sm">
          <i className="bi bi-hourglass-split me-1"></i> Kelmoqda
        </span>
      );
    } else if (s === "jarayonda") {
      return (
        <span className="badge rounded-pill bg-success px-3 py-2 shadow-sm">
          <i className="bi bi-scissors me-1"></i> Jarayonda
        </span>
      );
    } else {
      return <span className="badge bg-secondary">{status}</span>;
    }
  };

  if (loading && !salons.length && (!user || user.role === "client")) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ height: "300px" }}
      >
        <div className="spinner-border text-danger" role="status">
          <span className="visually-hidden">Yuklanmoqda...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      {(!user || user.role === "client") && (
        <div className="card border-0 shadow-sm rounded-4 p-3 p-md-4 mb-4 bg-white">
          <label
            className="fw-bold text-dark-pink mb-2"
            style={{ fontSize: "1.1rem" }}
          >
            <i className="bi bi-shop me-2"></i>Qaysi salonning navbatini
            ko'rmoqchisiz?
          </label>
          <select
            className="form-select form-select-lg custom-inputs bg-light text-dark"
            value={selectedSalonId}
            onChange={(e) => setSelectedSalonId(e.target.value)}
          >
            <option value="">Ro'yxatdan salonni tanlang...</option>
            {salons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.salonName}
              </option>
            ))}
          </select>

          {selectedSalonId && (
            <div className="text-muted small mt-3 px-2 animate-fade-in">
              <i className="bi bi-geo-alt-fill text-danger me-1"></i>
              Manzil:{" "}
              <span className="fw-medium text-dark">
                {salons.find((s) => s.id === selectedSalonId)?.salonLocation ||
                  "Kiritilmagan"}
              </span>
            </div>
          )}
        </div>
      )}

      {!selectedSalonId ? (
        <div className="text-center py-5 card border-0 shadow-sm rounded-4 mt-4 bg-white">
          <i
            className="bi bi-list-check text-muted mb-3"
            style={{ fontSize: "4rem" }}
          ></i>
          <h4 className="text-dark-pink fw-bold">
            Navbatni ko'rish uchun salonni tanlang
          </h4>
          <p className="text-muted small">
            Tanlagan saloningizdagi jonli navbat shu yerda chiqadi
          </p>
        </div>
      ) : (
        <>
          <div className="row mb-4 align-items-center bg-white p-3 rounded-4 shadow-sm mx-1">
            <div className="col-md-6 text-center text-md-start mb-2 mb-md-0">
              <h5
                className="text-muted text-uppercase mb-1"
                style={{ fontSize: "0.9rem", letterSpacing: "1px" }}
              >
                Bugungi sana:
              </h5>
              <h2 className="fw-bold text-dark m-0">
                <i className="bi bi-calendar-event me-2 text-danger"></i>
                {formatSana(hozirgiVaqt)}
              </h2>
            </div>
            <div className="col-md-6 text-center text-md-end">
              <div
                className="d-inline-block px-4 py-2 rounded-3"
                style={{
                  backgroundColor: "#fff0f6",
                  border: "1px solid #ffdeeb",
                }}
              >
                <h1
                  className="display-4 fw-bold m-0"
                  style={{ color: "#d63384", fontFamily: "monospace" }}
                >
                  {hozirgiVaqt.toLocaleTimeString("uz-UZ")}
                </h1>
              </div>
            </div>
          </div>

          <div className="card border-0 rounded-4 overflow-hidden">
            <div
              className="card-header text-white text-center py-4 position-relative"
              style={{ backgroundColor: "#d63384" }}
            >
              <h2 className="fw-bold m-0 text-uppercase letter-spacing-1">
                <i className="bi bi-stars me-2"></i> Bugungi Navbat
              </h2>

              <div className="mt-3 d-flex justify-content-center align-items-center">
                <input
                  type="date"
                  className="form-control text-center fw-bold shadow-sm"
                  style={{
                    maxWidth: "200px",
                    borderRadius: "30px",
                    border: "2px solid white",
                    color: "#d63384",
                  }}
                  value={tanlanganSana}
                  onChange={(e) => setTanlanganSana(e.target.value)}
                />
              </div>
            </div>

            <div className="card-body p-0">
              <div className="table-responsive">
                <table
                  className="table text-center align-middle mb-0"
                  style={{ fontSize: "1.2rem" }}
                >
                  <thead
                    style={{ backgroundColor: "#ffebf3", color: "#d63384" }}
                  >
                    <tr>
                      <th scope="col" className="py-3 border-0">
                        #
                      </th>
                      <th scope="col" className="py-3 border-0">
                        Vaqti
                      </th>
                      <th scope="col" className="py-3 border-0">
                        Mijoz Ismi
                      </th>
                      <th scope="col" className="py-3 border-0">
                        Master
                      </th>
                      <th scope="col" className="py-3 border-0">
                        Xizmat
                      </th>
                      <th scope="col" className="py-3 border-0">
                        Holati
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {mijozlar.length > 0 ? (
                      mijozlar.map((mijoz) => (
                        <tr
                          key={mijoz.id}
                          style={{ borderBottom: "1px solid #ffebf3" }}
                        >
                          <td className="fw-bold text-secondary fs-4">
                            {mijoz.tartib}
                          </td>
                          <td
                            className="fw-bold fs-3"
                            style={{ color: "#d63384" }}
                          >
                            {getDisplayTime(mijoz)}
                          </td>
                          <td className="fw-bold text-dark">{mijoz.name}</td>

                          <td>
                            <span
                              className="badge rounded-pill px-3 py-2 text-dark"
                              style={{
                                backgroundColor: "#e2e6ea",
                                fontWeight: "500",
                                fontSize: "1rem",
                              }}
                            >
                              <i className="bi bi-person-badge me-1"></i>
                              {mijoz.masterName || "Umumiy"}
                            </span>
                          </td>

                          <td style={{ color: "#ffebf3" }}>
                            <div className="d-flex flex-column align-items-center justify-content-center">
                              <span
                                className="badge rounded-pill px-3 py-2 mb-1"
                                style={{
                                  color: "white",
                                  backgroundColor: "#d63384c4",
                                  fontWeight: "500",
                                  fontSize: "1rem",
                                }}
                              >
                                {mijoz.service || "—"}
                              </span>

                              {mijoz.duration && (
                                <span
                                  className="text-muted"
                                  style={{
                                    fontSize: "0.85rem",
                                    fontWeight: "600",
                                  }}
                                >
                                  <i className="bi bi-clock me-1"></i>
                                  {mijoz.duration} min
                                </span>
                              )}
                            </div>
                          </td>

                          <td>{renderStatusBadge(mijoz.status)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="py-5 text-muted">
                          {tanlanganSana === getTodayString()
                            ? "Bugun navbatda hech kim yo'q 🌸"
                            : "Tanlangan sanada navbat yo'q 📅"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div
              className="card-footer text-center py-3"
              style={{ backgroundColor: "#fff0f6", color: "#d63384" }}
            >
              <small className="fw-semibold">
                Bizning xizmatimizdan foydalanganingiz uchun rahmat! ✨
              </small>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
