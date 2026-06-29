import api from "./auth";

export const getUnits = (params) => api.get("/units", { params });
export const getUnit = (id) => api.get(`/units/${id}`);
export const createUnit = (data) => api.post("/units", data);
export const updateUnit = (id, data) => api.put(`/units/${id}`, data);
export const deleteUnit = (id) => api.delete(`/units/${id}`);