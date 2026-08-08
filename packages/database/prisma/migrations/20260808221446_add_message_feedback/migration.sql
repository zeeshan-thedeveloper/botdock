-- CreateEnum
CREATE TYPE "MessageFeedback" AS ENUM ('UP', 'DOWN');

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "feedback" "MessageFeedback";
