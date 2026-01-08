export type UserAddress = {
  city?: string;
};

export type UserCompany = {
  name?: string;
};

export type User = {
  id?: number | string;
  name: string;
  email: string;
  address?: UserAddress;
  company?: UserCompany;
};

export type ApiResponse = {
  success: boolean;
  count: number;
  data: User[];
};
