"use client";
import { useState, useEffect, useRef } from 'react';
import { Upload, Image as ImageIcon, ZoomIn, ZoomOut, Download, RefreshCw, Info } from 'lucide-react';

export default function ImageCompressionExplorer() {
  const [originalImage, setOriginalImage] = useState(null);
  const [compressedImage, setCompressedImage] = useState(null);
  const [compressionType, setCompressionType] = useState('jpeg');
  const [quality, setQuality] = useState(80);
  const [originalSize, setOriginalSize] = useState(0);
  const [compressedSize, setCompressedSize] = useState(0);
  const [compressionRatio, setCompressionRatio] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [showInfo, setShowInfo] = useState(false);
  const [originalObjectURL, setOriginalObjectURL] = useState(null);
  const [compressedObjectURL, setCompressedObjectURL] = useState(null);
  const canvasRef = useRef(null);
  const MAX_DIMENSION = 1920; // Maximum image dimension for processing

  const compressionTypes = [
    { id: 'jpeg', name: 'JPEG', description: 'Lossy compression optimized for photographs' },
    { id: 'webp', name: 'WebP', description: 'Modern format with superior compression' },
    { id: 'quantization', name: 'Color Quantization', description: 'Reduces the number of colors' },
    { id: 'dct', name: 'DCT Transform', description: 'Discrete Cosine Transform visualization' }
  ];

  // Clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      if (originalObjectURL) URL.revokeObjectURL(originalObjectURL);
      if (compressedObjectURL) URL.revokeObjectURL(compressedObjectURL);
    };
  }, []);

  // Clean up previous compressed image URL when creating a new one
  useEffect(() => {
    return () => {
      if (compressedObjectURL) {
        URL.revokeObjectURL(compressedObjectURL);
      }
    };
  }, [compressedImage]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Clean up previous URL if it exists
    if (originalObjectURL) {
      URL.revokeObjectURL(originalObjectURL);
    }

    const objectURL = URL.createObjectURL(file);
    setOriginalObjectURL(objectURL);

    const img = new Image();
    img.onload = () => {
      setOriginalImage(img);
      setOriginalSize(file.size);
      compressImage(img);
    };
    img.src = objectURL;
  };

  const resizeImageIfNeeded = (image) => {
    const canvas = document.createElement('canvas');
    let { width, height } = image;
    
    // Resize large images to improve performance
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      if (width > height) {
        height = Math.round((height / width) * MAX_DIMENSION);
        width = MAX_DIMENSION;
      } else {
        width = Math.round((width / height) * MAX_DIMENSION);
        height = MAX_DIMENSION;
      }
    }
    
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, width, height);
    
    return { canvas, ctx, width, height };
  };

  const compressImage = (image) => {
    setIsLoading(true);
    
    setTimeout(() => {
      // First resize the image if needed
      const { canvas, ctx, width, height } = resizeImageIfNeeded(image);
      
      // Clean up previous URL if it exists
      if (compressedObjectURL) {
        URL.revokeObjectURL(compressedObjectURL);
      }
      
      if (compressionType === 'quantization') {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        // Calculate how many color levels to use based on quality
        // Lower quality = fewer colors
        const colorLevels = Math.max(2, Math.round(quality / 4)); // 1-25 colors
        const factor = Math.floor(256 / colorLevels);
        
        // Create color palette first
        const colorMap = new Map();
        
        for (let i = 0; i < data.length; i += 4) {
          // Round each RGB channel to the nearest palette color
          const r = Math.floor(data[i] / factor) * factor;
          const g = Math.floor(data[i + 1] / factor) * factor;
          const b = Math.floor(data[i + 2] / factor) * factor;
          
          // Use color key to store in map
          const colorKey = `${r},${g},${b}`;
          colorMap.set(colorKey, {r, g, b});
          
          // Apply the quantized color
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
        }
        
        ctx.putImageData(imageData, 0, 0);
        console.log(`Reduced to ${colorMap.size} colors`);
        
        // Use high compression format for fewer colors
        const format = colorMap.size < 256 ? 'image/png' : 'image/jpeg';
        const compressionQuality = format === 'image/jpeg' ? 0.9 : undefined;
        
        canvas.toBlob((blob) => {
          const objectURL = URL.createObjectURL(blob);
          setCompressedImage(objectURL);
          setCompressedObjectURL(objectURL);
          setCompressedSize(blob.size);
          setCompressionRatio((originalSize / blob.size).toFixed(2));
          setIsLoading(false);
        }, format, compressionQuality);
      } else if (compressionType === 'dct') {
        // Simulate DCT-like effect (blocks similar to JPEG artifacts)
        // Block size inversely proportional to quality
        const blockSize = Math.max(2, Math.round((100 - quality) / 10 + 1));
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        for (let y = 0; y < height; y += blockSize) {
          for (let x = 0; x < width; x += blockSize) {
            let r = 0, g = 0, b = 0, count = 0;
            
            // Calculate average color for block
            for (let by = 0; by < blockSize && y + by < height; by++) {
              for (let bx = 0; bx < blockSize && x + bx < width; bx++) {
                const idx = 4 * ((y + by) * width + (x + bx));
                r += data[idx];
                g += data[idx + 1];
                b += data[idx + 2];
                count++;
              }
            }
            
            r = Math.floor(r / count);
            g = Math.floor(g / count);
            b = Math.floor(b / count);
            
            // Apply block color
            for (let by = 0; by < blockSize && y + by < height; by++) {
              for (let bx = 0; bx < blockSize && x + bx < width; bx++) {
                const idx = 4 * ((y + by) * width + (x + bx));
                data[idx] = r;
                data[idx + 1] = g;
                data[idx + 2] = b;
              }
            }
          }
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        // Using JPEG for DCT visualization as it's a JPEG-like effect
        canvas.toBlob((blob) => {
          const objectURL = URL.createObjectURL(blob);
          setCompressedImage(objectURL);
          setCompressedObjectURL(objectURL);
          setCompressedSize(blob.size);
          setCompressionRatio((originalSize / blob.size).toFixed(2));
          setIsLoading(false);
        }, 'image/jpeg', quality / 100);
      } else {
        // JPEG or WebP compression
        const format = compressionType === 'webp' ? 'image/webp' : 'image/jpeg';
        canvas.toBlob((blob) => {
          const objectURL = URL.createObjectURL(blob);
          setCompressedImage(objectURL);
          setCompressedObjectURL(objectURL);
          setCompressedSize(blob.size);
          setCompressionRatio((originalSize / blob.size).toFixed(2));
          setIsLoading(false);
        }, format, quality / 100);
      }
    }, 500);
  };

  useEffect(() => {
    if (originalImage) {
      compressImage(originalImage);
    }
  }, [compressionType, quality]);

  const downloadCompressedImage = () => {
    if (!compressedImage) return;
    
    const link = document.createElement('a');
    link.href = compressedImage;
    
    // Set appropriate extension based on compression type
    let extension = 'jpg';
    if (compressionType === 'webp') {
      extension = 'webp';
    } else if (compressionType === 'quantization') {
      // For quantization, the format can be either PNG or JPEG
      // We'll use the extension based on the MIME type in the URL
      extension = compressedImage.includes('image/png') ? 'png' : 'jpg';
    }
    
    link.download = `compressed-image.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900 text-white">
      {/* Header */}
      <header className="p-6 text-center">
        <h1 className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
          Image Compression Explorer
        </h1>
        <p className="text-blue-200 max-w-2xl mx-auto">
          Visualize how different compression algorithms affect image quality and file size
        </p>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 flex flex-col md:flex-row gap-6">
        {/* Controls Panel */}
        <div className="w-full md:w-64 bg-indigo-800/40 backdrop-blur-sm p-6 rounded-xl shadow-xl border border-indigo-700/50 flex flex-col gap-6">
          {/* Upload Section */}
          <div className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold text-blue-200">Upload Image</h2>
            <label className="flex items-center justify-center h-32 border-2 border-dashed border-indigo-500/50 rounded-lg hover:border-indigo-400 transition-colors cursor-pointer bg-indigo-800/30">
              <div className="flex flex-col items-center gap-2 text-center">
                <Upload size={28} className="text-blue-300" />
                <span className="text-sm text-blue-200">Click to select image</span>
              </div>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          </div>

          {/* Compression Type */}
          <div className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold text-blue-200">Compression Type</h2>
            <div className="flex flex-col gap-2">
              {compressionTypes.map(type => (
                <button
                  key={type.id}
                  onClick={() => setCompressionType(type.id)}
                  className={`px-4 py-2 rounded-lg text-left transition-colors ${
                    compressionType === type.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-indigo-800/40 hover:bg-indigo-700/40 text-blue-100'
                  }`}
                >
                  {type.name}
                </button>
              ))}
            </div>
          </div>

          {/* Quality Slider */}
          <div className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold text-blue-200">Quality ({quality}%)</h2>
            <input
              type="range"
              min="1"
              max="100"
              value={quality}
              onChange={(e) => setQuality(parseInt(e.target.value))}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-xs text-blue-300">
              <span>Lower size</span>
              <span>Higher quality</span>
            </div>
          </div>

          {/* Stats */}
          {originalImage && (
            <div className="mt-auto pt-4 border-t border-indigo-700/50">
              <h3 className="text-lg font-semibold text-blue-200 mb-3">Image Stats</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-300">Original:</span>
                  <span className="text-white">{formatSize(originalSize)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-300">Compressed:</span>
                  <span className="text-white">{formatSize(compressedSize)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-300">Reduction:</span>
                  <span className={`${compressedSize < originalSize ? 'text-green-300' : 'text-red-300'}`}>
                    {compressedSize < originalSize 
                      ? `${Math.round((1 - compressedSize / originalSize) * 100)}%` 
                      : `-${Math.round((compressedSize / originalSize - 1) * 100)}%`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-300">Ratio:</span>
                  <span className="text-white">
                    {compressedSize < originalSize 
                      ? `${compressionRatio}:1` 
                      : `1:${(compressedSize / originalSize).toFixed(2)}`}
                  </span>
                </div>
              </div>
              
              <button
                onClick={downloadCompressedImage}
                disabled={!compressedImage}
                className="mt-4 w-full py-2 bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Download size={16} />
                <span>Download</span>
              </button>
            </div>
          )}
        </div>

        {/* Image Display */}
        <div className="flex-1 flex flex-col">
          {originalImage ? (
            <div className="relative flex-1 flex flex-col gap-6">
              {/* Toolbar */}
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <button
                    onClick={handleZoomIn}
                    className="p-2 bg-indigo-800/40 rounded-lg hover:bg-indigo-700/40 transition-colors"
                  >
                    <ZoomIn size={18} />
                  </button>
                  <button
                    onClick={handleZoomOut} 
                    className="p-2 bg-indigo-800/40 rounded-lg hover:bg-indigo-700/40 transition-colors"
                  >
                    <ZoomOut size={18} />
                  </button>
                  <span className="flex items-center px-2 text-sm text-blue-200">{Math.round(zoom * 100)}%</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowInfo(!showInfo)}
                    className={`p-2 rounded-lg transition-colors ${
                      showInfo 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-indigo-800/40 hover:bg-indigo-700/40'
                    }`}
                  >
                    <Info size={18} />
                  </button>
                </div>
              </div>

              {/* Info Panel */}
              {showInfo && (
                <div className="bg-indigo-800/40 backdrop-blur-sm p-4 rounded-xl border border-indigo-700/50 mb-4">
                  <h3 className="font-semibold mb-2 text-lg">{compressionTypes.find(t => t.id === compressionType)?.name}</h3>
                  <p className="text-blue-200 text-sm">{compressionTypes.find(t => t.id === compressionType)?.description}</p>
                  {compressionType === 'jpeg' && (
                    <p className="text-blue-200 text-sm mt-2">
                      JPEG uses discrete cosine transform (DCT) to convert spatial image data into frequency coefficients, 
                      then quantizes these coefficients to achieve compression. Lower quality settings discard more high-frequency details.
                    </p>
                  )}
                  {compressionType === 'webp' && (
                    <p className="text-blue-200 text-sm mt-2">
                      WebP offers better compression than JPEG while maintaining similar quality. It uses predictive coding 
                      to encode image blocks and supports both lossy and lossless compression.
                    </p>
                  )}
                  {compressionType === 'quantization' && (
                    <p className="text-blue-200 text-sm mt-2">
                      Color quantization reduces the number of colors in an image, which enables more efficient compression.
                      Lower quality settings use fewer colors, making the compressed file smaller but less detailed.
                    </p>
                  )}
                  {compressionType === 'dct' && (
                    <p className="text-blue-200 text-sm mt-2">
                      This visualization shows how block-based DCT compression works by averaging pixel values within blocks.
                      Lower quality settings use larger blocks, creating the characteristic "blocky" JPEG artifacts.
                    </p>
                  )}
                </div>
              )}

              {/* Images Comparison */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                <div className="h-full flex flex-col">
                  <div className="bg-indigo-800/40 backdrop-blur-sm p-3 rounded-t-xl border border-indigo-700/50 border-b-0 flex justify-between items-center">
                    <h3 className="font-semibold">Original</h3>
                    <span className="text-sm text-blue-300">{formatSize(originalSize)}</span>
                  </div>
                  <div className="flex-1 overflow-auto bg-black/30 rounded-b-xl border border-indigo-700/50">
                    <div className="relative h-full flex items-center justify-center p-4">
                      <div style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }} className="transition-transform">
                        <img 
                          src={originalObjectURL} 
                          alt="Original" 
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="h-full flex flex-col">
                  <div className="bg-indigo-800/40 backdrop-blur-sm p-3 rounded-t-xl border border-indigo-700/50 border-b-0 flex justify-between items-center">
                    <h3 className="font-semibold">Compressed</h3>
                    <span className="text-sm text-blue-300">{formatSize(compressedSize)}</span>
                  </div>
                  <div className="flex-1 overflow-auto bg-black/30 rounded-b-xl border border-indigo-700/50">
                    <div className="relative h-full flex items-center justify-center p-4">
                      {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                          <RefreshCw size={32} className="text-blue-400 animate-spin" />
                        </div>
                      ) : (
                        <div style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }} className="transition-transform">
                          <img 
                            src={compressedImage} 
                            alt="Compressed" 
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-indigo-800/20 rounded-xl border border-indigo-700/30">
              <div className="text-center p-8">
                <div className="mx-auto w-16 h-16 rounded-full bg-indigo-800/40 flex items-center justify-center mb-4">
                  <ImageIcon size={32} className="text-blue-300" />
                </div>
                <h2 className="text-xl font-semibold mb-2">No Image Selected</h2>
                <p className="text-blue-200 mb-4">Upload an image to start exploring compression techniques</p>
                <label className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg cursor-pointer inline-flex items-center gap-2 transition-colors">
                  <Upload size={18} />
                  <span>Select Image</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-blue-300 text-sm">
        <p>Image Compression Explorer · Educational Tool · {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}