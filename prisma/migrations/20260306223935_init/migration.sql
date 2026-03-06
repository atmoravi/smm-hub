-- CreateTable
CREATE TABLE "Worker" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Worker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerRate" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL DEFAULT 25,

    CONSTRAINT "WorkerRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EffortLog" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "minutes" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "note" TEXT,
    "workerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EffortLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrafficLog" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "campaignName" TEXT,
    "organicLeads" INTEGER NOT NULL DEFAULT 0,
    "paidLeads" INTEGER NOT NULL DEFAULT 0,
    "adSpend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrafficLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesLog" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "source" TEXT,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkerRate_workerId_category_key" ON "WorkerRate"("workerId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_source_key" ON "ApiKey"("source");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_key_key" ON "ApiKey"("key");

-- AddForeignKey
ALTER TABLE "WorkerRate" ADD CONSTRAINT "WorkerRate_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EffortLog" ADD CONSTRAINT "EffortLog_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;
