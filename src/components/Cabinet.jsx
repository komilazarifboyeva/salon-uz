import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
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

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    specialty: "",
    salonLocation: "",
  });
  const [passForm, setPassForm] = useState({
    currentPassword: "",
    newPassword: "",
  });

  const isAdmin = user?.role === "admin" || user?.role === "owner";
  const isMaster = user?.role === "master";

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
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfile(data);
          setEditForm({
            name: data.name || data.ownerName || "",
            phone: data.phone || "",
            specialty: data.specialty || "",
            salonLocation: data.salonLocation || "",
          });
        }
        if (isAdmin && user.salonId) {
          const salonRef = doc(db, "salons", user.salonId);
          const salonSnap = await getDoc(salonRef);
          if (salonSnap.exists()) {
            const sData = salonSnap.data();
            setSalonData(sData);
            setEditForm((prev) => ({
              ...prev,
              salonLocation: sData.salonLocation || prev.salonLocation,
            }));
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [navigate, user, isAdmin]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      const updateData = {
        name: editForm.name,
        phone: editForm.phone,
      };

      if (isAdmin) {
        updateData.ownerName = editForm.name;
        updateData.salonLocation = editForm.salonLocation;

        if (user.salonId) {
          const salonRef = doc(db, "salons", user.salonId);
          await updateDoc(salonRef, { salonLocation: editForm.salonLocation });
          setSalonData((prev) => ({
            ...prev,
            salonLocation: editForm.salonLocation,
          }));
        }
      }

      if (isMaster) {
        updateData.specialty = editForm.specialty;
        await updateDoc(doc(db, "masters", auth.currentUser.uid), updateData);
      }

      await updateDoc(userRef, updateData);
      setProfile({ ...profile, ...updateData });
      setIsEditing(false);
      alert("Ma'lumotlar yangilandi!");
    } catch (err) {
      alert("Xatolik: " + err.message);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    const currentUser = auth.currentUser;
    try {
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        passForm.currentPassword,
      );
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, passForm.newPassword);
      alert("Parol muvaffaqiyatli yangilandi!");
      setPassForm({ currentPassword: "", newPassword: "" });
    } catch (err) {
      alert("Eski parol noto'g'ri yoki xatolik yuz berdi.");
    }
  };

  const logout = async () => {
    await signOut(auth);
    navigate("/login", { replace: true });
  };

  if (loading)
    return (
      <div className="text-center py-5 text-pink">
        <div className="spinner-border"></div>
      </div>
    );

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center mb-4">
        <div className="bg-pink-soft p-3 rounded-4 me-3 shadow-sm">
          <i className="bi bi-person-vcard text-pink fs-4"></i>
        </div>
        <h3 className="fw-bold m-0 text-dark">Profil Sozlamalari</h3>
      </div>

      <div className="row g-4">
        <div className="col-12 col-lg-7">
          <div className="card border-0 shadow-sm rounded-4 p-4 h-100 bg-white">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="fw-bold m-0 text-dark-pink">
                <i className="bi bi-person-lines-fill me-2"></i>Ma'lumotlarni
                o'zgartirish
              </h5>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn btn-pink-soft text-white fw-bold rounded-pill px-3 shadow-sm border-pink-soft"
                >
                  <i className="bi bi-pencil-square me-1"></i>
                </button>
              ) : (
                <button
                  onClick={() => setIsEditing(false)}
                  className="btn btn-pink fw-bold rounded-pill px-3 shadow-sm"
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              )}
            </div>

            <form onSubmit={handleUpdateProfile}>
              <div className="form-floating mb-3">
                <input
                  type="text"
                  className={`form-control border-0 ${isEditing ? "bg-light" : "bg-white text-muted"}`}
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  disabled={!isEditing}
                  required
                />
                <label>To'liq ism</label>
              </div>

              <div className="form-floating mb-3">
                <input
                  type="tel"
                  className={`form-control border-0 ${isEditing ? "bg-light" : "bg-white text-muted"}`}
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm({ ...editForm, phone: e.target.value })
                  }
                  disabled={!isEditing}
                  required
                />
                <label>Telefon raqam</label>
              </div>

              {isAdmin && (
                <div className="form-floating mb-3">
                  <input
                    type="text"
                    className={`form-control border-0 ${isEditing ? "bg-light" : "bg-white text-muted"}`}
                    value={editForm.salonLocation}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        salonLocation: e.target.value,
                      })
                    }
                    disabled={!isEditing}
                    required
                  />
                  <label>Salon manzili</label>
                </div>
              )}

              {isMaster && (
                <div className="form-floating mb-3">
                  <input
                    type="text"
                    className={`form-control border-0 ${isEditing ? "bg-light" : "bg-white text-muted"}`}
                    value={editForm.specialty}
                    onChange={(e) =>
                      setEditForm({ ...editForm, specialty: e.target.value })
                    }
                    disabled={!isEditing}
                    required
                  />
                  <label>Mutaxassislik</label>
                </div>
              )}

              <div className="form-floating mb-4">
                <input
                  type="email"
                  className="form-control border-0 bg-white text-muted"
                  value={auth.currentUser?.email}
                  disabled
                />
                <label>Email (O'zgartirib bo'lmaydi)</label>
              </div>

              {isEditing && (
                <button
                  className="btn btn-pink w-100 py-3 fw-bold rounded-4 shadow-sm animate-fade-in"
                  type="submit"
                >
                  O'zgarishlarni saqlash
                </button>
              )}
            </form>
          </div>
        </div>

        <div className="col-12 col-lg-5">
          <div className="card border-0 shadow-sm rounded-4 p-4 h-100 bg-white">
            <h5 className="fw-bold mb-4 text-dark-pink border-bottom pb-3">
              <i className="bi bi-shield-lock-fill me-2"></i>Xavfsizlik
            </h5>
            <form onSubmit={changePassword}>
              <div className="form-floating mb-3">
                <input
                  type="password"
                  className="form-control bg-light border-0"
                  value={passForm.currentPassword}
                  onChange={(e) =>
                    setPassForm({
                      ...passForm,
                      currentPassword: e.target.value,
                    })
                  }
                  placeholder="Eski parol"
                  required
                />
                <label>Eski parol</label>
              </div>
              <div className="form-floating mb-4">
                <input
                  type="password"
                  className="form-control bg-light border-0"
                  value={passForm.newPassword}
                  onChange={(e) =>
                    setPassForm({ ...passForm, newPassword: e.target.value })
                  }
                  placeholder="Yangi parol"
                  required
                />
                <label>Yangi parol (min 6 ta)</label>
              </div>
              <button
                className="btn btn-outline-pink w-100 py-3 fw-bold rounded-4 shadow-sm"
                type="submit"
              >
                Parolni Yangilash
              </button>
            </form>
          </div>
        </div>

        {isAdmin && (
          <div className="col-12 mt-2">
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-pink-soft border-pink-soft text-center text-md-start">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
                <div>
                  <h6 className="text-pink fw-bold mb-1 uppercase">
                    Salon Ma'lumotlari:
                  </h6>
                  <h4 className="text-dark fw-bold mb-1">
                    {salonData?.salonName}{" "}
                    <span className="text-muted fs-6 ms-2 font-monospace">
                      ({user.salonId})
                    </span>
                  </h4>
                </div>
                <button
                  className="btn btn-pink rounded-pill px-4 py-2 fw-bold shadow-sm"
                  onClick={() => {
                    navigator.clipboard.writeText(user.salonId);
                    alert("Salon ID nusxalandi!");
                  }}
                >
                  <i className="bi bi-copy me-2"></i>ID ni nusxalash
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="text-center mt-5 mb-5">
        <button
          className="btn btn-outline-danger px-5 py-3 fw-bold rounded-pill shadow-sm border-2"
          style={{ transition: "0.3s" }}
          onClick={logout}
        >
          <i className="bi bi-box-arrow-right me-2"></i> Tizimdan chiqish
        </button>
      </div>
    </div>
  );
}
