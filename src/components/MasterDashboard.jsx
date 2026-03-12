import { useState, useEffect, useRef } from "react";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
} from "firebase/firestore";

export default function MasterDashboard({ user }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAlert, setShowAlert] = useState(false);
  const [audioAllowed, setAudioAllowed] = useState(false);

  const isFirstLoad = useRef(true);

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

  const bugunStr = getTashkentDateString(new Date());

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
        if (hasNewClient && audioAllowed) {
          const audio = new Audio("/notification.mp3");
          audio
            .play()
            .catch((e) => console.log("Brauzer avtomatik ovozni to'sdi:", e));

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
    const audio = new Audio("/notification.mp3");
    audio
      .play()
      .then(() => {
        audio.pause();
        setAudioAllowed(true);

        localStorage.setItem("audioPermission", "true");
      })
      .catch((err) => {
        console.error("Ovoz faollashmadi:", err);
      });
  };

  useEffect(() => {
    if (localStorage.getItem("audioPermission") === "true") {
      setAudioAllowed(true);
    }
  }, []);

  const updateStatus = async (id, newStatus) => {
    try {
      const clientRef = doc(db, "clients", id);
      await updateDoc(clientRef, { status: newStatus });
    } catch (error) {
      console.error("Holatni yangilashda xatolik:", error);
      alert("Xatolik yuz berdi!");
    }
  };

  const bugungiAppointments = appointments.filter((a) => {
    return getTashkentDateString(a.appointmentDate) === bugunStr;
  });

  const tugatilganlar = bugungiAppointments.filter(
    (a) => a.status === "tugagan",
  ).length;

  const bugungiDaromad = bugungiAppointments
    .filter((a) => a.status === "tugagan")
    .reduce((sum, a) => sum + Number(a.price || 0), 0);

  if (loading) {
    return <div className="text-center py-5">Yuklanmoqda...</div>;
  }

  return (
    <div className="relative">
      {!audioAllowed && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-2xl text-center shadow-2xl max-w-md mx-4">
            <div className="text-5xl mb-4">🔔</div>
            <h2 className="text-xl font-bold mb-2">
              Bildirishnomalarni yoqing
            </h2>
            <p className="text-gray-600 mb-6">
              Yangi mijozlar haqida ovozli xabar olish uchun quyidagi tugmani
              bosing.
            </p>
            <button
              onClick={handleEnableAudio}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all"
            >
              Dashboardni faollashtirish
            </button>
          </div>
        </div>
      )}

      <div className={!audioAllowed ? "blur-md pointer-events-none" : ""}>
        <div className="container py-3 position-relative">
          {showAlert && (
            <div
              className="alert bg-pink-soft border border-pink text-dark-pink d-flex align-items-center shadow-sm rounded-4 position-sticky top-0 z-3 mb-4 transition-all"
              role="alert"
            >
              <i className="bi bi-bell-fill fs-4 me-3 text-pink animation-shake"></i>
              <div>
                <h5 className="alert-heading fw-bold mb-1">Yangi buyurtma!</h5>
                <p className="mb-0 small">
                  Sizga yangi mijoz yozildi. Ro'yxatni tekshiring.
                </p>
              </div>
              <button
                type="button"
                className="btn-close ms-auto"
                onClick={() => setShowAlert(false)}
                aria-label="Close"
              ></button>
            </div>
          )}

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
            <div className="p-3 bg-pink-soft border-bottom d-flex justify-content-between align-items-center">
              <h5 className="fw-bold text-dark-pink m-0">
                <i className="bi bi-list-check me-2"></i>Bugungi mijozlar
                ro'yxati
              </h5>
            </div>

            <div className="list-group list-group-flush">
              {bugungiAppointments.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  Bugun uchun rejalashtirilgan mijozlar yo'q.
                </div>
              ) : (
                bugungiAppointments.map((app) => (
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
                              hour: "2-digit",
                              minute: "2-digit",
                            }).format(new Date(app.appointmentDate))}
                          </span>
                        </div>
                      </div>

                      <div className="col-12 col-md-4 text-md-end">
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
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
