export const config = {
  // URL for the Control Plane (NestJS)
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
  
  // URL for the Data Plane (Go Proxy)
  dataPlaneUrl: process.env.NEXT_PUBLIC_DATA_PLANE_URL || "http://localhost:8081",
  
  // WebSocket namespace for real-time logs
  wsLogsUrl: process.env.NEXT_PUBLIC_WS_LOGS_URL || "http://localhost:3000/logs",
};
