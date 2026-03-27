import { useState, useEffect } from "react";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  addDoc,
  doc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import "./Services.css";

export default function Services({ user }) {
  const [servicesForm, setServicesForm] = useState({
    name: "",
    price: "",
    duration: "",
    masterName: "",
  });

  const [servicesTable, setServicesTable] = useState([]);
  const [masters, setMasters] = useState([]);
  const [filterMaster, setFilterMaster] = useState("all");

  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    if (!user || !user.salonId) return;

    const qServices = query(
      collection(db, "services"),
      where("salonId", "==", user.salonId),
    );
    const unsubServices = onSnapshot(qServices, (snapshot) => {
      const servicesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      servicesData.sort((a, b) => a.name.localeCompare(b.name));
      setServicesTable(servicesData);
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

  const visibleServices =
    filterMaster === "all"
      ? servicesTable
      : servicesTable.filter((s) => s.masterName === filterMaster);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditMode) {
        const serviceRef = doc(db, "services", editId);
        await updateDoc(serviceRef, {
          name: servicesForm.name,
          price: Number(servicesForm.price),
          duration: Number(servicesForm.duration),
          masterName: servicesForm.masterName,
        });
        setIsEditMode(false);
        setEditId(null);
      } else {
        await addDoc(collection(db, "services"), {
          name: servicesForm.name,
          price: Number(servicesForm.price),
          duration: Number(servicesForm.duration),
          masterName: servicesForm.masterName,
          salonId: user.salonId,
        });
      }
      setServicesForm({ name: "", price: "", duration: "", masterName: "" });
    } catch (err) {
      console.error("Xatolik:", err);
      alert("Xizmatni saqlashda xatolik yuz berdi");
    }
  };

  const deleteService = async (id) => {
    if (!window.confirm("Ushbu xizmat turini o'chirmoqchimisiz?")) return;

    try {
      await deleteDoc(doc(db, "services", id));
      if (editId === id) cancelEdit();
    } catch (err) {
      console.error("O'chirishda xatolik:", err);
      alert("Xizmatni o'chirishda xatolik");
    }
  };

  const openEdit = (service) => {
    setIsEditMode(true);
    setEditId(service.id);
    setServicesForm({
      name: service.name,
      price: String(service.price),
      duration: service.duration || "",
      masterName: service.masterName || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setIsEditMode(false);
    setEditId(null);
    setServicesForm({ name: "", price: "", duration: "", masterName: "" });
  };

  const formatPrice = (price) => Number(price).toLocaleString("uz-UZ");

  return (
    <div className="container-fluid py-3">
      <div className="row g-4 mb-4">
        <div className="col-12 col-lg-4">
          <div
            className={`card border-0 shadow-sm rounded-4 p-4  ${
              isEditMode ? "border-primary-subtle" : ""
            }`}
            style={{ top: "20px" }}
          >
            <h4
              className={`fw-bold mb-4 ${
                isEditMode ? "text-primary" : "text-dark-pink"
              }`}
            >
              <i
                className={`bi ${
                  isEditMode ? "bi-pencil-square" : "bi-plus-circle-fill"
                } me-2`}
              ></i>
              {isEditMode ? "Xizmatni Tahrirlash" : "Xizmat Qo'shish"}
            </h4>

            <form onSubmit={handleFormSubmit}>
              <div className="form-floating mb-3">
                <select
                  className="form-select custom-input"
                  id="floatingServiceMaster"
                  value={servicesForm.masterName}
                  onChange={(e) =>
                    setServicesForm({
                      ...servicesForm,
                      masterName: e.target.value,
                    })
                  }
                  required
                >
                  <option value="">Masterni tanlang</option>
                  {masters.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <label htmlFor="floatingServiceMaster">
                  Qaysi master uchun?
                </label>
              </div>

              <div className="form-floating mb-3">
                <input
                  type="text"
                  className="form-control custom-input"
                  id="floatingServiceName"
                  value={servicesForm.name}
                  onChange={(e) =>
                    setServicesForm({
                      ...servicesForm,
                      name: e.target.value,
                    })
                  }
                  placeholder="Xizmat turini kiriting"
                  required
                />
                <label htmlFor="floatingServiceName">Xizmat nomi</label>
              </div>

              <div className="form-floating mb-3">
                <input
                  type="number"
                  className="form-control custom-input"
                  id="floatingServicePrice"
                  value={servicesForm.price}
                  onChange={(e) =>
                    setServicesForm({
                      ...servicesForm,
                      price: e.target.value,
                    })
                  }
                  placeholder="Xizmat narxini kiriting"
                  required
                />
                <label htmlFor="floatingServicePrice">Xizmat narxi</label>
              </div>

              <div className="form-floating mb-4">
                <input
                  type="number"
                  className="form-control custom-input"
                  id="floatingDuration"
                  value={servicesForm.duration}
                  onChange={(e) =>
                    setServicesForm({
                      ...servicesForm,
                      duration: e.target.value,
                    })
                  }
                  placeholder="Davomiyligi (minut)"
                  required
                />
                <label htmlFor="floatingDuration">Davomiyligi (minut)</label>
              </div>

              <div className="d-grid gap-2">
                <button
                  type="submit"
                  className={`btn ${
                    isEditMode ? "btn-primary" : "btn-pink"
                  } py-2 fw-bold`}
                >
                  {isEditMode ? "O'zgarishlarni Saqlash" : "Ro'yxatga qo'shish"}
                </button>
                {isEditMode && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary py-2 fw-bold"
                    onClick={cancelEdit}
                  >
                    Bekor qilish
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        <div className="col-12 col-lg-8">
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden h-100">
            <div className="p-4 bg-white border-bottom d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
              <h4 className="fw-bold text-dark m-0">Mavjud Xizmatlar</h4>

              <div className="d-flex align-items-center gap-2 w-100 w-md-auto">
                <i className="bi bi-funnel text-pink fs-5"></i>
                <select
                  className="form-select bg-light border-0 shadow-sm"
                  value={filterMaster}
                  onChange={(e) => setFilterMaster(e.target.value)}
                >
                  <option value="all">Barcha masterlar</option>
                  {masters.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name}
                    </option>
                  ))}
                </select>

                <span className="badge bg-pink-soft text-pink rounded-pill px-3 py-2 ms-2 whitespace-nowrap">
                  Jami: {visibleServices.length}
                </span>
              </div>
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="bg-pink-soft">
                  <tr>
                    <th className="py-3 ps-4" style={{ width: "60px" }}>
                      #
                    </th>
                    <th className="py-3">Xizmat Nomi</th>
                    <th className="py-3">Master</th>
                    <th className="py-3">Narxi</th>
                    <th className="py-3">Vaqt</th>
                    <th className="py-3 text-center">Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleServices.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-5 text-muted">
                        Hozircha xizmatlar mavjud emas...
                      </td>
                    </tr>
                  ) : (
                    visibleServices.map((s, i) => (
                      <tr
                        key={s.id}
                        className={editId === s.id ? "table-light" : ""}
                      >
                        <td className="ps-4 fw-bold text-secondary">{i + 1}</td>
                        <td className="fw-bold text-dark">{s.name}</td>

                        <td>
                          <span className="badge bg-light text-primary border">
                            {s.masterName || "Umumiy"}
                          </span>
                        </td>

                        <td>
                          <span className="badge bg-light text-pink border px-3 py-2">
                            {formatPrice(s.price)} so'm
                          </span>
                        </td>
                        <td>
                          <span className="bg-light text-dark px-2 py-1 border badge">
                            {s.duration} min
                          </span>
                        </td>
                        <td className="text-center">
                          <button
                            className={`btn btn-sm border-0 me-2 ${
                              editId === s.id
                                ? "btn-primary"
                                : "btn-outline-primary"
                            }`}
                            onClick={() => openEdit(s)}
                            disabled={editId === s.id}
                          >
                            <i className="bi bi-pencil-square fs-5"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger border-0"
                            onClick={() => deleteService(s.id)}
                          >
                            <i className="bi bi-trash fs-5"></i>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
