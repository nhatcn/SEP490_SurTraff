import { useState, useEffect, useRef } from 'react';

interface VideoThumbnailGeneratorProps {
  streamUrl: string;
  onThumbnailCapture: (thumbnailUrl: string) => void;
  defaultThumbnail: string;
}

const VideoThumbnailGenerator: React.FC<VideoThumbnailGeneratorProps> = ({
  streamUrl,
  onThumbnailCapture,
  defaultThumbnail
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    if (!streamUrl) return;
    
    setIsCapturing(true);
    setError(null);
    
    const captureFirstFrame = () => {
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw the video frame to canvas
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Convert canvas to data URL
          try {
            const thumbnailUrl = canvas.toDataURL('image/jpeg');
            onThumbnailCapture(thumbnailUrl);
          } catch (err) {
            console.error('Error converting canvas to data URL:', err);
            setError('Failed to capture thumbnail');
          }
        }
        
        // Stop the video
        video.pause();
        if (video.srcObject) {
          const tracks = (video.srcObject as MediaStream).getTracks();
          tracks.forEach(track => track.stop());
          video.srcObject = null;
        }
      }
      
      setIsCapturing(false);
    };

    const video = videoRef.current;
    if (video) {
      video.onloadeddata = captureFirstFrame;
      
      // Handle errors
      video.onerror = () => {
        setError('Failed to load video stream');
        setIsCapturing(false);
        onThumbnailCapture(defaultThumbnail);
      };
      
      // Set timeout in case video never loads
      const timeout = setTimeout(() => {
        if (isCapturing) {
          setError('Timeout while loading video stream');
          setIsCapturing(false);
          onThumbnailCapture(defaultThumbnail);
        }
      }, 10000); // 10 second timeout
      
      return () => clearTimeout(timeout);
    }
  }, [streamUrl, onThumbnailCapture, defaultThumbnail]);

  // For HTTP streams (HLS, DASH, etc.)
  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 360;
    
    // Draw the video frame to canvas
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to data URL
      try {
        const thumbnailUrl = canvas.toDataURL('image/jpeg');
        onThumbnailCapture(thumbnailUrl);
      } catch (err) {
        console.error('Error converting canvas to data URL:', err);
        setError('Failed to capture thumbnail');
      }
    }
  };

  return (
    <div className="relative">
      {/* Hidden video element for capturing thumbnail */}
      <video 
        ref={videoRef}
        className="hidden"
        src={streamUrl.startsWith('rtsp://') ? '' : streamUrl}
        crossOrigin="anonymous"
        autoPlay
        muted
        playsInline
      />
      
      {/* Hidden canvas for processing the thumbnail */}
      <canvas ref={canvasRef} className="hidden" />
      
      {isCapturing ? (
        <div className="flex items-center text-sm text-gray-600">
          <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Capturing thumbnail...
        </div>
      ) : error ? (
        <div className="text-sm text-red-600">{error}</div>
      ) : streamUrl ? (
        <div className="flex items-center mt-2">
          <button
            onClick={handleCapture}
            className="text-sm bg-blue-600 text-white px-3 py-1 rounded"
            type="button"
          >
            Manually Capture Thumbnail
          </button>
          <div className="text-xs ml-2 text-gray-500">
            (If automatic capture fails)
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default VideoThumbnailGenerator;