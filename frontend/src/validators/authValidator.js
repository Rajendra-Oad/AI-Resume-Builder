export const validateAuth = (values, isRegister) => {
  const errors = {};
  if (isRegister && !values.firstName.trim()) errors.firstName = "First name is required.";
  if (isRegister && !values.lastName.trim()) errors.lastName = "Last name is required.";
  if (!/^\S+@\S+\.\S+$/.test(values.email)) errors.email = "Enter a valid email address.";
  if (values.password.length < 8) errors.password = "Password must be at least 8 characters.";
  return errors;
};
