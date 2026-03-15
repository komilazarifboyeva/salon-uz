import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth, db } from "../firebase/firebaseConfig";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
} from "firebase/auth";
import {
  doc,
  setDoc,
  addDoc,
  collection,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import "./Register.css";

export default function Register() {
  const navigate = useNavigate();
  const [role, setRole] = useState("client");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [form, setForm] = useState({
    email: "",
    password: "",
    salonName: "",
    salonLocation: "",
    ownerName: "",
    clientName: "",
    clientPhone: "",
    masterName: "",
    masterSpecialty: "",
    masterPhone: "",
    selectedSalonId: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.id]: e.target.value });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const finalSalonId = form.selectedSalonId.trim();

      if (role === "master") {
        if (!finalSalonId) {
          setErrorMsg("Iltimos, Salon ID sini kiriting!");
          setLoading(false);
          return;
        }
        try {
          const salonRef = doc(db, "salons", finalSalonId);
          const salonSnap = await getDoc(salonRef);

          if (!salonSnap.exists()) {
            setErrorMsg(
              "Xato: Bunday Salon ID mavjud emas! Admindan to'g'ri ID ni so'rang.",
            );
            setLoading(false);
            return;
          }
        } catch (ruleErr) {
          console.error("Firebase Rules Error:", ruleErr);
          setErrorMsg(
            "Baza bilan bog'lanishda xatolik! Firebase Console -> Firestore -> Rules bo'limida 'allow read: if true;' qilinganini tekshiring.",
          );
          setLoading(false);
          return;
        }
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password,
      );
      const user = userCredential.user;

      if (role === "admin") {
        const salonRef = await addDoc(collection(db, "salons"), {
          salonName: form.salonName,
          salonLocation: form.salonLocation,
          createdAt: serverTimestamp(),
        });

        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          ownerName: form.ownerName,
          email: form.email,
          role: "admin",
          salonId: salonRef.id,
          salonLocation: form.salonLocation,
          createdAt: serverTimestamp(),
        });
      } else if (role === "master") {
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          name: form.masterName,
          specialty: form.masterSpecialty,
          phone: form.masterPhone,
          email: form.email,
          role: "master",
          salonId: finalSalonId,
          createdAt: serverTimestamp(),
        });

        await setDoc(doc(db, "masters", user.uid), {
          uid: user.uid,
          name: form.masterName,
          specialty: form.masterSpecialty,
          phone: form.masterPhone,
          salonId: finalSalonId,
        });
      } else {
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          name: form.clientName,
          phone: form.clientPhone,
          email: form.email,
          role: "client",
          createdAt: serverTimestamp(),
        });
      }

      await sendEmailVerification(user);
      await signOut(auth);

      setSuccessMsg(
        `Ro'yxatdan o'tdingiz! Iltimos, ${form.email} pochtangizga kirib, tasdiqlash havolasini bosing.`,
      );

      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 5000);
    } catch (err) {
      console.error("Umumiy xatolik:", err);
      if (err.code === "auth/email-already-in-use") {
        setErrorMsg("Bu email allaqachon ro'yxatdan o'tgan!");
      } else if (err.code === "auth/weak-password") {
        setErrorMsg("Parol juda qisqa. Kamida 6 ta belgi bo'lishi kerak.");
      } else {
        setErrorMsg("Xatolik yuz berdi: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="container py-5 d-flex justify-content-center align-items-center"
      style={{ minHeight: "80vh" }}
    >
      <div style={{ width: "100%", maxWidth: "520px" }}>
        {successMsg && (
          <div className="alert alert-success bg-success-subtle border-success text-success-emphasis text-center fw-bold shadow-sm rounded-4 mb-4">
            <i className="bi bi-envelope-check-fill fs-3 d-block mb-2"></i>
            {successMsg}
            <div
              className="spinner-border spinner-border-sm d-block mx-auto mt-3"
              role="status"
            ></div>
          </div>
        )}

        {errorMsg && (
          <div className="alert alert-danger bg-danger-subtle border-danger text-danger-emphasis d-flex align-items-center shadow-sm rounded-4 mb-4">
            <i className="bi bi-exclamation-triangle-fill fs-4 me-3"></i>
            <div>{errorMsg}</div>
            <button
              type="button"
              className="btn-close ms-auto"
              onClick={() => setErrorMsg("")}
            ></button>
          </div>
        )}

        {!successMsg && (
          <>
            <h3 className="fw-bold mb-4 text-center text-dark-pink">
              Ro'yxatdan o'tish
            </h3>

            <div className="d-flex justify-content-center gap-2 mb-4 flex-wrap">
              <button
                type="button"
                className={`btn rounded-pill px-3 py-2 fw-bold shadow-sm ${role === "client" ? "btn-pink text-white" : "bg-white text-pink border border-pink"}`}
                onClick={() => setRole("client")}
                style={role !== "client" ? { borderColor: "#d63384" } : {}}
              >
                <i className="bi bi-person-fill me-1"></i> Mijoz
              </button>
              <button
                type="button"
                className={`btn rounded-pill px-3 py-2 fw-bold shadow-sm ${role === "master" ? "btn-pink text-white" : "bg-white text-pink border border-pink"}`}
                onClick={() => setRole("master")}
                style={role !== "master" ? { borderColor: "#d63384" } : {}}
              >
                <i className="bi bi-scissors me-1"></i> Master
              </button>
              <button
                type="button"
                className={`btn rounded-pill px-3 py-2 fw-bold shadow-sm ${role === "admin" ? "btn-pink text-white" : "bg-white text-pink border border-pink"}`}
                onClick={() => setRole("admin")}
                style={role !== "admin" ? { borderColor: "#d63384" } : {}}
              >
                <i className="bi bi-shop me-1"></i> Salon
              </button>
            </div>

            <form
              onSubmit={onSubmit}
              className="card p-4 shadow-sm border-0 rounded-4 bg-white"
            >
              {role === "admin" && (
                <>
                  <div className="input-group mb-3 w-100">
                    <span className="input-group-text bg-light text-pink rounded-start-4">
                      <i className="bi bi-shop fs-5"></i>
                    </span>
                    <div className="form-floating flex-grow-1">
                      <input
                        type="text"
                        className="form-control custom-inputs rounded-end-4"
                        id="salonName"
                        value={form.salonName}
                        onChange={handleChange}
                        required
                        placeholder="Salon nomi"
                      />
                      <label htmlFor="salonName">Salon nomi</label>
                    </div>
                  </div>
                  <div className="input-group mb-3 w-100">
                    <span className="input-group-text bg-light text-pink rounded-start-4">
                      <i className="bi bi-geo-alt-fill fs-5"></i>
                    </span>
                    <div className="form-floating flex-grow-1">
                      <input
                        type="text"
                        className="form-control custom-inputs rounded-end-4"
                        id="salonLocation"
                        value={form.salonLocation}
                        onChange={handleChange}
                        required
                        placeholder="Salon manzili"
                      />
                      <label htmlFor="salonLocation">Salon manzili</label>
                    </div>
                  </div>
                  <div className="input-group mb-3 w-100">
                    <span className="input-group-text bg-light text-pink rounded-start-4">
                      <i className="bi bi-person-fill fs-5"></i>
                    </span>
                    <div className="form-floating flex-grow-1">
                      <input
                        type="text"
                        className="form-control custom-inputs rounded-end-4"
                        id="ownerName"
                        value={form.ownerName}
                        onChange={handleChange}
                        required
                        placeholder="Ism va familiya"
                      />
                      <label htmlFor="ownerName">Ism va familiya</label>
                    </div>
                  </div>
                </>
              )}

              {role === "master" && (
                <>
                  <div className="input-group mb-3 w-100">
                    <span className="input-group-text bg-light text-pink rounded-start-4">
                      <i className="bi bi-key-fill fs-5"></i>
                    </span>
                    <div className="form-floating flex-grow-1">
                      <input
                        type="text"
                        className="form-control custom-inputs rounded-end-4 text-dark fw-bold"
                        id="selectedSalonId"
                        value={form.selectedSalonId}
                        onChange={handleChange}
                        required
                        placeholder="Maxfiy Salon ID"
                      />
                      <label htmlFor="selectedSalonId">Salon ID</label>
                    </div>
                  </div>
                  <div className="input-group mb-3 w-100">
                    <span className="input-group-text bg-light text-pink rounded-start-4">
                      <i className="bi bi-person-fill fs-5"></i>
                    </span>
                    <div className="form-floating flex-grow-1">
                      <input
                        type="text"
                        className="form-control custom-inputs rounded-end-4"
                        id="masterName"
                        value={form.masterName}
                        onChange={handleChange}
                        required
                        placeholder="Ismingiz"
                      />
                      <label htmlFor="masterName">Ism va familiya</label>
                    </div>
                  </div>
                  <div className="input-group mb-3 w-100">
                    <span className="input-group-text bg-light text-pink rounded-start-4">
                      <i className="bi bi-briefcase-fill fs-5"></i>
                    </span>
                    <div className="form-floating flex-grow-1">
                      <input
                        type="text"
                        className="form-control custom-inputs rounded-end-4"
                        id="masterSpecialty"
                        value={form.masterSpecialty}
                        onChange={handleChange}
                        required
                        placeholder="Mutaxassislik"
                      />
                      <label htmlFor="masterSpecialty">Mutaxassislik</label>
                    </div>
                  </div>
                  <div className="input-group mb-3 w-100">
                    <span className="input-group-text bg-light text-pink rounded-start-4">
                      <i className="bi bi-telephone-fill fs-5"></i>
                    </span>
                    <div className="form-floating flex-grow-1">
                      <input
                        type="tel"
                        className="form-control custom-inputs rounded-end-4"
                        id="masterPhone"
                        value={form.masterPhone}
                        onChange={handleChange}
                        required
                        placeholder="Telefon raqam"
                      />
                      <label htmlFor="masterPhone">Telefon raqam </label>
                    </div>
                  </div>
                </>
              )}

              {role === "client" && (
                <>
                  <div className="input-group mb-3 w-100">
                    <span className="input-group-text bg-light text-pink rounded-start-4">
                      <i className="bi bi-person-fill fs-5"></i>
                    </span>
                    <div className="form-floating flex-grow-1">
                      <input
                        type="text"
                        className="form-control custom-inputs rounded-end-4"
                        id="clientName"
                        value={form.clientName}
                        onChange={handleChange}
                        required
                        placeholder="Ism va familiya"
                      />
                      <label htmlFor="clientName">Ism va familiya</label>
                    </div>
                  </div>
                  <div className="input-group mb-3 w-100">
                    <span className="input-group-text bg-light text-pink rounded-start-4">
                      <i className="bi bi-telephone-fill fs-5"></i>
                    </span>
                    <div className="form-floating flex-grow-1">
                      <input
                        type="tel"
                        className="form-control custom-inputs rounded-end-4"
                        id="clientPhone"
                        value={form.clientPhone}
                        onChange={handleChange}
                        required
                        placeholder="Telefon raqam"
                      />
                      <label htmlFor="clientPhone">Telefon raqam</label>
                    </div>
                  </div>
                </>
              )}

              <div className="input-group mb-3 w-100">
                <span className="input-group-text bg-light text-pink rounded-start-4">
                  <i className="bi bi-envelope-fill fs-5"></i>
                </span>
                <div className="form-floating flex-grow-1">
                  <input
                    type="email"
                    className="form-control custom-inputs rounded-end-4"
                    id="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    placeholder="Email"
                  />
                  <label htmlFor="email">Email kiriting</label>
                </div>
              </div>
              <div className="input-group mb-4 w-100">
                <span className="input-group-text bg-light text-pink rounded-start-4">
                  <i className="bi bi-lock-fill fs-5"></i>
                </span>
                <div className="form-floating flex-grow-1">
                  <input
                    type="password"
                    className="form-control custom-inputs rounded-end-4"
                    id="password"
                    value={form.password}
                    onChange={handleChange}
                    required
                    minLength={6}
                    placeholder="Parol"
                  />
                  <label htmlFor="password">Parol yarating</label>
                </div>
              </div>

              <button
                className="btn btn-pink w-100 py-3 fw-bold shadow-sm rounded-4"
                disabled={loading}
              >
                {loading ? (
                  <span>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Kuting...
                  </span>
                ) : (
                  "Ro'yxatdan o'tish"
                )}
              </button>

              <div className="text-center mt-3 small text-muted">
                Akkount bormi?{" "}
                <Link
                  to="/login"
                  className="text-pink fw-semibold text-decoration-none"
                >
                  Kirish
                </Link>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
