import React, { useRef, useState, useEffect } from 'react';
import { RefreshCw, Camera, X } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  onClose: () => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  useEffect(() => {
    let currentStream: MediaStream | null = null;
    let isMounted = true;

    const startCamera = async (retryWithAnyCamera = false) => {
      try {
        if (currentStream) {
          currentStream.getTracks().forEach(track => track.stop());
        }

        const constraints: MediaStreamConstraints = retryWithAnyCamera 
          ? { video: true } 
          : { video: { facingMode: facingMode } };

        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (isMounted) {
          setStream(newStream);
          if (videoRef.current) {
            videoRef.current.srcObject = newStream;
          }
          setError('');
        }
      } catch (err: any) {
        console.error("Camera Error:", err);
        if (!retryWithAnyCamera && (err.name === 'OverconstrainedError' || err.name === 'NotFoundError' || err.name === 'NotReadableError')) {
           // Fallback to any available camera if specific facing mode fails
           console.log("Falling back to any available camera...");
           startCamera(true);
        } else {
           if (isMounted) setError('تعذر الوصول للكاميرا. يرجى التأكد من الصلاحيات.');
        }
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        const { videoWidth, videoHeight } = videoRef.current;
        canvasRef.current.width = videoWidth;
        canvasRef.current.height = videoHeight;
        context.drawImage(videoRef.current, 0, 0, videoWidth, videoHeight);
        
        const imageData = canvasRef.current.toDataURL('image/jpeg', 0.8);
        onCapture(imageData);
      }
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
      <div className="relative w-full h-full flex flex-col bg-black">
        {error ? (
          <div className="flex-1 flex flex-col items-center justify-center text-white px-4 text-center">
            <Camera size={48} className="mb-4 opacity-50" />
            <p className="mb-4">{error}</p>
            <button onClick={onClose} className="bg-white text-black px-6 py-2 rounded-full font-bold">إغلاق</button>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="flex-1 object-cover w-full h-full"
          />
        )}
        
        <canvas ref={canvasRef} className="hidden" />

        <div className="absolute top-4 right-4 z-10">
           <button onClick={onClose} className="text-white p-2 bg-black/40 rounded-full hover:bg-black/60 backdrop-blur-md"><X size={24} /></button>
        </div>

        {!error && (
          <div className="absolute bottom-0 left-0 right-0 p-8 pb-12 bg-gradient-to-t from-black/90 to-transparent flex justify-around items-center">
            <div className="w-12"></div> {/* Spacer */}
            
            <button 
              onClick={handleCapture}
              className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-red-600 hover:bg-red-700 transition-colors shadow-lg active:scale-95 transform"
              aria-label="Capture Photo"
            >
              <div className="w-16 h-16 rounded-full bg-white/20"></div>
            </button>

            <button 
              onClick={toggleCamera}
              className="w-12 h-12 flex items-center justify-center text-white rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition"
            >
              <RefreshCw size={24} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraCapture;