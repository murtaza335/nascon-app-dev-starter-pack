import React, { createContext, useContext, useEffect, useState } from 'react';
import { API_URL } from '../config';
import { createApiClient } from '../api/client';
import { createAuthApi } from '../api/auth';
import { createTodoApi } from '../api/todos';
import { createSession } from './session';
import { tokenStorage } from './storage';

const client = createApiClient({ baseUrl: API_URL });
const session = createSession({ client, auth: createAuthApi(client), storage: tokenStorage });
const todos = createTodoApi(client);
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [state, setState] = useState(session.getState);
  useEffect(() => { const unsubscribe = session.subscribe(setState); session.restore(); return unsubscribe; }, []);
  return <AuthContext.Provider value={{ ...state, session, todos }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
