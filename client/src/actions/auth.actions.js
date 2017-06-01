import { client } from '../app';
import { SET_CURRENT_USER, LOGOUT } from '../constants/constants';

export const setCurrentUser = user => ({
  type: SET_CURRENT_USER,
  user,
});

export const logout = () => {
  client.resetStore();
  return { type: LOGOUT };
};
