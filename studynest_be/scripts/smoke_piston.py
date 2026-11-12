"""Check the configured code runner and optionally existing lecturer test cases.

Does not change exercises, student files, progress or enrollments.
"""

import argparse
import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.models.database import LessonCodes, SupportedLanguages
from app.db.sesson import AsyncSessionLocal, engine
from app.schemas.lecturer.lesson import LessonCodeVerify
from app.services.lecturer.lesson import LessonService
from app.services.shares.code_runner import PistonService

PROGRAMS = {
    "python": ("main.py", "print(42)"),
    "javascript": ("main.js", "console.log(42)"),
    "typescript": ("main.ts", "console.log(42)"),
    "c": ("main.c", '#include <stdio.h>\nint main(){printf("42\\n");}'),
    "c++": ("main.cpp", '#include <iostream>\nint main(){std::cout<<42<<"\\n";}'),
    "d": ("main.d", "import std.stdio; void main(){writeln(42);}"),
    "fortran": ("main.f90", "program main\nprint *,42\nend program main"),
    "java": (
        "Main.java",
        "public class Main {public static void main(String[] a){System.out.println(42);}}",
    ),
    "go": ("main.go", 'package main\nimport "fmt"\nfunc main(){fmt.Println(42)}'),
    "rust": ("main.rs", 'fn main(){println!("42");}'),
    "bash": ("main.sh", "echo 42"),
    "kotlin": ("main.kt", "fun main(){println(42)}"),
    "php": ("main.php", '<?php echo "42\\n";'),
    "ruby": ("main.rb", "puts 42"),
}


async def main(check_lessons=False):
    runner = PistonService()
    report = {"endpoint": runner.base_url, "runtimes": [], "lessons": []}
    try:
        async with AsyncSessionLocal() as db:
            languages = (
                await db.scalars(
                    select(SupportedLanguages).where(
                        SupportedLanguages.is_active.is_(True)
                    )
                )
            ).all()
            for language in languages:
                if language.name not in PROGRAMS:
                    raise ValueError("Add a smoke program for " + language.name)
                filename, content = PROGRAMS[language.name]
                response = await runner.run_code(
                    language.name,
                    [{"name": filename, "content": content}],
                    language.version,
                )
                run = response.get("run") or {}
                passed = run.get("code") == 0 and run.get("stdout", "").strip() == "42"
                report["runtimes"].append(
                    {
                        "language": language.name,
                        "version": language.version,
                        "passed": passed,
                        "stage_status": run.get("status")
                        or (response.get("compile") or {}).get("status"),
                    }
                )
                print(
                    language.name,
                    language.version,
                    "PASS" if passed else "FAIL",
                    flush=True,
                )
            if check_lessons:
                exercises = (
                    await db.scalars(
                        select(LessonCodes)
                        .where(LessonCodes.is_active.is_(True))
                        .options(
                            selectinload(LessonCodes.lesson_code_files),
                            selectinload(LessonCodes.lesson_code_testcases),
                        )
                    )
                ).all()
                service = LessonService(db=db, piston=runner)
                for exercise in exercises:
                    files = sorted(
                        [f for f in exercise.lesson_code_files if f.role == "solution"],
                        key=lambda f: not f.is_main,
                    )
                    if not files or not exercise.lesson_code_testcases:
                        report["lessons"].append(
                            {
                                "exercise_id": str(exercise.id),
                                "skipped": "missing lecturer solution or test cases",
                            }
                        )
                        continue
                    payload = LessonCodeVerify(
                        language_id=exercise.language_id,
                        title=exercise.title,
                        files=[
                            {
                                "filename": f.filename,
                                "content": f.content,
                                "is_main": f.is_main,
                            }
                            for f in files
                        ],
                        testcases=[
                            {
                                "input": t.input or "",
                                "expected_output": t.expected_output or "",
                                "order_index": t.order_index,
                            }
                            for t in exercise.lesson_code_testcases
                        ],
                    )
                    result = await service.verify_code_sample_async(payload)
                    report["lessons"].append(
                        {
                            "exercise_id": str(exercise.id),
                            "title": exercise.title,
                            "status": result["status"],
                            "passed": result["passed"],
                            "total": result["total"],
                        }
                    )
                    print(
                        exercise.title,
                        result["passed"],
                        "/",
                        result["total"],
                        flush=True,
                    )
        output = Path("/tmp/studynest-piston-smoke.json")
        output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
        print("Report:", output)
        if any(not x["passed"] for x in report["runtimes"]) or any(
            x.get("status") == "failed" for x in report["lessons"]
        ):
            raise SystemExit("Runner checks failed; inspect the report")
    finally:
        await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check-lessons", action="store_true")
    asyncio.run(main(parser.parse_args().check_lessons))
