import * as Linking from 'expo-linking';
import { api as axiosClient } from './api';
import { 
  WalletSummary, 
  WalletTransactionsResponse, 
  WalletDepositResponse 
} from '../types/wallet';

export const walletService = {
  getSummary: async () => {
    const { data } = await axiosClient.get<WalletSummary>('/wallets');
    return data;
  },

  getTransactions: async (params: { page?: number; limit?: number } = {}) => {
    const { data } = await axiosClient.get<WalletTransactionsResponse>('/user/transaction/top5', {
      params: {
        page: params.page || 1,
        limit: params.limit || 5,
        order_by: 'created_at',
        order_dir: 'desc',
      },
    });
    return data;
  },

  getAllTransactions: async (params: { 
    page?: number; 
    limit?: number;
    status?: string;
    type?: string;
  } = {}) => {
    const { data } = await axiosClient.get<WalletTransactionsResponse>('/user/transaction', {
      params: {
        page: params.page || 1,
        limit: params.limit || 10,
        status: params.status,
        type_: params.type,
        order_by: 'created_at',
        order_dir: 'desc',
      },
    });
    return data;
  },

  createDeposit: async (amountVnd: number) => {
    const { data } = await axiosClient.post<WalletDepositResponse>('/wallets/create', {
      amount_vnd: amountVnd,
      return_origin: Linking.createURL('payment-result'),
      return_pathname: '/(app)/wallet',
    });
    return data;
  },

  retryPayment: async (orderId: string) => {
    const { data } = await axiosClient.post<WalletDepositResponse>(`/wallets/retry_wallet_payment/${orderId}`);
    return data;
  },
};
