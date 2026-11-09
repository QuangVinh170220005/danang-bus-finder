import { create } from 'zustand';
import { timDuong } from '../algorithms/timDuong';
import { layThuTuTram, taoDoThiToanMang } from '../algorithms/graph';
import { timTramGanNhatTheoPho } from '../algorithms/goiYTuyen';
import { taoBoChayIDS, bfsPeak, giaiMaDuongIDS } from '../algorithms/ids';

let demLanTinh = 0;
let idsTimer = null;

function docToaDo(chuoi) {
  if (!chuoi) return null;
  const [lat, lng] = chuoi.split(',').map((phan) => parseFloat(phan.trim()));
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}

export const useBusStore = create((set, get) => ({
  goiY: null,
  tuyenChon: null,
  chonViTri: false,
  cheDoChon: null,
  nhacNho: '',
      viTriBatKy: null,
  ganNhat: null,

  routes: [],
  tuyenId: '01',
  chieu: 'di',
  yeuCau: null,
  ketQua: null,
  chuoiDi: '16.0742, 108.2290',
  chuoiDen: '16.0648, 108.2185',
  diemKeTiep: 'di',
  cachNhap: 'toaDo',
  tramXemId: null,

  idsResult: null,
  bfsResult: null,
  dangTim: false,

  // Mô phỏng thuật toán IDS từng bước theo độ sâu L (giống ids-tim-kiem-ben-xe.netlify.app)
  idsSimulating: false,
  idsProgress: null,
  idsTable: [],
  idsFinalPath: null,
  idsFinalSegments: null,
  idsFinalRoadCoords: null,
  idsGoalNode: null,
  idsComparison: null,
  streetLines: null,
  idsSpeed: 300,
  idsMaxDepth: 25,
  idsTargetType: 'route_stop', // 'route_stop' | 'destination' | 'nearest_station'
  idsStatusText: '',

  currentStep: 0,
  isPlaying: false,
  playbackSpeed: 700,

  setRoutes: (routes) => set({ routes }),
  setTuyen: (tuyenId, chieu) => set({ tuyenId, chieu }),
  setChuoiDi: (chuoiDi) => set({ chuoiDi }),
  setChuoiDen: (chuoiDen) => set({ chuoiDen }),
  setCachNhap: (cachNhap) => set({ cachNhap }),
  setTramXem: (tramId) => set({ tramXemId: get().tramXemId === tramId ? null : tramId }),

  batCheDoChonViTri: (bat) => set({ chonViTri: bat, cheDoChon: bat ? null : get().cheDoChon }),
  setCheDoChon: (che) => set({ cheDoChon: che, chonViTri: false }),

  // Chọn một vị trí bất kỳ: tìm trạm gần nhất (theo đường đi bộ thực tế) trên tuyến đang chọn
  datViTriBatKy: async (lat, lng) => {
    const { routes, tuyenId, chieu, tuyenChon } = get();
    const ma = ++demLanTinh;
    const route = routes.find((r) => r.id === tuyenId);
    set({ chonViTri: false, viTriBatKy: { lat, lng }, ganNhat: { dangTinh: true } });

    if (!route) {
      set({ ganNhat: { loi: 'Hãy chọn một tuyến trước.' } });
      return;
    }

    let cacTram = layThuTuTram(route, chieu);
    if (tuyenChon && tuyenChon.tuyenId === tuyenId && tuyenChon.chieu === chieu && tuyenChon.j > 0) {
      cacTram = cacTram.slice(0, tuyenChon.j);
    }

    const ketQua = await timTramGanNhatTheoPho(cacTram, { lat, lng });
    if (ma !== demLanTinh) return;
    set({ ganNhat: ketQua ? { ...ketQua, tuyenId, chieu } : { loi: 'Tuyến này chưa có trạm.' } });
  },

  // Chọn thẳng một trạm làm điểm đi hoặc điểm đến (bấm vào icon trạm)
  datDiemTheoLoai: (che, lat, lng) => {
    set({ cheDoChon: che });
    get().datDiemTrenBanDo(lat, lng);
  },

  datDiemTrenBanDo: (lat, lng) => {
    const chuoi = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    const che = get().cheDoChon;
    if (!che) {
      set({ nhacNho: 'Hãy bấm nút "Chọn điểm đi" hoặc "Chọn điểm đến" ở cột trái trước, rồi bấm lên bản đồ.' });
      setTimeout(() => set({ nhacNho: '' }), 3500);
      return;
    }
    if (che === 'den') {
      set({ chuoiDen: chuoi, cheDoChon: null, goiY: null, tuyenChon: null, viTriBatKy: null, ganNhat: null });
      return;
    }
    set({
      cheDoChon: null,
  nhacNho: '',
      goiY: null,
      tuyenChon: null,
      viTriBatKy: null,
      ganNhat: null,
      chuoiDi: chuoi,
      diemKeTiep: 'den',
      yeuCau: null,
      ketQua: null,
      idsResult: null,
      bfsResult: null,
      tramXemId: null,
      currentStep: 0,
      isPlaying: false
    });
  },

  ganKetQua: (ketQua) =>
    set({
      ketQua,
      idsResult: ketQua?.ids || null,
      bfsResult: ketQua?.bfs || null,
      currentStep: 0,
      isPlaying: false,
      tramXemId: null
    }),

  chonTramDon: (tramId) => {
    const { yeuCau, routes, ketQua } = get();
    if (!yeuCau) return;

    const tuyenCuaKetQua = ketQua?.thanhCong ? ketQua.tuyenId : yeuCau.tuyenId;
    const chieuCuaKetQua = ketQua?.thanhCong ? ketQua.chieu : yeuCau.chieu;
    const ketQuaMoi = timDuong({
      routes,
      tuyenId: tuyenCuaKetQua,
      chieu: chieuCuaKetQua,
      diemDi: yeuCau.diemDi,
      diemDen: yeuCau.diemDen,
      tramDonId: tramId
    });
    get().ganKetQua(ketQuaMoi);
  },

  setIdsSpeed: (speed) => set({ idsSpeed: speed }),
  setIdsMaxDepth: (maxDepth) => set({ idsMaxDepth: maxDepth }),
  setIdsTargetType: (targetType) => set({ idsTargetType: targetType }),

  clearIDSSimulation: () => {
    if (idsTimer) {
      clearTimeout(idsTimer);
      idsTimer = null;
    }
    set({
      idsSimulating: false,
      idsProgress: null,
      idsTable: [],
      idsFinalPath: null,
      idsFinalSegments: null,
      idsFinalRoadCoords: null,
      idsGoalNode: null,
      idsComparison: null,
      streetLines: null,
      idsStatusText: 'Đã xóa kết quả mô phỏng.'
    });
  },

  stopIDSSimulation: () => {
    if (idsTimer) {
      clearTimeout(idsTimer);
      idsTimer = null;
    }
    set({ idsSimulating: false, idsStatusText: 'Đã tạm dừng mô phỏng IDS.' });
  },

  startIDSSimulation: () => {
    const { routes, chuoiDi, chuoiDen, viTriBatKy, tuyenId, chieu, idsMaxDepth, idsTargetType } = get();
    if (idsTimer) {
      clearTimeout(idsTimer);
      idsTimer = null;
    }

    // Điểm bắt đầu: ưu tiên vị trí người dùng vừa chọn ở bước 3, hoặc điểm xuất phát A
    const diemDi = viTriBatKy || docToaDo(chuoiDi);
    const diemDen = docToaDo(chuoiDen);

    if (!diemDi) {
      set({ idsStatusText: 'Hãy chọn điểm xuất phát hoặc bấm vị trí bất kỳ trên bản đồ trước.' });
      return;
    }

    // Dựng đồ thị toàn bộ mạng lưới xe buýt
    const doThi = taoDoThiToanMang(routes, diemDi, diemDen);

    // Xác định hàm kiểm tra mục tiêu (isGoal)
    let isGoal = null;
    let goalDescription = '';
    const route = routes.find((r) => r.id === tuyenId);

    if (idsTargetType === 'route_stop' && route) {
      const stopsOfRoute = new Set(route.stops.map((s) => s.id));
      isGoal = (u) => stopsOfRoute.has(u);
      goalDescription = `trạm trên Tuyến ${route.id}`;
    } else if (idsTargetType === 'destination' && diemDen) {
      isGoal = (u) => u === '__diem_dich';
      goalDescription = 'Điểm đến (B)';
    } else {
      isGoal = (u) => /^bến xe/i.test(doThi.nodes[u]?.name || '');
      goalDescription = 'Bến xe bất kỳ gần nhất';
    }

    const gen = taoBoChayIDS(doThi, '__xuat_phat', isGoal, idsMaxDepth);
    const tableHistory = [];

    set({
      idsSimulating: true,
      idsProgress: null,
      idsTable: [],
      idsFinalPath: null,
      idsFinalSegments: null,
      idsFinalRoadCoords: null,
      idsGoalNode: null,
      idsComparison: null,
      streetLines: doThi.lines || null,
      idsStatusText: `Bắt đầu IDS tìm đường tới ${goalDescription}...`
    });

    function step() {
      const nx = gen.next();
      if (nx.done) {
        set({
          idsSimulating: false,
          idsProgress: null,
          idsStatusText: `Không có mục tiêu trong ${idsMaxDepth} đoạn đường. Thử tăng độ sâu tối đa.`
        });
        return;
      }

      const it = nx.value;
      const row = {
        L: it.L,
        cnt: it.cnt,
        seenCount: it.seenCount,
        result: it.found ? 'Thấy!' : it.aborted ? 'Quá tải' : it.exhausted ? 'Hết đường' : '—',
        hit: Boolean(it.found)
      };
      tableHistory.push(row);

      set({
        idsProgress: it,
        idsTable: [...tableHistory],
        idsStatusText: `Lặp ${it.L + 1}: giới hạn độ sâu L = ${it.L} (đã mở rộng ${it.cnt} lượt)`
      });

      if (it.found) {
        const pathNodes = it.found.map((id) => doThi.nodes[id]).filter(Boolean);
        const goalId = it.found[it.found.length - 1];
        const goalNode = doThi.nodes[goalId];
        const bf = bfsPeak(doThi, '__xuat_phat', isGoal);

        set({
          idsSimulating: false,
          idsProgress: null,
          idsFinalPath: pathNodes,
          idsFinalSegments: null,
          idsFinalRoadCoords: null,
          idsGoalNode: goalNode,
          idsComparison: {
            L: it.L,
            steps: it.found.length - 1,
            idsMemory: it.L + 1,
            bfsQueuePeak: bf.peak
          },
          idsStatusText: `Tìm thấy: ${goalNode?.name || 'Mục tiêu'} · ${it.found.length - 1} chặng. Đang tải lộ trình đường phố thực tế...`
        });

        // Tự động giải mã đường phố thực tế (không dùng đường chim bay)
        giaiMaDuongIDS(doThi, it.found).then((giaiMa) => {
          if (giaiMa) {
            const tongMetDiBo = giaiMa.segments.filter((s) => s.loai === 'diBo').reduce((sum, s) => sum + s.met, 0);
            const tongMetXe = giaiMa.segments.filter((s) => s.loai === 'xe').reduce((sum, s) => sum + s.met, 0);
            let chiTiet = `${goalNode?.name || 'Mục tiêu'} · ${it.found.length - 1} chặng`;
            if (tongMetDiBo > 0) chiTiet += ` · Đi bộ ${Math.round(tongMetDiBo)} m`;
            if (tongMetXe > 0) chiTiet += ` · Xe buýt ${(tongMetXe / 1000).toFixed(1)} km`;
            chiTiet += ` (theo đường phố thực tế). IDS dừng ở L = ${it.L}.`;

            set({
              idsFinalSegments: giaiMa.segments,
              idsFinalRoadCoords: giaiMa.allCoords,
              idsStatusText: `Tìm thấy: ${chiTiet}`
            });
          }
        });

        return;
      }

      if (it.aborted) {
        set({ idsSimulating: false, idsProgress: null, idsStatusText: `Dừng: L = ${it.L} vượt giới hạn mở rộng.` });
        return;
      }

      if (it.exhausted) {
        set({ idsSimulating: false, idsProgress: null, idsStatusText: 'Đã duyệt hết mạng lưới mà không tới được mục tiêu.' });
        return;
      }

      const currentSpeed = get().idsSpeed;
      idsTimer = setTimeout(step, currentSpeed);
    }

    step();
  },

  setDangTim: (dangTim) => set({ dangTim }),
  setCurrentStep: (step) => set({ currentStep: step }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),

  xoaKetQua: () =>
    set({
      tuyenChon: null,
      chonViTri: false,
      cheDoChon: null,
      nhacNho: '',
      viTriBatKy: null,
      ganNhat: null,
      yeuCau: null,
      ketQua: null,
      idsResult: null,
      bfsResult: null,
      idsFinalPath: null,
      idsFinalSegments: null,
      idsFinalRoadCoords: null,
      streetLines: null,
      currentStep: 0,
      isPlaying: false,
      tramXemId: null
    })
}));
