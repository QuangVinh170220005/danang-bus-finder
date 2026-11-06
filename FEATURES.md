# Chức năng

## Tìm đường

Người dùng chọn tuyến và chiều, rồi nhập điểm đi và điểm đến bằng tọa độ hoặc bằng danh sách trạm.

App lấy trạm xuống là trạm của chiều đó gần điểm đến nhất, trong vòng 800 m. Trạm đón là một trạm nằm phía trước trạm xuống. IDS chọn trạm đón sao cho số bước ít nhất, không chỉ lấy trạm gần điểm đi nhất.

Chọn "Tất cả tuyến" thì app thử từng tuyến, từng chiều. Đường được giữ là đường xuống xe gần điểm đến nhất. Nếu bằng nhau thì lấy đường ít trạm hơn.

## Bản đồ

Lớp nền là VietMap. App chỉ vẽ trạm của tuyến đang xem. Sau khi tìm, bản đồ chỉ còn đoạn đi bộ và đoạn xe của lộ trình đó, vẽ theo phố chứ không nối thẳng.

Khi tìm được đường:

- Nhãn Đi, Đón, Đến. Trạm xuống sát điểm đến thì hiện chấm nhỏ, bấm chấm hoặc nhãn Đến để xem tên.
- Nét đứt xanh lá là đi bộ. Nét liền xanh dương là xe buýt.
- Muốn xem đường tới một trạm khác thì bấm Xem đường. Mỗi lần chỉ hiện một đường, tránh rối.

Đường trên bản đồ bám theo phố nhờ VietMap. IDS vẫn dùng khoảng cách thẳng. Ô lộ trình ghi thêm số mét theo phố. Hai điểm sát nhau thì không vẽ vòng quanh ô phố.

## Trạm khác

Cột trái liệt kê trạm theo đúng chiều. Bấm "Đón ở đây" để lên xe tại trạm đó. Ô lộ trình cũng có nút cho từng trạm thay thế, kèm số mét đi bộ.

## Không tìm được

App không dùng hộp thoại alert. Câu báo hiện ngay trên trang, ví dụ không có trạm trong vòng 800 m, hai điểm không cùng chiều, hoặc trạm được chọn nằm sau trạm xuống.

## Các bước IDS

Cột trái phát lại từng lần thử. Lần 1 chỉ được đi một bước, lần 2 được đi hai bước, rồi IDS quay về điểm đi. Mỗi lần liệt kê chỗ đã xét, chấm tím trên bản đồ đứng yên theo đúng danh sách đó. Bấm Chạy, Tiếp hoặc Đầu.

## Thống kê

Ô bên phải đặt IDS cạnh BFS trên cùng một đồ thị: số nút đã xét, thời gian, độ sâu, bộ nhớ. Bộ nhớ IDS là độ dài nhánh đang đi. Bộ nhớ BFS là kích thước hàng đợi.
