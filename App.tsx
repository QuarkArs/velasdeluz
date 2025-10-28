
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { getSalesbotResponse } from './services/geminiService';

// --- MOCK DATA & TYPES ---

interface Product {
  id: number;
  name: string;
  price: number;
  description: string;
  image: string;
}

interface CartItem extends Product {
  quantity: number;
  color: string;
  aroma: string;
  customId: string;
}

interface OwnerOrderDetails {
  customer: { name: string; phone: string; address: string };
  items: CartItem[];
  total: string;
  isPresencial: boolean;
}

// --- PERSONALIZACIÓN: PRODUCTOS ---
// Edita, añade o elimina productos en esta lista.
const mockProducts: Product[] = [
  {
    id: 1,
    name: 'Vela de gnomo',
    price: 5,
    description: 'Bonita y de diversos colores. ¡Elige tu combinación favorita!',
    image: 'https://vento.barcelona/cdn/shop/files/Mesadetrabajo2.png?v=1731175843&width=480'
  },
  {
    id: 2,
    name: 'Vela de árbol',
    price: 5,
    description: 'Crea un ambiente navideño y acogedor con su cálida luz. Personalízala a tu gusto.',
    image: 'https://mantelyservilleta.com/cdn/shop/products/VelaaromaticaPINONAVIDENOMilkyCo-MantelyServilleta_1024x.jpg?v=1667527647'
  },
  {
    id: 3,
    name: 'Vela de Cítricos Energizante',
    price: 28,
    description: 'Despierta tus sentidos con una vibrante mezcla de limón y naranja. Ideal para empezar el día con energía.',
    image: 'https://storage.googleapis.com/aistudio-public/gallery/candle-store/citrus-candle.png'
  },
  {
    id: 4,
    name: 'Vela de Sándalo Místico',
    price: 30,
    description: 'Un aroma amaderado y terroso que promueve la meditación y la tranquilidad en tu espacio.',
    image: 'https://storage.googleapis.com/aistudio-public/gallery/candle-store/sandalwood-candle.png'
  }
];

// --- PERSONALIZACIÓN: OPCIONES DE VELAS ---
// Añade o edita las opciones de personalización aquí.
const CUSTOMIZATION_OPTIONS = {
  colors: ['Azul', 'Verde', 'Naranja', 'Amarillo'],
  aromas: ['Lavanda', 'Limón', 'Romero', 'Amapola'],
};

// --- SVG ICONS ---
const CartIcon = ({ itemCount }: { itemCount: number }) => (
    <div className="relative">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-stone-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        {itemCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {itemCount}
            </span>
        )}
    </div>
);

const ChatIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
);

