-- CreateTable
CREATE TABLE "WhatsAppSession" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "displayName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isConnected" BOOLEAN NOT NULL DEFAULT false,
    "qrCode" TEXT,
    "sessionData" TEXT,
    "lastSeen" TIMESTAMP(3),
    "adminId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppManagerAccess" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "canRead" BOOLEAN NOT NULL DEFAULT true,
    "canWrite" BOOLEAN NOT NULL DEFAULT true,
    "canManageChats" BOOLEAN NOT NULL DEFAULT false,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedBy" TEXT NOT NULL,

    CONSTRAINT "WhatsAppManagerAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppChat" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "chatName" TEXT,
    "chatType" TEXT NOT NULL DEFAULT 'individual',
    "isGroup" BOOLEAN NOT NULL DEFAULT false,
    "lastMessageAt" TIMESTAMP(3),
    "lastMessageText" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppChat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppMessage" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "fromMe" BOOLEAN NOT NULL,
    "fromNumber" TEXT NOT NULL,
    "fromName" TEXT,
    "body" TEXT,
    "messageType" TEXT NOT NULL DEFAULT 'text',
    "mediaUrl" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "managerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WhatsAppSession_companyId_idx" ON "WhatsAppSession"("companyId");

-- CreateIndex
CREATE INDEX "WhatsAppSession_adminId_idx" ON "WhatsAppSession"("adminId");

-- CreateIndex
CREATE INDEX "WhatsAppSession_isActive_idx" ON "WhatsAppSession"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppSession_companyId_phoneNumber_key" ON "WhatsAppSession"("companyId", "phoneNumber");

-- CreateIndex
CREATE INDEX "WhatsAppManagerAccess_sessionId_idx" ON "WhatsAppManagerAccess"("sessionId");

-- CreateIndex
CREATE INDEX "WhatsAppManagerAccess_managerId_idx" ON "WhatsAppManagerAccess"("managerId");

-- CreateIndex
CREATE INDEX "WhatsAppManagerAccess_companyId_idx" ON "WhatsAppManagerAccess"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppManagerAccess_sessionId_managerId_key" ON "WhatsAppManagerAccess"("sessionId", "managerId");

-- CreateIndex
CREATE INDEX "WhatsAppChat_sessionId_idx" ON "WhatsAppChat"("sessionId");

-- CreateIndex
CREATE INDEX "WhatsAppChat_companyId_idx" ON "WhatsAppChat"("companyId");

-- CreateIndex
CREATE INDEX "WhatsAppChat_lastMessageAt_idx" ON "WhatsAppChat"("lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppChat_sessionId_chatId_key" ON "WhatsAppChat"("sessionId", "chatId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_chatId_idx" ON "WhatsAppMessage"("chatId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_sessionId_idx" ON "WhatsAppMessage"("sessionId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_companyId_idx" ON "WhatsAppMessage"("companyId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_timestamp_idx" ON "WhatsAppMessage"("timestamp");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_fromMe_idx" ON "WhatsAppMessage"("fromMe");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppMessage_sessionId_messageId_key" ON "WhatsAppMessage"("sessionId", "messageId");

-- AddForeignKey
ALTER TABLE "WhatsAppSession" ADD CONSTRAINT "WhatsAppSession_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppSession" ADD CONSTRAINT "WhatsAppSession_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppManagerAccess" ADD CONSTRAINT "WhatsAppManagerAccess_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WhatsAppSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppManagerAccess" ADD CONSTRAINT "WhatsAppManagerAccess_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppManagerAccess" ADD CONSTRAINT "WhatsAppManagerAccess_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppManagerAccess" ADD CONSTRAINT "WhatsAppManagerAccess_grantedBy_fkey" FOREIGN KEY ("grantedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppChat" ADD CONSTRAINT "WhatsAppChat_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WhatsAppSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppChat" ADD CONSTRAINT "WhatsAppChat_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "WhatsAppChat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WhatsAppSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Manager"("id") ON DELETE SET NULL ON UPDATE CASCADE;
