# Tìm đường xe buýt Đà Nẵng

Đồ án chạy thuật toán IDS trên 6 tuyến xe buýt ở Đà Nẵng, rồi so với BFS. Giao diện viết bằng React, API bằng Express. Phần tìm đường chạy trên trình duyệt, không gửi đồ thị lên server.

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

Bản đồ dùng VietMap qua `VITE_VIETMAP_API_KEY` trong `client/.env`. Đường đi bộ và đường xe được vẽ theo phố. Trong `client/.env` cần:

```env
VITE_API_URL=http://localhost:5000/api
VITE_VIETMAP_API_KEY=your_vietmap_api_key_here
```

## Cách dùng

1. Chọn một tuyến và một chiều. Bản đồ đánh số trạm đúng thứ tự chiều đó. Chiều đi màu xanh, chiều về màu cam.
2. Nhập tọa độ `lat, lng`, hoặc chọn trạm đi và trạm đến, rồi bấm Tìm đường. Có sẵn ba ví dụ trong cột trái.
3. IDS chọn trạm đón trên đúng tuyến và đúng chiều, không phải lúc nào cũng là trạm gần nhất. Nét đứt xanh lá là đoạn đi bộ. Nét liền xanh dương là đoạn đi xe. Số mét trong ngoặc là đường thẳng. Nếu khác, app ghi thêm số mét theo phố.
4. Bấm Xem đường nếu muốn thấy đường đi bộ tới một trạm khác. Bấm Đón để lên xe tại trạm đó.
5. Không có trạm trong vòng 800 m, hoặc hai điểm không cùng một chiều, thì app hiện một câu báo ở cột trái.
6. Cột trái có phần so sánh IDS với BFS. Phần dưới phát lại từng lần thử: đi một bước, quay về điểm đi, rồi được đi thêm một bước.

Một lần tìm chỉ dựng đồ thị của một chiều, một tuyến. Mũi tên đi từ trạm này tới trạm kế tiếp. Điểm xuất phát nối tới các trạm có thể đón trong vòng 800 m. Trạm xuống nối tới điểm đến.

## IDS và BFS

IDS thử độ sâu 1, rồi 2, rồi tăng dần. Đường trả về là đường ít bước nhất. Lúc chạy, IDS chỉ nhớ nhánh đang đi. BFS cũng tìm đường ít bước nhất, nhưng phải nhớ cả hàng đợi. Vì IDS làm lại các độ sâu nhỏ, số nút IDS xét thường nhiều hơn BFS.

## Thư mục

```
client/src/algorithms    IDS, BFS, dựng đồ thị, hàm tìm đường
client/src/components    cột chọn tuyến, bản đồ, thống kê, các bước IDS
server/src/routes        API danh sách tuyến
server/src/data          JSON 6 tuyến mẫu
```

Dữ liệu đang dùng nằm ở `server/src/data/danang-bus-routes.json`.

## License

MIT
