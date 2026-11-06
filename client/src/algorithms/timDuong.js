import { haversine } from './haversine';
import { chayBFS } from './bfs';
import { chayIDS } from './ids';
import { BAN_KINH_DI_BO, layCanh, layThuTuTram, taoDoanTuyen, tenChieu, themDiemDen, themDiemDi } from './graph';

const DIEM_DI = '__diem_di';
const DIEM_DEN = '__diem_den';

function tramGanNhat(cacTram, diem) {
  let chon = null;

  cacTram.forEach((tram) => {
    const met = haversine(diem, tram);
    if (met <= BAN_KINH_DI_BO && (!chon || met < chon.met)) {
      chon = { ...tram, met };
    }
  });

  return chon;
}

function thuMotChieu(route, chieu, diemDi, diemDen, tramDonId) {
  const thuTu = layThuTuTram(route, chieu);
  const tramXuong = tramGanNhat(thuTu, diemDen);
  if (!tramXuong) return { loi: 'khong-tram-den' };

  const viTriXuong = thuTu.findIndex((tram) => tram.id === tramXuong.id);
  const phiaTruoc = thuTu
    .map((tram, index) => ({
      ...tram,
      index,
      met: haversine(diemDi, tram)
    }))
    .filter((tram) => tram.index < viTriXuong);

  if (tramDonId) {
    const tramChon = phiaTruoc.find((tram) => tram.id === tramDonId);
    if (!tramChon) return { loi: 'sau-tram-xuong' };
    return { route, chieu, thuTu, tramXuong, viTriXuong, tramCoTheDon: [tramChon], phiaTruoc };
  }

  const tramCoTheDon = phiaTruoc.filter((tram) => tram.met <= BAN_KINH_DI_BO);
  if (tramCoTheDon.length === 0) return { loi: 'khong-tram-don' };

  return { route, chieu, thuTu, tramXuong, viTriXuong, tramCoTheDon, phiaTruoc };
}

function chayTrenKeHoach(keHoach, diemDi, diemDen) {
  const chiSoDau = Math.min(...keHoach.tramCoTheDon.map((tram) => tram.index));
  const doan = keHoach.thuTu.slice(chiSoDau, keHoach.viTriXuong + 1);
  const doThi = taoDoanTuyen(doan, keHoach.route.id, keHoach.chieu);

  themDiemDi(doThi, DIEM_DI, diemDi, keHoach.tramCoTheDon);
  themDiemDen(doThi, DIEM_DEN, diemDen, keHoach.tramXuong);

  return {
    doThi,
    ids: chayIDS(doThi, DIEM_DI, DIEM_DEN),
    bfs: chayBFS(doThi, DIEM_DI, DIEM_DEN)
  };
}

function docKetQua(keHoach, daChay, diemDi, diemDen) {
  const { ids, bfs, doThi } = daChay;
  const cacDoan = [];

  for (let i = 0; i < ids.path.length - 1; i++) {
    const tu = doThi.nodes[ids.path[i]];
    const den = doThi.nodes[ids.path[i + 1]];
    const canh = layCanh(doThi, ids.path[i], ids.path[i + 1]);
    cacDoan.push({
      tu,
      den,
      met: canh ? Math.round(canh.met) : Math.round(haversine(tu, den)),
      loai: canh?.loai || 'diBo',
      tuyenId: canh?.tuyenId || keHoach.route.id,
      chieu: canh?.chieu || keHoach.chieu
    });
  }

  const cacTram = ids.path
    .map((id) => doThi.nodes[id])
    .filter((node) => node && !node.laDiemNguoiDung);
  const tramDon = cacTram[0];
  const doanDau = cacDoan[0];
  const doanCuoi = cacDoan[cacDoan.length - 1];
  const tramKhac = keHoach.phiaTruoc
    .filter((tram) => tram.id !== tramDon.id)
    .map((tram) => ({
      id: tram.id,
      name: tram.name,
      lat: tram.lat,
      lng: tram.lng,
      met: Math.round(tram.met)
    }))
    .sort((a, b) => a.met - b.met);

  return {
    thanhCong: true,
    thongBao: '',
    diemDi,
    diemDen,
    tramDon,
    tramXuong: cacTram[cacTram.length - 1],
    metDiBoDau: doanDau?.loai === 'diBo' ? doanDau.met : 0,
    metDiBoCuoi: doanCuoi?.loai === 'diBo' ? doanCuoi.met : 0,
    cacDoan,
    cacTram,
    tuyenId: keHoach.route.id,
    chieu: keHoach.chieu,
    tenTuyen: keHoach.route.name,
    tramKhac,
    ids,
    bfs
  };
}

