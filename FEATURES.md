# Chức năng

## Tìm đường

Nhập điểm đi và điểm đến bằng danh sách trạm, hoặc bằng tọa độ `lat, lng`. Với tọa độ, app lấy trạm gần nhất trong bán kính 1 km.

Lọc một tuyến thì IDS gọi `searchByRoute` và dừng ở trạm đầu tiên thuộc tuyến đó. BFS vẫn so sánh trên cả đồ thị, từ trạm đi tới trạm đến.

Tìm được đường thì app thử thêm vài cặp trạm trong vòng 500 m và giữ tối đa 3 đường khác. Thứ tự sắp theo quãng đi bộ cộng số trạm.

## Bản đồ

Trạm dùng marker xanh dương, điểm đi màu xanh lá, điểm đến màu đỏ. Có vòng tròn bán kính 500 m quanh hai điểm. Đường IDS vẽ bằng polyline nối thẳng các trạm, không bám theo mặt đường.

Đổi được lớp bản đồ: VietMap, OpenStreetMap, Carto, Esri. VietMap cần `VITE_VIETMAP_API_KEY`.

## Đi bộ

Khối hướng dẫn đi bộ không gọi API chỉ đường. Nó tính khoảng cách thẳng và tách thành vài câu theo hướng la bàn.

## Các bước IDS

Panel góc dưới phải phát lại danh sách bước: bắt đầu, tăng độ sâu, thăm node, đi cạnh, quay lui, tìm thấy hoặc hết độ sâu. Bấm chạy, tạm dừng, bước tiếp hoặc về đầu.

## Thống kê

Panel bên phải hiện số node đã thăm, độ sâu hoặc kích thước hàng đợi, thời gian chạy và số trạm trên đường đi.
