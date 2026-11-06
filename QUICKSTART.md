# Chạy local

Cần Node.js 18 trở lên. Hai thư mục `client` và `server` cài riêng, không có package.json ở gốc.

```bash
cd server
npm install
npm run dev
```

Terminal khác:

```bash
cd client
copy .env.example .env
npm install
npm run dev
```

Server in `Bus server listening on port 5000`. Vite in địa chỉ local, thường là http://localhost:3000.

Bản đồ dùng VietMap. Cần `VITE_VIETMAP_API_KEY` trong `client/.env`. Tìm đường chạy trên trình duyệt sau khi tải danh sách tuyến.

Nếu cổng 5000 đã bị chiếm, sửa `PORT` trong `server/.env` và `VITE_API_URL` trong `client/.env` cho khớp.

Kiểm tra API:

```bash
curl http://localhost:5000/api/health
curl http://localhost:5000/api/bus/routes
```

File tuyến là `server/src/data/danang-bus-routes.json`. Không mở được file này thì server đọc `sample-danang-routes.json`.
