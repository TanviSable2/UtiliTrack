import api from "./auth";

export const getReadings = (params) => api.get("/meters", { params });
export const getFlaggedReadings = (params) => api.get("/meters/flagged", { params });
export const validateReading = (data) => api.post("/meters/validate", data);
export const createReading = (formData) =>
  api.post("/meters", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });