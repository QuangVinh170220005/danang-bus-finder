import { create } from 'zustand';
import { timDuong } from '../algorithms/timDuong';

export const useBusStore = create((set, get) => ({
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

  currentStep: 0,
  isPlaying: false,
  playbackSpeed: 700,

  setRoutes: (routes) => set({ routes }),
  setTuyen: (tuyenId, chieu) => set({ tuyenId, chieu }),
  setChuoiDi: (chuoiDi) => set({ chuoiDi }),
  setChuoiDen: (chuoiDen) => set({ chuoiDen }),
  setCachNhap: (cachNhap) => set({ cachNhap }),
  setTramXem: (tramId) => set({ tramXemId: get().tramXemId === tramId ? null : tramId }),

  datDiemTrenBanDo: (lat, lng) => {
    const chuoi = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    if (get().diemKeTiep === 'den') {
      set({ chuoiDen: chuoi, diemKeTiep: 'di' });
      return;
    }
    set({
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

  setDangTim: (dangTim) => set({ dangTim }),
  setCurrentStep: (step) => set({ currentStep: step }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),

  xoaKetQua: () =>
    set({
      yeuCau: null,
      ketQua: null,
      idsResult: null,
      bfsResult: null,
      currentStep: 0,
      isPlaying: false,
      tramXemId: null
    })
}));