function coTramGan(routes, tuyenId, diem) {
  return routes.some((route) => {
    if (tuyenId && route.id !== tuyenId) return false;
    return route.stops.some((stop) => haversine(diem, stop) <= BAN_KINH_DI_BO);
  });
}

function totHon(moi, cu) {
  if (moi.metDiBoCuoi !== cu.metDiBoCuoi) return moi.metDiBoCuoi < cu.metDiBoCuoi;
  if (moi.cacTram.length !== cu.cacTram.length) return moi.cacTram.length < cu.cacTram.length;
  return moi.metDiBoDau < cu.metDiBoDau;
}

function thatBai(thongBao, lanChay) {
  return {
    thanhCong: false,
    thongBao,
    ids: lanChay?.ids || null,
    bfs: lanChay?.bfs || null
  };
}

export function timDuong({ routes, tuyenId, chieu, diemDi, diemDen, tramDonId }) {
  const tenTuyen = tuyenId ? `tuyến ${tuyenId}` : 'các tuyến';

  if (!coTramGan(routes, tuyenId, diemDi)) {
    return thatBai(`Không có trạm của ${tenTuyen} trong vòng 800 m quanh điểm đi.`);
  }

  if (!coTramGan(routes, tuyenId, diemDen)) {
    return thatBai(`Không có trạm của ${tenTuyen} trong vòng 800 m quanh điểm đến.`);
  }

  const cacKeHoach = [];
  let coTramDen = false;
  let coTramDon = false;
  let tramNamSau = false;

  routes.forEach((route) => {
    if (tuyenId && route.id !== tuyenId) return;
    const cacChieu = chieu ? [chieu] : ['di', 've'];

    cacChieu.forEach((huong) => {
      const keHoach = thuMotChieu(route, huong, diemDi, diemDen, tramDonId || '');
      if (keHoach.loi === 'khong-tram-den') return;
      coTramDen = true;
      if (keHoach.loi === 'khong-tram-don') return;
      coTramDon = true;
      if (keHoach.loi === 'sau-tram-xuong') {
        tramNamSau = true;
        return;
      }
      cacKeHoach.push(keHoach);
    });
  });

  if (tramDonId && tramNamSau && cacKeHoach.length === 0) {
    return thatBai('Trạm này nằm phía sau trạm gần điểm đến, xe không đi tới theo chiều đang chọn.');
  }

  if (cacKeHoach.length === 0) {
    if (!coTramDen) {
      return thatBai(`Không có trạm của ${tenTuyen} trong vòng 800 m quanh điểm đến.`);
    }
    if (!coTramDon) {
      return thatBai(`Điểm đi và điểm đến không nằm trên cùng một chiều của ${tenTuyen} trong phạm vi đi bộ 800 m. Thử chiều còn lại hoặc chọn tuyến khác.`);
    }
    return thatBai(`Không tìm thấy đường theo ${tenTuyen}, ${tenChieu(chieu)}.`);
  }

  let ketQuaTot = null;
  let lanChayCuoi = null;

  cacKeHoach.forEach((keHoach) => {
    const daChay = chayTrenKeHoach(keHoach, diemDi, diemDen);
    lanChayCuoi = daChay;
    if (!daChay.ids.found) return;

    const ketQua = docKetQua(keHoach, daChay, diemDi, diemDen);
    if (!ketQuaTot || totHon(ketQua, ketQuaTot)) ketQuaTot = ketQua;
  });

  if (!ketQuaTot) {
    return thatBai(`Không tìm thấy đường theo ${tenTuyen}, ${tenChieu(chieu)}.`, lanChayCuoi);
  }

  return ketQuaTot;
}
