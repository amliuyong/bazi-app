import NextAuth from "next-auth";
import { NextAuthOptions } from "next-auth";
import { OAuthConfig, OAuthUserConfig } from "next-auth/providers";

// Define the token type to fix type errors
interface Token {
  accessToken?: string;
  idToken?: string;
  profile?: any;
  [key: string]: any;
}

// Ensure we have a valid secret
const secret = process.env.NEXTAUTH_SECRET || 
  (process.env.NODE_ENV === 'development' ? 'development_secret_key_for_testing_only' : undefined);

if (!secret && process.env.NODE_ENV === 'production') {
  console.error('Warning: NEXTAUTH_SECRET is not set in production environment');
}

// Create a custom Cognito provider that uses the correct token endpoint auth method
function CustomCognitoProvider(options: OAuthUserConfig<any>): OAuthConfig<any> {
  return {
    id: "cognito",
    name: "Cognito",
    type: "oauth",
    wellKnown: `${options.issuer}/.well-known/openid-configuration`,
    authorization: { params: { scope: "openid email profile" } },
    idToken: true,
    checks: ["state"],
    profile(profile) {
      return {
        id: profile.sub,
        name: profile.name,
        email: profile.email,
        image: profile.picture,
      };
    },
    options,
    clientId: options.clientId,
    clientSecret: undefined, // No client secret for public clients
    // Custom client configuration
    client: {
      token_endpoint_auth_method: "none",
      // Additional PKCE configuration
      usePKCE: true,
    },
  };
}

export const authOptions: NextAuthOptions = {
  providers: [
    CustomCognitoProvider({
      clientId: process.env.OIDC_CLIENT_ID as string,
      issuer: process.env.OIDC_ISSUER as string,
    }),
  ],
  secret: secret,
  debug: process.env.NODE_ENV === "development",
  callbacks: {
    async jwt({ token, account, profile }) {
      console.log("JWT Callback:", { token, account, profile });
      // Persist the OAuth access_token and id_token to the token right after signin
      if (account) {
        token.accessToken = account.access_token;
        token.idToken = account.id_token;
        token.profile = profile;
      }
      return token;
    },
    async session({ session, token }) {
      console.log("Session Callback:", { session, token });
      // Send properties to the client, with proper type casting
      const typedToken = token as Token;
      session.accessToken = typedToken.accessToken as string | undefined;
      session.idToken = typedToken.idToken as string | undefined;
      session.user = typedToken.profile || session.user;
      
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
  },
  session: {
    strategy: "jwt",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 