import { useState, useEffect } from "react";
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

  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const bugun = getTodayString();

  useEffect(() => {
    if (!user || !user.salonId || !user.name) return;

    const q = query(
      collection(db, "clients"),
      where("salonId", "==", user.salonId),
      where("masterName", "==", user.name),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let apps = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      apps.sort(
        (a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate),
      );

      setAppointments(apps);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const updateStatus = async (id, newStatus) => {
    try {
      const clientRef = doc(db, "clients", id);
      await updateDoc(clientRef, { status: newStatus });
    } catch (error) {
      console.error("Holatni yangilashda xatolik:", error);
      alert("Xatolik yuz berdi!");
    }
  };

  const bugungiMijozlar = appointments.filter((a) => {
    if (!a.appointmentDate) return false;
    const dateStr =
      typeof a.appointmentDate === "string"
        ? a.appointmentDate.split("T")[0]
        : a.appointmentDate.toDate().toISOString().split("T")[0];
    return dateStr === bugun;
  });

  const tugatilganlar = bugungiMijozlar.filter(
    (a) => a.status === "tugagan",
  ).length;
  const bugungiDaromad = bugungiMijozlar
    .filter((a) => a.status === "tugagan")
    .reduce((sum, a) => sum + Number(a.price || 0), 0);

  if (loading) {
    return <div className="text-center py-5">Yuklanmoqda...</div>;
  }

  return (
    <div className="container py-3">
      <div className="d-flex align-items-center mb-4 border-bottom pb-2">
        <div className="bg-pink-soft p-2 rounded-3 me-3">
          <i className="bi bi-scissors text-pink fs-3"></i>
        </div>
        <div>
          <h3 className="fw-bold text-dark-pink m-0">
            Mijozlaringiz, {user.name}!
          </h3>
          <p className="text-muted m-0 small">
            Bugungi rejalaringiz va navbatlar
          </p>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-12 col-md-6">
          <div className="card border-0 shadow-sm rounded-4 p-3 d-flex flex-row align-items-center bg-white">
            <div className="bg-primary-soft p-3 rounded-4 me-3">
              <i className="bi bi-people-fill text-pink fs-3"></i>
            </div>
            <div>
              <p className="text-muted small fw-bold mb-0">
                BUGUNGI MIJOZLAR (Tugatildi)
              </p>
              <h4 className="fw-bold text-dark m-0">
                {tugatilganlar} / {bugungiMijozlar.length} ta
              </h4>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-6">
          <div className="card border-0 shadow-sm rounded-4 p-3 d-flex flex-row align-items-center bg-white">
            <div className="bg-success-soft p-3 rounded-4 me-3">
              <i className="bi bi-cash-stack text-success fs-3"></i>
            </div>
            <div>
              <p className="text-muted small fw-bold mb-0">BUGUNGI ISH HAQI</p>
              <h4 className="fw-bold text-success m-0">
                {bugungiDaromad.toLocaleString()} so'm
              </h4>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white">
        <div className="p-3 bg-pink-soft border-bottom">
          <h5 className="fw-bold text-dark-pink m-0">
            <i className="bi bi-list-check me-2"></i>Mijozlar ro'yxati
          </h5>
        </div>

        <div className="list-group list-group-flush">
          {appointments.length === 0 ? (
            <div className="text-center py-5 text-muted">
              Hozircha sizga yozilgan mijozlar yo'q.
            </div>
          ) : (
            appointments.map((app) => (
              <div key={app.id} className="list-group-item p-4 border-bottom">
                <div className="row align-items-center">
                  <div className="col-12 col-md-4 mb-2 mb-md-0">
                    <h5 className="fw-bold text-dark mb-1">{app.name}</h5>
                    <div className="text-muted small">
                      <i className="bi bi-telephone-fill me-1"></i> {app.phone}
                    </div>
                  </div>

                  <div className="col-12 col-md-4 mb-3 mb-md-0">
                    <div className="d-flex align-items-center">
                      <span className="badge bg-light text-dark border px-2 py-1 me-2">
                        {app.service}
                      </span>
                      <span className="badge bg-light text-danger border px-2 py-1">
                        <i className="bi bi-clock me-1"></i>
                        {new Date(app.appointmentDate).toLocaleTimeString(
                          "uz-UZ",
                          { hour: "2-digit", minute: "2-digit" },
                        )}
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
  );
}
