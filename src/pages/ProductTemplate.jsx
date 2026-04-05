import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import * as fabricModule from 'fabric';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Type, Image as ImageIcon, Save, Trash2, Layout, SlidersHorizontal, MousePointerClick, Download } from 'lucide-react';
import { buildImageUrl, extractError } from '../lib/utils';

const fabric = fabricModule.fabric || fabricModule;

export default function ProductTemplate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const [fabricCanvas, setFabricCanvas] = useState(null);
  const [activeObj, setActiveObj] = useState(null);
  
  // Custom design properties
  const [fillColor, setFillColor] = useState('#000000');
  const [textContent, setTextContent] = useState('');

  // Fetch product Data
  const { data, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const res = await api.get(`/products/${id}`);
      return res.data.data.product;
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (jsonTemplate) => {
      const fd = new FormData();
      fd.append('canvasTemplate', JSON.stringify(jsonTemplate));
      const response = await api.put(`/products/${id}`, fd, {
         headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    },
    onSuccess: () => toast.success('Premium Template saved successfully!'),
    onError: (err) => toast.error(extractError(err))
  });

  useEffect(() => {
    if (!data || !canvasRef.current || fabricCanvas) return;

    // Initialize Canvas with premium settings
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 650,
      height: 650,
      selection: true,
      selectionBorderColor: '#6366f1',
      selectionColor: 'rgba(99, 102, 241, 0.1)',
      preserveObjectStacking: true, // Keep object stacking order during selection
    });

    setFabricCanvas(canvas);

    // Setup Premium Object Controls
    fabric.Object.prototype.set({
      transparentCorners: false,
      cornerColor: '#ffffff',
      cornerStrokeColor: '#6366f1',
      borderColor: '#6366f1',
      cornerSize: 10,
      padding: 10,
      cornerStyle: 'circle'
    });

    if (data.canvasTemplate) {
      canvas.loadFromJSON(data.canvasTemplate, () => {
        canvas.renderAll();
      });
    } else {
      // Load Base Image
      const mainImage = data.thumbnailImage || data.images?.[0];
      if (mainImage) {
        const url = buildImageUrl(mainImage);
        fabric.Image.fromURL(url, (img) => {
          const scale = Math.min(650 / img.width, 650 / img.height);
          img.set({
              selectable: false,
              evented: false, 
              originX: 'center', 
              originY: 'center',
              left: 325,
              top: 325
          });
          img.scale(scale);
          canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
        }, { crossOrigin: 'anonymous' });
      } else {
        // Fallback transparent bg if no image
        canvas.setBackgroundColor('#f1f5f9', canvas.renderAll.bind(canvas));
      }
    }

    // Event Listeners for UI state syncing
    canvas.on('selection:created', (e) => updatePropertiesPanel(e.selected[0]));
    canvas.on('selection:updated', (e) => updatePropertiesPanel(e.selected[0]));
    canvas.on('selection:cleared', () => setActiveObj(null));

    const handleKeydown = (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
         const obj = canvas.getActiveObject();
         if (obj && !obj.isEditing) {
             canvas.remove(obj);
             canvas.discardActiveObject();
             canvas.renderAll();
         }
      }
    };
    window.addEventListener('keydown', handleKeydown);

    return () => {
      window.removeEventListener('keydown', handleKeydown);
      canvas.dispose();
    };
  }, [data]);

  const updatePropertiesPanel = (obj) => {
    setActiveObj(obj);
    if (obj.type === 'i-text' || obj.type === 'text') {
       setFillColor(obj.fill);
       setTextContent(obj.text);
    }
  };

  const addTextPlaceholder = () => {
    if (!fabricCanvas) return;
    const text = new fabric.IText('Double Click to Edit', {
      left: 325,
      top: 325,
      fontFamily: 'Inter, sans-serif',
      fontWeight: 'bold',
      fill: '#1e293b',
      fontSize: 28,
      originX: 'center',
      originY: 'center',
      customType: 'placeholder_text',
    });
    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
    fabricCanvas.renderAll();
  };

  const addImagePlaceholder = () => {
    if (!fabricCanvas) return;
    const rect = new fabric.Rect({
      left: 325,
      top: 325,
      width: 200,
      height: 200,
      fill: 'rgba(99, 102, 241, 0.1)',
      stroke: '#6366f1',
      strokeWidth: 2,
      strokeDashArray: [6, 6],
      originX: 'center',
      originY: 'center',
    });
    const text = new fabric.Text('PHOTO UPLOAD ZONE', {
      fontSize: 16,
      fill: '#6366f1',
      fontWeight: 'bold',
      originX: 'center',
      originY: 'center',
      left: 325,
      top: 325,
    });
    const group = new fabric.Group([rect, text], {
      left: 325,
      top: 325,
      originX: 'center',
      originY: 'center',
      customType: 'placeholder_image'
    });
    fabricCanvas.add(group);
    fabricCanvas.setActiveObject(group);
    fabricCanvas.renderAll();
  };

  const handlePropertyChange = (key, value) => {
    const obj = fabricCanvas.getActiveObject();
    if (!obj) return;
    obj.set(key, value);
    fabricCanvas.renderAll();
    
    // Sync React state
    if (key === 'fill') setFillColor(value);
    if (key === 'text') setTextContent(value);
  };

  const handleSave = () => {
    if (!fabricCanvas) return;
    const json = fabricCanvas.toJSON(['customType', 'selectable', 'evented']);
    saveMutation.mutate(json);
  };

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: 'auto' }} /></div>;

  return (
    <div style={{ paddingBottom: 40, minHeight: 'calc(100vh - 80px)' }}>
      {/* Sleek Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, padding: '24px 32px', background: 'white', borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <button className="btn btn-ghost btn-icon" onClick={() => navigate('/products')} style={{ background: 'var(--bg-hover)' }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: '#0f172a' }}>Studio Designer</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Creating layout for: <strong style={{color: '#6366f1'}}>{data?.name}</strong></p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saveMutation.isPending} style={{ padding: '0 24px', height: 44, borderRadius: 22, boxShadow: '0 8px 16px rgba(99, 102, 241, 0.2)' }}>
             {saveMutation.isPending ? <div className="spinner" style={{width: 14, height: 14, borderWidth: 2}}/> : <Save size={18} />}
             <span style={{ marginLeft: 8, fontWeight: 600 }}>Publish Template</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, padding: '0 16px', height: 750 }}>
        
        {/* Left Toolbar (Glassmorphism inspired) */}
        <div style={{ width: 280, background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(12px)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.8)', boxShadow: '0 8px 32px rgba(0,0,0,0.05)', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
           <h3 style={{ fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: '#94a3b8', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
             <Layout size={16} /> Elements
           </h3>
           
           <button style={toolBtnStyle} onClick={addTextPlaceholder}>
              <div style={iconBoxStyle}><Type size={20} color="#6366f1" /></div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>Text Field</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>Customizable user text</div>
              </div>
           </button>
           
           <button style={toolBtnStyle} onClick={addImagePlaceholder}>
              <div style={iconBoxStyle}><ImageIcon size={20} color="#10b981" /></div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>Photo Zone</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>Drag & drop area</div>
              </div>
           </button>

           <div style={{ background: '#f1f5f9', padding: 16, borderRadius: 12, fontSize: 12, color: '#475569', marginTop: 'auto', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontWeight: 700, color: '#0f172a' }}>
                 <MousePointerClick size={16} /> How it works
              </div>
              Define zones where your customers can add their own deeply personalized content. Drag to position, pull corners to resize.
           </div>
        </div>

        {/* Center Canvas Workspace */}
        <div style={{ flex: 1, background: 'url("data:image/svg+xml;utf8,<svg width=\'20\' height=\'20\' xmlns=\'http://www.w3.org/2000/svg\'><rect width=\'20\' height=\'20\' fill=\'none\'/><rect width=\'10\' height=\'10\' fill=\'%23e2e8f0\'/><rect x=\'10\' y=\'10\' width=\'10\' height=\'10\' fill=\'%23e2e8f0\'/></svg>")', borderRadius: 20, boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
            <div style={{ boxShadow: '0 24px 48px rgba(0,0,0,0.15)', background: 'white', borderRadius: 8, overflow: 'hidden' }}>
                 <canvas ref={canvasRef} />
            </div>
        </div>

        {/* Right Properties Panel */}
        <div style={{ width: 300, background: 'white', borderRadius: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.05)', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 8 }}>
             <SlidersHorizontal size={16} /> Properties
          </h3>

          {!activeObj ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
               <MousePointerClick size={40} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
               <div style={{ fontSize: 13, fontWeight: 500 }}>Select an element on the canvas to edit its properties</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
               {/* Show Text Controls if text */}
               {(activeObj.type === 'i-text' || activeObj.type === 'text') && (
                 <>
                   <div>
                     <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6, display: 'block' }}>Text Content</label>
                     <input 
                       className="form-input" 
                       value={textContent} 
                       onChange={(e) => handlePropertyChange('text', e.target.value)} 
                     />
                   </div>
                   <div>
                     <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6, display: 'block' }}>Text Color</label>
                     <div style={{ display: 'flex', gap: 8 }}>
                       <input 
                         type="color" 
                         value={fillColor} 
                         onChange={(e) => handlePropertyChange('fill', e.target.value)}
                         style={{ width: 44, height: 44, padding: 0, border: 'none', borderRadius: 8, cursor: 'pointer' }}
                       />
                       <input 
                         className="form-input" 
                         value={fillColor}
                         onChange={(e) => handlePropertyChange('fill', e.target.value)}
                         style={{ flex: 1 }}
                       />
                     </div>
                   </div>
                 </>
               )}

               <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #e2e8f0' }}>
                 <button 
                   onClick={() => {
                     fabricCanvas.remove(activeObj);
                     fabricCanvas.discardActiveObject();
                   }}
                   style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1px solid #ef4444', background: '#fef2f2', color: '#ef4444', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                 >
                   <Trash2 size={16} /> Delete Element
                 </button>
               </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

const toolBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  padding: '16px',
  background: 'white',
  border: '1px solid #e2e8f0',
  borderRadius: 16,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
};

const iconBoxStyle = {
  width: 48,
  height: 48,
  borderRadius: 12,
  background: '#f8fafc',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};
