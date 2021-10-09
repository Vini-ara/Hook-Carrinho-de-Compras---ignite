import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product} from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');  

    const storedCart = storagedCart ? JSON.parse(storagedCart) : []

    if(storedCart[0]) {
      return storedCart
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try { 
      const cartArray = [...cart]
  
      const alreadyInCart = cartArray.find(element => element.id === productId)
  
      const product = await api.get(`http://localhost:3333/products/${productId}`)
      
      const stock = await api.get(`http://localhost:3333/stock/${productId}`)
  
      const shoe = product.data
    
      const shoeAmount = stock.data.amount

      if(!shoeAmount || !shoe) throw new Error()

      if(!alreadyInCart) {

        setCart([...cartArray, {...shoe, amount: 1}])
        localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cartArray, {...shoe, amount: 1}]))

        return 
      }
      
      if(alreadyInCart.amount === shoeAmount) {
        throw new Error('Quantidade solicitada fora de estoque')
      }
      
      const index = cartArray.indexOf(alreadyInCart)

      alreadyInCart.amount += 1 

      cartArray.splice(index, 1, alreadyInCart)

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartArray))
      setCart(cartArray)

    } catch (error){
      const e = error as Error
      e.message ? toast.error(e.message) : toast.error("Erro na adição do produto")
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const cartArray = [...cart]

      const element = cartArray.find(element => element.id === productId)

      if(!element) throw new Error()

      const index = cartArray.indexOf(element)

      cartArray.splice(index, 1)

      setCart(cartArray)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartArray))
      
    } catch {
      toast.error("Erro na remoção do produto")
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const cartArray = [...cart]

      const element = cartArray.find(element => element.id === productId)

      if(!element) throw new Error()

      const index = cartArray.indexOf(element)

      const stock = await api.get(`http://localhost:3333/stock/${productId}`)

      const stockAmount = stock.data.amount

      if(!stockAmount) throw new Error()

      if(element.amount + amount <= 0) return 

      if(element.amount + amount > stockAmount) throw new Error("Quantidade solicitada fora de estoque")

      element.amount += amount

      cartArray.splice(index, 1, element)

      setCart(cartArray)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartArray))

    } catch (error){
      const e = error as Error
      e.message ? toast.error(e.message) : toast.error("Erro na alteração de quantidade do produto")
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
