# Tìm đường xe buýt Đà Nẵng

Đồ án chạy thuật toán Iterative Deepening Search (IDS) trên dữ liệu 6 tuyến xe buýt ở Đà Nẵng, rồi so với BFS. Giao diện viết bằng React, API bằng Express.

## Chạy

Cần Node.js 18 trở lên.

Terminal 1:

```bash
cd server
npm install
npm run dev
```

Terminal 2:

```bash
cd client
copy .env.example .env
npm install
npm run dev
```

Mở http://localhost:3000. Server lắng nghe cổng 5000.

Trong `client/.env`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_VIETMAP_API_KEY=your_vietmap_api_key_here
```

Không có key VietMap thì trên bản đồ chọn OpenStreetMap.

`server/.env` chỉ cần khi muốn đổi cổng:

```env
PORT=5000
```

## Dùng

Chọn hai trạm, hoặc nhập tọa độ dạng `lat, lng`, rồi bấm tìm đường. App lấy trạm gần điểm nhập trong bán kính 1 km, chạy IDS và BFS, vẽ đường lên bản đồ.

Đồ thị nối các trạm kế nhau trên cùng tuyến. Hai trạm cách nhau không quá 500 m thì thêm cạnh đi bộ, trừ khi đã có cạnh xe buýt.

Ô lọc tuyến gọi `searchByRoute`: IDS dừng khi gặp trạm thuộc tuyến đó, không tìm tới điểm đến.

## IDS

IDS lặp tìm kiếm có giới hạn độ sâu, từ 1 đến hết giới hạn. Đường trả về ngắn nhất theo số cạnh, giống BFS. Bộ nhớ chỉ giữ nhánh đang xét.

| | IDS | BFS |
|---|---|---|
| Bộ nhớ | O(bd) | O(b^d) |
| Thời gian | O(b^d) | O(b^d) |

IDS duyệt lại các tầng nông, nên số node đã thăm thường nhiều hơn BFS.

## Thư mục

```
client/src/algorithms    IDS, BFS, dựng đồ thị
client/src/components    sidebar, bản đồ, thống kê
server/src/routes        API
server/src/data          JSON tuyến mẫu
server/src/scraper       lấy tuyến từ Overpass
```

Dữ liệu đang dùng nằm ở `server/src/data/danang-bus-routes.json`. Trong `server`, `npm run scrape` ghi đè file đó bằng dữ liệu Overpass nếu API trả về.

## License

MIT
