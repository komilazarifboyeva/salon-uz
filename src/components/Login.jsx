import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth } from "../firebase/firebaseConfig";
import { signInWithEmailAndPassword, signOut } from "firebase/auth"; // 🔥 signOut qo'shildi
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(""); // 🔥 Xabarlar uchun state

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        form.email,
        form.password,
      );
      const user = userCredential.user;

      // 🔥 EMAIL TASDIQLANGANINI TEKSHIRISH
      if (!user.emailVerified) {
        await signOut(auth); // Tasdiqlamagan bo'lsa, tizimdan darhol chiqaramiz
        setErrorMsg(
          "Iltimos, avval emailingizni tasdiqlang! Pochtangizga (Spam papkasiga ham qarang) xat yuborilgan.",
        );
        setLoading(false);
        return;
      }

      navigate("/", { replace: true });
    } catch (err) {
      console.error("Login xatosi:", err.code);
      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/user-not-found"
      ) {
        setErrorMsg("Email yoki parol noto'g'ri kiritildi!");
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
      <div style={{ width: "100%", maxWidth: "450px" }}>
        {/* 🔥 Xatolik haqida chiroyli xabar bloki */}
        {errorMsg && (
          <div className="alert alert-danger bg-danger-subtle border-danger text-danger-emphasis d-flex align-items-center shadow-sm rounded-4 mb-4">
            <i className="bi bi-exclamation-triangle-fill fs-4 me-3"></i>
            <div>{errorMsg}</div>
          </div>
        )}

        <h3 className="fw-bold mb-4 text-center text-dark-pink">Kirish</h3>

        <form
          onSubmit={onSubmit}
          className="card p-4 shadow-sm border-0 rounded-4 bg-white"
        >
          <div className="input-group mb-3 w-100">
            <span className="input-group-text bg-light text-pink rounded-start-4">
              <i className="bi bi-envelope-fill fs-5"></i>
            </span>
            <div className="form-floating flex-grow-1">
              <input
                type="email"
                className="form-control custom-inputs rounded-end-4"
                id="floatingInputEmail"
                placeholder="name@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
              <label htmlFor="floatingInputEmail">Emailingizni kiriting</label>
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
                id="floatingInputPassword"
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <label htmlFor="floatingInputPassword">
                Parolingizni kiriting
              </label>
            </div>
          </div>

          <button
            className="btn btn-pink w-100 py-3 fw-bold shadow-sm rounded-4"
            disabled={loading}
          >
            {loading ? (
              <span>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                ></span>
                Yuklanmoqda...
              </span>
            ) : (
              "Kirish"
            )}
          </button>

          <div className="text-center mt-3 small text-muted">
            Akkount yo'qmi?{" "}
            <Link
              to="/register"
              className="text-pink fw-semibold text-decoration-none"
            >
              Ro'yxatdan o'tish
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
