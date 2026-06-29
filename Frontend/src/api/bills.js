import api from "./auth";

export const getBills = (params) => api.get("/bills", { params });
export const getBill = (id) => api.get(`/bills/${id}`);
export const generateBill = (data) => api.post("/bills/generate", data);
export const generateBulk = (data) => api.post("/bills/generate-bulk", data);
export const getAnomalies = (params) => api.get("/bills/anomalies", { params });
export const getLeaks = (params) => api.get("/bills/leaks", { params });
export const getOverdueReport = () =>
  api.get("/bills/overdue-report", { responseType: "blob" });
export const downloadPDF = (id) =>
  api.get(`/bills/${id}/pdf`, { responseType: "blob" });
export const downloadConvergentPDF = (id) =>
  api.get(`/bills/${id}/convergent-pdf`, { responseType: "blob" });