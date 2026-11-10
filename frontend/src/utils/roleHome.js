export function roleHome(role) {
  switch (role) {
    case "user":
      return "/dashboard";
    case "admin":
      return "/admin";
    case "technician":
      return "/technician";
    default:
      return "/";
  }
}
