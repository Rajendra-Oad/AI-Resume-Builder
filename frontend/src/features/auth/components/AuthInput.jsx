import { Mail, Phone, UserRound } from "lucide-react";

const icons = { email: Mail, phone: Phone, user: UserRound };

export const AuthInput = ({ icon = "email", className = "", ...props }) => {
  const Icon = icons[icon] ?? Mail;
  return <div className="auth-input-wrap">
    <Icon className="auth-input-icon" aria-hidden="true" />
    <input className={`input auth-input ${className}`.trim()} {...props} />
  </div>;
};
