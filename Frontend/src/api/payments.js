import api from "./auth";

export const createPayment = (data) => api.post("/payments", data);
export const getPaymentsByBill = (billId) => api.get(`/payments/bill/${billId}`);
export const getMyPaymentHistory = () => api.get("/payments/my-history");