export default function App() {
  const [products] = useState<Product[]>(mockProducts);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [customization, setCustomization] = useState<{ color: string; aroma: string }>({ color: '', aroma: '' });

  const [chatMessages, setChatMessages] = useState<{ sender: 'user' | 'ai'; text: string }[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);

  // State for new features
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [checkoutForm, setCheckoutForm] = useState({ name: '', phone: '', address: '' });
  const [isPresencial, setIsPresencial] = useState(false);
  const [orderConfirmation, setOrderConfirmation] = useState<string | null>(null);
  const [ownerOrderDetails, setOwnerOrderDetails] = useState<OwnerOrderDetails | null>(null);
  const [itemsForCheckout, setItemsForCheckout] = useState<CartItem[]>([]);
  const [isCheckingOutFromCart, setIsCheckingOutFromCart] = useState(false);
  
  const cartItemCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2), [cart]);
  const checkoutTotal = useMemo(() => itemsForCheckout.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2), [itemsForCheckout]);

  const handleProductClick = useCallback((product: Product) => {
    setSelectedProduct(product);
    setCustomization({ color: '', aroma: '' });
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedProduct(null);
  }, []);

  const handleCustomizationSelect = useCallback((type: 'color' | 'aroma', value: string) => {
    setCustomization(prev => ({ ...prev, [type]: value }));
  }, []);

  const handleAddToCart = useCallback(() => {
    if (!selectedProduct || !customization.color || !customization.aroma) return;

    const customId = `${selectedProduct.id}-${customization.color}-${customization.aroma}`;

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.customId === customId);
      if (existingItem) {
        return prevCart.map(item =>
          item.customId === customId ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, {
        ...selectedProduct,
        quantity: 1,
        color: customization.color,
        aroma: customization.aroma,
        customId: customId
      }];
    });
    handleCloseModal();
  }, [selectedProduct, customization, handleCloseModal]);

  const handleUpdateQuantity = useCallback((customId: string, amount: number) => {
    setCart(prevCart => {
      const updatedCart = prevCart.map(item =>
        item.customId === customId ? { ...item, quantity: item.quantity + amount } : item
      );
      return updatedCart.filter(item => item.quantity > 0);
    });
  }, []);

  const handleChatSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const newUserMessage = { sender: 'user' as const, text: chatInput };
    setChatMessages(prev => [...prev, newUserMessage]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const aiResponse = await getSalesbotResponse(chatInput, products);
      const newAiMessage = { sender: 'ai' as const, text: aiResponse };
      setChatMessages(prev => [...prev, newAiMessage]);
    } catch (error) {
      const errorMessage = { sender: 'ai' as const, text: '¡Ups! Algo salió mal.' };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  }, [chatInput, isChatLoading, products]);
  
  const isCustomizationComplete = useMemo(() => !!customization.color && !!customization.aroma, [customization]);

  // --- NEW FEATURE LOGIC ---

  const isCheckoutFormValid = useMemo(() => {
    return checkoutForm.name.trim() !== '' &&
           checkoutForm.phone.trim() !== '' &&
           checkoutForm.address.trim() !== '';
  }, [checkoutForm]);

  const handleCheckoutFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCheckoutForm(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    setItemsForCheckout(cart);
    setIsCheckingOutFromCart(true);
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleCloseCheckout = useCallback(() => {
    setIsCheckoutOpen(false);
    setCheckoutForm({ name: '', phone: '', address: '' });
    setIsPresencial(false);
    setItemsForCheckout([]);
    setIsCheckingOutFromCart(false);
  }, []);

  const handleOrderSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!isCheckoutFormValid) return;

    setOwnerOrderDetails({
      customer: checkoutForm,
      items: itemsForCheckout,
      total: checkoutTotal,
      isPresencial: isPresencial,
    });
    
    setOrderConfirmation("¡Gracias! Tu pedido ha sido recibido con éxito.");
    
    if (isCheckingOutFromCart) {
        setCart([]);
    }
    handleCloseCheckout();
  }, [itemsForCheckout, checkoutTotal, checkoutForm, isCheckoutFormValid, isPresencial, handleCloseCheckout, isCheckingOutFromCart]);


  useEffect(() => {
    if (orderConfirmation) {
      const timer = setTimeout(() => setOrderConfirmation(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [orderConfirmation]);

  const handleOrderNow = useCallback(() => {
    if (!selectedProduct || !customization.color || !customization.aroma) return;
    const customId = `${selectedProduct.id}-${customization.color}-${customization.aroma}`;
    
    const directOrderItem: CartItem = {
      ...selectedProduct,
      quantity: 1,
      color: customization.color,
      aroma: customization.aroma,
      customId,
    };
    
    setItemsForCheckout([directOrderItem]);
    setIsCheckingOutFromCart(false);
    handleCloseModal();
    setIsCheckoutOpen(true);
  }, [selectedProduct, customization, handleCloseModal]);

  const handleDownloadOrder = useCallback(() => {
    if (!ownerOrderDetails) return;

    const { customer, items, total, isPresencial: isPresencialOrder } = ownerOrderDetails;

    const itemsText = items.map(item => 
      `- ${item.quantity}x ${item.name} (${item.color} / ${item.aroma}) - ${(item.price * item.quantity).toFixed(2)}€`
    ).join('\n');

    const fileContent = `
--- Ficha de Pedido: Luz de Luna ---

Fecha: ${new Date().toLocaleString('es-ES')}

--- Detalles del Cliente ---
Tipo de Pedido: ${isPresencialOrder ? 'Presencial / Recogida en tienda' : 'Envío a domicilio'}
Nombre: ${customer.name}
Teléfono: ${customer.phone}
Dirección: ${customer.address}

--- Artículos del Pedido ---
${itemsText}

---------------------------------
TOTAL: ${total}€
---------------------------------

--- Información de Contacto de la Tienda ---
Para cualquier duda sobre este pedido, contactar a:
Teléfono/WhatsApp: 682 87 20 67
Email: tu.email@ejemplo.com
`;

    const blob = new Blob([fileContent.trim()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = customer.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `pedido_${safeName}_${new Date().toISOString().split('T')[0]}.txt`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

  }, [ownerOrderDetails]);


  return (
    <div className="min-h-screen bg-sky-200 text-stone-800 font-sans p-4 sm:p-6 lg:p-8">
      <header className="max-w-7xl mx-auto flex justify-between items-center py-4 border-b border-stone-300">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-cyan-500 to-cyan-900 text-transparent bg-clip-text">
          Luz de Luna
        </h1>
        <button onClick={() => setIsCartOpen(true)} className="hover:opacity-80 transition-opacity">
          <CartIcon itemCount={cartItemCount} />
        </button>
      </header>

      <main className="max-w-7xl mx-auto mt-10">
        <h2 className="text-3xl font-extrabold text-stone-700 mb-8">Nuestras Velas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-8">
          {products.map(product => (
            <button key={product.id} onClick={() => handleProductClick(product)} className="text-left bg-indigo-200 rounded-lg overflow-hidden shadow-lg flex flex-col group focus:outline-none focus:ring-4 focus:ring-teal-500 focus:ring-opacity-50">
              <div className="h-56 overflow-hidden">
                <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              </div>
              <div className="p-6 flex flex-col flex-grow">
                <h3 className="text-xl font-semibold text-stone-900">{product.name}</h3>
                <p className="text-stone-600 mt-2 text-sm flex-grow">{product.description}</p>
                <div className="flex justify-between items-center mt-4">
                  <p className="text-2xl font-bold text-cyan-900">{product.price}€</p>
                  <span className="px-4 py-2 bg-teal-600 text-white font-semibold rounded-lg">
                    Personalizar
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </main>

      <footer className="max-w-7xl mx-auto mt-16 py-8 border-t border-stone-300 text-center text-stone-600">
          <p className="font-semibold text-lg">Luz de Luna</p>
          <p className="mt-2">Para pedidos personalizados o dudas, contáctanos:</p>
          <p className="mt-2">
              <strong>Teléfono/WhatsApp:</strong> 682 87 20 67
          </p>
          <p>
              <strong>Email:</strong> rbnromerojimenez@gmail.com
          </p>
      </footer>


      {/* Product Detail & Customization Modal */}
      {selectedProduct && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={handleCloseModal}></div>
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-11/12 max-w-2xl bg-white rounded-lg shadow-2xl z-50">
             <div className="p-6 relative">
                <button onClick={handleCloseModal} className="absolute top-4 right-4 text-stone-500 hover:text-stone-900 text-4xl leading-none">&times;</button>
                <div className="flex flex-col md:flex-row gap-8">
                   <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full md:w-1/2 h-auto object-cover rounded-lg"/>
                   <div className="flex-1">
                      <h2 className="text-3xl font-bold text-stone-900">{selectedProduct.name}</h2>
                      <p className="text-2xl font-bold text-cyan-900 my-2">{selectedProduct.price}€</p>
                      <p className="text-stone-600 mt-2 text-sm">{selectedProduct.description}</p>
                      
                      <div className="mt-6">
                         <h3 className="text-lg font-semibold text-stone-800 mb-2">Color:</h3>
                         <div className="flex flex-wrap gap-2">
                            {CUSTOMIZATION_OPTIONS.colors.map(color => (
                               <button key={color} onClick={() => handleCustomizationSelect('color', color)} className={`px-4 py-2 rounded-lg border-2 transition-colors ${customization.color === color ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'}`}>
                                  {color}
                               </button>
                            ))}
                         </div>
                      </div>

                      <div className="mt-4">
                         <h3 className="text-lg font-semibold text-stone-800 mb-2">Aroma:</h3>
                         <div className="flex flex-wrap gap-2">
                            {CUSTOMIZATION_OPTIONS.aromas.map(aroma => (
                               <button key={aroma} onClick={() => handleCustomizationSelect('aroma', aroma)} className={`px-4 py-2 rounded-lg border-2 transition-colors ${customization.aroma === aroma ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'}`}>
                                  {aroma}
                               </button>
                            ))}
                         </div>
                      </div>

                      <div className="flex gap-4 mt-6">
                          <button 
                            onClick={handleAddToCart}
                            disabled={!isCustomizationComplete}
                            className="w-full py-3 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 transition-colors disabled:bg-stone-400 disabled:cursor-not-allowed">
                            Añadir a la lista
                          </button>
                          <button 
                            onClick={handleOrderNow}
                            disabled={!isCustomizationComplete}
                            className="w-full py-3 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 transition-colors disabled:bg-stone-400 disabled:cursor-not-allowed">
                            Pedir ahora
                          </button>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </>
      )}

      {/* Shopping Cart Sidebar */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl transform transition-transform duration-300 ease-in-out ${isCartOpen ? 'translate-x-0' : 'translate-x-full'} z-50`}>
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-center p-6 border-b border-stone-200">
            <h2 className="text-2xl font-bold text-stone-900">Tu Lista de deseos</h2>
            <button onClick={() => setIsCartOpen(false)} className="text-stone-500 hover:text-stone-900 text-3xl">&times;</button>
          </div>
          {cart.length === 0 ? (
            <div className="flex-grow flex items-center justify-center text-stone-500">Tu lista está vacía.</div>
          ) : (
            <div className="flex-grow p-6 overflow-y-auto">
              {cart.map(item => (
                <div key={item.customId} className="flex items-center justify-between mb-4">
                  <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-md mr-4" />
                  <div className="flex-grow">
                    <p className="font-semibold text-stone-800">{item.name}</p>
                    <p className="text-xs text-stone-500">{item.color} / {item.aroma}</p>
                    <p className="text-sm text-stone-500 mt-1">{item.price}€</p>
                  </div>
                  <div className="flex items-center">
                    <button onClick={() => handleUpdateQuantity(item.customId, -1)} className="px-2 py-1 bg-stone-200 hover:bg-stone-300 rounded">-</button>
                    <span className="px-4">{item.quantity}</span>
                    <button onClick={() => handleUpdateQuantity(item.customId, 1)} className="px-2 py-1 bg-stone-200 hover:bg-stone-300 rounded">+</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="p-6 border-t border-stone-200">
            <div className="flex justify-between items-center text-xl font-bold mb-4">
              <span>Total:</span>
              <span>{cartTotal}€</span>
            </div>
            <button onClick={handleOpenCheckout} className="w-full py-3 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 transition-colors disabled:bg-stone-400" disabled={cart.length === 0}>
              Pagar
            </button>
          </div>
        </div>
      </div>
      {isCartOpen && <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsCartOpen(false)}></div>}

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={handleCloseCheckout}></div>
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-11/12 max-w-lg bg-white rounded-lg shadow-2xl z-50">
              <div className="p-8 relative">
                  <button onClick={handleCloseCheckout} className="absolute top-4 right-4 text-stone-500 hover:text-stone-900 text-4xl leading-none">&times;</button>
                  <h2 className="text-3xl font-bold text-stone-900 mb-6 text-center">Confirmar Pedido</h2>
                  <form onSubmit={handleOrderSubmit}>
                      <div className="mb-4">
                          <label htmlFor="name" className="block text-stone-700 font-semibold mb-2">Nombre completo</label>
                          <input type="text" id="name" name="name" value={checkoutForm.name} onChange={handleCheckoutFormChange} className="w-full p-3 border border-stone-200 bg-stone-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" required />
                      </div>
                      <div className="mb-4">
                          <label htmlFor="phone" className="block text-stone-700 font-semibold mb-2">Teléfono</label>
                          <input type="tel" id="phone" name="phone" value={checkoutForm.phone} onChange={handleCheckoutFormChange} className="w-full p-3 border border-stone-200 bg-stone-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" required />
                      </div>
                      <div className="mb-4">
                          <label htmlFor="address" className="block text-stone-700 font-semibold mb-2">Dirección de envío</label>
                          <input type="text" id="address" name="address" value={checkoutForm.address} onChange={handleCheckoutFormChange} className="w-full p-3 border border-stone-200 bg-stone-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" required />
                      </div>
                      <div className="flex items-center mb-6">
                          <input
                              type="checkbox"
                              id="presencial"
                              name="presencial"
                              checked={isPresencial}
                              onChange={(e) => setIsPresencial(e.target.checked)}
                              className="h-4 w-4 text-amber-600 border-stone-300 rounded focus:ring-amber-500"
                          />
                          <label htmlFor="presencial" className="ml-2 block text-sm text-stone-700">Recogida en tienda / Pedido presencial</label>
                      </div>
                      <div className="border-t border-stone-200 pt-4 mt-6">
                          <div className="flex justify-between items-center text-xl font-bold mb-4">
                            <span>Total:</span>
                            <span>{checkoutTotal}€</span>
                          </div>
                          <button type="submit" disabled={!isCheckoutFormValid} className="w-full py-3 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 transition-colors disabled:bg-stone-400 disabled:cursor-not-allowed">
                              Realizar Pedido
                          </button>
                      </div>
                  </form>
              </div>
          </div>
        </>
      )}

      {/* AI Chat */}
      <div className="fixed bottom-8 left-8 z-30">
        {!isChatOpen && (
          <button onClick={() => setIsChatOpen(true)} className="p-4 bg-amber-600 rounded-full shadow-lg hover:bg-amber-700 transition-colors">
            <ChatIcon />
          </button>
        )}
        {isChatOpen && (
          <div className="w-96 h-[500px] bg-white rounded-lg shadow-2xl flex flex-col border border-stone-200">
            <div className="p-4 bg-stone-100 rounded-t-lg flex justify-between items-center border-b border-stone-200">
              <h3 className="font-bold text-stone-900">Asistente de Ventas IA</h3>
              <button onClick={() => setIsChatOpen(false)} className="text-stone-500 hover:text-stone-900 text-3xl">&times;</button>
            </div>
            <div className="flex-grow p-4 overflow-y-auto bg-white">
              {chatMessages.length === 0 && <div className="text-stone-500 text-center h-full flex items-center justify-center">¡Pregúntame sobre nuestras velas!</div>}
              {chatMessages.map((msg, index) => (
                <div key={index} className={`mb-3 p-3 rounded-lg max-w-[85%] ${msg.sender === 'user' ? 'bg-amber-600 text-white ml-auto' : 'bg-stone-200 text-stone-800 mr-auto'}`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                </div>
              ))}
              {isChatLoading && <div className="p-3 rounded-lg bg-stone-200 mr-auto max-w-[85%]"><span className="animate-pulse text-stone-800">...</span></div>}
            </div>
            <form onSubmit={handleChatSubmit} className="p-4 border-t border-stone-200 bg-white rounded-b-lg">
              <div className="flex">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Escribe tu mensaje..."
                  className="flex-grow bg-stone-100 text-stone-800 rounded-l-lg p-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button type="submit" className="px-4 py-2 bg-amber-600 text-white font-semibold rounded-r-lg hover:bg-amber-700 transition-colors" disabled={isChatLoading}>Enviar</button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Owner Order Details Modal (Gmail/Web Simulation) */}
      {ownerOrderDetails && (
        <>
          <div className="fixed inset-0 bg-black/60 z-[110]" onClick={() => setOwnerOrderDetails(null)}></div>
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-11/12 max-w-lg bg-white rounded-lg shadow-2xl z-[120]">
              <div className="p-8 relative">
                  <button onClick={() => setOwnerOrderDetails(null)} className="absolute top-4 right-4 text-stone-500 hover:text-stone-900 text-4xl leading-none">&times;</button>
                  <h2 className="text-3xl font-bold text-green-600 mb-6 text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 inline-block mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    ¡Nuevo Pedido Recibido!
                  </h2>
                  <div className="text-left">
                    <h3 className="text-xl font-semibold text-stone-800 mb-2 border-b pb-2">Detalles del Cliente</h3>
                    <p><strong>Tipo de Pedido:</strong> <span className={ownerOrderDetails.isPresencial ? 'font-bold text-teal-700' : ''}>{ownerOrderDetails.isPresencial ? 'Presencial' : 'Envío a Domicilio'}</span></p>
                    <p><strong>Nombre:</strong> {ownerOrderDetails.customer.name}</p>
                    <p><strong>Teléfono:</strong> {ownerOrderDetails.customer.phone}</p>
                    <p><strong>Dirección:</strong> {ownerOrderDetails.customer.address}</p>

                    <h3 className="text-xl font-semibold text-stone-800 mt-6 mb-2 border-b pb-2">Artículos del Pedido</h3>
                    <div className="max-h-48 overflow-y-auto pr-2">
                        {ownerOrderDetails.items.map(item => (
                            <div key={item.customId} className="flex justify-between items-start mb-3">
                                <div className="flex-grow">
                                    <p className="font-semibold">{item.name} <span className="font-normal text-sm">({item.quantity}x)</span></p>
                                    <p className="text-xs text-stone-500">{item.color} / {item.aroma}</p>
                                </div>
                                <p className="font-semibold">{ (item.price * item.quantity).toFixed(2) }€</p>
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-stone-200 pt-4 mt-4">
                        <div className="flex justify-between items-center text-2xl font-bold">
                            <span>Total:</span>
                            <span>{ownerOrderDetails.total}€</span>
                        </div>
                    </div>
                  </div>
                  <div className="text-center text-stone-600 text-sm mt-6 mb-4 p-3 bg-stone-100 rounded-lg">
                    <p>Descarga la ficha para guardar un registro del pedido. Puedes enviarla al cliente como confirmación por email o WhatsApp.</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button onClick={handleDownloadOrder} className="w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Descargar Ficha
                    </button>
                    <button onClick={() => setOwnerOrderDetails(null)} className="w-full py-3 bg-stone-600 text-white font-bold rounded-lg hover:bg-stone-700 transition-colors">
                        Cerrar
                    </button>
                  </div>
              </div>
          </div>
        </>
      )}

      {/* User Order Confirmation Modal */}
      {orderConfirmation && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60]"></div>
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-8 rounded-lg shadow-2xl z-[100] text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-2xl font-bold text-stone-800">¡Pedido Confirmado!</h2>
              <p className="text-stone-600 mt-2">{orderConfirmation}</p>
          </div>
        </>
      )}
    </div>
  );
}