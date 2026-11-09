import { useEffect, useState } from 'react';
import { useBusStore } from '../../store/busStore';
import { formatDistance } from '../../algorithms/haversine';
import { tenChieu } from '../../algorithms/graph';
import { duongPhoHopLy, layDuongPho } from '../../services/vietmap';

function useMetTheoPho(cacDiem) {
  const [met, setMet] = useState(null);
  const khoa = cacDiem
    ? cacDiem.map((diem) => `${diem.lat.toFixed(5)},${diem.lng.toFixed(5)}`).join('|')
    : '';

  useEffect(() => {
    if (!khoa) {
      setMet(null);
      return undefined;
    }

    let conSong = true;
    setMet(null);
    layDuongPho(cacDiem, 'foot').then((duong) => {
      if (conSong) setMet(duong ? duong.met : null);
    });

    return () => {
      conSong = false;
    };
  }, [khoa]);

  return met;
}

function chuKhoang(metThang, metPho) {
  if (metPho != null) return `${formatDistance(metPho)} (theo đường phố)`;
  return `${formatDistance(metThang)}`;
}

export default function WalkingDirections() {
  const { ketQua, chonTramDon, setTramXem, tramXemId } = useBusStore();
  const diemDau = ketQua?.thanhCong ? [ketQua.diemDi, ketQua.tramDon] : null;
  const diemCuoi = ketQua?.thanhCong ? [ketQua.tramXuong, ketQua.diemDen] : null;
  const metDauPho = useMetTheoPho(diemDau);
  const metCuoiPho = useMetTheoPho(diemCuoi);

  if (!ketQua) return null;

  if (!ketQua.thanhCong) {
    return (
      <div className="bg-white rounded-lg border p-4 w-full">
        <h3 className="font-bold text-gray-800 mb-2">Không tìm được đường</h3>
        <p className="text-sm text-red-700">{ketQua.thongBao}</p>
      </div>
    );
  }

  const doanXe = ketQua.cacDoan.filter((doan) => doan.loai === 'xe');
  const tramGanHon = ketQua.tramKhac.find((tram) => tram.met < ketQua.metDiBoDau);

  return (
    <div className="bg-white rounded-lg border p-4 w-full">
      <h3 className="font-bold text-gray-800 mb-2">Lộ trình</h3>
      <p className="text-sm text-gray-700 mb-3">
        {ketQua.tenTuyen}, {tenChieu(ketQua.chieu)}
      </p>

      <div className="text-sm space-y-2 mb-3">
        <p>
          <span className="font-medium">Điểm đầu đi bộ:</span> vị trí xuất phát
        </p>
        <p>
          <span className="font-medium">Đi bộ tới trạm đón:</span> {ketQua.tramDon.name} ({chuKhoang(ketQua.metDiBoDau, metDauPho)})
        </p>
        <p>
          <span className="font-medium">Xuống xe tại:</span> {ketQua.tramXuong.name}
        </p>
        <p>
          <span className="font-medium">Điểm cuối đi bộ:</span> điểm đến, còn {chuKhoang(ketQua.metDiBoCuoi, metCuoiPho)}
        </p>
      </div>

      {tramGanHon && (
        <p className="text-xs text-gray-600 mb-3">
          IDS không chọn trạm gần nhất. {tramGanHon.name} gần hơn ({formatDistance(tramGanHon.met)}), nhưng lên xe ở {ketQua.tramDon.name} thì đi ít trạm hơn.
        </p>
      )}

      {doanXe.length > 0 && (
        <ol className="text-xs text-gray-600 list-decimal pl-4 mb-3 space-y-1">
          {doanXe.map((doan, index) => (
            <li key={`${doan.tu.id}-${doan.den.id}-${index}`}>
              {doan.tu.name} đến {doan.den.name}
            </li>
          ))}
        </ol>
      )}

      {ketQua.tramKhac.length > 0 && (
        <div className="border-t pt-3">
          <p className="text-sm font-medium text-gray-800 mb-2">Trạm khác cùng chiều</p>
          <div className="space-y-2">
            {ketQua.tramKhac.map((tram) => (
              <div key={tram.id} className="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-2">
                <p className="font-medium">{tram.name}</p>
                <p className="text-gray-500">Đi bộ từ điểm đi: {formatDistance(tram.met)}</p>
                <div className="flex gap-2 mt-1">
                  <button onClick={() => setTramXem(tram.id)} className="text-primary">
                    {tramXemId === tram.id ? 'Ẩn đường' : 'Xem đường'}
                  </button>
                  <button onClick={() => chonTramDon(tram.id)} className="text-primary">
                    Đón ở đây
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
