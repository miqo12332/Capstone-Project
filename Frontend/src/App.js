import React, { Suspense, useEffect, useContext } from "react";
import { HashRouter, Route, Routes, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { HabitProvider } from "./context/HabitContext";
import { AuthProvider, AuthContext } from "./context/AuthContext";
import { CSpinner, useColorModes } from "@coreui/react";
import "./scss/style.scss";
import "./scss/examples.scss";

// ✅ Fixed imports — match your new structure
const DefaultLayout = React.lazy(() => import("./layout/DefaultLayout"));
const Login = React.lazy(() => import("./views/auth/Login"));
const Register = React.lazy(() => import("./views/auth/Register"));
const Page404 = React.lazy(() => import("./views/pages/Page404"));
const Page500 = React.lazy(() => import("./views/pages/Page500"));
const Profile = React.lazy(() => import("./views/pages/Profile"));


const PrivateRoute = ({ children }) => {
  const { user, isInitializing } = useContext(AuthContext);

  if (isInitializing) {
    return (
      <div className="pt-3 text-center">
        <CSpinner color="primary" variant="grow" />
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
};

const App = () => {
  const { isColorModeSet, setColorMode } = useColorModes(
    "coreui-free-react-admin-template-theme"
  );
  const storedTheme = useSelector((state) => state.theme);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.href.split("?")[1]);
    const theme =
      urlParams.get("theme") &&
      urlParams.get("theme").match(/^[A-Za-z0-9\\s]+/)[0];
    if (theme) setColorMode(theme);
    if (isColorModeSet()) return;
    setColorMode(storedTheme);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthProvider>
      <HabitProvider>
        <HashRouter>
          <Suspense
            fallback={
              <div className="pt-3 text-center">
                <CSpinner color="primary" variant="grow" />
              </div>
            }
          >
            <Routes>
              {/* Public */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/404" element={<Page404 />} />
              <Route path="/500" element={<Page500 />} />

              {/* Protected */}
              <Route
                path="/profile"
                element={
                  <PrivateRoute>
                    <Profile />
                  </PrivateRoute>
                }
              />

              {/* All other routes */}
              <Route
                path="*"
                element={
                  <PrivateRoute>
                    <DefaultLayout />
                  </PrivateRoute>
                }
              />
            </Routes>
          </Suspense>
        </HashRouter>
      </HabitProvider>
    </AuthProvider>
  );
};

export default App;
