import bcrypt from "bcrypt";

export const verifyPassword = async (password: string, hash: string) => {
  return bcrypt.compare(password, hash);
};
