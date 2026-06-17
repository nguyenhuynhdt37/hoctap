import LecturerWelcome from "@/components/lecturer/welcome";
import { fetcher } from "@/lib/utils/fetcher/server/fetcher";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const LecturerWelcomePage = async () => {
  const cookieStore = await cookies();

  // Check if user is already a lecturer
  try {
    const res = await fetcher("/lecturer/courses/is_lecturer", cookieStore);

    if (res.ok) {
      // User is already a lecturer, redirect to main lecturer page
      redirect("/lecturer");
    }
  } catch (error) {
    // If error occurs, treat as not lecturer and show welcome page
    console.error("Error checking lecturer status:", error);
  }

  // User is not lecturer, show welcome page
  return <LecturerWelcome />;
};

export default LecturerWelcomePage;
