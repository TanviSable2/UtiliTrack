import api from "./auth";

export const getDisputes = () => api.get("/disputes");
export const getDispute = (id) => api.get(`/disputes/${id}`);
export const raiseDispute = (data) => api.post("/disputes", data);
export const resolveDispute = (id, data) => api.put(`/disputes/${id}/resolve`, data);
export const recalculateBill = (id, data) => api.put(`/disputes/${id}/recalculate`, data);