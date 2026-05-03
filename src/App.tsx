/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Car, 
  MapPin, 
  Navigation, 
  PhoneCall, 
  MessageCircle, 
  Info, 
  CheckCircle2,
  ChevronRight,
  Calculator,
  X,
  Search,
  Loader2,
  LocateFixed
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CAR_TYPES } from './constants';

// Fix Leaflet icon issue
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface LocationData {
  display_name: string;
  lat: string;
  lon: string;
}

function MapUpdater({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

const vietnamBounds: L.LatLngBoundsExpression = [
  [8.0, 102.0], // South West
  [24.0, 110.0] // North East
];

export default function App() {
  const [pickup, setPickup] = useState<LocationData | null>(null);
  const [destination, setDestination] = useState<LocationData | null>(null);
  const [pickupInput, setPickupInput] = useState('');
  const [destInput, setDestInput] = useState('');
  const [pickupResults, setPickupResults] = useState<LocationData[]>([]);
  const [destResults, setDestResults] = useState<LocationData[]>([]);
  const [carType, setCarType] = useState(CAR_TYPES[0].id);
  const [showQuote, setShowQuote] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchingPickup, setSearchingPickup] = useState(false);
  const [searchingDest, setSearchingDest] = useState(false);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);

  const selectedCar = useMemo(() => 
    CAR_TYPES.find(c => c.id === carType) || CAR_TYPES[0]
  , [carType]);

  const totalPrice = useMemo(() => {
    if (!distance) return 0;
    return selectedCar.basePrice + (distance * selectedCar.pricePerKm);
  }, [distance, selectedCar]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const searchLocation = async (query: string, type: 'pickup' | 'dest') => {
    if (query.length < 3) return;
    if (type === 'pickup') setSearchingPickup(true);
    else setSearchingDest(true);

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Vietnam')}&limit=5`);
      const data = await response.json();
      if (type === 'pickup') setPickupResults(data);
      else setDestResults(data);
    } catch (error) {
      console.error('Error searching location:', error);
    } finally {
      if (type === 'pickup') setSearchingPickup(false);
      else setSearchingDest(false);
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pickupInput && (!pickup || pickupInput !== pickup.display_name)) {
        searchLocation(pickupInput, 'pickup');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [pickupInput]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (destInput && (!destination || destInput !== destination.display_name)) {
        searchLocation(destInput, 'dest');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [destInput]);

  const calculateRoute = async () => {
    if (!pickup || !destination) return;
    setLoading(true);

    try {
      const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${pickup.lon},${pickup.lat};${destination.lon},${destination.lat}?overview=full&geometries=geojson`);
      const data = await response.json();
      
      if (data.code === 'Ok') {
        const route = data.routes[0];
        setDistance(Math.round(route.distance / 1000));
        setRouteCoords(route.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]));
        setShowQuote(true);
      } else {
        alert('Không tìm thấy tuyến đường hợp lệ.');
      }
    } catch (error) {
      console.error('Error calculating route:', error);
      alert('Đã có lỗi xảy ra khi tính toán quãng đường.');
    } finally {
      setLoading(false);
    }
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await response.json();
          setPickup({
            display_name: data.display_name,
            lat: latitude.toString(),
            lon: longitude.toString()
          });
          setPickupInput(data.display_name);
          setPickupResults([]);
        } catch (error) {
          console.error('Error reverse geocoding:', error);
        }
      });
    }
  };

  const mapCenter: [number, number] = pickup ? [parseFloat(pickup.lat), parseFloat(pickup.lon)] : [16.0346, 108.2022]; // Da Nang

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg shadow-sm">
              <Car className="text-white w-6 h-6" />
            </div>
            <h1 className="font-bold text-xl tracking-tight text-blue-900 leading-none">ÚT LONG <span className="text-blue-600 text-xs font-medium block">Travel Service</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <a href="tel:0918106058" className="flex items-center gap-2 text-sm font-bold bg-blue-50 text-blue-600 px-3 py-2 rounded-full hover:bg-blue-100 transition-colors">
              <PhoneCall size={14} />
              <span className="hidden xs:inline">0918.106.058</span>
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Form & Map Container */}
          <div className="lg:col-span-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Controls */}
              <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6 h-fit">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Navigation className="text-blue-600 w-5 h-5" />
                  Thông Tin Chuyến Đi
                </h2>

                <div className="space-y-5">
                  {/* Pickup Search */}
                  <div className="relative">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">ĐIỂM ĐÓN</label>
                    <div className="relative group">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                         {searchingPickup ? <Loader2 className="animate-spin text-blue-600 w-4 h-4" /> : <MapPin className="text-blue-500 w-4 h-4" />}
                      </div>
                      <input 
                        type="text"
                        placeholder="Nhập địa chỉ đón..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                        value={pickupInput}
                        onChange={(e) => setPickupInput(e.target.value)}
                      />
                      <button 
                        onClick={handleGetCurrentLocation}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                        title="Vị trí hiện tại"
                      >
                        <LocateFixed size={18} />
                      </button>
                    </div>
                    {pickupResults.length > 0 && !pickupResults.find(r => r.display_name === pickupInput) && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl mt-1 shadow-xl z-[200] max-h-48 overflow-y-auto">
                        {pickupResults.map((result, idx) => (
                          <button
                            key={`p-${idx}`}
                            className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0 truncate"
                            onClick={() => {
                              setPickup(result);
                              setPickupInput(result.display_name);
                              setPickupResults([]);
                            }}
                          >
                            {result.display_name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Destination Search */}
                  <div className="relative">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">ĐIỂM ĐẾN</label>
                    <div className="relative group">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        {searchingDest ? <Loader2 className="animate-spin text-blue-600 w-4 h-4" /> : <MapPin className="text-red-500 w-4 h-4" />}
                      </div>
                      <input 
                        type="text"
                        placeholder="Nhập địa chỉ đến..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                        value={destInput}
                        onChange={(e) => setDestInput(e.target.value)}
                      />
                    </div>
                    {destResults.length > 0 && !destResults.find(r => r.display_name === destInput) && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl mt-1 shadow-xl z-[200] max-h-48 overflow-y-auto">
                        {destResults.map((result, idx) => (
                          <button
                            key={`d-${idx}`}
                            className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0 truncate"
                            onClick={() => {
                              setDestination(result);
                              setDestInput(result.display_name);
                              setDestResults([]);
                            }}
                          >
                            {result.display_name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    id="calc-btn"
                    onClick={calculateRoute}
                    disabled={!pickup || !destination || loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-100 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <Calculator size={20} />}
                    XÁC NHẬN LỘ TRÌNH
                  </button>
                </div>
              </section>

              {/* Map Preview */}
              <section className="bg-slate-200 rounded-2xl overflow-hidden shadow-inner border border-slate-200 min-h-[350px] relative z-0">
                <MapContainer 
                  center={mapCenter} 
                  zoom={pickup ? 13 : 6} 
                  style={{ height: '100%', width: '100%' }}
                  maxBounds={vietnamBounds}
                  minZoom={5}
                  maxBoundsViscosity={1.0}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapUpdater center={mapCenter} zoom={pickup ? 13 : 6} />
                  
                  {pickup && (
                    <Marker position={[parseFloat(pickup.lat), parseFloat(pickup.lon)]}>
                      <Popup>Điểm đón: {pickup.display_name}</Popup>
                    </Marker>
                  )}
                  {destination && (
                    <Marker position={[parseFloat(destination.lat), parseFloat(destination.lon)]}>
                      <Popup>Điểm đến: {destination.display_name}</Popup>
                    </Marker>
                  )}
                  {routeCoords.length > 0 && <Polyline positions={routeCoords} color="blue" weight={5} opacity={0.6} />}
                </MapContainer>
                
                {!pickup && !destination && (
                  <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
                    <p className="bg-white/90 px-4 py-2 rounded-full text-xs font-bold text-slate-600 shadow-sm text-center">
                      Nhập địa chỉ để xem lộ trình trên bản đồ Việt Nam
                    </p>
                  </div>
                )}
              </section>
            </div>

            {/* Car Selection */}
            <section className="space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Car className="text-blue-600 w-5 h-5" />
                Chọn Loại Xe
              </h2>
              <div className="flex overflow-x-auto pb-4 gap-4 scrollbar-hide">
                {CAR_TYPES.map((car) => (
                  <button
                    key={car.id}
                    id={`car-${car.id}`}
                    onClick={() => setCarType(car.id)}
                    className={`flex-shrink-0 w-48 relative p-3 rounded-2xl border-2 transition-all text-left flex flex-col gap-2 ${
                      carType === car.id 
                      ? 'border-blue-600 bg-blue-50 ring-4 ring-blue-50/50' 
                      : 'border-white bg-white shadow-sm border-slate-100 hover:border-blue-200'
                    }`}
                  >
                    <div className="w-full aspect-[16/10] rounded-xl overflow-hidden bg-slate-100">
                      <img src={car.image} alt={car.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div>
                      <span className="font-bold text-sm block">{car.name}</span>
                    </div>
                    {carType === car.id && (
                      <div className="absolute top-2 right-2 bg-blue-600 text-white p-1 rounded-full shadow-lg">
                        <CheckCircle2 size={12} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column / Sidebar Info */}
          <div className="lg:col-span-4 space-y-6">
             <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col gap-6">
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3 uppercase text-xs tracking-widest text-center">Bản tin nhanh</h3>
                  <div className="space-y-4">
                    <div className="flex gap-4 items-start">
                      <div className="bg-orange-100 p-2 rounded-xl">
                        <Info className="text-orange-600 w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">Giá rẻ mỗi ngày</p>
                        <p className="text-xs text-slate-500 mt-1">Cam kết giá tốt nhất cho khách hàng đặt trước qua ứng dụng.</p>
                      </div>
                    </div>
                    <div className="flex gap-4 items-start">
                      <div className="bg-green-100 p-2 rounded-xl">
                        <CheckCircle2 className="text-green-600 w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">Dịch vụ 5 sao</p>
                        <p className="text-xs text-slate-500 mt-1">Xe đời mới, lái xe an toàn, phục vụ tận tâm.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-600 rounded-2xl p-6 text-white text-center shadow-xl shadow-blue-200 relative overflow-hidden group">
                  <Car className="absolute -right-4 -bottom-4 w-24 h-24 text-white/10 rotate-12 group-hover:scale-110 transition-transform" />
                  <p className="text-xs font-bold uppercase tracking-widest text-blue-100 mb-2">Hỗ trợ đặt xe 24/7</p>
                  <a href="tel:0918106058" className="text-xl font-black block mb-4 hover:scale-105 transition-transform">0918.106.058</a>
                  <p className="text-[10px] text-blue-200">Ghé thăm văn phòng tại: Lộc Thuận, Bến Tre</p>
                </div>
             </div>
          </div>
        </div>
      </main>

      {/* Quote Modal */}
      <AnimatePresence>
        {showQuote && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl relative"
            >
              <button 
                onClick={() => setShowQuote(false)}
                className="absolute top-6 right-6 p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors z-10"
              >
                <X size={20} className="text-slate-400" />
              </button>

              <div className="p-8">
                <div className="flex justify-center mb-6">
                  <div className="bg-blue-50 p-4 rounded-3xl relative">
                    <Car size={40} className="text-blue-600" />
                    <div className="absolute -top-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-white" />
                  </div>
                </div>
                
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">KẾT QUẢ TÍNH GIÁ</h2>
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-1">Dịch vụ Út Long Travel</p>
                </div>

                <div className="space-y-4 bg-slate-50 rounded-3xl p-6 mb-8 border border-slate-100">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Từ</span>
                    <span className="text-sm font-bold text-slate-800 line-clamp-1">{pickup?.display_name}</span>
                  </div>
                  <div className="flex flex-col gap-1 border-t border-slate-200/50 pt-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Đến</span>
                    <span className="text-sm font-bold text-slate-800 line-clamp-1">{destination?.display_name}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 border-t border-slate-200/50 pt-4 mt-2">
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Khoảng cách</span>
                      <p className="text-xl font-black text-slate-900">~{distance} km</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Loại xe</span>
                      <p className="text-xl font-black text-slate-900 truncate">{selectedCar.name}</p>
                    </div>
                  </div>

                  <div className="border-t-2 border-dashed border-slate-200 pt-4 mt-2 flex flex-col items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tổng cộng ước tính</span>
                    <span className="text-4xl font-black text-blue-600 tracking-tighter">{formatPrice(totalPrice)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <a 
                    href={`tel:0918106058`} 
                    className="flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-blue-100 active:scale-95"
                  >
                    <PhoneCall size={20} />
                    GỌI ĐẶT XE NGAY
                  </a>
                  <a 
                    href={`https://zalo.me/0918106058`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center justify-center gap-3 bg-green-500 hover:bg-green-600 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-green-100 active:scale-95"
                  >
                    <MessageCircle size={20} />
                    CHAT QUA ZALO
                  </a>
                  <button 
                    onClick={() => setShowQuote(false)}
                    className="flex items-center justify-center gap-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-4 rounded-2xl transition-all active:scale-95 mt-2"
                  >
                    <X size={18} />
                    ĐÓNG
                  </button>
                </div>
                
                <p className="mt-6 text-[10px] text-slate-400 font-medium text-center uppercase tracking-wider">
                  Giá đã bao gồm xăng, phí tài xế. Chưa bao gồm cầu đường.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats/Badge */}
      <div className="fixed bottom-6 right-6 hidden md:block">
        <div className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-200 shadow-lg flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Hệ thống đang hoạt động</span>
        </div>
      </div>
    </div>
  );
}

