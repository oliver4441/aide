import { withAuth } from "next-auth/middleware";

// Dashboard: any signed-in account. Team documentation: administrators only.
export default withAuth({
  pages: { signIn: "/login" },
  callbacks: {
    authorized: ({ req, token }) => {
      if (req.nextUrl.pathname.startsWith("/docs")) {
        return token?.role === "admin";
      }
      return !!token;
    },
  },
});

export const config = {
  matcher: ["/dashboard/:path*", "/docs/:path*"],
};
