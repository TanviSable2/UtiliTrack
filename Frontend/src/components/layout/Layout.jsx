import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function Layout() {
  return (
    <div className="flex bg-gray-50" style={{ height: "100vh", overflow: "hidden" }}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}