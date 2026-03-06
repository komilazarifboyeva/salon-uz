import { useState, useEffect } from "react";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
} from "firebase/firestore";
import "./AddClient.css";

export default function AddClient({ user }) {
  const [client, setClient] = useState({
    name: "",
    phone: "",
    service: "",
    masterName: "",
    appointmentDate: "",
    status: "kelmoqda",
  });

  const [services, setServices] = useState([]);
  const [masters, setMasters] = useState([]);
  const [price, setPrice] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!user || !user.salonId) return;

    const qServices = query(
      collection(db, "services"),
      where("salonId", "==", user.salonId),
    );
    const unsubServices = onSnapshot(qServices, (snapshot) => {
      setServices(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    const qMasters = query(
      collection(db, "masters"),
      where("salonId", "==", user.salonId),
    );
    const unsubMasters = onSnapshot(qMasters, (snapshot) => {
      setMasters(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubServices();
      unsubMasters();
    };
  }, [user]);

  const handleMasterChange = (e) => {
    const selectedMaster = e.target.value;
    setClient({
      ...client,
      masterName: selectedMaster,
      service: "", 
    });
    setPrice(0);
    setDuration(0);
  };

  const handleServiceChange = (e) => {
    const selectedServiceName = e.target.value;
    setClient({ ...client, service: selectedServiceName });

    const selectedServiceObj = services.find(
      (s) =>
        s.name === selectedServiceName && s.masterName === client.masterName,
    );

    if (selectedServiceObj) {
      setPrice(selectedServiceObj.price);
      setDuration(selectedServiceObj.duration || 0);
    } else {
      setPrice(0);
      setDuration(0);
    }
  };

  const filteredServices = services.filter(
    (s) => s.masterName === client.masterName,
  );

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      await addDoc(collection(db, "clients"), {
        name: client.name,
        phone: client.phone,
        service: client.service,
        masterName: client.masterName,
        price: Number(price),
        duration: Number(duration),
        appointmentDate: client.appointmentDate,
        status: client.status,
        salonId: user.salonId,
        createdAt: serverTimestamp(),
      });

      alert("Mijoz muvaffaqiyatli qo'shildi!💕");

      setClient({
        name: "",
        phone: "",
        service: "",
        masterName: "",
        appointmentDate: "",
        status: "kelmoqda",
      });
      setPrice(0);
      setDuration(0);
    } catch (err) {
      console.error("Mijoz qo'shishda xatolik:", err);
      alert("Xatolik yuz berdi! Internetni tekshiring.");
    }
  }

  return (
    <div className="container py-2">
      <div className="d-flex align-items-center mb-4 border-bottom pb-2">
        <div className="bg-pink-soft p-2 rounded-3 me-3">
          <i className="bi bi-person-plus-fill text-pink fs-3"></i>
        </div>
        <h3 className="fw-bold text-dark-pink m-0">Yangi mijoz qo'shish</h3>
      </div>

      <form onSubmit={handleSubmit} className="row g-3">
        <div className="col-md-6">
          <div className="input-group">
            <span className="input-group-text bg-light text-pink rounded-start-4">
              <i className="bi bi-person fs-5"></i>
            </span>
            <div className="form-floating flex-grow-1">
              <input
                type="text"
                className="form-control custom-inputs rounded-end-4"
                id="floatingName"
                value={client.name}
                onChange={(e) => setClient({ ...client, name: e.target.value })}
                required
                placeholder="Mijoz ismi"
              />
              <label htmlFor="floatingName">Mijoz ismi</label>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="input-group">
            <span className="input-group-text bg-light text-pink rounded-start-4">
              <i className="bi bi-telephone fs-5"></i>
            </span>
            <div className="form-floating flex-grow-1">
              <input
                type="tel"
                className="form-control custom-inputs rounded-end-4"
                id="floatingPhone"
                value={client.phone}
                onChange={(e) =>
                  setClient({ ...client, phone: e.target.value })
                }
                required
                placeholder="+998 90 123 45 67"
              />
              <label htmlFor="floatingPhone">Telefon raqami</label>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="input-group">
            <span className="input-group-text bg-light text-pink rounded-start-4">
              <i className="bi bi-person-badge fs-5"></i>
            </span>
            <div className="form-floating flex-grow-1">
              <select
                className="form-select custom-inputs text-dark rounded-end-4"
                id="floatingMaster"
                value={client.masterName}
                onChange={handleMasterChange}
                required
              >
                <option value="">Masterni tanlang</option>
                {masters.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>
              <label htmlFor="floatingMaster">Master (Usta)</label>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="input-group">
            <span className="input-group-text bg-light text-pink rounded-start-4">
              <i className="bi bi-scissors fs-5"></i>
            </span>
            <div className="form-floating flex-grow-1">
              <select
                className="form-select custom-inputs text-dark rounded-end-4"
                id="floatingService"
                value={client.service}
                onChange={handleServiceChange}
                required
                disabled={!client.masterName} 
              >
                {!client.masterName ? (
                  <option value="">Avval masterni tanlang</option>
                ) : (
                  <>
                    <option value="">Xizmatni tanlang</option>
                    {filteredServices.length > 0 ? (
                      filteredServices.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name}
                        </option>
                      ))
                    ) : (
                      <option disabled>Bu masterda xizmatlar yo'q</option>
                    )}
                  </>
                )}
              </select>
              <label htmlFor="floatingService">Xizmat turi</label>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="input-group">
            <span className="input-group-text bg-light text-pink rounded-start-4">
              <i className="bi bi-cash-stack fs-5"></i>
            </span>
            <div className="form-floating flex-grow-1">
              <input
                type="text"
                className="form-control custom-inputs bg-light rounded-end-4"
                id="floatingPrice"
                value={price ? `${Number(price).toLocaleString()} so'm` : ""}
                readOnly
                placeholder="Xizmat narxi"
              />
              <label htmlFor="floatingPrice">Xizmat narxi</label>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="input-group">
            <span className="input-group-text bg-light text-pink rounded-start-4">
              <i className="bi bi-clock"></i>
            </span>
            <div className="form-floating flex-grow-1">
              <input
                type="text"
                className="form-control custom-inputs text-dark bg-light rounded-end-4"
                id="floatingDuration"
                value={duration ? `${duration} daqiqa` : ""}
                placeholder="Xizmat davomiyligi"
                readOnly
                required
              ></input>
              <label htmlFor="floatingDuration">Xizmat davomiyligi</label>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="input-group">
            <span className="input-group-text bg-light text-pink rounded-start-4">
              <i className="bi bi-calendar-event fs-5"></i>
            </span>
            <div className="form-floating flex-grow-1">
              <input
                type="datetime-local"
                className="form-control custom-inputs rounded-end-4"
                id="floatingDate"
                value={client.appointmentDate}
                onChange={(e) =>
                  setClient({ ...client, appointmentDate: e.target.value })
                }
                required
              />
              <label htmlFor="floatingDate">Kelish vaqti</label>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="input-group">
            <span className="input-group-text bg-light text-pink rounded-start-4">
              <i className="bi bi-info-circle fs-5"></i>
            </span>
            <div className="form-floating flex-grow-1">
              <select
                className="form-select custom-inputs text-dark rounded-end-4"
                id="floatingStatus"
                value={client.status}
                onChange={(e) =>
                  setClient({ ...client, status: e.target.value })
                }
                required
              >
                <option value="kelmoqda">📅 kelmoqda</option>
                <option value="jarayonda">💇‍♀️ jarayonda</option>
                <option value="tugagan">✅ tugagan</option>
              </select>
              <label htmlFor="floatingStatus">Mijoz holati</label>
            </div>
          </div>
        </div>

        <div className="col-12 mt-4">
          <button
            type="submit"
            className="btn btn-pink w-100 py-3 fw-bold shadow-sm rounded-4"
          >
            Qo'shish
          </button>
        </div>
      </form>
    </div>
  );
}
