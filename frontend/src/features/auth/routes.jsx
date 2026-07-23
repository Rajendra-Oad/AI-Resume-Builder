import { lazy } from "react";

const LoginPage = lazy(() =>
  import("../../pages/LoginPage").then((module) => ({ default: module.LoginPage })),
);
const RegisterPage = lazy(() =>
  import("../../pages/RegisterPage").then((module) => ({ default: module.RegisterPage })),
);
const ForgotPasswordForm = lazy(() =>
  import("./components/ForgotPasswordForm").then((module) => ({ default: module.ForgotPasswordForm })),
);
const ResetPasswordForm = lazy(() =>
  import("./components/ResetPasswordForm").then((module) => ({ default: module.ResetPasswordForm })),
);
const VerifyEmailForm = lazy(() =>
  import("./components/VerifyEmailForm").then((module) => ({ default: module.VerifyEmailForm })),
);

export const authRoutes = [
  { path: "login", element: <LoginPage /> },
  { path: "register", element: <RegisterPage /> },
  { path: "forgot-password", element: <ForgotPasswordForm /> },
  { path: "reset-password", element: <ResetPasswordForm /> },
  { path: "verify-email", element: <VerifyEmailForm /> },
  { path: "verify-email-sent", element: <VerifyEmailForm sent /> },
];
