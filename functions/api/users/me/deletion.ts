import { proxyAuth, type AuthProxyContext } from "../../../_lib/authProxy";

export const onRequest = (context: AuthProxyContext) => proxyAuth(context);
