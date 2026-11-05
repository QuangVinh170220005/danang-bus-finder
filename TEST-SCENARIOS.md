# Dữ liệu thử

Mở http://localhost:3000, chọn chế độ tọa độ.

Đường ngắn, quanh trung tâm:

```
16.0738, 108.2280
16.0650, 108.2190
```

Đường dài hơn, từ Đại học Đông Á tới Ngã Ba Phú Đa:

```
16.0460, 108.2060
16.0050, 108.0950
```

Số node và thời gian phụ thuộc cặp điểm và đồ thị lúc chạy. IDS thường thăm nhiều node hơn BFS vì lặp các độ sâu nhỏ. Độ dài đường, tính theo số cạnh, giống nhau khi cả hai tìm thấy.

Chọn lọc tuyến nếu muốn xem `searchByRoute`. Kết quả lúc đó là trạm thuộc tuyến đã chọn, không phải đường tới điểm đến.
