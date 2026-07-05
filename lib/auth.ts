import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import bcrypt from "bcryptjs"
import prisma from "@/lib/prisma"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials")
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        })

        if (!user || !user?.password) {
          throw new Error("Invalid credentials")
        }

        if (user.status === "BANNED") {
          throw new Error("Account is banned")
        }

        const isCorrectPassword = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isCorrectPassword) {
          throw new Error("Invalid credentials")
        }

        return user
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.avatar = (user as any).avatar ?? user.image ?? null
      }

      if (trigger === "update" && session?.user?.image !== undefined) {
        token.avatar = session.user.image ?? null
      }

      return token
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id as string
        session.user.role = token.role as "USER" | "ADMIN"

        // Keep profile image in sync with DB so old JWTs still show updated avatars.
        const userId = typeof token.id === "string" ? token.id : null
        if (userId) {
          const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { image: true, avatar: true },
          })
          session.user.image = dbUser?.avatar ?? dbUser?.image ?? null
        } else {
          const avatar = typeof token.avatar === "string" ? token.avatar : null
          session.user.image = avatar
        }
      }
      return session
    }
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
}
