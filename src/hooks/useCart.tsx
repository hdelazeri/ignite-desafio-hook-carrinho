import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

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
    const storedCart = localStorage.getItem("@RocketShoes:cart");

    if (storedCart) {
      return JSON.parse(storedCart);
    }

    return [];
  });

  const verifyStock = async (productId: number, amount: number) => {
    const stockResponse = await api.get(`/stock/${productId}`);
    const stockAvailable = stockResponse.data.amount;

    if (stockAvailable <= 0 || amount > stockAvailable) {
      toast.error("Quantidade solicitada fora de estoque");
      throw Error("Quantidade solicitada fora de estoque");
    }
  };

  const addProduct = async (productId: number) => {
    try {
      const [onCart] = cart.filter((product) => product.id === productId);

      if (onCart) {
        updateProductAmount({ productId, amount: onCart.amount + 1 });
        return;
      }

      await verifyStock(productId, 1);

      const productResponse = await api.get(`/products/${productId}`);
      const productData = {
        ...productResponse.data,
        amount: 1,
      };

      const newCart = [...cart, productData];
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));

      setCart(newCart);
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      if (!cart.some((product) => product.id === productId)) {
        throw Error("Produto inexistente");
      }

      const newCart = cart.filter((product) => product.id !== productId);

      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));

      setCart(newCart);
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      await verifyStock(productId, amount);

      const newCart = cart.map((product) => {
        if (product.id === productId) {
          return {
            ...product,
            amount,
          };
        } else {
          return product;
        }
      });

      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));

      setCart(newCart);
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
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
