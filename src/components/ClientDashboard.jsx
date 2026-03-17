import { useState, useEffect } from "react";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

export default function ClientDashboard({ user }) {
  const [salons, setSalons] = useState([]);
  const [masters, setMasters] = useState([]);
  const [services, setServices] = useState([]);
  const [myAppointments, setMyAppointments] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [filterType, setFilterType] = useState("barchasi");
  const [deleteModal, setDeleteModal] = useState({ show: false, appId: null });

  const [booking, setBooking] = useState({
    salonId: "",
    masterName: "",
    service: "",
    appointmentDate: "",
    price: 0,
    duration: 0,
  });

  const [loading, setLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState({ show: false, text: "", type: "" });

  const showAlert = (text, type = "success") => {
    setAlertMsg({ show: true, text, type });
    setTimeout(() => {
      setAlertMsg({ show: false, text: "", type: "" });
    }, 5000);
  };

  useEffect(() => {
    const unsubSalons = onSnapshot(collection(db, "salons"), (snapshot) => {
      setSalons(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    if (user?.uid) {
      const qMyApps = query(
        collection(db, "clients"),
        where("clientId", "==", user.uid),
      );
      const unsubMyApps = onSnapshot(qMyApps, (snapshot) => {
        let apps = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        apps.sort(
          (a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate),
        );
        setMyAppointments(apps);
      });
      return () => {
        unsubSalons();
        unsubMyApps();
      };
    }
    return () => unsubSalons();
  }, [user]);

  useEffect(() => {
    if (!booking.salonId) {
      setMasters([]);
      setServices([]);
      return;
    }

    const qMasters = query(
      collection(db, "masters"),
      where("salonId", "==", booking.salonId),
    );
    const qServices = query(
      collection(db, "services"),
      where("salonId", "==", booking.salonId),
    );

    const unsubMasters = onSnapshot(qMasters, (snap) => {
      setMasters(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    const unsubServices = onSnapshot(qServices, (snap) => {
      setServices(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubMasters();
      unsubServices();
    };
  }, [booking.salonId]);

  const filteredServices = services.filter(
    (s) => s.masterName === booking.masterName,
  );

  const handleSalonChange = (e) => {
    setBooking({
      ...booking,
      salonId: e.target.value,
      masterName: "",
      service: "",
      price: 0,
      duration: 0,
    });
  };

  const handleMasterChange = (e) => {
    setBooking({
      ...booking,
      masterName: e.target.value,
      service: "",
      price: 0,
      duration: 0,
    });
  };

  const handleServiceChange = (e) => {
    const selectedService = e.target.value;
    const serviceObj = services.find(
      (s) => s.name === selectedService && s.masterName === booking.masterName,
    );

    setBooking({
      ...booking,
      service: selectedService,
      price: serviceObj ? serviceObj.price : 0,
      duration: serviceObj ? serviceObj.duration : 0,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const qCheck = query(
        collection(db, "clients"),
        where("salonId", "==", booking.salonId),
        where("masterName", "==", booking.masterName),
      );

      const checkSnap = await getDocs(qCheck);
      let isConflict = false;

      const newAppTime = new Date(booking.appointmentDate).getTime();
      const newAppEndTime = newAppTime + booking.duration * 60000;

      checkSnap.forEach((docSnap) => {
        if (editingId && docSnap.id === editingId) return;

        const data = docSnap.data();
        if (data.status === "tugagan" || data.status === "bekor qilingan")
          return;

        const existTime = new Date(data.appointmentDate).getTime();
        const existEndTime = existTime + (data.duration || 0) * 60000;

        if (newAppTime < existEndTime && newAppEndTime > existTime) {
          isConflict = true;
        }
      });

      if (isConflict) {
        showAlert(
          "Kechirasiz! Bu vaqtda master band. Iltimos, boshqa vaqtni tanlang.",
          "danger",
        );
        setLoading(false);
        return;
      }

      if (editingId) {
        await updateDoc(doc(db, "clients", editingId), {
          salonId: booking.salonId,
          masterName: booking.masterName,
          service: booking.service,
          price: Number(booking.price),
          duration: Number(booking.duration),
          appointmentDate: booking.appointmentDate,
        });
        showAlert("Navbat muvaffaqiyatli yangilandi!", "success");
        setEditingId(null);
      } else {
        await addDoc(collection(db, "clients"), {
          clientId: user.uid,
          name: user.name || "Mijoz",
          phone: user.phone || "",
          salonId: booking.salonId,
          masterName: booking.masterName,
          service: booking.service,
          price: Number(booking.price),
          duration: Number(booking.duration),
          appointmentDate: booking.appointmentDate,
          status: "kelmoqda",
          createdAt: serverTimestamp(),
        });
        showAlert("Navbatga muvaffaqiyatli yozildingiz!", "success");
      }

      setBooking({
        ...booking,
        masterName: "",
        service: "",
        appointmentDate: "",
        price: 0,
        duration: 0,
      });
    } catch (err) {
      console.error("Yozilishda xatolik:", err);
      showAlert("Xatolik yuz berdi. Internetni tekshiring.", "danger");
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (app) => {
    setEditingId(app.id);
    setBooking({
      salonId: app.salonId,
      masterName: app.masterName,
      service: app.service,
      appointmentDate: app.appointmentDate,
      price: app.price,
      duration: app.duration,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelAppClick = (id) => {
    setDeleteModal({ show: true, appId: id });
  };

  const confirmDeleteApp = async () => {
    const id = deleteModal.appId;
    if (!id) return;

    try {
      await deleteDoc(doc(db, "clients", id));
      showAlert("Navbat bekor qilindi", "success");
      if (editingId === id) {
        setEditingId(null);
        setBooking({
          ...booking,
          masterName: "",
          service: "",
          appointmentDate: "",
          price: 0,
          duration: 0,
        });
      }
    } catch (error) {
      showAlert("Xatolik yuz berdi", "danger");
    } finally {
      setDeleteModal({ show: false, appId: null });
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    setBooking({
      ...booking,
      masterName: "",
      service: "",
      appointmentDate: "",
      price: 0,
      duration: 0,
    });
  };

  const qolganVaqt = (time, status) => {
    if (status === "tugagan") return "✅ Yakunlandi";
    if (status === "jarayonda") return "💄 Jarayonda";

    let farq = new Date(time) - new Date();
    if (farq <= 0) return "⌛ Vaqti bo'ldi";

    let mins = Math.floor(farq / 1000 / 60);
    let hrs = Math.floor(mins / 60);
    let days = Math.floor(hrs / 24);

    if (days > 0) return `${days} kun qoldi`;
    if (hrs > 0) return `${hrs} soat ${mins % 60} daq qoldi`;
    return `${mins} daqiqa qoldi`;
  };

  const getSalonDetails = (salonId) => {
    const salon = salons.find((s) => s.id === salonId);
    return (
      salon || {
        salonName: "Noma'lum salon",
        salonLocation: "Manzil kiritilmagan",
      }
    );
  };

  const isToday = (dateString) => {
    const today = new Date();
    const appDate = new Date(dateString);
    return (
      today.getDate() === appDate.getDate() &&
      today.getMonth() === appDate.getMonth() &&
      today.getFullYear() === appDate.getFullYear()
    );
  };

  const displayedAppointments = myAppointments.filter((app) => {
    if (filterType === "bugungi") {
      return isToday(app.appointmentDate);
    }
    return true;
  });

  return (
    <div className="container py-2 position-relative">
      {alertMsg.show && (
        <div
          className="position-fixed top-0 start-50 translate-middle-x mt-4"
          style={{
            transition: "0.3s",
            zIndex: 10000,
            width: "90%",
            maxWidth: "450px",
          }}
        >
          <div
            className="alert shadow-lg rounded-4 d-flex align-items-center px-4 py-3 border-0 text-white"
            style={{ backgroundColor: "#d63384" }}
          >
            <span className="fw-bold">{alertMsg.text}</span>
            <button
              type="button"
              className="btn-close btn-close-white ms-auto"
              onClick={() => setAlertMsg({ show: false, text: "", type: "" })}
            ></button>
          </div>
        </div>
      )}

      <div className="d-flex align-items-center mb-4 border-bottom pb-2">
        <div className="bg-pink-soft p-2 rounded-3 me-3">
          <i className="bi bi-calendar2-heart text-pink fs-3"></i>
        </div>
        <div>
          <h3 className="fw-bold text-dark-pink m-0">
            Xush kelibsiz, {user?.name}!
          </h3>
          <p className="text-muted m-0 small">
            O'zingizga qulay vaqtni band qiling
          </p>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-12 col-lg-5">
          <form
            onSubmit={handleSubmit}
            className={`card p-4 shadow-sm border-0 rounded-4 bg-white ${editingId ? "border border-pink shadow" : ""}`}
          >
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="fw-bold text-dark m-0">
                <i className="bi bi-pencil-square me-2 text-pink"></i>
                {editingId ? "Navbatni tahrirlash" : "Yangi navbat olish"}
              </h5>
              {editingId && (
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="btn btn-sm btn-outline-secondary rounded-pill"
                >
                  Bekor qilish
                </button>
              )}
            </div>

            <div className="mb-3">
              <div className="form-floating">
                <select
                  className="form-select custom-inputs"
                  id="salonSelect"
                  value={booking.salonId}
                  onChange={handleSalonChange}
                  required
                >
                  <option value="">Salonni tanlang</option>
                  {salons.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.salonName}
                    </option>
                  ))}
                </select>
                <label htmlFor="salonSelect">Salon</label>
              </div>
              {booking.salonId && (
                <div className="text-muted small mt-2 px-2 animate-fade-in">
                  <i className="bi bi-geo-alt-fill text-danger me-1"></i>
                  Manzil:{" "}
                  <span className="fw-medium text-dark">
                    {getSalonDetails(booking.salonId).salonLocation}
                  </span>
                </div>
              )}
            </div>

            <div className="form-floating mb-3">
              <select
                className="form-select custom-inputs"
                id="masterSelect"
                value={booking.masterName}
                onChange={handleMasterChange}
                required
                disabled={!booking.salonId}
              >
                <option value="">Masterni tanlang</option>
                {masters.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>
              <label htmlFor="masterSelect">Master</label>
            </div>

            <div className="form-floating mb-3">
              <select
                className="form-select custom-inputs"
                id="serviceSelect"
                value={booking.service}
                onChange={handleServiceChange}
                required
                disabled={!booking.masterName}
              >
                <option value="">Xizmatni tanlang</option>
                {filteredServices.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
              <label htmlFor="serviceSelect">Xizmat turi</label>
            </div>

            <div className="row g-2 mb-3">
              <div className="col-6">
                <div className="form-floating">
                  <input
                    type="text"
                    className="form-control custom-inputs bg-light"
                    id="priceOut"
                    value={
                      booking.price
                        ? `${booking.price.toLocaleString()} so'm`
                        : ""
                    }
                    readOnly
                  />
                  <label htmlFor="priceOut">Narxi</label>
                </div>
              </div>
              <div className="col-6">
                <div className="form-floating">
                  <input
                    type="text"
                    className="form-control custom-inputs bg-light"
                    id="durationOut"
                    value={booking.duration ? `${booking.duration} daqiqa` : ""}
                    readOnly
                  />
                  <label htmlFor="durationOut">Vaqti</label>
                </div>
              </div>
            </div>

            <div className="form-floating mb-4">
              <input
                type="datetime-local"
                className="form-control custom-inputs"
                id="dateSelect"
                value={booking.appointmentDate}
                onChange={(e) =>
                  setBooking({ ...booking, appointmentDate: e.target.value })
                }
                required
              />
              <label htmlFor="dateSelect">Kelish vaqti</label>
            </div>

            <button
              type="submit"
              className="btn btn-pink w-100 py-3 fw-bold rounded-4 shadow-sm"
              disabled={loading || !booking.service}
            >
              {loading
                ? "Kuting..."
                : editingId
                  ? "O'zgarishlarni saqlash"
                  : "Yozilish"}
            </button>
          </form>
        </div>

        <div className="col-12 col-lg-7">
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden h-100">
            <div className="p-3 p-md-4 bg-white border-bottom d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3">
              <h5 className="fw-bold m-0 d-flex align-items-center">
                <i className="bi bi-clock-history me-2 text-pink fs-4"></i>
                Mening navbatlarim
              </h5>

              <div className="d-flex align-items-center justify-content-between gap-3">
                <div className="bg-light rounded-pill p-1 border d-flex">
                  <button
                    className={`btn btn-sm rounded-pill border-0 px-3 transition-base ${
                      filterType === "barchasi"
                        ? "btn-pink text-white fw-bold shadow-sm"
                        : "text-muted bg-transparent"
                    }`}
                    onClick={() => setFilterType("barchasi")}
                  >
                    Barchasi
                  </button>
                  <button
                    className={`btn btn-sm rounded-pill border-0 px-3 transition-base ${
                      filterType === "bugungi"
                        ? "btn-pink text-white fw-bold shadow-sm"
                        : "text-muted bg-transparent"
                    }`}
                    onClick={() => setFilterType("bugungi")}
                  >
                    Bugungi
                  </button>
                </div>
                <span className="badge bg-pink-soft text-pink rounded-pill px-3 py-2">
                  Jami: {displayedAppointments.length} ta
                </span>
              </div>
            </div>

            <div
              className="card-body p-0"
              style={{ maxHeight: "500px", overflowY: "auto" }}
            >
              {displayedAppointments.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <i className="bi bi-calendar-x fs-1 mb-2"></i>
                  <p>
                    {filterType === "bugungi"
                      ? "Bugun uchun hech qanday navbat yo'q."
                      : "Hozircha hech qanday navbatga yozilmagansiz."}
                  </p>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {displayedAppointments.map((app) => {
                    const currentSalon = getSalonDetails(app.salonId);

                    return (
                      <div
                        key={app.id}
                        className={`list-group-item p-4 border-bottom hover-bg-light ${editingId === app.id ? "bg-pink-soft" : ""}`}
                      >
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div>
                            <h6 className="fw-bold mb-1 text-dark">
                              {app.service}
                            </h6>

                            <div className="text-dark fw-medium small mt-2">
                              <i className="bi bi-shop me-1 text-pink"></i>{" "}
                              {currentSalon.salonName}
                            </div>
                            <div className="text-muted small mt-1">
                              <i className="bi bi-geo-alt-fill me-1 text-danger"></i>{" "}
                              {currentSalon.salonLocation}
                            </div>
                          </div>

                          <div className="d-flex align-items-center gap-2">
                            <span
                              className={`badge rounded-pill ${
                                app.status === "kelmoqda"
                                  ? "bg-primary-soft text-primary border border-primary"
                                  : app.status === "jarayonda"
                                    ? "bg-pink-soft text-pink border border-pink"
                                    : "bg-success-soft text-success border border-success"
                              }`}
                            >
                              {app.status}
                            </span>

                            {app.status === "kelmoqda" && (
                              <div className="d-flex gap-1">
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
                                  onClick={() => handleCancelAppClick(app.id)}
                                  className="btn btn-sm btn-outline-danger d-flex align-items-center justify-content-center rounded-circle"
                                  style={{
                                    width: "32px",
                                    height: "32px",
                                    padding: 0,
                                  }}
                                  title="Bekor qilish"
                                >
                                  <i className="bi bi-trash"></i>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="row g-2 mt-3">
                          <div className="col-6 col-sm-4">
                            <div className="d-flex align-items-center">
                              <div className="bg-light rounded p-2 me-2">
                                <i className="bi bi-person-badge text-secondary"></i>
                              </div>
                              <div>
                                <small
                                  className="d-block text-muted"
                                  style={{ fontSize: "0.75rem" }}
                                >
                                  Master
                                </small>
                                <span className="fw-semibold text-dark small">
                                  {app.masterName}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="col-6 col-sm-4">
                            <div className="d-flex align-items-center">
                              <div className="bg-light rounded p-2 me-2">
                                <i className="bi bi-calendar-check text-secondary"></i>
                              </div>
                              <div>
                                <small
                                  className="d-block text-muted"
                                  style={{ fontSize: "0.75rem" }}
                                >
                                  Vaqt
                                </small>
                                <span className="fw-semibold text-dark small">
                                  {new Date(app.appointmentDate).toLocaleString(
                                    "uz-UZ",
                                    {
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    },
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="col-12 col-sm-4 mt-2 mt-sm-0">
                            <div className="d-flex align-items-center">
                              <div className="bg-pink-soft rounded p-2 me-2">
                                <i className="bi bi-hourglass-split text-pink"></i>
                              </div>
                              <div>
                                <small
                                  className="d-block text-pink fw-bold"
                                  style={{ fontSize: "0.75rem" }}
                                >
                                  Holat
                                </small>
                                <span className="fw-bold text-dark small">
                                  {qolganVaqt(app.appointmentDate, app.status)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
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
                  <h4 className="fw-bold text-dark">Navbatni bekor qilish</h4>
                  <p className="text-muted mt-2 small">
                    Haqiqatan ham bu navbatni bekor qilmoqchimisiz?
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
    </div>
  );
}
