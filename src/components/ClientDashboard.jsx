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
} from "firebase/firestore";

export default function ClientDashboard({ user }) {
  const [salons, setSalons] = useState([]);
  const [masters, setMasters] = useState([]);
  const [services, setServices] = useState([]);
  const [myAppointments, setMyAppointments] = useState([]);

  const [booking, setBooking] = useState({
    salonId: "",
    masterName: "",
    service: "",
    appointmentDate: "",
    price: 0,
    duration: 0,
  });

  const [loading, setLoading] = useState(false);

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

      checkSnap.forEach((doc) => {
        const data = doc.data();
        if (data.status === "tugagan" || data.status === "bekor qilingan")
          return;

        const existTime = new Date(data.appointmentDate).getTime();
        const existEndTime = existTime + (data.duration || 0) * 60000;

        if (newAppTime < existEndTime && newAppEndTime > existTime) {
          isConflict = true;
        }
      });

      if (isConflict) {
        alert(
          "❌ Kechirasiz! Bu vaqtda master band. Iltimos, boshqa vaqtni tanlang.",
        );
        setLoading(false);
        return;
      }
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

      alert("Navbatga muvaffaqiyatli yozildingiz! 🎉");
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
      alert("Xatolik yuz berdi. Internetni tekshiring.");
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="container py-2">
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
            className="card p-4 shadow-sm border-0 rounded-4 bg-white"
          >
            <h5 className="fw-bold mb-4 text-dark">
              <i className="bi bi-pencil-square me-2 text-pink"></i>Yangi navbat
              olish
            </h5>

            <div className="form-floating mb-3">
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
              {loading ? "Band qilinmoqda..." : "Yozilish"}
            </button>
          </form>
        </div>

        <div className="col-12 col-lg-7">
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden h-100">
            <div className="p-4 bg-white border-bottom d-flex justify-content-between align-items-center">
              <h5 className="fw-bold m-0">
                <i className="bi bi-clock-history me-2 text-pink"></i>Mening
                navbatlarim
              </h5>
              <span className="badge bg-pink-soft text-pink rounded-pill px-3 py-2">
                Jami: {myAppointments.length} ta
              </span>
            </div>

            <div
              className="card-body p-0"
              style={{ maxHeight: "500px", overflowY: "auto" }}
            >
              {myAppointments.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <i className="bi bi-calendar-x fs-1 mb-2"></i>
                  <p>Hozircha hech qanday navbatga yozilmagansiz.</p>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {myAppointments.map((app) => (
                    <div
                      key={app.id}
                      className="list-group-item p-4 border-bottom hover-bg-light"
                    >
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <h6 className="fw-bold mb-1 text-dark">
                            {app.service}
                          </h6>
                          <div className="text-muted small">
                            <i className="bi bi-shop me-1 text-pink"></i> Salon
                            ID: {app.salonId.substring(0, 6)}...
                          </div>
                        </div>
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
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
