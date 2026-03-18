import { useState, useEffect, useRef } from "react";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

let audioCtx = null;

const unlockAudioSilently = () => {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 0;
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
  } catch (e) {
    console.error("Audio unlock error:", e);
  }
};

const playNotificationSound = () => {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    const playTone = (frequency, startTime, duration) => {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, startTime);

      gainNode.gain.setValueAtTime(0.3, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = audioCtx.currentTime;

    playTone(783.99, now, 0.4);
    playTone(1046.5, now + 0.15, 0.8);
  } catch (e) {
    console.error("Web Audio API ishlamadi:", e);
  }
};

export default function MasterDashboard({ user }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingApp, setEditingApp] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterType, setFilterType] = useState("bugungi");
  const [deleteModal, setDeleteModal] = useState({ show: false, appId: null });
  const [showAlert, setShowAlert] = useState(false);
  const [audioAllowed, setAudioAllowed] = useState(false);
  const isFirstLoad = useRef(true);
  const audioAllowedRef = useRef(false);

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

  const formatForInput = (dateInput) => {
    if (!dateInput) return "";
    const d = dateInput.seconds ? dateInput.toDate() : new Date(dateInput);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate(),
    )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const bugunStr = getTashkentDateString(new Date());

  useEffect(() => {
    const isAllowed = sessionStorage.getItem("audioPermission") === "true";
    if (isAllowed) {
      setAudioAllowed(true);
      audioAllowedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!user || !user.salonId || !user.name) return;

    const q = query(
      collection(db, "clients"),
      where("salonId", "==", user.salonId),
      where("masterName", "==", user.name),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (isFirstLoad.current) {
        isFirstLoad.current = false;
      } else {
        const hasNewClient = snapshot
          .docChanges()
          .some((change) => change.type === "added");

        if (hasNewClient && audioAllowedRef.current) {
          playNotificationSound();
          setShowAlert(true);

          setTimeout(() => {
            setShowAlert(false);
          }, 8000);
        }
      }

      let apps = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      apps.sort(
        (a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate),
      );

      setAppointments(apps);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleEnableAudio = () => {
    unlockAudioSilently();
    setAudioAllowed(true);
    audioAllowedRef.current = true;
    sessionStorage.setItem("audioPermission", "true");
  };

  const updateStatus = async (id, newStatus) => {
    try {
      const clientRef = doc(db, "clients", id);
      await updateDoc(clientRef, { status: newStatus });
    } catch (error) {
      console.error("Holatni yangilashda xatolik:", error);
      alert("Xatolik yuz berdi!");
    }
  };

  const saveEditApp = async () => {
    try {
      const clientRef = doc(db, "clients", editingApp.id);
      await updateDoc(clientRef, {
        name: editingApp.name,
        phone: editingApp.phone,
        service: editingApp.service,
        price: Number(editingApp.price),
        appointmentDate: editingApp.appointmentDate,
        status: editingApp.status,
      });
      setIsModalOpen(false);
      setEditingApp(null);
    } catch (error) {
      console.error("Yangilashda xatolik:", error);
      alert("Yangilashda xatolik yuz berdi!");
    }
  };

  const handleEditClick = (app) => {
    setEditingApp({
      ...app,
      appointmentDate: formatForInput(app.appointmentDate),
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id) => {
    setDeleteModal({ show: true, appId: id });
  };

  const confirmDeleteApp = async () => {
    const id = deleteModal.appId;
    if (!id) return;
    try {
      await deleteDoc(doc(db, "clients", id));
    } catch (error) {
      console.error("O'chirishda xatolik:", error);
      alert("O'chirishda xatolik yuz berdi!");
    } finally {
      setDeleteModal({ show: false, appId: null });
    }
  };

  const bugungiAppointments = appointments.filter((a) => {
    return getTashkentDateString(a.appointmentDate) === bugunStr;
  });

  const displayedAppointments =
    filterType === "bugungi" ? bugungiAppointments : appointments;

  const tugatilganlar = bugungiAppointments.filter(
    (a) => a.status === "tugagan",
  ).length;

  const bugungiDaromad = bugungiAppointments
    .filter((a) => a.status === "tugagan")
    .reduce((sum, a) => sum + Number(a.price || 0), 0);

  if (loading) {
    return (
      <div className="text-center py-5 text-pink">
        <div className="spinner-border"></div>
      </div>
    );
  }

  return (
    <>
      {isModalOpen && editingApp && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 9999999,
          }}
        >
          <div
            className="card border-0 shadow-lg rounded-4 p-4 animate-fade-in w-100"
            style={{ maxWidth: "500px", margin: "0 15px" }}
          >
            <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-2">
              <h5 className="fw-bold text-dark m-0">
                <i className="bi bi-pencil-square text-pink me-2"></i>
                Mijozni tahrirlash
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setIsModalOpen(false)}
              ></button>
            </div>

            <div className="row g-3">
              <div className="col-12 col-md-6">
                <div className="form-floating">
                  <input
                    type="text"
                    className="form-control custom-inputs"
                    id="editName"
                    value={editingApp.name}
                    onChange={(e) =>
                      setEditingApp({ ...editingApp, name: e.target.value })
                    }
                  />
                  <label htmlFor="editName">Ismi</label>
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="form-floating">
                  <input
                    type="text"
                    className="form-control custom-inputs"
                    id="editPhone"
                    value={editingApp.phone}
                    onChange={(e) =>
                      setEditingApp({ ...editingApp, phone: e.target.value })
                    }
                  />
                  <label htmlFor="editPhone">Telefon</label>
                </div>
              </div>
              <div className="col-12">
                <div className="form-floating">
                  <input
                    type="text"
                    className="form-control custom-inputs"
                    id="editService"
                    value={editingApp.service}
                    onChange={(e) =>
                      setEditingApp({ ...editingApp, service: e.target.value })
                    }
                  />
                  <label htmlFor="editService">Xizmat turi</label>
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="form-floating">
                  <input
                    type="number"
                    className="form-control custom-inputs"
                    id="editPrice"
                    value={editingApp.price}
                    onChange={(e) =>
                      setEditingApp({ ...editingApp, price: e.target.value })
                    }
                  />
                  <label htmlFor="editPrice">Narxi (so'm)</label>
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="form-floating">
                  <input
                    type="datetime-local"
                    className="form-control custom-inputs"
                    id="editDate"
                    value={editingApp.appointmentDate}
                    onChange={(e) =>
                      setEditingApp({
                        ...editingApp,
                        appointmentDate: e.target.value,
                      })
                    }
                  />
                  <label htmlFor="editDate">Kelish vaqti</label>
                </div>
              </div>

              <div className="col-12">
                <div className="form-floating">
                  <select
                    className="form-select custom-inputs"
                    id="editStatus"
                    value={editingApp.status}
                    onChange={(e) =>
                      setEditingApp({ ...editingApp, status: e.target.value })
                    }
                  >
                    <option value="kelmoqda">Kelmoqda</option>
                    <option value="jarayonda">Jarayonda</option>
                    <option value="tugagan">Tugagan</option>
                  </select>
                  <label htmlFor="editStatus">Mijoz holati</label>
                </div>
              </div>

              <div className="col-12 mt-4 d-flex gap-2">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-outline-secondary w-50 py-2 fw-bold rounded-4"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={saveEditApp}
                  className="btn btn-pink w-50 py-2 fw-bold shadow-sm rounded-4"
                >
                  Saqlash
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAlert && (
        <div
          className="alert bg-pink text-white border-0 shadow-lg rounded-4 position-fixed d-flex align-items-center"
          style={{
            top: "30px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 999999,
            minWidth: "340px",
            animation: "shake 0.5s ease-in-out",
          }}
          role="alert"
        >
          <div
            className="bg-white text-pink rounded-circle d-flex justify-content-center align-items-center me-3"
            style={{ width: "40px", height: "40px" }}
          >
            <i className="bi bi-bell-fill fs-5"></i>
          </div>
          <div className="flex-grow-1">
            <strong className="d-block mb-1 fs-6">Yangi buyurtma!</strong>
            <span className="small opacity-75">Sizga yangi mijoz yozildi.</span>
          </div>
          <button
            type="button"
            className="btn-close btn-close-white ms-3"
            onClick={() => setShowAlert(false)}
          ></button>
        </div>
      )}

      {!audioAllowed && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.7)",
            backdropFilter: "blur(10px)",
            zIndex: 9999998,
          }}
        >
          <div
            className="card border-0 shadow-lg rounded-4 p-4 text-center m-3 animate-fade-in"
            style={{ maxWidth: "420px", backgroundColor: "#fff" }}
          >
            <div
              className="bg-pink-soft rounded-circle d-inline-flex justify-content-center align-items-center mx-auto mb-4"
              style={{ width: "80px", height: "80px" }}
            >
              <i
                className="bi bi-bell-fill text-pink"
                style={{ fontSize: "2.5rem" }}
              ></i>
            </div>
            <h4 className="fw-bold text-dark-pink mb-3">
              Dashboardni faollashtiring
            </h4>
            <button
              onClick={handleEnableAudio}
              className="btn btn-pink w-100 py-3 fw-bold rounded-pill shadow-sm fs-6"
            >
              <i className="bi bi-check2-circle me-2 fs-5"></i>Dashboardni
              faollashtirish
            </button>
          </div>
        </div>
      )}

      <div className={!audioAllowed ? "opacity-25 pe-none" : "animate-fade-in"}>
        <div className="container py-3 position-relative">
          <div className="d-flex align-items-center mb-4 border-bottom pb-2">
            <div className="bg-pink-soft p-2 rounded-3 me-3">
              <i className="bi bi-scissors text-pink fs-3"></i>
            </div>
            <div>
              <h3 className="fw-bold text-dark-pink m-0">
                Mijozlaringiz, {user.name}!
              </h3>
              <p className="text-muted m-0 small">
                Bugungi ish rejangiz va daromadingiz
              </p>
            </div>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-12 col-md-6">
              <div className="card border-0 shadow-sm rounded-4 p-3 d-flex flex-row align-items-center bg-white h-100">
                <div className="bg-primary-soft p-3 rounded-4 me-3">
                  <i className="bi bi-people-fill text-pink fs-3"></i>
                </div>
                <div>
                  <p className="text-muted small fw-bold mb-0 text-uppercase">
                    BUGUNGI MIJOZLAR (Tugatildi)
                  </p>
                  <h4 className="fw-bold text-dark m-0">
                    {tugatilganlar} / {bugungiAppointments.length} ta
                  </h4>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-6">
              <div className="card border-0 shadow-sm rounded-4 p-3 d-flex flex-row align-items-center bg-white h-100">
                <div className="bg-success-soft p-3 rounded-4 me-3">
                  <i className="bi bi-cash-stack text-success fs-3"></i>
                </div>
                <div>
                  <p className="text-muted small fw-bold mb-0 text-uppercase">
                    BUGUNGI ISH HAQI
                  </p>
                  <h4 className="fw-bold text-success m-0">
                    {bugungiDaromad.toLocaleString()} so'm
                  </h4>
                </div>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white">
            <div className="p-3 bg-pink-soft border-bottom d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3">
              <h5 className="fw-bold text-dark-pink m-0 d-flex align-items-center">
                <i className="bi bi-list-check me-2"></i>
                {filterType === "bugungi"
                  ? "Bugungi mijozlar"
                  : "Barcha mijozlar"}
              </h5>

              <div className="d-flex align-items-center justify-content-between gap-3">
                <div className="bg-white rounded-pill p-1 border d-flex shadow-sm">
                  <button
                    className={`btn btn-sm rounded-pill border-0 px-3 ${
                      filterType === "barchasi"
                        ? "btn-pink  fw-bold shadow-sm"
                        : "text-muted bg-transparent"
                    }`}
                    onClick={() => setFilterType("barchasi")}
                  >
                    Barchasi
                  </button>
                  <button
                    className={`btn btn-sm rounded-pill border-0 px-3 ${
                      filterType === "bugungi"
                        ? "btn-pink text-white fw-bold shadow-sm"
                        : "text-muted bg-transparent"
                    }`}
                    onClick={() => setFilterType("bugungi")}
                  >
                    Bugungi
                  </button>
                </div>
              </div>
            </div>

            <div className="list-group list-group-flush">
              {displayedAppointments.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  {filterType === "bugungi"
                    ? "Bugun uchun rejalashtirilgan mijozlar yo'q."
                    : "Sizda hali mijozlar yo'q."}
                </div>
              ) : (
                displayedAppointments.map((app) => (
                  <div
                    key={app.id}
                    className="list-group-item p-4 border-bottom"
                  >
                    <div className="row align-items-center">
                      <div className="col-12 col-md-4 mb-2 mb-md-0">
                        <h5 className="fw-bold text-dark mb-1">{app.name}</h5>
                        <div className="text-muted small">
                          <i className="bi bi-telephone-fill me-1"></i>{" "}
                          {app.phone}
                        </div>
                      </div>

                      <div className="col-12 col-md-4 mb-3 mb-md-0">
                        <div className="d-flex align-items-center flex-wrap gap-2">
                          <span className="badge bg-light text-dark border px-2 py-1">
                            {app.service}
                          </span>
                          <span className="badge bg-light text-danger border px-2 py-1">
                            <i className="bi bi-calendar-event me-1"></i>
                            {new Intl.DateTimeFormat("uz-UZ", {
                              timeZone: "Asia/Tashkent",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }).format(new Date(app.appointmentDate))}
                          </span>
                        </div>
                      </div>

                      <div className="col-12 col-md-4 text-md-end d-flex flex-column align-items-md-end gap-2">
                        <div className="d-flex gap-2 justify-content-end mb-2 w-100">
                          <button
                            onClick={() => handleEditClick(app)}
                            className="btn btn-sm btn-outline-primary d-flex align-items-center justify-content-center rounded-circle"
                            style={{
                              width: "32px",
                              height: "32px",
                              padding: 0,
                            }}
                            title="Tahrirlash"
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            onClick={() => handleDeleteClick(app.id)}
                            className="btn btn-sm btn-outline-danger d-flex align-items-center justify-content-center rounded-circle"
                            style={{
                              width: "32px",
                              height: "32px",
                              padding: 0,
                            }}
                            title="O'chirish"
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>

                        <div className="w-100">
                          {app.status === "kelmoqda" && (
                            <button
                              onClick={() => updateStatus(app.id, "jarayonda")}
                              className="btn btn-primary fw-bold rounded-pill px-4 shadow-sm w-100"
                            >
                              Boshlash <i className="bi bi-play-fill"></i>
                            </button>
                          )}

                          {app.status === "jarayonda" && (
                            <button
                              onClick={() => updateStatus(app.id, "tugagan")}
                              className="btn btn-success fw-bold rounded-pill px-4 shadow-sm w-100"
                            >
                              Tugatish <i className="bi bi-check2-all"></i>
                            </button>
                          )}

                          {app.status === "tugagan" && (
                            <span className="badge bg-success-soft text-success px-4 py-2 rounded-pill border border-success w-100 d-inline-block">
                              Yakunlangan{" "}
                              <i className="bi bi-check-circle-fill ms-1"></i>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {deleteModal.show && (
        <>
          <div
            className="modal-backdrop fade show"
            style={{ zIndex: 1040, backgroundColor: "rgba(0,0,0,0.5)" }}
            onClick={() => setDeleteModal({ show: false, appId: null })}
          ></div>

          <div
            className="modal fade show d-block"
            tabIndex="-1"
            style={{ zIndex: 1050 }}
            aria-modal="true"
            role="dialog"
          >
            <div className="modal-dialog modal-dialog-centered px-3">
              <div className="modal-content border-0 shadow-lg rounded-4">
                <div className="modal-header border-bottom-0 pb-0">
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setDeleteModal({ show: false, appId: null })}
                  ></button>
                </div>
                <div className="modal-body text-center pb-4 px-4">
                  <div
                    className="d-inline-flex justify-content-center align-items-center bg-danger-subtle text-danger rounded-circle mb-3"
                    style={{ width: "60px", height: "60px" }}
                  >
                    <i className="bi bi-exclamation-triangle-fill fs-3"></i>
                  </div>
                  <h4 className="fw-bold text-dark">Mijozni o'chirish</h4>
                  <p className="text-muted mt-2 small">
                    Haqiqatan ham bu mijozni ro'yxatdan o'chirmoqchimisiz?
                  </p>
                  <div className="d-flex gap-3 mt-4">
                    <button
                      type="button"
                      className="btn btn-light w-50 fw-semibold rounded-pill py-2"
                      onClick={() =>
                        setDeleteModal({ show: false, appId: null })
                      }
                    >
                      Yo'q
                    </button>
                    <button
                      type="button"
                      className="btn btn-pink w-50 fw-bold rounded-pill shadow-sm py-2"
                      onClick={confirmDeleteApp}
                    >
                      Ha
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
