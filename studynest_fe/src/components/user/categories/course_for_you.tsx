import CourseRecommends from "./course_recommends";
import CoursesSlider from "./courses-slider";

interface CourseForYouProps {
  slug: string;
}

const CourseForYou = ({ slug }: CourseForYouProps) => {
  return (
    <>
      <CourseRecommends slug={slug} />
      <CoursesSlider
        slug={slug}
        feedType="newest"
        title="Khóa học mới nhất"
        section="newest"
        subtitle="Vừa được ra mắt gần đây"
      />
      <CoursesSlider
        slug={slug}
        feedType="top-rated"
        title="Khóa học được đánh giá cao"
        section="top"
        subtitle="Được đánh giá cao bởi học viên"
      />
    </>
  );
};

export default CourseForYou;
