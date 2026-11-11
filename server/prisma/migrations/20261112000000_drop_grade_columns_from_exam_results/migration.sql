-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_exam_results" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "exam_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "marks_obtained" INTEGER NOT NULL,
    "calculated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "exam_results_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "exam_results_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_exam_results" ("calculated_at", "exam_id", "id", "marks_obtained", "student_id") SELECT "calculated_at", "exam_id", "id", "marks_obtained", "student_id" FROM "exam_results";
DROP TABLE "exam_results";
ALTER TABLE "new_exam_results" RENAME TO "exam_results";
CREATE UNIQUE INDEX "exam_results_exam_id_student_id_key" ON "exam_results"("exam_id", "student_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

