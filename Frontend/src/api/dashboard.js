import api from "./auth";

export const getAdminDashboard = (params) => api.get("/dashboard/admin", { params });
export const getTenantDashboard = () => api.get("/dashboard/tenant");