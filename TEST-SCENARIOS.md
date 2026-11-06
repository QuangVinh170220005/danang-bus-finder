# Dữ liệu thử

Mở http://localhost:3000. Cột trái có sẵn ba ví dụ. Bấm vào ví dụ là app tự tìm.

## Tuyến 01, chiều đi, có đường

Điểm đi gần Bến xe Đà Nẵng, điểm đến gần Chợ Hàn:

```
16.0742, 108.2290
16.0648, 108.2185
```

Kỳ vọng: lên xe tại Ngã Tư Đống Đa - Điện Biên Phủ, xuống tại Chợ Hàn. Bến xe gần điểm đi hơn nhưng IDS không chọn, vì lên ở Đống Đa thì đi ít trạm hơn. Bản đồ có nét đứt xanh lá tới trạm đón và tới điểm đến. Các trạm trước Chợ Hàn có nét xám. IDS và BFS ra cùng một đường. IDS xét nhiều nút hơn. BFS nhớ ít nút hơn trong hàng đợi.

Bấm "Đón ở đây" tại Chùa Phổ Đà để thấy đường đi bộ dài hơn và xe chạy từ trạm đó.

## Tuyến 01, chiều về

Điểm đi gần Bến xe Hội An, điểm đến gần Bến xe Đà Nẵng. Phải chọn chiều về. Chiều đi của cùng hai điểm thì app báo hai điểm không nằm trên cùng một chiều.

## Không có trạm

Điểm đi `10.0000, 100.0000` thì app báo không có trạm trong vòng 800 m quanh điểm đi. Không có số liệu IDS, vì chưa dựng đồ thị.

## Hai tuyến khác nhau

Đại học Đông Á (`16.046, 108.206`) và Ngã Ba Phú Đa (`16.005, 108.095`) nằm trên hai tuyến khác nhau. App không bắt xe hai lần, nên báo không tìm được một chiều chung. Đó là đúng với dữ liệu hiện tại.
