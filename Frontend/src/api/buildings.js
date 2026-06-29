import api from "./auth";

export const getBuildings = () => api.get("/buildings");
export const getBuilding = (id) => api.get(`/buildings/${id}`);
export const createBuilding = (data) => api.post("/buildings", data);
export const updateBuilding = (id, data) => api.put(`/buildings/${id}`, data);
export const deleteBuilding = (id) => api.delete(`/buildings/${id}`);
export const getBillingCalendar = () => api.get("/buildings/calendar");