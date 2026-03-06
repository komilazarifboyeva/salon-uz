import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/firebaseConfig";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import {
  signOut,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";

export default function Cabinet({ user }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [salonData, setSalonData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [passForm, setPassForm] = useState({
    currentPassword: "",
    newPassword: "",
  });

  const [masters, setMasters] = useState([]);
  const [masterForm, setMasterForm] = useState({
    name: "",
    phone: "",
    specialty: "",
  });
  const [isEditMaster, setIsEditMaster] = useState(false);
  const [editMasterId, setEditMasterId] = useState(null);

  const isAdmin = user?.role === "admin" || user?.role === "owner";
  const isClient = user?.role === "client";

  useEffect(() => {
    const fetchProfile = async () => {
      const currentUser = auth.currentUser;

      if (!currentUser || !user) {
        navigate("/login");
        return;
      }

      try {
        const docRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setProfile(docSnap.data());

        if (isAdmin && user.salonId) {
          const salonRef = doc(db, "salons", user.salonId);
          const salonSnap = await getDoc(salonRef);
          if (salonSnap.exists()) setSalonData(salonSnap.data());
        }
      } catch (err) {
        console.error("Profil yuklashda xatolik:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate, user, isAdmin]);

  useEffect(() => {

    if (!isAdmin || !user.salonId) return;

    const q = query(
      collection(db, "masters"),
      where("salonId", "==", user.salonId),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mastersList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      mastersList.sort((a, b) => a.name.localeCompare(b.name));
      setMasters(mastersList);
    });

    return () => unsubscribe();
  }, [user, isAdmin]);

  const handleMasterSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditMaster) {
        const masterRef = doc(db, "masters", editMasterId);
        await updateDoc(masterRef, {
          name: masterForm.name,
          phone: masterForm.phone,
          specialty: masterForm.specialty,
        });
        setIsEditMaster(false);
        setEditMasterId(null);
      } else {
        await addDoc(collection(db, "masters"), {
          name: masterForm.name,
          phone: masterForm.phone,
          specialty: masterForm.specialty,
          salonId: user.salonId,
        });
      }
      setMasterForm({ name: "", phone: "", specialty: "" });
    } catch (err) {
      console.error("Master qo'shishda xatolik:", err);
      alert("Xatolik yuz berdi");
    }
  };

  const deleteMaster = async (id) => {
    if (!window.confirm("Bu masterni rostdan ham o'chirmoqchimisiz?")) return;
    try {
      await deleteDoc(doc(db, "masters", id));
      if (editMasterId === id) cancelMasterEdit();
    } catch (err) {
      console.error("O'chirishda xatolik:", err);
    }
  };

  const editMaster = (master) => {
    setIsEditMaster(true);
    setEditMasterId(master.id);
    setMasterForm({
      name: master.name,
      phone: master.phone || "",
      specialty: master.specialty || "",
    });
  };

  const cancelMasterEdit = () => {
    setIsEditMaster(false);
    setEditMasterId(null);
    setMasterForm({ name: "", phone: "", specialty: "" });
  };

  const logout = async () => {
    try {
      await signOut(auth);
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Chiqishda xatolik:", error);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        passForm.currentPassword,
      );
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, passForm.newPassword);

      alert("Parol muvaffaqiyatli yangilandi! ✅");
      setPassForm({ currentPassword: "", newPassword: "" });
    } catch (err) {
      console.error("Parol o'zgartirishda xatolik:", err);
      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/wrong-password"
      ) {
        alert("Eski parol noto'g'ri kiritildi!");
      } else if (err.code === "auth/weak-password") {
        alert("Yangi parol juda oddiy. Kamida 6 ta belgi kiriting.");
      } else {
        alert("Xatolik: " + err.message);
      }
    }
  };

  if (loading) {
    return <div className="text-center py-5">Yuklanmoqda...</div>;
  }

  return (
    <div className="container-fluid py-3">
      <div className="d-flex align-items-center mb-4">
        <div className="bg-pink-soft p-3 rounded-3 me-3">
          <i className="bi bi-person-badge text-pink fs-4"></i>
        </div>
        <h3 className="fw-bold m-0 text-dark">Shaxsiy Profil</h3>
      </div>

      <div className="card border-0 shadow-sm rounded-4 p-4 mb-4">
        <h5 className="fw-bold mb-3 text-dark-pink">
          <i className="bi bi-info-circle me-2"></i>Profil ma'lumotlari
        </h5>

        <div className="row g-3">
          {isAdmin && (
            <div className="col-12 col-md-4">
              <div className="small text-muted fw-semibold">Salon nomi</div>
              <div className="fw-bold fs-5 text-dark">
                {salonData?.salonName || "Kiritilmagan"}
              </div>
            </div>
          )}

          <div className="col-12 col-md-4">
            <div className="small text-muted fw-semibold">
              {isAdmin ? "Salon egasi" : "Ism Familiya"}
            </div>
            <div className="fw-bold fs-5 text-dark">
              {isAdmin ? profile?.ownerName : profile?.name || "Kiritilmagan"}
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div className="small text-muted fw-semibold">Email</div>
            <div className="fw-bold fs-5 text-dark">
              {auth.currentUser?.email}
            </div>
          </div>

          {isAdmin && (
            <div className="col-12 mt-3 p-3 bg-light rounded-4 border border-danger">
              <div className="small text-muted fw-bold mb-1">
                MASTERLARNI ISHGA OLISH UCHUN SALON ID (Buni nusxalab masterga
                yuboring):
              </div>
              <div
                className="fw-bold fs-6 text-danger align-items-center"
                style={{ cursor: "pointer" }}
                onClick={() => {
                  navigator.clipboard.writeText(user.salonId);
                  alert("Salon ID nusxalandi!");
                }}
              >
                <span style={{ userSelect: "all" }}>{user.salonId}</span>
                <i className="bi bi-copy fs-4"></i>
              </div>
            </div>
          )}

          {isClient && profile?.phone && (
            <div className="col-12 col-md-4">
              <div className="small text-muted fw-semibold">Telefon</div>
              <div className="fw-bold fs-5 text-dark">{profile.phone}</div>
            </div>
          )}
        </div>
      </div>

      {isAdmin && (
        <div className="row g-4 mb-4">
          <div className="col-12 col-lg-4">
            <div
              className={`card border-0 shadow-sm rounded-4 p-4 ${isEditMaster ? "border-primary-subtle" : ""}`}
            >
              <h5
                className={`fw-bold mb-4 ${isEditMaster ? "text-primary" : "text-dark-pink"}`}
              >
                <i
                  className={`bi ${isEditMaster ? "bi-pencil-square" : "bi-person-plus-fill"} me-2`}
                ></i>
                {isEditMaster ? "Masterni Tahrirlash" : "Yangi Master Qo'shish"}
              </h5>

              <form onSubmit={handleMasterSubmit}>
                <div className="form-floating mb-3">
                  <input
                    type="text"
                    className="form-control custom-input"
                    id="masterName"
                    value={masterForm.name}
                    onChange={(e) =>
                      setMasterForm({ ...masterForm, name: e.target.value })
                    }
                    placeholder="Master ismi"
                    required
                  />
                  <label htmlFor="masterName">Master ismi</label>
                </div>

                <div className="form-floating mb-3">
                  <input
                    type="text"
                    className="form-control custom-input"
                    id="masterSpecialty"
                    value={masterForm.specialty}
                    onChange={(e) =>
                      setMasterForm({
                        ...masterForm,
                        specialty: e.target.value,
                      })
                    }
                    placeholder="Mutaxassisligi (Masalan: Stilist)"
                    required
                  />
                  <label htmlFor="masterSpecialty">Mutaxassisligi</label>
                </div>

                <div className="form-floating mb-4">
                  <input
                    type="tel"
                    className="form-control custom-input"
                    id="masterPhone"
                    value={masterForm.phone}
                    onChange={(e) =>
                      setMasterForm({ ...masterForm, phone: e.target.value })
                    }
                    placeholder="Telefon raqami"
                  />
                  <label htmlFor="masterPhone">Telefon raqami</label>
                </div>

                <div className="d-grid gap-2">
                  <button
                    type="submit"
                    className={`btn ${isEditMaster ? "btn-primary" : "btn-pink"} py-2 fw-bold`}
                  >
                    {isEditMaster
                      ? "O'zgarishlarni Saqlash"
                      : "Master qo'shish"}
                  </button>
                  {isEditMaster && (
                    <button
                      type="button"
                      className={`btn ${isEditMaster ? "btn-primary" : "btn-pink"} py-2 fw-bold`}
                      onClick={cancelMasterEdit}
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
              <div className="p-4 bg-white border-bottom d-flex justify-content-between align-items-center">
                <h5 className="fw-bold text-dark m-0">Mavjud Masterlar</h5>
                <span className="badge bg-pink-soft text-pink rounded-pill px-3">
                  Jami: {masters.length} ta
                </span>
              </div>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="bg-pink-soft text-dark-pink">
                    <tr>
                      <th className="py-3 ps-4" style={{ width: "60px" }}>
                        #
                      </th>
                      <th className="py-3">Master Ismi</th>
                      <th className="py-3">Mutaxassislik</th>
                      <th className="py-3">Telefon</th>
                      <th className="py-3 text-center">Amallar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {masters.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-5 text-muted">
                          Hozircha masterlar qo'shilmagan...
                        </td>
                      </tr>
                    ) : (
                      masters.map((m, index) => (
                        <tr
                          key={m.id}
                          className={editMasterId === m.id ? "table-light" : ""}
                        >
                          <td className="ps-4 fw-bold text-secondary">
                            {index + 1}
                          </td>
                          <td className="fw-bold text-dark">{m.name}</td>
                          <td>
                            <span className="badge bg-light text-secondary border px-2 py-1">
                              {m.specialty}
                            </span>
                          </td>
                          <td className="text-muted small">{m.phone || "—"}</td>
                          <td className="text-center">
                            <button
                              className={`btn btn-sm border-0 me-2 ${editMasterId === m.id ? "btn-primary" : "btn-outline-primary"}`}
                              onClick={() => editMaster(m)}
                              disabled={editMasterId === m.id}
                            >
                              <i className="bi bi-pencil-square fs-5"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger border-0"
                              onClick={() => deleteMaster(m.id)}
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
      )}


      <div className="card border-0 shadow-sm rounded-4 p-4 mb-4">
        <h5 className="fw-bold mb-3 text-dark-pink">
          <i className="bi bi-shield-lock me-2"></i>Parolni yangilash
        </h5>
        <form onSubmit={changePassword} className="row g-3">
          <div className="col-12 col-md-6">
            <label className="small fw-bold text-secondary">Eski parol</label>
            <input
              type="password"
              className="form-control custom-input"
              value={passForm.currentPassword}
              onChange={(e) =>
                setPassForm({ ...passForm, currentPassword: e.target.value })
              }
              required
              placeholder="Eski parolni kiriting"
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="small fw-bold text-secondary">Yangi parol</label>
            <input
              type="password"
              className="form-control custom-input"
              value={passForm.newPassword}
              onChange={(e) =>
                setPassForm({ ...passForm, newPassword: e.target.value })
              }
              required
              minLength={6}
              placeholder="Yangi parol (min 6 ta)"
            />
          </div>
          <div className="col-12">
            <button className="btn btn-pink w-100 py-2 fw-bold" type="submit">
              Parolni yangilash
            </button>
          </div>
        </form>
      </div>

      <div className="card border-0 shadow-sm rounded-4 p-4 mt-2">
        <button
          className="btn btn-outline-danger w-100 py-2 fw-bold"
          onClick={logout}
        >
          <i className="bi bi-box-arrow-right me-2"></i>Chiqish
        </button>
      </div>
    </div>
  );
}
