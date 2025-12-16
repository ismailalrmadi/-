import React, { useEffect, useState, useRef } from 'react';
import { X, RefreshCw, AlertCircle, Camera } from 'lucide-react';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onClose }) => {
  const [error, setError] = useState<string>('');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const scannerRef = useRef<any>(null);
  const isScanning = useRef<boolean>(false);

  useEffect(() => {
    // Accessing global script variable manually
    const Html5Qrcode = (window as any).Html5Qrcode;

    if (!Html5Qrcode) {
      setError("المكتبة غير محملة. تأكد من الاتصال بالإنترنت.");
      return;
    }

    const scannerId = "reader";
    const html5QrCode = new Html5Qrcode(scannerId);
    scannerRef.current = html5QrCode;

    const startScanning = async () => {
      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          },
          (decodedText: string) => {
            if (isScanning.current) {
              isScanning.current = false;
              // Stop scanning immediately upon success
              html5QrCode.stop().then(() => {
                onScanSuccess(decodedText);
              }).catch((err: any) => {
                console.error("Failed to stop scanner", err);
                onScanSuccess(decodedText);
              });
            }
          },
          (errorMessage: string) => {
            // ignore scan errors (no qr code found in frame)
          }
        );
        isScanning.current = true;
        setPermissionGranted(true);
      } catch (err: any) {
        console.error("Error starting scanner:", err);
        if (typeof err === 'string' && err.includes("NotAllowedError")) {
             setError("يرجى السماح باستخدام الكاميرا لمسح الباركود.");
        } else {
             setError("تعذر تشغيل الكاميرا. تأكد من الصلاحيات أو حاول مرة أخرى.");
        }
      }
    };

    startScanning();

    return () => {
      isScanning.current = false;
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
           scannerRef.current.stop().catch((err: any) => console.log("Stop failed during cleanup", err));
        }
        // scannerRef.current.clear(); // clear() is implicit in stop() mostly, or causes UI removal
      }
    };
  }, [onScanSuccess]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
        <div className="bg-primary p-4 flex justify-between items-center text-white shrink-0 z-10">
          <h3 className="font-bold flex items-center gap-2">
            <Camera size={20} />
            مسح باركود الحضور
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full">
            <X size={24} />
          </button>
        </div>
        
        <div className="relative bg-black flex-1 flex items-center justify-center overflow-hidden">
          <div id="reader" className="w-full h-full"></div>
          
          {!permissionGranted && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white z-0">
              <div className="text-center p-4 animate-pulse">
                <RefreshCw size={32} className="mx-auto mb-2 animate-spin" />
                <p>جاري تشغيل الكاميرا...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10 p-6">
              <div className="text-center text-red-500 bg-white p-6 rounded-xl shadow-lg max-w-xs">
                <AlertCircle size={48} className="mx-auto mb-4" />
                <h4 className="font-bold text-lg mb-2 text-gray-800">تنبيه</h4>
                <p>{error}</p>
                <button 
                  onClick={onClose}
                  className="mt-4 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 w-full"
                >
                  إغلاق
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className="p-4 bg-gray-50 text-center shrink-0">
           <p className="text-sm text-gray-500">
             ضع رمز QR داخل المربع للمسح التلقائي
           </p>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;