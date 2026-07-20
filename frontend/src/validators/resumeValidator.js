export const validateResume = (values) => {
  const errors = {};
  if (!values.title?.trim()) errors.title = "Resume title is required.";
  if (!values.summary?.trim()) errors.summary = "Professional summary is required.";
  return errors;
};
