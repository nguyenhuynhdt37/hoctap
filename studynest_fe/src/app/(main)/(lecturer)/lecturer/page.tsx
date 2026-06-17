import LecturerHome from "@/components/lecturer/home";
import { fetcher } from "@/lib/utils/fetcher/server/fetcher";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const LecturerPage = async () => {
  const cookieStore = await cookies();

  try {
    const res = await fetcher("/lecturer/courses/is_lecturer", cookieStore);

    if (res.ok) {
      return <LecturerHome />;
    }

    // If not ok, redirect to welcome page
    redirect("/lecturer/welcome");
  } catch (error) {
    // If error, redirect to welcome page
    redirect("/lecturer/welcome");
  }
};

export default LecturerPage;
