import { AxiosResponse } from 'axios';
import {
  createContext,
  ReactNode,
  useContext,
  useState,
} from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface ProductFormatted extends Product {
  priceFormatted: string;
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

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const response = await api.get(`products/${productId}`);
      const stocks = await api.get(`stock/${productId}`);

      const product = cart.filter((item) => item.id === productId);
      response.data.amount = 1;

      if (isProductUndefined(product, stocks))
        return;

      if (cart.length < 1) {
        await setCart([response.data]);
      } else if (product.length >= 1) {
        const carts = cart.map((item) => icrementAmount(productId, item))
        await setCart([...carts]);
      } else {
        await setCart([...cart, response.data]);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart, response.data]))
      }

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))
      toast.success("Adicionado com sucesso!");
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const cartRemoved = cart.filter((item) => item.id !== productId);
      const isNotExisted = cart.filter((item) => item.id === productId).length <= 0;

      if (isNotExisted) {
        toast.error("Erro na remoção do produto");
        return;
      }

      setCart([...cartRemoved]);
      toast.success("Produto retirado!");
      localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cartRemoved]))
    } catch (error) {
      toast.error(error);
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount === 0) {
        return;
      }

      const stocks = await api.get(`stock/${productId}`);
      let isError: boolean = false;
      const carts = cart.map(cart => {
        if ((stocks.data.amount - amount) < 0) {
          isError = false;
          return cart;
        }
        if (cart.id === productId) {
          cart.amount = amount;
        }

        isError = true;
        return cart;
      })

      if (isError) {
        setCart([...carts]);
        toast.success("Atualizado com sucesso!");
        localStorage.setItem('@RocketShoes:cart', JSON.stringify([...carts]));
      } else {
        toast.error("Quantidade solicitada fora de estoque");
      }
    } catch (error) {
      toast.error('Erro na alteração de quantidade do produto');
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

function icrementAmount(productId: number, product: Product) {
  if (product.id === productId) {
    product.amount += 1;
  }
  return product;
}

function isProductUndefined(product: Product[], stocks: AxiosResponse<any>) {
  if (product[0] !== undefined) {
    if ((stocks.data.amount - product[0].amount) <= 0) {
      toast.error("Quantidade solicitada fora de estoque")
      return true;
    }
  }
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
