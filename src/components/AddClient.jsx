import { useState, useEffect } from "react";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import "./AddClient.css";

export default function AddClient({ user }) {
  const [client, setClient] = useState({
    name: "",
    phone: "",
    service: "",
    appointmentDate: "",
    status: "kelmoqda",
  });

  const [services, setServices] = useState([]);
  const [price, setPrice] = useState(0);
  const [duration, setDuration] = useState(0);

  const [alertInfo, setAlertInfo] = useState({
    show: false,
    type: "success",
    title: "",
    desc: "",
  });

  const customAlert = (type, title, desc) => {
    setAlertInfo({ show: true, type, title, desc });
    setTimeout(() => {
      setAlertInfo({ show: false, type: "success", title: "", desc: "" });
    }, 5000);
  };

  useEffect(() => {
    if (!user || !user.salonId || !user.name) return;

    const qServices = query(
      collection(db, "services"),
      where("salonId", "==", user.salonId),
      where("masterName", "==", user.name),
    );

    const unsubServices = onSnapshot(qServices, (snapshot) => {
      setServices(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubServices();
  }, [user]);

  const handleServiceChange = (e) => {
    const selectedServiceName = e.target.value;
    setClient({ ...client, service: selectedServiceName });

    const selectedServiceObj = services.find(
      (s) => s.name === selectedServiceName,
    );

    if (selectedServiceObj) {
      setPrice(selectedServiceObj.price);
      setDuration(selectedServiceObj.duration || 0);
    } else {
      setPrice(0);
      setDuration(0);
    }
  };

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      const qCheck = query(
        collection(db, "clients"),
        where("salonId", "==", user.salonId),
        where("masterName", "==", user.name),
      );

      const checkSnap = await getDocs(qCheck);
      let isConflict = false;

      const newAppTime = new Date(client.appointmentDate).getTime();
      const newAppEndTime = newAppTime + duration * 60000;

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
        customAlert(
          "error",
          "Kechirasiz,vaqt band!",
          "Bu vaqtda boshqa mijoz ro'yxatga olingan",
        );
        return;
      }

      await addDoc(collection(db, "clients"), {
        name: client.name,
        phone: client.phone,
        service: client.service,
        masterName: user.name,
        price: Number(price),
        duration: Number(duration),
        appointmentDate: client.appointmentDate,
        status: client.status,
        salonId: user.salonId,
        createdAt: serverTimestamp(),
      });

      customAlert("success", "Muvaffaqiyatli!", "Mijoz ro'yxatga qo'shildi 💕");

      setClient({
        name: "",
        phone: "",
        service: "",
        appointmentDate: "",
        status: "kelmoqda",
      });
      setPrice(0);
      setDuration(0);
    } catch (err) {
      console.error("Mijoz qo'shishda xatolik:", err);
      customAlert(
        "error",
        "Xatolik!",
        "Internet yoki serverda muammo yuz berdi",
      );
    }
  }

  return (
    <div className="container py-2 position-relative">
      {alertInfo.show && (
        <div
          className={`alert ${alertInfo.type === "success" ? "bg-pink" : "bg-danger"} text-white border-0 shadow-lg rounded-4 position-fixed top-0 start-50 translate-middle-x mt-4 d-flex align-items-center animate-shake`}
          style={{ zIndex: 9999, minWidth: "300px" }}
        >
          <div>
            <strong className="d-block">{alertInfo.title}</strong>
            <span className="small">{alertInfo.desc}</span>
          </div>
          <button
            type="button"
            className="btn-close btn-close-white ms-auto"
            onClick={() =>
              setAlertInfo({
                show: false,
                type: "success",
                title: "",
                desc: "",
              })
            }
          ></button>
        </div>
      )}

      <div className="d-flex align-items-center mb-4 border-bottom pb-2">
        <div className="bg-pink-soft p-2 rounded-3 me-3">
          <i className="bi bi-person-plus-fill text-pink fs-3"></i>
        </div>
        <div>
          <h3 className="fw-bold text-dark-pink m-0">Yangi mijoz qo'shish</h3>
          <p className="text-muted small m-0">
            O'zingiz uchun yangi qabul yozing
          </p>
        </div>
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
              <i className="bi bi-scissors fs-5"></i>
            </span>
            <div className="form-floating flex-grow-1">
              <select
                className="form-select custom-inputs text-dark rounded-end-4"
                id="floatingService"
                value={client.service}
                onChange={handleServiceChange}
                required
              >
                <option value="">Xizmatni tanlang</option>
                {services.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
              <label htmlFor="floatingService">Sizning xizmatlaringiz</label>
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
                readOnly
              />
              <label htmlFor="floatingDuration">Davomiyligi</label>
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

        <div className="col-12 mt-4">
          <button
            type="submit"
            className="btn btn-pink w-100 py-3 fw-bold shadow-sm rounded-4"
          >
            Mijozni ro'yxatga olish
          </button>
        </div>
      </form>
    </div>
  );
}
