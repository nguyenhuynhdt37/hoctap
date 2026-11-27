export function hasUpdatedUserLayout(pathname: string) {
  return pathname === "/" || pathname === "/courses" || pathname === "/instructors";
}
