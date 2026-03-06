import { useState, useEffect } from "react";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import "./ClientsTable.css";

export default function ClientsTable({ user }) {
  const [clients, setClients] = useState([]);
  const [masters, setMasters] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterType, setFilterType] = useState("all");

  const [editData, setEditData] = useState({
    id: "",
    name: "",
    phone: "",
    service: "",
    price: 0,
    duration: 0,
    masterName: "",
    appointmentDate: "",
    status: "",
  });

  // 🔥 Vaqtni formatlash funksiyasi (Sekundlarsiz va Toshkent vaqtida)
  const formatDateTime = (dateString) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
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

  const fetchClients = async () => {
    if (!user || !user.salonId) return;

    try {
      const q = query(
        collection(db, "clients"),
        where("salonId", "==", user.salonId),
      );

      const querySnapshot = await getDocs(q);

      const list = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      list.sort(
        (a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate),
      );

      setClients(list);
    } catch (err) {
      console.error("Mijozlarni olishda xatolik:", err);
    }
  };

  useEffect(() => {
    fetchClients();

    if (user && user.salonId) {
      const qMasters = query(
        collection(db, "masters"),
        where("salonId", "==", user.salonId),
      );
      const unsubMasters = onSnapshot(qMasters, (snapshot) => {
        setMasters(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsubMasters();
    }
  }, [user]);

  const today = new Date().toISOString().split("T")[0];
  const todaysClients = clients.filter(
    (c) => c.appointmentDate && c.appointmentDate.startsWith(today),
  );
  const visibleClients = filterType === "today" ? todaysClients : clients;

  function formatPrice(price) {
    return Number(price).toLocaleString("uz-UZ");
  }

  function qolganVaqt(time, status) {
    if (status === "tugagan") return "✅ yakunlandi";
    if (status === "jarayonda") return "💄 jarayonda...";

    let now = new Date();
    let target = new Date(time);
    let farq = target - now;

    if (farq <= 0) return "⌛ Vaqti bo'ldi";

    let mins = Math.floor(farq / 1000 / 60);
    let hrs = Math.floor(mins / 60);
    let days = Math.floor(hrs / 24);

    if (days > 0) return `${days} kun ${hrs % 24}soat`;
    if (hrs > 0) return `${hrs}soat ${mins % 60}min`;
    return `${mins}min qoldi`;
  }

  const deleteClient = async (id) => {
    if (!window.confirm("Mijozni rostdan ham o'chirmoqchimisiz?")) return;
    try {
      await deleteDoc(doc(db, "clients", id));
      fetchClients();
    } catch (err) {
      console.error("O'chirishda xatolik:", err);
      alert("Xatolik yuz berdi");
    }
  };

  const editClient = (client) => {
    setEditData({
      id: client.id,
      name: client.name,
      phone: client.phone,
      service: client.service,
      price: client.price,
      duration: client.duration || 0,
      masterName: client.masterName || "",
      appointmentDate: client.appointmentDate,
      status: client.status,
    });
    setIsModalOpen(true);
  };

  const saveChanges = async () => {
    try {
      const { id, ...payload } = editData;
      payload.duration = Number(payload.duration);

      const clientRef = doc(db, "clients", id);
      await updateDoc(clientRef, payload);
      fetchClients();
      setIsModalOpen(false);
    } catch (err) {
      console.error("Yangilashda xatolik:", err);
      alert("Tahrirlashda xatolik bo'ldi...");
    }
  };

  return (
    <div className="container-fluid py-2">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4 gap-3">
        <h3 className="fw-bold text-dark-pink m-0">
          <i className="bi bi-person-lines-fill me-2"></i>Mijozlar ro'yxati
        </h3>
        <div className="btn-group shadow-sm">
          <button
            className={`btn ${filterType === "all" ? "btn-pink" : "btn-outline-pink"}`}
            onClick={() => setFilterType("all")}
          >
            Barchasi
          </button>
          <button
            className={`btn ${filterType === "today" ? "btn-pink" : "btn-outline-pink"}`}
            onClick={() => setFilterType("today")}
          >
            Bugun
          </button>
        </div>
      </div>

      <div className="row g-3 mb-4 text-center">
        <div className="col-4">
          <div className="card border-0 shadow-sm bg-info-light">
            <div className="card-body p-2 p-md-3">
              <h2 className="fw-bold text-info mb-0">
                {visibleClients.filter((c) => c.status === "kelmoqda").length}
              </h2>
              <span className="small text-secondary fw-semibold">Kelmoqda</span>
            </div>
          </div>
        </div>
        <div className="col-4">
          <div className="card border-0 shadow-sm bg-pink-soft">
            <div className="card-body p-2 p-md-3">
              <h2 className="fw-bold text-pink mb-0">
                {visibleClients.filter((c) => c.status === "jarayonda").length}
              </h2>
              <span className="small text-secondary fw-semibold">
                Jarayonda
              </span>
            </div>
          </div>
        </div>
        <div className="col-4">
          <div className="card border-0 shadow-sm bg-success-light">
            <div className="card-body p-2 p-md-3">
              <h2 className="fw-bold text-success mb-0">
                {visibleClients.filter((c) => c.status === "tugagan").length}
              </h2>
              <span className="small text-secondary fw-semibold">Tugagan</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="bg-pink-soft">
              <tr>
                <th className="py-3 ps-3">#</th>
                <th className="py-3 ">Mijoz</th>
                <th className="py-3">Master</th>
                <th className="py-3">Xizmat</th>
                <th className="py-3">Narx</th>
                <th className="py-3">Davomiyligi</th>
                <th className="py-3">Vaqt</th>
                <th className="py-3">Holati</th>
                <th className="py-3 text-center">Amallar</th>
              </tr>
            </thead>

            <tbody>
              {visibleClients.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-5 text-muted">
                    Ma'lumot topilmadi...
                  </td>
                </tr>
              ) : (
                visibleClients.map((c, i) => (
                  <tr key={c.id}>
                    <td className="ps-3 fw-bold text-secondary">{i + 1}</td>
                    <td>
                      <div className="fw-bold text-dark">{c.name}</div>
                      <div className="small text-muted">{c.phone}</div>
                    </td>
                    <td>
                      <span className="badge bg-light text-primary border px-2 py-1">
                        <i className="bi bi-person-badge me-1"></i>
                        {c.masterName || "Umumiy"}
                      </span>
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border">
                        {c.service}
                      </span>
                    </td>
                    <td className="fw-semibold text-secondary">
                      {`${formatPrice(c.price)} so'm`}
                    </td>
                    <td className="fw-semibold text-dark">
                      {c.duration ? `${c.duration} daqiqa` : "—"}
                    </td>
                    <td>
                      {/* 🔥 Vaqtni shu yerda o'zgartirdik */}
                      <div className="small fw-medium">
                        {formatDateTime(c.appointmentDate)}
                      </div>
                      <div
                        className="badge bg-soft-pink text-pink p-1 mt-1"
                        style={{ fontSize: "10px" }}
                      >
                        <i className="bi bi-clock me-1"></i>
                        {qolganVaqt(c.appointmentDate, c.status)}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`badge-status ${
                          c.status === "kelmoqda"
                            ? "status-blue"
                            : c.status === "jarayonda"
                              ? "status-pink"
                              : "status-green"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="text-center">
                      <button
                        className="btn btn-sm btn-outline-primary me-1 border-0"
                        onClick={() => editClient(c)}
                      >
                        <i className="bi bi-pencil-square"></i>
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger border-0"
                        onClick={() => deleteClient(c.id)}
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="custom-modal-overlay">
          <div
            className="custom-modal-content shadow-lg p-4"
            style={{ maxHeight: "90vh", overflowY: "auto" }}
          >
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold text-dark-pink m-0">Tahrirlash</h5>
              <button
                className="btn-close"
                onClick={() => setIsModalOpen(false)}
              ></button>
            </div>
            <div className="row g-3">
              <div className="col-12">
                <label className="small fw-bold text-secondary">
                  Mijoz ismi
                </label>
                <input
                  type="text"
                  className="form-control custom-input"
                  value={editData.name}
                  onChange={(e) =>
                    setEditData({ ...editData, name: e.target.value })
                  }
                />
              </div>
              <div className="col-12">
                <label className="small fw-bold text-secondary">TELEFON</label>
                <input
                  type="text"
                  className="form-control custom-input"
                  value={editData.phone}
                  onChange={(e) =>
                    setEditData({ ...editData, phone: e.target.value })
                  }
                />
              </div>

              <div className="col-12">
                <label className="small fw-bold text-secondary">MASTER</label>
                <select
                  className="form-select custom-input"
                  value={editData.masterName}
                  onChange={(e) =>
                    setEditData({ ...editData, masterName: e.target.value })
                  }
                >
                  <option value="">Umumiy zal</option>
                  {masters.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-12">
                <label className="small fw-bold text-secondary">
                  DAVOMIYLIGI (MINUT)
                </label>
                <input
                  type="number"
                  className="form-control custom-input"
                  value={editData.duration}
                  onChange={(e) =>
                    setEditData({ ...editData, duration: e.target.value })
                  }
                />
              </div>

              <div className="col-6">
                <label className="small fw-bold text-secondary">VAQT</label>
                <input
                  type="datetime-local"
                  className="form-control custom-input"
                  value={editData.appointmentDate}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      appointmentDate: e.target.value,
                    })
                  }
                />
              </div>
              <div className="col-6">
                <label className="small fw-bold text-secondary">HOLATI</label>
                <select
                  className="form-select custom-input"
                  value={editData.status}
                  onChange={(e) =>
                    setEditData({ ...editData, status: e.target.value })
                  }
                >
                  <option value="kelmoqda">kelmoqda</option>
                  <option value="jarayonda">jarayonda</option>
                  <option value="tugagan">tugagan</option>
                </select>
              </div>
              <div className="col-12">
                <button
                  className="btn btn-pink w-100 py-2 mt-2"
                  onClick={saveChanges}
                >
                  O'zgarishlarni saqlash
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
