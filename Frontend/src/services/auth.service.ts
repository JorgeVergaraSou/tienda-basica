//src/services/auth.service.ts
import { jwtDecode } from "jwt-decode";
import { api } from "@/api/axios";
import { DecodedToken } from "@/interfaces/decode.token.interface";

export const loginService = async (nickUsuario: string, password: string) => {

  const res = await api.post('/auth/login', { nickUsuario, password });

  const token = res.data.token;
  const decoded = jwtDecode<DecodedToken>(token);

  return { token, ...decoded };
};
