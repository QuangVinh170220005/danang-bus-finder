import { haversine } from './haversine';
import { BAN_KINH_DI_BO, layThuTuTram } from './graph';
import { layDuongPho } from '../services/vietmap';

// Liệt kê các tuyến (cả hai chiều) đi được từ A tới B
export function goiYTuyen(routes, diemA, diemB, banKinh = BAN_KINH_DI_BO) {
  const ketQua = [];

  routes.forEach((route) => {
    ['di', 've'].forEach((chieu) => {
      const thuTu = layThuTuTram(route, chieu);
      let viTriLen = -1;
      let metLen = Infinity;
      let tot = null;

      thuTu.forEach((tram, j) => {
        const metDen = haversine(tram, diemB);
        if (viTriLen >= 0 && metDen <= banKinh) {
          const cost = metLen + metDen;
          if (!tot || cost < tot.cost) {
            tot = { route, chieu, i: viTriLen, j, metDi: metLen, metDen, cost };
          }
        }
        const metA = haversine(tram, diemA);
        if (metA <= banKinh && metA < metLen) {
          metLen = metA;
          viTriLen = j;
        }
      });

      if (tot) ketQua.push(tot);
    });
  });

  return ketQua.sort((a, b) => a.cost - b.cost || a.j - a.i - (b.j - b.i));
}

// Bổ sung quãng đường đi bộ thực tế theo đường phố cho các lựa chọn tuyến
export async function capNhatQuangDuongPho(g, diemA, diemB) {
  const thuTu = layThuTuTram(g.route, g.chieu);
  const tramLen = thuTu[g.i];
  const tramXuong = thuTu[g.j];

  const [duongA, duongB] = await Promise.all([
    layDuongPho([diemA, tramLen], 'foot'),
    layDuongPho([tramXuong, diemB], 'foot')
  ]);

  return {
    ...g,
    metDi: duongA ? Math.round(duongA.met) : Math.round(g.metDi),
    metDen: duongB ? Math.round(duongB.met) : Math.round(g.metDen),
    toaDoDi: duongA ? duongA.toaDo : null,
    toaDoDen: duongB ? duongB.toaDo : null
  };
}

// Tìm trạm gần nhất theo ĐƯỜNG ĐI BỘ THỰC TẾ TRÊN ĐƯỜNG PHỐ
export async function timTramGanNhatTheoPho(cacTram, diem, soUngVien = 6) {
  if (!cacTram || !cacTram.length) return null;

  // Lọc nhanh các ứng viên gần theo bán kính để hỏi API định tuyến
  const ungVien = cacTram
    .map((tram, index) => ({ tram, index, thang: haversine(diem, tram) }))
    .sort((a, b) => a.thang - b.thang)
    .slice(0, Math.min(soUngVien, cacTram.length));

  // Tính quãng đường đi bộ thực tế theo các tuyến phố cho từng ứng viên
  const ketQua = await Promise.all(
    ungVien.map(async (uv) => {
      const duong = await layDuongPho([diem, uv.tram], 'foot');
      return {
        tram: uv.tram,
        index: uv.index,
        met: duong ? duong.met : uv.thang,
        toaDo: duong ? duong.toaDo : [[diem.lat, diem.lng], [uv.tram.lat, uv.tram.lng]],
        theoPho: Boolean(duong)
      };
    })
  );

  // Sắp xếp theo ĐƯỜNG ĐI BỘ THỰC TẾ ngắn nhất
  const coDuongPho = ketQua.filter((k) => k.theoPho);
  const danhSach = coDuongPho.length ? coDuongPho : ketQua;
  return danhSach.sort((a, b) => a.met - b.met)[0];
}
