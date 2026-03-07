/*
  Warnings:

  - You are about to drop the column `workerId` on the `EffortLog` table. All the data in the column will be lost.
  - You are about to drop the `Worker` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WorkerRate` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `userId` to the `EffortLog` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "EffortLog" DROP CONSTRAINT "EffortLog_workerId_fkey";

-- DropForeignKey
ALTER TABLE "WorkerRate" DROP CONSTRAINT "WorkerRate_workerId_fkey";

-- AlterTable
ALTER TABLE "EffortLog" DROP COLUMN "workerId",
ADD COLUMN     "categoryRate" DOUBLE PRECISION NOT NULL DEFAULT 25,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "hourlyRate" DOUBLE PRECISION NOT NULL DEFAULT 25;

-- DropTable
DROP TABLE "Worker";

-- DropTable
DROP TABLE "WorkerRate";

-- AddForeignKey
ALTER TABLE "EffortLog" ADD CONSTRAINT "EffortLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
