import { haversine } from './haversine';
import { BAN_KINH_DI_BO, layThuTuTram } from './graph';
import { layDuongPho } from '../services/vietmap';
import { timDuongDiBoBangIDS } from './ids';

const MET_MOI_PHUT_DI_BO = 5000 / 60;
const MET_MOI_PHUT_XE = 20000 / 60;

export function thongKeHanhTrinh(route, chieu, i, j, metDi, metDen) {
  const thuTu = layThuTuTram(route, chieu);
  let metXe = 0;
  for (let k = i; k < j; k++) metXe += haversine(thuTu[k], thuTu[k + 1]);
  metXe = Math.round(metXe);
  const metDiBo = Math.round(metDi + metDen);
  const tongMet = metXe + metDiBo;
  const soTram = j - i + 1;
  const phut = metDiBo / MET_MOI_PHUT_DI_BO + metXe / MET_MOI_PHUT_XE;
  return { soTram, metXe, metDiBo, tongMet, phut };
}

export function formatKm(met) {
  if (met < 1000) return `${Math.round(met)} m`;
  return `${(met / 1000).toFixed(1)} km`;
}

export function formatPhut(phut) {
  const p = Math.max(1, Math.round(phut));
  if (p < 60) return `${p} phút`;
  const gio = Math.floor(p / 60);
  const du = p % 60;
  return du ? `${gio} giờ ${du} phút` : `${gio} giờ`;
}

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

// Bổ sung quãng đường đi bộ thực tế bằng thuật toán IDS cho các lựa chọn tuyến
export async function capNhatQuangDuongPho(g, diemA, diemB, routes) {
  const thuTu = layThuTuTram(g.route, g.chieu);
  const tramLen = thuTu[g.i];
  const tramXuong = thuTu[g.j];

  // Tìm đường đi bộ bằng thuật toán IDS trên mạng lưới đường phố
  const duongA = timDuongDiBoBangIDS(routes || [g.route], diemA, tramLen);
  const duongB = timDuongDiBoBangIDS(routes || [g.route], tramXuong, diemB);

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
