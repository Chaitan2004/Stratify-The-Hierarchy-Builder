import { Routes, Route, useLocation } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Registercommunity from "./pages/Registercommunity";
import Notifications from "./pages/Notifications";
import Search from "./pages/Search";
import Details from "./pages/Details";
import Communities from "./pages/Communities";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import { Toaster } from "react-hot-toast";
import { CopilotKit } from "@copilotkit/react-core";
import { CopilotPopup } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css"; 
import "./index.css";

const APP_CONTEXT = {
  home: "On the home page, users can fill out their profile. This information is publicly visible to all members within a community, so please complete it carefully. Use the 'Save All and Commit' button to save your changes.",
  community: "On the community page, users can view a list of communities they belong to, displayed in the left-hand sidebar with the leader's name shown below each community. Clicking on a community allows users to access its tree structure, where they can add, delete, or connect nodes with arrows, among other features. The 'Show Members' button in the bottom right corner displays all community members. Community leaders can remove members either from the members list (using the trash icon after clicking 'Show Members') or from the tree (it removes the member only from the tree not from the community) (by right-clicking a node and selecting delete; this action is restricted to leaders). Any user can click a node to view that person's details within the community.",
  "register-community": "On the register community page, users can create a new community by providing details such as the name and motto. The 'level' feature is currently under development and will be added soon.",
  notifications: "On the notifications page, users can view alerts and updates related to their communities and activities, including join requests from other users.",
  search: "On the search page, users can search for communities by name, join communities, and view a community's motto by hovering over the info icon.",
  details: "On the details page, users can update their username or change their password."
};
const fullAppContext = Object.values(APP_CONTEXT).join('\n');

function App() {
  const location = useLocation();

  // List of routes where CopilotKit should NOT appear
  const hideCopilotOn = ["/", "/signin", "/register", "/forgot", "/reset-password"];
  const shouldHideCopilot = hideCopilotOn.includes(location.pathname);

  return (
    <>
      {shouldHideCopilot ? (
        <>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/signin" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            {/* 🛡️ Protected routes */}
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
            <Route
              path="/register-community"
              element={
                <ProtectedRoute>
                  <Registercommunity />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <Notifications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/search-community"
              element={
                <ProtectedRoute>
                  <Search />
                </ProtectedRoute>
              }
            />
            <Route
              path="/details"
              element={
                <ProtectedRoute>
                  <Details />
                </ProtectedRoute>
              }
            />
            <Route
              path="/your-communities"
              element={
                <ProtectedRoute>
                  <Communities />
                </ProtectedRoute>
              }
            />
          </Routes>
          <Toaster position="top-center" />
        </>
      ) : (
        <CopilotKit publicApiKey={import.meta.env.VITE_COPILOTKIT_PUBLIC_API_KEY}>
          <>
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/signin" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              {/* 🛡️ Protected routes */}
              <Route
                path="/home"
                element={
                  <ProtectedRoute>
                    <Home />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/register-community"
                element={
                  <ProtectedRoute>
                    <Registercommunity />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <Notifications />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/search-community"
                element={
                  <ProtectedRoute>
                    <Search />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/details"
                element={
                  <ProtectedRoute>
                    <Details />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/your-communities"
                element={
                  <ProtectedRoute>
                    <Communities />
                  </ProtectedRoute>
                }
              />
            </Routes>
            <CopilotPopup
              instructions={fullAppContext}
              labels={{
                title: "Stratify Assistant",
                initial: "Need any help?",
              }}
            />
            <Toaster position="top-center" />
          </>
        </CopilotKit>
      )}
    </>
  );
}

export default App;
