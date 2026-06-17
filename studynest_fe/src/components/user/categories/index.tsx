import CourseForYou from "./course_for_you";
import CategoriesHeader from "./header";
import LecturerRecommends from "./lecturer_recommends";

const Categories = ({ slug }: { slug: string }) => {
  return (
    <div>
      <CategoriesHeader slug={slug} />
      <CourseForYou slug={slug} />
      <LecturerRecommends slug={slug} />
    </div>
  );
};

export default Categories;
