import NextAuth, { type NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@/lib/prisma'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          access_type: 'offline',
          prompt: 'consent',
          response_type: 'code',
          scope: [
            'openid',
            'email',
            'profile',
          ].join(' '),
        },
      },
    }),
  ],
  session: { strategy: 'database' },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        // @ts-ignore add id to session user
        session.user.id = user.id
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export const { auth } = NextAuth(authOptions)
