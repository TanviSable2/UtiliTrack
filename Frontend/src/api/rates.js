import api from "./auth";

export const getRates = () => api.get("/rates");
export const getCurrentRates = () => api.get("/rates/current");
export const createRate = (data) => api.post("/rates", data);